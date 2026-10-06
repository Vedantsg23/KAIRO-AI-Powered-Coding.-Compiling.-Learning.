"""Wire contract between the API and the runner (JSON, camelCase).

The API builds a JobSpec from a trusted, server-side language profile and
POSTs it to the runner. The runner returns a JobResult with the raw outcome of
each step. Compiler output is NOT parsed here.

This module is duplicated on purpose in services/api/app/schemas/runner.py so
that the two services stay independently deployable. The JSON Schemas of
both copies are exported to packages/contracts/ and compared by
services/api/tests/test_contract.py, so they cannot drift silently.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class WireModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        extra="forbid",
    )


# ---------------------------------------------------------------- job spec


class StepLimits(WireModel):
    wall_time_ms: int = Field(ge=100, description="Wall-clock limit, measured by the runner.")
    cpu_time_s: int = Field(ge=1, description="RLIMIT_CPU for the step's processes.")
    memory_mb: int = Field(ge=16, description="cgroup memory limit (swap disabled).")
    pids: int = Field(ge=4, description="cgroup PID/thread limit.")
    output_kb: int = Field(ge=1, description="Cap per stream (stdout and stderr each).")
    tmp_mb: int = Field(ge=1, description="Size of the writable /tmp tmpfs.")
    file_size_mb: int = Field(ge=1, description="RLIMIT_FSIZE: largest file a process may write.")


class StepSpec(WireModel):
    name: str = Field(pattern=r"^[a-z][a-z0-9_-]{0,31}$", examples=["compile", "run"])
    argv: list[str] = Field(min_length=1, max_length=64, description="Argument array, never a shell string.")
    workdir: str = Field(default="/workspace", description="Working directory inside the sandbox.")
    workspace_mode: str = Field(default="rw", pattern=r"^(rw|ro)$", description="How /workspace is mounted.")
    env: dict[str, str] = Field(default_factory=dict)
    stdin: str | None = None
    limits: StepLimits


class SourceFile(WireModel):
    path: str = Field(description="File name relative to /workspace, e.g. main.c")
    content: str


class JobSpec(WireModel):
    job_id: str = Field(pattern=r"^[A-Za-z0-9_-]{1,64}$")
    image: str
    files: list[SourceFile] = Field(min_length=1)
    steps: list[StepSpec] = Field(min_length=1)


# -------------------------------------------------------------- job result


class Termination(StrEnum):
    EXITED = "EXITED"              # process exited on its own (any exit code)
    SIGNALED = "SIGNALED"          # killed by a signal it raised/received (e.g. SIGSEGV)
    TIMEOUT = "TIMEOUT"            # wall-clock or CPU limit reached
    MEMORY_LIMIT = "MEMORY_LIMIT"  # killed by the cgroup OOM killer
    OUTPUT_LIMIT = "OUTPUT_LIMIT"  # stdout or stderr exceeded the cap; runner killed it
    INTERNAL_ERROR = "INTERNAL_ERROR"


class StepResult(WireModel):
    name: str
    termination: Termination
    exit_code: int | None = Field(description="Exit status reported by Docker (128+N means signal N).")
    signal: int | None = Field(default=None, description="Signal number when termination is SIGNALED.")
    duration_ms: int | None = Field(default=None, description="Process lifetime from Docker's start/finish timestamps.")
    wall_ms: int = Field(description="Runner-measured time from start to exit, including container overhead.")
    stdout: str = ""
    stderr: str = ""
    stdout_truncated: bool = False
    stderr_truncated: bool = False
    oom_killed: bool = False
    peak_memory_bytes: int | None = Field(
        default=None, description="Not measured yet in Phase 1 (always null); see docs/architecture.md."
    )


class ToolchainInfo(WireModel):
    name: str
    version: str
    languages: list[str] = Field(default_factory=list)


class JobResult(WireModel):
    job_id: str
    image: str
    image_id: str = Field(description="Content-addressed image ID actually used (reproducibility key).")
    toolchain: ToolchainInfo | None = None
    steps: list[StepResult] = Field(description="Executed steps in order; execution stops after the first failing step.")
    error: str | None = Field(default=None, description="Set when the runner itself failed.")


class JobEvent(WireModel):
    """One line of the runner's NDJSON response stream.

    step_started / step_finished report progress so the API can show
    COMPILING / RUNNING; the last line is always job_finished with the result.
    """

    type: Literal["step_started", "step_finished", "job_finished"]
    job_id: str
    step: str | None = None
    termination: Termination | None = None
    exit_code: int | None = None
    result: JobResult | None = None
