"""The one diagnostic format shared by local analysis, compilers and runtimes.

Every producer (Tree-sitter in the browser, compiler output, runtime
crashes and limits) emits this shape, so the editor, the persistence layer and
Saarthi's context bundle never see language-specific error text.

Positions:
  * lines are 1-based;
  * columns are 1-based and counted in UTF-16 code units, exactly like Monaco
    and LSP (adapters convert, e.g. GCC byte columns -> UTF-16);
  * `end` is exclusive: a one-character range at column 5 is 5..6.
"""

from __future__ import annotations

from enum import StrEnum
from typing import Literal

from pydantic import Field

from .common import ApiModel


class DiagnosticSource(StrEnum):
    LOCAL = "local"        # browser-side live syntax check (Tree-sitter)
    COMPILER = "compiler"  # compile step output, including the linker
    RUNTIME = "runtime"    # run step: crashes, limits, runtime error messages


class Severity(StrEnum):
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"


class Category(StrEnum):
    SYNTAX = "syntax"    # the text is not valid code (missing ';', unbalanced braces)
    NAME = "name"        # unknown or duplicate names, missing declarations/headers for names
    TYPE = "type"        # wrong types, wrong number of arguments, bad conversions
    BUILD = "build"      # missing headers, linker errors, toolchain failures
    RUNTIME = "runtime"  # program failed while running (abort, exit status, exceptions)
    TIMEOUT = "timeout"  # time limit reached
    MEMORY = "memory"    # invalid memory access or memory limit reached
    OTHER = "other"      # everything else (style/logic warnings, unparsed output)


class SourceRange(ApiModel):
    start_line: int = Field(ge=1)
    start_column: int = Field(ge=1)
    end_line: int = Field(ge=1)
    end_column: int = Field(ge=1)


class RelatedLocation(ApiModel):
    file: str | None = None
    range: SourceRange | None = None
    message: str


class RawOutputReference(ApiModel):
    """Where in the bounded raw output this diagnostic came from (1-based lines)."""

    step: str
    stream: Literal["stdout", "stderr"]
    start_line: int = Field(ge=1)
    end_line: int = Field(ge=1)


class Diagnostic(ApiModel):
    id: str
    source: DiagnosticSource
    severity: Severity
    category: Category
    code: str = Field(pattern=r"^[A-Z][A-Z0-9_]*$",
                      description="Stable identifier, e.g. C_UNDECLARED_IDENTIFIER, RUNTIME_SEGMENTATION_FAULT, UNPARSED")
    message: str
    file: str | None = Field(default=None, description="Workspace-relative path, e.g. main.c")
    range: SourceRange | None = None
    related_locations: list[RelatedLocation] = Field(default_factory=list)
    execution_id: str | None = None
    raw_output_reference: RawOutputReference | None = None
