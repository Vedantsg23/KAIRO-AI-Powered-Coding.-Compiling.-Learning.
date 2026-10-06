"""The evidence Saarthi sees, built on the server from one execution.

Only the execution's exact source snapshot, its normalized diagnostics, its
input and its output are used, so an answer always belongs to the source hash
it was produced for. Everything is size-capped: long files are shown around
the lines that matter, long output keeps its start (stdout) or end (stderr).

Student text is untrusted. Besides the system prompt's rule to treat tagged
content as data, the tag names used here are defused inside that content so
a program cannot close a tag and pose as the platform.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

from ..adapters.profile import LanguageProfile
from ..domain.execution import Execution
from ..schemas.diagnostics import Diagnostic, Severity

MAX_LISTED_LINES = 400      # whole file up to this size
MAX_LISTED_CHARS = 24_000
WINDOW = 20                 # lines around each focus line for longer files
MAX_DIAGNOSTICS = 12
MAX_STDOUT_CHARS = 1_500
MAX_STDERR_CHARS = 3_000
MAX_INPUT_CHARS = 1_000

_TAGS = ("run", "source", "input", "output", "diagnostics", "question", "code_before", "code_after", "language")
_TAG_PATTERN = re.compile(r"<(/?)(" + "|".join(_TAGS) + r")\b", re.IGNORECASE)


def defuse(text: str) -> str:
    """Make '<source>' / '</output>' inside untrusted text harmless: '<\u200bsource>'."""
    return _TAG_PATTERN.sub(lambda m: f"<{m.group(1)}\u200b{m.group(2)}", text)


def numbered_listing(source: str, focus_lines: set[int]) -> tuple[str, int]:
    """The source with right-aligned line numbers; long files show windows
    around the focus lines. Returns (listing, number of lines in the file)."""
    lines = source.split("\n")
    if lines and lines[-1] == "":
        lines = lines[:-1]  # the newline at the end of the file is not a line
    total = len(lines)
    width = max(3, len(str(total)))
    shown: list[int]
    if total <= MAX_LISTED_LINES and len(source) <= MAX_LISTED_CHARS:
        shown = list(range(1, total + 1))
    else:
        keep = set(range(1, min(total, 15) + 1))  # the top: includes/imports
        for line in focus_lines or {1}:
            keep.update(range(max(1, line - WINDOW), min(total, line + WINDOW) + 1))
        shown = sorted(keep)
    out: list[str] = []
    previous = 0
    for number in shown:
        if number != previous + 1:
            out.append(f"{'':>{width}} | ... (lines {previous + 1}-{number - 1} not shown)")
        text = lines[number - 1].rstrip("\r")
        if len(text) > 400:
            text = text[:400] + " ...(line shortened)"
        out.append(f"{number:>{width}} | {defuse(text)}")
        previous = number
    if previous < total:
        out.append(f"{'':>{width}} | ... (lines {previous + 1}-{total} not shown)")
    return "\n".join(out), total


def _head(text: str, limit: int) -> str:
    return text if len(text) <= limit else text[:limit] + f"\n...({len(text) - limit} more characters)"


def _tail(text: str, limit: int) -> str:
    return text if len(text) <= limit else f"...({len(text) - limit} earlier characters)\n" + text[-limit:]


def describe_diagnostic(d: Diagnostic) -> str:
    where = ""
    if d.range is not None:
        where = f" at line {d.range.start_line}, column {d.range.start_column}"
    text = f"{d.severity.value} {d.code} ({d.category.value}, from the {d.source.value}){where}: {d.message}"
    for rel in d.related_locations[:3]:
        line = f"line {rel.range.start_line}" if rel.range is not None else (rel.file or "elsewhere")
        text += f"\n      related, {line}: {rel.message}"
    return defuse(text)


@dataclass
class Evidence:
    text: str                      # the tagged evidence block for the prompt
    focus: Diagnostic | None       # the diagnostic the student asked about
    diagnostic_ids: list[str]      # every diagnostic that was shown to the model
    line_count: int


def pick_focus(execution: Execution, diagnostic_id: str | None) -> Diagnostic | None:
    """The requested diagnostic, else the first error, else the first warning."""
    if diagnostic_id:
        return next((d for d in execution.diagnostics if d.id == diagnostic_id), None)
    for severity in (Severity.ERROR, Severity.WARNING):
        found = next((d for d in execution.diagnostics if d.severity is severity and d.code != "UNPARSED"), None)
        if found is not None:
            return found
    return None


def build_evidence(execution: Execution, profile: LanguageProfile, headline: str,
                   focus: Diagnostic | None, question: str | None = None) -> Evidence:
    diagnostics = [d for d in execution.diagnostics if d.code != "UNPARSED"][:MAX_DIAGNOSTICS]
    if focus is not None and focus not in diagnostics:
        diagnostics = [focus, *diagnostics[: MAX_DIAGNOSTICS - 1]]
    focus_lines = {d.range.start_line for d in diagnostics if d.range is not None}
    listing, total = numbered_listing(execution.source, focus_lines)

    toolchain = execution.result.toolchain if execution.result is not None else None
    version = f" {toolchain.version}" if toolchain and toolchain.version else f" {profile.toolchain.declared_version}"
    parts = [
        "<run>",
        f"language: {profile.display_name} ({profile.toolchain.name}{version})",
        f"steps: {', '.join(f'{s.display_label} ({s.kind})' for s in profile.steps)}",
        f"final state: {execution.state.value} - {headline}",
        "</run>",
        f'<source file="{profile.source_file}" lines="{total}">',
        listing,
        "</source>",
    ]
    if execution.stdin.strip():
        parts += ["<input>", defuse(_head(execution.stdin, MAX_INPUT_CHARS)), "</input>"]
    if diagnostics:
        parts.append("<diagnostics>")
        for n, d in enumerate(diagnostics, 1):
            marker = "  (focus)" if focus is not None and d.id == focus.id else ""
            head, newline, related = describe_diagnostic(d).partition("\n")
            parts.append(f"[{n}] {head}{marker}{newline}{related}")
        parts.append("</diagnostics>")
    else:
        parts.append("<diagnostics>none: the tools reported no problems</diagnostics>")
    if execution.result is not None:
        for step in execution.result.steps:
            status = step.termination.value.lower()
            if step.exit_code is not None:
                status += f", exit status {step.exit_code}"
            if step.signal is not None:
                status += f", signal {step.signal}"
            parts.append(f'<output step="{step.name}" status="{status}" stream="stdout">'
                         f"{defuse(_head(step.stdout, MAX_STDOUT_CHARS)) if step.stdout else '(empty)'}</output>")
            if step.stderr:
                parts.append(f'<output step="{step.name}" stream="stderr">'
                             f"{defuse(_tail(step.stderr, MAX_STDERR_CHARS))}</output>")
    if question:
        parts += ["<question>", defuse(question.strip()), "</question>"]
    return Evidence("\n".join(parts), focus, [d.id for d in diagnostics], total)


def build_source_only(source: str, profile: LanguageProfile | None, question: str) -> str:
    """Evidence for a question about code that has not been run yet."""
    listing, total = numbered_listing(source, set())
    language = profile.display_name if profile is not None else "unknown language"
    return "\n".join([
        "<run>", f"language: {language}", "final state: not run yet (no diagnostics or output)", "</run>",
        f'<source lines="{total}">', listing, "</source>",
        "<question>", defuse(question.strip()), "</question>",
    ])
