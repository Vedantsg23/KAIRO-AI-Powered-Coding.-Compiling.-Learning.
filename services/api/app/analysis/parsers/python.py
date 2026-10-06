"""CPython 3.12 tracebacks and syntax errors (block parser "python-traceback")."""

from __future__ import annotations

import re
from dataclasses import dataclass

from ...schemas.diagnostics import RelatedLocation, Severity, SourceRange
from ..records import BlockContext, BlockResult, Record, location_range
from ..text import utf16_len
from .common import MAX_RELATED

# --------------------------------------------------------------------- CPython

_PY_FRAME = re.compile(r'^  File "(?P<file>[^"]+)", line (?P<line>\d+)(?:, in (?P<func>.+))?$')
_PY_MARKERS = re.compile(r"^[ \t]*[~^]+[ \t]*$")
_PY_REPEAT = re.compile(r"^ +\[Previous line repeated \d+ more times?\]$")
_PY_EXCEPTION = re.compile(r"^(?P<type>[A-Za-z_][\w.]*)(?:: (?P<message>.*))?$")
_PY_DISPLAY_INDENT = 4  # CPython prints source lines indented by four spaces


@dataclass
class _PyFrame:
    file: str | None
    line: int
    func: str | None
    shown: str | None = None    # displayed source text, without the 4-space indent
    markers: str | None = None  # the ~~~^^^ line, verbatim


def python_traceback(lines: list[str], start: int, match: re.Match[str], ctx: BlockContext) -> BlockResult:
    i = start + 1 if lines[start].startswith("Traceback") else start
    frames: list[_PyFrame] = []
    repeated_last = False
    while i < len(lines):
        fm = _PY_FRAME.match(lines[i])
        if fm:
            frame = _PyFrame(file=ctx.normalize_file(fm["file"]), line=int(fm["line"]), func=fm["func"])
            i += 1
            if i < len(lines) and lines[i].startswith(" " * _PY_DISPLAY_INDENT) \
                    and not _PY_FRAME.match(lines[i]) and not _PY_MARKERS.match(lines[i]):
                frame.shown = lines[i][_PY_DISPLAY_INDENT:]
                i += 1
                if i < len(lines) and _PY_MARKERS.match(lines[i]):
                    frame.markers = lines[i]
                    i += 1
            frames.append(frame)
            repeated_last = False
            continue
        if _PY_REPEAT.match(lines[i]):
            repeated_last = True
            i += 1
            continue
        break

    if repeated_last and frames:
        # CPython folds identical frames (same file, line and function) into
        # "[Previous line repeated N more times]", so the innermost frame's
        # own ~~~^^^ markers are not shown: the ones printed belong to an
        # outer call. Keep the line, drop the column range.
        frames[-1].markers = None

    em = _PY_EXCEPTION.match(lines[i]) if i < len(lines) else None
    if em is None or not frames:
        # Not a complete traceback (e.g. cut off by the output limit): let the
        # line rules see these lines instead of dropping them.
        return BlockResult(records=[], next_index=start + 1)

    exc_type, exc_message = em["type"], (em["message"] or "").strip()
    message = f"{exc_type}: {exc_message}" if exc_message else exc_type

    user = [k for k, f in enumerate(frames) if ctx.is_user_file(f.file)]
    chosen = frames[user[-1]] if user else None  # innermost frame in the student's code
    record = Record(
        severity=Severity.ERROR, message=message,
        file=chosen.file if chosen else None,
        line=chosen.line if chosen else None,
        column=None, rule_id="python.traceback", stream=ctx.stream,
        raw_start=start + 1, raw_end=i + 1,
        range=_py_frame_range(chosen, ctx) if chosen else None,
    )
    if chosen is not None and chosen.func and chosen.func != "<module>":
        record.context["function"] = chosen.func

    # Outer frames in the student's code: where each call came from.
    seen: set[int] = set()
    for k in reversed(user[:-1]):
        frame, callee = frames[k], frames[k + 1].func
        if frame.line in seen or frame.line == record.line:
            continue
        seen.add(frame.line)
        text = f"{callee}() was called here" if callee and not callee.startswith("<") else "Called from here"
        record.related.append(RelatedLocation(
            file=frame.file, range=_py_frame_range(frame, ctx), message=text))
        if len(record.related) >= MAX_RELATED:
            break
    return BlockResult(records=[record], next_index=i + 1)


def _py_frame_range(frame: _PyFrame, ctx: BlockContext) -> SourceRange | None:
    source = ctx.sources.get(frame.file) if frame.file else None
    text = source.line(frame.line) if source else None
    if text is not None and frame.markers and frame.shown is not None:
        cut = _display_truncation(text, frame.shown)
        marks = [k for k, ch in enumerate(frame.markers) if ch in "~^"]
        if cut is not None and marks:
            start = marks[0] - _PY_DISPLAY_INDENT + cut      # code-point index in the real line
            end = marks[-1] - _PY_DISPLAY_INDENT + cut + 1   # exclusive
            if 0 <= start < end:
                start_col = utf16_len(text[:start]) + 1 if start <= len(text) else utf16_len(text) + 1
                end_col = utf16_len(text[:end]) + 1 if end <= len(text) else start_col + 1
                return SourceRange(start_line=frame.line, start_column=start_col,
                                   end_line=frame.line, end_column=max(end_col, start_col + 1))
    return location_range(ctx.sources, frame.file, frame.line, None)


def _display_truncation(original: str, shown: str) -> int | None:
    """How many leading characters CPython removed before printing the line.

    The C traceback printer strips spaces, tabs and form feeds; the Python
    `traceback` module (used for syntax errors) strips spaces and form feeds
    only. Whichever matches the displayed text is the one that was used."""
    target = shown.rstrip()
    for chars in (" \t\f", " \f"):
        cut = len(original) - len(original.lstrip(chars))
        if original[cut:].rstrip() == target:
            return cut
    return None
