"""Saarthi, the AI assistant of KAIRO.

Saarthi explains a run's errors, proposes a minimal fix as a patch the
student must approve, and checks a fix by comparing the run of the patched
code with the original run. It never executes code itself: every run goes
through the normal sandboxed execution path.

Everything the model sees is built on the server from the execution's exact
source snapshot, its normalized diagnostics and its output, so an answer is
always tied to the source hash it was produced for.
"""
