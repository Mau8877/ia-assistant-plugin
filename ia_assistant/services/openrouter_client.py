"""Cliente base de OpenRouter para IA Assistant.

Esta fase no realiza solicitudes externas.
"""

from ..config import (
    get_openrouter_api_key,
    get_openrouter_base_url,
    get_openrouter_model,
    get_openrouter_timeout,
)
from .ai_errors import AIConfigurationError, AIProviderError


class OpenRouterClient:
    """Fachada liviana de OpenRouter, deshabilitada hasta la próxima fase IA."""

    def __init__(self, api_key=None, model=None, base_url=None, timeout=None):
        self.api_key = api_key if api_key is not None else get_openrouter_api_key()
        self.model = model or get_openrouter_model()
        self.base_url = base_url or get_openrouter_base_url()
        self.timeout = timeout or get_openrouter_timeout()

    def is_configured(self):
        """Devuelve si el cliente tiene API key configurada."""
        return bool(self.api_key)

    def generate_text(self, system_prompt, user_prompt):
        """Genera texto con OpenRouter.

        Las llamadas externas están deshabilitadas en esta fase de arquitectura.
        """
        if not self.is_configured():
            raise AIConfigurationError(
                "No hay API key de IA configurada.",
                code="missing_openrouter_api_key",
            )

        raise AIProviderError(
            "El cliente OpenRouter todavía no está habilitado en esta fase.",
            code="openrouter_disabled",
        )
