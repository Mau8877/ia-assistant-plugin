import os
import json
import time
import logging
import re
from openai import OpenAI
from django.conf import settings

logger = logging.getLogger(__name__)

OPENROUTER_KEY = getattr(settings, 'OPENROUTER_API_KEY', None)

# 👑 MODELO PRINCIPAL (Consume saldo de OpenRouter)
MODELO_PRINCIPAL = "openai/gpt-4o-mini"

# 🛡️ MODELOS DE RESPALDO GRATUITOS
MODELOS_FALLBACK = [
    "google/gemini-2.0-flash-lite-preview-02-05:free",
    "openai/gpt-oss-120b:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "google/gemma-4-31b-it:free"
]

def evaluar_respuestas_batch(lista_tareas):
    if not OPENROUTER_KEY:
        logger.error("IA Assistant: Error crítico - No se encontró OPENROUTER_API_KEY en el entorno.")
        return {
            "resultado": "error",
            "mensaje": "El servicio de IA no está configurado (Falta API Key en el servidor)."
        }

    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=OPENROUTER_KEY,
        default_headers={"X-Title": "IA Assistant"}
    )

    # 1. Construcción del prompt
    prompt_tareas = "LISTA DE TAREAS A CALIFICAR:\n"
    for tarea in lista_tareas:
        tipo = tarea.get('tipo', 'abierta').upper()
        prompt_tareas += f"\n[ID: {tarea.get('id')}] - TIPO: {tipo}\n"
        prompt_tareas += f"ENUNCIADO: {tarea.get('enunciado')}\n"
        prompt_tareas += f"CRITERIOS DE EVALUACIÓN (PUNTOS CLAVE): {tarea.get('puntos_clave')}\n"
        prompt_tareas += f"RESPUESTA DEL ESTUDIANTE: {tarea.get('respuesta')}\n"
        prompt_tareas += "-----------------------------------\n"

    # 2. System prompt
    system_prompt = """Eres el Sistema de Evaluación de la Universidad Autónoma Gabriel René Moreno (UAGRM). 
    Tu tarea es calificar tareas de Ingeniería de Sistemas con objetividad técnica.

    REGLAS DE EVALUACIÓN:
    1. Usa el campo 'CRITERIOS DE EVALUACIÓN' como guía estricta. Si el alumno no menciona los puntos clave, resta puntos proporcionalmente.
    2. Para CÓDIGO: Valida lógica, sintaxis y eficiencia. Si el código no resuelve el enunciado, la nota no debe superar 40.
    3. Para ABIERTAS: Valida coherencia y terminología técnica.
    4. Tu respuesta debe ser UNICAMENTE un objeto JSON válido.

    FORMATO DE RESPUESTA (ESTRICTO):
    {
      "evaluaciones": [
        {
          "id": "id_exacto_recibido", 
          "nota": 0-100, 
          "feedback": "Explicación técnica breve (máx 200 caracteres) de por qué esa nota."
        }
      ]
    }"""

    # 3. Cola: Premium primero, luego gratuitos
    cola_modelos = [MODELO_PRINCIPAL] + MODELOS_FALLBACK

    for index, modelo in enumerate(cola_modelos):
        es_premium = (index == 0)
        tipo_modelo = "PREMIUM 💎" if es_premium else "RESPALDO GRATUITO 🛟"
        tiempo_espera = 180 if es_premium else 60

        try:
            logger.info(f"Intentando evaluar con {tipo_modelo}: {modelo} (Timeout: {tiempo_espera}s)...")

            completion = client.chat.completions.create(
                model=modelo,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt_tareas}
                ],
                response_format={"type": "json_object"},
                timeout=tiempo_espera
            )

            # 🛡️ BLINDAJE 1: Respuesta vacía
            if not completion or not hasattr(completion, 'choices') or not completion.choices:
                logger.warning(f"Fallo vacío con {modelo}.")
                if es_premium:
                    logger.warning("El modelo Premium falló. ¿Se acabaron los créditos? Cambiando a gratuitos...")
                time.sleep(1)
                continue

            respuesta_raw = completion.choices[0].message.content

            # 🛡️ BLINDAJE 2: Texto nulo
            if not respuesta_raw:
                logger.warning(f"Fallo lógico con {modelo}: El modelo respondió con texto vacío.")
                continue

            match = re.search(r'\{.*\}', respuesta_raw, re.DOTALL)
            if not match:
                logger.warning(f"Modelo {modelo} no devolvió un JSON válido.")
                continue

            # 🛡️ BLINDAJE 3: JSON corrupto o sin estructura esperada
            data_eval = json.loads(match.group(0))
            if "evaluaciones" not in data_eval:
                logger.warning(f"El JSON de {modelo} no contiene la llave 'evaluaciones'.")
                continue

            logger.info(f"Éxito evaluando con {tipo_modelo} ({modelo}).")
            return data_eval

        except json.JSONDecodeError:
            logger.warning(f"JSON corrupto devuelto por {modelo}.")
            continue

        except Exception as e:
            error_msg = str(e)
            logger.warning(f"Fallo general con {modelo}: {error_msg}")

            if es_premium and ("402" in error_msg or "429" in error_msg or "insufficient_quota" in error_msg.lower()):
                logger.warning("Saldo agotado en OpenRouter. Activando modelos gratuitos...")

            time.sleep(1)
            continue

    logger.critical("Todos los modelos fallaron en la evaluación.")
    return None