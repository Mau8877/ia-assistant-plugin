import json
import os
import time
import logging
import re
from openai import OpenAI
#from dotenv import load_dotenv
#from django.conf import settings

#load_dotenv()
logger = logging.getLogger(__name__)

OPENROUTER_KEY = "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"

# Mantenemos la lista para failover - Priorizando estabilidad
MODELOS_FALLBACK = [
    "qwen/qwen3.6-plus:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "openai/gpt-oss-120b:free"
]

def evaluar_respuestas_batch(lista_tareas):
    """
    Evalúa un lote de respuestas (abiertas y código) usando IA.
    Sincronizado con los IDs descriptivos y puntos clave del docente.
    """
    if not OPENROUTER_KEY:
        logger.error("IA Assistant: Error crítico - No se encontró OPENROUTER_API_KEY en el entorno.")
        return {
            "resultado": "error", 
            "mensaje": "El servicio de IA no está configurado (Falta API Key en el servidor)."
        }

    # Inicializamos el cliente de OpenRouter
    client = OpenAI(
        base_url="https://openrouter.ai/api/v1", 
        api_key=OPENROUTER_KEY,
        default_headers={
            "X-Title": "IA Assistant",
        }
    )

    # 1. Construcción del Prompt de Usuario (Data Cruda para la IA)
    prompt_tareas = "LISTA DE TAREAS A CALIFICAR:\n"
    for tarea in lista_tareas:
        tipo = tarea.get('tipo', 'abierta').upper()
        # Sincronizamos con los campos que enviamos desde calcular_nota.py
        prompt_tareas += f"\n[ID: {tarea.get('id')}] - TIPO: {tipo}\n"
        prompt_tareas += f"ENUNCIADO: {tarea.get('enunciado')}\n"
        prompt_tareas += f"CRITERIOS DE EVALUACIÓN (PUNTOS CLAVE): {tarea.get('puntos_clave')}\n"
        prompt_tareas += f"RESPUESTA DEL ESTUDIANTE: {tarea.get('respuesta')}\n"
        prompt_tareas += "-----------------------------------\n"

    # 2. System Prompt: Define la personalidad y el rigor del calificador
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

    # 3. Bucle de Resiliencia (Failover)
    for modelo in MODELOS_FALLBACK:
        for intento in range(2):
            try:
                logger.info(f"Evaluando con {modelo} (Intento {intento+1})...")
                
                res = client.chat.completions.create(
                    model=modelo,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt_tareas}
                    ],
                    response_format={ "type": "json_object" },
                    timeout=60 
                )
                
                respuesta_raw = res.choices[0].message.content
                # Limpieza por si la IA devuelve basura antes del JSON
                match = re.search(r'\{.*\}', respuesta_raw, re.DOTALL)
                
                if match:
                    data_eval = json.loads(match.group(0))
                    if "evaluaciones" in data_eval:
                        logger.info(f"Éxito con {modelo}")
                        return data_eval
                
            except Exception as e:
                logger.warning(f"Fallo temporal con {modelo}: {str(e)}")
                time.sleep(1)
                continue # Reintenta o pasa al siguiente modelo

    logger.critical("Todos los modelos fallaron.")
    return None