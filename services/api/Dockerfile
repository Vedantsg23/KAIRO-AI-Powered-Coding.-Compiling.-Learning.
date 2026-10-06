# API + built web app in one image. Build from the repository root:
#   docker build -f services/api/Dockerfile -t compiler-copilot/api .
# This container never gets the Docker socket and never runs student code.

# ---- 1. build the web app -------------------------------------------------
FROM node:22-slim AS web
WORKDIR /web
# .npmrc turns off package install scripts (only the grammars' .wasm files are used).
COPY apps/web/package.json apps/web/package-lock.json apps/web/.npmrc ./
RUN npm ci --no-audit --no-fund
COPY apps/web ./
# Optional: account sign-in through Supabase (docs/accounts.md). Both values
# are public by design (a project URL and its publishable key); leave them
# empty for guest-only sign-in.
ARG VITE_SUPABASE_URL=""
ARG VITE_SUPABASE_PUBLISHABLE_KEY=""
RUN npm run build

# ---- 2. API runtime --------------------------------------------------------
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    CC_WEB_DIST=/app/web

WORKDIR /app
COPY services/api/pyproject.toml ./
COPY services/api/app ./app
RUN pip install --no-cache-dir . \
 && useradd --uid 10002 --no-create-home --shell /usr/sbin/nologin api
COPY --from=web /web/dist ./web

USER api
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
