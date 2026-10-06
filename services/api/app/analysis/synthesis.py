"""Diagnostics for failures that print nothing useful (A3, lines 7-11).

A C program that dereferences NULL dies with SIGSEGV and an empty stderr.
Without this step the platform would report "no errors" for a crash, the
worst possible outcome for a beginner. Limits (time, memory, output) are
reported the same way. These codes are language-neutral.
"""

from __future__ import annotations

from dataclasses import dataclass

from ..adapters.profile import Step
from ..schemas.diagnostics import Category, Severity
from ..schemas.runner import StepResult, Termination


@dataclass(frozen=True)
class Synthesized:
    severity: Severity
    category: Category
    code: str
    message: str


# signal number -> (name, category, code, plain-language message)
SIGNALS: dict[int, tuple[str, Category, str, str]] = {
    11: ("SIGSEGV", Category.MEMORY, "RUNTIME_SEGMENTATION_FAULT",
         ("Segmentation fault (SIGSEGV): the program read or wrote memory it does not own, "
          "for example through a NULL or out-of-range pointer, or recursion that never stops.")),
    7: ("SIGBUS", Category.MEMORY, "RUNTIME_BUS_ERROR",
        "Bus error (SIGBUS): the program accessed an invalid memory address."),
    8: ("SIGFPE", Category.RUNTIME, "RUNTIME_ARITHMETIC_ERROR",
        "Arithmetic error (SIGFPE): most often an integer division or remainder by zero."),
    6: ("SIGABRT", Category.RUNTIME, "RUNTIME_ABORTED",
        ("The program aborted itself (SIGABRT), e.g. abort() was called or the C library "
         "detected a fatal error.")),
    4: ("SIGILL", Category.RUNTIME, "RUNTIME_ILLEGAL_INSTRUCTION",
        "Illegal instruction (SIGILL): the processor was asked to execute invalid code."),
    5: ("SIGTRAP", Category.RUNTIME, "RUNTIME_TRAP",
        "The program stopped at a trap (SIGTRAP), usually a failed runtime check."),
    9: ("SIGKILL", Category.RUNTIME, "RUNTIME_KILLED",
        "The program was forcibly stopped (SIGKILL), usually because it hit a resource limit."),
    13: ("SIGPIPE", Category.RUNTIME, "RUNTIME_BROKEN_PIPE",
         "Broken pipe (SIGPIPE): the program wrote to an output that was already closed."),
    25: ("SIGXFSZ", Category.RUNTIME, "LIMIT_FILE_SIZE",
         "Stopped: the program tried to write a file larger than the sandbox allows."),
}


# Signals a program raises on itself after printing why: abort() after a
# failed assertion (SIGABRT), or a runtime check that traps (SIGILL, SIGTRAP).
SELF_STOPPING_SIGNALS = {6, 4, 5}


def signal_name(signal: int | None) -> str | None:
    if signal is None:
        return None
    return SIGNALS.get(signal, (f"signal {signal}",))[0]


def synthesize(step: Step, result: StepResult, has_explaining_error: bool,
               signal_messages: dict[str, str] | None = None) -> list[Synthesized]:
    """Diagnostics implied by how the step ended.

    `has_explaining_error` is True when the grammar already produced an error
    diagnostic for this step (e.g. "Assertion ... failed" before SIGABRT);
    then the generic crash/exit message is left out. `signal_messages` are the
    language profile's own wording for a signal (keyed by name, e.g. SIGILL).
    """
    lim = step.limits
    compile_step = step.kind == "compile"
    what = "Compilation" if compile_step else "The program"

    if result.termination is Termination.TIMEOUT:
        seconds = lim.wall_time_ms / 1000
        hint = "" if compile_step else (
            " Check for a loop that never ends, or for input the program is waiting for.")
        return [Synthesized(Severity.ERROR, Category.TIMEOUT, "LIMIT_TIMEOUT",
                            f"{what} was stopped after the {seconds:g} s time limit.{hint}")]

    if result.termination is Termination.MEMORY_LIMIT:
        return [Synthesized(Severity.ERROR, Category.MEMORY, "LIMIT_MEMORY",
                            f"{what} was stopped for using more than the {lim.memory_mb} MB memory limit.")]

    if result.termination is Termination.OUTPUT_LIMIT:
        return [Synthesized(Severity.ERROR, Category.RUNTIME, "LIMIT_OUTPUT",
                            f"{what} was stopped after printing more than {lim.output_kb} KB "
                            f"of output (a loop that prints forever?).")]

    if result.termination is Termination.SIGNALED and result.signal is not None:
        if has_explaining_error and result.signal in SELF_STOPPING_SIGNALS:
            return []  # e.g. the assertion message already explains the abort
        name, category, code, message = SIGNALS.get(
            result.signal,
            (f"signal {result.signal}", Category.RUNTIME, "RUNTIME_SIGNAL",
             f"The program was terminated by signal {result.signal}."))
        message = (signal_messages or {}).get(name, message)
        return [Synthesized(Severity.ERROR, category, code, message)]

    if result.termination is Termination.EXITED and result.exit_code not in (0, None):
        if has_explaining_error:
            return []
        if compile_step:
            return [Synthesized(Severity.ERROR, Category.BUILD, "TOOLCHAIN_FAILED",
                                f"The compiler failed (exit status {result.exit_code}) with output "
                                f"this platform could not interpret; see the raw output.")]
        return [Synthesized(Severity.ERROR, Category.RUNTIME, "RUNTIME_NONZERO_EXIT",
                            f"The program exited with status {result.exit_code}. "
                            f"A non-zero status usually means it reported an error.")]

    if result.termination is Termination.INTERNAL_ERROR:
        return [Synthesized(Severity.ERROR, Category.OTHER, "PLATFORM_ERROR",
                            "The sandbox could not report how this step ended.")]
    return []
