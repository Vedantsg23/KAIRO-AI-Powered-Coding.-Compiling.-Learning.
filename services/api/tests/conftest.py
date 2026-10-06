from __future__ import annotations

import json
import time
from collections.abc import Callable

import httpx
import pytest
from fastapi.testclient import TestClient

from app.adapters.registry import LanguageRegistry
from app.config import ApiSettings
from app.main import create_app
from app.schemas.runner import JobResult, StepResult, Termination, ToolchainInfo


def ndjson_response(job: dict, steps: list[StepResult], error: str | None = None) -> httpx.Response:
    """What the real runner streams back for a job."""
    lines = []
    for step in steps:
        lines.append({"type": "step_started", "jobId": job["jobId"], "step": step.name})
        lines.append({"type": "step_finished", "jobId": job["jobId"], "step": step.name,
                      "termination": step.termination.value, "exitCode": step.exit_code})
    result = JobResult(job_id=job["jobId"], image=job["image"], image_id="sha256:fake",
                       toolchain=ToolchainInfo(name="GCC", version="13.3.0", languages=["c"]),
                       steps=steps, error=error)
    lines.append({"type": "job_finished", "jobId": job["jobId"],
                  "result": result.model_dump(mode="json", by_alias=True)})
    body = "".join(json.dumps(line) + "\n" for line in lines)
    return httpx.Response(200, content=body.encode(), headers={"content-type": "application/x-ndjson"})


ALL_IMAGES = sorted({p.toolchain.image for p in LanguageRegistry.from_directory().all()})


class FakeRunner:
    """Stands in for the runner service. `script` decides the steps per job;
    `missing` lists toolchain images its health report says are not built."""

    def __init__(self, script: Callable[[dict], httpx.Response] | None = None,
                 missing: set[str] | None = None) -> None:
        self.jobs: list[dict] = []
        self.missing = missing or set()
        self.script = script or (lambda job: ndjson_response(job, [
            StepResult(name="compile", termination=Termination.EXITED, exit_code=0, wall_ms=90),
            StepResult(name="run", termination=Termination.EXITED, exit_code=0, wall_ms=40, stdout="hi\n"),
        ]))

    def handler(self, request: httpx.Request) -> httpx.Response:
        if request.url.path == "/v1/health":
            images = {name: None if name in self.missing else "sha256:fake" for name in ALL_IMAGES}
            return httpx.Response(200, json={"status": "ok" if not self.missing else "degraded",
                                             "docker": True, "images": images})
        job = json.loads(request.content)
        self.jobs.append(job)
        return self.script(job)

    @property
    def transport(self) -> httpx.MockTransport:
        return httpx.MockTransport(self.handler)


@pytest.fixture
def fake_runner() -> FakeRunner:
    return FakeRunner()


@pytest.fixture
def make_client():
    clients: list[TestClient] = []

    def factory(runner: FakeRunner | None = None, transport: httpx.AsyncBaseTransport | None = None,
                ai_transport: httpx.AsyncBaseTransport | None = None, **settings) -> TestClient:
        transport = transport or (runner or FakeRunner()).transport
        settings.setdefault("ai_provider", "none")  # tests never reach a real AI provider
        app = create_app(ApiSettings(**settings), runner_transport=transport, ai_transport=ai_transport)
        client = TestClient(app)
        client.__enter__()
        clients.append(client)
        return client

    yield factory
    for client in clients:
        client.__exit__(None, None, None)


def wait_until_terminal(client: TestClient, execution_id: str, timeout_s: float = 5.0) -> dict:
    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        body = client.get(f"/api/v1/executions/{execution_id}").json()
        if body["terminal"]:
            return body
        time.sleep(0.02)
    raise AssertionError(f"execution {execution_id} did not finish: {body}")
