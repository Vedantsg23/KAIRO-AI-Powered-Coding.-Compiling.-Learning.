# Adding a language

A language is configuration plus tests: a sandbox image, a profile, error
grammars, test programs and examples. It never changes the runner, the API
routes, the diagnostic format or the editor's code paths. Lua
(`profiles/lua.toml`, `grammars/lua-*.toml`) is a compact reference; C
(`profiles/c.toml`) is the most detailed one.

## 1. Sandbox image: `infra/containers/<name>/Dockerfile`

* `FROM ubuntu:24.04` with the toolchain from the Ubuntu archive or another
  trusted registry, pinned to a version;
* an unprivileged user with UID/GID **10001** that owns `/workspace`;
* no setuid/setgid binaries (`find / -xdev -perm /6000 -type f -exec chmod a-s {} +`);
* `/etc/compiler-copilot/toolchain.json` with `name`, `version`, `languages`
  (recorded with every execution).

Then allow the image: add it to `allowed_images` in
`services/runner/runner/config.py`, to `RUNNER_ALLOWED_IMAGES` and a
`sandbox-<name>` build entry in `compose.yaml`, to `SANDBOX_IMAGES` in the
`Makefile`, and to the `languages` matrix in `.github/workflows/ci.yml`. An
image may serve several languages (the `scripting` image serves five).

## 2. Profile: `services/api/app/adapters/profiles/<id>.toml`

```toml
schema_version = 2
id = "lua"
display_name = "Lua"
editor_mode = "lua"              # a Monaco language id
source_file = "main.lua"
code_prefix = "LUA"              # diagnostic codes are LUA_...
status = "stable"                # or "experimental": listed, hidden until its image is built
[toolchain]
name = "Lua"
declared_version = "5.4"
image = "compiler-copilot/sandbox-scripting:24.04"

[[steps]]                        # a check or compile step (optional for SQL-like tools)
name = "compile"
kind = "compile"
label = "Syntax check"           # shown in the run journey
argv = ["luac5.4", "-p", "main.lua"]   # an argument array, never a shell string
workdir = "/workspace"
workspace_mode = "ro"            # "rw" when the step writes the program
grammar = "lua-check"            # grammars/lua-check.toml
[steps.limits]
wall_time_ms = 10000
cpu_time_s = 10
memory_mb = 128
pids = 16
output_kb = 64
tmp_mb = 16
file_size_mb = 16

[[steps]]
name = "run"
kind = "run"
argv = ["stdbuf", "-oL", "lua5.4", "/workspace/main.lua"]
workdir = "/tmp"
workspace_mode = "ro"            # the program never writes its own workspace
stdin = true
grammar = "lua-runtime"
[steps.limits]
# ...

[[classify]]                     # ordered: message -> category and code
id = "call-nil"
pattern = '''^attempt to call a nil value'''
category = "name"
code = "LUA_CALL_NIL"
```

Other optional fields: per-step `env` (the runner refuses `LD_*`/`DYLD_*`),
and `[signal_messages]` to phrase a signal for this language (Swift uses it
for traps). Limits must stay within the runner's ceilings. The API validates
every profile at start-up and refuses to start with a broken one.

## 3. Grammars: `services/api/app/adapters/grammars/<name>.toml`

Ordered `[[rules]]` matched against each output line. Actions:

| Action | Effect |
|---|---|
| `diagnostic` | Starts a diagnostic from the named groups `file`, `line`, `column`, `severity`, `message` |
| `detail` | Adds text or a related location to the previous diagnostic |
| `context` | Remembers something for the next diagnostics (for example "In function main") |
| `block` | Hands a multi-line report to a parser in `analysis/parsers/` (tracebacks, stack traces, panics) |
| `ignore` | Known noise: source excerpts, caret lines, summaries |

Set `column_unit` to what the tool reports (`byte`, `codepoint` or `utf16`);
positions are converted to UTF-16 using the exact source. Unmatched lines
become one `UNPARSED` diagnostic, so gaps are visible, never silent. A grammar
can be shared by several profiles (the Node.js runtime serves JavaScript and
TypeScript).

## 4. Tests

* **Golden tests** (`services/api/tests/fixtures/<tool>/` and
  `test_normalizer_*.py`): capture real output for typical beginner errors
  with `scripts/capture_fixtures.py`, then write the expected diagnostics by
  hand. No fixture may produce `UNPARSED`.
* **End to end** (`tests/integration/programs.py`): add a block with every
  key (`hello`, `compile_error`, `runtime_error`, `memory_codes`, and the
  hostile `loop`, `memory`, `bomb`, `network`, `write`, `flood`).
  `test_every_profile_has_programs` fails until you do. Run
  `.venv/bin/pytest tests/integration -k <id>`.

## 5. Web app

* Monaco syntax colours: import the language's `register` module in
  `apps/web/src/editor/monaco.ts` if it is not there yet.
* Starter and examples: `apps/web/src/onboarding/examples/<id>/` plus
  entries in `manifest.json` (outcome, expected output or code).
  `tests/integration/test_examples.py` runs every example in the sandbox and
  checks its outcome; `e2e/languages.spec.ts` drives one in the browser.
* Plain-language notes for the new codes: `apps/web/src/diagnostics/notes.ts`.
* A short badge for the picker: `LANGUAGE_BADGE` in `layout/LanguagePicker.tsx`
  (and a star in the profile constellation, `profile/ProfileCard.tsx`).
* Live check (optional): if a Tree-sitter grammar exists as a `.wasm` build
  compatible with `web-tree-sitter`, add it to `live/worker.ts`,
  `live/support.ts` and `live/analyze.test.ts`, then check that valid code
  gives no problems.

## 6. Contracts

Nothing changes unless a new field was needed; then `make contracts`.
