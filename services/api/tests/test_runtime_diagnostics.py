"""Runtime failures: C library messages and signal/limit synthesis.

stderr fixtures in tests/fixtures/gcc-runtime were captured from the sandbox.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from app.adapters.registry import LanguageRegistry
from app.analysis.pipeline import diagnose
from app.schemas.runner import JobResult, StepResult, Termination

FIXTURES = Path(__file__).parent / "fixtures" / "gcc-runtime"
C = LanguageRegistry.from_directory().get("c")


def run_result(termination, exit_code, signal=None, stderr="", source="int main(void){return 0;}\n"):
    result = JobResult(job_id="j", image="img", image_id="x", steps=[
        StepResult(name="compile", termination=Termination.EXITED, exit_code=0, wall_ms=1),
        StepResult(name="run", termination=termination, exit_code=exit_code, signal=signal,
                   wall_ms=1, stderr=stderr)])
    return diagnose(C, "exe_test", {"main.c": source}, result)


def fixture_run(name, termination, exit_code, signal=None):
    source = (FIXTURES / f"{name}.c").read_text(encoding="utf-8")
    stderr = (FIXTURES / f"{name}.stderr.txt").read_text(encoding="utf-8")
    return run_result(termination, exit_code, signal, stderr, source)


def test_failed_assertion_is_located_and_replaces_generic_abort():
    diagnostics = fixture_run("assert", Termination.SIGNALED, 134, 6)
    assert [d.code for d in diagnostics] == ["C_ASSERTION_FAILED"]
    d = diagnostics[0]
    assert d.source.value == "runtime"
    assert d.category.value == "runtime"
    assert d.message == "Assertion `balance >= 0' failed."
    assert (d.range.start_line, d.range.start_column) == (7, 5)  # whole line 7, from first code char


@pytest.mark.parametrize(("name", "code"), [
    ("double_free", "C_HEAP_CORRUPTION"),
    ("stack_smashing", "C_STACK_BUFFER_OVERFLOW"),
])
def test_c_library_memory_errors(name, code):
    diagnostics = fixture_run(name, Termination.SIGNALED, 134, 6)
    assert [(d.code, d.category.value) for d in diagnostics] == [(code, "memory")]


def test_programs_own_stderr_is_not_parsed_as_diagnostics():
    diagnostics = fixture_run("own_stderr_exit3", Termination.EXITED, 3)
    assert [d.code for d in diagnostics] == ["RUNTIME_NONZERO_EXIT"]
    assert "status 3" in diagnostics[0].message


@pytest.mark.parametrize(("termination", "exit_code", "signal", "code", "category"), [
    (Termination.SIGNALED, 139, 11, "RUNTIME_SEGMENTATION_FAULT", "memory"),
    (Termination.SIGNALED, 136, 8, "RUNTIME_ARITHMETIC_ERROR", "runtime"),
    (Termination.SIGNALED, 134, 6, "RUNTIME_ABORTED", "runtime"),
    (Termination.SIGNALED, 137, 9, "RUNTIME_KILLED", "runtime"),
    (Termination.SIGNALED, 153, 25, "LIMIT_FILE_SIZE", "runtime"),
    (Termination.SIGNALED, 159, 31, "RUNTIME_SIGNAL", "runtime"),
    (Termination.TIMEOUT, 137, None, "LIMIT_TIMEOUT", "timeout"),
    (Termination.MEMORY_LIMIT, 137, None, "LIMIT_MEMORY", "memory"),
    (Termination.OUTPUT_LIMIT, 137, None, "LIMIT_OUTPUT", "runtime"),
])
def test_silent_failures_are_synthesized(termination, exit_code, signal, code, category):
    """A crash with an empty stderr must never look like success (A3, lines 7-11)."""
    diagnostics = run_result(termination, exit_code, signal)
    assert [(d.code, d.category.value, d.severity.value) for d in diagnostics] == [(code, category, "error")]
    assert diagnostics[0].range is None
    assert diagnostics[0].source.value == "runtime"


def test_timeout_message_mentions_the_configured_limit():
    message = run_result(Termination.TIMEOUT, 137)[0].message
    assert "5 s time limit" in message


def test_clean_run_has_no_diagnostics():
    assert run_result(Termination.EXITED, 0) == []


def test_compile_step_limits_are_reported_as_compiler_diagnostics():
    result = JobResult(job_id="j", image="img", image_id="x", steps=[
        StepResult(name="compile", termination=Termination.MEMORY_LIMIT, exit_code=1, wall_ms=1,
                   oom_killed=True, stderr="gcc: fatal error: Killed signal terminated program cc1\n"
                                         "compilation terminated.\n")])
    diagnostics = diagnose(C, "exe_test", {"main.c": ""}, result)
    assert [(d.code, d.source.value) for d in diagnostics] == [
        ("TOOLCHAIN_RESOURCE_LIMIT", "compiler"), ("LIMIT_MEMORY", "compiler")]
    assert diagnostics[1].message.startswith("Compilation was stopped")
