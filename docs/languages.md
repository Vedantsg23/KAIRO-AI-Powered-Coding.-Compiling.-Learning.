# Languages

KAIRO runs **32 languages** with their real toolchains in sandbox images:
the 15 it started with, and 17 more from the Ubuntu 24.04 archive in two
extra images (`sandbox-native` for compiled lab languages, `sandbox-extra`
for interpreters). **Swift** is prepared as an experimental 33rd that stays
hidden until it has been built and verified (see [Enabling Swift](#enabling-swift)).

Every language is a *profile* (`services/api/app/adapters/profiles/<id>.toml`:
trusted argument arrays, limits, error grammars and codes) and a sandbox image
(`infra/containers/<image>/Dockerfile`). The runner, the API routes, the
editor and the diagnostic format are the same for all of them. Every program,
in every language, runs under the same sandbox rules: no network, read-only
root file system, read-only workspace while the program runs, non-root user
10001 with no capabilities, and per-step limits on time, CPU, memory,
processes, output and file size ([threat model](threat-model.md)).

## Overview

| Language | Toolchain | Sandbox image | Steps | Live check | Examples |
|---|---|---|---|---|---|
| C | GCC 13 | `sandbox-gcc:13` | compile, run | yes | 9 |
| C++ | G++ 13 | `sandbox-gcc:13` | compile, run | yes | 4 |
| Java | OpenJDK 21 | `sandbox-java:21` | compile, run | yes | 4 |
| Python | CPython 3.12 | `sandbox-python:3.12` | syntax check, run | yes, plus Python 3 rules | 4 |
| JavaScript | Node.js 18 | `sandbox-node:18` | syntax check, run | yes | 4 |
| TypeScript | TypeScript 7 (`tsc --strict`) on Node.js 18 | `sandbox-node:18` | compile (type check), run | yes (syntax) | 4 |
| Go | Go 1.23 | `sandbox-go:1.23` | compile, link, run | yes | 4 |
| Rust | rustc 1.75 | `sandbox-rust:1.75` | compile, run | yes | 4 |
| C# | .NET 8 (Roslyn `csc`) | `sandbox-dotnet:8.0` | compile, run | yes | 4 |
| Kotlin | Kotlin 2.4 on a Java 21 runtime | `sandbox-kotlin:2.4` | compile, run | yes | 4 |
| PHP | PHP 8.3 | `sandbox-scripting:24.04` | lint (`php -l`), run | yes | 4 |
| Ruby | Ruby 3.2 | `sandbox-scripting:24.04` | syntax check (`ruby -wc`), run | yes | 4 |
| Lua | Lua 5.4 | `sandbox-scripting:24.04` | syntax check (`luac -p`), run | yes | 4 |
| Bash | Bash 5.2 | `sandbox-scripting:24.04` | syntax check (`bash -n`), run | yes | 4 |
| SQL | SQLite 3.45 (in-memory database) | `sandbox-scripting:24.04` | run | no | 4 |
| R | R 4.3 (`Rscript`) | `sandbox-extra:24.04` | syntax check, run | no | 4 |
| Assembly | NASM 2.16 + GNU ld (x86-64 Linux, `_start` + syscalls) | `sandbox-native:24.04` | assemble, link, run | no | 4 |
| Lex | flex 2.6 + GCC 13 (`-lfl`) | `sandbox-native:24.04` | generate scanner, compile, run | no | 3 |
| Verilog | Icarus Verilog 12 (`-g2012`) | `sandbox-native:24.04` | elaborate, simulate | no | 3 |
| Prolog | SWI-Prolog 9 | `sandbox-extra:24.04` | load and run | no | 4 |
| Fortran | gfortran 13 (`-fcheck=all`) | `sandbox-native:24.04` | compile, run | no | 4 |
| Pascal | Free Pascal 3.2 (`-Cr -Co`) | `sandbox-native:24.04` | compile, run | no | 4 |
| COBOL | GnuCOBOL 3.1 (fixed form, `-debug`) | `sandbox-native:24.04` | compile, run | no | 4 |
| Perl | Perl 5.38 (`-w`) | `sandbox-extra:24.04` | syntax check (`perl -wc`), run | no | 3 |
| Common Lisp | SBCL 2.2 (`--script`) | `sandbox-extra:24.04` | run | no | 3 |
| Scheme | GNU Guile 3.0 | `sandbox-extra:24.04` | run | no | 3 |
| Erlang | Erlang/OTP 25 | `sandbox-extra:24.04` | compile (`erlc`), run | no | 4 |
| Elixir | Elixir 1.14 on OTP 25 | `sandbox-extra:24.04` | run | no | 4 |
| Nim | Nim 1.6 (C backend, GCC 13) | `sandbox-native:24.04` | compile, run | no | 4 |
| D | GDC 13 | `sandbox-native:24.04` | compile, run | no | 4 |
| Ada | GNAT 13 (`gnatmake`) | `sandbox-native:24.04` | compile, run | no | 4 |
| Tcl | Tcl 8.6 (`tclsh`) | `sandbox-extra:24.04` | run | no | 3 |
| Swift *(experimental)* | Swift 6.1 | `sandbox-swift:6.1` (opt-in) | compile, run | no | 3 |

Images are named `compiler-copilot/sandbox-<name>:<tag>`. All but Swift are
built `FROM ubuntu:24.04` with toolchains from the Ubuntu archive or the npm
registry (TypeScript, Kotlin), so no image needs anything beyond those two
sources. The versions are the ones the images declare; every execution also
records the exact toolchain version and image ID it ran with.

**Steps.** Languages without a separate compiler still get a check step
before running (for example `bash -n`, `php -l`, CPython's own parser), so a
syntax error is reported as a compile error, pinned to its line, and the
program never starts. SQL has no such step: SQLite reads the script statement
by statement and `-bail` stops at the first failing one.

**Live check.** Tree-sitter grammars for 14 languages run in a Web Worker in
the browser while the student types (150 ms after the last keystroke). It is
a *syntax* check only: names, types and everything else a compiler checks are
reported when the code is run. For Python it adds the rules the grammar does
not enforce but Python 3 does: a missing `:` after `if`/`def`/`for`/...,
unexpected or inconsistent indentation, mixed tabs and spaces, blocks without
a body, and Python 2's `print "x"`. SQL (dialects differ), Swift and the 17
languages of the native and extra images have no live syntax check yet: their
editor still has syntax colouring, completions, snippets and hover help, and
the compiler checks everything when the code runs. Measured latency: [the milestone report](milestones/M3-M6-report.md#4-live-checking-while-typing).

## Commands and limits

Exact argument arrays from the profiles (no shell is involved anywhere; the
files are `main.<ext>`, except Java's `Main.java`). Limits are per step: wall
clock, CPU time, memory, processes/threads. In every language, output is
capped at 64 KB per stream (then the program is stopped), and a run may write
at most 16 MB to its scratch directory.

| Language | Step | Command | Limits |
|---|---|---|---|
| C | compile | `gcc -std=gnu17 -O0 -g -Wall ... -o main main.c -lm` | 10 s, 10 s CPU, 256 MB, 64 |
| | run | `stdbuf -oL /workspace/main` | 5 s, 5 s CPU, 256 MB, 32 |
| C++ | compile | `g++ -std=gnu++20 -O0 -g -Wall ... -fmax-errors=50 -o main main.cpp` | 20 s, 20 s CPU, 512 MB, 64 |
| | run | `stdbuf -oL /workspace/main` | 5 s, 5 s CPU, 256 MB, 32 |
| Java | compile | `javac -J-Xmx256m ... -Xlint:all ... -d /workspace/classes Main.java` | 20 s, 20 s CPU, 512 MB, 64 |
| | run | `java -Xmx192m -XX:+UseSerialGC ... -cp /workspace/classes Main` | 5 s, 10 s CPU, 384 MB, 64 |
| Python | check | `python3 -I -B /opt/code-drishti/check_syntax.py main.py` | 10 s, 10 s CPU, 256 MB, 16 |
| | run | `python3 -I -B -u -W ignore::SyntaxWarning /workspace/main.py` | 5 s, 5 s CPU, 256 MB, 32 |
| JavaScript | check | `node --check main.js` | 10 s, 10 s CPU, 256 MB, 32 |
| | run | `node --max-old-space-size=160 /workspace/main.js` | 5 s, 5 s CPU, 320 MB, 64 |
| TypeScript | compile | `tsc --pretty false --strict --target es2022 --module commonjs --sourceMap --noEmitOnError ... main.ts` | 20 s, 20 s CPU, 512 MB, 64 |
| | run | `node --enable-source-maps --max-old-space-size=160 /workspace/out/main.js` | 5 s, 5 s CPU, 320 MB, 64 |
| Go | compile | `/opt/go-std/bin/compile -p main -lang=go1.23 -complete ... main.go` | 20 s, 20 s CPU, 512 MB, 32 |
| | link | `/opt/go-std/bin/link -buildmode=exe -o /workspace/main /workspace/main.a` | 20 s, 20 s CPU, 512 MB, 32 |
| | run | `/workspace/main` | 5 s, 5 s CPU, 256 MB, 32 |
| Rust | compile | `rustc --edition 2021 --color never -C opt-level=0 -o main main.rs` | 30 s, 30 s CPU, 512 MB, 64 |
| | run | `/workspace/main` | 5 s, 5 s CPU, 256 MB, 32 |
| C# | compile | `dotnet /opt/code-drishti/csharp/csc.dll -nologo -noconfig @refs.rsp -target:exe -nullable:enable ... main.cs` | 30 s, 30 s CPU, 768 MB, 64 |
| | run | `dotnet exec --runtimeconfig ... /workspace/main.dll` | 5 s, 10 s CPU, 384 MB, 64 |
| Kotlin | compile | `kotlinc -J-Xmx512m ... main.kt -include-runtime -d /workspace/main.jar` | 45 s, 45 s CPU, 1024 MB, 64 |
| | run | `java -Xmx192m ... -jar /workspace/main.jar` | 5 s, 10 s CPU, 384 MB, 64 |
| PHP | check | `php -n -d display_errors=stderr -d log_errors=0 -l main.php` | 10 s, 10 s CPU, 256 MB, 16 |
| | run | `php -n ... -d error_reporting=E_ALL -d memory_limit=160M /workspace/main.php` | 5 s, 5 s CPU, 256 MB, 32 |
| Ruby | check | `ruby -wc main.rb` | 10 s, 10 s CPU, 256 MB, 16 |
| | run | `ruby -r/opt/code-drishti/ruby/sync.rb /workspace/main.rb` | 5 s, 5 s CPU, 256 MB, 32 |
| Lua | check | `luac5.4 -p main.lua` | 10 s, 10 s CPU, 128 MB, 16 |
| | run | `stdbuf -oL lua5.4 /workspace/main.lua` | 5 s, 5 s CPU, 256 MB, 32 |
| Bash | check | `bash -n main.sh` | 10 s, 10 s CPU, 128 MB, 16 |
| | run | `bash /workspace/main.sh` | 5 s, 5 s CPU, 256 MB, 32 |
| SQL | run | `sqlite3 -bail -batch -box :memory: ".read /workspace/main.sql"` | 5 s, 5 s CPU, 256 MB, 16 |
| R | check | `Rscript --vanilla /usr/local/lib/kairo/check.R main.R` (parses, does not run) | 10 s, 10 s CPU, 256 MB, 16 |
| | run | `Rscript --vanilla /workspace/main.R` | 10 s, 10 s CPU, 512 MB, 32 |
| Assembly | assemble | `nasm -f elf64 -g -F dwarf -o main.o main.asm` | 10 s, 10 s CPU, 256 MB, 16 |
| | link | `ld -o main main.o` | 10 s, 10 s CPU, 256 MB, 16 |
| | run | `/workspace/main` | 5 s, 5 s CPU, 128 MB, 16 |
| Lex | scan | `flex -o lex.yy.c main.l` | 10 s, 10 s CPU, 256 MB, 16 |
| | compile | `gcc -std=gnu17 -O0 -g ... -o main lex.yy.c -lfl` | 20 s, 20 s CPU, 512 MB, 64 |
| | run | `stdbuf -oL /workspace/main` | 5 s, 5 s CPU, 256 MB, 32 |
| Verilog | elaborate | `iverilog -g2012 -Wall -Wno-timescale ... -o main.vvp main.v` | 20 s, 20 s CPU, 512 MB, 32 |
| | simulate | `vvp -n /workspace/main.vvp` | 5 s, 5 s CPU, 256 MB, 32 |
| Prolog | run | `swipl -q --on-error=halt --stack-limit=128m -t halt /workspace/main.pro` | 5 s, 5 s CPU, 384 MB, 32 |
| Fortran | compile | `gfortran -O0 -g -Wall -Wno-conversion -Wno-tabs -fcheck=all ... -o main main.f90` | 20 s, 20 s CPU, 512 MB, 64 |
| | run | `/workspace/main` (unbuffered preconnected units) | 5 s, 5 s CPU, 256 MB, 32 |
| Pascal | compile | `fpc -vewn -gl -Cr -Co -Sa -omain main.pas` | 20 s, 20 s CPU, 512 MB, 32 |
| | run | `/workspace/main` | 5 s, 5 s CPU, 256 MB, 32 |
| COBOL | compile | `cobc -x -debug -Wall -o main main.cob` | 20 s, 20 s CPU, 512 MB, 32 |
| | run | `stdbuf -oL /workspace/main` | 5 s, 5 s CPU, 256 MB, 32 |
| Perl | check | `perl -wc main.pl` | 10 s, 10 s CPU, 256 MB, 16 |
| | run | `perl -w /workspace/main.pl` | 5 s, 5 s CPU, 256 MB, 32 |
| Common Lisp | run | `sbcl --dynamic-space-size 256 --control-stack-size 8 --script /workspace/main.lisp` | 5 s, 5 s CPU, 512 MB, 32 |
| Scheme | run | `guile --no-auto-compile /workspace/main.scm` | 5 s, 5 s CPU, 256 MB, 32 |
| Erlang | compile | `erlc +warn_unused_vars main.erl` | 20 s, 20 s CPU, 512 MB, 64 |
| | run | `erl -noshell +S 1:1 ... -pa /workspace -s main main -s init stop` | 10 s, 10 s CPU, 256 MB, 64 |
| Elixir | run | `elixir --erl "+S 1:1 ..." /workspace/main.exs` | 15 s, 15 s CPU, 384 MB, 64 |
| Nim | compile | `nim c --hints:off --colors:off --nimcache:/tmp/nimcache -o:main main.nim` | 40 s, 40 s CPU, 1024 MB, 64 |
| | run | `stdbuf -oL /workspace/main` | 5 s, 5 s CPU, 256 MB, 32 |
| D | compile | `gdc -O0 -g -Wall ... -o main main.d` | 30 s, 30 s CPU, 1024 MB, 64 |
| | run | `stdbuf -oL /workspace/main` | 5 s, 5 s CPU, 256 MB, 32 |
| Ada | compile | `gnatmake -q -g -gnata -gnatW8 -o main main.adb -bargs -E` | 30 s, 30 s CPU, 1024 MB, 64 |
| | run | `stdbuf -oL /workspace/main` | 5 s, 5 s CPU, 256 MB, 32 |
| Tcl | run | `tclsh /workspace/main.tcl` | 5 s, 5 s CPU, 256 MB, 32 |
| Swift | compile | `swiftc -swift-version 5 -diagnostic-style llvm -Onone ... -o /workspace/main main.swift` | 45 s, 45 s CPU, 1024 MB, 64 |
| | run | `/workspace/main` | 5 s, 5 s CPU, 256 MB, 32 |

The runner refuses any job above its own ceilings (60 s wall, 60 s CPU,
1024 MB, 256 processes per step), whatever a profile says.

## Notes per language

* **C and C++** share one image. Runtime crashes that print nothing (for
  example a segmentation fault) still produce a diagnostic such as
  `RUNTIME_SEGMENTATION_FAULT`; output printed before the crash is kept.
* **Java:** one file, `Main.java`, with `public class Main` holding `main`.
  Threads count against the process limit; an endless thread creator ends as
  `JAVA_THREAD_LIMIT`. The JVM's own `-Xmx` usually reports memory hogs first
  (`JAVA_OUT_OF_MEMORY`).
* **Python:** the check step compiles the file with CPython's parser, so
  `SyntaxError` and `IndentationError` are compile errors with a line; runtime
  tracebacks are mapped to the student's line.
* **TypeScript** is type-checked with `--strict`: type errors are compile
  errors (`TS_...` codes) and nothing runs until they are fixed. Runtime
  errors are mapped back to the `.ts` line through source maps.
* **Go** is compiled and linked with the standard library's own `compile` and
  `link` tools (no `go build`, no modules, no network).
* **C#** uses the Roslyn compiler directly (no `dotnet build`, no NuGet), with
  top-level statements allowed.
* **Kotlin** is the slowest to compile (several seconds; up to the 45 s limit
  on a busy machine), which is why its compile step has the largest limits.
* **SQL** runs in an in-memory SQLite database that starts empty for every
  run. Its examples create their own tables. SQLite shell commands such as
  `.shell` run inside the same sandbox as every other program (see the threat
  model), exactly like a Bash program would.

### The native and extra images

* **Assembly** follows the lab-course convention: 64-bit NASM, an entry point
  `_start`, and Linux system calls (`0` read, `1` write, `60` exit). The object
  is linked on its own with `ld` (no C library). A program that defines `main`
  instead gets the warning `ASM_NO_ENTRY_POINT`.
* **Lex** programs are scanners: flex generates `lex.yy.c`, GCC compiles it
  with `-lfl` (which supplies `main` and `yywrap` when the file has none), and
  the scanner reads the Input tab. GCC errors in the C code of the actions
  point back at `main.l` lines.
* **Verilog** is simulated by Icarus Verilog: the testbench is a module with
  an `initial` block that uses `$display` and ends with `$finish`. Verilog has
  no way to start processes or open sockets, so the sandbox tests for those
  two attacks are skipped for it; `$fatal` is reported as a runtime error.
* **Prolog** uses `main.pro` (`main.pl` is Perl's). `:- initialization(main).`
  runs `main/0` after loading; `-t halt` makes SWI-Prolog exit instead of
  opening its interactive top level, and loading stops at the first error.
  An unknown procedure is pointed at the line that calls it.
* **Fortran, Pascal, COBOL, D, Ada and Nim** are compiled with their run-time
  checks on, so an index outside an array stops the program with its line
  (`FORTRAN_INDEX_OUT_OF_BOUNDS`, `PAS_INDEX_OUT_OF_BOUNDS`, ...). COBOL is
  fixed form (area A from column 8). Ada's main procedure must be `Main`.
* **R, Scheme and Common Lisp** report run-time errors without line numbers.
  KAIRO then looks up the failing call, the unbound name or the evaluated form
  in the source and uses its line only when it appears exactly once.
* **Erlang** needs `-module(main).` and `-export([main/0]).`; the program runs
  as `main:main()`. **Elixir** scripts (`main.exs`) are compiled in memory and
  run in one step. Both run the BEAM VM with one scheduler thread so it stays
  inside the process limit.
* Every one of these languages has the same integration tests as the first 15:
  input and output, a compile or syntax error on its line, a runtime error on
  its line, and the six hostile programs (endless loop, memory hog, process
  bomb, network, write to the workspace, output flood). The images were built
  from a locally bootstrapped `ubuntu:24.04` base because Docker Hub could not
  be reached where the project was developed; the CI job builds them from the
  official image.

## HTML, CSS and React in the browser

HTML, CSS and React are not run on the server at all: they are rendered in a
**preview** inside the browser, in an `<iframe>` with `sandbox="allow-scripts
allow-modals allow-forms"` and no `allow-same-origin`, so the page has an
opaque origin and cannot read KAIRO's storage, cookies or the API. The page's
`console.log`, warnings, errors and unhandled rejections are sent to the
terminal with `postMessage` (each run has its own token), and an error is
linked to its line in the editor.

| Language | File | How it runs |
|---|---|---|
| HTML | `index.html` | The page as written, with KAIRO's console capture added after the doctype |
| CSS | `styles.css` | The stylesheet applied to a sample page (KAIRO Cafe: headings, a card grid, a form, a table, buttons) |
| React | `App.jsx` | JSX compiled in the browser by [Sucrase](https://github.com/alangpierce/sucrase) (`jsx` + `imports`), React 18 and ReactDOM bundled with KAIRO (no CDN); `import ... from "react"` works, and a default-exported component is rendered when the code does not render anything itself |

With the **Live Preview** extension (on by default) the preview follows the
editor 600 ms after typing stops; Run (Ctrl+Enter) rebuilds it at once. A JSX
syntax error is shown with its line and column before anything runs.

## Python notebooks

The **Notebook** (the notebook button on the left bar, or "Open the Python
notebook" in the command palette) is a Jupyter-style view for Python: code and
Markdown cells, `In [n]` numbers, the value of a cell's last line as
`Out[n]`, tracebacks under the failing cell, and `.ipynb` import and export
(nbformat 4.5, which Jupyter, VS Code and Google Colab open).

* **How cells run.** Running a cell sends the code cells from the first one
  to it to the sandbox, where a fresh CPython 3.12 runs them in order in one
  namespace (`infra/containers/python/notebook.py`, the unlisted `notebook`
  profile). This is "restart and run to here" every time: an output never
  depends on state left over from an earlier run, at the cost of repeating
  the cells above (each run is limited to 10 s and 256 MB, like a Python program).
* **Outputs.** The runner prints a marker before each cell on standard output
  and standard error, so every printed line, warning, `Out[n]` value and error
  is put back under its own cell. Cells after a failing one are marked "Not
  run". A cell stopped by the time or memory limit gets that reason as its
  error. An output whose cell was edited since is marked "edited since this ran".
* **Errors.** The server classifies the error (`NB_NAME_ERROR`,
  `NB_INDEX_ERROR`, `NB_ZERO_DIVISION`, ...); the cell shows the line in the
  cell, Python's own hint ("Did you mean: 'value'?"), the traceback, a quick
  note and, when an AI model is configured, "Ask Saarthi why".
* **While typing.** Each cell gets the live syntax check, Typo Guard and
  Saarthi Tips; names defined in the cells above count, so a typo of a
  variable from an earlier cell is caught. Completions include the names
  defined anywhere in the notebook.
* **The notebook's own terminal.** A run log, the input for `input()` (one
  line per call), and a `>>>` console: a line typed there runs after all the
  cells, with their variables, and its result appears in the terminal only.
* **Magics.** `%matplotlib inline`, `!pip install ...` and other IPython
  commands are not Python and cannot run in the sandbox; when a cell only fails
  to parse because of them, those lines are skipped with a note.
* **Limits.** Standard library only: the sandbox has no network, so pip
  packages, NumPy, pandas and plotting libraries are not available.

## Formatters

**Format document** (Shift+Alt+F, the command palette, or Ctrl+S with the
Format on Save extension) uses:

| Languages | Formatter | Where it runs |
|---|---|---|
| JavaScript, TypeScript, React, HTML, CSS | Prettier 3 | In the browser (loaded on first use) |
| C, C++, Java | clang-format 18 (Google style, 4-space indent, 100 columns) | `sandbox-gcc:13` |
| C# | clang-format 18 (Microsoft style) | `sandbox-gcc:13` |
| Python | Black 24 (`format_python.py` in the image) | `sandbox-python:3.12` |
| Go | gofmt | `sandbox-go:1.23` |
| Bash | shfmt (4-space indent) | `sandbox-scripting:24.04` |

The sandbox formatters are unlisted profiles (`fmt-c`, `fmt-python`, ...)
whose only step prints the file formatted: the code goes through the same
runner, isolation and limits as a program, and is only reformatted, never
compiled or run. Code that does not parse is left unchanged and the formatter
says which line it could not read. The new text replaces the editor's in one
undo step, and only if the code did not change while it was being formatted.

## Enabling Swift

Swift is prepared but **not verified**: its image (`FROM swift:6.1-noble`, the
Docker Official Image) could not be downloaded where the project was
developed. Until it is enabled, the API lists Swift with `"status":
"experimental", "available": false` and the web app does not offer it.

1. Build the image: `make image-swift` (or `docker compose --profile swift build`).
2. Allow it in the runner, together with the other images, for example in `.env` for compose:
   `RUNNER_ALLOWED_IMAGES=["compiler-copilot/sandbox-gcc:13", ..., "compiler-copilot/sandbox-swift:6.1"]`
   (the default list is in `services/runner/runner/config.py`).
3. Run its tests: `RUNNER_ALLOWED_IMAGES='["compiler-copilot/sandbox-swift:6.1"]' .venv/bin/pytest tests/integration -k swift`.
   The CI job "Swift (experimental)" does steps 1 and 3 on every push.
4. When they pass, restart the runner. Swift appears in the language picker
   with an "experimental" badge. Its error grammar (`grammars/swiftc.toml`)
   was written from Swift's documented diagnostic format and may need new
   rules once real output is seen; `UNPARSED` diagnostics show where.

## Adding another language

See [adding-a-language.md](adding-a-language.md).
