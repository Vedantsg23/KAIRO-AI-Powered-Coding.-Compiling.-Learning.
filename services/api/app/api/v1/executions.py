"""Execution endpoints.

POST /api/v1/executions              202 + execution (QUEUED), or 409/413/422/503
GET  /api/v1/executions/{id}         current snapshot
WS   /api/v1/executions/{id}/events  pushes the full snapshot on every change
                                     and closes after the terminal state

There are no user accounts yet: an execution id (96 random bits) acts as the
access token for its own results. Ownership checks arrive with accounts
(planned with the Supabase milestone).
"""

from __future__ import annotations

from fastapi import APIRouter, Request, WebSocket, WebSocketDisconnect, status
from fastapi.responses import JSONResponse

from ...schemas.executions import ErrorOut, ExecutionCreate, ExecutionOut
from ...services.executions import ExecutionService, PayloadTooLarge, QueueFull, UnknownLanguage
from ...services.presenters import execution_out

router = APIRouter(tags=["executions"])


def _snapshot(service: ExecutionService, execution) -> ExecutionOut:
    profile = service.registry.get(execution.language_id)
    return execution_out(execution, profile, service.queue_position(execution.id))


@router.post(
    "/executions",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=ExecutionOut,
    responses={409: {"model": ErrorOut}, 413: {"model": ErrorOut}, 422: {"model": ErrorOut},
               503: {"model": ErrorOut}},
)
async def create_execution(body: ExecutionCreate, request: Request):
    """Queue a compile-and-run of the given source. Returns immediately."""
    service: ExecutionService = request.app.state.executions
    profile = service.registry.get(body.language_id)
    if profile is not None and service.is_available(profile, await service.installed_images()) is False:
        return _error(409, f"{profile.display_name} is not installed on this server yet "
                           f"(its sandbox image {profile.toolchain.image} is missing).")
    try:
        execution = service.submit(body)
    except UnknownLanguage:
        return _error(422, f"unknown language {body.language_id!r}")
    except PayloadTooLarge as exc:
        return _error(413, str(exc))
    except QueueFull as exc:
        return _error(503, "Too many programs are waiting to run. Please try again shortly.",
                      retry_after_s=exc.retry_after_s)
    return _snapshot(service, execution)


@router.get("/executions/{execution_id}", response_model=ExecutionOut, responses={404: {"model": ErrorOut}})
async def get_execution(execution_id: str, request: Request):
    service: ExecutionService = request.app.state.executions
    execution = service.get(execution_id)
    if execution is None:
        return _error(404, "execution not found")
    return _snapshot(service, execution)


@router.websocket("/executions/{execution_id}/events")
async def execution_events(websocket: WebSocket, execution_id: str) -> None:
    service: ExecutionService = websocket.app.state.executions
    await websocket.accept()
    execution = service.get(execution_id)
    if execution is None:
        await websocket.close(code=4404, reason="execution not found")
        return
    signal = service.subscribe(execution_id)
    try:
        last_sent: tuple | None = None
        while True:
            execution = service.get(execution_id)
            if execution is None:
                await websocket.close(code=4404, reason="execution expired")
                return
            key = (execution.version, service.queue_position(execution_id))
            if key != last_sent:
                await websocket.send_json(_snapshot(service, execution).to_json_dict())
                last_sent = key
            if execution.terminal:
                await websocket.close(code=1000)
                return
            await signal.get()
    except WebSocketDisconnect:
        pass
    finally:
        service.unsubscribe(execution_id, signal)


def _error(code: int, detail: str, retry_after_s: int | None = None) -> JSONResponse:
    headers = {"Retry-After": str(retry_after_s)} if retry_after_s is not None else None
    body = ErrorOut(detail=detail, retry_after_s=retry_after_s).model_dump(by_alias=True, exclude_none=True)
    return JSONResponse(status_code=code, content=body, headers=headers)
