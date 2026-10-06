from __future__ import annotations

import itertools
from pathlib import Path

import pytest

from runner.config import RunnerSettings
from runner.jobspec import JobSpec

PROGRAMS = Path(__file__).parent / "programs"
IMAGE = "compiler-copilot/sandbox-gcc:13"

# These mirror the C profile (services/api/app/adapters/profiles/c.toml).
# The runner itself is language-agnostic; tests just need realistic jobs.
C_COMPILE = [
    "gcc", "-std=gnu17", "-O0", "-g", "-Wall",
    "-fdiagnostics-color=never", "-fdiagnostics-urls=never",
    "-fdiagnostics-column-unit=byte", "-fmessage-length=0",
    "-o", "main", "main.c", "-lm",
]
C_RUN = ["stdbuf", "-oL", "/workspace/main"]
COMPILE_LIMITS = {"wallTimeMs": 10_000, "cpuTimeS": 10, "memoryMb": 256, "pids": 64,
                  "outputKb": 64, "tmpMb": 64, "fileSizeMb": 64}
RUN_LIMITS = {"wallTimeMs": 3_000, "cpuTimeS": 3, "memoryMb": 128, "pids": 32,
              "outputKb": 64, "tmpMb": 16, "fileSizeMb": 16}

_ids = itertools.count(1)


def c_job(source: str, stdin: str | None = None, run_limits: dict | None = None,
          image: str = IMAGE) -> JobSpec:
    return JobSpec.model_validate({
        "jobId": f"test-{next(_ids)}",
        "image": image,
        "files": [{"path": "main.c", "content": source}],
        "steps": [
            {"name": "compile", "argv": C_COMPILE, "workdir": "/workspace", "workspaceMode": "rw",
             "env": {"LC_ALL": "C"}, "limits": COMPILE_LIMITS},
            {"name": "run", "argv": C_RUN, "workdir": "/tmp", "workspaceMode": "ro",
             "stdin": stdin, "limits": run_limits or RUN_LIMITS},
        ],
    })


def program(name: str) -> str:
    return (PROGRAMS / name).read_text(encoding="utf-8")


@pytest.fixture(scope="session")
def docker_client():
    try:
        import docker

        client = docker.from_env()
        client.ping()
        client.images.get(IMAGE)
    except Exception as exc:  # noqa: BLE001 - no daemon, no socket access, or image not built
        pytest.skip(f"Docker or {IMAGE} not available: {exc}")
    yield client
    client.close()


@pytest.fixture(scope="session")
def sandbox(docker_client):
    from runner.sandbox import Sandbox

    return Sandbox(docker_client, RunnerSettings())
