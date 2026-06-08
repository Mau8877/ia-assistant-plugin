"""Validation helpers for IA Assistant unit payloads."""

import re
from copy import deepcopy

from .schema import UNIT_SCHEMA_VERSION, get_default_data

AI_AUTHORABLE_COMPONENT_TYPES = (
    "teoria",
    "quiz_multiple",
    "pregunta_abierta",
    "codigo",
)
MAX_GENERATED_COMPONENTS = 12
DEFAULT_GENERATED_TITLE = "Unidad generada con IA"

# NOTE: This module intentionally keeps generated-unit validation together for
# IA Docente fase 1. If student responses/calification are added later, split
# response-specific validation into a dedicated module.

IMAGE_MARKDOWN_RE = re.compile(r"!\[[^\]]*\]\([^)]+\)")
HTML_IMAGE_RE = re.compile(r"<img\b[^>]*>", re.IGNORECASE)
DANGEROUS_HTML_RE = re.compile(
    r"<(script|iframe|object|embed)\b[^>]*>.*?</\1>",
    re.IGNORECASE | re.DOTALL,
)
DANGEROUS_SELF_CLOSING_RE = re.compile(
    r"<(script|iframe|object|embed)\b[^>]*\/?>",
    re.IGNORECASE,
)


def is_valid_component_type(component_type):
    """Return whether a component type is allowed for teacher AI generation."""
    return component_type in AI_AUTHORABLE_COMPONENT_TYPES


def normalize_component_id(component_type, index):
    """Return a stable generated component id."""
    return "{}_{}".format(component_type, index)


def _slugify_identifier(value):
    text = _as_string(value).strip().lower()
    text = re.sub(r"[^a-zA-Z0-9_]+", "_", text)
    text = re.sub(r"_+", "_", text)
    return text.strip("_")


def _as_string(value):
    if value is None:
        return ""

    if isinstance(value, str):
        return value

    return str(value)


def _append_warning(warnings, message, details=None):
    warning = {"message": message}

    if details:
        warning["details"] = details

    warnings.append(warning)


def strip_disallowed_markdown(markdown_text):
    """Remove currently disallowed Markdown/HTML constructs from text."""
    text = _as_string(markdown_text)
    warnings = []

    if IMAGE_MARKDOWN_RE.search(text):
        text = IMAGE_MARKDOWN_RE.sub("[imagen removida]", text)
        _append_warning(warnings, "Se removieron imagenes Markdown.")

    if HTML_IMAGE_RE.search(text):
        text = HTML_IMAGE_RE.sub("[imagen removida]", text)
        _append_warning(warnings, "Se removieron etiquetas img.")

    if DANGEROUS_HTML_RE.search(text) or DANGEROUS_SELF_CLOSING_RE.search(
        text
    ):
        text = DANGEROUS_HTML_RE.sub("[contenido removido]", text)
        text = DANGEROUS_SELF_CLOSING_RE.sub("[contenido removido]", text)
        _append_warning(warnings, "Se removio HTML no permitido.")

    return text, warnings


def _normalize_safe_text(value, warnings):
    text, text_warnings = strip_disallowed_markdown(value)
    warnings.extend(text_warnings)
    return text


def _normalize_component_name(component, component_type, type_index, warnings):
    name = _normalize_safe_text(component.get("nombre"), warnings).strip()

    if name:
        return name

    return normalize_component_id(component_type, type_index)


def _normalize_component_base(
    component,
    component_type,
    type_index,
    warnings,
    forced_id=None,
):
    component_id = forced_id or normalize_component_id(
        component_type,
        type_index,
    )

    return {
        "id": component_id,
        "tipo": component_type,
        "nombre": _normalize_component_name(
            component,
            component_type,
            type_index,
            warnings,
        ),
    }


def _normalize_teoria_data(data, warnings):
    normalized = deepcopy(get_default_data("teoria") or {})

    normalized["titulo"] = _normalize_safe_text(data.get("titulo"), warnings)
    normalized["formato"] = "markdown"
    normalized["contenido"] = _normalize_safe_text(
        data.get("contenido"),
        warnings,
    )

    if data.get("formato") != "markdown":
        _append_warning(warnings, "Se normalizo teoria a formato markdown.")

    return normalized


def _normalize_quiz_option(option, index, warnings):
    current_option = option if isinstance(option, dict) else {}
    option_id = "opcion_{}".format(index)

    return {
        "id": option_id,
        "texto": _normalize_safe_text(current_option.get("texto"), warnings),
        "feedback": _normalize_safe_text(
            current_option.get("feedback"),
            warnings,
        ),
    }


