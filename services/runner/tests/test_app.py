"""HTTP layer of the runner, with a fake runtime (no Docker needed)."""

from __future__ import annotations

import json
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient

from runner.app import create_app
from runner.config import RunnerSettings
from runner.jobspec import JobEvent, JobResult, StepResult, Termination

from .conftest import c_job


class FakeRuntime:
    def __init__(self, settings: RunnerSettings) -> None:
        self.settings = settings
        self.in_flight = 0
        self.pool = ThreadPoolExecutor(max_workers=1)

    def start(self) -> None: ...

    def close(self) -> None:
        self.pool.shutdown(wait=True)

    def probe(self):
        return True, {name: "sha256:fake" for name in self.settings.allowed_images}

    def run_job(self, job, on_event) -> JobResult:
        steps = []
        for step in job.steps:
            on_event(JobEvent(type="step_started", job_id=job.job_id, step=step.name))
            steps.append(StepResult(name=step.name, termination=Termination.EXITED, exit_code=0,
                                    wall_ms=5, stdout="ok\n" if step.name == "run" else ""))
            on_event(JobEvent(type="step_finished", job_id=job.job_id, step=step.name,
                              termination=Termination.EXITED, exit_code=0))
        return JobResult(job_id=job.job_id, image=job.image, image_id="sha256:fake", steps=steps)


@pytest.fixture
def client():
    settings = RunnerSettings(token="secret", workers=1, queue_limit=0)
    with TestClient(create_app(settings, runtime_factory=FakeRuntime)) as test_client:
        yield test_client


def post(client, job, token="secret"):
    return client.post("/v1/jobs", json=job.model_dump(by_alias=True),
                       headers={"X-Runner-Token": token})


def test_job_streams_progress_then_result(client):
    response = post(client, c_job("int main(void){return 0;}"))
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/x-ndjson")
    events = [json.loads(line) for line in response.text.splitlines() if line]
    assert [e["type"] for e in events] == [
        "step_started", "step_finished", "step_started", "step_finished", "job_finished",
    ]
    result = events[-1]["result"]
    assert result["steps"][1]["stdout"] == "ok\n"
    assert result["imageId"] == "sha256:fake"


def test_wrong_token_is_rejected(client):
    assert post(client, c_job("x"), token="nope").status_code == 401


def test_policy_violation_is_a_400(client):
    response = post(client, c_job("x", image="ubuntu:24.04"))
    assert response.status_code == 400
    assert "allow-list" in response.json()["detail"]


def test_capacity_is_enforced_with_retry_after(client):
    client.app.state.rt.in_flight = 1  # workers=1, queue_limit=0 -> full
    response = post(client, c_job("x"))
    assert response.status_code == 503
    assert response.headers["retry-after"] == "2"


def test_health_reports_images(client):
    body = client.get("/v1/health").json()
    assert body["status"] == "ok"
    assert body["docker"] is True
    assert body["images"] == {name: "sha256:fake" for name in RunnerSettings().allowed_images}
    assert body["images"]["compiler-copilot/sandbox-gcc:13"] == "sha256:fake"
