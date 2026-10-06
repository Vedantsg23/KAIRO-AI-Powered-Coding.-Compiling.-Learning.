"""Export the public and internal contracts to packages/contracts/.

    python -m app.export_contracts      (from services/api)

The web app generates its TypeScript types from openapi.json, and
tests/test_contract.py fails when these files are out of date.
"""

from __future__ import annotations

import json
from pathlib import Path

from .schemas.diagnostics import Diagnostic
from .schemas.runner import JobEvent, JobResult, JobSpec

OUT_DIR = Path(__file__).resolve().parents[3] / "packages" / "contracts"


def contract_documents() -> dict[str, dict]:
    from .main import create_app

    return {
        "openapi.json": create_app().openapi(),
        "diagnostic.schema.json": Diagnostic.model_json_schema(by_alias=True),
        "runner-contract.schema.json": {
            "title": "API <-> runner wire contract (NDJSON job stream)",
            "JobSpec": JobSpec.model_json_schema(by_alias=True),
            "JobResult": JobResult.model_json_schema(by_alias=True),
            "JobEvent": JobEvent.model_json_schema(by_alias=True),
        },
    }


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for name, document in contract_documents().items():
        (OUT_DIR / name).write_text(json.dumps(document, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"wrote {OUT_DIR / name}")


if __name__ == "__main__":
    main()
