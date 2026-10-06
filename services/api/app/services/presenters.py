"""Convert internal entities into the public response contracts."""

from __future__ import annotations

import re

from ..adapters.profile import LanguageProfile
from ..analysis.synthesis import signal_name
from ..domain.execution import Execution, ExecutionState, StepStatus
from ..schemas.diagnostics import DiagnosticSource, Severity
from ..schemas.executions import ExecutionOut, ExecutionStepOut, StepLimitsOut, ToolchainOut
from ..schemas.languages import LanguageOut, LanguageStepOut, LanguageToolchainOut
from ..schemas.runner import StepResult


def language_out(profile: LanguageProfile, available: bool | None = None) -> LanguageOut:
    return LanguageOut(
        available=available,
        status=profile.status,
        id=profile.id,
        display_name=profile.display_name,
        editor_mode=profile.editor_mode,
        source_file=profile.source_file,
        toolchain=LanguageToolchainOut(name=profile.toolchain.name,
                                       declared_version=profile.toolchain.declared_version,
                                       image=profile.toolchain.image),
        steps=[LanguageStepOut(name=s.name, kind=s.kind, label=s.display_label, argv=list(s.argv),
                               limits=_limits(s))
               for s in profile.steps],
    )


def execution_out(execution: Execution, profile: LanguageProfile, queue_position: int | None) -> ExecutionOut:
    results = {r.name: r for r in execution.result.steps} if execution.result else {}
    steps = [_step_out(step, execution.step_status.get(step.name, StepStatus.PENDING), results.get(step.name))
             for step in profile.steps]

    toolchain = None
    if execution.result is not None:
        info = execution.result.toolchain
        toolchain = ToolchainOut(
            name=info.name if info else profile.toolchain.name,
            version=info.version if info else None,
            image=execution.result.image,
            image_id=execution.result.image_id or None,
        )

    return ExecutionOut(
        id=execution.id,
        language_id=execution.language_id,
        state=execution.state,
        terminal=execution.terminal,
        summary=summarize(execution, profile, queue_position),
        source_hash=execution.source_hash,
        source_bytes=len(execution.source.encode("utf-8")),
        queue_position=queue_position if execution.state is ExecutionState.QUEUED else None,
        created_at=execution.created_at,
        started_at=execution.started_at,
        finished_at=execution.finished_at,
        toolchain=toolchain,
        steps=steps,
        diagnostics=execution.diagnostics,
        error=execution.error,
    )


def _limits(step) -> StepLimitsOut:
    return StepLimitsOut(wall_time_ms=step.limits.wall_time_ms, memory_mb=step.limits.memory_mb,
                         output_kb=step.limits.output_kb)


def _step_out(step, status: StepStatus, result: StepResult | None) -> ExecutionStepOut:
    out = ExecutionStepOut(name=step.name, kind=step.kind, status=status, limits=_limits(step))
    if result is not None:
        out = out.model_copy(update={
            "termination": result.termination.value,
            "exit_code": result.exit_code,
            "signal": result.signal,
            "signal_name": signal_name(result.signal),
            "duration_ms": result.duration_ms,
            "wall_ms": result.wall_ms,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "stdout_truncated": result.stdout_truncated,
            "stderr_truncated": result.stderr_truncated,
            "peak_memory_bytes": result.peak_memory_bytes,
        })
    return out


def _plural(n: int, word: str) -> str:
    return f"{n} {word}{'' if n == 1 else 's'}"


_EXCEPTION_NAME = re.compile(r"^([A-Za-z_][\w.]*(?:Error|Exception))\b")


def _runtime_headline(execution: Execution) -> str | None:
    """'Stopped by ZeroDivisionError' for an uncaught exception (Python, Java, C++)."""
    for d in execution.diagnostics:
        if d.source is not DiagnosticSource.RUNTIME or d.severity is not Severity.ERROR:
            continue
        if d.message.startswith("Uncaught exception of type "):
            kind = d.message.removeprefix("Uncaught exception of type ").split(":", 1)[0]
            return f"Stopped by an uncaught {kind}"
        match = _EXCEPTION_NAME.match(d.message)
        return f"Stopped by {match.group(1)}" if match else None
    return None


def summarize(execution: Execution, profile: LanguageProfile, queue_position: int | None) -> str:
    state = execution.state
    compile_step = next((s for s in profile.steps if s.kind == "compile"), None)
    check = compile_step.display_label if compile_step else "Compile"
    errors = sum(d.severity is Severity.ERROR for d in execution.diagnostics)
    warnings = sum(d.severity is Severity.WARNING for d in execution.diagnostics)
    run_result = None
    if execution.result is not None:
        run_steps = {s.name for s in profile.steps if s.kind == "run"}
        run_result = next((r for r in execution.result.steps if r.name in run_steps), None)

    if state is ExecutionState.QUEUED:
        return f"Waiting in queue (position {queue_position})" if queue_position else "Waiting in queue"
    if state is ExecutionState.STARTING:
        return "Preparing a fresh sandbox"
    if state is ExecutionState.COMPILING:
        return "Compiling" if check == "Compile" else f"{check}: running"
    if state is ExecutionState.RUNNING:
        return "Running"
    if state is ExecutionState.SUCCEEDED:
        if errors:  # e.g. a shell script that printed errors but still exited with status 0
            return f"Finished, but reported {_plural(errors, 'error')}"
        return "Finished successfully" + (f" with {_plural(warnings, 'warning')}" if warnings else "")
    if state is ExecutionState.COMPILE_ERROR:
        what = "Compilation" if check == "Compile" else check
        return f"{what} failed: {_plural(errors, 'error')}, {_plural(warnings, 'warning')}"
    if state is ExecutionState.RUNTIME_ERROR:
        headline = _runtime_headline(execution)
        if headline:
            return headline
        if run_result is not None and run_result.termination.value == "OUTPUT_LIMIT":
            return "Stopped: too much output"
        if run_result is not None and run_result.signal is not None:
            return f"Crashed with {signal_name(run_result.signal)}"
        if run_result is not None and run_result.exit_code is not None:
            return f"Exited with status {run_result.exit_code}"
        return "Runtime error"
    if state is ExecutionState.TIMEOUT:
        return "Stopped: time limit reached"
    if state is ExecutionState.MEMORY_LIMIT:
        return "Stopped: memory limit reached"
    if state is ExecutionState.REJECTED:
        return "Not run: the sandbox is busy, please try again"
    if state is ExecutionState.CANCELLED:
        return "Cancelled"
    return f"Platform error: {execution.error or 'unknown'}"
