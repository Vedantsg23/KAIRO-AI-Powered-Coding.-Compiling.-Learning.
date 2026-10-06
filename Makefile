# Convenience targets for Linux, macOS, WSL2 and GitHub Codespaces.
# On Windows without WSL2, use GitHub Codespaces (see docs/codespaces.md).
PY ?= python3.12
VENV := .venv
BIN := $(CURDIR)/$(VENV)/bin
TOKEN ?= dev-token

# <image directory>:<tag>. Every image is FROM ubuntu:24.04 (see infra/containers).
SANDBOX_IMAGES := gcc:13 java:21 python:3.12 node:18 go:1.23 rust:1.75 dotnet:8.0 kotlin:2.4 scripting:24.04 native:24.04 extra:24.04

.PHONY: help setup browsers images image-% image-swift runner api api-mock mock-ai web lint test test-docker test-languages e2e contracts check

help: ## list the targets
	@grep -E '^[a-z0-9%-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-15s %s\n", $$1, $$2}'

setup: ## create .venv and install backend + web dependencies
	$(PY) -m venv $(VENV)
	$(BIN)/pip install -e "services/api[dev]" -e "services/runner[dev]"
	cd apps/web && npm install

browsers: ## install the Chromium build the browser tests use (once)
	cd apps/web && npx playwright install --with-deps chromium

images: ## build every sandbox image student code runs in (about 11 GB, 20-40 min)
	@set -e; for spec in $(SANDBOX_IMAGES); do \
	  name=$${spec%%:*}; echo "==> compiler-copilot/sandbox-$$spec"; \
	  docker build -t compiler-copilot/sandbox-$$spec infra/containers/$$name; \
	done

image-swift: ## build the experimental Swift image (see docs/languages.md to enable it)
	docker build -t compiler-copilot/sandbox-swift:6.1 infra/containers/swift

image-%: ## build one sandbox image, e.g. `make image-gcc`, `make image-python`, `make image-scripting`
	@spec=$$(echo "$(SANDBOX_IMAGES)" | tr ' ' '\n' | grep "^$*:"); \
	test -n "$$spec" || { echo "unknown image '$*'; choose from: $(SANDBOX_IMAGES)"; exit 1; }; \
	docker build -t compiler-copilot/sandbox-$$spec infra/containers/$*

runner: ## start the sandbox runner on :8081 (needs Docker)
	cd services/runner && RUNNER_TOKEN=$(TOKEN) $(BIN)/python -m runner

api: ## start the API on :8000 (Saarthi uses ANTHROPIC_API_KEY etc. from the environment)
	cd services/api && CC_RUNNER_TOKEN=$(TOKEN) $(BIN)/uvicorn app.main:app --reload --port 8000

mock-ai: ## start the canned test AI on :8099 (NOT an AI; for tests and offline demos)
	$(BIN)/python scripts/mock_llm.py --port 8099

api-mock: ## start the API with Saarthi answering from `make mock-ai`
	cd services/api && CC_RUNNER_TOKEN=$(TOKEN) CC_AI_PROVIDER=openai CC_AI_BASE_URL=http://127.0.0.1:8099/v1 \
	  CC_AI_MODEL=mock-saarthi $(BIN)/uvicorn app.main:app --port 8000

web: ## start the web app on :5173 (proxies /api to :8000)
	cd apps/web && npm run dev

lint: ## ruff on the Python code, TypeScript type-check on the web app
	$(BIN)/ruff check services scripts tests
	cd apps/web && npm run typecheck

test: ## unit and API tests, web type-check and unit tests (Docker tests skip if unavailable)
	cd services/api && $(BIN)/pytest -q
	cd services/runner && $(BIN)/pytest -q
	cd apps/web && npm run typecheck && npm test

test-docker: ## sandbox containment tests against the real Docker daemon (needs `make image-gcc`)
	cd services/runner && $(BIN)/pytest -q -m docker

test-languages: ## every language end to end in real sandboxes (languages without an image are skipped)
	$(BIN)/pytest tests/integration -q

e2e: ## browser tests against the running stack (start runner + api-mock + mock-ai first)
	cd apps/web && npx playwright test

contracts: ## re-export OpenAPI/JSON Schemas and regenerate the TypeScript types
	cd services/api && $(BIN)/python -m app.export_contracts
	cd apps/web && npm run gen:api

check: lint test test-languages ## everything that does not need a browser
