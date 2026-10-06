"""Native toolchains: uncaught C++ exceptions, rustc diagnostics and Rust
panics, and Go panics.

  cxx-terminate  "terminate called after throwing an instance of 'T'"
                 followed by "  what():  ..." (uncaught C++ exception).
  rustc          one rustc diagnostic: "error[E0425]: message", the
                 "--> main.rs:6:20" location, the source excerpt with its
                 ^^^^ primary span (label appended to the message) and
                 ----- secondary spans (related locations), then "= help:"
                 notes. Diagnostics are separated by a blank line.
  rust-panic     "thread 'main' panicked at main.rs:4:25:" + message lines.
  go-panic       "panic: ..." / "fatal error: ..." + goroutine traces
                 ("main.main()" / "\t/workspace/main.go:8 +0x1d").
"""

from __future__ import annotations

import re

from ...schemas.diagnostics import RelatedLocation, Severity
from ..records import BlockContext, BlockResult, Record, location_range
from .common import MAX_RELATED, Frame, callers_as_related, first_user_frame, span_range, utf16_column

# ------------------------------------------------------------------------- C++

_CXX_WHAT = re.compile(r"^\s+what\(\):\s+(?P<what>.*)$")


def cxx_terminate(lines: list[str], start: int, match: re.Match[str], ctx: BlockContext) -> BlockResult:
    i = start + 1
    what = None
    if i < len(lines):
        wm = _CXX_WHAT.match(lines[i])
        if wm:
            what = wm["what"].strip()
            i += 1
    message = f"Uncaught exception of type {match['type']}" + (f": {what}" if what else "")
    record = Record(severity=Severity.ERROR, message=message, file=None, line=None, column=None,
                    rule_id="cxx.terminate", stream=ctx.stream, raw_start=start + 1, raw_end=i)
    return BlockResult(records=[record], next_index=i)


# ------------------------------------------------------------------------ Rust

_RUST_ARROW = re.compile(r"^\s*--> (?P<file>.+?):(?P<line>\d+):(?P<column>\d+)$")
_RUST_GUTTER = re.compile(r"^\s*(?P<num>\d+)?\s*\|(?P<text>.*)$")
_RUST_NOTE = re.compile(r"^\s*= (?P<kind>note|help): (?P<text>.+)$")
_RUST_SUB = re.compile(r"^(?P<kind>help|note)(?:\[\w+\])?: (?P<text>.+)$")
_RUST_DEFAULT_LINT = re.compile(r"^`#\[(?:warn|deny)\([\w:]+\)\]` on by default$")


def rustc(lines: list[str], start: int, match: re.Match[str], ctx: BlockContext) -> BlockResult:
    severity = Severity.ERROR if match["severity"] == "error" else Severity.WARNING
    message = match["message"].strip()
    code = match["code"]
    file = line = column = None
    primary_len = 0
    primary_end = 0  # 1-based display column just after the last ^ on the primary line
    primary_label = None
    related: list[RelatedLocation] = []
    pending: list[tuple[int, int, int]] = []  # secondary spans awaiting a label: (line, offset, length)
    src_line: int | None = None
    src_text = ""
    in_sub = False  # inside a "help:"/"note:" sub-diagnostic (its own excerpt)

    def secondary(at_line: int, offset: int, length: int, label: str) -> None:
        col = offset + 1 if _plain(src_text[:offset]) else None
        rng = span_range(ctx, file, at_line, col, length) if col else None
        related.append(RelatedLocation(
            file=file, range=rng or location_range(ctx.sources, file, at_line, None), message=label))

    i = start + 1
    while i < len(lines):
        text = lines[i]
        if not text.strip():
            break  # a blank line ends the diagnostic
        arrow = _RUST_ARROW.match(text)
        if arrow:
            if file is None:
                file, line, column = ctx.normalize_file(arrow["file"]), int(arrow["line"]), int(arrow["column"])
            i += 1
            continue
        gutter = _RUST_GUTTER.match(text)
        if gutter:
            if gutter["num"]:
                src_line, src_text = int(gutter["num"]), gutter["text"][1:]
                pending = []
            elif src_line is not None and not in_sub:
                runs, label = _marker_line(gutter["text"][1:])
                for k, (offset, marks) in enumerate(runs):
                    last = k == len(runs) - 1
                    if marks[0] == "^" and src_line == line:
                        primary_len = max(primary_len, len(marks))
                        primary_end = max(primary_end, offset + 1 + len(marks))
                        if last and label:
                            primary_label = primary_label or label
                    elif marks[0] == "-":
                        if last and label:
                            secondary(src_line, offset, len(marks), label)
                        else:
                            pending.append((src_line, offset, len(marks)))
                if not runs and label and pending:
                    at_line, offset, length = pending.pop()
                    secondary(at_line, offset, length, label)
            i += 1
            continue
        note = _RUST_NOTE.match(text)
        if note:
            if not _RUST_DEFAULT_LINT.match(note["text"]):
                related.append(RelatedLocation(message=f"{note['kind']}: {note['text']}"))
            i += 1
            continue
        sub = _RUST_SUB.match(text)
        if sub:
            in_sub = True
            related.append(RelatedLocation(message=f"{sub['kind']}: {sub['text']}"))
            i += 1
            continue
        if text.strip() == "...":
            i += 1
            continue
        break

    if primary_label:
        message += f" ({primary_label})" if primary_label.startswith(("help:", "note:")) else f": {primary_label}"
    if code:
        message += f" [{code}]"
    record = Record(severity=severity, message=message, file=file, line=line, column=None,
                    rule_id="rustc.diagnostic", stream=ctx.stream, raw_start=start + 1, raw_end=i,
                    related=related[:MAX_RELATED + 2])
    if file is not None and line is not None and column is not None:
        record.column = utf16_column(ctx, file, line, column)
        text_line = ctx.sources[file].line(line) if file in ctx.sources else None
        # The span runs from the reported column to the last ^ (rustc may mark
        # part of it with --- for a secondary label, e.g. "mut count").
        length = primary_end - column if primary_end > column else primary_len
        if length and text_line is not None and _plain(text_line[: column - 1 + length]):
            record.range = span_range(ctx, file, line, column, length)
    return BlockResult(records=[record], next_index=i)


