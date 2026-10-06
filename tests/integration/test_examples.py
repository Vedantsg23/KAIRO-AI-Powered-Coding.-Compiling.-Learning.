"""Every starter program and gallery example in the web app does what its card says.

The editor's examples (apps/web/src/onboarding/examples/) are real programs
with a declared outcome: runs, fails to compile, fails while running, or
hits the time limit. This runs each one through the production path and
checks the final state, the diagnostic code the card promises and, for
programs that run, a line of their output.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

pytestmark = pytest.mark.docker

EXAMPLES = Path(__file__).resolve().parents[2] / "apps" / "web" / "src" / "onboarding" / "examples"
MANIFEST = json.loads((EXAMPLES / "manifest.json").read_text(encoding="utf-8"))

# HTML, CSS and React run in the browser's preview, not in the sandbox: the
# web app's end-to-end tests check those (apps/web/e2e/preview.spec.ts).
SANDBOXED = {lang: data for lang, data in MANIFEST.items() if data.get("runsIn") != "browser"}
STARTERS = [(lang, data["starter"]) for lang, data in SANDBOXED.items()]
CASES = [(lang, example) for lang, data in SANDBOXED.items() for example in data["examples"]]
OUTCOME_STATES = {"runs": {"SUCCEEDED"}, "compile-error": {"COMPILE_ERROR"}, "runtime-error": {"RUNTIME_ERROR"},
                  "time-limit": {"TIMEOUT"}}


@pytest.mark.parametrize("lang, starter", STARTERS, ids=[lang for lang, _ in STARTERS])
def test_starter_program_runs(execute, lang, starter):
    out = execute(lang, (EXAMPLES / lang / starter).read_text(encoding="utf-8"))
    assert out.state == "SUCCEEDED", (out.state, out.codes)
    assert out.codes == [] or all(code.endswith(("UNUSED", "_UNUSED_VARIABLE")) for code in out.codes), out.codes
    assert out.stdout().strip()


@pytest.mark.parametrize("lang, example", CASES, ids=[f"{lang}-{e['id']}" for lang, e in CASES])
def test_example_behaves_as_its_card_says(execute, lang, example):
    source = (EXAMPLES / lang / example["file"]).read_text(encoding="utf-8")
    out = execute(lang, source, stdin=example.get("stdin", ""))
    expect = example["expect"]
    assert out.state == expect["state"], (out.state, out.codes)
    assert out.state in OUTCOME_STATES[example["outcome"]]
    if "code" in expect:
        assert expect["code"] in out.codes, out.codes
    if "stdout" in expect:
        assert expect["stdout"] in out.stdout()
    if out.state in {"COMPILE_ERROR", "RUNTIME_ERROR"}:
        # a failing example must explain itself with at least one error diagnostic
        assert any(d.severity.value == "error" for d in out.diagnostics), out.codes


def test_manifest_lists_every_example_file():
    for lang, data in MANIFEST.items():
        listed = {data["starter"], *(e["file"] for e in data["examples"])}
        on_disk = {p.name for p in (EXAMPLES / lang).iterdir() if p.is_file()}
        assert listed == on_disk, (lang, sorted(on_disk ^ listed))