def _register_option_id_aliases(option, normalized_id, option_id_map):
    raw_original_id = _as_string(option.get("id")).strip()
    sanitized_original_id = _slugify_identifier(raw_original_id)

    if raw_original_id:
        option_id_map[raw_original_id] = normalized_id

    if sanitized_original_id:
        option_id_map[sanitized_original_id] = normalized_id

    option_id_map[normalized_id] = normalized_id


def _normalize_quiz_data(data, warnings):
    raw_options = data.get("opciones")
    raw_correct_answers = data.get("respuestas_correctas")
    option_id_map = {}
    options = []
    correct_answers = []
    correct_answer_ids = set()
    duplicate_answers_removed = False

    if not isinstance(raw_options, list):
        raw_options = []
        _append_warning(warnings, "El quiz no tenia opciones validas.")

    if not raw_options:
        _append_warning(warnings, "El quiz no tiene opciones configuradas.")

    for index, option in enumerate(raw_options, start=1):
        current_option = option if isinstance(option, dict) else {}
        normalized_option = _normalize_quiz_option(
            current_option,
            index,
            warnings,
        )
        options.append(normalized_option)
        _register_option_id_aliases(
            current_option,
            normalized_option["id"],
            option_id_map,
        )

    if not isinstance(raw_correct_answers, list):
        raw_correct_answers = []
        _append_warning(
            warnings, "El quiz no tenia respuestas correctas validas."
        )

    for answer_id in raw_correct_answers:
        raw_answer_id = _as_string(answer_id).strip()
        sanitized_answer_id = _slugify_identifier(raw_answer_id)
        normalized_answer_id = option_id_map.get(
            raw_answer_id
        ) or option_id_map.get(sanitized_answer_id)

        if not normalized_answer_id:
            _append_warning(
                warnings,
                "Se removio una respuesta correcta inexistente.",
                {"respuesta": raw_answer_id},
            )
            continue

        if normalized_answer_id in correct_answer_ids:
            duplicate_answers_removed = True
            continue

        correct_answer_ids.add(normalized_answer_id)
        correct_answers.append(normalized_answer_id)

    if duplicate_answers_removed:
        _append_warning(
            warnings, "Se removieron respuestas correctas duplicadas."
        )

    if not correct_answers:
        _append_warning(
            warnings, "El quiz no tiene respuesta correcta configurada."
        )

    return {
        "pregunta": _normalize_safe_text(data.get("pregunta"), warnings),
        "opciones": options,
        "respuestas_correctas": correct_answers,
    }


def _normalize_pregunta_abierta_data(data, warnings):
    return {
        "enunciado": _normalize_safe_text(data.get("enunciado"), warnings),
        "rubrica": _normalize_safe_text(data.get("rubrica"), warnings),
    }


def _normalize_codigo_data(data, warnings):
    return {
        "enunciado": _normalize_safe_text(data.get("enunciado"), warnings),
        "lenguaje": _normalize_safe_text(data.get("lenguaje"), warnings),
        "codigo_base": _normalize_safe_text(data.get("codigo_base"), warnings),
        "instrucciones": _normalize_safe_text(
            data.get("instrucciones"),
            warnings,
        ),
    }


def _normalize_component(
    component,
    type_counts,
    warnings,
    forced_id=None,
    initial_type_counts=None,
):
    if not isinstance(component, dict):
        _append_warning(
            warnings, "Se descarto un componente que no era objeto."
        )
        return None

    component_type = _as_string(component.get("tipo")).strip()

    if not is_valid_component_type(component_type):
        _append_warning(
            warnings,
            "Se descarto un componente de tipo no permitido.",
            {"tipo": component_type},
        )
        return None

    if initial_type_counts:
        for current_type, current_count in initial_type_counts.items():
            type_counts[current_type] = max(
                type_counts.get(current_type, 0),
                current_count,
            )

    type_counts[component_type] = type_counts.get(component_type, 0) + 1
    type_index = type_counts[component_type]

    data = component.get("data")

    if not isinstance(data, dict):
        data = {}
        _append_warning(
            warnings,
            "Se completo data faltante de un componente.",
            {"tipo": component_type},
        )

    normalized = _normalize_component_base(
        component,
        component_type,
        type_index,
        warnings,
        forced_id=forced_id,
    )

    if component_type == "teoria":
        normalized["data"] = _normalize_teoria_data(data, warnings)
    elif component_type == "quiz_multiple":
        normalized["data"] = _normalize_quiz_data(data, warnings)
    elif component_type == "pregunta_abierta":
        normalized["data"] = _normalize_pregunta_abierta_data(data, warnings)
    elif component_type == "codigo":
        normalized["data"] = _normalize_codigo_data(data, warnings)

    return normalized


