import json
import logging
from xblock.core import XBlock
from xblock.fields import Scope, String, Dict, Integer
from xblock.fragment import Fragment

from .utils.load_resource import load_resource
from .component_manager import renderizar_unidad
from .ia_docente.ia_docente_client import generar_contenido_unidad
from .ia_alumno.evaluator.calcular_nota import calcular_nota_final

# Configuración de logs para el workbench de Django
logger = logging.getLogger(__name__)


class IAAssistantXBlock(XBlock):
    has_score = True
    icon_class = "problem"

    display_name = String(
        display_name="Nombre a mostrar",
        default="Asistente IA UAGRM",
        scope=Scope.settings,
        help="Nombre del bloque en la plataforma",
    )

    prompt_docente = String(
        default="Genera la unidad sobre...",
        scope=Scope.settings,
        help="El texto que el docente le envía a la IA.",
    )

    unidad_json = String(
        default="", scope=Scope.content, help="JSON estructurado de la unidad."
    )

    # -----------------------------------------------------------------------
    # MEMORIA DEL ESTUDIANTE (AUTOGUARDADO)
    # -----------------------------------------------------------------------
    respuestas_alumno = Dict(
        default={},
        scope=Scope.user_state,
        help="Memoria del estudiante con sus respuestas borrador.",
    )

    intentos_realizados = Integer(
        default=0,
        scope=Scope.user_state,
        help="Número de veces que el alumno ha enviado la evaluación.",
    )

    feedback_guardado = Dict(
        default={},
        scope=Scope.user_state,
        help="Guarda el feedback detallado de la IA para mostrarlo permanentemente.",
    )

    # -----------------------------------------------------------------------
    # VISTA STUDIO (Configuración del Docente)
    # -----------------------------------------------------------------------
    def studio_view(self, context=None):
        """Renderiza la interfaz donde el profesor escribe el prompt."""

        # 1. Cargar las piezas HTML individuales
        html_generador_raw = load_resource(
            "static/core/studio/components/generador_unidad/generador_unidad.html"
        )
        html_editor_raw = load_resource(
            "static/core/studio/components/editor_unidad/editor_unidad.html"
        )
        html_maestro_raw = load_resource("static/core/studio/studio.html")

        # 2. Inyectar los datos en el Generador (el prompt del docente)
        html_generador_formateado = html_generador_raw.format(
            prompt_docente=self.prompt_docente
        )

        # 🚨 FIX CRÍTICO: Ya no inyectamos el JSON en el HTML del editor.
        # Esto evita el bug donde el texto se desbordaba en la pantalla.
        html_editor_formateado = html_editor_raw

        # 3. Ensamblar todo dentro del Maestro
        html_final = html_maestro_raw.format(
            html_generador=html_generador_formateado,
            html_editor=html_editor_formateado,
        )

        # 4. Crear el Fragmento y añadir Recursos Estáticos
        frag = Fragment(html_final)

        # ── LIBRERÍAS EXTERNAS (CDNs) ───────────────────────────────────────
        frag.add_css_url("https://cdn.quilljs.com/1.3.6/quill.snow.css")
        frag.add_javascript_url("https://cdn.quilljs.com/1.3.6/quill.js")
        frag.add_javascript_url("https://unpkg.com/lucide@latest")

        # ── CSS LOCALES ─────────────────────────────────────────────────────
        frag.add_css(load_resource("static/core/studio/studio.css"))
        frag.add_css(
            load_resource(
                "static/core/studio/components/generador_unidad/generador_unidad.css"
            )
        )
        frag.add_css(
            load_resource(
                "static/core/studio/components/editor_unidad/editor_unidad.css"
            )
        )

        # NUEVO: CSS del micro-componente
        frag.add_css(
            load_resource(
                "static/core/studio/components/editor_unidad/components/teoria/teoria.css"
            )
        )
        frag.add_css(
            load_resource(
                "static/core/studio/components/editor_unidad/components/quiz_multiple/quiz.css"
            )
        )
        frag.add_css(
            load_resource(
                "static/core/studio/components/editor_unidad/components/pregunta_abierta/pregunta_abierta.css"
            )
        )
        frag.add_css(
            load_resource(
                "static/core/studio/components/editor_unidad/components/codigo/codigo.css"
            )
        )

        # ── JS LOCALES (ARQUITECTURA MODULAR ENTERPRISE) ────────────────────

        # A) Cargamos las fábricas de los componentes (Hijos)
        js_teoria = load_resource(
            "static/core/studio/components/editor_unidad/components/teoria/teoria_render.js"
        )
        js_quiz = load_resource(
            "static/core/studio/components/editor_unidad/components/quiz_multiple/quiz_render.js"
        )
        js_abierta = load_resource(
            "static/core/studio/components/editor_unidad/components/pregunta_abierta/pregunta_abierta_render.js"
        )
        js_codigo = load_resource(
            "static/core/studio/components/editor_unidad/components/codigo/codigo_render.js"
        )

        # B) Cargamos el orquestador y el inicializador (Padres)
        js_editor = load_resource(
            "static/core/studio/components/editor_unidad/editor_unidad.js"
        )
        js_generador = load_resource(
            "static/core/studio/components/generador_unidad/generador_unidad.js"
        )
        js_init = load_resource("static/core/studio/studio.js")

        # C) Concatenamos TODO en un solo bloque seguro para Open edX
        # El orden es vital: Hijos -> Orquestador -> Inicializador
        paquete_js_completo = "\n\n".join(
            [
                js_teoria,
                js_quiz,
                js_abierta,
                js_codigo,
                js_editor,
                js_generador,
                js_init,
            ]
        )

        frag.add_javascript(paquete_js_completo)

        # ── INYECCIÓN DE DATOS SEGURA (PUENTE BACKEND -> FRONTEND) ──────────
        # El JSON viaja directamente a la memoria de Javascript, sin tocar el HTML
        html_teoria_template = load_resource(
            "static/core/studio/components/editor_unidad/components/teoria/teoria.html"
        )
        html_quiz_template = load_resource(
            "static/core/studio/components/editor_unidad/components/quiz_multiple/quiz.html"
        )
        html_abierta_template = load_resource(
            "static/core/studio/components/editor_unidad/components/pregunta_abierta/pregunta_abierta.html"
        )
        html_codigo_template = load_resource(
            "static/core/studio/components/editor_unidad/components/codigo/codigo.html"
        )

        # Se los pasamos a Javascript en un diccionario de Plantillas
        datos_para_js = {
            "json_guardado": self.unidad_json if self.unidad_json else "{}",
            "templates": {
                "teoria": html_teoria_template,
                "quiz_multiple": html_quiz_template,
                "pregunta_abierta": html_abierta_template,
                "codigo": html_codigo_template,
            },
        }

        frag.initialize_js("STUDIO_DOCENTE_INIT", datos_para_js)

        return frag

    # -----------------------------------------------------------------------
    # HANDLERS DE STUDIO
    # -----------------------------------------------------------------------

    @XBlock.json_handler
    def generar_borrador_ia(self, data, suffix=""):
        """
        Paso 1: Solo genera el contenido y lo devuelve a la pantalla.
        NO lo guarda en la base de datos de los alumnos todavía.
        """
        nuevo_prompt = data.get("prompt", "")
        self.prompt_docente = nuevo_prompt  # Guardamos el borrador del prompt

        logger.info(
            f"IA Assistant: Iniciando generación de borrador para docente..."
        )

        # Delegación a la lógica de negocio en ia_docente
        resultado = generar_contenido_unidad(nuevo_prompt)

        if resultado["resultado"] == "ok":
            logger.info(
                "IA Assistant: Borrador generado, enviando a vista previa."
            )
            return {
                "resultado": "ok",
                "contenido_crudo": resultado["json_unidad"],
            }
        else:
            return resultado

    @XBlock.json_handler
    def guardar_unidad_editada(self, data, suffix=""):
        """
        Paso 2: Recibe el contenido que el profesor ya editó manualmente
        en la vista previa, y ahora sí lo guarda como la unidad final.
        """
        contenido_final = data.get("contenido_final", "").strip()

        if not contenido_final:
            return {
                "resultado": "error",
                "mensaje": "El contenido editado está vacío.",
            }

        # Guardamos definitivamente el contenido en el bloque del curso
        self.unidad_json = contenido_final
        logger.info(
            "IA Assistant: Unidad editada manualmente y persistida exitosamente."
        )

        return {"resultado": "ok", "mensaje": "Unidad publicada."}

    # -----------------------------------------------------------------------
    # VISTA STUDENT (Interfaz del Alumno)
    # -----------------------------------------------------------------------
    def student_view(self, context=None):
        """Ensambla dinámicamente los componentes de la unidad."""

        # return self.studio_view(context)

        json_crudo = self.unidad_json if self.unidad_json else "{}"

        # El component_manager se encarga de convertir JSON -> HTML y listar recursos
        html_componentes, recursos = renderizar_unidad(json_crudo)

        intentos_agotados = (
            "true" if self.intentos_realizados >= 1 else "false"
        )
        html_base = load_resource("static/core/student/student.html").format(
            unidad_id=str(self.scope_ids.usage_id),
            unidad_titulo=recursos.get("titulo", "Unidad de Aprendizaje"),
            componentes_html=html_componentes,
            unidad_json=json_crudo,
            prompt_debug=self.prompt_docente,
            feedback_historial=(
                json.dumps(self.feedback_guardado)
                if self.feedback_guardado
                else "{}"
            ),
            intentos_agotados=intentos_agotados,
            respuestas_guardadas=(
                json.dumps(self.respuestas_alumno)
                if self.respuestas_alumno
                else "{}"
            ),
        )

        frag = Fragment(html_base)

        # Inyectar dinámicamente CSS/JS de los componentes usados
        for css in recursos.get("css", []):
            frag.add_css(load_resource(css))
        for js in recursos.get("js", []):
            frag.add_javascript(load_resource(js))

        # Recursos base del "Chasis" del estudiante
        frag.add_css(load_resource("static/core/student/student.css"))
        frag.add_javascript(load_resource("static/core/student/student.js"))
        frag.add_javascript(
            load_resource("static/components/revision/revision.js")
        )
        frag.initialize_js("StudentMasterInit")

        print(f"DEBUG: El JSON en la base de datos es: {self.unidad_json}")

        return frag

    # -----------------------------------------------------------------------
    # HANDLER DE CALIFICACIÓN
    # -----------------------------------------------------------------------
    @XBlock.json_handler
    def calificar_unidad(self, data, suffix=""):
        """
        Recibe las respuestas y delega la evaluación.
        Solo publica la nota si el proceso fue exitoso.
        """

        MAX_INTENTOS = 1
        if self.intentos_realizados >= MAX_INTENTOS:
            logger.warning(
                "IA Assistant: Alumno intentó enviar de nuevo pero ya agotó sus intentos."
            )
            return {
                "resultado": "error",
                "mensaje": "Ya has agotado tus intentos permitidos para esta evaluación.",
            }

        logger.info("IA Assistant: Procesando entrega del alumno...")
        resultado = calcular_nota_final(data, self.unidad_json)

        # --- BLINDAJE DE LÓGICA ---
        # Solo publicamos la nota si la IA y el evaluador respondieron 'ok'
        if resultado.get("resultado") == "ok":
            # 2. INCREMENTAR INTENTO SOLO SI TODO SALIÓ BIEN
            self.intentos_realizados += 1
            self.feedback_guardado = resultado

            nota_final = resultado.get("nota", 0)
            self.runtime.publish(
                self, "grade", {"value": nota_final / 100.0, "max_value": 1.0}
            )
            logger.info(f"IA Assistant: Nota de {nota_final} publicada.")
        else:
            logger.error(
                f"IA Assistant: Fallo en calificación. Mensaje: {resultado.get('mensaje')}"
            )

        return resultado

    # -----------------------------------------------------------------------
    # HANDLER DE AUTOGUARDADO
    # -----------------------------------------------------------------------
    @XBlock.json_handler
    def guardar_progreso(self, data, suffix=""):
        """Guarda el borrador de las respuestas del alumno en tiempo real."""
        try:
            self.respuestas_alumno = data
            return {"resultado": "ok", "mensaje": "Progreso guardado"}
        except Exception as e:
            logger.error(f"Error al guardar progreso: {str(e)}")
            return {"resultado": "error", "mensaje": str(e)}

    @staticmethod
    def workbench_scenarios():
        """Escenario para el SDK de XBlock."""
        return [("IA Assistant XBlock", "<ia_assistant/>")]
