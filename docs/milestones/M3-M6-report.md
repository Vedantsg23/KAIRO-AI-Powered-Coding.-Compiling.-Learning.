# Milestones 3 to 6 report: fifteen languages, live checking, Saarthi and the Code Drishti experience

> [!NOTE]
> This report was written on 27 Sep 2026, when the project was called **Code Drishti** and its interface was
> the "Cosmic Drishti" theme. On 29 Sep 2026 the interface was redesigned as **KAIRO** (see [docs/ui.md](../ui.md));
> the names below are kept as they were. The latency figures were measured again after the redesign; the latest
> numbers are in the README.

*Date: 27 Sep 2026. Covers M3 (C++, Java, Python and eleven more languages),
M4 (checking while typing), M5 (Saarthi explanations grounded in evidence),
M6 (reviewable fixes and automatic re-verification) and the "Cosmic Drishti"
interface. Follows the [M2 report](M2-report.md).*

## 1. Summary

Code Drishti now runs **15 languages end to end with their real toolchains**:
C, C++, Java, Python, JavaScript, TypeScript, Go, Rust, C#, Kotlin, PHP, Ruby,
Lua, Bash and SQL. Swift is prepared as an experimental 16th language but is
**not verified**: its base image could not be downloaded where this was built,
so it stays hidden until someone builds and tests it
([languages.md](../languages.md#enabling-swift)).

Each language is configuration, not code: a profile with trusted argument
arrays and limits, error grammars, a sandbox image, examples and tests. The
runner, the API routes, the diagnostic format and the editor are shared by
all of them, and every language passes the same six hostile programs under
the same sandbox rules.

While the student types, a **Tree-sitter syntax check** runs in a Web Worker
for 14 languages and pins slips to the line within about 0.2 s of the last
keystroke, without contacting the server. **Saarthi**, the AI guide, explains
a problem from the run's real evidence, proposes the smallest fix as a diff,
applies it only when the student presses Apply, and checks it with a real run.
The interface was redesigned as **Cosmic Drishti**: an animated entry page
with guest profiles, a drawn Saarthi companion, the run journey, a background
that follows the state of the code, and XP, badges and streaks.

## 2. What changed

Compared with the M2 delivery: 680 files (source, tests, docs and
configuration; dependencies and build output excluded), **494 new, 85
changed**, 101 unchanged, none removed. More than half of the new files are
test fixtures: 274 files of captured toolchain output, programs and expected
diagnostics.

| Area | Main files | Owner (synopsis roles) |
|---|---|---|
| Language profiles and error grammars | `services/api/app/adapters/profiles/*.toml` (16), `adapters/grammars/*.toml`, block parsers for tracebacks, stack traces and panics in `analysis/parsers/`, classification and crash synthesis | Prajwal |
| Sandbox images | `infra/containers/{java,python,node,go,rust,dotnet,kotlin,scripting,swift}/Dockerfile` | Prajwal |
| Golden tests | `services/api/tests/fixtures/<toolchain>/`: 126 real outputs from 14 toolchains with hand-written expectations; `test_golden_languages.py` | Prajwal, Pooja |
| Runner | allowed images, environment policy, ceilings; `services/runner/runner/` | Prajwal, Pooja |
| API | language availability and status, `409` when an image is missing; Saarthi in `app/ai/` and `app/api/v1/assistant.py` | Pratiksha |
| End-to-end language tests | `tests/integration/` (per-language programs, hostile programs, every example) | Pooja |
| Web app | live check (`src/live/`), Saarthi panel and patches (`src/assistant/`), entry page and profiles (`src/auth/`, `src/profile/`), background and moods (`src/cosmos/`), mascot (`src/mascot/`), run journey, examples for every language, browser tests (`e2e/`) | Vedant |
| Setup and docs | `README.md`, `docs/*`, `.devcontainer/`, `Makefile`, `.github/workflows/ci.yml`, `compose.yaml`, `.env.example` | All |

## 3. Checks actually performed

Environment: Ubuntu 24.04 cloud workspace, 2 vCPUs, 7 GB RAM, Linux 6.18,
Docker 29.4.3 (cgroup v1), Python 3.12.3, Node.js 22.22, Playwright 1.56 with
its headless Chromium. Every number below comes from a run on 27 Sep 2026.
All checks except the integration suite were repeated after the last code
change; the backend has not changed since the integration run.

| Check | Result |
|---|---|
| API tests: `pytest services/api` | **274 passed**: golden tests for 14 toolchains (126 captured outputs; none may leave a line unexplained) plus GCC's, validation of all 16 profiles, endpoints, the state machine, Saarthi (18 tests against a scripted fake Claude speaking the real Messages API format), contract freshness |
| Runner tests: `pytest services/runner` | **49 passed**: policy, HTTP layer and the C containment corpus against the real Docker daemon |
| Every language end to end: `pytest tests/integration` | **216 passed, 13 skipped** in 6 min 12 s. For each of the 15 languages: a program with input, a compile error, a runtime error, the out-of-memory codes, and six hostile programs; plus every example program with its expected outcome. The 13 skipped tests are Swift's (image not built) |
| Web unit tests: `vitest run` | **64 passed** in 8 files: live-check rules per language, markers, patches, hashes, run pipeline, formatting, moods, XP and badges |
| Lint and type-check | `ruff check services scripts tests`: clean. `tsc -b`: clean |
| Web build: `vite build` | OK. First load: app 371 kB (117 kB gzip) and CSS 87 kB (20 kB gzip), as Vite reports them. Monaco (3.9 MB, 1.0 MB gzip) loads with the editor; each Tree-sitter grammar (from 48 KB for Lua to 5.2 MB for C#) only when its language is first used |
| Dependencies: `npm audit --omit=dev` | 0 vulnerabilities |
| Browser tests: `playwright test` | **58 passed** in 9.5 min (Chromium, development stack, mock AI): entry page (choices, validation, keyboard, returning guests, phone), welcome and tour, runs, compile errors with hints, stale results, crashes, input, language picker, fast typing, per-language drafts, themes, Ctrl+Enter, phone layouts; one example per language run in the browser and one error example; live check; Saarthi explain, fix, apply and verify, ask, and refusing stale code; badges, XP, streak, moods, animations switch, and a badge card never covering an open menu |
| Docker Compose, **with local stand-in base images** | `docker compose config` valid; `api` and `runner` images built (after fixing the API's Dockerfile, which did not copy `.npmrc` and so let `npm ci` run package install scripts); `up` started them with the API published on 127.0.0.1:8080 only and the runner on the internal network, which has no route out (checked from inside the runner: name resolution fails). Browser tests against this production build: 50 of the 53 non-AI tests passed; the other 3 paste whole files through a test hook that only development builds have, so the live check was checked there by typing instead (C and Python slips flagged). Saarthi was not configured in this stack |
| Live check accuracy | See [section 4](#4-live-checking-while-typing) |
| CI workflow | `actionlint`: no findings. The workflow itself has **not** run on GitHub yet |
| Visual review | Screenshots of the entry page, workspace, run journey, compile error, Saarthi, profile card and phone layouts, in both themes, were inspected; problems found this way (a hidden journey, an overlapping bubble, a too-small constellation, the sign-in card too low on phones, a light-theme contrast of 4.38:1) were fixed |

## 4. Live checking while typing

**How it works.** 150 ms after the last change, the editor's text goes to a
Web Worker that parses it with the language's Tree-sitter grammar (compiled
to WebAssembly and bundled with the app) and turns error and missing nodes
into short messages ("Missing ';'", "This '{' is never closed", "Incomplete:
something is missing after '+' at the end of line 4"). Every request carries a
generation number and answers for older text are dropped, so a marker never
belongs to text that is no longer in the editor. Nothing is sent to the API
or to the AI while typing; a browser test checks that no run is requested.

It is a **syntax** check, not a compiler: undeclared names, wrong types and
everything else a compiler or interpreter decides are reported when the
program is run, and the interface says so ("Live syntax check (not run yet)").
For Python it adds rules the grammar does not enforce but Python 3 does,
following CPython's own tokenizer: a missing `:` after `if`/`def`/`for`/...,
unexpected or inconsistent indentation, mixed tabs and spaces, a block without
a body, `else if` instead of `elif`, `=` where `==` was meant, and Python 2's
`print "x"`. Ruby, Lua and Bash get the missing `then`/`do`/`end` messages.
SQL (dialects differ) and Swift have no live check.

**False positives.** A check that flags correct code teaches the wrong thing,
so correct code was checked first:

| Corpus | Result |
|---|---|
| CPython 3.11's standard library (672 `.py` files, including `asyncio`, `email`, `lib2to3`, `test.support`) | **0** files flagged |
| The shipped starters and examples without a syntax error (14 languages, including those that fail to compile for other reasons, such as an undeclared name) | **0** of 66 flagged |
| The shipped examples with a syntax error (C, Java, C#, PHP: a missing `;`; Python: a missing `:`; JavaScript: a missing `)`; Ruby: a missing `end`; Lua and Bash: a missing `then`) | **9 of 9** flagged, on the line of the mistake or (C#) the next line with a hint about the line before |

**Latency.** Measured in the browser from the keystroke to the updated
markers on screen, *including* the 150 ms pause (`e2e/latency.spec.ts`):
500-line files, 14 languages, 20 edits each (a space added and removed at the
end of the file), headless Chromium with software rendering on the 2-vCPU
cloud machine, Vite development server, all animations on. Target: p95 under
300 ms. The table is one full run of the browser suite; over four runs the
overall p50 was 169.2 to 172.1 ms and the p95 184.5 to 193.8 ms (the last
run, after the last code change: 169.2 ms and 184.5 ms).

| Language | p50 | p95 | Parse and analyse in the worker, p95 |
|---|---|---|---|
| C | 174.3 ms | 192.1 ms | 4.3 ms |
| C++ | 171.0 ms | 183.0 ms | 3.3 ms |
| Java | 168.5 ms | 187.0 ms | 4.5 ms |
| Python | 172.2 ms | 186.9 ms | 7.8 ms |
| JavaScript | 170.1 ms | 188.1 ms | 3.6 ms |
| TypeScript | 174.2 ms | 190.5 ms | 4.7 ms |
| Go | 168.1 ms | 185.2 ms | 3.1 ms |
| Rust | 171.9 ms | 186.0 ms | 3.4 ms |
| C# | 167.9 ms | 189.3 ms | 5.3 ms |
| Kotlin | 169.9 ms | 193.3 ms | 4.8 ms |
| PHP | 170.1 ms | 182.8 ms | 3.7 ms |
| Ruby | 178.8 ms | 206.1 ms | 4.9 ms |
| Lua | 171.3 ms | 187.3 ms | 3.2 ms |
| Bash | 168.7 ms | 184.2 ms | 3.5 ms |
| **All 280 edits** | **171.4 ms** | **190.5 ms** | |

The first use of a language also downloads and compiles its grammar once
(5 ms for Lua to about 1 s for Ruby in this run); those samples are not in
the table. The time is dominated by the 150 ms pause; the parse itself takes
a few milliseconds. With animations switched off the numbers are the same
within a few milliseconds, and Playwright's trace recording, which inflated
earlier measurements, is off for this test: see [ui.md](../ui.md#performance).
A real browser with a GPU should do at least as well as this headless setup,
but that has not been measured.

## 5. Languages and containment

| | |
|---|---|
| Languages | 15 verified, Swift prepared (details, commands and limits: [languages.md](../languages.md)) |
| Images | 9 sandbox images (`gcc`, `java`, `python`, `node`, `go`, `rust`, `dotnet`, `kotlin`, `scripting` for PHP, Ruby, Lua, Bash and SQL) plus `swift`, opt-in |
| Diagnostics | Every toolchain's output goes through the same pipeline: grammar rules, multi-line block parsers (Python tracebacks, Java and Kotlin stack traces, Rust and Go panics, .NET exceptions, Node.js stacks with TypeScript source maps), classification into stable codes, crash synthesis for signals |
| Examples | 65 example programs for the 15 languages (runs, compile errors, runtime errors, limits), plus 3 for Swift; `tests/integration/test_examples.py` checks every outcome in the real sandbox |
| Containment | Endless loop, memory hog, process or thread bomb, network connection, write to the workspace and output flood, in every language: all contained. The per-language table is in [threat-model.md, section 5.2](../threat-model.md#52-every-language) |

Problems found by these tests and fixed, each with a regression test: the
runner's environment policy rejected .NET's mixed-case variables (now allowed,
while `LD_*` and `DYLD_*` stay refused); the runner's ceilings were below the
Kotlin compiler's needs; Rust, Go, Java, Kotlin and .NET out-of-memory and
thread-limit messages were not classified; the JVM's own warnings leaked into
the output; Ruby's `^~~~` caret lines were left unexplained.

## 6. Saarthi (M5 and M6)

Explain, suggest a fix, apply and verify, and ask, as described in
[saarthi.md](../saarthi.md). What makes the answers trustworthy is not the
model but the checks around it: evidence built on the server from one stored
run, structured answers validated against a schema, the student's code
treated as data, line numbers checked, a patch policy (whole-line edits, at
most 60 lines), patches bound to the exact source hash, `409` when the code
changed since the run, and a verdict that comes from a real run, never from
the model. Saarthi works with Claude (default model `claude-haiku-4-5-20251001`)
or any OpenAI-compatible server such as a local Ollama model; keys stay on the
server, requests happen only when a student presses a button, and per-client
and daily limits cap the cost.

Tested with a scripted fake Claude (API tests) and a canned stand-in server
(browser tests), both labelled as such. **Not yet tried with a real model.**

## 7. The Code Drishti interface

Details in [ui.md](../ui.md) and [accounts.md](../accounts.md).

* **Entry page:** an eye that follows the pointer, circled by the 15
  languages; a terminal that types and "runs" small programs; guests start
  with a name, an emblem, an experience level and a start language. Accounts
  (Google, GitHub, email) switch on when the app is built with a Supabase
  project's URL and publishable key; without them the Supabase client is not
  even part of the loaded code.
* **Saarthi, drawn:** an original comet-spirit character with six moods, and a
  companion that says in one line what each run did.
* **Run journey:** Queue, the language's steps and Result light up as the
  real run reports progress; a clean run bursts into stars.
* **Moods:** the background, the editor's aura and the mascot follow the
  code: typing, running, success, a syntax slip, an error.
* **Progress:** XP for observed events only, ten levels, 14 badges, day and
  clean-run streaks, a constellation of the languages run.
* **Care:** animations use only `transform` and `opacity`, pause while the
  student types, can be switched off, and follow "reduce motion"; what the
  animations express is also said in text; every text colour meets 4.5:1
  contrast in both themes.

A real bug was found while testing the redesign and fixed: typing quickly
while results re-rendered could lose keystrokes (the editor's value
synchronisation raced the student's typing). A browser test now types a
whole line at full speed right after a run and checks that every character
arrived; when the bug was found it failed three times out of three on the old
code, and it passes now.
Measuring the latency also found an invisible animation that never stopped
(the editor's run beam, now turning only during runs) and a flaw in the
measurement itself (Playwright's trace recording slowed the browser; the
latency test now runs without it).
Recording a walkthrough of the app found one more: for the five seconds a
"badge unlocked" card was showing, it sat above the top bar's menus and
swallowed clicks on the language menu. It now sits below menus and dialogs,
and a browser test opens the language menu while the card is showing (it
failed on the old code and passes now).

## 8. Not verified (stated plainly)

* **Real Docker Hub base images.** Docker Hub is blocked where this was built.
  The sandbox images were built from a local `ubuntu:24.04` made with
  `debootstrap` from the official Ubuntu archive; the Dockerfiles were not
  changed for that. Building from the real images is the first thing to check
  (`make images` or `docker compose --profile images build`, or let CI do it).
* **Swift:** image never built, programs never run.
* **GitHub Codespaces and the dev container:** the container images it uses
  (mcr.microsoft.com, ghcr.io) are blocked here.
* **The CI workflow:** linted, never run.
* **Docker Compose with the real base images:** the stack was built and run
  here only from local stand-ins for `python:3.12-slim` and `node:22-slim`
  (section 3).
* **Windows**, Docker Desktop, macOS: not tried.
* **Saarthi with a real model** (Claude or Ollama): no key was used.
* **Accounts with a real Supabase project:** written against the official
  client and type-checked only.
* **Browsers:** only headless Chromium. Not Firefox, Safari, a GPU-backed
  browser or a real phone. No screen-reader audit.

## 9. Known limitations

* The live check is syntax only, and SQL and Swift have none.
* Programs are a single file (Java: `Main.java` with `public class Main`).
* Executions live in memory in one API process; they are lost on restart.
* Progress, drafts and guest profiles live in the browser, not on a server,
  even for accounts.
* No per-user limits: runs are bounded globally and Saarthi per IP address.
  Keep the API inside a trusted network (it binds to 127.0.0.1 by default).
* Kotlin compiles slowly (several seconds a run).
* Crashes that print nothing (for example a C segmentation fault) are reported
  with their signal but without a source line.

## 10. Readiness for M7

The MVP scope is complete: the languages, the live check, the explanations and
the verified fixes all work end to end with the stated caveats. M7 can start
once the team has done the checks only they can do:

1. Push the repository to GitHub and let the CI workflow build every image
   from the real base images and run all tests.
2. Or, in a codespace or on a Linux machine with Docker, run `make images`
   and `make test-languages` (see [codespaces.md](../codespaces.md)).
3. Try Saarthi once with a real key (Explain and Fix on the C "missing
   semicolon" and "typo" examples).

M7 then covers: a Supabase project (accounts on, then run history, drafts and
progress stored per user with row-level security), per-user limits and
ownership checks in the API, a deployment on a Linux server with Docker (the
runner needs a Docker daemon, so not a serverless host), and the evaluation
with students (task completion, time to fix an error, usefulness of
explanations) alongside the latency and accuracy numbers above.
