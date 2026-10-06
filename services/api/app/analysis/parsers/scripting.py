"""Ruby exceptions, Lua errors and SQLite errors.

  ruby-exception  "/workspace/main.rb:3:in `<main>': undefined local variable
                  or method `totl' for main:Object (NameError)", optionally
                  followed by Ruby's error_highlight excerpt (the source line
                  and a ^^^^ line under the failing call), "Did you mean?"
                  suggestions and "\tfrom file:line:in `f'" frames.
  lua-error       "lua5.4: /workspace/main.lua:4: attempt to call a nil value
                  (global 'greett')" + "stack traceback:" + frames.
  sqlite-error    "Parse error near line 3: near "SELEC": syntax error" with
                  an optional excerpt and "^--- error here" marker.
"""

from __future__ import annotations

import re

from ...schemas.diagnostics import Severity, SourceRange
from ..records import BlockContext, BlockResult, Record
from ..text import utf16_len
from .common import Frame, callers_as_related, first_user_frame, span_range

# ------------------------------------------------------------------------ Ruby

_RUBY_FROM = re.compile(r"^\tfrom (?P<file>[^:]+):(?P<line>\d+):in [`'](?P<func>[^']*)'$")
_RUBY_MARKS = re.compile(r"^(?P<pad>\s*)(?P<marks>\^+)\s*$")
_RUBY_DID_YOU_MEAN = re.compile(r"^Did you mean\?\s+(?P<names>.+)$")
_RUBY_MORE_NAMES = re.compile(r"^\s{14,}(?P<name>\S+)$")  # further suggestions, aligned under the first


def ruby_exception(lines: list[str], start: int, match: re.Match[str], ctx: BlockContext) -> BlockResult:
    file = ctx.normalize_file(match["file"])
    line = int(match["line"])
    kind = match["type"].rsplit("::", 1)[-1]
    message = f"{kind}: {match['message'].strip()}"
    # Innermost first; each frame knows the method it was running in, so the
    # callee of frame k+1 is the method of frame k.
    frames = [Frame(file=file, line=line, function=_ruby_func(match["func"]))]
    marks: tuple[int, int] | None = None
    suggestions: list[str] = []
    i = start + 1
    if i < len(lines) and not lines[i].strip():
        i += 1  # Ruby prints a blank line before the error_highlight excerpt
    # error_highlight: the source line, then ^^^^ under the failing call.
    if i + 1 < len(lines) and _RUBY_MARKS.match(lines[i + 1]) and not lines[i].startswith("\tfrom "):
        mm = _RUBY_MARKS.match(lines[i + 1])
        marks = (len(mm["pad"]) + 1, len(mm["marks"]))
        i += 2
    while i < len(lines):
        dm = _RUBY_DID_YOU_MEAN.match(lines[i])
        if dm:
            suggestions.append(dm["names"].strip())
            i += 1
            continue
        more = _RUBY_MORE_NAMES.match(lines[i]) if suggestions else None
        if more:
            suggestions.append(more["name"])
            i += 1
            continue
        fm = _RUBY_FROM.match(lines[i])
        if fm:
            frames.append(Frame(file=ctx.normalize_file(fm["file"]), line=int(fm["line"]),
                                function=_ruby_func(fm["func"])))
            i += 1
            continue
        break
    if suggestions:
        message += " (did you mean " + " or ".join(f"'{s}'" for s in suggestions) + "?)"

    record = Record(severity=Severity.ERROR, message=message, file=None, line=None, column=None,
                    rule_id="ruby.exception", stream=ctx.stream, raw_start=start + 1, raw_end=i)
    chosen = first_user_frame(frames, ctx)
    if chosen is not None:
        frame = frames[chosen]
        record.file, record.line = frame.file, frame.line
        if chosen == 0 and marks is not None:
            record.range = span_range(ctx, frame.file, frame.line, marks[0], marks[1])
        record.related = callers_as_related(frames, chosen, ctx)
    return BlockResult(records=[record], next_index=i)


