"""Client for the runner's internal HTTP API.

POST /v1/jobs answers with NDJSON: progress events, then job_finished.
"""

from __future__ import annotations

import time
from collections.abc import Awaitable, Callable

import httpx

from ..schemas.runner import JobEvent, JobResult, JobSpec


class RunnerError(Exception):
    """The runner could not run the job (unreachable, refused, broken stream)."""


class RunnerUnavailable(RunnerError):
    pass


class RunnerBusy(RunnerError):
    def __init__(self, retry_after_s: int) -> None:
        super().__init__(f"runner at capacity, retry after {retry_after_s}s")
        self.retry_after_s = retry_after_s


ProgressCallback = Callable[[JobEvent], Awaitable[None]]


class RunnerClient:
    def __init__(self, base_url: str, token: str = "", transport: httpx.AsyncBaseTransport | None = None) -> None:
        headers = {"X-Runner-Token": token} if token else {}
        # trust_env=False: never send internal traffic through a user's HTTP proxy.
        self._http = httpx.AsyncClient(base_url=base_url, headers=headers, trust_env=False,
                                       transport=transport, timeout=httpx.Timeout(10.0))
        self._health: tuple[float, dict | None] = (0.0, None)

    async def aclose(self) -> None:
        await self._http.aclose()

    async def run(self, job: JobSpec, on_progress: ProgressCallback) -> JobResult:
        # Longest silence on the stream = the longest step + container overhead.
        longest_step_s = max(step.limits.wall_time_ms for step in job.steps) / 1000
        timeout = httpx.Timeout(10.0, read=longest_step_s + 30.0)
        try:
            async with self._http.stream("POST", "/v1/jobs", json=job.model_dump(mode="json", by_alias=True),
                                         timeout=timeout) as response:
                if response.status_code == 503:
                    raise RunnerBusy(int(response.headers.get("Retry-After", "2")))
                if response.status_code != 200:
                    body = (await response.aread()).decode("utf-8", errors="replace")[:500]
                    raise RunnerError(f"runner answered {response.status_code}: {body}")
                async for line in response.aiter_lines():
                    if not line.strip():
                        continue
                    event = JobEvent.model_validate_json(line)
                    if event.type == "job_finished":
                        if event.result is None:
                            raise RunnerError("runner sent job_finished without a result")
                        return event.result
                    await on_progress(event)
        except httpx.TransportError as exc:  # connection refused, timeout, reset
            raise RunnerUnavailable(f"runner not reachable at {self._http.base_url}: {exc!r}") from exc
        raise RunnerError("runner closed the stream before the job finished")

    async def health(self, max_age_s: float = 5.0) -> dict | None:
        """Runner health, cached briefly; None if unreachable."""
        fetched_at, cached = self._health
        if time.monotonic() - fetched_at < max_age_s:
            return cached
        try:
            response = await self._http.get("/v1/health", timeout=3.0)
            value = response.json() if response.status_code == 200 else None
        except (httpx.HTTPError, ValueError):
            value = None
        self._health = (time.monotonic(), value)
        return value
