"""The adapter loader must reject broken profiles and grammars at start-up."""

from __future__ import annotations

import tomllib
from pathlib import Path

import pytest

from app.adapters.profile import Grammar, LanguageProfile, load_grammar, load_profile, resolve_grammars
from app.adapters.registry import GRAMMAR_DIR, PROFILE_DIR, LanguageRegistry, load_shared_grammars
from app.analysis.blocks import BLOCK_PARSERS

C_TOML = PROFILE_DIR / "c.toml"
SHARED = load_shared_grammars()


def c_data() -> dict:
    data = tomllib.loads(C_TOML.read_text(encoding="utf-8"))
    data["grammars"] = resolve_grammars(SHARED, set(BLOCK_PARSERS))
    return data


def gcc_data() -> dict:
    return tomllib.loads((GRAMMAR_DIR / "gcc.toml").read_text(encoding="utf-8"))


ALL_LANGUAGES = ["c", "cpp", "java", "python", "javascript", "typescript", "go", "rust",
                 "csharp", "kotlin", "swift", "php", "ruby", "lua", "bash", "sql",
                 "r", "asm", "lex", "verilog", "prolog", "fortran", "pascal", "cobol", "perl",
                 "lisp", "scheme", "erlang", "elixir", "nim", "d", "ada", "tcl",
                 # Not languages: the formatters and the notebook runner (unlisted).
                 "fmt-bash", "fmt-c", "fmt-cpp", "fmt-csharp", "fmt-go", "fmt-java", "fmt-python", "notebook"]
FORMATTERS = {"fmt-bash", "fmt-c", "fmt-cpp", "fmt-csharp", "fmt-go", "fmt-java", "fmt-python"}
EXPERIMENTAL = {"swift"}  # prepared but not yet verified against the real toolchain
SHELLS = {"sh", "bash", "dash", "/bin/sh", "/bin/bash", "cmd", "powershell", "pwsh"}


def test_all_shipped_profiles_load_in_ui_order():
    registry = LanguageRegistry.from_directory()
    assert [p.id for p in registry.all()] == ALL_LANGUAGES
    assert {p.id for p in registry.all() if p.status == "experimental"} == EXPERIMENTAL


def test_formatters_and_the_notebook_are_not_listed_as_languages():
    registry = LanguageRegistry.from_directory()
    assert {p.id for p in registry.all() if p.purpose == "formatter"} == FORMATTERS
    assert {p.id for p in registry.all() if not p.listed} == FORMATTERS | {"notebook"}
    data = c_data()
    data["purpose"] = "formatter"
    with pytest.raises(ValueError, match="a formatter is unlisted"):
        LanguageProfile.model_validate(data)


def test_profiles_can_explain_signals_in_their_own_words():
    swift = LanguageRegistry.from_directory().get("swift")
    assert "runtime safety checks" in swift.signal_messages["SIGILL"]
    data = c_data()
    data["signal_messages"] = {"SIGNOPE": "x"}
    with pytest.raises(ValueError, match="unknown signal names"):
        LanguageProfile.model_validate(data)


def test_every_step_uses_an_existing_grammar_and_a_trusted_argv():
    for profile in LanguageRegistry.from_directory().all():
        for step in profile.steps:
            assert step.grammar in profile.grammars, (profile.id, step.name)
            # Commands are fixed argument arrays run directly: no inline code
            # strings, and a shell only for the Bash language, on the file.
            assert not {"-c", "-e", "--eval", "-eval", "/c"} & set(step.argv), (profile.id, step.name)
            if step.argv[0] in SHELLS:
                assert profile.id == "bash" and step.argv[-1].endswith(profile.source_file), (profile.id, step.name)


NEUTRAL_CODES = ("TOOLCHAIN_", "RUNTIME_", "LIMIT_", "PLATFORM_")
# TypeScript runs on Node.js, so its runtime errors share JavaScript's codes.
SHARED_RUNTIME_PREFIX = {"typescript": "JS_"}


