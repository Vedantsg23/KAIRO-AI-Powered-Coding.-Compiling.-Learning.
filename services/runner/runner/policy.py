"""Second line of defence: the runner re-checks every job before running it.

The API is trusted to build jobs from server-side language profiles, but the
runner still refuses anything outside its own policy: unknown images, limits
above the configured ceilings, unsafe file names or oversized input. The
sandbox settings themselves (no network, read-only root, dropped capabilities,
non-root user) are not part of the job at all; they are fixed in sandbox.py.
"""

from __future__ import annotations

import re

from .config import RunnerSettings
from .jobspec import JobSpec

_SAFE_FILE = re.compile(r"^[A-Za-z0-9_][A-Za-z0-9_.-]{0,63}$")
# Letters of either case: .NET reads settings such as DOTNET_EnableWriteXorExecute.
_ENV_KEY = re.compile(r"^[A-Za-z_][A-Za-z0-9_]{0,63}$")
# Variables that change how every program is loaded are never passed in.
_DENIED_ENV = re.compile(r"^(?:LD_|DYLD_)")
_ALLOWED_WORKDIRS = {"/workspace", "/tmp"}


class PolicyViolation(ValueError):
    """The job asks for something the runner will not do."""


def check_job(job: JobSpec, settings: RunnerSettings) -> None:
    problems: list[str] = []

    if job.image not in settings.allowed_images:
        problems.append(f"image {job.image!r} is not in the runner allow-list")

    if len(job.files) > settings.max_files:
        problems.append(f"too many files ({len(job.files)} > {settings.max_files})")
    total = 0
    seen: set[str] = set()
    for f in job.files:
        if not _SAFE_FILE.match(f.path) or f.path in {".", ".."}:
            problems.append(f"unsafe file name {f.path!r}")
        if f.path in seen:
            problems.append(f"duplicate file name {f.path!r}")
        seen.add(f.path)
        total += len(f.content.encode("utf-8"))
    if total > settings.max_source_bytes:
        problems.append(f"source too large ({total} bytes > {settings.max_source_bytes})")

    if len(job.steps) > settings.max_steps:
        problems.append(f"too many steps ({len(job.steps)} > {settings.max_steps})")
    names: set[str] = set()
    for step in job.steps:
        where = f"step {step.name!r}"
        if step.name in names:
            problems.append(f"duplicate {where}")
        names.add(step.name)
        if any("\x00" in a for a in step.argv):
            problems.append(f"{where}: NUL byte in argv")
        if step.workdir not in _ALLOWED_WORKDIRS:
            problems.append(f"{where}: workdir must be one of {sorted(_ALLOWED_WORKDIRS)}")
        for key, value in step.env.items():
            if not _ENV_KEY.match(key) or "\x00" in value:
                problems.append(f"{where}: invalid environment variable {key!r}")
            elif _DENIED_ENV.match(key):
                problems.append(f"{where}: environment variable {key!r} is not allowed")
        if step.stdin is not None and len(step.stdin.encode("utf-8")) > settings.max_stdin_bytes:
            problems.append(f"{where}: stdin larger than {settings.max_stdin_bytes} bytes")
        lim = step.limits
        ceilings = {
            "wallTimeMs": (lim.wall_time_ms, settings.max_wall_time_ms),
            "cpuTimeS": (lim.cpu_time_s, settings.max_cpu_time_s),
            "memoryMb": (lim.memory_mb, settings.max_memory_mb),
            "pids": (lim.pids, settings.max_pids),
            "outputKb": (lim.output_kb, settings.max_output_kb),
            "tmpMb": (lim.tmp_mb, settings.max_tmp_mb),
            "fileSizeMb": (lim.file_size_mb, settings.max_file_size_mb),
        }
        for field, (value, ceiling) in ceilings.items():
            if value > ceiling:
                problems.append(f"{where}: {field}={value} exceeds ceiling {ceiling}")

    if problems:
        raise PolicyViolation("; ".join(problems))
