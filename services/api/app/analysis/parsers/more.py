"""Block parsers for the languages added with the native and extra sandbox images.

  fortran-runtime  "At line 5 of file main.f90" + "Fortran runtime error: ..."
                   (+ an optional backtrace, skipped).
  pascal-runtime   Free Pascal "Runtime error 200 at $..." + "  $addr  main,  line 7
                   of main.pas" frames (compiled with -gl).
  nim-traceback    Nim "file(line) proc" frames (most recent call last) then
                   "Error: unhandled exception: ... [IndexDefect]".
  prolog-message   SWI-Prolog "ERROR: file:line:[col:] message", whose message may
                   continue on following "ERROR: ..." lines; also "Warning:" blocks.
  tcl-error        tclsh errors: the message line(s), then "while executing" and
                   "(file "main.tcl" line N)"; matched on the location line, the
                   message is read back from the lines above.
  guile-error      Guile "Backtrace:" ... "ERROR: In procedure p:" + the message.
  sbcl-error       SBCL "Unhandled TYPE in thread ...:" + the condition text
                   (+ "Backtrace for:" frames, skipped).
  elixir-error     Elixir "** (Type) message" + indented stack frames.
  pascal-exception Free Pascal with SysUtils: "An unhandled exception occurred at $...:"
                   + "EDivByZero: Division by zero" + "  $addr  main,  line 7 of main.pas".
  r-error          R "Error in call : message" / "Error: message" (the message may be
                   on the next, indented line) and "Warning message(s):" lists. R
                   reports no line numbers at run time: the failing call is looked
                   up in the source and used only when it appears on exactly one line.
"""

from __future__ import annotations

import re

from ...schemas.diagnostics import RelatedLocation, Severity
from ..records import BlockContext, BlockResult, Record, location_range
from .common import utf16_column


def _record(ctx: BlockContext, message: str, file: str | None, line: int | None, rule_id: str,
            raw_start: int, raw_end: int, column: int | None = None,
            severity: Severity = Severity.ERROR) -> Record:
    return Record(severity=severity, message=message.strip(), file=file, line=line, column=column,
                  rule_id=rule_id, stream=ctx.stream, raw_start=raw_start, raw_end=raw_end)


def _unique_match(ctx: BlockContext, pattern: re.Pattern[str], comment: str | None = None,
                  flags_lower: bool = False) -> tuple[str | None, int | None, int | None]:
    """(file, line, column) of the only place `pattern` matches in the student's
    code (comments after `comment` ignored), or Nones when it matches zero or
    several times. Used for run-time errors that name a variable or function
    but give no line."""
    hits: list[tuple[str, int, int]] = []
    for name, source in ctx.sources.items():
        for number, text in enumerate(source.lines, 1):
            code = text.split(comment, 1)[0] if comment else text
            if flags_lower:
                code = code.lower()
            for m in pattern.finditer(code):
                hits.append((name, number, m.start() + 1))
                if len(hits) > 1:
                    return None, None, None
    if len(hits) != 1:
        return None, None, None
    file, line, column = hits[0]
    return file, line, utf16_column(ctx, file, line, column)


# -------------------------------------------------------------------- Fortran

_FORTRAN_MESSAGE = re.compile(r"^Fortran runtime (?P<kind>error|warning): (?P<message>.+)$")


def fortran_runtime(lines: list[str], start: int, match: re.Match[str], ctx: BlockContext) -> BlockResult:
    file = ctx.normalize_file(match["file"])
    line = int(match["line"])
    i = start + 1
    message = "Fortran runtime error"
    severity = Severity.ERROR
    if i < len(lines):
        m = _FORTRAN_MESSAGE.match(lines[i])
        if m:
            message = m["message"]
            severity = Severity.WARNING if m["kind"] == "warning" else Severity.ERROR
            i += 1
    # "Error termination. Backtrace:" and "#0 0x... in ..." / "\tat ..." lines.
    while i < len(lines) and (not lines[i].strip() or lines[i].startswith(("Error termination", "#", "\tat ", "    at "))):
        i += 1
    return BlockResult(records=[_record(ctx, message, file, line, "fortran.runtime", start + 1, i, severity=severity)],
                       next_index=i)


_GFORTRAN_LINE = re.compile(r"^(?P<file>[^\s:][^:]*):(?P<line>\d+):(?P<column>\d+): "
                            r"(?P<severity>Fatal Error|Error|Warning): (?P<message>.+)$")