def normalize_unit_contract(unit):
    """Normalize a generated unit into the current authoring contract."""
    warnings = []

    if not isinstance(unit, dict):
        return {
            "ok": False,
            "error": "La unidad generada no tiene un formato valido.",
            "code": "invalid_unit",
            "details": [],
        }

    raw_components = unit.get("componentes")
    type_counts = {}
    normalized_components = []

    if not isinstance(raw_components, list):
        raw_components = []
        _append_warning(
            warnings, "La unidad generada no tenia lista de componentes."
        )

    if len(raw_components) > MAX_GENERATED_COMPONENTS:
        raw_components = raw_components[:MAX_GENERATED_COMPONENTS]
        _append_warning(
            warnings,
            "Se limito la unidad al maximo de componentes permitido.",
            {"maximo": MAX_GENERATED_COMPONENTS},
        )

    for component in raw_components:
        normalized_component = _normalize_component(
            component,
            type_counts,
            warnings,
        )

        if normalized_component:
            normalized_components.append(normalized_component)

    if not normalized_components:
        return {
            "ok": False,
            "error": "La unidad generada no contiene componentes validos.",
            "code": "invalid_unit",
            "details": warnings,
        }

    title = _normalize_safe_text(unit.get("titulo"), warnings).strip()

    if not title:
        title = DEFAULT_GENERATED_TITLE
        _append_warning(warnings, "Se asigno un titulo por defecto.")

    return {
        "ok": True,
        "unit": {
            "version": UNIT_SCHEMA_VERSION,
            "titulo": title,
            "componentes": normalized_components,
        },
        "warnings": warnings,
    }


def validate_unit_contract(unit):
    """Return whether a unit matches the minimal generated unit contract."""
    return validate_and_normalize_generated_unit(unit).get("ok") is True


def _build_type_counts_from_components(existing_components):
    type_counts = {}

    if not isinstance(existing_components, list):
        return type_counts

    for component in existing_components:
        if not isinstance(component, dict):
            continue

        component_type = _as_string(component.get("tipo")).strip()

        if not is_valid_component_type(component_type):
            continue

        component_count = type_counts.get(component_type, 0) + 1
        component_id = _as_string(component.get("id")).strip()
        id_match = re.match(
            r"^{}_(\d+)$".format(re.escape(component_type)),
            component_id,
        )

        if id_match:
            component_count = max(component_count, int(id_match.group(1)))

        type_counts[component_type] = component_count

    return type_counts


def validate_and_normalize_generated_component(
    component,
    expected_type=None,
    expected_id=None,
    existing_components=None,
):
    """Validate and normalize a single component generated by teacher AI."""
    warnings = []

    if not isinstance(component, dict):
        return {
            "ok": False,
            "error": "El componente generado no tiene un formato valido.",
            "code": "invalid_component",
            "details": [],
        }

    component_type = _as_string(component.get("tipo")).strip()

    if not is_valid_component_type(component_type):
        return {
            "ok": False,
            "error": "El componente generado usa un tipo no permitido.",
            "code": "invalid_component_type",
            "details": [{"tipo": component_type}],
        }

    if expected_type and component_type != expected_type:
        return {
            "ok": False,
            "error": "El componente generado no coincide con el tipo solicitado.",
            "code": "unexpected_component_type",
            "details": [
                {
                    "expected_type": expected_type,
                    "received_type": component_type,
                },
            ],
        }

    component_id = _as_string(component.get("id")).strip()

    if expected_id and component_id != expected_id:
        return {
            "ok": False,
            "error": "El componente generado no conserva el id esperado.",
            "code": "unexpected_component_id",
            "details": [
                {
                    "expected_id": expected_id,
                    "received_id": component_id,
                },
            ],
        }

    initial_type_counts = None

    if not expected_id:
        initial_type_counts = _build_type_counts_from_components(
            existing_components,
        )

    normalized_component = _normalize_component(
        component,
        {},
        warnings,
        forced_id=expected_id,
        initial_type_counts=initial_type_counts,
    )

    if not normalized_component:
        return {
            "ok": False,
            "error": "El componente generado no contiene datos validos.",
            "code": "invalid_component",
            "details": warnings,
        }

    return {
        "ok": True,
        "component": normalized_component,
        "warnings": warnings,
    }


def validate_and_normalize_generated_unit(raw_unit):
    """Validate and normalize a unit generated by teacher AI."""
    if not isinstance(raw_unit, dict):
        return {
            "ok": False,
            "error": "La unidad generada no tiene un formato valido.",
            "code": "invalid_unit",
            "details": [],
        }

    if raw_unit.get("version") != UNIT_SCHEMA_VERSION:
        return {
            "ok": False,
            "error": "La unidad generada usa una version no soportada.",
            "code": "invalid_version",
            "details": [],
        }

    return normalize_unit_contract(raw_unit)
