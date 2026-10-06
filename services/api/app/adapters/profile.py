"""Schema of a language adapter: profiles (adapters/profiles/<id>.toml) and
shared output grammars (adapters/grammars/<name>.toml), plus their loaders.

A language adapter is data, not code: the trusted toolchain image, the source
file name, the compile and run steps (argument arrays, working directories,
limits) and the grammars that turn tool output into normalized diagnostics.
Output formats that one line pattern cannot describe (Python tracebacks, Java
stack traces, C++ uncaught exceptions) are handled by named block parsers in
app/analysis/blocks.py, referenced from a grammar rule with action = "block".

Validation happens once at start-up, so a mistake in an adapter (bad regex,
unknown grammar or parser, missing run step) stops the API with a clear
message instead of failing on a student's request.
"""

from __future__ import annotations

import re
import tomllib
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from ..schemas.diagnostics import Category, DiagnosticSource


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class Limits(_Strict):
    wall_time_ms: int = Field(ge=100, le=60_000)
    cpu_time_s: int = Field(ge=1, le=60)
    memory_mb: int = Field(ge=16, le=4096)
    pids: int = Field(ge=4, le=1024)
    output_kb: int = Field(ge=1, le=10_240)
    tmp_mb: int = Field(ge=1, le=512)
    file_size_mb: int = Field(ge=1, le=512)


class Step(_Strict):
    name: str = Field(pattern=r"^[a-z][a-z0-9_-]{0,31}$")
    kind: Literal["compile", "run"]
    # Shown in the run pipeline, e.g. "Syntax check" for Python's compile step.
    label: str | None = Field(default=None, max_length=24)
    argv: list[str] = Field(min_length=1)
    workdir: Literal["/workspace", "/tmp"] = "/workspace"
    workspace_mode: Literal["rw", "ro"] = "rw"
    env: dict[str, str] = Field(default_factory=dict)
    stdin: bool = False  # does this step receive the user's input?
    grammar: str | None = None  # name of a shared grammar or a key in [grammars]
    limits: Limits

    @property
    def diagnostic_source(self) -> DiagnosticSource:
        return DiagnosticSource.COMPILER if self.kind == "compile" else DiagnosticSource.RUNTIME

    @property
    def display_label(self) -> str:
        return self.label or ("Compile" if self.kind == "compile" else "Run")


class GrammarRule(_Strict):
    """One line pattern. Rules are tried in order; the first match wins.

    action = "diagnostic": the line starts a diagnostic. Named groups used:
        file, line, column, severity, message (message is required).
        A severity of "note" attaches the line to the previous diagnostic
        as a related location instead of creating a new diagnostic.
        caret = true: the next two lines are a source excerpt and a line with
        a single '^' under the error position (javac); the column is read
        from the caret and both lines are consumed.
    action = "detail":     an indented follow-up line (javac "symbol: ...")
        appended to the previous diagnostic's message with `append`, a
        template containing {detail}.
    action = "block":      the line starts a multi-line structure handled by
        the named block `parser` (tracebacks, stack traces).
    action = "context":    remembered but not reported (e.g. "In function 'f':").
        A context line with file/line/column groups (GCC's "required from here")
        records a user-code location for the next diagnostic.
    action = "ignore":     known noise (source excerpts, caret lines, summaries).
    """

    id: str
    action: Literal["diagnostic", "context", "ignore", "detail", "block"]
    pattern: re.Pattern[str]
    severity: str | None = None  # used when the pattern has no `severity` group
    caret: bool = False
    append: str | None = None
    parser: str | None = None
    # Build the message from named groups, e.g. "{message} [{code}]".
    template: str | None = None

    @model_validator(mode="after")
    def _consistent(self) -> GrammarRule:
        groups = self.pattern.groupindex
        if self.action == "diagnostic" and "message" not in groups:
            raise ValueError(f"grammar rule {self.id!r}: diagnostic patterns need a (?P<message>...) group")
        if self.action == "detail":
            if "detail" not in groups:
                raise ValueError(f"grammar rule {self.id!r}: detail patterns need a (?P<detail>...) group")
            if not self.append or "{detail}" not in self.append:
                raise ValueError(f"grammar rule {self.id!r}: detail rules need append = '... {{detail}} ...'")
        if self.action == "block" and not self.parser:
            raise ValueError(f"grammar rule {self.id!r}: block rules need a parser name")
        if self.template is not None:
            names = set(re.findall(r"{(\w+)}", self.template))
            if not names <= set(groups):
                raise ValueError(f"grammar rule {self.id!r}: template uses unknown groups {sorted(names - set(groups))}")
        if self.caret and self.action != "diagnostic":
            raise ValueError(f"grammar rule {self.id!r}: caret = true only applies to diagnostic rules")
        return self


class Grammar(_Strict):
    streams: list[Literal["stdout", "stderr"]] = ["stderr"]
    column_unit: Literal["byte", "utf16", "codepoint"] = "utf16"
    report_unmatched: bool = True  # unknown lines become an info UNPARSED diagnostic
    severity_map: dict[str, Literal["error", "warning", "info", "note"]] = Field(default_factory=dict)
    # Other grammars whose rules are appended after this grammar's own rules.
    extends: list[str] = Field(default_factory=list)
    rules: list[GrammarRule] = Field(default_factory=list)

    @model_validator(mode="after")
    def _has_rules(self) -> Grammar:
        if not self.rules and not self.extends:
            raise ValueError("a grammar needs rules or a grammar to extend")
        return self