def gfortran_multi(lines: list[str], start: int, match: re.Match[str], ctx: BlockContext) -> BlockResult:
    """A diagnostic with two locations: gfortran first prints location (1) with
    the message "(1)", then the message at location (2). The record points at
    (1), the place the message is about, and keeps (2) as a related location."""
    file = ctx.normalize_file(match["file"])
    line = int(match["line"])
    column = utf16_column(ctx, file, line, int(match["column"]))
    i = start + 1
    m = _GFORTRAN_LINE.match(lines[i]) if i < len(lines) else None
    if m is None or re.fullmatch(r"\(\d\)", m["message"].strip()):
        return BlockResult(records=[], next_index=start + 1)
    severity = Severity.WARNING if m["severity"] == "Warning" else Severity.ERROR
    record = _record(ctx, m["message"], file, line, "gfortran.two-locations", start + 1, i + 1, column=column,
                     severity=severity)
    file2 = ctx.normalize_file(m["file"])
    line2 = int(m["line"])
    if (file2, line2) != (file, line):
        column2 = utf16_column(ctx, file2, line2, int(m["column"]))
        record.related.append(RelatedLocation(file=file2, range=location_range(ctx.sources, file2, line2, column2),
                                              message="Location (2) in the message"))
    return BlockResult(records=[record], next_index=i + 1)


# --------------------------------------------------------------------- Pascal

_PASCAL_FRAME = re.compile(r"^\s+\$[0-9A-Fa-f]+\s+(?:(?P<func>[\w$.]+),\s+)?line (?P<line>\d+) of (?P<file>\S+)")

# Free Pascal run-time error numbers (https://www.freepascal.org/docs-html/user/userap4.html).
_PASCAL_ERRORS = {
    2: "File not found", 3: "Path not found", 4: "Too many open files", 5: "File access denied",
    100: "Disk read error (end of input reached?)", 101: "Disk write error", 102: "File not assigned",
    103: "File not open", 104: "File not open for input", 105: "File not open for output",
    106: "Invalid numeric format", 200: "Division by zero", 201: "Range check error", 202: "Stack overflow error",
    203: "Heap overflow error (out of memory)", 204: "Invalid pointer operation", 205: "Floating point overflow",
    206: "Floating point underflow", 207: "Invalid floating point operation", 210: "Object not initialized",
    211: "Call to abstract method", 215: "Arithmetic overflow error", 216: "General protection fault (invalid memory access)",
    217: "Unhandled exception occurred", 219: "Invalid typecast", 227: "Assertion failed",
}


def pascal_runtime(lines: list[str], start: int, match: re.Match[str], ctx: BlockContext) -> BlockResult:
    code = int(match["code"])
    what = _PASCAL_ERRORS.get(code, "Run-time error")
    file: str | None = None
    line: int | None = None
    i = start + 1
    while i < len(lines) and (lines[i].startswith("  $") or not lines[i].strip()):
        fm = _PASCAL_FRAME.match(lines[i])
        if fm and line is None:
            candidate = ctx.normalize_file(fm["file"])
            if ctx.is_user_file(candidate):
                file, line = candidate, int(fm["line"])
        i += 1
    record = _record(ctx, f"Runtime error {code}: {what}", file, line, "pascal.runtime", start + 1, i)
    return BlockResult(records=[record], next_index=i)


# ------------------------------------------------------------------------ Nim

_NIM_FRAME = re.compile(r"^(?P<file>\S+)\((?P<line>\d+)\)\s+(?P<func>\S+)$")
_NIM_ERROR = re.compile(r"^Error: unhandled exception: (?P<message>.+?)(?: \[(?P<type>\w+)\])?$")


def nim_traceback(lines: list[str], start: int, match: re.Match[str], ctx: BlockContext) -> BlockResult:
    i = start
    if lines[i].startswith("Traceback"):
        i += 1
    user: tuple[str, int] | None = None
    while i < len(lines):
        fm = _NIM_FRAME.match(lines[i])
        if not fm:
            break
        candidate = ctx.normalize_file(fm["file"])
        if ctx.is_user_file(candidate):
            user = (candidate, int(fm["line"]))  # frames go outermost -> innermost: keep the last
        i += 1
    message = "Unhandled exception"
    if i < len(lines):
        em = _NIM_ERROR.match(lines[i])
        if em:
            message = f"{em['type']}: {em['message']}" if em["type"] else em["message"]
            i += 1
    file, line = user if user else (None, None)
    return BlockResult(records=[_record(ctx, message, file, line, "nim.exception", start + 1, i)], next_index=i)


