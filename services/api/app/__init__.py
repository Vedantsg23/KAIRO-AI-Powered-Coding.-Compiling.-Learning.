"""KAIRO - API service.

This process never runs student code and never talks to Docker. It validates
requests, snapshots and hashes the source, builds a job from a trusted
language profile, hands it to the runner, and turns the raw result into
normalized diagnostics.
"""

__version__ = "0.1.0"
