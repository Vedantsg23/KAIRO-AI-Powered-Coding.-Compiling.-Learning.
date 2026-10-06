"""Algorithm A3: diagnostic normalization by ordered grammar matching.

Input:  one output stream of one step (e.g. the compile step's stderr) and
        the grammar declared for it in the language adapter.
Output: records with location, severity and message, plus the lines that no
        rule recognized (reported as UNPARSED, never silently dropped).

For every line, the grammar's rules are tried in order and the first match
decides what the line is:
  * the start of a diagnostic (optionally followed by a javac-style source
    excerpt and caret line, which give the column);
  * a note, attached to the previous diagnostic as a related location;
  * a detail line appended to the previous diagnostic's message;
  * the start of a multi-line block (traceback, stack trace) handed to a
    named block parser;
  * context (e.g. "In function 'main':", or GCC's "required from here",
    which records where in the student's code a library error was caused);
  * known noise (source excerpts, caret lines, summaries).
Continuation lines extend the raw output range of the diagnostic they follow.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from ..adapters.profile import Grammar, GrammarRule, LanguageProfile
from ..schemas.diagnostics import RelatedLocation, Severity, SourceRange
from .blocks import BLOCK_PARSERS
from .records import BlockContext, Record, location_range, normalize_file
from .text import SourceText, to_utf16_column, utf16_len

# "^", "^^^^" (javac, kotlinc) or "^~~~" (Ruby): a marker under the error.
_CARET_LINE = re.compile(r"^[ \t]*\^[\^~]*[ \t]*$")
_CARET_RUN = re.compile(r"[\^~]+")
_SEVERITIES = {"error", "warning", "info", "note"}
# C++ errors can carry dozens of "candidate: ..." notes inside library
# headers. Keep the first few; the rest stay in the raw compiler log.
MAX_LIBRARY_NOTES = 2


@dataclass
class ParsedStream:
    records: list[Record]
    unmatched: list[tuple[int, str]]  # (1-based line number, text)


def parse_stream(text: str, grammar: Grammar, *, stream: str, profile: LanguageProfile,
                 sources: dict[str, SourceText]) -> ParsedStream:
    lines = text.splitlines()
    records: list[Record] = []
    unmatched: list[tuple[int, str]] = []
    context: dict[str, str] = {}
    site: tuple[str, int, int | None] | None = None  # user-code location from "required from here"
    last: Record | None = None
    library_notes: dict[int, int] = {}  # id(record) -> notes kept that point into library code
    skipped_notes: dict[int, int] = {}  # id(record) -> library notes left in the raw output only
    block_ctx = BlockContext(profile=profile, grammar=grammar, sources=sources, stream=stream)

    i = 0
    while i < len(lines):
        number, line = i + 1, lines[i]
        if not line.strip():
            i += 1
            continue
        rule, match = _first_match(grammar.rules, line)
        if rule is None or match is None:
            unmatched.append((number, line))
            i += 1
            continue
        groups = {k: v for k, v in match.groupdict().items() if v is not None}

        if rule.action == "ignore":
            if last is not None and last.raw_end == number - 1:
                last.raw_end = number  # caret/excerpt lines belong to the previous diagnostic
            i += 1
            continue

        if rule.action == "context":
            file = normalize_file(groups.get("file"), profile)
            if "line" in groups and file in sources:
                column = _column(sources, file, int(groups["line"]), groups.get("column"), grammar)
                site = (file, int(groups["line"]), column)
            else:
                site = None
                context = {k: v for k, v in groups.items() if k == "function"}
            i += 1
            continue

        if rule.action == "detail":
            if last is not None and last.raw_end >= number - 1:
                if rule.append[0] in ";:,":
                    last.message = last.message.rstrip(";:, ")  # "...given types;" + "; required: ..."
                last.message += rule.append.format(detail=groups["detail"].strip())
                last.raw_end = number
            else:
                unmatched.append((number, line))
            i += 1
            continue

        if rule.action == "block":
            result = BLOCK_PARSERS[rule.parser](lines, i, match, block_ctx)
            records.extend(result.records)
            if result.records:
                last = result.records[-1]
            i = max(result.next_index, i + 1)
            continue

        # ------------------------------------------------------ diagnostic
        severity = _severity(groups.get("severity") or rule.severity or "error", grammar)
        file = normalize_file(groups.get("file"), profile)
        line_no = int(groups["line"]) if "line" in groups else None
        column = _column(sources, file, line_no, groups.get("column"), grammar) if line_no else None
        consumed = 0
        caret_len = 0
        if rule.caret and line_no is not None:
            caret = _caret_index(lines, i)
            if caret is not None:
                index, caret_len = caret
                if column is None:
                    column = _column(sources, file, line_no, str(index + 1), grammar)
                consumed = 2
        message = (rule.template.format_map({k: (v or "").strip() for k, v in match.groupdict().items()})
                   if rule.template else groups["message"]).strip()
        if caret_len > 1 and line_no is not None and column is not None:
            explicit = (line_no, column, caret_len)
        else:
            explicit = None

        if severity == "note":
            if last is not None:
                if file in sources or library_notes.get(id(last), 0) < MAX_LIBRARY_NOTES:
                    last.related.append(RelatedLocation(
                        file=file, range=location_range(sources, file, line_no, column), message=message))
                    if file not in sources:
                        library_notes[id(last)] = library_notes.get(id(last), 0) + 1
                else:
                    skipped_notes[id(last)] = skipped_notes.get(id(last), 0) + 1
                last.raw_end = number + consumed
                i += 1 + consumed
                continue
            severity = "info"  # a note with nothing to attach to stands alone

        record = Record(
            severity=Severity(severity), message=message, file=file, line=line_no, column=column,
            rule_id=rule.id, stream=stream, raw_start=number, raw_end=number + consumed, context=dict(context),
        )
        if explicit is not None and file in sources:
            text_line = sources[file].line(line_no) or ""
            start = _utf16_index(text_line, explicit[1])
            record.range = SourceRange(start_line=line_no, start_column=explicit[1], end_line=line_no,
                                       end_column=explicit[1] + utf16_len(text_line[start:start + explicit[2]]))
        if site is not None and file not in sources and severity in {"error", "warning"}:
            # The problem was noticed inside library code (typically a C++
            # template) while compiling a line of the student's program:
            # point at that line and keep the library position as context.
            record.related.append(RelatedLocation(
                file=file, range=location_range(sources, file, line_no, column),
                message="Where the compiler noticed it (library code)"))
            record.file, record.line, record.column = site
        site = None
        records.append(record)
        last = record
        i += 1 + consumed

    for record in records:
        skipped = skipped_notes.get(id(record), 0)
        if skipped:
            record.related.append(RelatedLocation(
                message=f"{skipped} more note{'s' if skipped > 1 else ''} about library code: see the compiler log"))
    return ParsedStream(records=records, unmatched=unmatched)


def record_range(record: Record, sources: dict[str, SourceText]) -> SourceRange | None:
    if record.range is not None:
        return record.range
    return location_range(sources, record.file, record.line, record.column)


def _first_match(rules: list[GrammarRule], line: str):
    for candidate in rules:
        match = candidate.pattern.match(line)
        if match:
            return candidate, match
    return None, None


def _column(sources: dict[str, SourceText], file: str | None, line: int | None, column: str | None,
            grammar: Grammar) -> int | None:
    if line is None or column is None:
        return None
    source = sources.get(file) if file else None
    text_line = source.line(line) if source else None
    return to_utf16_column(text_line, int(column), grammar.column_unit)


def _caret_index(lines: list[str], i: int) -> tuple[int, int] | None:
    """javac, kotlinc and Ruby print the source line, then a line with '^'
    (or a run of '^', or '^~~~') under the error. The marker line copies the
    tabs of the source line, so the index of the '^' is the error's 0-based
    character (UTF-16 code unit) offset. Returns (index, marker length)."""
    if i + 2 < len(lines) and _CARET_LINE.match(lines[i + 2]):
        text = lines[i + 2]
        index = text.index("^")
        return index, len(_CARET_RUN.match(text, index).group(0))
    return None


def _utf16_index(text: str, column: int) -> int:
    """Python index of a 1-based UTF-16 column."""
    units = 0
    for index, char in enumerate(text):
        if units >= column - 1:
            return index
        units += utf16_len(char)
    return len(text)


def _severity(raw: str, grammar: Grammar) -> str:
    raw = raw.strip()
    mapped = grammar.severity_map.get(raw, raw)
    if mapped in _SEVERITIES:
        return mapped
    return "warning" if mapped.lower().endswith("warning") else "error"
