# Milestone 2 report: thin vertical slice (C)

*Date: 26 Sep 2026. Covers M1 (see [../scope.md](../scope.md)) and M2.*

## Summary

A student can write C in a Monaco editor, press Run, and watch the program go
through Queue, Compile, Run and Result live. GCC 13 compiles it and the program
runs in fresh containers with no network and strict limits. Compiler errors,
warnings and runtime crashes come back as normalized diagnostics pinned to
exact ranges, with stable codes, deterministic hints and plain-language notes.
New users get a welcome screen, a guided tour and nine example programs.

The slice exercises the whole adapter contract (a compile step and a run step,
grammars, classification, crash synthesis), so M3 adds languages without
changing the platform.

## What changed (all files are new; the repository did not exist before)

| Area | Files | Owner (synopsis roles) |
|---|---|---|
| Web IDE | `apps/web/src/**` (editor, run pipeline, output/input/log panel, problem cards, notes, onboarding, UI kit), `apps/web/e2e/ide.spec.ts` | Vedant |
| C adapter | `services/api/app/adapters/profiles/c.toml`, `adapters/profile.py`, `adapters/registry.py` | Prajwal |
| Diagnostics (A3, A4) | `services/api/app/analysis/*.py`, golden fixtures in `services/api/tests/fixtures/` | Prajwal |
| API | `services/api/app/{api,schemas,domain,services,queue,persistence}/`, `main.py`, `config.py` | Pratiksha |
| Runner and sandbox | `services/runner/runner/*.py`, `infra/containers/gcc/Dockerfile`, 21-program corpus in `services/runner/tests/programs/` | Prajwal |
| Contracts | `packages/contracts/*` (generated), `services/api/app/export_contracts.py` | Pratiksha |
| Security and tests | `docs/threat-model.md`, runner containment tests, API tests | Pooja |
| Setup and docs | `README.md`, `Makefile`, `compose.yaml`, Dockerfiles, `.env.example`, `.github/workflows/ci.yml`, `docs/*` | All |

## How to run

See the [README](../../README.md): Docker Compose (`docker compose --profile
images build && docker compose up -d`, then open http://localhost:8080) or
local development with `make setup`, `make images`, `make runner`, `make api`,
`make web`.

## Checks actually performed

Environment: Ubuntu 24.04 cloud workspace, Python 3.12.3, Node 22, Docker
29.4.3 (cgroup v1), kernel 6.18, 2 vCPUs.

| Check | Result |
|---|---|
| API tests: `pytest services/api` | **96 passed**: 15 GCC golden fixtures, runtime synthesis, positions (UTF-8 and tabs), state machine, profile validation, endpoints with a fake runner (202/413/422/503/404, WebSocket), contract freshness |
| Runner tests: `pytest services/runner` | **47 passed**: policy, HTTP layer, and the 21-program containment corpus against the real Docker daemon and GCC 13.3.0 image |
| Concurrency stress (script, not in the suite) | 24 output-flood jobs, 8 at a time: longest 2.72 s, no errors, no leftover containers or volumes |
| Web: `tsc --noEmit`, `vitest run`, `vite build` | Type-check clean; **21 passed** (including SHA-256 fallback against Node's crypto); build OK: app 225 KB (74 KB gzip) + Monaco loaded lazily 3.9 MB (1.0 MB gzip) |
| End-to-end: `playwright test` | **7 passed** against the development stack (Vite + uvicorn + runner) **and 7 passed** against the Docker Compose stack: welcome, tour, success, compile error with hint and note, stale edit then undo, NULL-pointer crash, stdin |
| Real runs through the API | Correct results for success, stdin, compile error, SIGSEGV, SIGFPE, assertion, timeout, memory limit, output flood; state sequence `QUEUED → STARTING → COMPILING → RUNNING → final` observed |
| Visual review | Screenshots of welcome, tour, success, compile error, crash, stale state, running, timeout, dark mode and a 390 px phone layout were inspected; header overflow on phones was found and fixed |

Caveats, stated plainly:
* Docker Hub is blocked in the workspace where this was built. The sandbox
  image was built from a local `ubuntu:24.04` made with `debootstrap` from the
  official Ubuntu archive, and the compose images from local stand-ins for
  `python:3.12-slim` and `node:22-slim`. The Dockerfiles themselves were not
  changed for this; **building them from the real Docker Hub images has not
  been tested**. Run `docker compose --profile images build` on your machine
  as the first check.
* Not run: the GitHub Actions workflow, anything on Windows or Docker Desktop,
  latency or throughput measurements, a screen-reader accessibility audit.
* Two real bugs were found during testing and fixed, with regression tests:
  a kill that could hang for 60 s when output kept arriving after the 64 KB
  cap, and a program that closed its output streams escaping the time limit
  (see `docs/threat-model.md`, section 5).

## Known limitations

* Only C. Diagnostics appear after Run, not while typing (M4).
* Runtime crashes carry no source line yet (SIGSEGV prints nothing).
* `peakMemoryBytes` is always `null`; see architecture section 8.
* Executions live in memory in a single API process (persistence is M7).
* No accounts or per-user limits: keep the API inside the lab network.
* The notes are fixed texts per error code, not tailored explanations (M5).
* The runner needs a Linux Docker socket (Docker Desktop or WSL 2 on Windows).

## Next step: M3 (remaining MVP languages)

1. **Grammar engine:** add multi-line block rules (Python tracebacks, Java
   stack traces) with golden tests.
2. **C++:** profile on the existing GCC image (`g++ -std=gnu++20`), `CXX_`
   codes, uncaught-exception runtime grammar
   (`terminate called after throwing an instance of ...`).
3. **Java:** OpenJDK 21 image; `javac Main.java` + `java -cp /workspace Main`;
   javac grammar (`Main.java:5: error: ';' expected` and caret lines);
   exception grammar; JVM limits (PIDs, memory).
4. **Python:** CPython 3.12 image; run step only (or `py_compile` as a compile
   step, to be decided with the guide); SyntaxError and traceback grammar with
   code-point columns.
5. For each language: 10 to 15 golden fixtures, corpus programs for new failure
   modes, a starter program, examples and notes, and Monaco registration.
6. Confirm the fifth/sixth-language candidates (JavaScript, Go) with the guide.
