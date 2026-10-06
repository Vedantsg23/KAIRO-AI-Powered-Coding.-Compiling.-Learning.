"""The API's copy of the runner contract must match the runner's own copy,
and the exported contract files in packages/contracts must be current."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.export_contracts import contract_documents
from app.schemas import runner as api_copy

CONTRACTS = Path(__file__).resolve().parents[3] / "packages" / "contracts"


@pytest.mark.parametrize("model", ["JobSpec", "JobResult", "JobEvent"])
def test_runner_contract_copies_are_identical(model):
    runner_jobspec = pytest.importorskip("runner.jobspec", reason="runner package not installed")
    ours = getattr(api_copy, model).model_json_schema(by_alias=True)
    theirs = getattr(runner_jobspec, model).model_json_schema(by_alias=True)
    assert ours == theirs


def test_exported_contracts_are_up_to_date():
    """Run `python -m app.export_contracts` after changing a schema."""
    for name, document in contract_documents().items():
        path = CONTRACTS / name
        assert path.exists(), f"{path} missing: run python -m app.export_contracts"
        assert json.loads(path.read_text(encoding="utf-8")) == document, (
            f"{name} is stale: run `python -m app.export_contracts` from services/api")
