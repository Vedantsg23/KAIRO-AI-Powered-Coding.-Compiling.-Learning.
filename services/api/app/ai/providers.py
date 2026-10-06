"""Language-model providers for Saarthi.

Two wire formats cover the useful options:

  anthropic  the Claude Messages API (POST /v1/messages). Structured answers
             use a tool the model is required to call, so they arrive as a
             JSON object that matches the tool's input schema.
  openai     any OpenAI-compatible chat-completions server: OpenAI itself, or
             a model running on the school's own machine with Ollama or LM
             Studio (set CC_AI_BASE_URL, e.g. http://localhost:11434/v1).
             Structured answers use JSON mode plus the schema in the prompt.

Keys are read from the server's environment only and sent only to the
configured provider. Errors never echo the key or the provider's raw body.
"""

from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from typing import Protocol

import httpx

from ..config import ApiSettings

log = logging.getLogger("saarthi")

ANTHROPIC_URL = "https://api.anthropic.com"
ANTHROPIC_VERSION = "2023-06-01"
OPENAI_URL = "https://api.openai.com/v1"
# Claude Haiku 4.5: the fastest and most cost-efficient current Claude model
# (Claude API docs, models overview, September 2026). For deeper answers set
# CC_AI_MODEL=claude-sonnet-5.
DEFAULT_ANTHROPIC_MODEL = "claude-haiku-4-5-20251001"


class ProviderError(Exception):
    """The provider could not answer. `public` is safe to show to students."""

    def __init__(self, public: str, retry_after_s: int | None = None) -> None:
        super().__init__(public)
        self.public = public
        self.retry_after_s = retry_after_s


@dataclass(frozen=True)
class ToolSpec:
    """A structured answer: the JSON object the model must return."""

    name: str
    description: str
    input_schema: dict


@dataclass
class Completion:
    text: str | None = None   # free-form answer
    data: dict | None = None  # structured answer (tool input / JSON object)
    input_tokens: int | None = None
    output_tokens: int | None = None


class Provider(Protocol):
    name: str
    model: str

    async def complete(self, *, system: str, messages: list[dict], max_tokens: int,
                       tool: ToolSpec | None = None) -> Completion: ...


@dataclass(frozen=True)
class ProviderChoice:
    provider: Provider | None
    reason: str | None  # why there is no provider (shown on the status endpoint)


def choose_provider(settings: ApiSettings, http: httpx.AsyncClient) -> ProviderChoice:
    """The configured provider, or the reason Saarthi is switched off."""
    if settings.ai_provider == "none":
        return ProviderChoice(None, "Saarthi is switched off on this server (CC_AI_PROVIDER=none).")
    if settings.ai_provider == "anthropic":
        key = settings.ai_api_key or settings.anthropic_api_key
        if key is None or not key.get_secret_value().strip():
            return ProviderChoice(None, "No Claude API key is set on the server (ANTHROPIC_API_KEY).")
        return ProviderChoice(AnthropicProvider(http, key.get_secret_value().strip(),
                                                settings.ai_model or DEFAULT_ANTHROPIC_MODEL,
                                                settings.ai_base_url or ANTHROPIC_URL), None)
    # OpenAI-compatible
    key = settings.ai_api_key or settings.openai_api_key
    key_value = key.get_secret_value().strip() if key is not None else ""
    base_url = settings.ai_base_url or OPENAI_URL
    if not settings.ai_model:
        return ProviderChoice(None, "Set CC_AI_MODEL to the model name your OpenAI-compatible server offers.")
    if base_url == OPENAI_URL and not key_value:
        return ProviderChoice(None, "No OpenAI API key is set on the server (OPENAI_API_KEY).")
    return ProviderChoice(OpenAICompatibleProvider(http, key_value, settings.ai_model, base_url), None)


def _raise_for_status(response: httpx.Response, provider: str) -> None:
    status = response.status_code
    if status < 400:
        return
    retry = response.headers.get("retry-after")
    retry_s = int(float(retry)) if retry and re.fullmatch(r"\d+(?:\.\d+)?", retry) else None
    log.warning("%s answered HTTP %s", provider, status)
    if status in (401, 403):
        raise ProviderError("The AI provider rejected the server's API key. Ask your administrator to check it.")
    if status == 404:
        raise ProviderError("The AI provider does not know the configured model (check CC_AI_MODEL).")
    if status == 429:
        raise ProviderError("The AI provider is rate-limiting this server. Try again in a minute.", retry_s or 30)
    if status in (500, 502, 503, 504, 529):
        raise ProviderError("The AI provider is overloaded or unavailable. Try again shortly.", retry_s or 15)
    raise ProviderError(f"The AI provider refused the request (HTTP {status}).")


