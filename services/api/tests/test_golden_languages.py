"""Golden tests for every language adapter except C (see test_normalizer_gcc.py).

tests/fixtures/<language>/<case>.<ext> is a program and <case>.result.json is
exactly how the real sandbox ran it with the production profile (G++ 13.3,
OpenJDK 21, CPython 3.12, Node.js 18 + TypeScript 7, Go 1.23, rustc 1.75,
.NET 8, Kotlin 2.4, PHP 8.3, Ruby 3.2, Lua 5.4, Bash 5.2, SQLite 3.45,
gfortran 13, NASM 2.16, Free Pascal 3.2, GnuCOBOL 3.1, flex 2.6, Icarus
Verilog 12, Nim 1.6, GDC 13, GNAT 13, R 4.3, Perl 5.38, SWI-Prolog 9, Tcl 8.6,
Guile 3.0, SBCL 2.2, Erlang/OTP 25, Elixir 1.14; captured with
scripts/capture_fixtures.py). These
tests replay the recorded output through the whole diagnostics pipeline
(grammar A3, block parsers, classification A4, crash/limit synthesis) and the
final-state rules, without Docker. Every expectation below was checked by
hand against the source file.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.adapters.registry import LanguageRegistry
from app.analysis.pipeline import diagnose
from app.schemas.runner import JobResult, StepResult
from app.services.executions import final_state

FIXTURES = Path(__file__).parent / "fixtures"
EXT = {"cpp": ".cpp", "java": ".java", "python": ".py", "javascript": ".js", "typescript": ".ts", "go": ".go",
       "rust": ".rs", "csharp": ".cs", "kotlin": ".kt", "php": ".php", "ruby": ".rb", "lua": ".lua",
       "bash": ".sh", "sql": ".sql",
       "fortran": ".f90", "asm": ".asm", "pascal": ".pas", "cobol": ".cob", "lex": ".l", "verilog": ".v",
       "nim": ".nim", "d": ".d", "ada": ".adb", "r": ".R", "perl": ".pl", "prolog": ".pro", "tcl": ".tcl",
       "scheme": ".scm", "lisp": ".lisp", "erlang": ".erl", "elixir": ".exs"}
REGISTRY = LanguageRegistry.from_directory()


def replay(lang: str, case: str):
    profile = REGISTRY.get(lang)
    recorded = json.loads((FIXTURES / lang / f"{case}.result.json").read_text(encoding="utf-8"))
    source = (FIXTURES / lang / f"{case}{EXT[lang]}").read_text(encoding="utf-8")
    result = JobResult(job_id="j", image=profile.toolchain.image, image_id="sha256:x",
                       steps=[StepResult.model_validate(s) for s in recorded["steps"]])
    diagnostics = diagnose(profile, "exe_test", {profile.source_file: source}, result)
    state = final_state(result, {s.name: s.kind for s in profile.steps})
    return state.value, diagnostics


def summary(diagnostics):
    out = []
    for d in diagnostics:
        r = d.range
        out.append((d.severity.value, d.category.value, d.code,
                    (r.start_line, r.start_column, r.end_column) if r else None))
    return out


# (final state, [(severity, category, code, (line, startColumn, endColumn) | None), ...])
EXPECTED = {
    # ------------------------------------------------------------- C++ (G++ 13)
    ("cpp", "hello_input"): ("SUCCEEDED", []),
    ("cpp", "undeclared"): ("COMPILE_ERROR", [
        ("error", "name", "CPP_UNDECLARED_IDENTIFIER", (8, 18, 22))]),
    ("cpp", "missing_semicolon"): ("COMPILE_ERROR", [
        ("error", "syntax", "CPP_MISSING_SEMICOLON", (5, 5, 8)),
        ("warning", "other", "CPP_UNUSED", (4, 9, 10))]),
    ("cpp", "missing_include"): ("COMPILE_ERROR", [
        ("error", "name", "CPP_NOT_A_MEMBER", (4, 10, 16)),
        ("error", "syntax", "CPP_EXPECTED_TOKEN", (4, 17, 20)),
        ("error", "name", "CPP_UNDECLARED_IDENTIFIER", (5, 18, 19))]),
    ("cpp", "no_member"): ("COMPILE_ERROR", [
        ("error", "name", "CPP_NO_MEMBER", (11, 20, 21)),
        ("error", "name", "CPP_NO_MEMBER", (13, 7, 11))]),
    ("cpp", "overload"): ("COMPILE_ERROR", [
        ("error", "type", "CPP_NO_MATCHING_FUNCTION", (6, 16, 17)),
        ("error", "type", "CPP_TYPE_MISMATCH", (6, 17, 24))]),
    ("cpp", "template_deep"): ("COMPILE_ERROR", [
        ("error", "type", "CPP_NO_MATCHING_OPERATOR", (8, 13, 14))]),
    ("cpp", "warnings"): ("SUCCEEDED", [
        ("warning", "other", "CPP_SIGN_COMPARE", (12, 23, 24)),
        ("warning", "other", "CPP_UNUSED", (11, 9, 15)),
        ("warning", "other", "CPP_MISSING_RETURN", (7, 1, 2))]),
    ("cpp", "uncaught"): ("RUNTIME_ERROR", [
        ("error", "runtime", "CPP_UNCAUGHT_EXCEPTION", None)]),
    ("cpp", "assert"): ("RUNTIME_ERROR", [
        ("error", "runtime", "CPP_ASSERTION_FAILED", (6, 5, 26))]),
    ("cpp", "segv"): ("RUNTIME_ERROR", [
        ("error", "memory", "RUNTIME_SEGMENTATION_FAULT", None)]),
    # -------------------------------------------------------- Java (OpenJDK 21)
    ("java", "hello_input"): ("SUCCEEDED", []),
    ("java", "missing_semicolon"): ("COMPILE_ERROR", [
        ("error", "syntax", "JAVA_MISSING_SEMICOLON", (3, 18, 19))]),
    ("java", "cannot_find_symbol"): ("COMPILE_ERROR", [
        ("error", "name", "JAVA_CANNOT_FIND_SYMBOL", (7, 28, 32))]),
    ("java", "unicode_col"): ("COMPILE_ERROR", [  # Devanagari earlier on the line: UTF-16 columns
        ("error", "name", "JAVA_CANNOT_FIND_SYMBOL", (3, 38, 50))]),
    ("java", "incompatible_types"): ("COMPILE_ERROR", [
        ("error", "type", "JAVA_INCOMPATIBLE_TYPES", (3, 21, 27)),
        ("error", "type", "JAVA_INCOMPATIBLE_TYPES", (5, 17, 18))]),
    ("java", "wrong_args"): ("COMPILE_ERROR", [
        ("error", "type", "JAVA_WRONG_ARGUMENTS", (7, 28, 31))]),
    ("java", "missing_return"): ("COMPILE_ERROR", [
        ("error", "other", "JAVA_MISSING_RETURN", (6, 5, 6))]),
    ("java", "wrong_class_name"): ("COMPILE_ERROR", [
        ("error", "build", "JAVA_PUBLIC_CLASS_NAME", (1, 8, 13))]),
    ("java", "warnings"): ("SUCCEEDED", [
        ("warning", "type", "JAVA_RAW_TYPE", (6, 9, 13)),
        ("warning", "type", "JAVA_RAW_TYPE", (6, 26, 35)),
        ("warning", "type", "JAVA_RAW_TYPE", (7, 18, 19)),
        ("warning", "other", "JAVA_DEPRECATED_API", (8, 25, 28))]),
    ("java", "arithmetic"): ("RUNTIME_ERROR", [
        ("error", "runtime", "JAVA_ARITHMETIC_EXCEPTION", (3, 9, 22))]),
    ("java", "array_index"): ("RUNTIME_ERROR", [
        ("error", "runtime", "JAVA_INDEX_OUT_OF_BOUNDS", (5, 13, 42))]),
    ("java", "npe"): ("RUNTIME_ERROR", [
        ("error", "runtime", "JAVA_NULL_POINTER", (4, 9, 43))]),
    ("java", "number_format"): ("RUNTIME_ERROR", [
        ("error", "runtime", "JAVA_NUMBER_FORMAT", (3, 9, 46))]),
    ("java", "scanner_eof"): ("RUNTIME_ERROR", [
        ("error", "runtime", "JAVA_NO_MORE_INPUT", (6, 9, 30))]),
    ("java", "stack_overflow"): ("RUNTIME_ERROR", [
        ("error", "memory", "JAVA_STACK_OVERFLOW", (3, 9, 33))]),
    ("java", "oom"): ("RUNTIME_ERROR", [
        ("error", "memory", "JAVA_OUT_OF_MEMORY", (8, 13, 44))]),
    ("java", "caused_by"): ("RUNTIME_ERROR", [
        ("error", "runtime", "JAVA_UNCAUGHT_EXCEPTION", (6, 13, 75))]),
    ("java", "not_main_class"): ("RUNTIME_ERROR", [
        ("error", "build", "JAVA_MAIN_CLASS_NOT_FOUND", None)]),
    ("java", "no_main_method"): ("RUNTIME_ERROR", [
        ("error", "build", "JAVA_MAIN_METHOD_NOT_FOUND", None)]),
    # ----------------------------------------------------- Python (CPython 3.12)
    ("python", "hello_input"): ("SUCCEEDED", []),
    ("python", "missing_colon"): ("COMPILE_ERROR", [
        ("error", "syntax", "PY_MISSING_COLON", (2, 19, 20))]),
    ("python", "unclosed_paren"): ("COMPILE_ERROR", [
        ("error", "syntax", "PY_UNBALANCED_BRACKETS", (4, 6, 7))]),
    ("python", "syntax_unicode"): ("COMPILE_ERROR", [
        ("error", "syntax", "PY_UNBALANCED_BRACKETS", (2, 5, 6))]),
    ("python", "indentation"): ("COMPILE_ERROR", [
        ("error", "syntax", "PY_INDENTATION_ERROR", (2, 1, 6))]),
    ("python", "unexpected_indent"): ("COMPILE_ERROR", [
        ("error", "syntax", "PY_UNEXPECTED_INDENT", (2, 5, 10))]),
    ("python", "unterminated_string"): ("COMPILE_ERROR", [
        ("error", "syntax", "PY_UNTERMINATED_STRING", (1, 8, 9))]),
    ("python", "print_statement"): ("COMPILE_ERROR", [
        ("error", "syntax", "PY_PRINT_STATEMENT", (1, 1, 14))]),
    ("python", "warnings"): ("SUCCEEDED", [
        ("warning", "other", "PY_INVALID_ESCAPE", (2, 1, 16)),
        ("warning", "other", "PY_IS_LITERAL", (4, 1, 11))]),
    ("python", "name_error"): ("RUNTIME_ERROR", [
        ("error", "name", "PY_NAME_ERROR", (4, 7, 11))]),
    ("python", "attr_error"): ("RUNTIME_ERROR", [
        ("error", "name", "PY_ATTRIBUTE_ERROR", (2, 1, 11))]),
    ("python", "type_error"): ("RUNTIME_ERROR", [  # repeated frames: whole line, not the folded markers
        ("error", "type", "PY_TYPE_ERROR", (4, 5, 49))]),
    ("python", "tabs_unicode"): ("RUNTIME_ERROR", [  # tab indent + Devanagari: exact '1 + None'
        ("error", "type", "PY_TYPE_ERROR", (2, 20, 28))]),
    ("python", "zero_division"): ("RUNTIME_ERROR", [
        ("error", "runtime", "PY_ZERO_DIVISION", (3, 11, 29))]),
    ("python", "index_error"): ("RUNTIME_ERROR", [
        ("error", "runtime", "PY_INDEX_ERROR", (3, 11, 19))]),
    ("python", "key_error"): ("RUNTIME_ERROR", [
        ("error", "runtime", "PY_KEY_ERROR", (2, 7, 19))]),
    ("python", "value_error"): ("RUNTIME_ERROR", [
        ("error", "runtime", "PY_VALUE_ERROR", (1, 7, 20))]),
    ("python", "eof_error"): ("RUNTIME_ERROR", [
        ("error", "runtime", "PY_EOF_ERROR", (1, 9, 28))]),
    ("python", "recursion"): ("RUNTIME_ERROR", [
        ("error", "memory", "PY_RECURSION_ERROR", (2, 5, 24))]),
    ("python", "module_not_found"): ("RUNTIME_ERROR", [
        ("error", "build", "PY_IMPORT_ERROR", (1, 1, 19))]),
    ("python", "chained"): ("RUNTIME_ERROR", [
        ("error", "runtime", "PY_VALUE_ERROR", (3, 16, 25)),
        ("error", "runtime", "PY_UNCAUGHT_EXCEPTION", (5, 9, 61))]),
    ("python", "mem_bomb"): ("MEMORY_LIMIT", [
        ("error", "memory", "LIMIT_MEMORY", None)]),
    # All expectations below were reviewed by hand against the source files.
    # ------------------------------------------------------------------ javascript
    ("javascript", "hello_input"): ("SUCCEEDED", []),
    ("javascript", "reference_error"): ("RUNTIME_ERROR", [
        ('error', 'name', 'JS_NOT_DEFINED', (5, 13, 17)),
    ]),
    ("javascript", "stack_overflow"): ("RUNTIME_ERROR", [
        ('error', 'memory', 'JS_STACK_OVERFLOW', (2, 5, 11)),
    ]),
    ("javascript", "syntax_error"): ("COMPILE_ERROR", [
        ('error', 'syntax', 'JS_SYNTAX_ERROR', (2, 23, 24)),
    ]),
    ("javascript", "thrown"): ("RUNTIME_ERROR", [
        ('error', 'runtime', 'JS_UNCAUGHT_ERROR', (3, 15, 18)),
    ]),
    ("javascript", "type_error"): ("RUNTIME_ERROR", [
        ('error', 'runtime', 'JS_UNDEFINED_PROPERTY', (2, 19, 25)),
    ]),
    ("javascript", "unicode_col"): ("RUNTIME_ERROR", [
        ('error', 'runtime', 'JS_UNDEFINED_PROPERTY', (1, 40, 47)),
    ]),
    # ------------------------------------------------------------------ typescript
    ("typescript", "hello_input"): ("SUCCEEDED", []),
    ("typescript", "runtime_error"): ("RUNTIME_ERROR", [
        ('error', 'runtime', 'JS_NOT_ITERABLE', (7, 17, 20)),
    ]),
    ("typescript", "syntax_error"): ("COMPILE_ERROR", [
        ('error', 'syntax', 'TS_SYNTAX_ERROR', (2, 23, 24)),
    ]),
    ("typescript", "type_error"): ("COMPILE_ERROR", [
        ('error', 'type', 'TS_TYPE_MISMATCH', (5, 7, 8)),
    ]),
    ("typescript", "unknown_name"): ("COMPILE_ERROR", [
        ('error', 'name', 'TS_CANNOT_FIND_NAME', (5, 13, 17)),
    ]),
    ("typescript", "wrong_args"): ("COMPILE_ERROR", [
        ('error', 'type', 'TS_WRONG_ARGUMENT_COUNT', (5, 13, 18)),
    ]),
    # ------------------------------------------------------------------ go
    ("go", "deadlock"): ("RUNTIME_ERROR", [
        ('error', 'runtime', 'GO_DEADLOCK', (7, 2, 9)),
    ]),
    ("go", "divide"): ("RUNTIME_ERROR", [
        ('error', 'runtime', 'GO_DIVIDE_BY_ZERO', (6, 2, 14)),
    ]),
    ("go", "hello_input"): ("SUCCEEDED", []),
    ("go", "index_panic"): ("RUNTIME_ERROR", [
        ('error', 'runtime', 'GO_INDEX_OUT_OF_RANGE', (8, 3, 24)),
    ]),
    ("go", "nil_map"): ("RUNTIME_ERROR", [
        ('error', 'runtime', 'GO_NIL_MAP', (5, 2, 19)),
    ]),
    ("go", "syntax_error"): ("COMPILE_ERROR", [
        ('error', 'syntax', 'GO_SYNTAX_ERROR', (10, 1, 2)),
    ]),
    ("go", "type_mismatch"): ("COMPILE_ERROR", [
        ('error', 'type', 'GO_TYPE_MISMATCH', (6, 18, 24)),
    ]),
    ("go", "undefined"): ("COMPILE_ERROR", [
        ('error', 'name', 'GO_UNDEFINED', (10, 14, 18)),
    ]),
    ("go", "unused"): ("COMPILE_ERROR", [
        ('error', 'build', 'GO_UNUSED_IMPORT', (5, 2, 6)),
        ('error', 'other', 'GO_UNUSED_VARIABLE', (9, 2, 3)),
    ]),
    # ------------------------------------------------------------------ rust
    ("rust", "borrow"): ("COMPILE_ERROR", [
        ('error', 'type', 'RS_USE_AFTER_MOVE', (4, 20, 25)),
    ]),
    ("rust", "hello_input"): ("SUCCEEDED", []),
    ("rust", "index_panic"): ("RUNTIME_ERROR", [
        ('error', 'runtime', 'RS_INDEX_OUT_OF_BOUNDS', (4, 25, 26)),
    ]),
    ("rust", "mismatch"): ("COMPILE_ERROR", [
        ('error', 'type', 'RS_TYPE_MISMATCH', (6, 18, 21)),
    ]),
    ("rust", "overflow"): ("RUNTIME_ERROR", [
        ('error', 'runtime', 'RS_INTEGER_OVERFLOW', (4, 9, 10)),
    ]),
    ("rust", "syntax_error"): ("COMPILE_ERROR", [
        ('error', 'syntax', 'RS_SYNTAX_ERROR', (2, 14, 15)),
    ]),
    ("rust", "undefined"): ("COMPILE_ERROR", [
        ('error', 'name', 'RS_NOT_FOUND', (6, 20, 24)),
    ]),
    ("rust", "unwrap_panic"): ("RUNTIME_ERROR", [
        ('error', 'runtime', 'RS_UNWRAP_FAILED', (3, 33, 39)),
    ]),
    ("rust", "warnings"): ("SUCCEEDED", [
        ('warning', 'other', 'RS_UNUSED', (2, 9, 15)),
        ('warning', 'other', 'RS_UNUSED', (3, 9, 18)),
    ]),
    # ------------------------------------------------------------------ csharp
    ("csharp", "class_program"): ("RUNTIME_ERROR", [
        ('error', 'runtime', 'CS_NULL_REFERENCE', (8, 9, 41)),
    ]),
    ("csharp", "divide_by_zero"): ("RUNTIME_ERROR", [
        ('error', 'runtime', 'CS_DIVIDE_BY_ZERO', (3, 1, 42)),
    ]),
    ("csharp", "hello_input"): ("SUCCEEDED", []),
    ("csharp", "index_error"): ("RUNTIME_ERROR", [
        ('error', 'runtime', 'CS_INDEX_OUT_OF_RANGE', (6, 5, 33)),
    ]),
    ("csharp", "missing_semicolon"): ("COMPILE_ERROR", [
        ('error', 'syntax', 'CS_SYNTAX_ERROR', (3, 10, 11)),
    ]),
    ("csharp", "type_error"): ("COMPILE_ERROR", [
        ('error', 'type', 'CS_TYPE_MISMATCH', (3, 13, 19)),
    ]),
    ("csharp", "undefined"): ("COMPILE_ERROR", [
        ('error', 'name', 'CS_NAME_NOT_FOUND', (8, 19, 23)),
    ]),
    ("csharp", "warnings"): ("RUNTIME_ERROR", [
        ('warning', 'type', 'CS_POSSIBLE_NULL', (5, 19, 23)),
        ('warning', 'other', 'CS_UNUSED', (3, 5, 11)),
        ('error', 'runtime', 'CS_NULL_REFERENCE', (5, 1, 32)),
    ]),
    # ------------------------------------------------------------------ kotlin
    ("kotlin", "divide"): ("RUNTIME_ERROR", [
        ('error', 'runtime', 'KT_ARITHMETIC_EXCEPTION', (1, 1, 40)),
    ]),
    ("kotlin", "hello_input"): ("SUCCEEDED", []),
    ("kotlin", "index_error"): ("RUNTIME_ERROR", [
        ('error', 'runtime', 'KT_INDEX_OUT_OF_BOUNDS', (3, 5, 22)),
    ]),
    ("kotlin", "null_safety"): ("COMPILE_ERROR", [
        ('error', 'type', 'KT_NULL_SAFETY', (3, 17, 18)),
    ]),
    ("kotlin", "syntax_error"): ("COMPILE_ERROR", [
        ('error', 'name', 'KT_UNRESOLVED_REFERENCE', (3, 5, 12)),
        ('error', 'name', 'KT_UNRESOLVED_REFERENCE', (3, 13, 18)),
        ('error', 'syntax', 'KT_SYNTAX_ERROR', (3, 19, 20)),
    ]),
    ("kotlin", "type_mismatch"): ("COMPILE_ERROR", [
        ('error', 'type', 'KT_TYPE_MISMATCH', (2, 20, 21)),
    ]),
    ("kotlin", "unresolved"): ("COMPILE_ERROR", [
        ('error', 'name', 'KT_UNRESOLVED_REFERENCE', (6, 13, 17)),
    ]),
    ("kotlin", "warnings"): ("SUCCEEDED", []),
    # ------------------------------------------------------------------ php
    ("php", "division_by_zero"): ("RUNTIME_ERROR", [
        ('error', 'runtime', 'PHP_DIVISION_BY_ZERO', (3, 5, 46)),
    ]),
    ("php", "hello_input"): ("SUCCEEDED", []),
    ("php", "syntax_error"): ("COMPILE_ERROR", [
        ('error', 'syntax', 'PHP_SYNTAX_ERROR', (5, 1, 2)),
    ]),
    ("php", "type_error"): ("RUNTIME_ERROR", [
        ('error', 'type', 'PHP_TYPE_ERROR', (2, 1, 31)),
    ]),
    ("php", "undefined_function"): ("RUNTIME_ERROR", [
        ('error', 'name', 'PHP_UNDEFINED_FUNCTION', (3, 1, 15)),
    ]),
    ("php", "undefined_variable"): ("SUCCEEDED", [
        ('warning', 'name', 'PHP_UNDEFINED_VARIABLE', (6, 1, 19)),
    ]),
    # ------------------------------------------------------------------ ruby
    ("ruby", "hello_input"): ("SUCCEEDED", []),
    ("ruby", "name_error"): ("RUNTIME_ERROR", [
        ('error', 'name', 'RB_NAME_ERROR', (3, 6, 10)),
    ]),
    ("ruby", "no_method"): ("RUNTIME_ERROR", [
        ('error', 'name', 'RB_NO_METHOD_ERROR', (3, 11, 18)),
    ]),
    ("ruby", "syntax_error"): ("COMPILE_ERROR", [
        ('warning', 'other', 'RB_MISMATCHED_INDENTATION', (6, 1, 4)),
        ('error', 'syntax', 'RB_SYNTAX_ERROR', (8, 15, 16)),
    ]),
    ("ruby", "warnings"): ("SUCCEEDED", [
        ('warning', 'other', 'RB_UNUSED_VARIABLE', (2, 3, 13)),
    ]),
    ("ruby", "zero_division"): ("RUNTIME_ERROR", [
        ('error', 'runtime', 'RB_ZERO_DIVISION', (2, 3, 25)),
    ]),
    # ------------------------------------------------------------------ lua
    ("lua", "call_nil"): ("RUNTIME_ERROR", [
        ('error', 'name', 'LUA_CALL_NIL', (4, 1, 22)),
    ]),
    ("lua", "error_call"): ("RUNTIME_ERROR", [
        ('error', 'runtime', 'LUA_RUNTIME_ERROR', (3, 5, 32)),
    ]),
    ("lua", "hello_input"): ("SUCCEEDED", []),
    ("lua", "nil_arithmetic"): ("RUNTIME_ERROR", [
        ('error', 'type', 'LUA_ARITHMETIC_ON_INVALID', (4, 3, 23)),
    ]),
    ("lua", "syntax_error"): ("COMPILE_ERROR", [
        ('error', 'syntax', 'LUA_SYNTAX_ERROR', (5, 1, 2)),
    ]),
    # ------------------------------------------------------------------ bash
    ("bash", "command_not_found"): ("SUCCEEDED", [
        ('error', 'name', 'SH_COMMAND_NOT_FOUND', (2, 1, 9)),
    ]),
    ("bash", "division_by_zero"): ("RUNTIME_ERROR", [
        ('error', 'runtime', 'SH_DIVISION_BY_ZERO', (3, 1, 35)),
    ]),
    ("bash", "exit_code"): ("RUNTIME_ERROR", [
        ('error', 'runtime', 'RUNTIME_NONZERO_EXIT', None),
    ]),
    ("bash", "hello_input"): ("SUCCEEDED", []),
    ("bash", "syntax_error"): ("COMPILE_ERROR", [
        ('error', 'syntax', 'SH_SYNTAX_ERROR', (4, 1, 3)),
    ]),
    # ------------------------------------------------------------------ sql
    ("sql", "constraint"): ("RUNTIME_ERROR", [
        ('error', 'runtime', 'SQL_CONSTRAINT_FAILED', (3, 1, 45)),
    ]),
    ("sql", "hello"): ("SUCCEEDED", []),
    ("sql", "no_such_column"): ("RUNTIME_ERROR", [
        ('error', 'name', 'SQL_NO_SUCH_COLUMN', (2, 14, 17)),
    ]),
    ("sql", "no_such_table"): ("RUNTIME_ERROR", [
        ('error', 'name', 'SQL_NO_SUCH_TABLE', (3, 1, 23)),
    ]),
    ("sql", "syntax_error"): ("RUNTIME_ERROR", [
        ('error', 'syntax', 'SQL_SYNTAX_ERROR', (3, 1, 6)),
    ]),
    # --------------------------------------------- Fortran (gfortran 13)
    ("fortran", "division_by_zero"): ("RUNTIME_ERROR", [
        ('error', 'runtime', 'RUNTIME_ARITHMETIC_ERROR', None),
    ]),
    ("fortran", "hello_input"): ("SUCCEEDED", []),
    ("fortran", "index_bounds"): ("RUNTIME_ERROR", [
        ('warning', 'other', 'FORTRAN_ARRAY_BOUNDS', (5, 6, 7)),
        ('error', 'runtime', 'FORTRAN_INDEX_OUT_OF_BOUNDS', (5, 5, 17)),
    ]),
    ("fortran", "syntax_error"): ("COMPILE_ERROR", [
        ('error', 'syntax', 'FORTRAN_SYNTAX_ERROR', (4, 9, 10)),
    ]),
    ("fortran", "undefined"): ("COMPILE_ERROR", [
        ('error', 'name', 'FORTRAN_UNDEFINED', (5, 15, 16)),
    ]),
    # ----------------------------------------- Assembly (NASM 2.16 + ld)
    ("asm", "hello_input"): ("SUCCEEDED", []),
    ("asm", "no_entry"): ("SUCCEEDED", [
        ('warning', 'build', 'ASM_NO_ENTRY_POINT', None),
    ]),
    ("asm", "segfault"): ("RUNTIME_ERROR", [
        ('error', 'memory', 'RUNTIME_SEGMENTATION_FAULT', None),
    ]),
    ("asm", "syntax_error"): ("COMPILE_ERROR", [
        ('error', 'syntax', 'ASM_SYNTAX_ERROR', (4, 5, 16)),
    ]),
    ("asm", "undefined"): ("COMPILE_ERROR", [
        ('error', 'name', 'ASM_UNDEFINED', (4, 5, 16)),
    ]),
    # ------------------------------------------ Pascal (Free Pascal 3.2)
    ("pascal", "division_by_zero"): ("RUNTIME_ERROR", [
        ('error', 'runtime', 'PAS_DIVISION_BY_ZERO', (6, 3, 20)),
    ]),
    ("pascal", "hello_input"): ("SUCCEEDED", []),
    ("pascal", "missing_semicolon"): ("COMPILE_ERROR", [
        ('error', 'syntax', 'PAS_MISSING_SEMICOLON', (6, 3, 10)),
    ]),
    ("pascal", "range_error"): ("RUNTIME_ERROR", [
        ('error', 'runtime', 'PAS_INDEX_OUT_OF_BOUNDS', (7, 5, 19)),
    ]),
    ("pascal", "undefined"): ("COMPILE_ERROR", [
        ('error', 'name', 'PAS_UNDEFINED', (6, 11, 15)),
    ]),
    # ---------------------------------------------- COBOL (GnuCOBOL 3.1)
    ("cobol", "hello_input"): ("SUCCEEDED", []),
    ("cobol", "subscript"): ("RUNTIME_ERROR", [
        ('error', 'runtime', 'COB_INDEX_OUT_OF_BOUNDS', (9, 12, 36)),
    ]),
    ("cobol", "syntax_error"): ("COMPILE_ERROR", [
        ('error', 'syntax', 'COB_SYNTAX_ERROR', (7, 12, 24)),
    ]),
    ("cobol", "undefined"): ("COMPILE_ERROR", [
        ('error', 'name', 'COB_UNDEFINED', (7, 12, 28)),
    ]),
    # ------------------------------------------- Lex (flex 2.6 + GCC 13)
    ("lex", "c_error"): ("COMPILE_ERROR", [
        ('error', 'name', 'LEX_UNDECLARED_IDENTIFIER', (6, 3, 4)),
    ]),
    ("lex", "flex_error"): ("COMPILE_ERROR", [
        ('error', 'syntax', 'LEX_SYNTAX_ERROR', (2, 1, 33)),
        ('error', 'syntax', 'LEX_SYNTAX_ERROR', (2, 1, 33)),
    ]),
    ("lex", "hello_input"): ("SUCCEEDED", []),
    # --------------------------------------- Verilog (Icarus Verilog 12)
    ("verilog", "hello"): ("SUCCEEDED", []),
    ("verilog", "syntax_error"): ("COMPILE_ERROR", [
        ('error', 'syntax', 'VERILOG_SYNTAX_ERROR', (5, 5, 35)),
    ]),
    ("verilog", "undefined"): ("COMPILE_ERROR", [
        ('error', 'name', 'VERILOG_UNDEFINED', (5, 5, 34)),
    ]),
    # ----------------------------------------------------------- Nim 1.6
    ("nim", "hello_input"): ("SUCCEEDED", []),
    ("nim", "index_error"): ("RUNTIME_ERROR", [
        ('error', 'runtime', 'NIM_INDEX_OUT_OF_BOUNDS', (3, 3, 12)),
    ]),
    ("nim", "type_mismatch"): ("COMPILE_ERROR", [
        ('error', 'type', 'NIM_TYPE_MISMATCH', (2, 9, 15)),
    ]),
    ("nim", "undeclared"): ("COMPILE_ERROR", [
        ('error', 'name', 'NIM_UNDECLARED_IDENTIFIER', (2, 6, 10)),
    ]),
    # -------------------------------------------------------- D (GDC 13)
    ("d", "hello_input"): ("SUCCEEDED", []),
    ("d", "index_error"): ("RUNTIME_ERROR", [
        ('error', 'runtime', 'D_INDEX_OUT_OF_BOUNDS', (7, 9, 23)),
    ]),
    ("d", "missing_semicolon"): ("COMPILE_ERROR", [
        ('error', 'syntax', 'D_MISSING_SEMICOLON', (6, 5, 12)),
    ]),
    ("d", "undefined"): ("COMPILE_ERROR", [
        ('error', 'name', 'D_UNDEFINED', (6, 13, 17)),
    ]),
    # ----------------------------------------------------- Ada (GNAT 13)
    ("ada", "hello_input"): ("SUCCEEDED", []),
    ("ada", "index_error"): ("RUNTIME_ERROR", [
        ('error', 'runtime', 'ADA_INDEX_OUT_OF_BOUNDS', (8, 4, 37)),
    ]),
    ("ada", "missing_semicolon"): ("COMPILE_ERROR", [
        ('error', 'syntax', 'ADA_MISSING_SEMICOLON', (4, 20, 21)),
    ]),
    ("ada", "undefined"): ("COMPILE_ERROR", [
        ('error', 'name', 'ADA_UNDEFINED', (6, 29, 33)),
    ]),
    # ------------------------------------------------------------- R 4.3
    ("r", "hello_input"): ("SUCCEEDED", []),
    ("r", "object_not_found"): ("RUNTIME_ERROR", [
        ('error', 'name', 'R_OBJECT_NOT_FOUND', (2, 7, 11)),
    ]),
    ("r", "stop_in_function"): ("RUNTIME_ERROR", [
        ('error', 'runtime', 'R_RUNTIME_ERROR', (5, 7, 16)),
    ]),
    ("r", "syntax_error"): ("COMPILE_ERROR", [
        ('error', 'syntax', 'R_SYNTAX_ERROR', (2, 9, 10)),
    ]),
    ("r", "warning"): ("SUCCEEDED", [
        ('warning', 'other', 'R_RUNTIME_WARNING', (1, 6, 10)),
    ]),
    # --------------------------------------------------------- Perl 5.38
    ("perl", "division_by_zero"): ("RUNTIME_ERROR", [
        ('error', 'runtime', 'PERL_DIVISION_BY_ZERO', (5, 1, 21)),
    ]),
    ("perl", "hello_input"): ("SUCCEEDED", []),
    ("perl", "missing_semicolon"): ("COMPILE_ERROR", [
        ('error', 'syntax', 'PERL_SYNTAX_ERROR', (5, 1, 14)),
    ]),
    ("perl", "strict_vars"): ("COMPILE_ERROR", [
        ('error', 'name', 'PERL_UNDECLARED_IDENTIFIER', (5, 1, 17)),
    ]),
    ("perl", "uninitialized"): ("SUCCEEDED", [
        ('warning', 'other', 'PERL_UNINITIALIZED_VARIABLE', (5, 1, 24)),
    ]),
    # --------------------------------------------- Prolog (SWI-Prolog 9)
    ("prolog", "hello_input"): ("SUCCEEDED", []),
    ("prolog", "syntax_error"): ("RUNTIME_ERROR", [
        ('error', 'syntax', 'PROLOG_SYNTAX_ERROR', (4, 11, 12)),
    ]),
    ("prolog", "undefined"): ("RUNTIME_ERROR", [
        ('error', 'name', 'PROLOG_UNDEFINED', (4, 5, 10)),
    ]),
    ("prolog", "zero_divisor"): ("RUNTIME_ERROR", [
        ('error', 'runtime', 'PROLOG_DIVISION_BY_ZERO', (1, 1, 25)),
    ]),
    # ----------------------------------------------------------- Tcl 8.6
    ("tcl", "divide_by_zero"): ("RUNTIME_ERROR", [
        ('error', 'runtime', 'TCL_DIVISION_BY_ZERO', (3, 1, 22)),
    ]),
    ("tcl", "hello_input"): ("SUCCEEDED", []),
    ("tcl", "missing_brace"): ("RUNTIME_ERROR", [
        ('error', 'syntax', 'TCL_SYNTAX_ERROR', (1, 1, 20)),
    ]),
    ("tcl", "undefined_variable"): ("RUNTIME_ERROR", [
        ('error', 'name', 'TCL_UNDEFINED_VARIABLE', (2, 1, 20)),
    ]),
    # ------------------------------------------------ Scheme (Guile 3.0)
    ("scheme", "divide_by_zero"): ("RUNTIME_ERROR", [
        ('error', 'runtime', 'SCM_DIVISION_BY_ZERO', None),
    ]),
    ("scheme", "hello_input"): ("SUCCEEDED", []),
    ("scheme", "missing_paren"): ("RUNTIME_ERROR", [
        ('error', 'syntax', 'SCM_UNEXPECTED_END_OF_INPUT', (4, 1, 2)),
    ]),
    ("scheme", "unbound"): ("RUNTIME_ERROR", [
        ('error', 'name', 'SCM_UNBOUND_VARIABLE', (2, 10, 14)),
    ]),
    # -------------------------------------------- Common Lisp (SBCL 2.2)
    ("lisp", "divide_by_zero"): ("RUNTIME_ERROR", [
        ('error', 'runtime', 'LISP_DIVISION_BY_ZERO', (2, 1, 29)),
    ]),
    ("lisp", "hello_input"): ("SUCCEEDED", []),
    ("lisp", "unbound"): ("RUNTIME_ERROR", [
        ('error', 'name', 'LISP_UNBOUND_VARIABLE', (2, 18, 19)),
    ]),
    ("lisp", "undefined_function"): ("RUNTIME_ERROR", [
        ('error', 'name', 'LISP_UNDEFINED_FUNCTION', (2, 19, 25)),
    ]),
    # ----------------------------------------------------- Erlang/OTP 25
    ("erlang", "badarith"): ("RUNTIME_ERROR", [
        ('error', 'runtime', 'ERL_ARITHMETIC_EXCEPTION', (6, 5, 35)),
    ]),
    ("erlang", "hello_input"): ("SUCCEEDED", []),
    ("erlang", "syntax_error"): ("COMPILE_ERROR", [
        ('error', 'syntax', 'ERL_SYNTAX_ERROR', (6, 5, 7)),
        ('error', 'name', 'ERL_UNDEFINED_FUNCTION', (2, 2, 8)),
    ]),
    ("erlang", "unbound"): ("COMPILE_ERROR", [
        ('error', 'name', 'ERL_UNBOUND_VARIABLE', (6, 24, 28)),
        ('warning', 'other', 'ERL_UNUSED', (5, 5, 10)),
    ]),
    # ------------------------------------------------------- Elixir 1.14
    ("elixir", "arithmetic"): ("RUNTIME_ERROR", [
        ('error', 'runtime', 'EX_ARITHMETIC_EXCEPTION', (2, 1, 20)),
    ]),
    ("elixir", "hello_input"): ("SUCCEEDED", []),
    ("elixir", "missing_end"): ("RUNTIME_ERROR", [
        ('error', 'syntax', 'EX_SYNTAX_ERROR', (5, 1, 2)),
    ]),
    ("elixir", "undefined"): ("RUNTIME_ERROR", [
        ('warning', 'name', 'EX_UNDEFINED_VARIABLE', (2, 1, 14)),
        ('error', 'name', 'EX_UNDEFINED_VARIABLE', (2, 1, 14)),
    ]),
}


@pytest.mark.parametrize("lang, case", sorted(EXPECTED))
def test_golden(lang, case):
    state, diagnostics = replay(lang, case)
    expected_state, expected = EXPECTED[(lang, case)]
    assert (state, summary(diagnostics)) == (expected_state, expected)


def test_every_fixture_has_an_expectation():
    cases = {(lang, p.name[: -len(".result.json")]) for lang in EXT
             for p in (FIXTURES / lang).glob("*.result.json")}
    assert cases == set(EXPECTED)


def test_no_output_is_left_unexplained():
    """Compile output must be fully understood by the grammars (no UNPARSED)."""
    for lang, case in EXPECTED:
        _, diagnostics = replay(lang, case)
        assert all(d.code != "UNPARSED" for d in diagnostics), (lang, case)


# ------------------------------------------------------------- message details

def by_code(diagnostics, code):
    return next(d for d in diagnostics if d.code == code)


def test_cpp_suggestions_and_include_hint_are_kept():
    _, ds = replay("cpp", "undeclared")
    assert by_code(ds, "CPP_UNDECLARED_IDENTIFIER").message == \
        "'totl' was not declared in this scope; did you mean 'total'?"
    _, ds = replay("cpp", "missing_include")
    hint = by_code(ds, "CPP_NOT_A_MEMBER").related_locations[0]
    assert hint.file == "main.cpp" and hint.range.start_line == 2
    assert "#include <vector>" in hint.message


def test_cpp_missing_semicolon_points_at_the_previous_line():
    _, ds = replay("cpp", "missing_semicolon")
    hint = by_code(ds, "CPP_MISSING_SEMICOLON").related_locations[0]
    assert (hint.range.start_line, hint.range.start_column) == (4, 13)


def test_cpp_template_error_is_moved_to_the_students_line_and_library_notes_are_capped():
    _, ds = replay("cpp", "template_deep")
    d = ds[0]
    assert d.file == "main.cpp" and d.range.start_line == 8
    related = [r.message for r in d.related_locations]
    assert related[0] == "Where the compiler noticed it (library code)"
    assert related[-1] == "19 more notes about library code: see the compiler log"
    assert len(related) == 4  # the library position, two notes, the summary


def test_cpp_uncaught_exception_message_includes_what():
    _, ds = replay("cpp", "uncaught")
    assert ds[0].message == ("Uncaught exception of type std::out_of_range: "
                             "vector::_M_range_check: __n (which is 5) >= this->size() (which is 3)")


def test_javac_details_are_folded_into_one_message():
    _, ds = replay("java", "cannot_find_symbol")
    assert ds[0].message == "cannot find symbol: variable totl (in class Main)"
    _, ds = replay("java", "wrong_args")
    assert ds[0].message == ("method add in class Main cannot be applied to given types; required: int,int; "
                             "found: int (actual and formal argument lists differ in length)")


def test_java_stack_trace_points_at_the_students_frames():
    _, ds = replay("java", "arithmetic")
    d = ds[0]
    assert d.message == "ArithmeticException: / by zero"
    assert [(r.range.start_line, r.message) for r in d.related_locations] == [(8, "divide() was called here")]
    _, ds = replay("java", "caused_by")
    assert ds[0].message == ('IllegalStateException: could not load settings '
                             '(caused by NumberFormatException: For input string: "x")')
    _, ds = replay("java", "npe")
    assert ds[0].message == 'NullPointerException: Cannot invoke "String.length()" because "name" is null'


def test_python_traceback_call_chain_becomes_related_locations():
    _, ds = replay("python", "type_error")
    related = [(r.range.start_line, r.message) for r in ds[0].related_locations]
    assert related == [(7, "fibonacci() was called here"), (10, "main() was called here")]


def test_python_did_you_mean_is_kept():
    _, ds = replay("python", "name_error")
    assert ds[0].message == "NameError: name 'totl' is not defined. Did you mean: 'total'?"


def test_runtime_warnings_are_not_repeated_by_the_run_step():
    _, ds = replay("python", "warnings")
    assert [d.source.value for d in ds] == ["compiler", "compiler"]


# ------------------------------------------------------------ newer languages

def test_node_errors_use_the_stack_frame_column_and_callers():
    _, ds = replay("javascript", "type_error")
    d = ds[0]
    assert d.message == "TypeError: Cannot read properties of undefined (reading 'reduce')"
    assert (d.range.start_line, d.range.start_column) == (2, 19)
    assert [(r.range.start_line, r.message) for r in d.related_locations] == [(7, "average() was called here")]


def test_typescript_runtime_errors_point_at_the_ts_source():
    _, ds = replay("typescript", "runtime_error")
    assert ds[0].file == "main.ts" and ds[0].range.start_line == 7


def test_vs_style_codes_are_kept_as_a_tag():
    _, ds = replay("typescript", "unknown_name")
    assert ds[0].message == "Cannot find name 'totl'. Did you mean 'total'? [TS2552]"
    _, ds = replay("csharp", "undefined")
    assert ds[0].message == "The name 'totl' does not exist in the current context [CS0103]"


def test_rustc_labels_become_message_details_and_related_locations():
    _, ds = replay("rust", "borrow")
    d = ds[0]
    assert d.message == "borrow of moved value: `names`: value borrowed here after move [E0382]"
    spans = [(r.range.start_line, r.range.start_column, r.message) for r in d.related_locations if r.range]
    assert spans[1] == (3, 17, "value moved here")
    assert any(r.message.startswith("help: consider cloning") for r in d.related_locations)


def test_rust_panic_location_and_message():
    _, ds = replay("rust", "index_panic")
    assert ds[0].message == "panicked: index out of bounds: the len is 3 but the index is 5"
    assert (ds[0].range.start_line, ds[0].range.start_column) == (4, 25)


def test_go_panic_uses_the_innermost_frame_in_main_go():
    _, ds = replay("go", "divide")
    d = ds[0]
    assert d.message == "panic: runtime error: integer divide by zero"
    assert d.range.start_line == 6
    assert [(r.range.start_line, r.message) for r in d.related_locations] == [(10, "divide() was called here")]


def test_dotnet_local_function_names_are_readable():
    _, ds = replay("csharp", "divide_by_zero")
    assert ds[0].related_locations[0].message == "Divide() was called here"


def test_ruby_error_highlight_gives_the_exact_range_and_suggestion():
    _, ds = replay("ruby", "name_error")
    d = ds[0]
    assert d.message.endswith("(did you mean 'total'?)")
    assert (d.range.start_line, d.range.start_column, d.range.end_column) == (3, 6, 10)


def test_php_fatal_error_keeps_the_call_site():
    _, ds = replay("php", "type_error")
    assert ds[0].related_locations[0].message == "square() was called here"
    assert ds[0].related_locations[0].range.start_line == 5


def test_sqlite_marker_becomes_a_range():
    _, ds = replay("sql", "no_such_column")
    assert ds[0].message == "Parse error: no such column: age"
    assert (ds[0].range.start_line, ds[0].range.start_column, ds[0].range.end_column) == (2, 14, 17)


def test_kotlin_caret_runs_give_the_token_range():
    _, ds = replay("kotlin", "unresolved")
    assert (ds[0].range.start_line, ds[0].range.start_column, ds[0].range.end_column) == (6, 13, 17)


# ------------------------------------------------ languages added with the native and extra images

def test_gfortran_two_location_warning_points_at_location_one():
    _, ds = replay("fortran", "index_bounds")
    d = by_code(ds, "FORTRAN_ARRAY_BOUNDS")
    assert (d.range.start_line, d.range.start_column) == (5, 6)
    assert d.related_locations[0].message == "Location (2) in the message"
    assert d.related_locations[0].range.start_line == 4


def test_fortran_runtime_error_skips_the_backtrace():
    _, ds = replay("fortran", "index_bounds")
    assert by_code(ds, "FORTRAN_INDEX_OUT_OF_BOUNDS").message == \
        "Index '4' of dimension 1 of array 'a' above upper bound of 3"


def test_pascal_runtime_error_is_named_and_placed():
    _, ds = replay("pascal", "range_error")
    assert ds[0].message == "Runtime error 201: Range check error"
    assert ds[0].range.start_line == 7


def test_gnat_follow_up_is_folded_into_the_error():
    _, ds = replay("ada", "undefined")
    assert ds[0].message == '"Totl" is undefined; possible misspelling of "Total"'


def test_iverilog_malformed_statement_is_one_error():
    _, ds = replay("verilog", "syntax_error")
    assert [d.message for d in ds] == ["syntax error: Malformed statement"]


def test_r_run_time_errors_are_placed_by_the_failing_call_or_name():
    _, ds = replay("r", "stop_in_function")
    assert ds[0].message == "age cannot be negative" and ds[0].range.start_line == 5
    _, ds = replay("r", "object_not_found")
    assert (ds[0].range.start_line, ds[0].range.start_column) == (2, 7)
    _, ds = replay("r", "warning")
    assert ds[0].message == "NaNs produced (warning in sqrt(-1))"


def test_prolog_unknown_procedure_points_at_the_call():
    _, ds = replay("prolog", "undefined")
    assert (ds[0].range.start_line, ds[0].range.start_column) == (4, 5)


def test_guile_and_sbcl_errors_are_placed_by_name_or_form():
    _, ds = replay("scheme", "unbound")
    assert (ds[0].range.start_line, ds[0].range.start_column) == (2, 10)
    _, ds = replay("scheme", "divide_by_zero")
    assert ds[0].message == "In procedure divide: Division by zero (numerical overflow)"
    _, ds = replay("lisp", "undefined_function")
    assert ds[0].range.start_line == 2
    _, ds = replay("lisp", "divide_by_zero")
    assert ds[0].range.start_line == 2


def test_elixir_warning_takes_its_location_from_the_next_line():
    _, ds = replay("elixir", "undefined")
    assert ds[0].severity.value == "warning" and ds[0].range.start_line == 2
