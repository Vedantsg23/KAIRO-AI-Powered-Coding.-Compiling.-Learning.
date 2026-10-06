"""Capture golden fixtures from the real toolchains (needs Docker + the sandbox images).

For every source file in services/api/tests/fixtures/<language>/ this runs the
language's real profile (same image, argv and limits as production) through
the runner's sandbox and writes <case>.result.json next to it: how each step
ended plus its exact stdout/stderr. The golden tests then replay these
results through the diagnostics pipeline without Docker.

Usage (from the repository root, with the .venv from `make setup`):
    .venv/bin/python scripts/capture_fixtures.py cpp java python
    .venv/bin/python scripts/capture_fixtures.py python type_error   # one case

A case can have <case>.stdin.txt with the input to send to the program.
Review the diff of every regenerated file: a toolchain update can change the
output, and the tests' expectations must then be checked by a person.
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path[:0] = [str(ROOT / "services" / "api"), str(ROOT / "services" / "runner")]

import docker
from app.adapters.registry import LanguageRegistry
from runner.config import RunnerSettings
from runner.jobspec import JobSpec
from runner.sandbox import Sandbox

FIXTURES = ROOT / "services" / "api" / "tests" / "fixtures"
EXTENSIONS = {"c": ".c", "cpp": ".cpp", "java": ".java", "python": ".py", "javascript": ".js", "typescript": ".ts",
              "go": ".go", "rust": ".rs", "csharp": ".cs", "kotlin": ".kt", "php": ".php", "ruby": ".rb",
              "lua": ".lua", "bash": ".sh", "sql": ".sql", "swift": ".swift",
              "fortran": ".f90", "asm": ".asm", "pascal": ".pas", "cobol": ".cob", "lex": ".l", "verilog": ".v",
              "nim": ".nim", "d": ".d", "ada": ".adb", "r": ".R", "perl": ".pl", "prolog": ".pro", "tcl": ".tcl",
              "scheme": ".scm", "lisp": ".lisp", "erlang": ".erl", "elixir": ".exs"}


def job_for(profile, source: str, stdin: str, case: str) -> JobSpec:
    return JobSpec.model_validate({
        "jobId": f"fixture-{profile.id}-{case}-{int(time.time() * 1000)}".replace("_", "-"),
        "image": profile.toolchain.image,
        "files": [{"path": profile.source_file, "content": source}],
        "steps": [{
            "name": step.name, "argv": list(step.argv), "workdir": step.workdir,
            "workspaceMode": step.workspace_mode, "env": dict(step.env),
            "stdin": stdin if step.stdin else None,
            "limits": {"wallTimeMs": step.limits.wall_time_ms, "cpuTimeS": step.limits.cpu_time_s,
                       "memoryMb": step.limits.memory_mb, "pids": step.limits.pids,
                       "outputKb": step.limits.output_kb, "tmpMb": step.limits.tmp_mb,
                       "fileSizeMb": step.limits.file_size_mb},
        } for step in profile.steps],
    })


def main(argv: list[str]) -> int:
    registry = LanguageRegistry.from_directory()
    languages = [a for a in argv if registry.get(a)] or [lang for lang in EXTENSIONS if lang != "c"]
    only = {a for a in argv if not registry.get(a)}
    sandbox = Sandbox(docker.from_env(), RunnerSettings())
    for lang in languages:
        profile = registry.get(lang)
        for src in sorted((FIXTURES / lang).glob(f"*{EXTENSIONS[lang]}")):
            case = src.stem
            if only and case not in only:
                continue
            stdin_file = src.with_name(f"{case}.stdin.txt")
            stdin = stdin_file.read_text(encoding="utf-8") if stdin_file.exists() else ""
            result = sandbox.run_job(job_for(profile, src.read_text(encoding="utf-8"), stdin, case))
            steps = []
            for step in result.steps:
                data = step.model_dump(mode="json", by_alias=True)
                data.update(durationMs=None, wallMs=100, peakMemoryBytes=None)  # stable files
                steps.append(data)
            out = {"toolchain": result.toolchain.version if result.toolchain else None,
                   "error": result.error, "steps": steps}
            src.with_name(f"{case}.result.json").write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n",
                                                            encoding="utf-8")
            ends = ", ".join(f"{s['name']}={s['termination']}/{s['exitCode']}" for s in steps)
            print(f"{lang}/{case}: {ends}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
