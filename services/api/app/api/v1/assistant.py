"""Saarthi endpoints.

GET  /api/v1/assistant/status   is Saarthi configured? (never reveals keys)
POST /api/v1/assistant/explain  explain one diagnostic of a finished run
POST /api/v1/assistant/fix      propose a minimal patch for it (not applied)
POST /api/v1/assistant/verify   compare the run of the patched code with the original
POST /api/v1/assistant/ask      answer a question about the code or a run
POST /api/v1/assistant/complete inline code completion (ghost text) at the cursor

Explain, fix and ask call the AI provider and are rate-limited per client;
verify does not call the model at all.
"""

from __future__ import annotations

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from ...ai.service import AssistantError, AssistantService
from ...schemas.assistant import (
    AskIn,
    AskOut,
    AssistantStatusOut,
    CompleteIn,
    CompleteOut,
    ExplainIn,
    ExplanationOut,
    FixIn,
    FixOut,
    VerifyIn,
    VerifyOut,
)
from ...schemas.executions import ErrorOut

router = APIRouter(prefix="/assistant", tags=["assistant"])

_ERRORS = {code: {"model": ErrorOut} for code in (404, 409, 422, 429, 502, 503)}


def _service(request: Request) -> AssistantService:
    return request.app.state.assistant


def _client(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _error(exc: AssistantError) -> JSONResponse:
    headers = {"Retry-After": str(exc.retry_after_s)} if exc.retry_after_s else None
    body = ErrorOut(detail=exc.message, retry_after_s=exc.retry_after_s).to_json_dict()
    return JSONResponse(status_code=exc.status, content=body, headers=headers)


@router.get("/status", response_model=AssistantStatusOut)
async def assistant_status(request: Request) -> AssistantStatusOut:
    return _service(request).status()


@router.post("/explain", response_model=ExplanationOut, responses=_ERRORS)
async def explain(body: ExplainIn, request: Request):
    """Explain a diagnostic of a finished run, grounded in that run's evidence."""
    try:
        return await _service(request).explain(body, _client(request))
    except AssistantError as exc:
        return _error(exc)


@router.post("/fix", response_model=FixOut, responses=_ERRORS)
async def fix(body: FixIn, request: Request):
    """Propose the smallest patch for a diagnostic. The student must approve it."""
    try:
        return await _service(request).fix(body, _client(request))
    except AssistantError as exc:
        return _error(exc)


@router.post("/verify", response_model=VerifyOut, responses=_ERRORS)
async def verify(body: VerifyIn, request: Request):
    """Decide from a real run of the patched code whether a fix worked."""
    try:
        return _service(request).verify(body)
    except AssistantError as exc:
        return _error(exc)


@router.post("/ask", response_model=AskOut, responses=_ERRORS)
async def ask(body: AskIn, request: Request):
    """Answer a question about programming, the editor's code or a run."""
    try:
        return await _service(request).ask(body, _client(request))
    except AssistantError as exc:
        return _error(exc)


@router.post("/complete", response_model=CompleteOut, responses=_ERRORS)
async def complete(body: CompleteIn, request: Request):
    """Suggest what comes next at the cursor (the editor shows it as ghost text; Tab accepts)."""
    try:
        return await _service(request).complete(body, _client(request))
    except AssistantError as exc:
        return _error(exc)
