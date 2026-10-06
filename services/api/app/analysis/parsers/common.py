"""Helpers shared by the block parsers."""

from __future__ import annotations

from dataclasses import dataclass

from ...schemas.diagnostics import RelatedLocation, SourceRange
from ..records import BlockContext, location_range
from ..text import to_utf16_column

MAX_RELATED = 5


@dataclass
class Frame:
    """One entry of a stack trace, innermost first unless a parser says otherwise."""

    file: str | None
    line: int | None
    column: int | None = None  # 1-based, in the grammar's column unit
    function: str | None = None


def first_user_frame(frames: list[Frame], ctx: BlockContext) -> int | None:
    for k, frame in enumerate(frames):
        if frame.line is not None and ctx.is_user_file(frame.file):
            return k
    return None


def utf16_column(ctx: BlockContext, file: str | None, line: int | None, column: int | None) -> int | None:
    """Convert a column in the grammar's unit to a 1-based UTF-16 column."""
    if column is None or line is None:
        return None
    source = ctx.sources.get(file) if file else None
    text = source.line(line) if source else None
    return to_utf16_column(text, column, ctx.grammar.column_unit)


def callers_as_related(frames: list[Frame], chosen: int, ctx: BlockContext,
                       describe=lambda callee: f"{callee}() was called here" if callee else "Called from here"
                       ) -> list[RelatedLocation]:
    """Frames outside the chosen (innermost) one that are in the student's code,
    as "f() was called here" locations. `frames` must be innermost first."""
    related: list[RelatedLocation] = []
    seen = {frames[chosen].line}
    for callee, caller in zip(frames[chosen:], frames[chosen + 1:], strict=False):
        if caller.line is None or not ctx.is_user_file(caller.file) or caller.line in seen:
            continue
        seen.add(caller.line)
        column = utf16_column(ctx, caller.file, caller.line, caller.column)
        related.append(RelatedLocation(
            file=caller.file, range=location_range(ctx.sources, caller.file, caller.line, column),
            message=describe(callee.function)))
        if len(related) >= MAX_RELATED:
            break
    return related


def span_range(ctx: BlockContext, file: str | None, line: int, start_col: int, length: int) -> SourceRange | None:
    """Range of `length` characters from a 1-based column in the grammar's
    unit, or None when the line is not available."""
    source = ctx.sources.get(file) if file else None
    text = source.line(line) if source else None
    if text is None or length < 1:
        return None
    start = to_utf16_column(text, start_col, ctx.grammar.column_unit)
    end = to_utf16_column(text, start_col + length, ctx.grammar.column_unit)
    if end <= start:
        end = start + 1
    return SourceRange(start_line=line, start_column=start, end_line=line, end_column=end)
