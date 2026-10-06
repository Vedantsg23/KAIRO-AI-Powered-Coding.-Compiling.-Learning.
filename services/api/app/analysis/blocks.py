"""Block parsers: multi-line tool output that one line pattern cannot describe.

A grammar rule with action = "block" names one of these parsers. The parser
receives every output line, the index of the line that matched, the rule's
match and a BlockContext, and returns the records it found plus the index of
the first line after the block. Parsers only read text: they never run code
or touch the file system.

  python-traceback  CPython tracebacks and syntax errors     parsers/python.py
  jvm-exception     uncaught Java and Kotlin exceptions        parsers/jvm.py
  cxx-terminate     uncaught C++ exceptions                    parsers/native.py
  rustc             rustc diagnostics (location on "-->")      parsers/native.py
  rust-panic        Rust panics                                parsers/native.py
  go-panic          Go panics and fatal errors                 parsers/native.py
  node-error        uncaught JavaScript/TypeScript errors      parsers/web.py
  php-fatal         PHP "Fatal error: Uncaught ..."            parsers/web.py
  ruby-exception    Ruby exceptions with error_highlight       parsers/scripting.py
  lua-error         Lua errors with stack traceback            parsers/scripting.py
  sqlite-error      SQLite parse/runtime errors                parsers/scripting.py
  dotnet-exception  uncaught .NET (C#) exceptions              parsers/dotnet.py
"""

from .parsers import BLOCK_PARSERS, BlockParser

__all__ = ["BLOCK_PARSERS", "BlockParser"]
