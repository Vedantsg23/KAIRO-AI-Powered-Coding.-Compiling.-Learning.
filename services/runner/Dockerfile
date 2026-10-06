# Runner: the only service that talks to Docker. It receives jobs from the API
# on the internal network and starts sandbox containers on the host's daemon
# through the mounted socket (see compose.yaml and docs/threat-model.md).
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    RUNNER_HOST=0.0.0.0 \
    RUNNER_PORT=8081

WORKDIR /app
COPY pyproject.toml ./
COPY runner ./runner
RUN pip install --no-cache-dir .

EXPOSE 8081
CMD ["python", "-m", "runner"]
