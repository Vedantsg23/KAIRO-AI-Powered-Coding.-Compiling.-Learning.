from fastapi import APIRouter, Request

from ...schemas.languages import LanguageOut
from ...services.presenters import language_out

router = APIRouter(tags=["languages"])


@router.get("/languages", response_model=list[LanguageOut])
async def list_languages(request: Request) -> list[LanguageOut]:
    """Languages this deployment supports, with their toolchains and limits.

    `available` tells the editor which ones can run right now: a language whose
    sandbox image is not installed on the runner is listed but not offered.
    Profiles that are not languages of their own (the notebook runner) are not
    listed; they can still be run by id.
    """
    service = request.app.state.executions
    images = await service.installed_images()
    return [language_out(p, service.is_available(p, images)) for p in request.app.state.registry.all() if p.listed]
