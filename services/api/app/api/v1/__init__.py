from fastapi import APIRouter

from . import assistant, executions, health, languages

router = APIRouter(prefix="/api/v1")
router.include_router(health.router)
router.include_router(languages.router)
router.include_router(executions.router)
router.include_router(assistant.router)
