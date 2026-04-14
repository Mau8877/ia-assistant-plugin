import os
import json
import time
import logging
import re  
from openai import OpenAI
from django.conf import settings
from .prompt_docente_builder import GENERAR_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

# Extraemos la llave desde las configuraciones de Django
OPENROUTER_KEY = getattr(settings, 'OPENROUTER_API_KEY', None)

# 👑 EL MOTOR PRINCIPAL (Consume saldo de OpenRouter)
MODELO_PRINCIPAL = "openai/gpt-4o-mini"

# 🛡️ LA CABALLERÍA DE RESPALDO (Modelos gratuitos por si te quedas sin saldo)
MODELOS_FALLBACK = [
    "google/gemini-2.0-flash-lite-preview-02-05:free",
    "openai/gpt-oss-120b:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "google/gemma-4-31b-it:free"
]

def generar_contenido_unidad(prompt_usuario):
    logger.info("--- 🚀 INICIANDO MOTOR DE IA (PRODUCCIÓN) ---")
    
    if not OPENROUTER_KEY:
        logger.error("❌ Error crítico: No se encontró OPENROUTER_API_KEY en settings de Django.")
        return {
            "resultado": "error", 
            "mensaje": "El servicio de IA no está configurado (Falta API Key en el servidor)."
        }

    # Inicializamos el cliente de OpenRouter con los Headers de Producción
    client = OpenAI(
        base_url="https://openrouter.ai/api/v1", 
        api_key=OPENROUTER_KEY,
        default_headers={
            "X-Title": "AFRODITA IA Assistant", # Recomendado por OpenRouter
        }
    )

    system_prompt = GENERAR_SYSTEM_PROMPT()

    # Unimos el modelo de paga con los gratuitos para el bucle
    cola_modelos = [MODELO_PRINCIPAL] + MODELOS_FALLBACK

    for index, modelo in enumerate(cola_modelos):
        es_premium = (index == 0)
        tipo_modelo = "PREMIUM" if es_premium else "RESPALDO GRATUITO"
        
        # ⏱️ TIMEOUT DINÁMICO: 3 minutos para el Premium, 30 segundos para los Free
        tiempo_espera = 180 if es_premium else 30

        try:
            logger.info(f">>> Intentando conectar con {tipo_modelo}: {modelo} (Timeout: {tiempo_espera}s)...")
            
            completion = client.chat.completions.create(
                model=modelo,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt_usuario}
                ],
                response_format={ "type": "json_object" },
                timeout=tiempo_espera 
            )

            # 🛡️ BLINDAJE 1: Prevenir respuesta vacía
            if not completion or not hasattr(completion, 'choices') or not completion.choices:
                logger.warning(f"XXX Fallo de API con {modelo}: La respuesta vino vacía.")
                if es_premium:
                    logger.warning("⚠️ ALERTA: El modelo Premium falló. ¿Se acabaron los créditos? Cambiando a gratuitos...")
                time.sleep(1)
                continue
                
            respuesta_raw = completion.choices[0].message.content
            
            # 🛡️ BLINDAJE 2: Prevenir texto nulo
            if not respuesta_raw:
                logger.warning(f"XXX Fallo lógico con {modelo}: El modelo respondió con texto vacío.")
                continue
            
            match = re.search(r'\{.*\}', respuesta_raw, re.DOTALL)
            
            if match:
                respuesta_ia = match.group(0)
            else:
                logger.warning(f"XXX Modelo {modelo} no devolvió un JSON válido. Reintentando...")
                continue

            # Validar JSON antes de darlo por bueno
            json.loads(respuesta_ia)
            
            logger.info(f"✅ ¡ÉXITO TOTAL con {tipo_modelo} ({modelo})!")
            return {
                "resultado": "ok", 
                "json_unidad": respuesta_ia
            }

        except json.JSONDecodeError:
            logger.warning(f"XXX Error de formato con {modelo}: El JSON devuelto estaba corrupto.")
            continue 

        except Exception as e:
            error_msg = str(e)
            logger.warning(f"XXX Fallo general/API con {modelo}: {error_msg[:100]}")
            
            # Si el error menciona algo de cuota (402/429) y estamos en el premium, avisamos clarito.
            if es_premium and ("402" in error_msg or "429" in error_msg or "insufficient_quota" in error_msg.lower()):
                logger.warning("🚨 AVISO CRÍTICO: Saldo agotado en OpenRouter. Activando protocolo de emergencia con IA gratuita...")
                
            time.sleep(1)
            continue 

    logger.critical("❌ CAÍDA TOTAL DEL SISTEMA: Ni el Premium ni los respaldos gratuitos respondieron.") 
    return {
        "resultado": "error", 
        "mensaje": "Todos los motores de IA están saturados o sin saldo. Reintenta en un minuto."
    }