# --------------------------------------------------------------------- Prolog

_PROLOG_MORE = re.compile(r"^(?P<kind>ERROR|Warning):(?P<text>.*)$")
_PROLOG_LOCATED = re.compile(r"^\S+:\d+(?::\d+)?:")


def prolog_message(lines: list[str], start: int, match: re.Match[str], ctx: BlockContext) -> BlockResult:
    kind = match["kind"]
    file = ctx.normalize_file(match["file"])
    line = int(match["line"])
    column = int(match["column"]) if match["column"] else None
    parts = [match["message"].strip()]
    i = start + 1
    # Continuation lines have the same prefix and no file:line of their own:
    # "ERROR: //2: Arithmetic: ..." continues the message, "ERROR:   Stack sizes: ..."
    # (indented) is detail. A warning's message is on the first indented line.
    while i < len(lines):
        m = _PROLOG_MORE.match(lines[i])
        if not m or m["kind"] != kind or _PROLOG_LOCATED.match(m["text"].strip()):
            break
        text = m["text"]
        detail = text.startswith("   ")
        if (len(parts) == 1 and not parts[0]) or (not detail and len(parts) < 3):
            parts.append(text.strip())
        i += 1
    text = " ".join(p for p in parts if p)
    text = re.sub(r"^Initialization goal raised exception:\s*", "", text)
    text = re.sub(r"^Goal \(initialization\) raised exception:\s*", "", text)
    severity = Severity.WARNING if kind == "Warning" else Severity.ERROR
    # An error raised while running main is reported at the initialization
    # directive; an unknown procedure is easy to find in the source instead.
    unknown = re.search(r"Unknown procedure: (?:\w+:)?(?P<name>[a-z]\w*)/(?P<arity>\d+)", text)
    if unknown and ctx.is_user_file(file):
        name, arity = unknown["name"], int(unknown["arity"])
        call = re.compile(rf"(?<![\w']){re.escape(name)}\(" if arity else rf"(?<![\w']){re.escape(name)}(?![\w(])")
        found = _unique_match(ctx, call, comment="%")
        if found[1] is not None:
            file, line, column = found
            record = _record(ctx, text, file, line, "prolog.message", start + 1, i, column=column, severity=severity)
            return BlockResult(records=[record], next_index=i)
    record = _record(ctx, text or "Prolog error", file, line, "prolog.message", start + 1, i, column=column,
                     severity=severity)
    return BlockResult(records=[record], next_index=i)


# ------------------------------------------------------------------------ Tcl

def tcl_error(lines: list[str], start: int, match: re.Match[str], ctx: BlockContext) -> BlockResult:
    file = ctx.normalize_file(match["file"])
    line = int(match["line"])
    # Walk back to the top of this error report: the message is the first
    # non-indented line before "    while executing" / "    invoked from within".
    j = start - 1
    while j >= 0 and (lines[j].startswith((" ", "\t", '"')) or not lines[j].strip()):
        j -= 1
    message = lines[j].strip() if j >= 0 else "Tcl error"
    return BlockResult(records=[_record(ctx, message, file, line, "tcl.error", j + 1 if j >= 0 else start + 1,
                                        start + 1)], next_index=start + 1)


# ---------------------------------------------------------------------- Guile

_GUILE_PROC = re.compile(r"^(?:ERROR: )?In procedure (?P<proc>[^:]+):\s*(?P<rest>.*)$")
_GUILE_LOCATED = re.compile(r"^(?P<file>[^\s:][^:]*):(?P<line>\d+):(?P<column>\d+): (?P<message>.+)$")
_GUILE_THROW = re.compile(r"Throw to key `(?P<key>[^']+)' with args `\((?:\"(?P<proc>[^\"]*)\"|#f) \"(?P<text>[^\"]*)\"")
_SCHEME_SYMBOL = r"[^\s()\[\]{}\"';`,]+"


