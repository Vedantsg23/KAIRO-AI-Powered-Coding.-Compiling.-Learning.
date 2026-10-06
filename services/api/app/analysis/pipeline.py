"""Turn a runner JobResult into normalized diagnostics for one execution."""

from __future__ import annotations

import hashlib

from ..adapters.profile import LanguageProfile, Step
from ..schemas.diagnostics import (
    Category,
    Diagnostic,
    RawOutputReference,
    Severity,
)
from ..schemas.runner import JobResult, StepResult
from .classify import classify
from .grammar import parse_stream, record_range
from .synthesis import synthesize
from .text import SourceText

UNPARSED_PREVIEW = 160


def diagnose(profile: LanguageProfile, execution_id: str, sources: dict[str, str],
             result: JobResult) -> list[Diagnostic]:
    texts = {path: SourceText(content) for path, content in sources.items()}
    drafts: list[dict] = []
    for step_result in result.steps:
        try:
            step = profile.step(step_result.name)
        except KeyError:
            continue  # the runner reported a step this profile does not know
        drafts.extend(_diagnose_step(profile, step, step_result, texts))

    # GCC sometimes reports the same problem twice (twice as an error, or as a
    # warning and then an error). Keep one copy, with the highest severity.
    unique: dict[tuple, dict] = {}
    for draft in drafts:
        rng = draft.get("range")
        key = (draft["code"], draft.get("file"), rng.start_line if rng else None,
               rng.start_column if rng else None, draft["message"])
        kept = unique.get(key)
        if kept is None:
            unique[key] = draft
        elif _RANK[draft["severity"]] > _RANK[kept["severity"]]:
            kept.update(severity=draft["severity"], raw_output_reference=draft.get("raw_output_reference"))

    return [
        Diagnostic(id=_diag_id(execution_id, ordinal, draft["code"]), execution_id=execution_id, **draft)
        for ordinal, draft in enumerate(unique.values())
    ]


_RANK = {Severity.INFO: 0, Severity.WARNING: 1, Severity.ERROR: 2}


def _diagnose_step(profile: LanguageProfile, step: Step, step_result: StepResult,
                   texts: dict[str, SourceText]) -> list[dict]:
    drafts: list[dict] = []
    grammar = profile.grammars.get(step.grammar) if step.grammar else None
    if grammar is not None:
        for stream in grammar.streams:
            parsed = parse_stream(getattr(step_result, stream), grammar, stream=stream,
                                  profile=profile, sources=texts)
            for record in parsed.records:
                verdict = classify(record, step, profile, texts)
                drafts.append({
                    "source": step.diagnostic_source,
                    "severity": record.severity,
                    "category": verdict.category,
                    "code": verdict.code,
                    "message": record.message,
                    "file": record.file,
                    "range": record_range(record, texts),
                    "related_locations": [*record.related, *verdict.related],
                    "raw_output_reference": RawOutputReference(
                        step=step.name, stream=stream, start_line=record.raw_start, end_line=record.raw_end),
                })
            if grammar.report_unmatched and parsed.unmatched:
                drafts.append(_unparsed(step, stream, parsed.unmatched))

    explained = any(d["severity"] is Severity.ERROR and d["code"] != "UNPARSED" for d in drafts)
    for s in synthesize(step, step_result, explained, profile.signal_messages):
        drafts.append({
            "source": step.diagnostic_source,
            "severity": s.severity,
            "category": s.category,
            "code": s.code,
            "message": s.message,
        })
    return drafts


def _unparsed(step: Step, stream: str, lines: list[tuple[int, str]]) -> dict:
    """Never drop toolchain output silently: keep a pointer to what we could not read."""
    first = lines[0][1].strip()
    if len(first) > UNPARSED_PREVIEW:
        first = first[:UNPARSED_PREVIEW] + "..."
    more = f" (+{len(lines) - 1} more lines)" if len(lines) > 1 else ""
    return {
        "source": step.diagnostic_source,
        "severity": Severity.INFO,
        "category": Category.OTHER,
        "code": "UNPARSED",
        "message": f"Output not recognized by the {step.name} grammar: {first}{more}",
        "raw_output_reference": RawOutputReference(
            step=step.name, stream=stream, start_line=lines[0][0], end_line=lines[-1][0]),
    }


def _diag_id(execution_id: str, ordinal: int, code: str) -> str:
    digest = hashlib.sha256(f"{execution_id}:{ordinal}:{code}".encode()).hexdigest()
    return f"diag_{digest[:16]}"
