"""Runner configuration, read from environment variables prefixed RUNNER_."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class RunnerSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="RUNNER_", extra="ignore")

    # Shared secret the API must send in the X-Runner-Token header.
    # Empty disables the check (local development only).
    token: str = ""
    host: str = "127.0.0.1"
    port: int = 8081

    # W = number of sandboxes that may run at the same time, and how many
    # more jobs may wait for a free slot before the runner answers 503.
    workers: int = 4
    queue_limit: int = 16

    # Only these images may ever be started. JSON list in the env var, e.g.
    # RUNNER_ALLOWED_IMAGES='["compiler-copilot/sandbox-gcc:13"]'
    allowed_images: list[str] = [
        "compiler-copilot/sandbox-gcc:13",           # C and C++
        "compiler-copilot/sandbox-java:21",          # Java
        "compiler-copilot/sandbox-python:3.12",      # Python
        "compiler-copilot/sandbox-node:18",          # JavaScript and TypeScript
        "compiler-copilot/sandbox-go:1.23",          # Go
        "compiler-copilot/sandbox-rust:1.75",        # Rust
        "compiler-copilot/sandbox-dotnet:8.0",       # C#
        "compiler-copilot/sandbox-kotlin:2.4",       # Kotlin
        "compiler-copilot/sandbox-scripting:24.04",  # PHP, Ruby, Lua, Bash, SQL (SQLite)
        "compiler-copilot/sandbox-native:24.04",     # Fortran, Assembly, Pascal, COBOL, Lex, Verilog, Nim, D, Ada
        "compiler-copilot/sandbox-extra:24.04",      # R, Perl, Prolog, Tcl, Scheme, Common Lisp, Erlang, Elixir
    ]
    # Swift is experimental: build infra/containers/swift and add
    # "compiler-copilot/sandbox-swift:6.1" here (or in the env var) to enable it.

    # Must match the unprivileged user created in infra/containers/*/Dockerfile.
    sandbox_uid: int = 10001
    sandbox_gid: int = 10001
    cpus_per_step: float = 1.0

    # Ceilings. A job may request less than these, never more.
    max_steps: int = 4
    max_wall_time_ms: int = 60_000  # the Kotlin compiler needs up to 45 s on a busy machine
    max_cpu_time_s: int = 60
    max_memory_mb: int = 1024
    max_pids: int = 256
    max_output_kb: int = 1024
    max_tmp_mb: int = 256
    max_file_size_mb: int = 128
    max_files: int = 16
    max_source_bytes: int = 256 * 1024
    max_stdin_bytes: int = 64 * 1024

    # Containers/volumes labelled as ours and older than this are removed by
    # the reaper (they can only exist if the runner crashed mid-job).
    orphan_max_age_s: int = 300
    docker_api_timeout_s: int = 60
