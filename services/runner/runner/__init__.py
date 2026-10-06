"""Sandboxed execution worker.

The runner is the only component that talks to Docker. It receives a fully
specified job from the API (image, files, argument arrays, limits), re-checks
it against its own policy, runs every step in a fresh, locked-down container
and returns the raw results. It knows nothing about programming languages or
diagnostics; that is the API's job.
"""

__version__ = "0.1.0"
