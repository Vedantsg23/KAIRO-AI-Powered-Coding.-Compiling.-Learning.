"""Internal HTTP interface of the runner (never exposed to browsers).

POST /v1/jobs    run one job; the response is NDJSON (one JSON object per
                 line): step_started / step_finished progress events, then a
                 final job_finished event carrying the JobResult.
GET  /v1/health  Docker reachability, which sandbox images exist, capacity.

Admission: at most `workers` jobs run at once; up to `queue_limit` more wait
for a slot; anything beyond that is refused with 503 so overload becomes an
explicit, retryable answer instead of an overloaded host. Refusals (401 bad
token, 400 policy violation, 503 capacity) happen before streaming starts.
"""

from __future__ import annotations

import asyncio
import logging
import secrets
import threading
from collections.abc import AsyncIterator, Callable
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager

import docker
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse, StreamingResponse

from .config import RunnerSettings
from .jobspec import JobEvent, JobResult, JobSpec
from .policy import PolicyViolation, check_job
from .sandbox import Sandbox, reap_orphans

log = logging.getLogger("runner")


class Runtime:
    """Long-lived objects: Docker client, sandbox, worker threads, reaper."""

    def __init__(self, settings: RunnerSettings) -> None:
        self.settings = settings
        self.client = docker.from_env(timeout=settings.docker_api_timeout_s)
        self.sandbox = Sandbox(self.client, settings)
        self.pool = ThreadPoolExecutor(max_workers=settings.workers, thread_name_prefix="sandbox")
        self.in_flight = 0  # only touched from the event-loop thread
        self._stop = threading.Event()
        self._reaper = threading.Thread(target=self._reap_forever, name="reaper", daemon=True)

    def start(self) -> None:
        self._reaper.start()

    def close(self) -> None:
        self._stop.set()
        self.pool.shutdown(wait=True, cancel_futures=True)
        self.client.close()

    def run_job(self, job: JobSpec, on_event: Callable[[JobEvent], None]) -> JobResult:
        return self.sandbox.run_job(job, on_event)

    def probe(self) -> tuple[bool, dict[str, str | None]]:
        images: dict[str, str | None] = {}
        try:
            self.client.ping()
        except Exception as exc:  # noqa: BLE001 - health must answer whatever Docker does
            log.warning("health: docker unreachable: %s", exc)
            return False, images
        for name in self.settings.allowed_images:
            try:
                images[name] = self.client.images.get(name).id
            except docker.errors.ImageNotFound:
                images[name] = None
        return True, images

    def _reap_forever(self) -> None:
        while not self._stop.is_set():
            try:
                removed = reap_orphans(self.client, self.settings.orphan_max_age_s)
                if removed:
                    log.warning("reaper removed %d orphaned sandbox objects", removed)
            except Exception:
                log.exception("reaper pass failed")
            self._stop.wait(60)


def create_app(settings: RunnerSettings | None = None,
               runtime_factory: Callable[[RunnerSettings], Runtime] = Runtime) -> FastAPI:
    settings = settings or RunnerSettings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        rt = runtime_factory(settings)
        rt.start()
        app.state.rt = rt
        if not settings.token:
            log.warning("RUNNER_TOKEN is empty: job requests are not authenticated (dev only)")
        try:
            yield
        finally:
            rt.close()

    app = FastAPI(title="KAIRO runner (internal)", version="0.1.0", lifespan=lifespan)

    @app.post("/v1/jobs", response_model=None)
    async def run_job(job: JobSpec, request: Request,
                      x_runner_token: str | None = Header(default=None)) -> StreamingResponse | JSONResponse:
        if settings.token and not secrets.compare_digest(x_runner_token or "", settings.token):
            raise HTTPException(status_code=401, detail="invalid runner token")
        try:
            check_job(job, settings)
        except PolicyViolation as exc:
            raise HTTPException(status_code=400, detail=f"policy violation: {exc}") from exc

        rt: Runtime = request.app.state.rt
        if rt.in_flight >= settings.workers + settings.queue_limit:
            return JSONResponse(status_code=503, headers={"Retry-After": "2"},
                                content={"detail": "runner at capacity"})
        rt.in_flight += 1

        loop = asyncio.get_running_loop()
        events: asyncio.Queue[JobEvent] = asyncio.Queue()

        def on_event(event: JobEvent) -> None:  # called from a worker thread
            loop.call_soon_threadsafe(events.put_nowait, event)

        future = loop.run_in_executor(rt.pool, rt.run_job, job, on_event)

        def release(_: asyncio.Future) -> None:
            rt.in_flight -= 1

        future.add_done_callback(release)
        return StreamingResponse(_stream(job, events, future), media_type="application/x-ndjson")

    @app.get("/v1/health")
    async def health(request: Request) -> dict:
        rt: Runtime = request.app.state.rt
        docker_ok, images = await asyncio.get_running_loop().run_in_executor(None, rt.probe)
        return {
            "status": "ok" if docker_ok and images and all(images.values()) else "degraded",
            "docker": docker_ok,
            "images": images,
            "workers": settings.workers,
            "inFlight": rt.in_flight,
            "queueLimit": settings.queue_limit,
        }

    return app


async def _stream(job: JobSpec, events: asyncio.Queue[JobEvent],
                  future: asyncio.Future[JobResult]) -> AsyncIterator[bytes]:
    """Relay progress events, then finish with job_finished."""
    while True:
        getter = asyncio.ensure_future(events.get())
        done, _ = await asyncio.wait({getter, future}, return_when=asyncio.FIRST_COMPLETED)
        if getter in done:
            yield _line(getter.result())
            continue
        getter.cancel()
        # Events are queued on the loop before the future resolves, so every
        # progress event is already waiting here.
        while not events.empty():
            yield _line(events.get_nowait())
        try:
            result = future.result()
        except Exception as exc:  # noqa: BLE001 - defensive: run_job is designed not to raise
            result = JobResult(job_id=job.job_id, image=job.image, image_id="", steps=[],
                               error=f"runner error: {exc}")
        yield _line(JobEvent(type="job_finished", job_id=job.job_id, result=result))
        return


def _line(event: JobEvent) -> bytes:
    return (event.model_dump_json(by_alias=True) + "\n").encode("utf-8")


app = create_app()
