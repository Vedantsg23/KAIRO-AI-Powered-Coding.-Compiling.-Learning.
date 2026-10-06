"""Uncaught JVM exceptions: Java and Kotlin (block parser "jvm-exception")."""

from __future__ import annotations

import re
from dataclasses import dataclass

from ...schemas.diagnostics import RelatedLocation, Severity
from ..records import BlockContext, BlockResult, Record, location_range
from .common import MAX_RELATED

# ------------------------------------------------------------------------ Java

_JAVA_FRAME = re.compile(r"^\s+at (?:[\w.$@-]+/)*(?P<method>[\w.$<>-]+)\((?P<where>[^)]*)\)$")
_JAVA_WHERE = re.compile(r"^(?P<file>[^:]+?)(?::(?P<line>\d+))?$")
_JAVA_MORE = re.compile(r"^\s+\.\.\. \d+ more$")
_JAVA_CAUSE = re.compile(r"^\s*(?P<kind>Caused by|Suppressed): (?P<type>[\w.$]+)(?:: (?P<message>.*))?$")


@dataclass
class _JavaFrame:
    method: str
    file: str | None
    line: int | None


@dataclass
class _JavaThrowable:
    type: str
    message: str
    frames: list[_JavaFrame]


def jvm_exception(lines: list[str], start: int, match: re.Match[str], ctx: BlockContext) -> BlockResult:
    chain = [_JavaThrowable(match["type"], (match["message"] or "").strip(), [])]
    i = start + 1
    while i < len(lines):
        line = lines[i]
        fm = _JAVA_FRAME.match(line)
        if fm:
            where = _JAVA_WHERE.match(fm["where"])
            file = ctx.normalize_file(where["file"]) if where else None
            number = int(where["line"]) if where and where["line"] else None
            chain[-1].frames.append(_JavaFrame(fm["method"], file, number))
            i += 1
            continue
        if _JAVA_MORE.match(line):
            i += 1
            continue
        cm = _JAVA_CAUSE.match(line)
        if cm and cm["kind"] == "Caused by":
            chain.append(_JavaThrowable(cm["type"], (cm["message"] or "").strip(), []))
            i += 1
            continue
        break

    top, root = chain[0], chain[-1]
    message = _java_text(top)
    if root is not top:
        message += f" (caused by {_java_text(root)})"

    # The innermost frame in the student's code: first in the top exception,
    # otherwise the first one in its causes.
    chosen: tuple[_JavaThrowable, int] | None = None
    for throwable in chain:
        for k, frame in enumerate(throwable.frames):
            if frame.line is not None and ctx.is_user_file(frame.file):
                chosen = (throwable, k)
                break
        if chosen:
            break

    record = Record(severity=Severity.ERROR, message=message, file=None, line=None, column=None,
                    rule_id="jvm.exception", stream=ctx.stream, raw_start=start + 1, raw_end=i)
    if chosen is not None:
        throwable, k = chosen
        frame = throwable.frames[k]
        record.file, record.line = frame.file, frame.line
        record.context["function"] = _short_method(frame.method)
        seen = {frame.line}
        for callee, caller in zip(throwable.frames[k:], throwable.frames[k + 1:], strict=False):
            if caller.line is None or not ctx.is_user_file(caller.file) or caller.line in seen:
                continue
            seen.add(caller.line)
            record.related.append(RelatedLocation(
                file=caller.file, range=location_range(ctx.sources, caller.file, caller.line, None),
                message=f"{_short_method(callee.method)}() was called here"))
            if len(record.related) >= MAX_RELATED:
                break
    return BlockResult(records=[record], next_index=i)


def _java_text(throwable: _JavaThrowable) -> str:
    simple = throwable.type.rsplit(".", 1)[-1]
    return f"{simple}: {throwable.message}" if throwable.message else simple


def _short_method(method: str) -> str:
    """'Main.divide' -> 'divide'; 'Main$Inner.run' -> 'run'."""
    return method.rsplit(".", 1)[-1]