def guile_error(lines: list[str], start: int, match: re.Match[str], ctx: BlockContext) -> BlockResult:
    """Guile errors, after an optional "Backtrace:" block:
         ERROR: In procedure %resolve-variable:     + "Unbound variable: totl"
         ice-9/eval.scm:159:9: Throw to key `numerical-overflow' with args `("divide" "Numerical overflow" #f #f)'.
         ice-9/read.scm:126:4: In procedure lp:     + "/workspace/main.scm:4:1: unexpected end of input ..."
    """
    i = start
    if lines[i].strip() == "Backtrace:":
        i += 1
        while i < len(lines) and (lines[i].startswith((" ", "\t", "In ")) or not lines[i].strip()):
            i += 1
    message = "Guile error"
    file: str | None = None
    line: int | None = None
    column: int | None = None
    if i < len(lines):
        head = lines[i]
        located = _GUILE_LOCATED.match(head)
        body = located["message"] if located else head.removeprefix("ERROR:").strip()
        throw = _GUILE_THROW.search(body)
        proc = _GUILE_PROC.match(body)
        i += 1
        if throw:
            text = throw["text"]
            if throw["key"] == "numerical-overflow" and throw["proc"] in {"divide", "/", "quotient", "remainder", "modulo"}:
                text = "Division by zero (numerical overflow)"
            message = f"In procedure {throw['proc']}: {text}" if throw["proc"] else text
        elif proc:
            detail = proc["rest"]
            while i < len(lines) and lines[i].strip() and not lines[i].startswith(("ERROR:", "Backtrace:")):
                inner = _GUILE_LOCATED.match(lines[i])
                if inner and ctx.is_user_file(ctx.normalize_file(inner["file"])):
                    file = ctx.normalize_file(inner["file"])
                    line, column = int(inner["line"]), int(inner["column"])
                    detail = (detail + " " + inner["message"]).strip()
                else:
                    detail = (detail + " " + lines[i].strip()).strip()
                i += 1
            message = f"In procedure {proc['proc']}: {detail}" if detail else f"In procedure {proc['proc']}"
            if file is not None and proc["proc"] in {"lp", "read", "%read-syntax"}:
                message = detail
        else:
            message = body
    if line is None:
        unbound = re.search(r"Unbound variable: (?P<name>\S+)", message)
        if unbound:
            name = re.escape(unbound["name"])
            file, line, column = _unique_match(ctx, re.compile(rf"(?<![^\s()\[\]'`,]){name}(?![^\s()\[\]])"), comment=";")
            return BlockResult(records=[_record(ctx, message, file, line, "guile.error", start + 1, i, column=column)],
                               next_index=i)
    column = utf16_column(ctx, file, line, column)
    return BlockResult(records=[_record(ctx, message, file, line, "guile.error", start + 1, i, column=column)],
                       next_index=i)


# ----------------------------------------------------------------------- SBCL

_SBCL_FORM_LINE = re.compile(r"\(in form starting at line: (?P<line>\d+), column: (?P<column>\d+)")


def sbcl_error(lines: list[str], start: int, match: re.Match[str], ctx: BlockContext) -> BlockResult:
    kind = match["type"].rsplit(":", 1)[-1]
    i = start + 1
    # The thread description may wrap onto a line of its own: "   {1001348003}>:"
    while i < len(lines) and lines[i].strip().endswith(">:") and "{" in lines[i]:
        i += 1
    text: list[str] = []
    line: int | None = None
    column: int | None = None
    while i < len(lines) and not lines[i].startswith(("Backtrace for:", "unhandled condition")):
        stripped = lines[i].strip()
        fm = _SBCL_FORM_LINE.search(stripped)
        if fm:
            line, column = int(fm["line"]), int(fm["column"]) + 1
        elif stripped:
            text.append(stripped)
        i += 1
    while i < len(lines) and not lines[i].startswith("unhandled condition"):
        i += 1  # the backtrace
    if i < len(lines):
        i += 1
    detail = " ".join(text)
    message = f"{kind}: {detail}" if detail else kind
    file = next(iter(ctx.sources), None) if line is not None else None
    if line is None:
        file, line, column = _sbcl_locate(lines[start:i], detail, ctx)
    return BlockResult(records=[_record(ctx, message, file, line, "sbcl.error", start + 1, i, column=column)],
                       next_index=i)


_SBCL_EVAL_FRAME = re.compile(r"^\d+: \((?:SB-INT:SIMPLE-EVAL-IN-LEXENV|EVAL-TLF) (?P<form>.+?) (?:#<|\d+ NIL\)$)")
_SBCL_NAMED = re.compile(r"The (?:variable|function) (?:[\w-]+::?)?(?P<name>\S+) is (?:unbound|undefined)")


