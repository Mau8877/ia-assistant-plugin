import json
import logging
from ..ia_alumno_client import evaluar_respuestas_batch

logger = logging.getLogger(__name__)

def calcular_nota_final(datos_alumno, unidad_json_str):
    try:
        if not unidad_json_str:
            return {"resultado": "error", "mensaje": "No hay contenido en la unidad para calificar."}
        unidad_data = json.loads(unidad_json_str)
    except Exception as e:
        logger.error(f"Error parseando unidad_json: {str(e)}")
        return {"resultado": "error", "mensaje": "Error en el formato de la unidad."}

    componentes_unidad = unidad_data.get('componentes', [])
    res_quiz = datos_alumno.get('respuestas_quiz', {})
    res_abiertas = datos_alumno.get('respuestas_abiertas', [])
    res_codigo = datos_alumno.get('respuestas_codigo', [])

    total_puntos = 0
    conteo = 0
    feedback_detallado = []
    lista_para_ia = []

    # 1. Quizzes (Determinístico)
    if res_quiz and 'puntaje' in res_quiz:
        nota_q = round(float(res_quiz.get('puntaje', 0)), 2)
        # CAPTURAMOS EL ID QUE VIENE DEL JS
        quiz_id = res_quiz.get('id') 
        
        total_puntos += nota_q
        conteo += 1
        feedback_detallado.append({
            "id": quiz_id, # <--- CRÍTICO: Para que el JS sepa qué pintar
            "tipo": "Quiz",
            "nota": nota_q,
            "enunciado": "Cuestionario de selección múltiple",
            "detalle": f"Obtuviste un desempeño del {nota_q}% en las preguntas cerradas."
        })

    # --- SECCIÓN 2: MIXTAS (ABIERTA + CÓDIGO) ---
    respuestas_mixtas = res_abiertas + res_codigo

    for resp in respuestas_mixtas:
        # FIX: Evitar procesar si el ID es None o vacío
        resp_id = resp.get('id')
        if not resp_id or resp_id == "None":
            continue 
            
        resp_id_str = str(resp_id)
        comp_orig = next((c for c in componentes_unidad if str(c.get('id')) == resp_id_str), None)
        
        if not comp_orig:
            logger.warning(f"Componente {resp_id_str} no encontrado en la unidad original.")
            continue

        texto_alumno = str(resp.get('texto', '')).strip()

        # --- FILTRO DE CONTENIDO ---
        # Si la respuesta es muy corta o vacía, no molestamos a la IA
        if len(texto_alumno) < 5:
            total_puntos += 0
            conteo += 1
            feedback_detallado.append({
                "tipo": comp_orig.get('tipo', 'ejercicio').capitalize(),
                "nota": 0,
                "enunciado": comp_orig.get('enunciado', 'Pregunta'),
                "detalle": "Respuesta insuficiente o vacía. No se pudo evaluar."
            })
        else:
            # Si tiene contenido, va a la lista para evaluación por IA
            lista_para_ia.append({
                "id": resp_id,
                "enunciado": comp_orig.get('enunciado'),
                "tipo": comp_orig.get('tipo'),
                "respuesta": texto_alumno,
                "puntos_clave": comp_orig.get('puntos_clave', 'Evaluar coherencia técnica.')
            })

    # 3. Evaluación por IA en Batch
    if lista_para_ia:
        res_ia = evaluar_respuestas_batch(lista_para_ia)
        
        if res_ia and "evaluaciones" in res_ia:
            for eval_item in res_ia["evaluaciones"]:
                rid = str(eval_item.get('id'))
                # Recuperamos el enunciado para el feedback visual
                c_orig = next((c for c in componentes_unidad if str(c.get('id')) == rid), {})
                
                nota_ia = float(eval_item.get('nota', 0))
                total_puntos += nota_ia
                conteo += 1
                
                # AQUI ESTABA EL ERROR: FALTABA EL ID
                feedback_detallado.append({
                    "id": rid, # <--- ¡ESTA ES LA LÍNEA MÁGICA!
                    "tipo": c_orig.get('tipo', 'IA').capitalize(),
                    "nota": nota_ia,
                    "enunciado": c_orig.get('enunciado', 'Pregunta'),
                    "detalle": eval_item.get('feedback', 'Sin feedback adicional.')
                })
        else:
            return {"resultado": "error", "mensaje": "La IA de evaluación no respondió. Reintenta."}

    # 4. Resultado Final
    if conteo == 0:
        return {"resultado": "error", "mensaje": "No se detectaron respuestas para calificar."}

    return {
        "resultado": "ok",
        "nota": round(total_puntos / conteo, 2),
        "feedback": feedback_detallado
    }