def _ruby_func(name: str) -> str | None:
    """'<main>' -> None; 'block in average' -> 'average'; 'Integer#/' style names stay."""
    name = name.removeprefix("block in ").split(" ")[-1]
    return None if name.startswith("<") else name


# ------------------------------------------------------------------------- Lua

_LUA_FRAME = re.compile(r"^\t(?P<file>[^:\[\t][^:]*):(?P<line>\d+): in (?P<what>.+)$")


def lua_error(lines: list[str], start: int, match: re.Match[str], ctx: BlockContext) -> BlockResult:
    file = ctx.normalize_file(match["file"])
    line = int(match["line"])
    frames: list[Frame] = []
    i = start + 1
    if i < len(lines) and lines[i] == "stack traceback:":
        i += 1
        while i < len(lines) and lines[i].startswith("\t"):
            fm = _LUA_FRAME.match(lines[i])
            if fm:
                what = fm["what"]
                name = re.search(r"'([^']+)'", what)
                frames.append(Frame(file=ctx.normalize_file(fm["file"]), line=int(fm["line"]),
                                    function=name.group(1) if name else None))
            i += 1
    record = Record(severity=Severity.ERROR, message=match["message"].strip(), file=file, line=line,
                    column=None, rule_id="lua.error", stream=ctx.stream, raw_start=start + 1, raw_end=i)
    # frames[0] is where the error was raised (same place as the header when
    # the error comes from Lua code); callers follow.
    chosen = first_user_frame(frames, ctx)
    if chosen is not None:
        record.related = callers_as_related(frames, chosen, ctx)
    return BlockResult(records=[record], next_index=i)


# ---------------------------------------------------------------------- SQLite

_SQLITE_MARKER = re.compile(r"^(?P<pad>\s*)\^--- error here$")


def sqlite_error(lines: list[str], start: int, match: re.Match[str], ctx: BlockContext) -> BlockResult:
    line = int(match["line"])
    file = next(iter(ctx.sources), None)  # the one .sql file
    kind = match.groupdict().get("kind") or "SQL"
    record = Record(severity=Severity.ERROR, message=f"{kind} error: {match['message'].strip()}", file=file,
                    line=line, column=None, rule_id="sqlite.error", stream=ctx.stream,
                    raw_start=start + 1, raw_end=start + 1)
    i = start + 1
    # SQLite 3.45 prints the statement (indented by two spaces) and a marker.
    if i + 1 < len(lines) and _SQLITE_MARKER.match(lines[i + 1]):
        excerpt = lines[i][2:] if lines[i].startswith("  ") else lines[i].lstrip()
        offset = len(_SQLITE_MARKER.match(lines[i + 1])["pad"]) - 2
        record.range = _sql_range(ctx, file, line, excerpt, offset)
        record.raw_end = i + 2
        i += 2
    return BlockResult(records=[record], next_index=i)


def _sql_range(ctx: BlockContext, file: str | None, line: int, excerpt: str, offset: int) -> SourceRange | None:
    """Find the excerpt in the file near `line` and turn the marker offset into a range."""
    source = ctx.sources.get(file) if file else None
    if source is None or offset < 0:
        return None
    for number in range(line, min(line + 20, len(source.lines)) + 1):
        text = source.line(number) or ""
        pos = text.find(excerpt.strip()) if excerpt.strip() else -1
        if pos < 0:
            continue
        column = pos + offset - (len(excerpt) - len(excerpt.lstrip())) + 1
        rest = text[column - 1:]
        word = re.match(r"\w+|\S", rest)
        length = len(word.group(0)) if word else 1
        start = utf16_len(text[: column - 1]) + 1
        return SourceRange(start_line=number, start_column=start, end_line=number,
                           end_column=start + utf16_len(text[column - 1: column - 1 + length]))
    return None
