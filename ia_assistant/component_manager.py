import json
import logging
from .utils.load_resource import load_resource

logger = logging.getLogger(__name__)

def renderizar_unidad(json_str):
    """
    Toma el JSON de la IA y devuelve el HTML ensamblado con wrappers para las pestañas.
    Prioriza IDs descriptivos y normaliza nombres de campos para la calificación.
    """
    try:
        if not json_str or json_str == "{}" or json_str == "":
            return "", {"titulo": "Unidad Vacía", "css": set(), "js": set()}
            
        datos = json.loads(json_str)
    except Exception as e:
        logger.error(f"Error al parsear unidad_json: {str(e)}")
        return f"<p>Error al parsear unidad: {str(e)}</p>", {"titulo": "Error", "css": set(), "js": set()}

    html_final = ""
    recursos = {
        "titulo": datos.get("titulo_unidad", "Unidad Interactiva"),
        "css": set(),
        "js": set()
    }

    componentes = datos.get("componentes", [])

    for idx, comp in enumerate(componentes):
        tipo = comp.get("tipo")
        # Usamos el ID descriptivo de la IA si existe, sino generamos uno secuencial
        comp_id = comp.get("id", f"{tipo}_{idx}")

        # --- SECCIÓN: TEORÍA ---
        if tipo == "teoria":
            template = load_resource("static/components/teoria/teoria.html")
            contenido = template.format(contenido_html=comp.get("contenido_html", ""))
            # El wrapper permite al JS moverlo a la pestaña correspondiente
            html_final += f'<div class="ia-comp-teoria" id="{comp_id}">{contenido}</div>'
            recursos["css"].add("static/components/teoria/teoria.css")

        # --- SECCIÓN: QUIZ MULTIPLE ---
        elif tipo == "quiz_multiple":
            preguntas_html = ""
            for i, p in enumerate(comp.get("preguntas", [])):
                # Almacenamos la respuesta correcta en un atributo data para validación rápida en el JS
                preguntas_html += f'<div class="ia-pregunta" data-correcta="{p.get("correcta")}">'
                preguntas_html += f'<h4>{i+1}. {p.get("enunciado")}</h4>'
                for j, opt in enumerate(p.get("opciones", [])):
                    # El name sigue el formato 'answer_[ID_COMPONENTE]_[INDICE_PREGUNTA]'
                    # Esto permite al evaluador identificar exactamente qué pregunta se está respondiendo
                    preguntas_html += (
                        f'<label class="ia-opcion">'
                        f'<input type="radio" name="answer_{comp_id}_{i}" value="{j}"> {opt}'
                        f'</label>'
                    )
                preguntas_html += '</div>'
            
            template = load_resource("static/components/quiz_multiple/quiz.html")
            contenido = template.format(preguntas_html=preguntas_html)
            html_final += f'<div class="ia-comp-quiz" id="{comp_id}">{contenido}</div>'
            recursos["css"].add("static/components/quiz_multiple/quiz.css")
            recursos["js"].add("static/components/quiz_multiple/quiz.js")

        # --- SECCIÓN: PREGUNTA ABIERTA ---
        elif tipo == "pregunta_abierta":
            template = load_resource("static/components/pregunta_abierta/pregunta_abierta.html")
            contenido = template.format(
                comp_id=comp_id, 
                enunciado=comp.get("enunciado", "")
            )
            html_final += f'<div class="ia-comp-abierta" id="{comp_id}">{contenido}</div>'
            recursos["css"].add("static/components/pregunta_abierta/pregunta_abierta.css")
            recursos["js"].add("static/components/pregunta_abierta/pregunta_abierta.js")

        # --- SECCIÓN: LABORATORIO DE CÓDIGO ---
        elif tipo == "codigo":
            specs = comp.get('especificaciones', {})
            # Limpiamos saltos de línea literales (\n) para que el textarea los renderice como saltos reales
            codigo_limpio = comp.get('codigo_inicial', '').replace('\\n', '\n')
            
            # Guardamos la longitud del código base para que el JS sepa si el alumno escribió algo nuevo
            base_len = len(codigo_limpio)

            template = load_resource("static/components/codigo/codigo.html")
            contenido = template.format(
                id=comp_id,
                enunciado=comp.get('enunciado', ''),
                lenguaje=comp.get('lenguaje', 'PYTHON').upper(),
                codigo_inicial=codigo_limpio,
                entrada=specs.get('entrada_esperada', 'N/A'),
                salida=specs.get('salida_esperada', 'N/A')
            )
            html_final += f'<div class="ia-comp-codigo" id="{comp_id}" data-base-len="{base_len}">{contenido}</div>'
            recursos["css"].add("static/components/codigo/codigo.css")
            recursos["js"].add("static/components/codigo/codigo.js")

    return html_final, recursos