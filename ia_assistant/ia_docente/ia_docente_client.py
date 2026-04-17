import os
import json
import time
import logging
import re
from openai import OpenAI
from dotenv import load_dotenv

# Intentamos importar settings de Django (Para Producción)
try:
    from django.conf import settings
except ImportError:
    settings = None

from .prompt_docente_builder import GENERAR_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

# =====================================================================
# 🔐 CONFIGURACIÓN HÍBRIDA DE API KEY (SDK Local vs Producción)
# =====================================================================
# 1. Cargamos el .env de forma silenciosa (Solo hará efecto en SDK)
load_dotenv()

# 2. Intentamos sacar la llave desde la configuración de Django (Producción)
OPENROUTER_KEY = (
    getattr(settings, "OPENROUTER_API_KEY", None) if settings else None
)

# 3. Si Django no la tiene (porque estamos en el SDK), la sacamos del .env
if not OPENROUTER_KEY:
    OPENROUTER_KEY = os.getenv("OPENROUTER_API_KEY")

# =====================================================================
# 🤖 MOTORES DE IA
# =====================================================================
# EL MOTOR PRINCIPAL (Consume saldo de OpenRouter)
MODELO_PRINCIPAL = "openai/gpt-4o-mini"

# LA CABALLERÍA DE RESPALDO (Modelos gratuitos por si te quedas en $0.00)
MODELOS_FALLBACK = [
    "google/gemini-2.0-flash-lite-preview-02-05:free",
    "openai/gpt-oss-120b:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "google/gemma-4-31b-it:free",
]


def generar_contenido_unidad(prompt_usuario):
    print("\n--- 🚀 INICIANDO MOTOR DE IA (DOCENTE) ---")
    logger.info("Iniciando motor de generación (Docente)")

    # 4. Verificación final de seguridad de la llave
    if not OPENROUTER_KEY:
        print(
            "❌ ERROR CRÍTICO: No se encontró OPENROUTER_API_KEY ni en Django ni en .env"
        )
        logger.error("Docente: API Key no encontrada en ningún entorno.")
        return {
            "resultado": "error",
            "mensaje": "Falta API Key del servicio de IA.",
        }

    # Inicializamos el cliente con el header de la App
    client = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=OPENROUTER_KEY,
        default_headers={
            "X-Title": "IA Docente",
        },
    )

    system_prompt = GENERAR_SYSTEM_PROMPT()

    # Unimos el modelo de paga con los gratuitos para el bucle
    cola_modelos = [MODELO_PRINCIPAL] + MODELOS_FALLBACK

    for index, modelo in enumerate(cola_modelos):
        es_premium = index == 0
        tipo_modelo = "PREMIUM 💎" if es_premium else "RESPALDO GRATUITO 🛟"

        tiempo_espera = 180 if es_premium else 30

        try:
            print(
                f">>> Intentando conectar con {tipo_modelo}: {modelo} (Timeout: {tiempo_espera}s)..."
            )
            logger.info(f"Intentando generar con modelo: {modelo}")

            completion = client.chat.completions.create(
                model=modelo,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt_usuario},
                ],
                response_format={"type": "json_object"},
                timeout=tiempo_espera,
            )

            # 🛡️ BLINDAJE 1: Prevenir respuesta vacía
            if (
                not completion
                or not hasattr(completion, "choices")
                or not completion.choices
            ):
                print(f"XXX Fallo vacío con {modelo}")
                logger.warning(
                    f"Fallo de API con {modelo}: La respuesta vino vacía."
                )
                if es_premium:
                    print(
                        "⚠️ ALERTA: El modelo Premium falló. ¿Se acabaron los créditos? "
                        "Cambiando a gratuitos..."
                    )
                time.sleep(1)
                continue

            respuesta_raw = completion.choices[0].message.content

            # 🛡️ BLINDAJE 2: Prevenir texto nulo
            if not respuesta_raw:
                print(f"XXX Fallo lógico (texto nulo) con {modelo}")
                logger.warning(
                    f"Fallo lógico con {modelo}: El modelo respondió con texto vacío."
                )
                continue

            match = re.search(r"\{.*\}", respuesta_raw, re.DOTALL)

            if match:
                respuesta_ia = match.group(0)
            else:
                print(f"XXX No se encontró JSON en {modelo}")
                logger.warning(f"Modelo {modelo} no devolvió un JSON válido.")
                continue

            # Validar JSON antes de darlo por bueno
            json.loads(respuesta_ia)

            print(f"✅ ¡ÉXITO TOTAL con {tipo_modelo} ({modelo})!")
            logger.info(f"Éxito con modelo: {modelo}")
            return {"resultado": "ok", "json_unidad": respuesta_ia}

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

            # Si el error menciona algo de cuota (402/429) y estamos en el premium, avisamos clarito.
            if es_premium and (
                "402" in error_msg
                or "429" in error_msg
                or "insufficient_quota" in error_msg.lower()
            ):
                print(
                    "🚨 AVISO: Saldo agotado en OpenRouter. Activando protocolo de emergencia con IA gratuita..."
                )

            time.sleep(1)
            continue

    print(
        "❌ CAÍDA TOTAL DEL SISTEMA: Ni el Premium ni los respaldos gratuitos respondieron."
    )
    return {
        "resultado": "error",
        "mensaje": "Todos los motores de IA están saturados o sin saldo. Reintenta en un minuto.",
    }