class ClassifyRule(_Strict):
    """Maps a message to the shared taxonomy (algorithm A4). First match wins."""

    id: str
    pattern: re.Pattern[str]
    category: Category
    code: str = Field(pattern=r"^[A-Z][A-Z0-9_]*$")
    # Optional deterministic hint added as a related location, e.g. point at
    # the end of the previous line for "expected ';' before 'printf'".
    hint: Literal["previous_line_end"] | None = None
    hint_message: str | None = None


class Toolchain(_Strict):
    name: str
    declared_version: str
    image: str


SIGNAL_NAMES = {"SIGSEGV", "SIGBUS", "SIGFPE", "SIGABRT", "SIGILL", "SIGTRAP", "SIGKILL", "SIGPIPE", "SIGXFSZ"}


class LanguageProfile(_Strict):
    schema_version: Literal[2]
    id: str = Field(pattern=r"^[a-z][a-z0-9_-]{0,15}$")
    display_name: str
    editor_mode: str
    source_file: str = Field(pattern=r"^[A-Za-z0-9_][A-Za-z0-9_.-]{0,63}$")
    code_prefix: str = Field(pattern=r"^[A-Z][A-Z0-9]*$")
    workspace_prefix: str = "/workspace/"
    # "experimental": prepared but not yet verified end to end; shown with a badge.
    status: Literal["stable", "experimental"] = "stable"
    # false: runs like any language but is not offered in the language list
    # (the notebook profile, used by the web app's Notebook view).
    listed: bool = True
    # "formatter": the run step prints the source file formatted (clang-format,
    # Black, gofmt, shfmt); the student's code is reformatted, never run.
    purpose: Literal["program", "formatter"] = "program"
    toolchain: Toolchain
    steps: list[Step] = Field(min_length=1)
    grammars: dict[str, Grammar] = Field(default_factory=dict)
    classify: list[ClassifyRule] = Field(default_factory=list)
    # Plain-language explanations that replace the generic crash message for a
    # signal in this language, e.g. Swift's runtime checks trap with SIGILL.
    signal_messages: dict[str, str] = Field(default_factory=dict)

    @model_validator(mode="after")
    def _consistent(self) -> LanguageProfile:
        unknown = set(self.signal_messages) - SIGNAL_NAMES
        if unknown:
            raise ValueError(f"profile {self.id!r}: unknown signal names {sorted(unknown)}")
        names = [s.name for s in self.steps]
        if len(set(names)) != len(names):
            raise ValueError(f"profile {self.id!r}: step names must be unique")
        if self.steps[-1].kind != "run":
            raise ValueError(f"profile {self.id!r}: the last step must be a run step")
        if sum(s.stdin for s in self.steps) != 1:
            raise ValueError(f"profile {self.id!r}: exactly one step must take stdin")
        if self.purpose == "formatter" and (self.listed or len(self.steps) != 1):
            raise ValueError(f"profile {self.id!r}: a formatter is unlisted and has a single step")
        for s in self.steps:
            if s.grammar is not None and s.grammar not in self.grammars:
                raise ValueError(f"profile {self.id!r}: step {s.name!r} uses unknown grammar {s.grammar!r}")
        return self

    def step(self, name: str) -> Step:
        for s in self.steps:
            if s.name == name:
                return s
        raise KeyError(name)


# ------------------------------------------------------------------ loading


def load_grammar(path: Path) -> Grammar:
    with path.open("rb") as fh:
        data = tomllib.load(fh)
    try:
        return Grammar.model_validate(data)
    except Exception as exc:
        raise ValueError(f"invalid grammar {path.name}: {exc}") from exc


def resolve_grammars(grammars: dict[str, Grammar], known_parsers: set[str] | None = None) -> dict[str, Grammar]:
    """Flatten `extends` (own rules first, then each base's rules) and check parsers."""
    resolved: dict[str, Grammar] = {}

    def resolve(name: str, chain: tuple[str, ...]) -> Grammar:
        if name in resolved:
            return resolved[name]
        if name in chain:
            raise ValueError(f"grammar {name!r}: circular 'extends' ({' -> '.join((*chain, name))})")
        if name not in grammars:
            raise ValueError(f"grammar {chain[-1]!r} extends unknown grammar {name!r}")
        grammar = grammars[name]
        rules = list(grammar.rules)
        for base in grammar.extends:
            rules.extend(resolve(base, (*chain, name)).rules)
        if known_parsers is not None:
            for rule in rules:
                if rule.action == "block" and rule.parser not in known_parsers:
                    raise ValueError(f"grammar {name!r}: rule {rule.id!r} uses unknown parser {rule.parser!r}")
        resolved[name] = grammar.model_copy(update={"rules": rules, "extends": []})
        return resolved[name]

    for name in grammars:
        resolve(name, ())
    return resolved


def load_profile(path: Path, shared_grammars: dict[str, Grammar] | None = None,
                 known_parsers: set[str] | None = None) -> LanguageProfile:
    """Load one profile. Grammars defined in the profile take precedence over
    shared grammars of the same name."""
    with path.open("rb") as fh:
        data = tomllib.load(fh)
    try:
        own = {name: Grammar.model_validate(g) for name, g in (data.get("grammars") or {}).items()}
        merged = {**(shared_grammars or {}), **own}
        data["grammars"] = resolve_grammars(merged, known_parsers)
        return LanguageProfile.model_validate(data)
    except Exception as exc:
        raise ValueError(f"invalid language profile {path.name}: {exc}") from exc
