import hashlib

import pytest

from app.domain.execution import Execution, ExecutionState, source_hash
from app.schemas.runner import JobResult, StepResult, Termination
from app.services.executions import final_state

KINDS = {"compile": "compile", "run": "run"}


def result(*steps, error=None):
    return JobResult(job_id="j", image="i", image_id="x", steps=list(steps), error=error)


def step(name, termination=Termination.EXITED, exit_code=0):
    return StepResult(name=name, termination=termination, exit_code=exit_code, wall_ms=1)


@pytest.mark.parametrize(("job", "expected"), [
    (result(step("compile"), step("run")), ExecutionState.SUCCEEDED),
    (result(step("compile", exit_code=1)), ExecutionState.COMPILE_ERROR),
    (result(step("compile", Termination.TIMEOUT, 137)), ExecutionState.TIMEOUT),
    (result(step("compile", Termination.MEMORY_LIMIT, 1)), ExecutionState.MEMORY_LIMIT),
    (result(step("compile"), step("run", exit_code=3)), ExecutionState.RUNTIME_ERROR),
    (result(step("compile"), step("run", Termination.SIGNALED, 139)), ExecutionState.RUNTIME_ERROR),
    (result(step("compile"), step("run", Termination.OUTPUT_LIMIT, 137)), ExecutionState.RUNTIME_ERROR),
    (result(step("compile"), step("run", Termination.TIMEOUT, 137)), ExecutionState.TIMEOUT),
    (result(step("compile"), step("run", Termination.MEMORY_LIMIT, 137)), ExecutionState.MEMORY_LIMIT),
    (result(step("compile")), ExecutionState.INTERNAL_ERROR),  # run step missing without a failure
    (result(error="boom"), ExecutionState.INTERNAL_ERROR),
])
def test_final_state(job, expected):
    assert final_state(job, KINDS) is expected


def test_source_hash_is_sha256_of_utf8():
    assert source_hash("é") == "sha256:" + hashlib.sha256("é".encode()).hexdigest()


def test_new_execution_starts_queued_with_pending_steps():
    execution = Execution.create("c", "int main(void){}", "", ["compile", "run"])
    assert execution.state is ExecutionState.QUEUED
    assert not execution.terminal
    assert set(execution.step_status.values()) == {"PENDING"}
    assert len(execution.id) == len("exe_") + 24
