"""Execution use case: admission, bounded queue, dispatch, results, events.

Flow for POST /executions:
  1. validate language and sizes; refuse with 503 when the queue is full
     (admission control, algorithm A11: one global bound);
  2. snapshot + hash the source, store the execution as QUEUED, enqueue;
  3. one of `dispatch_workers` tasks picks it up, builds the job from the
     language profile and streams it through the runner, updating the state
     (STARTING -> COMPILING -> RUNNING -> terminal) as progress arrives;
  4. the raw result is normalized into diagnostics and stored.
Every change bumps `execution.version` and wakes WebSocket subscribers.
"""

from __future__ import annotations

import asyncio
import logging
import math
from collections import defaultdict

from ..adapters.profile import LanguageProfile
from ..adapters.registry import LanguageRegistry
from ..analysis.pipeline import diagnose
from ..config import ApiSettings
from ..domain.execution import Execution, ExecutionState, StepStatus, utcnow
from ..persistence.memory import InMemoryExecutionStore
from ..queue.runner_client import RunnerBusy, RunnerClient, RunnerError, RunnerUnavailable
from ..schemas.executions import ExecutionCreate
from ..schemas.runner import JobEvent, JobResult, Termination
from .jobs import build_job

log = logging.getLogger("api.executions")


class UnknownLanguage(Exception):
    pass


class PayloadTooLarge(Exception):
    pass


class QueueFull(Exception):
    def __init__(self, retry_after_s: int) -> None:
        super().__init__("execution queue is full")
        self.retry_after_s = retry_after_s


