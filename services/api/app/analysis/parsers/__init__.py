"""Named block parsers for multi-line tool output (see blocks.py)."""

from __future__ import annotations

import re
from collections.abc import Callable

from ..records import BlockContext, BlockResult
from .dotnet import dotnet_exception
from .jvm import jvm_exception
from .more import (
    elixir_error,
    elixir_warning,
    fortran_runtime,
    gfortran_multi,
    guile_error,
    nim_traceback,
    pascal_exception,
    pascal_runtime,
    prolog_message,
    r_error,
    sbcl_error,
    tcl_error,
)
from .native import cxx_terminate, go_panic, rust_panic, rustc
from .python import python_traceback
from .scripting import lua_error, ruby_exception, sqlite_error
from .web import node_error, php_fatal

BlockParser = Callable[[list[str], int, re.Match[str], BlockContext], BlockResult]

BLOCK_PARSERS: dict[str, BlockParser] = {
    "python-traceback": python_traceback,
    "jvm-exception": jvm_exception,
    "cxx-terminate": cxx_terminate,
    "rustc": rustc,
    "rust-panic": rust_panic,
    "go-panic": go_panic,
    "node-error": node_error,
    "php-fatal": php_fatal,
    "ruby-exception": ruby_exception,
    "lua-error": lua_error,
    "sqlite-error": sqlite_error,
    "dotnet-exception": dotnet_exception,
    "fortran-runtime": fortran_runtime,
    "pascal-runtime": pascal_runtime,
    "nim-traceback": nim_traceback,
    "prolog-message": prolog_message,
    "tcl-error": tcl_error,
    "guile-error": guile_error,
    "sbcl-error": sbcl_error,
    "elixir-error": elixir_error,
    "pascal-exception": pascal_exception,
    "r-error": r_error,
    "elixir-warning": elixir_warning,
    "gfortran-multi": gfortran_multi,
}
