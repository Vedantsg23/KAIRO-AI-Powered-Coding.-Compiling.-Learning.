"""Algorithm A4: rule-based classification into the shared fault taxonomy.

Each record's message is checked against the profile's ordered [[classify]]
rules; the first rule whose pattern is found decides the category and the
stable code. Unmatched messages fall back to <PREFIX>_COMPILER_ERROR,
<PREFIX>_COMPILER_WARNING or <PREFIX>_RUNTIME_ERROR in category "other" /
"runtime", so every diagnostic always has a code.
"""

from __future__ import annotations

from dataclasses import dataclass

from ..adapters.profile import ClassifyRule, LanguageProfile, Step
from ..schemas.diagnostics import Category, RelatedLocation, SourceRange
from .records import Record
from .text import SourceText, previous_line_end


@dataclass(frozen=True)
class Classification:
    category: Category
    code: str
    related: tuple[RelatedLocation, ...] = ()


def classify(record: Record, step: Step, profile: LanguageProfile,
             sources: dict[str, SourceText]) -> Classification:
    for rule in profile.classify:
        if rule.pattern.search(record.message):
            return Classification(rule.category, rule.code, _hint(rule, record, sources))
    return _default(record, step, profile)


def _default(record: Record, step: Step, profile: LanguageProfile) -> Classification:
    prefix = profile.code_prefix
    if step.kind == "run":
        return Classification(Category.RUNTIME, f"{prefix}_RUNTIME_ERROR")
    suffix = {"error": "ERROR", "warning": "WARNING"}.get(record.severity.value, "NOTE")
    return Classification(Category.OTHER, f"{prefix}_COMPILER_{suffix}")


def _hint(rule: ClassifyRule, record: Record, sources: dict[str, SourceText]) -> tuple[RelatedLocation, ...]:
    if rule.hint != "previous_line_end" or record.file is None or record.line is None:
        return ()
    source = sources.get(record.file)
    if source is None or record.column is None:
        return ()
    # Only when the error points at the FIRST token of its line: then the
    # missing token most likely belongs at the end of the previous line.
    text = source.line(record.line) or ""
    first_code_column = len(text) - len(text.lstrip()) + 1
    if record.column != first_code_column:
        return ()
    anchor = previous_line_end(source, record.line)
    if anchor is None:
        return ()
    line, after_last = anchor
    # Underline the last character of that line (the insertion point is just after it).
    return (RelatedLocation(
        file=record.file,
        range=SourceRange(start_line=line, start_column=max(after_last - 1, 1), end_line=line,
                          end_column=max(after_last, 2)),
        message=rule.hint_message or "Related position",
    ),)
