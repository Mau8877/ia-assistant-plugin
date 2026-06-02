"""Configuration helpers for IA Assistant."""

import os


OPENROUTER_API_KEY_ENV = "OPENROUTER_API_KEY"
OPENROUTER_MODEL_ENV = "OPENROUTER_MODEL"
OPENROUTER_BASE_URL_ENV = "OPENROUTER_BASE_URL"
OPENROUTER_TIMEOUT_ENV = "OPENROUTER_TIMEOUT"

DEFAULT_OPENROUTER_MODEL = "openrouter/auto"
DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
DEFAULT_OPENROUTER_TIMEOUT = 30


def get_openrouter_api_key():
    """Return the configured OpenRouter API key, if any."""
    return os.environ.get(OPENROUTER_API_KEY_ENV, "").strip()


def get_openrouter_model():
    """Return the configured OpenRouter model name."""
    return os.environ.get(
        OPENROUTER_MODEL_ENV,
        DEFAULT_OPENROUTER_MODEL,
    ).strip() or DEFAULT_OPENROUTER_MODEL


def get_openrouter_base_url():
    """Return the configured OpenRouter base URL."""
    return os.environ.get(
        OPENROUTER_BASE_URL_ENV,
        DEFAULT_OPENROUTER_BASE_URL,
    ).strip() or DEFAULT_OPENROUTER_BASE_URL


def get_openrouter_timeout():
    """Return the configured OpenRouter timeout in seconds."""
    raw_timeout = os.environ.get(OPENROUTER_TIMEOUT_ENV, "")

    try:
        timeout = int(raw_timeout)
    except (TypeError, ValueError):
        return DEFAULT_OPENROUTER_TIMEOUT

    if timeout <= 0:
        return DEFAULT_OPENROUTER_TIMEOUT

    return timeout


def is_ai_configured():
    """Return whether the backend has enough configuration for AI calls."""
    return bool(get_openrouter_api_key())