def test_every_profile_has_a_unique_code_prefix_and_image():
    profiles = LanguageRegistry.from_directory().all()
    prefixes = [p.code_prefix for p in profiles]
    assert len(set(prefixes)) == len(prefixes)
    for p in profiles:
        assert p.toolchain.image.startswith("compiler-copilot/sandbox-"), p.id
        allowed = (p.code_prefix + "_", *NEUTRAL_CODES, *filter(None, [SHARED_RUNTIME_PREFIX.get(p.id)]))
        for rule in p.classify:
            assert rule.code.startswith(allowed), (p.id, rule.code)


def test_every_language_runs_with_a_read_only_workspace_and_input():
    for profile in LanguageRegistry.from_directory().all():
        run = profile.steps[-1]
        assert run.kind == "run" and run.stdin and run.workspace_mode == "ro" and run.workdir == "/tmp"


def test_shared_grammars_all_load_and_extend_correctly():
    resolved = resolve_grammars(SHARED, set(BLOCK_PARSERS))
    assert set(resolved) >= {"gcc", "glibc-runtime", "cxx-runtime", "javac", "jvm-runtime",
                             "cpython-check", "cpython-runtime"}
    # cxx-runtime = its own rules followed by every glibc-runtime rule
    own = [r.id for r in SHARED["cxx-runtime"].rules]
    assert [r.id for r in resolved["cxx-runtime"].rules] == own + [r.id for r in SHARED["glibc-runtime"].rules]


@pytest.mark.parametrize("mutate, message", [
    (lambda d: d["steps"].pop(), "last step must be a run step"),
    (lambda d: d["steps"][0].update(stdin=True), "exactly one step must take stdin"),
    (lambda d: d["steps"][0].update(grammar="nope"), "unknown grammar"),
    (lambda d: d["classify"][0].update(code="lower_case"), "code"),
    (lambda d: d["steps"][1]["limits"].update(memory_mb=999999), "memory_mb"),
    (lambda d: d["steps"][0].update(label="x" * 40), "label"),
    (lambda d: d.update(schema_version=1), "schema_version"),
    (lambda d: d.update(surprise="field"), "surprise"),
])
def test_invalid_profiles_are_rejected(mutate, message):
    data = c_data()
    mutate(data)
    with pytest.raises(Exception) as err:
        LanguageProfile.model_validate(data)
    assert message in str(err.value)


@pytest.mark.parametrize("mutate, message", [
    (lambda g: g["rules"][0].update(pattern="(unclosed"), "pattern"),
    (lambda g: next(r for r in g["rules"] if r["id"] == "gcc.located").update(pattern="^(?P<file>.+):"),
     "message"),
    (lambda g: g["rules"].append({"id": "d", "action": "detail", "pattern": "^x(?P<detail>.*)"}), "append"),
    (lambda g: g["rules"].append({"id": "b", "action": "block", "pattern": "^x"}), "parser"),
    (lambda g: g["rules"].append({"id": "c", "action": "ignore", "caret": True, "pattern": "^x"}), "caret"),
])
def test_invalid_grammar_rules_are_rejected(mutate, message):
    data = gcc_data()
    mutate(data)
    with pytest.raises(Exception) as err:
        Grammar.model_validate(data)
    assert message in str(err.value)


def test_unknown_block_parser_and_circular_extends_are_rejected():
    block = Grammar.model_validate({"rules": [{"id": "b", "action": "block", "parser": "nope", "pattern": "^x"}]})
    with pytest.raises(ValueError, match="unknown parser 'nope'"):
        resolve_grammars({"g": block}, set(BLOCK_PARSERS))
    a = Grammar.model_validate({"extends": ["b"]})
    b = Grammar.model_validate({"extends": ["a"]})
    with pytest.raises(ValueError, match="circular"):
        resolve_grammars({"a": a, "b": b})
    with pytest.raises(ValueError, match="unknown grammar 'missing'"):
        resolve_grammars({"a": Grammar.model_validate({"extends": ["missing"]})})


def test_loaders_name_the_broken_file(tmp_path: Path):
    bad = tmp_path / "broken.toml"
    bad.write_text('schema_version = 2\nid = "x"\n', encoding="utf-8")
    with pytest.raises(ValueError, match="broken.toml"):
        load_profile(bad, SHARED)
    bad_grammar = tmp_path / "noisy.toml"
    bad_grammar.write_text('rules = []\n', encoding="utf-8")
    with pytest.raises(ValueError, match="noisy.toml"):
        load_grammar(bad_grammar)