def _marker_line(body: str) -> tuple[list[tuple[int, str]], str | None]:
    """Runs of ^^^ / --- in a marker line (with their offsets) and the label
    after them. Connector characters '|' and spaces are skipped."""
    i, runs = 0, []
    while i < len(body):
        ch = body[i]
        if ch in " |":
            i += 1
            continue
        if ch in "^-":
            j = i
            while j < len(body) and body[j] == ch:
                j += 1
            runs.append((i, body[i:j]))
            i = j
            continue
        break
    return runs, body[i:].strip() or None


def _plain(text: str) -> bool:
    """rustc aligns markers by display width: only trust offsets on ASCII lines without tabs."""
    return text.isascii() and "\t" not in text


_RUST_NOTE_LINE = re.compile(r"^note: run with `RUST_BACKTRACE=")


def rust_panic(lines: list[str], start: int, match: re.Match[str], ctx: BlockContext) -> BlockResult:
    i = start + 1
    parts: list[str] = []
    while i < len(lines) and lines[i].strip() and not _RUST_NOTE_LINE.match(lines[i]):
        parts.append(lines[i].strip())
        i += 1
    file = ctx.normalize_file(match["file"])
    line, column = int(match["line"]), int(match["column"])
    message = "panicked: " + (" ".join(parts) if parts else "explicit panic")
    record = Record(severity=Severity.ERROR, message=message, file=file, line=line,
                    column=utf16_column(ctx, file, line, column), rule_id="rust.panic",
                    stream=ctx.stream, raw_start=start + 1, raw_end=i)
    return BlockResult(records=[record], next_index=i)


# -------------------------------------------------------------------------- Go

_GO_FUNC = re.compile(r"^(?P<func>[\w./*()\[\]-]+)\((?P<args>.*)\)$")
_GO_FILE = re.compile(r"^\t(?P<file>\S+?):(?P<line>\d+)(?: \+0x[0-9a-f]+)?$")
_GO_GOROUTINE = re.compile(r"^goroutine \d+ \[.*\]:$")


def go_panic(lines: list[str], start: int, match: re.Match[str], ctx: BlockContext) -> BlockResult:
    kind, text = match["kind"], match["message"].strip()
    i = start + 1
    frames: list[Frame] = []
    pending_func: str | None = None
    first_goroutine_done = False
    while i < len(lines):
        line = lines[i]
        if not line.strip():
            if frames:
                first_goroutine_done = True
            i += 1
            continue
        if _GO_GOROUTINE.match(line):
            if first_goroutine_done:
                break  # only the goroutine that failed
            i += 1
            continue
        fm = _GO_FUNC.match(line)
        if fm:
            pending_func = fm["func"].rsplit(".", 1)[-1]
            i += 1
            continue
        loc = _GO_FILE.match(line)
        if loc:
            frames.append(Frame(file=ctx.normalize_file(loc["file"]), line=int(loc["line"]), function=pending_func))
            pending_func = None
            i += 1
            continue
        if line.startswith(("created by ", "\t", "[", "exit status")):
            i += 1
            continue
        break

    message = f"{kind}: {text}"
    record = Record(severity=Severity.ERROR, message=message, file=None, line=None, column=None,
                    rule_id="go.panic", stream=ctx.stream, raw_start=start + 1, raw_end=i)
    chosen = first_user_frame(frames, ctx)
    if chosen is not None:
        frame = frames[chosen]
        record.file, record.line = frame.file, frame.line
        if frame.function:
            record.context["function"] = frame.function
        record.related = callers_as_related(frames, chosen, ctx)
    return BlockResult(records=[record], next_index=i)
