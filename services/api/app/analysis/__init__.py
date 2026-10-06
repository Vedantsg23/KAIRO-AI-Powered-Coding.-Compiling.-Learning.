"""Deterministic analysis of toolchain output (no AI anywhere in this package).

grammar.py    A3  ordered grammar matching: raw output lines -> records
classify.py   A4  rule-based classification into the shared fault taxonomy
synthesis.py      diagnostics for crashes and limits that print nothing
text.py           column conversion and token ranges against the source snapshot
pipeline.py       runs the above for every step of an execution
"""
