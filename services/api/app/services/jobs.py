"""Build the runner job for an execution from its trusted language profile.

Nothing here comes from the browser except the source text (which becomes a
file) and stdin (which becomes the run step's input). Commands, image and
limits come from the profile only.
"""

from __future__ import annotations

from ..adapters.profile import LanguageProfile
from ..domain.execution import Execution
from ..schemas.runner import JobSpec, SourceFile, StepLimits, StepSpec


def build_job(profile: LanguageProfile, execution: Execution) -> JobSpec:
    return JobSpec(
        job_id=execution.id,
        image=profile.toolchain.image,
        files=[SourceFile(path=profile.source_file, content=execution.source)],
        steps=[
            StepSpec(
                name=step.name,
                argv=list(step.argv),
                workdir=step.workdir,
                workspace_mode=step.workspace_mode,
                env=dict(step.env),
                stdin=execution.stdin if step.stdin else None,
                limits=StepLimits(**step.limits.model_dump()),
            )
            for step in profile.steps
        ],
    )
