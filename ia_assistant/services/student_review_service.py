import json

from .openrouter_client import OpenRouterClient
from .ai_errors import (
    AIInvalidResponseError,
    AIValidationError,
    ai_error_to_payload,
)
from .prompts.student_review_prompt import (
    build_student_review_system_prompt,
    build_student_review_user_prompt,
)
from .unit_service import parse_ai_json_response

ALLOWED_TYPES = {"quiz_multiple", "pregunta_abierta", "codigo"}
MAX_OPENAI_ANSWER_CHARS = 4000
MAX_CODE_CHARS = 12000
MAX_PROMPT_COMPONENT_CHARS = 2000
MAX_CRITERIA_CHARS = 1500
MAX_CODE_BASE_CHARS = 4000
MAX_OPTION_TEXT_CHARS = 300
MAX_COMMENT_CHARS = 500
MAX_SUGGESTION_CHARS = 650
MAX_RECOMMENDATIONS = 4


def _truncate(value, limit):
    if value is None:
        return ""
    s = str(value)
    if len(s) <= limit:
        return s
    return s[:limit] + " [truncado]"


def _prepare_components_for_ai(unit, student_answers, component_ids=None):
    """Prepara una lista reducida de componentes auditables con respuestas del alumno."""
    components = unit.get("componentes") if isinstance(unit, dict) else []
    comp_map = {}
    for comp in components:
        if not isinstance(comp, dict):
            continue
        cid = comp.get("id")
        ctype = comp.get("tipo")
        if not cid or not ctype:
            continue
        if ctype not in ALLOWED_TYPES:
            continue
        comp_map[cid] = comp

    # decide which components to include
    if (
        component_ids
        and isinstance(component_ids, list)
        and len(component_ids) > 0
    ):
        selected_ids = [cid for cid in component_ids if cid in comp_map]
    else:
        selected_ids = list(comp_map.keys())

    prepared = []
    for cid in selected_ids:
        comp = comp_map.get(cid)
        data = comp.get("data") if isinstance(comp.get("data"), dict) else {}
        # get student's saved answer
        saved = (
            student_answers.get(cid)
            if isinstance(student_answers, dict)
            else None
        )
        value = None
        metadata = {}
        if isinstance(saved, dict):
            value = saved.get("value")
            metadata = saved.get("metadata") or {}

        # Include pedagogical fields from component data when available
        pregunta = _truncate(data.get("pregunta") or "", MAX_PROMPT_COMPONENT_CHARS)
        enunciado = _truncate(data.get("enunciado") or "", MAX_PROMPT_COMPONENT_CHARS)
        titulo = _truncate(data.get("titulo") or "", MAX_PROMPT_COMPONENT_CHARS)
        criterio = _truncate(data.get("criterio") or data.get("criterios") or "", MAX_CRITERIA_CHARS)
        criterios = _truncate(json.dumps(data.get("criterios")) if data.get("criterios") is not None else "", MAX_CRITERIA_CHARS)
        rubrica = _truncate(data.get("rubrica") or data.get("rúbrica") or "", MAX_CRITERIA_CHARS)
        instrucciones = _truncate(data.get("instrucciones") or "", MAX_CRITERIA_CHARS)
        lenguaje = data.get("lenguaje") or data.get("language") or ""
        codigo_base = _truncate(data.get("codigo_base") or data.get("codigoBase") or "", MAX_CODE_BASE_CHARS)
        respuesta_correcta = data.get("respuesta_correcta") or data.get("respuestas_correctas") or None

        # build basic item
        item = {
            "componentId": cid,
            "tipo": comp.get("tipo"),
            "nombre": comp.get("nombre") or "",
            "pregunta": pregunta,
            "enunciado": enunciado,
            "titulo": titulo,
            "criterio": criterio,
            "criterios": criterios,
            "rubrica": rubrica,
            "instrucciones": instrucciones,
            "lenguaje": lenguaje,
            "codigo_base": codigo_base,
            # opciones: include id and truncated text
            "opciones": [],
            "respuesta_correcta": respuesta_correcta,
            "respuesta": None,
        }

        if comp.get("tipo") == "quiz_multiple":
            opciones = (
                data.get("opciones") if isinstance(data.get("opciones"), list) else []
            )
            option_map = {}
            opciones_list = []
            for op in opciones:
                oid = str((op or {}).get("id") or "")
                texto = _truncate((op or {}).get("texto") or "", MAX_OPTION_TEXT_CHARS)
                option_map[oid] = texto
                opciones_list.append({"id": oid, "texto": texto})
            item["opciones"] = opciones_list

            if (
                value is None
                or value == ""
                or (isinstance(value, list) and len(value) == 0)
            ):
                item["respuesta"] = None
            elif isinstance(value, list):
                texts = [option_map.get(str(v)) or str(v) for v in value]
                item["respuesta"] = _truncate(
                    ", ".join(texts), MAX_OPENAI_ANSWER_CHARS
                )
            else:
                item["respuesta"] = _truncate(
                    option_map.get(str(value)) or str(value), MAX_OPENAI_ANSWER_CHARS
                )

            # include respuesta correcta if present
            if isinstance(respuesta_correcta, (list, tuple)):
                item["respuesta_correcta"] = [str(x) for x in respuesta_correcta]
            elif respuesta_correcta is not None:
                item["respuesta_correcta"] = str(respuesta_correcta)

        elif comp.get("tipo") == "codigo":
            code_text = _truncate(value or "", MAX_CODE_CHARS)
            lang = lenguaje or metadata.get("lenguaje") or metadata.get("language") or ""
            item["respuesta"] = {"lenguaje": lang, "codigo": code_text}
            item["codigo_base"] = codigo_base
        else:  # pregunta_abierta
            item["respuesta"] = _truncate(value or "", MAX_OPENAI_ANSWER_CHARS)

        prepared.append(item)

    return prepared, comp_map


