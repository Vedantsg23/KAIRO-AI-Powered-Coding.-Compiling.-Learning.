"""Shared types for the output parsers (line grammar and block parsers)."""

from __future__ import annotations

from dataclasses import dataclass, field

from ..adapters.profile import Grammar, LanguageProfile
from ..schemas.diagnostics import RelatedLocation, Severity, SourceRange
from .text import SourceText, token_range


@dataclass
class Record:
    """One diagnostic found in a tool's output, before classification."""

    severity: Severity
    message: str
    file: str | None
    line: int | None
    column: int | None  # 1-based UTF-16
    rule_id: str
    stream: str
    raw_start: int  # 1-based line numbers in the raw output
    raw_end: int
    context: dict[str, str] = field(default_factory=dict)
    related: list[RelatedLocation] = field(default_factory=list)
    # An exact range (e.g. from Python's ~~~^^^ markers); wins over the
    # token-based range computed from line/column.
    range: SourceRange | None = None


@dataclass
class BlockContext:
    profile: LanguageProfile
    grammar: Grammar
    sources: dict[str, SourceText]
    stream: str

    def normalize_file(self, file: str | None) -> str | None:
        return normalize_file(file, self.profile)

    def is_user_file(self, file: str | None) -> bool:
        return file is not None and file in self.sources


@dataclass
class BlockResult:
    records: list[Record]
    next_index: int  # index of the first line after the block (0-based)


def normalize_file(file: str | None, profile: LanguageProfile) -> str | None:
    """Workspace-relative path: '/workspace/main.c' and './main.c' become 'main.c'."""
    if not file:
        return None
    file = file.removeprefix(profile.workspace_prefix)
    file = file.removeprefix("./")
    return file


def location_range(sources: dict[str, SourceText], file: str | None, line: int | None,
                   column: int | None) -> SourceRange | None:
    """Range of the token at (line, column), the whole line if column is None,
    or a one-character range when the file is not one of the user's sources."""
    if file is None or line is None:
        return None
    source = sources.get(file)
    if source is None:  # e.g. a system header: keep the position, no token info
        col = column or 1
        return SourceRange(start_line=line, start_column=col, end_line=line, end_column=col + 1)
    return token_range(source, line, column)
