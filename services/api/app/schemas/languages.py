from __future__ import annotations

from typing import Literal

from pydantic import Field

from .common import ApiModel
from .executions import StepLimitsOut


class LanguageToolchainOut(ApiModel):
    name: str
    declared_version: str
    image: str


class LanguageStepOut(ApiModel):
    name: str
    kind: Literal["compile", "run"]
    label: str = Field(description='Shown in the run pipeline, e.g. "Compile" or "Syntax check".')
    argv: list[str] = Field(description="The exact trusted command, shown to students for transparency.")
    limits: StepLimitsOut


class LanguageOut(ApiModel):
    id: str
    display_name: str
    editor_mode: str
    source_file: str
    toolchain: LanguageToolchainOut
    steps: list[LanguageStepOut]
    status: Literal["stable", "experimental"] = Field(
        default="stable",
        description='"experimental": prepared but not yet verified end to end (shown with a badge).')
    available: bool | None = Field(
        default=None,
        description="Whether the sandbox runner has this language's toolchain image installed. "
                    "null when the runner cannot be reached right now.")
