"""Position helpers that work against the exact source snapshot.

Toolchains count columns differently (GCC: bytes, Python: code points,
Monaco/LSP: UTF-16 code units). Everything is converted to UTF-16 here.
"""

from __future__ import annotations

import re
from typing import Literal

from ..schemas.diagnostics import SourceRange

ColumnUnit = Literal["byte", "utf16", "codepoint"]

_WORD = re.compile(r"[A-Za-z0-9_]+")


class SourceText:
    def __init__(self, text: str) -> None:
        self.lines = text.split("\n")

    def line(self, number: int) -> str | None:
        """1-based line without its line terminator, or None if out of range."""
        if 1 <= number <= len(self.lines):
            return self.lines[number - 1].rstrip("\r")
        return None


def utf16_len(text: str) -> int:
    return len(text.encode("utf-16-le")) // 2


def to_utf16_column(line_text: str | None, column: int, unit: ColumnUnit) -> int:
    """Convert a 1-based column in `unit` to a 1-based UTF-16 column."""
    if line_text is None or unit == "utf16" or column <= 1:
        return max(column, 1)
    if unit == "byte":
        prefix = line_text.encode("utf-8")[: column - 1].decode("utf-8", errors="ignore")
    else:  # code points
        prefix = line_text[: column - 1]
    return utf16_len(prefix) + 1


def token_range(source: SourceText, line: int, column: int | None) -> SourceRange:
    """Range of the token starting at (line, column); whole line if column is unknown."""
    text = source.line(line)
    if text is None:
        col = column or 1
        return SourceRange(start_line=line, start_column=col, end_line=line, end_column=col + 1)
    if column is None:
        stripped = len(text) - len(text.lstrip())
        start = utf16_len(text[:stripped]) + 1
        end = max(utf16_len(text.rstrip()) + 1, start + 1)
        return SourceRange(start_line=line, start_column=start, end_line=line, end_column=end)

    index = _utf16_to_index(text, column)
    if index >= len(text):
        return SourceRange(start_line=line, start_column=column, end_line=line, end_column=column + 1)
    char = text[index]
    closing = {'"': '"', "'": "'"}.get(char)
    if char == "<" and text.lstrip().startswith("#"):
        closing = ">"  # #include <header.h>
    if closing is not None:
        # A literal or header name: cover it up to the closing delimiter
        # (or to the end of the line when it is unterminated).
        found = text.find(closing, index + 1)
        stop = found + 1 if found != -1 else len(text.rstrip())
        end = column + utf16_len(text[index:stop])
    else:
        match = _WORD.match(text, index)
        end = column + utf16_len(match.group(0) if match else char)
    return SourceRange(start_line=line, start_column=column, end_line=line, end_column=end)


def previous_line_end(source: SourceText, line: int) -> tuple[int, int] | None:
    """(line, column) just after the last code character of the previous
    non-blank line, ignoring a trailing // comment. None if that line already
    ends a statement or opens a block, or is a preprocessor line."""
    number = line - 1
    while number >= 1:
        text = source.line(number)
        if text is not None and text.strip():
            break
        number -= 1
    else:
        return None
    code = text.split("//", 1)[0].rstrip()
    if not code or code.lstrip().startswith("#") or code[-1] in ";{":
        return None
    return number, utf16_len(code) + 1


def _utf16_to_index(text: str, column: int) -> int:
    """Map a 1-based UTF-16 column to a Python string index."""
    units = 0
    for index, char in enumerate(text):
        if units >= column - 1:
            return index
        units += utf16_len(char)
    return len(text)
