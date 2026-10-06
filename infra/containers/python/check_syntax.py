"""Syntax check for Code Drishti's Python adapter (the "compile" step).

Compiles main.py to bytecode WITHOUT running it and reports problems in
CPython's own formats, so students see the same text `python3 main.py` would
print:

  * errors: traceback.format_exception_only(), for every SyntaxError subclass
    (IndentationError and TabError included; py_compile prints those as a
    one-line "Sorry: ..." without a column);
  * warnings found while compiling (SyntaxWarning, DeprecationWarning):
    warnings.formatwarning(), i.e. "main.py:2: SyntaxWarning: ...".

Exit status: 0 = no syntax errors, 1 = syntax error, 2 = usage error.
This file is trusted platform code baked into the sandbox image; the
student's program is only ever read as data here.
"""

import sys
import traceback
import warnings


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        sys.stderr.write("usage: check_syntax.py <file.py>\n")
        return 2
    path = argv[1]
    with open(path, "rb") as fh:
        source = fh.read()
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always")
        try:
            compile(source, path, "exec", dont_inherit=True)
        except SyntaxError as exc:
            _report_warnings(caught)
            sys.stderr.write("".join(traceback.format_exception_only(type(exc), exc)))
            return 1
        except ValueError as exc:  # e.g. "source code string cannot contain null bytes"
            _report_warnings(caught)
            sys.stderr.write(f"SyntaxError: {exc}\n")
            return 1
    _report_warnings(caught)
    return 0


def _report_warnings(caught: list[warnings.WarningMessage]) -> None:
    for w in caught:
        sys.stderr.write(warnings.formatwarning(w.message, w.category, w.filename, w.lineno))


if __name__ == "__main__":
    sys.exit(main(sys.argv))
