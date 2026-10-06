# Milestone 1: repository, requirements and scope

*Compiler-Aware AI Coding Copilot, Group 04, Department of Computer Engineering, DYPCOEI Varale, 2026-27.*

This is the Milestone 1 report. It records the state of the code before work
started, the requirements taken from the synopsis and the team brief, what the
project builds and what it reuses, where the documents disagree and how each
disagreement was settled, and the plan for Milestones 2 to 7.

## 1. Repository assessment

| Question | Finding |
|---|---|
| Existing repository | None. The team leader's `Documents` and `Downloads` folders were checked and contained no project code; the team confirmed a fresh start on 26 Sep 2026. |
| Earlier custom single-language compiler prototype | No code for it exists anywhere we were given, so nothing had to be preserved or migrated. The *idea* is superseded (see section 4.1). |
| Requirements sources | `BE_Project_Synopsis_FINAL.pdf` (19 pages), the master implementation prompt, and the team brief with milestones M1 to M7. |
| Resulting repository | A new monorepo, `compiler-copilot/`, following the suggested layout, adjusted where noted in `docs/architecture.md`. |

## 2. Requirements baseline

The IDs below are used by later milestone reports. "Synopsis" refers to its
objectives (section 10) and scope (section 11).

| ID | Requirement | Source | Milestone |
|---|---|---|---|
| R1 | Browser IDE: editor, language selector, run control, output console, diagnostics panel | Synopsis obj. 1, scope A | M2 (done for C) |
| R2 | Language adapter architecture: add a language by configuration | Synopsis obj. 2 | M2 (contract), M3 (4 languages) |
| R3 | Sandboxed compile and run with CPU, wall-clock, memory, process, file-system and network limits | Synopsis obj. 3 | M2 (done) |
| R4 | One normalized diagnostic format with stable codes, raw output kept as fallback | Synopsis §13, brief | M2 (done for C) |
| R5 | Local incremental syntax and structural analysis in a Web Worker, p95 ≤ 300 ms on 500 lines (a target to measure) | Synopsis obj. 4, §13.2, brief item 1 | M4 |
| R6 | Stale-result protection: results and fixes tied to an exact source hash | Brief, master prompt | M2 (results), M6 (fixes) |
| R7 | Diagnostic Context Bundle and AI explanations (what, why, where, how to fix, concept) through an `LLMProvider` interface, starting with Claude | Synopsis obj. 5 and 6, brief item 2 | M5 |
| R8 | Concept identification with the code features that justify each label | Brief item 3 | M4 (deterministic), M5 (AI) |
| R9 | Copilot-style suggestions: ghost text or reviewable changes, always optional | Brief item 4, synopsis scope A ("on-request code completion") | M5 |
| R10 | Reviewable patches (accept, edit, reject), never silent AI edits, with "autocorrect" as preview + Apply + Undo | Synopsis obj. 7, brief | M6 |
| R11 | Automatic re-verification: RESOLVED / PARTIALLY_RESOLVED / UNCHANGED / REGRESSED; `verified` stays false until the re-run finishes | Synopsis obj. 8, A8, brief item 5 | M6 |
| R12 | Admission control, rate limiting, bounded workers, load shedding | Synopsis obj. 11, A11 to A15 | M2 (bounded queue and workers), M7 (per-user limits, rate limits, cache, circuit breaker) |
| R13 | Persistence of projects, files, source snapshots, executions, diagnostics, suggestions and decisions | Synopsis scope A, brief | M7 (M2 keeps executions in memory) |
| R14 | Reproducible evaluation: mutation-seeded corpus of about 600 programs, 20+ hostile programs, load ramp, usability study | Synopsis obj. 12, A10, §16 | M2 (21-program sandbox corpus), M7 (the rest) |
| R15 | New-user experience: interactive onboarding and examples | Team request, 26 Sep 2026 | M2 (done) |

## 3. Product boundary: what is reused and what is built

The project does **not** implement a compiler. GCC, G++, javac and CPython are
used exactly as shipped. The team builds the layer around them.

| Reused as-is (built by others) | Designed and built by the team |
|---|---|
| GCC 13, G++ 13, OpenJDK 21 javac/java, CPython 3.12 | Declarative language profiles: trusted argument arrays, limits, file conventions (`services/api/app/adapters/profiles/*.toml`) |
| Docker Engine, cgroups, seccomp, tini | Sandbox lifecycle and hardening, job policy checks, orphan reaper, containment corpus (`services/runner`) |
| Monaco editor widget | Editor integration: diagnostic markers, stale-result rule, run pipeline, onboarding (`apps/web`) |
| Tree-sitter parsing library (M4) | Error-node extraction, structural rules, fault localization (A1, A6) |
| Claude API and its models (M5) | Diagnostic Context Bundle, evidence selection (A5), response validation (A7), confidence scoring (A9) |
| FastAPI, Pydantic, React, Vite, Tailwind | Normalization grammars and classifier (A3, A4), execution state machine, admission control (A11), differential verification (A8), evaluation method (A10) |

The contribution the team will defend is the **closed loop**: fast local
diagnostics, compiler and runtime evidence normalized across languages, secure
execution, AI explanations grounded in that evidence, human-approved fixes, and
automatic re-verification with a measured verdict. Every AI component is
replaceable; editing, compiling and running must keep working without it.

## 4. Scope conflicts and how they were resolved

### 4.1 Earlier custom-compiler proposal vs the platform
An earlier draft proposed writing a compiler for a single custom language. The
submitted synopsis (section 8) states that the project "does not build a
compiler", and the brief says the same. **Resolution:** the platform direction
applies. No code from the old proposal existed. Nothing is kept from it.

