from fastapi import APIRouter, Request

router = APIRouter(tags=["health"])


@router.get("/health")
async def health(request: Request) -> dict:
    """API status plus what the runner reports (cached for a few seconds)."""
    service = request.app.state.executions
    runner = await service.runner.health()
    runner_ok = bool(runner and runner.get("status") == "ok")
    return {
        "status": "ok" if runner_ok else "degraded",
        "api": "ok",
        "runner": runner if runner is not None else {"status": "unreachable"},
        "queue": {
            "depth": service.queue_depth(),
            "capacity": service.settings.max_queue,
            "workers": service.settings.dispatch_workers,
        },
    }
