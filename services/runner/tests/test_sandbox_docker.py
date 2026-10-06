"""Containment tests against a real Docker daemon and the GCC sandbox image.

Each program in tests/programs/ states its attack and the expected outcome in
its header comment. This is the starter red-team corpus (see
docs/threat-model.md); it is skipped automatically when Docker or the image
is unavailable.
"""

from __future__ import annotations

import re

import pytest

from runner.jobspec import JobEvent, Termination
from runner.sandbox import LABEL_JOB, LABEL_MANAGED, Sandbox

from .conftest import RUN_LIMITS, c_job, program

pytestmark = pytest.mark.docker


def run(sandbox: Sandbox, name: str, stdin: str | None = None):
    result = sandbox.run_job(c_job(program(name), stdin))
    assert result.error is None, result.error
    return {step.name: step for step in result.steps}, result


# ------------------------------------------------------------ baseline


def test_hello_reads_stdin_and_records_toolchain(sandbox):
    steps, result = run(sandbox, "ok_hello_stdin.c", stdin="Vedant\n")
    assert steps["compile"].exit_code == 0
    assert steps["run"].termination is Termination.EXITED
    assert steps["run"].exit_code == 0
    assert steps["run"].stdout == "Hello, Vedant!\n"
    assert result.image_id.startswith("sha256:")
    assert result.toolchain is not None
    assert result.toolchain.name == "GCC"
    assert result.toolchain.version.startswith("13.")


@pytest.mark.parametrize(("stdin", "expected"), [("abc", "3\n"), (None, "0\n")])
def test_end_of_input_is_delivered(sandbox, stdin, expected):
    steps, _ = run(sandbox, "ok_eof_count.c", stdin=stdin)
    assert steps["run"].stdout == expected
    assert steps["run"].wall_ms < 2_000


def test_compile_error_stops_before_run(sandbox):
    result = sandbox.run_job(c_job("int main(void) {\n    int x = 5\n    return x;\n}\n"))
    assert [s.name for s in result.steps] == ["compile"]
    compile_step = result.steps[0]
    assert compile_step.termination is Termination.EXITED
    assert compile_step.exit_code == 1
    assert "error: expected" in compile_step.stderr


def test_progress_events_are_emitted_in_order(sandbox):
    events: list[JobEvent] = []
    sandbox.run_job(c_job(program("ok_hello_stdin.c"), "x\n"), events.append)
    assert [(e.type, e.step) for e in events] == [
        ("step_started", "compile"), ("step_finished", "compile"),
        ("step_started", "run"), ("step_finished", "run"),
    ]


# ------------------------------------------------------------- crashes


@pytest.mark.parametrize(("name", "signal"), [
    ("crash_segfault.c", 11),
    ("crash_stack_overflow.c", 11),
    ("crash_assert.c", 6),
    ("crash_divide_by_zero.c", 8),
])
def test_crash_reports_signal(sandbox, name, signal):
    steps, _ = run(sandbox, name)
    assert steps["run"].termination is Termination.SIGNALED
    assert steps["run"].signal == signal
    assert steps["run"].exit_code == 128 + signal


def test_output_before_a_crash_is_kept(sandbox):
    steps, _ = run(sandbox, "crash_segfault.c")
    assert steps["run"].stdout == "before crash\n"


def test_assertion_message_is_captured(sandbox):
    steps, _ = run(sandbox, "crash_assert.c")
    assert "Assertion `balance >= 0' failed" in steps["run"].stderr


# ---------------------------------------------------- resource attacks


def test_cpu_loop_times_out(sandbox):
    steps, _ = run(sandbox, "hostile_cpu_loop.c")
    assert steps["run"].termination is Termination.TIMEOUT
    assert steps["run"].wall_ms < RUN_LIMITS["wallTimeMs"] + 2_000


def test_sleeping_program_times_out(sandbox):
    steps, _ = run(sandbox, "hostile_sleep.c")
    assert steps["run"].termination is Termination.TIMEOUT


def test_closing_output_streams_does_not_escape_the_time_limit(sandbox):
    steps, _ = run(sandbox, "hostile_close_streams.c")
    assert steps["run"].termination is Termination.TIMEOUT
    assert steps["run"].stdout == "closing my output streams\n"
    assert steps["run"].wall_ms < RUN_LIMITS["wallTimeMs"] + 4_000


def test_memory_bomb_hits_memory_limit(sandbox):
    steps, _ = run(sandbox, "hostile_memory_bomb.c")
    assert steps["run"].termination is Termination.MEMORY_LIMIT
    assert steps["run"].oom_killed


def test_fork_bomb_is_contained(sandbox):
    steps, _ = run(sandbox, "hostile_fork_bomb.c")
    assert steps["run"].termination in {Termination.TIMEOUT, Termination.SIGNALED}
    assert steps["run"].wall_ms < RUN_LIMITS["wallTimeMs"] + 3_000


