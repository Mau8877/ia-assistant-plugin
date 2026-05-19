import json
import time
import logging
import re
from openai import OpenAI
from ia_assistant.config import (
    get_openrouter_api_key,
    get_openrouter_app_title,
    get_openrouter_base_url,
)

from .prompt_alumno_builder import GENERAR_SYSTEM_PROMPT_EVALUADOR

logger = logging.getLogger(__name__)

# =====================================================================
# MOTORES DE IA
# =====================================================================
MODELO_PRINCIPAL = "openai/gpt-4o-mini"
MODELOS_FALLBACK = [
    "google/gemini-2.0-flash-lite-preview-02-05:free",
    "openai/gpt-oss-120b:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "google/gemma-4-31b-it:free",
]


def evaluar_respuestas_batch(lista_tareas):
    print("\n--- INICIANDO MOTOR DE EVALUACION (ALUMNO) ---")
    logger.info("Iniciando motor de evaluacion (Alumno)")

    api_key = get_openrouter_api_key()
    if not api_key:
        print(
            "ERROR CRITICO: No se encontro OPENROUTER_API_KEY ni en Django ni en .env"
        )
        logger.error("Evaluador: API Key no encontrada en ningun entorno.")
        return None

    client = OpenAI(
        base_url=get_openrouter_base_url(),
        api_key=api_key,
        default_headers={"X-Title": get_openrouter_app_title()},
    )

    prompt_tareas = "LISTA DE TAREAS A CALIFICAR:\n"
    for tarea in lista_tareas:
        tipo = tarea.get("tipo", "abierta").upper()
        prompt_tareas += f"\n[ID: {tarea.get('id')}] - TIPO: {tipo}\n"
        prompt_tareas += f"ENUNCIADO: {tarea.get('enunciado')}\n"
        prompt_tareas += (
            f"CRITERIOS DE EVALUACION (PUNTOS CLAVE): {tarea.get('puntos_clave')}\n"
        )
        prompt_tareas += f"RESPUESTA DEL ESTUDIANTE: {tarea.get('respuesta')}\n"
        prompt_tareas += "-----------------------------------\n"

    system_prompt = GENERAR_SYSTEM_PROMPT_EVALUADOR()
    cola_modelos = [MODELO_PRINCIPAL] + MODELOS_FALLBACK

    for index, modelo in enumerate(cola_modelos):
        es_premium = index == 0
        tipo_modelo = "PREMIUM" if es_premium else "RESPALDO GRATUITO"
        tiempo_espera = 180 if es_premium else 30

        try:
            print(
                f">>> Intentando evaluar con {tipo_modelo}: {modelo} (Timeout: {tiempo_espera}s)..."
            )
            logger.info(f"Intentando evaluar con modelo: {modelo}")

            completion = client.chat.completions.create(
                model=modelo,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt_tareas},
                ],
                response_format={"type": "json_object"},
                timeout=tiempo_espera,
            )

            if (
                not completion
                or not hasattr(completion, "choices")
                or not completion.choices
            ):
                print(f"XXX Fallo vacio con {modelo}")
                logger.warning(
                    f"Fallo de API con {modelo}: La respuesta vino vacia."
                )
                if es_premium:
                    print(
                        "ALERTA: El modelo Premium fallo. Cambiando a gratuitos..."
                    )
                time.sleep(1)
                continue

            respuesta_raw = completion.choices[0].message.content
            if not respuesta_raw:
                print(f"XXX Fallo logico (texto nulo) con {modelo}")
                logger.warning(
                    f"Fallo logico con {modelo}: El modelo respondio con texto vacio."
                )
                continue

            match = re.search(r"\{.*\}", respuesta_raw, re.DOTALL)
            if match:
                respuesta_ia = match.group(0)
            else:
                print(f"XXX No se encontro JSON en {modelo}")
                logger.warning(f"Modelo {modelo} no devolvio un JSON valido.")
                continue

            data_eval = json.loads(respuesta_ia)
            if "evaluaciones" not in data_eval:
                print(
                    f"XXX El JSON devuelto no contiene la llave 'evaluaciones' requerida ({modelo})"
                )
                continue

            print(f"EXITO TOTAL EN EVALUACION con {tipo_modelo} ({modelo})")
            logger.info(f"Exito evaluando con modelo: {modelo}")
            return data_eval

        except json.JSONDecodeError:
            print(f"XXX JSON Corrupto devuelto por {modelo}")
            logger.warning(
                f"Error de formato con {modelo}: El JSON devuelto estaba corrupto."
            )
            continue

        except Exception as e:
            error_msg = str(e)
            print(f"XXX Error de API/Red con {modelo}: {error_msg[:100]}")
            logger.warning(f"Fallo general/API con {modelo}: {error_msg}")

            if es_premium and (
                "402" in error_msg
                or "429" in error_msg
                or "insufficient_quota" in error_msg.lower()
            ):
                print(
                    "AVISO: Saldo agotado en OpenRouter. Activando protocolo de emergencia con IA gratuita..."
                )

            time.sleep(1)
            continue

    print(
        "CAIDA TOTAL DEL SISTEMA EVALUADOR: Ni el Premium ni los respaldos respondieron."
    )
    logger.critical("Todos los modelos fallaron en la evaluacion.")
    return None
