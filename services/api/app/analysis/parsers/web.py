"""JavaScript/TypeScript (Node.js) errors and PHP fatal errors.

  node-error  Node's report of an uncaught error or a syntax error:
                /workspace/main.js:5          <- file and line
                console.log(totl);            <- the source line
                            ^                 <- column
                                              <- blank line
                ReferenceError: totl is not defined
                    at Object.<anonymous> (/workspace/main.js:5:13)
              With --enable-source-maps (TypeScript) the file is main.ts.
              The first stack frame in the student's file gives the exact
              column; the ^ line is used when there is none (syntax errors).
  php-fatal   "Fatal error: Uncaught DivisionByZeroError: Division by zero
              in /workspace/main.php:3" + "Stack trace:" + "#0 file(6): f()"
              + "  thrown in ... on line 3".
"""

from __future__ import annotations

import re

from ...schemas.diagnostics import Severity
from ..records import BlockContext, BlockResult, Record
from .common import Frame, callers_as_related, first_user_frame, utf16_column

# --------------------------------------------------------------------- Node.js

_NODE_CARET = re.compile(r"^\s*\^+\s*$")
_NODE_EXCEPTION = re.compile(r"^(?P<type>[A-Za-z_$][\w$.]*)(?:: (?P<message>.*))?$")
_NODE_FRAME = re.compile(r"^\s+at (?:(?P<func>.+?) \()?(?P<file>[^()\s]+?):(?P<line>\d+):(?P<column>\d+)\)?$")


def node_error(lines: list[str], start: int, match: re.Match[str], ctx: BlockContext) -> BlockResult:
    header_file = ctx.normalize_file(match["file"])
    header_line = int(match["line"])
    i = start + 1
    caret_col = None
    if i < len(lines) and lines[i].strip() and not _NODE_CARET.match(lines[i]):
        i += 1  # the source line as Node printed it
    if i < len(lines) and _NODE_CARET.match(lines[i]):
        caret_col = lines[i].index("^") + 1  # V8 columns count UTF-16 code units
        i += 1
    while i < len(lines) and not lines[i].strip():
        i += 1
    em = _NODE_EXCEPTION.match(lines[i]) if i < len(lines) else None
    if em is None:
        return BlockResult(records=[], next_index=start + 1)
    i += 1
    kind, text = em["type"], (em["message"] or "").strip()

    frames: list[Frame] = []
    while i < len(lines):
        fm = _NODE_FRAME.match(lines[i])
        if not fm:
            break
        func = fm["func"]
        if func:
            func = func.removeprefix("async ").split(" [as ")[0].rsplit(".", 1)[-1]
            if func in {"<anonymous>", "Object.<anonymous>"}:
                func = None
        frames.append(Frame(file=ctx.normalize_file(fm["file"]), line=int(fm["line"]),
                            column=int(fm["column"]), function=func))
        i += 1

    record = Record(severity=Severity.ERROR, message=f"{kind}: {text}" if text else kind,
                    file=None, line=None, column=None, rule_id="node.error", stream=ctx.stream,
                    raw_start=start + 1, raw_end=i)
    chosen = first_user_frame(frames, ctx)
    if chosen is not None:
        frame = frames[chosen]
        record.file, record.line = frame.file, frame.line
        record.column = utf16_column(ctx, frame.file, frame.line, frame.column)
        if frame.function:
            record.context["function"] = frame.function
        record.related = callers_as_related(frames, chosen, ctx)
    elif ctx.is_user_file(header_file):
        record.file, record.line = header_file, header_line
        record.column = utf16_column(ctx, header_file, header_line, caret_col)
    return BlockResult(records=[record], next_index=i)


# ------------------------------------------------------------------------- PHP

_PHP_FRAME = re.compile(r"^#\d+ (?P<file>[^(]+)\((?P<line>\d+)\): (?P<call>.+)$")
_PHP_TAIL = re.compile(r"^(?:Stack trace:|#\d+ \{main\}|\s+thrown in .+ on line \d+)$")


def php_fatal(lines: list[str], start: int, match: re.Match[str], ctx: BlockContext) -> BlockResult:
    file = ctx.normalize_file(match["file"])
    line = int(match["line"])
    kind = match["type"].rsplit("\\", 1)[-1]
    message = f"{kind}: {match['message'].strip()}"
    frames = [Frame(file=file, line=line)]
    i = start + 1
    while i < len(lines):
        fm = _PHP_FRAME.match(lines[i])
        if fm:
            call = fm["call"].split("(", 1)[0].rsplit("->", 1)[-1].rsplit("::", 1)[-1]
            frames[-1].function = call  # the function running in the previous (inner) frame
            frames.append(Frame(file=ctx.normalize_file(fm["file"]), line=int(fm["line"])))
            i += 1
            continue
        if _PHP_TAIL.match(lines[i]):
            i += 1
            continue
        break
    record = Record(severity=Severity.ERROR, message=message, file=file, line=line, column=None,
                    rule_id="php.fatal", stream=ctx.stream, raw_start=start + 1, raw_end=i)
    chosen = first_user_frame(frames, ctx)
    if chosen is not None:
        record.file, record.line = frames[chosen].file, frames[chosen].line
        record.related = callers_as_related(frames, chosen, ctx)
    return BlockResult(records=[record], next_index=i)
