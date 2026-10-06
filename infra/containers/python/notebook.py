"""KAIRO's notebook runner: runs a notebook's code cells like a freshly started
Jupyter kernel, inside the Python sandbox. Trusted code, part of the image.

    python3 -I -B -u /opt/code-drishti/notebook.py /workspace/notebook.json

notebook.json is {"cells": ["<code of cell 1>", "<code of cell 2>", ...]}: the
code cells to run, in order (the web app sends the cells up to the one being
run; each run starts from a fresh interpreter). The cells share one
namespace. Before a cell runs, a marker line goes to stdout and to stderr:

    \x1eKAIRO-CELL <n>\x1e

so the web app can give each cell its own output. When a cell ends with an
expression (and no ';'), its value is shown the way Jupyter shows Out[n]:

    \x1eKAIRO-RESULT <n>\x1e
    <repr of the value>

When a cell raises, its traceback (the cell's own frames, with its code) goes to
stderr, then one summary line, and the following cells do not run (exit 1):

    \x1eKAIRO-ERROR <n> <line in the cell> <ExceptionType>: <message>\x1e

IPython magics (%time, %matplotlib ...) and shell escapes (!pip ...) are not
Python and cannot run in the sandbox: when a cell only fails to parse because
of such lines, they are skipped with a note instead of failing the cell.
"""

from __future__ import annotations

import ast
import json
import linecache
import re
import sys
import traceback

MARK = "\x1e"
MAGIC = re.compile(r"^(\s*)([%!].*)$")


def mark(stream, text: str) -> None:
    stream.flush()
    stream.write(f"\n{MARK}KAIRO-{text.replace(MARK, ' ')}{MARK}\n")
    stream.flush()


def cell_name(n: int) -> str:
    return f"<cell {n}>"


def error_line(exc: BaseException, name: str) -> int:
    if isinstance(exc, SyntaxError) and exc.filename == name and exc.lineno:
        return exc.lineno
    line = 0
    tb = exc.__traceback__
    while tb is not None:
        if tb.tb_frame.f_code.co_filename == name:
            line = tb.tb_lineno
        tb = tb.tb_next
    return line


def exception_only(exc: BaseException) -> str:
    """The exception lines as Python prints them, with its "Did you mean ..."
    hints (computed from the traceback, so it has to be passed along)."""
    return "".join(traceback.TracebackException.from_exception(exc).format_exception_only())


def summary_of(exc: BaseException) -> str:
    """The "Type: message" line, with Python's own hints ("Did you mean ...")."""
    lines = exception_only(exc).strip().split("\n")
    names = {type(exc).__name__, type(exc).__qualname__, f"{type(exc).__module__}.{type(exc).__qualname__}"}
    for line in lines:
        head = line.split(":", 1)[0].strip()
        if head in names:
            return line.strip()
    return lines[-1].strip() if lines else type(exc).__name__


def parse_cell(code: str, name: str) -> ast.Module:
    try:
        return ast.parse(code, filename=name, mode="exec")
    except SyntaxError:
        lines = code.splitlines(True)
        skipped = [i for i, line in enumerate(lines, 1) if MAGIC.match(line.rstrip("\n"))]
        if not skipped:
            raise
        cleaned = "".join(
            MAGIC.sub(lambda m: f"{m.group(1)}pass", line.rstrip("\n")) + ("\n" if line.endswith("\n") else "")
            for line in lines
        )
        try:
            tree = ast.parse(cleaned, filename=name, mode="exec")
        except SyntaxError:
            # Report the error in the student's own code, not in the rewrite.
            ast.parse(code, filename=name, mode="exec")
            raise
        where = ("line " if len(skipped) == 1 else "lines ") + ", ".join(str(i) for i in skipped)
        sys.stderr.write(
            f"Note: {where} skipped - IPython magics (%...) and shell commands (!...) "
            "do not run in KAIRO's sandbox.\n"
        )
        sys.stderr.flush()
        return tree


def display(*objects) -> None:
    """Jupyter's display(): show each value like Out[n] does."""
    for value in objects:
        print(repr(value))


def run_cell(n: int, code: str, namespace: dict) -> None:
    name = cell_name(n)
    # Let tracebacks show the cell's lines.
    linecache.cache[name] = (len(code), None, code.splitlines(True), name)
    tree = parse_cell(code, name)
    last = None
    quiet = code.rstrip().endswith(";")  # Jupyter: a trailing ';' hides Out[n]
    if tree.body and isinstance(tree.body[-1], ast.Expr) and not quiet:
        last = ast.Expression(tree.body.pop().value)
    # Running the student's cells is this runner's job; it only ever runs inside the sandbox.
    exec(compile(tree, name, "exec"), namespace)  # noqa: S102
    if last is not None:
        value = eval(compile(last, name, "eval"), namespace)
        if value is not None:
            text = repr(value)
            sys.stdout.flush()
            mark(sys.stdout, f"RESULT {n}")
            sys.stdout.write(text + "\n")
            sys.stdout.flush()


def main() -> int:
    with open(sys.argv[1], encoding="utf-8") as handle:
        cells = json.load(handle).get("cells", [])
    namespace: dict = {"__name__": "__main__", "__builtins__": __builtins__, "display": display}
    for n, code in enumerate(cells, 1):
        if not isinstance(code, str):
            code = ""
        mark(sys.stdout, f"CELL {n}")
        mark(sys.stderr, f"CELL {n}")
        try:
            run_cell(n, code, namespace)
        except SystemExit as stop:
            # exit() inside a cell ends the notebook run quietly, like a kernel.
            return stop.code if isinstance(stop.code, int) else 0
        except BaseException as exc:  # noqa: BLE001 - every error is reported to the student
            sys.stdout.flush()
            name = cell_name(n)
            frames = traceback.extract_tb(exc.__traceback__)
            own = [f for f in frames if f.filename.startswith("<cell ")]
            if own:  # a syntax error has no frames, like Python's own report
                sys.stderr.write("Traceback (most recent call last):\n")
                sys.stderr.write("".join(traceback.format_list(own)))
            sys.stderr.write(exception_only(exc))
            mark(sys.stderr, f"ERROR {n} {error_line(exc, name)} {summary_of(exc)}")
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