def _sbcl_locate(block: list[str], detail: str, ctx: BlockContext) -> tuple[str | None, int | None, int | None]:
    """SBCL prints no line for errors in forms it evaluates. Find the unbound
    or undefined name, or else the innermost evaluated form, in the source
    when it appears exactly once (compared without case or spaces)."""
    named = _SBCL_NAMED.search(detail)
    if named:
        name = re.escape(named["name"].lower())
        found = _unique_match(ctx, re.compile(rf"(?<![^\s()'`,#]){name}(?![^\s()])"), comment=";", flags_lower=True)
        if found[1] is not None:
            return found
    for text in block:
        fm = _SBCL_EVAL_FRAME.match(text.strip())
        if not fm or not fm["form"].startswith("("):
            continue
        needle = _SPACE.sub("", fm["form"]).lower()
        hits = []
        for name, source in ctx.sources.items():
            for number, code in enumerate(source.lines, 1):
                compact = _SPACE.sub("", code.split(";", 1)[0]).lower()
                if needle in compact:
                    hits.append((name, number))
        if len(hits) == 1:
            file, line = hits[0]
            return file, line, None
    return None, None, None


# --------------------------------------------------------------------- Elixir

_EXS_FRAME = re.compile(r"^\s+(?:\([\w.\s-]+\)\s+)?(?P<file>[^\s:]+\.exs?):(?P<line>\d+):")


def elixir_error(lines: list[str], start: int, match: re.Match[str], ctx: BlockContext) -> BlockResult:
    kind = match["type"].rsplit(".", 1)[-1]
    message = f"{kind}: {match['message'].strip()}"
    i = start + 1
    file: str | None = None
    line: int | None = None
    while i < len(lines) and lines[i].startswith("    "):
        fm = _EXS_FRAME.match(lines[i])
        if fm and line is None:
            candidate = ctx.normalize_file(fm["file"])
            if ctx.is_user_file(candidate):
                file, line = candidate, int(fm["line"])
        i += 1
    return BlockResult(records=[_record(ctx, message, file, line, "elixir.error", start + 1, i)], next_index=i)


_EXS_WARNING_AT = re.compile(r"^\s+(?:└─ )?(?P<file>[^\s:]+\.exs?):(?P<line>\d+)(?::(?P<column>\d+))?")


def elixir_warning(lines: list[str], start: int, match: re.Match[str], ctx: BlockContext) -> BlockResult:
    """ "warning: message" + an indented "  /workspace/main.exs:2" location line. """
    message = match["message"].strip()
    i = start + 1
    file: str | None = None
    line: int | None = None
    column: int | None = None
    while i < len(lines) and lines[i].startswith((" ", "\t")) and lines[i].strip():
        wm = _EXS_WARNING_AT.match(lines[i])
        if wm and line is None:
            candidate = ctx.normalize_file(wm["file"])
            if ctx.is_user_file(candidate):
                file, line = candidate, int(wm["line"])
                column = utf16_column(ctx, file, line, int(wm["column"])) if wm["column"] else None
        i += 1
    return BlockResult(records=[_record(ctx, message, file, line, "elixir.warning", start + 1, i, column=column,
                                        severity=Severity.WARNING)], next_index=i)


# ------------------------------------------------------- Pascal (SysUtils)

_PASCAL_EXCEPTION_TEXT = re.compile(r"^(?P<type>E\w+|Exception): (?P<message>.*)$")


def pascal_exception(lines: list[str], start: int, match: re.Match[str], ctx: BlockContext) -> BlockResult:
    i = start + 1
    message = "Unhandled exception"
    if i < len(lines):
        em = _PASCAL_EXCEPTION_TEXT.match(lines[i])
        if em:
            message = f"{em['type']}: {em['message'].strip()}".rstrip(": ")
            i += 1
    file: str | None = None
    line: int | None = None
    while i < len(lines) and (lines[i].startswith("  $") or not lines[i].strip()):
        fm = _PASCAL_FRAME.match(lines[i])
        if fm and line is None:
            candidate = ctx.normalize_file(fm["file"])
            if ctx.is_user_file(candidate):
                file, line = candidate, int(fm["line"])
        i += 1
    return BlockResult(records=[_record(ctx, message, file, line, "pascal.exception", start + 1, i)], next_index=i)


# ------------------------------------------------------------------------- R

_R_ERROR = re.compile(r"^Error(?: in (?P<call>.+?) :|:) ?(?P<message>.*)$")
_R_WARNING_ITEM = re.compile(r"^(?:\d+: )?(?:In (?P<call>.+?) :)? ?(?P<message>.*)$")
_R_LOCATED = re.compile(r"^(?P<file>[^\s:][^:]*):(?P<line>\d+):(?P<column>\d+): (?P<message>.+)$")
_R_END = re.compile(r"^(?:Execution halted|Calls: |In addition: |Warning messages?:|Error|Backtrace:)")
_SPACE = re.compile(r"\s+")