@pytest.mark.parametrize(("name", "stream"), [
    ("hostile_stdout_flood.c", "stdout"),
    ("hostile_stderr_flood.c", "stderr"),
])
def test_output_flood_is_capped(sandbox, name, stream):
    steps, _ = run(sandbox, name)
    step = steps["run"]
    assert step.termination is Termination.OUTPUT_LIMIT
    assert getattr(step, f"{stream}_truncated")
    assert len(getattr(step, stream).encode()) <= RUN_LIMITS["outputKb"] * 1024


def test_disk_fill_is_bounded(sandbox):
    steps, _ = run(sandbox, "hostile_disk_fill.c")
    match = re.search(r"wrote (\d+) MB", steps["run"].stdout)
    assert match is not None, steps["run"]
    assert int(match.group(1)) <= RUN_LIMITS["tmpMb"]


def test_compile_bomb_huge_object_file_fails(sandbox):
    result = sandbox.run_job(c_job(program("compile_bomb_big_array.c")))
    assert [s.name for s in result.steps] == ["compile"]
    step = result.steps[0]
    assert not (step.termination is Termination.EXITED and step.exit_code == 0)
    assert step.wall_ms < 15_000


def test_compile_bomb_endless_include_is_stopped(sandbox):
    result = sandbox.run_job(c_job(program("compile_bomb_dev_zero.c")))
    step = result.steps[0]
    assert step.name == "compile"
    assert step.termination in {Termination.MEMORY_LIMIT, Termination.TIMEOUT,
                                Termination.OUTPUT_LIMIT, Termination.EXITED}
    assert not (step.termination is Termination.EXITED and step.exit_code == 0)


# -------------------------------------------------- isolation attacks


def test_network_is_disabled(sandbox):
    steps, _ = run(sandbox, "hostile_network.c")
    assert "CONNECTED" not in steps["run"].stdout
    assert "failed" in steps["run"].stdout


def test_filesystem_is_read_only_except_tmp(sandbox):
    out = run(sandbox, "hostile_write_outside.c")[0]["run"].stdout
    assert "/etc/hacked: Read-only file system" in out
    assert "/workspace/evil.txt: Read-only file system" in out
    assert "/tmp/scratch.txt: WRITABLE" in out


def test_runs_without_privileges(sandbox):
    out = run(sandbox, "hostile_privileges.c")[0]["run"].stdout
    assert "uid=10001 euid=10001" in out
    assert "CapEff:\t0000000000000000" in out
    assert "NoNewPrivs:\t1" in out
    assert "Seccomp:\t2" in out
    assert "setuid(0)=-1" in out


def test_background_process_dies_with_the_container(sandbox):
    steps, _ = run(sandbox, "hostile_daemon.c")
    assert steps["run"].termination is Termination.EXITED
    assert steps["run"].stdout == "parent exits\n"
    assert steps["run"].wall_ms < 3_000


def test_process_namespace_and_secrets_are_isolated(sandbox):
    out = run(sandbox, "hostile_proc_snoop.c")[0]["run"].stdout
    visible = int(re.search(r"visible processes: (\d+)", out).group(1))
    assert visible <= 4
    assert "shadow readable: no" in out


# ------------------------------------------------------------ hygiene


def test_missing_image_is_reported_not_raised(docker_client):
    from runner.config import RunnerSettings

    sandbox = Sandbox(docker_client, RunnerSettings())
    result = sandbox.run_job(c_job("int main(void){return 0;}", image="compiler-copilot/missing:0"))
    assert result.steps == []
    assert result.error is not None and "not built" in result.error


def test_nothing_is_left_behind(sandbox, docker_client):
    job = c_job(program("hostile_daemon.c"))
    sandbox.run_job(job)
    # Only this job's objects: other runners may share the daemon.
    mine = {"label": [f"{LABEL_MANAGED}=1", f"{LABEL_JOB}={job.job_id}"]}
    assert docker_client.containers.list(all=True, filters=mine) == []
    assert docker_client.volumes.list(filters=mine) == []


def test_reaper_removes_objects_left_by_a_crashed_runner(docker_client):
    # Note: reaps every labelled object older than 1 s on this daemon, so run it
    # when no other runner is executing jobs against the same Docker host.
    import time

    from runner.sandbox import reap_orphans

    labels = {LABEL_MANAGED: "1", LABEL_JOB: "reaper-test"}
    volume = docker_client.volumes.create(name="cc-ws-reaper-test", labels=labels)
    container = docker_client.containers.create("compiler-copilot/sandbox-gcc:13", command=["true"],
                                                labels=labels, network_mode="none")
    time.sleep(1.2)
    assert reap_orphans(docker_client, max_age_s=1) >= 2
    mine = {"label": f"{LABEL_JOB}=reaper-test"}
    assert docker_client.containers.list(all=True, filters=mine) == []
    assert docker_client.volumes.list(filters=mine) == []
    del volume, container


def test_output_flood_does_not_stall_the_runner(sandbox):
    """Regression: stopping reads while the program still prints must not
    block Docker's kill/wait (found under load during M2 testing)."""
    import time

    started = time.monotonic()
    for _ in range(3):
        steps, _ = run(sandbox, "hostile_stderr_flood.c")
        assert steps["run"].termination is Termination.OUTPUT_LIMIT
    assert time.monotonic() - started < 30
