import os

from dotenv import load_dotenv


load_dotenv(verbose=False)


def _get_setting(name, default=None):
    try:
        from django.conf import settings

        return getattr(settings, name, default)
    except Exception:
        return default


def get_openrouter_api_key():
    api_key = _get_setting("OPENROUTER_API_KEY")
    if api_key:
        return api_key
    return os.getenv("OPENROUTER_API_KEY")


def get_openrouter_base_url():
    base_url = _get_setting("OPENROUTER_BASE_URL")
    if base_url:
        return base_url
    return os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")


def get_openrouter_app_title():
    app_title = _get_setting("OPENROUTER_APP_TITLE")
    if app_title:
        return app_title
    return os.getenv("OPENROUTER_APP_TITLE", "IA Assistant Plugin")