def _r_find_call(ctx: BlockContext, call: str | None) -> tuple[str | None, int | None, int | None]:
    """(file, line, column) of the one source line containing `call` (spaces
    ignored), or Nones when the call is missing, too short or ambiguous."""
    if not call:
        return None, None, None
    needle = _SPACE.sub("", call)
    if len(needle) < 4 or needle.endswith("{"):
        return None, None, None
    hits: list[tuple[str, int, int]] = []
    for name, source in ctx.sources.items():
        for number, text in enumerate(source.lines, 1):
            stripped = text.split("#", 1)[0]
            compact = []
            index_of = []
            for k, ch in enumerate(stripped):
                if not ch.isspace():
                    compact.append(ch)
                    index_of.append(k)
            at = "".join(compact).find(needle)
            if at >= 0:
                hits.append((name, number, index_of[at] + 1))
    if len(hits) != 1:
        return None, None, None
    return hits[0]


def _r_message(lines: list[str], i: int, first: str) -> tuple[str, int]:
    """The message text: `first`, or the indented continuation lines when R put
    the message on its own line(s)."""
    if first.strip():
        return first.strip(), i
    parts: list[str] = []
    while i < len(lines) and lines[i].startswith("  ") and lines[i].strip():
        parts.append(lines[i].strip())
        i += 1
    return " ".join(parts), i


def r_error(lines: list[str], start: int, match: re.Match[str], ctx: BlockContext) -> BlockResult:
    head = lines[start]
    if head.startswith(("Warning message", "In addition: Warning message")):
        return _r_warnings(lines, start, ctx)
    em = _R_ERROR.match(head)
    call = em["call"] if em else None
    message, i = _r_message(lines, start + 1, em["message"] if em else head)
    file, line, column = None, None, None
    lm = _R_LOCATED.match(message)
    if lm:  # a parse error: "main.R:3:5: unexpected symbol"
        file, line, column = ctx.normalize_file(lm["file"]), int(lm["line"]), int(lm["column"])
        message = lm["message"]
        # Skip the source excerpt and the caret line that follow.
        while i < len(lines) and (re.match(r"^\d+: ", lines[i]) or (lines[i].strip() == "^" or lines[i].rstrip().endswith("^") and not lines[i].strip("^ "))):
            i += 1
    else:
        file, line, column = _r_find_call(ctx, call)
        missing = re.match(r"^object '(?P<name>[^']+)' not found", message)
        if line is None and missing:  # "Error: object 'totl' not found": look for the name itself
            name = re.escape(missing["name"])
            found = _unique_match(ctx, re.compile(rf"(?<![\w.]){name}(?![\w.])"), comment="#")
            if found[1] is not None:
                return BlockResult(records=[_record(ctx, message, found[0], found[1], "r.error", start + 1,
                                                    _r_skip_tail(lines, i), column=found[2])],
                                   next_index=_r_skip_tail(lines, i))
    while i < len(lines) and lines[i].startswith(("Calls: ", "Execution halted")):
        i += 1
    column = utf16_column(ctx, file, line, column)
    return BlockResult(records=[_record(ctx, message or "R error", file, line, "r.error", start + 1, i,
                                        column=column)], next_index=i)


def _r_skip_tail(lines: list[str], i: int) -> int:
    while i < len(lines) and lines[i].startswith(("Calls: ", "Execution halted")):
        i += 1
    return i


def _r_warnings(lines: list[str], start: int, ctx: BlockContext) -> BlockResult:
    records: list[Record] = []
    i = start + 1
    while i < len(lines) and lines[i].strip() and not _R_END.match(lines[i]):
        item_start = i
        wm = _R_WARNING_ITEM.match(lines[i])
        call = wm["call"] if wm else None
        message, i = _r_message(lines, i + 1, wm["message"] if wm else lines[i])
        if not message:
            continue
        file, line, column = _r_find_call(ctx, call)
        column = utf16_column(ctx, file, line, column)
        text = f"{message} (warning in {call})" if call else f"{message} (warning)"
        records.append(_record(ctx, text, file, line, "r.warning", item_start + 1, i, column=column,
                               severity=Severity.WARNING))
        if len(records) >= 10:
            break
    return BlockResult(records=records, next_index=max(i, start + 1))
