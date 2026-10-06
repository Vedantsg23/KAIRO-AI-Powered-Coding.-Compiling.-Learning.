"""Execution entity, its state machine, and the source snapshot/hash rules.

State machine (one execution = one immutable source snapshot):

    QUEUED -> STARTING -> [COMPILING ->] RUNNING -> SUCCEEDED
                              |              |---> RUNTIME_ERROR | TIMEOUT | MEMORY_LIMIT
                              |---> COMPILE_ERROR | TIMEOUT | MEMORY_LIMIT
    any non-terminal state -> INTERNAL_ERROR (runner unreachable, runner fault)
    STARTING -> REJECTED (runner at capacity)
    CANCELLED is reserved for user cancellation (not offered yet).
"""

from __future__ import annotations

import hashlib
import secrets
from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import StrEnum

from ..schemas.diagnostics import Diagnostic
from ..schemas.runner import JobResult


class ExecutionState(StrEnum):
    QUEUED = "QUEUED"
    STARTING = "STARTING"
    COMPILING = "COMPILING"
    RUNNING = "RUNNING"
    SUCCEEDED = "SUCCEEDED"
    COMPILE_ERROR = "COMPILE_ERROR"
    RUNTIME_ERROR = "RUNTIME_ERROR"
    TIMEOUT = "TIMEOUT"
    MEMORY_LIMIT = "MEMORY_LIMIT"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"
    INTERNAL_ERROR = "INTERNAL_ERROR"


TERMINAL_STATES = frozenset({
    ExecutionState.SUCCEEDED, ExecutionState.COMPILE_ERROR, ExecutionState.RUNTIME_ERROR,
    ExecutionState.TIMEOUT, ExecutionState.MEMORY_LIMIT, ExecutionState.REJECTED,
    ExecutionState.CANCELLED, ExecutionState.INTERNAL_ERROR,
})


class StepStatus(StrEnum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"


def source_hash(source: str) -> str:
    """SHA-256 of the exact UTF-8 bytes; the browser computes the same value."""
    return "sha256:" + hashlib.sha256(source.encode("utf-8")).hexdigest()


def new_execution_id() -> str:
    return "exe_" + secrets.token_hex(12)  # 96 random bits, unguessable


def utcnow() -> datetime:
    return datetime.now(UTC)


@dataclass
class Execution:
    id: str
    language_id: str
    source: str  # immutable snapshot of exactly what was compiled
    source_hash: str
    stdin: str
    state: ExecutionState = ExecutionState.QUEUED
    created_at: datetime = field(default_factory=utcnow)
    started_at: datetime | None = None
    finished_at: datetime | None = None
    step_status: dict[str, StepStatus] = field(default_factory=dict)
    result: JobResult | None = None
    diagnostics: list[Diagnostic] = field(default_factory=list)
    error: str | None = None
    version: int = 0  # bumped on every change; lets subscribers skip duplicates

    @classmethod
    def create(cls, language_id: str, source: str, stdin: str, step_names: list[str]) -> Execution:
        return cls(
            id=new_execution_id(),
            language_id=language_id,
            source=source,
            source_hash=source_hash(source),
            stdin=stdin,
            step_status={name: StepStatus.PENDING for name in step_names},
        )

    @property
    def terminal(self) -> bool:
        return self.state in TERMINAL_STATES
