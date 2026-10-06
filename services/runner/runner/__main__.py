"""Start the runner: `python -m runner` (Linux or WSL2 with Docker access)."""

import logging

import uvicorn

from .config import RunnerSettings


def main() -> None:
    settings = RunnerSettings()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    uvicorn.run("runner.app:app", host=settings.host, port=settings.port, workers=1)


if __name__ == "__main__":
    main()
