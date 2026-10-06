"""KAIRO's Python formatter: prints /workspace/main.py formatted by Black.

Trusted code, part of the image; used by the "fmt-python" profile (the
"Sandbox Formatters" extension). The student's code is only parsed and
reformatted, never run. Black's own command line cannot print a formatted
file without writing it (the workspace is read-only) or reading standard
input, hence this small wrapper.
"""

from __future__ import annotations

import sys

import black


def main() -> int:
    path = sys.argv[1] if len(sys.argv) > 1 else "/workspace/main.py"
    with open(path, encoding="utf-8") as handle:
        source = handle.read()
    try:
        formatted = black.format_str(source, mode=black.Mode())
    except black.InvalidInput as exc:
        # "Cannot parse: 3:7: print('x'" -> the line and column of the syntax error.
        sys.stderr.write(f"error: cannot format main.py: {exc}\n")
        return 1
    sys.stdout.write(formatted)
    return 0


if __name__ == "__main__":
    sys.exit(main())