class ExecutionService:
    def __init__(self, registry: LanguageRegistry, store: InMemoryExecutionStore,
                 runner: RunnerClient, settings: ApiSettings) -> None:
        self.registry = registry
        self.store = store
        self.runner = runner
        self.settings = settings
        self._queue: asyncio.Queue[str] = asyncio.Queue()
        self._waiting: list[str] = []  # queued ids in order, for queue positions
        self._subscribers: dict[str, set[asyncio.Queue[None]]] = defaultdict(set)
        self._workers: list[asyncio.Task] = []

    # ------------------------------------------------------------ lifecycle

    async def start(self) -> None:
        for n in range(self.settings.dispatch_workers):
            self._workers.append(asyncio.create_task(self._worker(), name=f"dispatch-{n}"))

    async def stop(self) -> None:
        for task in self._workers:
            task.cancel()
        await asyncio.gather(*self._workers, return_exceptions=True)
        self._workers.clear()

    # ------------------------------------------------------------ availability

    async def installed_images(self) -> dict[str, bool] | None:
        """Which toolchain images the runner can start, from its (cached) health
        report: {image: installed}. None when the runner cannot be reached."""
        health = await self.runner.health()
        if not health or not isinstance(health.get("images"), dict):
            return None
        return {name: bool(image_id) for name, image_id in health["images"].items()}

    @staticmethod
    def is_available(profile: LanguageProfile, images: dict[str, bool] | None) -> bool | None:
        """True/False once the runner has answered; None while it is unreachable.
        An image missing from the report is not on the runner's allow-list."""
        return None if images is None else images.get(profile.toolchain.image, False)

    # ------------------------------------------------------------ commands

    def submit(self, request: ExecutionCreate) -> Execution:
        profile = self.registry.get(request.language_id)
        if profile is None:
            raise UnknownLanguage(request.language_id)
        if len(request.source.encode("utf-8")) > self.settings.max_source_bytes:
            raise PayloadTooLarge(f"source is larger than {self.settings.max_source_bytes // 1024} KB")
        if len(request.stdin.encode("utf-8")) > self.settings.max_stdin_bytes:
            raise PayloadTooLarge(f"input is larger than {self.settings.max_stdin_bytes // 1024} KB")
        if len(self._waiting) >= self.settings.max_queue:
            raise QueueFull(self.retry_after_estimate())

        execution = Execution.create(profile.id, request.source, request.stdin,
                                     [s.name for s in profile.steps])
        self.store.add(execution)
        self._waiting.append(execution.id)
        self._queue.put_nowait(execution.id)
        return execution

    def retry_after_estimate(self) -> int:
        """Seconds until a queue slot frees up, from mean service time and W."""
        workers = max(self.settings.dispatch_workers, 1)
        return max(1, math.ceil(len(self._waiting) / workers * self.settings.mean_service_time_s))

    # --------------------------------------------------------------- queries

    def get(self, execution_id: str) -> Execution | None:
        return self.store.get(execution_id)

    def queue_position(self, execution_id: str) -> int | None:
        try:
            return self._waiting.index(execution_id) + 1
        except ValueError:
            return None

    def queue_depth(self) -> int:
        return len(self._waiting)

    # ---------------------------------------------------------- subscribers

    def subscribe(self, execution_id: str) -> asyncio.Queue[None]:
        signal: asyncio.Queue[None] = asyncio.Queue(maxsize=1)
        self._subscribers[execution_id].add(signal)
        return signal

    def unsubscribe(self, execution_id: str, signal: asyncio.Queue[None]) -> None:
        subscribers = self._subscribers.get(execution_id)
        if subscribers is not None:
            subscribers.discard(signal)
            if not subscribers:
                del self._subscribers[execution_id]

    def _notify(self, execution_id: str) -> None:
        for signal in self._subscribers.get(execution_id, ()):
            if signal.empty():
                signal.put_nowait(None)  # "something changed"; the reader fetches the latest

    # ------------------------------------------------------------- dispatch

    async def _worker(self) -> None:
        while True:
            execution_id = await self._queue.get()
            try:
                if execution_id in self._waiting:
                    self._waiting.remove(execution_id)
                for waiting_id in self._waiting:  # everyone behind moved up
                    self._notify(waiting_id)
                await self._dispatch(execution_id)
            except asyncio.CancelledError:
                raise
            except Exception:
                log.exception("dispatch of %s failed", execution_id)
                execution = self.store.get(execution_id)
                if execution is not None and not execution.terminal:
                    self._finish(execution, ExecutionState.INTERNAL_ERROR, error="unexpected API error")
            finally:
                self._queue.task_done()

    async def _dispatch(self, execution_id: str) -> None:
        execution = self.store.get(execution_id)
        if execution is None:
            return  # evicted while waiting
        profile = self.registry.get(execution.language_id)
        assert profile is not None
        self._update(execution, state=ExecutionState.STARTING, started_at=utcnow())

        async def on_progress(event: JobEvent) -> None:
            if event.step is None:
                return
            if event.type == "step_started":
                kind = profile.step(event.step).kind
                state = ExecutionState.COMPILING if kind == "compile" else ExecutionState.RUNNING
                self._update(execution, state=state, step={event.step: StepStatus.RUNNING})
            elif event.type == "step_finished":
                ok = event.termination is Termination.EXITED and event.exit_code == 0
                self._update(execution, step={event.step: StepStatus.SUCCEEDED if ok else StepStatus.FAILED})

        try:
            result = await self.runner.run(build_job(profile, execution), on_progress)
        except RunnerBusy:
            self._finish(execution, ExecutionState.REJECTED,
                         error="The sandbox is at capacity. Please run again in a few seconds.")
            return
        except RunnerUnavailable as exc:
            log.warning("%s", exc)
            self._finish(execution, ExecutionState.INTERNAL_ERROR,
                         error="The code runner is not reachable. Is it running? (see README)")
            return
        except RunnerError as exc:
            log.warning("runner error for %s: %s", execution.id, exc)
            self._finish(execution, ExecutionState.INTERNAL_ERROR, error=f"Runner error: {exc}")
            return

        diagnostics = diagnose(profile, execution.id, {profile.source_file: execution.source}, result)
        self._finish(execution, final_state(result, {s.name: s.kind for s in profile.steps}),
                     result=result, diagnostics=diagnostics, error=result.error)

    # -------------------------------------------------------------- updates

    def _update(self, execution: Execution, *, step: dict[str, StepStatus] | None = None, **changes) -> None:
        for key, value in changes.items():
            setattr(execution, key, value)
        if step:
            execution.step_status.update(step)
        execution.version += 1
        self._notify(execution.id)

    def _finish(self, execution: Execution, state: ExecutionState, *, result: JobResult | None = None,
                **changes) -> None:
        statuses = dict(execution.step_status)
        if result is not None:  # the result is authoritative for executed steps
            for step_result in result.steps:
                ok = step_result.termination is Termination.EXITED and step_result.exit_code == 0
                statuses[step_result.name] = StepStatus.SUCCEEDED if ok else StepStatus.FAILED
        for name, status in statuses.items():
            if status is StepStatus.PENDING:
                statuses[name] = StepStatus.SKIPPED
            elif status is StepStatus.RUNNING:
                statuses[name] = StepStatus.FAILED
        self._update(execution, state=state, finished_at=utcnow(), step_status=statuses,
                     result=result, **changes)


def final_state(result: JobResult, kinds: dict[str, str]) -> ExecutionState:
    if result.error is not None:
        return ExecutionState.INTERNAL_ERROR
    for step in result.steps:
        if step.termination is Termination.EXITED and step.exit_code == 0:
            continue
        if step.termination is Termination.TIMEOUT:
            return ExecutionState.TIMEOUT
        if step.termination is Termination.MEMORY_LIMIT:
            return ExecutionState.MEMORY_LIMIT
        if step.termination is Termination.INTERNAL_ERROR:
            return ExecutionState.INTERNAL_ERROR
        return ExecutionState.COMPILE_ERROR if kinds.get(step.name) == "compile" else ExecutionState.RUNTIME_ERROR
    if len(result.steps) < len(kinds):
        return ExecutionState.INTERNAL_ERROR  # the runner stopped early without saying why
    return ExecutionState.SUCCEEDED
