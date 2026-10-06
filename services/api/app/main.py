"""KAIRO API: FastAPI application factory.

Run for development:  uvicorn app.main:app --reload --port 8000
(from services/api, with the runner started separately; see README).
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import __version__
from .adapters.registry import LanguageRegistry
from .ai.providers import choose_provider
from .ai.service import AssistantService
from .api.v1 import router as v1_router
from .config import ApiSettings
from .persistence.memory import InMemoryExecutionStore
from .queue.runner_client import RunnerClient
from .services.executions import ExecutionService


def create_app(settings: ApiSettings | None = None,
               runner_transport: httpx.AsyncBaseTransport | None = None,
               ai_transport: httpx.AsyncBaseTransport | None = None) -> FastAPI:
    settings = settings or ApiSettings()
    registry = LanguageRegistry.from_directory()  # fails fast on a broken profile

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        runner = RunnerClient(settings.runner_url, settings.runner_token, transport=runner_transport)
        service = ExecutionService(registry, InMemoryExecutionStore(settings.max_stored_executions),
                                   runner, settings)
        # Saarthi's HTTP client talks only to the configured AI provider.
        ai_http = httpx.AsyncClient(transport=ai_transport, timeout=httpx.Timeout(settings.ai_timeout_s,
                                                                                  connect=10.0))
        choice = choose_provider(settings, ai_http)
        if choice.provider is None:
            logging.getLogger("saarthi").info("Saarthi is off: %s", choice.reason)
        else:
            logging.getLogger("saarthi").info("Saarthi uses %s (%s)", choice.provider.name, choice.provider.model)
        app.state.registry = registry
        app.state.executions = service
        app.state.assistant = AssistantService(settings, registry, service, choice.provider, choice.reason)
        await service.start()
        try:
            yield
        finally:
            await service.stop()
            await runner.aclose()
            await ai_http.aclose()

    app = FastAPI(
        title="KAIRO API",
        version=__version__,
        description="Languages, sandboxed executions, normalized diagnostics and Saarthi, the AI assistant.",
        lifespan=lifespan,
    )
    app.include_router(v1_router)

    if settings.web_dist is not None:
        _serve_web_app(app, settings.web_dist)
    return app


def _serve_web_app(app: FastAPI, dist: Path) -> None:
    """Serve the built single-page app (used by the Docker Compose setup)."""
    index = dist / "index.html"
    if not index.is_file():
        logging.getLogger("api").warning("CC_WEB_DIST=%s has no index.html; not serving the web app", dist)
        return
    app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    async def spa(path: str) -> FileResponse:
        if path.startswith("api/"):
            raise HTTPException(status_code=404, detail="not found")
        candidate = (dist / path).resolve()
        if path and candidate.is_file() and dist.resolve() in candidate.parents:
            return FileResponse(candidate)
        return FileResponse(index)


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
app = create_app()
