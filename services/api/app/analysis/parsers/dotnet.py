"""Uncaught .NET exceptions (C#): block parser "dotnet-exception".

    Unhandled exception. System.DivideByZeroException: Attempted to divide by zero.
       at Program.<<Main>$>g__Divide|0_0(Int32 a, Int32 b) in /workspace/main.cs:line 3
       at Program.<Main>$(String[] args) in /workspace/main.cs:line 6

Frames carry line numbers only (from the portable PDB written by csc), so the
range is the whole line. Inner exceptions (" ---> System.X: ...") are
reported as the cause.
"""

from __future__ import annotations

import re

from ...schemas.diagnostics import Severity
from ..records import BlockContext, BlockResult, Record
from .common import Frame, callers_as_related, first_user_frame

_FRAME = re.compile(r"^\s+at (?P<method>.+?)(?: in (?P<file>.+):line (?P<line>\d+))?$")
_INNER = re.compile(r"^\s*---> (?P<type>[\w.`]+)(?:: (?P<message>.*))?$")
_END_INNER = re.compile(r"^\s+--- End of (?:inner exception )?stack trace(?: from previous location)? ---$")
_LOCAL_FUNCTION = re.compile(r"g__(?P<name>\w+)\|")


def dotnet_exception(lines: list[str], start: int, match: re.Match[str], ctx: BlockContext) -> BlockResult:
    kind = match["type"].rsplit(".", 1)[-1]
    text = (match["message"] or "").strip()
    causes: list[str] = []
    frames: list[Frame] = []
    i = start + 1
    while i < len(lines):
        line = lines[i]
        inner = _INNER.match(line)
        if inner:
            causes.append(_text(inner["type"].rsplit(".", 1)[-1], inner["message"]))
            i += 1
            continue
        fm = _FRAME.match(line)
        if fm:
            frames.append(Frame(file=ctx.normalize_file(fm["file"]) if fm["file"] else None,
                                line=int(fm["line"]) if fm["line"] else None,
                                function=_method_name(fm["method"])))
            i += 1
            continue
        if _END_INNER.match(line):
            i += 1
            continue
        break
    message = _text(kind, text)
    if causes:
        message += f" (caused by {causes[-1]})"
    record = Record(severity=Severity.ERROR, message=message, file=None, line=None, column=None,
                    rule_id="dotnet.exception", stream=ctx.stream, raw_start=start + 1, raw_end=i)
    chosen = first_user_frame(frames, ctx)
    if chosen is not None:
        frame = frames[chosen]
        record.file, record.line = frame.file, frame.line
        if frame.function:
            record.context["function"] = frame.function
        record.related = callers_as_related(frames, chosen, ctx)
    return BlockResult(records=[record], next_index=i)


def _text(kind: str, message: str | None) -> str:
    message = (message or "").strip()
    return f"{kind}: {message}" if message else kind


def _method_name(method: str) -> str | None:
    """'Program.<<Main>$>g__Divide|0_0(Int32 a, Int32 b)' -> 'Divide';
    'Program.<Main>$(String[] args)' -> None (top-level statements)."""
    local = _LOCAL_FUNCTION.search(method)
    if local:
        return local.group("name")
    name = method.split("(", 1)[0].rsplit(".", 1)[-1]
    return None if name.startswith("<") else name