class AnthropicProvider:
    name = "anthropic"

    def __init__(self, http: httpx.AsyncClient, key: str, model: str, base_url: str = ANTHROPIC_URL) -> None:
        self._http = http
        self._key = key
        self.model = model
        self._url = base_url.rstrip("/") + "/v1/messages"

    async def complete(self, *, system: str, messages: list[dict], max_tokens: int,
                       tool: ToolSpec | None = None) -> Completion:
        # No temperature: current Claude models only accept the default.
        body: dict = {"model": self.model, "max_tokens": max_tokens, "system": system, "messages": messages}
        if tool is not None:
            body["tools"] = [{"name": tool.name, "description": tool.description,
                              "input_schema": tool.input_schema}]
            body["tool_choice"] = {"type": "tool", "name": tool.name}
        headers = {"x-api-key": self._key, "anthropic-version": ANTHROPIC_VERSION,
                   "content-type": "application/json"}
        try:
            response = await self._http.post(self._url, json=body, headers=headers)
        except httpx.TimeoutException as exc:
            raise ProviderError("The AI provider took too long to answer. Try again.") from exc
        except httpx.HTTPError as exc:
            raise ProviderError("The server could not reach the AI provider.") from exc
        _raise_for_status(response, self.name)
        try:
            payload = response.json()
            blocks = payload.get("content") or []
            usage = payload.get("usage") or {}
        except (ValueError, AttributeError) as exc:
            raise ProviderError("The AI provider sent an answer that could not be read.") from exc
        result = Completion(input_tokens=usage.get("input_tokens"), output_tokens=usage.get("output_tokens"))
        if tool is not None:
            for block in blocks:
                if isinstance(block, dict) and block.get("type") == "tool_use" and block.get("name") == tool.name:
                    result.data = block.get("input") if isinstance(block.get("input"), dict) else None
                    break
            if result.data is None:
                raise ProviderError("The AI provider did not return a structured answer. Try again.")
        else:
            result.text = "".join(b.get("text", "") for b in blocks
                                  if isinstance(b, dict) and b.get("type") == "text").strip()
        return result


_FENCE = re.compile(r"^```(?:json)?\s*|\s*```$")


class OpenAICompatibleProvider:
    name = "openai"

    def __init__(self, http: httpx.AsyncClient, key: str, model: str, base_url: str = OPENAI_URL) -> None:
        self._http = http
        self._key = key
        self.model = model
        self._url = base_url.rstrip("/") + "/chat/completions"

    async def complete(self, *, system: str, messages: list[dict], max_tokens: int,
                       tool: ToolSpec | None = None) -> Completion:
        if tool is not None:
            system = (f"{system}\n\nReply with only one JSON object (no prose, no code fences) that "
                      f"matches this JSON Schema:\n{json.dumps(tool.input_schema)}")
        body: dict = {"model": self.model, "max_tokens": max_tokens,
                      "messages": [{"role": "system", "content": system}, *messages]}
        if tool is not None:
            body["response_format"] = {"type": "json_object"}
        headers = {"content-type": "application/json"}
        if self._key:
            headers["authorization"] = f"Bearer {self._key}"
        try:
            response = await self._http.post(self._url, json=body, headers=headers)
        except httpx.TimeoutException as exc:
            raise ProviderError("The AI server took too long to answer. Try again.") from exc
        except httpx.HTTPError as exc:
            raise ProviderError("The server could not reach the AI server.") from exc
        _raise_for_status(response, self.name)
        try:
            payload = response.json()
            text = payload["choices"][0]["message"]["content"] or ""
            usage = payload.get("usage") or {}
        except (ValueError, KeyError, IndexError, TypeError) as exc:
            raise ProviderError("The AI server sent an answer that could not be read.") from exc
        result = Completion(input_tokens=usage.get("prompt_tokens"), output_tokens=usage.get("completion_tokens"))
        if tool is None:
            result.text = text.strip()
            return result
        try:
            data = json.loads(_FENCE.sub("", text.strip()))
        except ValueError as exc:
            raise ProviderError("The AI server did not return valid JSON. Try again.") from exc
        if not isinstance(data, dict):
            raise ProviderError("The AI server did not return a JSON object. Try again.")
        result.data = data
        return result
