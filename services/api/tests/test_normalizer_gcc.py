"""Golden tests for the C adapter's grammar (A3) and classification (A4).

Each fixture pair in tests/fixtures/gcc is a C program and the exact stderr
that GCC 13.3 produced for it inside the sandbox image (captured with the
flags from c.toml, file named main.c). Expectations were checked by hand.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from app.adapters.registry import LanguageRegistry
from app.analysis.pipeline import diagnose
from app.schemas.runner import JobResult, StepResult, Termination

FIXTURES = Path(__file__).parent / "fixtures"
C = LanguageRegistry.from_directory().get("c")


def compile_diagnostics(name: str):
    source = (FIXTURES / "gcc" / f"{name}.c").read_text(encoding="utf-8")
    stderr = (FIXTURES / "gcc" / f"{name}.stderr.txt").read_text(encoding="utf-8")
    failed = ": error:" in stderr or "fatal error" in stderr or "ld returned" in stderr
    result = JobResult(job_id="j", image="img", image_id="sha256:x", steps=[
        StepResult(name="compile", termination=Termination.EXITED, exit_code=1 if failed else 0,
                   wall_ms=1, stderr=stderr)])
    return diagnose(C, "exe_test", {"main.c": source}, result)


def summary(diagnostics):
    out = []
    for d in diagnostics:
        r = d.range
        out.append((d.severity.value, d.category.value, d.code,
                    (r.start_line, r.start_column, r.end_column) if r else None))
    return out


# (severity, category, code, (line, startColumn, endColumn) | None)
EXPECTED = {
    "undeclared": [
        ("error", "name", "C_UNDECLARED_IDENTIFIER", (6, 9, 13)),
    ],
    "missing_semicolon": [
        ("error", "syntax", "C_MISSING_SEMICOLON", (5, 5, 11)),
        ("warning", "other", "C_UNUSED", (4, 9, 10)),
    ],
    "implicit_declaration": [
        ("warning", "name", "C_IMPLICIT_FUNCTION_DECLARATION", (2, 5, 11)),
        ("warning", "name", "C_IMPLICIT_FUNCTION_DECLARATION", (2, 5, 11)),
        ("warning", "other", "C_UNUSED", (3, 9, 15)),
    ],
    "missing_header": [
        ("error", "build", "C_MISSING_HEADER", (1, 10, 20)),
    ],
    "undefined_reference": [
        ("error", "build", "C_UNDEFINED_REFERENCE", (6, 5, 31)),
    ],
    "type_errors": [
        ("error", "type", "C_TYPE_MISMATCH", (9, 13, 14)),
        ("warning", "type", "C_POINTER_INTEGER_CONVERSION", (10, 15, 17)),
        ("warning", "type", "C_FORMAT_MISMATCH", (11, 14, 15)),
        ("error", "type", "C_WRONG_ARGUMENT_COUNT", (12, 12, 15)),
        ("warning", "other", "C_UNUSED", (9, 9, 10)),
    ],
    "unexpected_eof": [
        ("error", "syntax", "C_UNEXPECTED_END_OF_INPUT", (5, 9, 15)),
    ],
    "utf8_columns": [
        # GCC reports byte column 27; 'é' is 2 bytes but 1 UTF-16 unit.
        ("error", "name", "C_UNDECLARED_IDENTIFIER", (4, 26, 27)),
    ],
    "tab_columns": [
        # With -fdiagnostics-column-unit=byte a tab counts as one column, like Monaco.
        ("error", "name", "C_UNDECLARED_IDENTIFIER", (5, 18, 22)),
    ],
    "two_functions": [
        ("error", "name", "C_UNDECLARED_IDENTIFIER", (4, 16, 17)),
        ("error", "syntax", "C_MISSING_SEMICOLON", (12, 30, 31)),
        ("warning", "other", "C_MISSING_RETURN", (5, 1, 2)),
        ("warning", "other", "C_UNUSED", (9, 12, 24)),
    ],
    "unknown_type": [
        ("error", "name", "C_UNKNOWN_TYPE_NAME", (4, 5, 10)),
        ("warning", "type", "C_POINTER_INTEGER_CONVERSION", (4, 18, 24)),
        ("warning", "type", "C_FORMAT_MISMATCH", (5, 14, 15)),
    ],
    "unterminated_string": [
        # GCC prints this as a warning AND an error; one error is kept.
        ("error", "syntax", "C_UNTERMINATED_LITERAL", (4, 12, 20)),
        ("error", "syntax", "C_EXPECTED_TOKEN", (5, 5, 11)),
        ("error", "syntax", "C_MISSING_SEMICOLON", (5, 14, 15)),
    ],
    "stray_character": [
        ("error", "syntax", "C_STRAY_CHARACTER", (4, 15, 16)),
        ("error", "syntax", "C_MISSING_SEMICOLON", (4, 17, 18)),
    ],
    "assignment_in_condition": [
        ("warning", "other", "C_ASSIGNMENT_IN_CONDITION", (5, 9, 10)),
        ("warning", "other", "C_UNINITIALIZED_VARIABLE", (9, 5, 11)),
    ],
    "missing_return": [
        ("warning", "other", "C_MISSING_RETURN", (5, 1, 2)),
    ],
}


@pytest.mark.parametrize("name", sorted(EXPECTED))
def test_fixture(name):
    assert summary(compile_diagnostics(name)) == EXPECTED[name]


def test_every_fixture_has_expectations():
    names = {p.stem for p in (FIXTURES / "gcc").glob("*.c")}
    assert names == set(EXPECTED)


def test_all_known_gcc_output_is_recognized():
    """No fixture should produce UNPARSED: every line is matched by a rule."""
    for name in EXPECTED:
        assert all(d.code != "UNPARSED" for d in compile_diagnostics(name)), name


def test_missing_semicolon_points_at_the_previous_line():
    first = compile_diagnostics("missing_semicolon")[0]
    assert first.message == "expected ',' or ';' before 'printf'"
    hint = first.related_locations[-1]
    assert hint.message.startswith("The missing ';'")
    # `    int x = 5` -> the last character '5' is column 13
    assert (hint.range.start_line, hint.range.start_column, hint.range.end_column) == (4, 13, 14)


def test_no_hint_when_gcc_already_points_at_the_right_place():
    semicolon = compile_diagnostics("two_functions")[1]
    assert semicolon.code == "C_MISSING_SEMICOLON"
    assert semicolon.related_locations == []


def test_notes_become_related_locations():
    arg_count = compile_diagnostics("type_errors")[3]
    assert arg_count.related_locations[0].message == "declared here"
    r = arg_count.related_locations[0].range
    assert (r.start_line, r.start_column) == (5, 5)


def test_boilerplate_note_is_dropped():
    undeclared = compile_diagnostics("undeclared")[0]
    assert undeclared.related_locations == []
    assert "did you mean 'total'?" in undeclared.message


def test_linker_path_is_made_relative():
    link = compile_diagnostics("undefined_reference")[0]
    assert link.file == "main.c"
    assert link.message == "undefined reference to `helper'"


def test_raw_output_reference_covers_excerpt_lines():
    first = compile_diagnostics("undeclared")[0]
    ref = first.raw_output_reference
    assert (ref.step, ref.stream, ref.start_line, ref.end_line) == ("compile", "stderr", 2, 6)


def test_diagnostics_are_tagged_with_execution_and_source():
    for d in compile_diagnostics("type_errors"):
        assert d.execution_id == "exe_test"
        assert d.source.value == "compiler"
        assert d.id.startswith("diag_")


def test_unrecognized_output_is_kept_as_unparsed():
    result = JobResult(job_id="j", image="img", image_id="x", steps=[
        StepResult(name="compile", termination=Termination.EXITED, exit_code=1, wall_ms=1,
                   stderr="main.c:3:1: error: something\nweird new toolchain line\nanother one\n")])
    diagnostics = diagnose(C, "exe_test", {"main.c": "a\nb\nc\n"}, result)
    unparsed = [d for d in diagnostics if d.code == "UNPARSED"]
    assert len(unparsed) == 1
    assert unparsed[0].severity.value == "info"
    assert "weird new toolchain line" in unparsed[0].message
    assert "(+1 more lines)" in unparsed[0].message
    ref = unparsed[0].raw_output_reference
    assert (ref.start_line, ref.end_line) == (2, 3)


def test_compile_failure_without_recognized_error_is_explained():
    result = JobResult(job_id="j", image="img", image_id="x", steps=[
        StepResult(name="compile", termination=Termination.EXITED, exit_code=1, wall_ms=1,
                   stderr="completely unknown failure\n")])
    codes = [d.code for d in diagnose(C, "exe_test", {"main.c": ""}, result)]
    assert codes == ["UNPARSED", "TOOLCHAIN_FAILED"]
