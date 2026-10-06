# Contracts

Generated from the Python models; do not edit by hand.

| File | What it describes | Source of truth |
|---|---|---|
| `openapi.json` | Public REST API (`/api/v1/...`) used by the web app | `services/api/app/schemas/` |
| `diagnostic.schema.json` | The single normalized diagnostic format | `services/api/app/schemas/diagnostics.py` |
| `runner-contract.schema.json` | Internal API to runner job contract (NDJSON stream) | `services/runner/runner/jobspec.py` (copied in `services/api/app/schemas/runner.py`) |

Regenerate after changing a schema (or run `make contracts`):

```bash
cd services/api && python -m app.export_contracts   # writes these files
cd apps/web && npm run gen:api                       # regenerates src/api/schema.ts
```

`services/api/tests/test_contract.py` fails when these files are stale or
when the two copies of the runner contract disagree.
