"""API configuration, read from environment variables prefixed CC_.

The AI provider keys are the exception: they are also read from the
provider's usual variable (ANTHROPIC_API_KEY, OPENAI_API_KEY). Keys live
only on the server; no response ever contains them.
"""

from pathlib import Path
from typing import Literal

from pydantic import AliasChoices, Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class ApiSettings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="CC_", extra="ignore", populate_by_name=True)

    # Where the runner listens and the shared secret it expects.
    runner_url: str = "http://127.0.0.1:8081"
    runner_token: str = ""

    # Bounded admission: at most `dispatch_workers` executions are handed to
    # the runner at once (keep equal to RUNNER_WORKERS) and at most
    # `max_queue` more may wait. Beyond that, POST /executions returns 503.
    dispatch_workers: int = 4
    max_queue: int = 20
    mean_service_time_s: float = 2.0  # used only for the Retry-After estimate

    # Request size caps (bytes of UTF-8).
    max_source_bytes: int = 64 * 1024
    max_stdin_bytes: int = 16 * 1024

    # Executions are kept in memory until the database milestone (Supabase); this bounds it.
    max_stored_executions: int = 500

    # Optional: serve the built web app (apps/web/dist) from this directory.
    web_dist: Path | None = None

    # ------------------------------------------------ Saarthi (AI assistant)
    # "anthropic" = Claude API; "openai" = any OpenAI-compatible endpoint
    # (OpenAI, or a local Ollama / LM Studio server via ai_base_url);
    # "none" = assistant switched off. Without a key (Anthropic/OpenAI) the
    # assistant reports that it is not configured; everything else works.
    ai_provider: Literal["anthropic", "openai", "none"] = "anthropic"
    ai_model: str = ""      # empty = the provider default (see app/ai/providers.py)
    ai_base_url: str = ""   # empty = the provider's public API
    ai_api_key: SecretStr | None = None  # CC_AI_API_KEY, or the provider's variable below
    anthropic_api_key: SecretStr | None = Field(
        default=None, validation_alias=AliasChoices("ANTHROPIC_API_KEY", "anthropic_api_key"))
    openai_api_key: SecretStr | None = Field(
        default=None, validation_alias=AliasChoices("OPENAI_API_KEY", "openai_api_key"))
    ai_timeout_s: float = 45.0
    ai_max_output_tokens: int = 1500
    # Requests only happen when a student presses a Saarthi button; these
    # limits protect the key's budget from a runaway client.
    ai_requests_per_minute: int = 6    # per client address
    ai_requests_per_day: int = 150     # per client address
    ai_daily_budget: int = 3000        # all clients together
    ai_max_concurrency: int = 4
    ai_cache_ttl_s: int = 1800
    # Inline code completions while typing (the "AI autocomplete" extension):
    # a separate, larger per-client budget so they never use up the questions.
    ai_complete_per_minute: int = 30
    ai_complete_per_day: int = 1500
    ai_complete_daily_budget: int = 20000
