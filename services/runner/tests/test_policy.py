import pytest

from runner.config import RunnerSettings
from runner.policy import PolicyViolation, check_job

from .conftest import c_job

SETTINGS = RunnerSettings()


def test_a_normal_job_passes():
    check_job(c_job("int main(void){return 0;}"), SETTINGS)


def test_unknown_image_is_refused():
    with pytest.raises(PolicyViolation, match="allow-list"):
        check_job(c_job("int main(void){return 0;}", image="ubuntu:24.04"), SETTINGS)


@pytest.mark.parametrize("name", ["../etc/passwd", "dir/main.c", ".hidden", "", "a" * 80])
def test_unsafe_file_names_are_refused(name):
    job = c_job("x")
    job.files[0].path = name
    with pytest.raises(PolicyViolation, match="file name"):
        check_job(job, SETTINGS)


def test_limits_above_ceiling_are_refused():
    job = c_job("x")
    job.steps[1].limits.memory_mb = SETTINGS.max_memory_mb + 1
    job.steps[1].limits.wall_time_ms = SETTINGS.max_wall_time_ms + 1
    with pytest.raises(PolicyViolation) as err:
        check_job(job, SETTINGS)
    assert "memoryMb" in str(err.value) and "wallTimeMs" in str(err.value)


def test_nul_bytes_in_argv_are_refused():
    job = c_job("x")
    job.steps[0].argv.append("bad\x00arg")
    with pytest.raises(PolicyViolation, match="NUL"):
        check_job(job, SETTINGS)


def test_workdir_outside_allowed_set_is_refused():
    job = c_job("x")
    job.steps[0].workdir = "/etc"
    with pytest.raises(PolicyViolation, match="workdir"):
        check_job(job, SETTINGS)


def test_oversized_stdin_and_source_are_refused():
    job = c_job("x" * (SETTINGS.max_source_bytes + 1), stdin="y" * (SETTINGS.max_stdin_bytes + 1))
    with pytest.raises(PolicyViolation) as err:
        check_job(job, SETTINGS)
    assert "source too large" in str(err.value) and "stdin larger" in str(err.value)


def test_loader_environment_variables_are_refused():
    job = c_job("x")
    job.steps[1].env["LD_PRELOAD"] = "/tmp/evil.so"
    with pytest.raises(PolicyViolation, match="not allowed"):
        check_job(job, SETTINGS)


def test_mixed_case_environment_names_are_allowed():
    job = c_job("x")
    job.steps[1].env["DOTNET_EnableWriteXorExecute"] = "0"
    check_job(job, SETTINGS)


def test_invalid_environment_names_are_refused():
    job = c_job("x")
    job.steps[0].env["lower-case"] = "1"
    with pytest.raises(PolicyViolation, match="environment"):
        check_job(job, SETTINGS)
