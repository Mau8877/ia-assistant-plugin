"""Constructores de prompts para generación con IA Docente."""

from ..schema import UNIT_SCHEMA_VERSION
from .ai_errors import AIValidationError


def build_teacher_unit_system_prompt():
    """Construye el prompt de sistema para generar unidades docentes."""
    return """Eres un asistente para docentes que genera unidades educativas interactivas.

Devuelve SOLO JSON válido. No uses markdown fences. No agregues texto antes ni después del JSON.

El JSON debe cumplir este contrato:
{
  "version": %d,
  "titulo": "string",
  "componentes": []
}

Tipos permitidos de componentes:
- teoria
- quiz_multiple
- pregunta_abierta
- codigo

Reglas generales:
- Usa ids únicos con formato tipo_numero, por ejemplo teoria_1.
- Cada componente debe tener id, tipo, nombre y data.
- No uses campos desconocidos.
- No incluyas imágenes.
- No incluyas HTML peligroso.
- No incluyas revision.

Teoría:
- data.titulo debe ser string.
- data.formato debe ser "markdown".
- data.contenido debe ser Markdown educativo claro.

Quiz múltiple:
- data.pregunta debe ser string.
- data.opciones debe ser una lista de opciones con id, texto y feedback.
- data.respuestas_correctas debe contener ids existentes de opciones correctas.

Pregunta abierta:
- data.enunciado debe ser string.
- data.rubrica debe ser una guía interna para el docente.

Código:
- data.enunciado debe ser string.
- data.lenguaje debe ser string.
- data.codigo_base debe ser una plantilla editable.
- data.instrucciones debe ser string.""" % UNIT_SCHEMA_VERSION


def _summarize_context(contexto):
    current_context = contexto or {}
    current_title = current_context.get("titulo_actual") or ""
    current_components = current_context.get("componentes_actuales") or []
    component_types = []

    if isinstance(current_components, list):
        for component in current_components:
            if isinstance(component, dict) and component.get("tipo"):
                component_types.append(str(component.get("tipo")))

    return {
        "titulo_actual": str(current_title),
        "cantidad_componentes": len(current_components)
        if isinstance(current_components, list) else 0,
        "tipos_existentes": component_types,
    }


def build_teacher_unit_user_prompt(prompt_docente, contexto=None):
    """Construye un prompt de usuario desde la indicación docente y el contexto."""
    clean_prompt = (prompt_docente or "").strip()

    if not clean_prompt:
        raise AIValidationError(
            "Escribe una indicación para generar la unidad.",
            code="empty_teacher_prompt",
        )

    context_summary = _summarize_context(contexto)
    lines = [
        "Indicación del docente:",
        clean_prompt,
        "",
        "Contexto actual de la unidad:",
        "- Título actual: %s" % (
            context_summary["titulo_actual"] or "sin título definido"
        ),
        "- Cantidad de componentes actuales: %d" % (
            context_summary["cantidad_componentes"]
        ),
        "- Tipos existentes: %s" % (
            ", ".join(context_summary["tipos_existentes"]) or "ninguno"
        ),
        "",
        "Genera una propuesta de unidad completa siguiendo exactamente el contrato indicado.",
    ]

    return "\n".join(lines)