def _validate_ai_payload(payload, comp_map):
    if not isinstance(payload, dict):
        raise AIInvalidResponseError(
            "La IA no devolvió un objeto JSON.", code="invalid_ai_json_object"
        )

    status = payload.get("status")
    if status != "ai":
        raise AIInvalidResponseError(
            "La IA no marcó la respuesta con status 'ai'.",
            code="invalid_status",
        )

    resumen = payload.get("resumen_general") or ""
    componentes = payload.get("componentes")
    if not isinstance(componentes, list):
        raise AIInvalidResponseError(
            "El campo 'componentes' debe ser una lista.",
            code="invalid_componentes",
        )

    validated_components = []
    for comp in componentes:
        if not isinstance(comp, dict):
            raise AIInvalidResponseError(
                "Cada componente debe ser un objeto.",
                code="invalid_component_item",
            )
        cid = comp.get("componentId")
        ctype = comp.get("tipo")
        estado = comp.get("estado")
        comentario = comp.get("comentario") or ""
        sugerencia = comp.get("sugerencia") or ""

        if cid not in comp_map:
            raise AIInvalidResponseError(
                f"componentId desconocido: {cid}", code="unknown_component"
            )
        if ctype not in ALLOWED_TYPES:
            raise AIInvalidResponseError(
                f"tipo invalido: {ctype}", code="invalid_type"
            )
        if estado not in ("bien", "parcial", "revisar", "sin_respuesta"):
            raise AIInvalidResponseError(
                f"estado invalido: {estado}", code="invalid_estado"
            )

        validated_components.append(
            {
                "componentId": cid,
                "tipo": ctype,
                "estado": estado,
                "comentario": _truncate(comentario, MAX_COMMENT_CHARS),
                "sugerencia": _truncate(sugerencia, MAX_SUGGESTION_CHARS),
            }
        )

    # ensure all auditables present: add missing with sin_respuesta
    for cid, comp in comp_map.items():
        if cid not in [c["componentId"] for c in validated_components]:
            validated_components.append(
                {
                    "componentId": cid,
                    "tipo": comp.get("tipo"),
                    "estado": "sin_respuesta",
                    "comentario": "",
                    "sugerencia": "",
                }
            )

    recomendaciones = payload.get("recomendaciones")
    if recomendaciones is None:
        recomendaciones = []
    if not isinstance(recomendaciones, list):
        raise AIInvalidResponseError(
            "El campo 'recomendaciones' debe ser una lista.",
            code="invalid_recomendaciones",
        )

    validated = {
        "status": "ai",
        "resumen_general": _truncate(resumen, MAX_COMMENT_CHARS),
        "componentes": validated_components,
        "recomendaciones": [str(r) for r in recomendaciones][:MAX_RECOMMENDATIONS],
    }

    return validated


def generate_student_review(
    unit, student_answers, component_ids=None, client=None
):
    try:
        components_for_ai, comp_map = _prepare_components_for_ai(
            unit, student_answers, component_ids=component_ids
        )

        system_prompt = build_student_review_system_prompt()
        user_prompt = build_student_review_user_prompt(unit, components_for_ai)

        current_client = client or OpenRouterClient()
        raw_response = current_client.generate_text(system_prompt, user_prompt)

        parsed = parse_ai_json_response(raw_response)

        validated = _validate_ai_payload(parsed, comp_map)

        return {"ok": True, "success": True, "review": validated}
    except Exception as error:
        return ai_error_to_payload(error)