### 4.2 "All major languages"
This is not a finite list. **Resolution:** four MVP languages (C, C++, Java,
Python) through one adapter contract, plus a prioritised list of candidates for
a fifth and sixth (section 5), to be confirmed with the guide.

### 4.3 Three different phase lists
The synopsis timeline, the master prompt (Phases 0 to 8) and the brief (M1 to
M7) order the work differently. **Resolution:** the brief's M1 to M7 is used
from now on, because it is the latest instruction. Two consequences:

* **Persistence** is part of the synopsis MVP but is listed in M7 by the
  brief. M2 keeps executions in a bounded in-memory store behind a repository
  class, so M7 can replace it without touching routes or the UI. It must land
  before the final demonstration.
* **WebSocket status** was Phase 4 in the master prompt; the brief lists
  WebSockets in the base architecture, so M2 already streams execution
  snapshots over a WebSocket, with a polling fallback.

### 4.4 Job queue technology
The synopsis puts Redis in front of the workers. For one lab machine, M2 uses a
bounded in-process queue in the API and an internal HTTP + NDJSON call to the
runner, which has its own bounded worker pool. The job contract
(`packages/contracts/runner-contract.schema.json`) does not depend on the
transport, so Redis can be introduced in M7 if horizontal scaling across
machines is actually needed. This is recorded as a deliberate simplification.

### 4.5 Peak memory
The synopsis lists peak memory in the captured telemetry. Docker does not
report per-container peak memory after the container exits on cgroup v2, so
M2 returns `peakMemoryBytes: null` instead of an unreliable number. Measuring
it reliably is an M7 hardening item (see `docs/architecture.md`, section 8).

### 4.6 Concept identification and completions (new in the brief)
The synopsis mentions concept tagging only in the advanced Learning Mode. The
brief makes concept identification a main goal and asks for the evidence
behind each label. **Resolution:** M4 adds a deterministic, AST-based detector
(loops, arrays, recursion, functions, pointers, and so on, each with the
syntax nodes that triggered it); M5 adds AI labels such as "sorting" or
"binary search", shown with their reasons and a confidence.

### 4.7 "Autocorrect"
**Resolution:** a proposed change is shown inline with Preview, Apply and Undo.
Silent automatic changes are allowed only for narrowly defined deterministic
fixes (for example, inserting a missing `;` exactly where the hint points), and
only if the user turns that preference on. An AI model never rewrites a file
without explicit approval.

### 4.8 Numbers in the synopsis
Every figure (≤ 300 ms p95, a verified-fix rate of at least 60 %, a System
Usability Scale score of at least 70, 3 executions/s on 8 vCPUs) is a
**hypothesis to measure**, never a promised result. The M7 evaluation reports
hardware, versions, corpus and procedure next to every number.

## 5. Languages

| Language | Toolchain | Execution model | Milestone |
|---|---|---|---|
| C | GCC 13 | compiled, native | M2 (done) |
| C++ | G++ 13 (same image as C) | compiled, native | M3 |
| Java | OpenJDK 21 (`javac` + `java`) | compiled, JVM | M3 |
| Python | CPython 3.12 | interpreted | M3 |

Candidates for a fifth or sixth language (to agree with the guide before any
work):

1. **JavaScript (Node.js 22):** interpreted, stack traces with file:line:column,
   a small image. Mostly a new grammar and examples.
2. **Go 1.2x:** compiled, fast builds, `file:line:col` diagnostics, one static
   binary. Needs a larger image and more memory for the compiler.
3. **Rust (later, if time permits):** excellent structured diagnostics
   (`--error-format=json`), but slow compiles and a large image stress the
   sandbox limits.

Adding a language means adding a profile, an image, grammar fixtures and tests
(`docs/adding-a-language.md`); the UI, API, runner and diagnostic format stay
unchanged. Showing this is expected outcome 2 of the synopsis.

## 6. Milestone plan

| Milestone | Deliverable | Synopsis algorithms | Lead (synopsis roles) |
|---|---|---|---|
| **M1** | This report, contracts, threat model v0, dev setup | — | All |
| **M2** | Thin vertical slice for C: Monaco, C adapter, sandboxed compile/run, output, normalized diagnostics, WebSocket status, onboarding | A3, A4 (C), A11 (basic form) | Vedant (UI), Prajwal (adapter, runner), Pooja (tests, threat model), Pratiksha (API contracts) |
| **M3** | C++, Java and Python adapters, images, grammars, examples; the adapter contract proven four times | A3, A4 | Prajwal |
| **M4** | Tree-sitter in a Web Worker, 150 ms debounce, generation IDs, local diagnostics in the same format, latency instrumentation, deterministic concept detector | A1, A2, A6 (first form) | Vedant |
| **M5** | Diagnostic Context Bundle, `LLMProvider` + Claude, versioned prompts, streamed explanations, validated structured responses, concept labels, optional ghost-text suggestions | A5, A6, A7, A9 | Pratiksha |
| **M6** | Reviewable patches (diff, accept, edit, reject, undo), stale-hash checks, automatic re-run, differential verdicts | A8 | Pooja, Vedant |
| **M7** | Persistence (PostgreSQL/SQLite), per-user admission and rate limits, response cache, circuit breaker, security hardening (gVisor evaluation), mutation corpus, load test, usability study, extra languages | A10 to A15 | Pooja, Prajwal, Pratiksha |

Dates follow the college calendar agreed with the guide; the synopsis targets
completion in March 2027.
