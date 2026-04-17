import json
import logging
from xblock.core import XBlock
from xblock.fields import Scope, String, Dict, Integer
from xblock.fragment import Fragment

from .utils.load_resource import load_resource
from .component_manager import renderizar_unidad
from .ia_docente.ia_docente_client import generar_contenido_unidad
from .ia_alumno.evaluator.calcular_nota import calcular_nota_final

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
    # VISTA STUDIO
    # -----------------------------------------------------------------------
    def studio_view(self, context=None):
        """Renderiza la interfaz donde el profesor escribe el prompt."""

        html_generador_raw = load_resource(
            "static/core/studio/components/generador_unidad/generador_unidad.html"
        )
        html_editor_raw = load_resource(
            "static/core/studio/components/editor_unidad/editor_unidad.html"
        )
        html_maestro_raw = load_resource("static/core/studio/studio.html")

        html_generador_formateado = html_generador_raw.format(
            prompt_docente=self.prompt_docente
        )
        json_guardado = self.unidad_json if self.unidad_json else "{}"
        html_editor_formateado = html_editor_raw.format(
            unidad_json_guardada=json_guardado
        )

        html_final = html_maestro_raw.format(
            html_generador=html_generador_formateado,
            html_editor=html_editor_formateado,
        )

        frag = Fragment(html_final)

        # ── LIBRERÍAS EXTERNAS (CDNs) ───────────────────────────────────────
        # Se inyectan con _url para que Open edX las descargue de forma segura
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

        # ── JS ──────────────────────────────────────────────────────────────
        # FIX CRÍTICO: add_javascript() en Open edX moderno NO garantiza orden
        # de ejecución entre scripts. La solución es empaquetar los 3 módulos
        # en un único string concatenado, lo que sí garantiza orden secuencial
        # dentro de un solo bloque <script>.
        js_editor = load_resource(
            "static/core/studio/components/editor_unidad/editor_unidad.js"
        )
        js_generador = load_resource(
            "static/core/studio/components/generador_unidad/generador_unidad.js"
        )
        js_init = load_resource("static/core/studio/studio.js")

        # Un solo bloque JS: editor → generador → init (orden estricto garantizado)
        frag.add_javascript(
            js_editor + "\n\n" + js_generador + "\n\n" + js_init
        )

        frag.initialize_js("STUDIO_DOCENTE_INIT")
        return frag

    # -----------------------------------------------------------------------
    # HANDLERS DE STUDIO
    # -----------------------------------------------------------------------
    @XBlock.json_handler
    def generar_borrador_ia(self, data, suffix=""):
        """
        Paso 1: Genera el contenido y lo devuelve al frontend.
        No lo guarda en la base de datos todavía.
        """
        nuevo_prompt = data.get("prompt", "")
        self.prompt_docente = nuevo_prompt

        logger.info(
            "IA Assistant: Iniciando generación de borrador para docente..."
        )

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
        Paso 2: Recibe el contenido ya editado por el profesor y lo persiste.
        """
        contenido_final = data.get("contenido_final", "").strip()

        if not contenido_final:
            return {
                "resultado": "error",
                "mensaje": "El contenido editado está vacío.",
            }

        self.unidad_json = contenido_final
        logger.info(
            "IA Assistant: Unidad editada manualmente y persistida exitosamente."
        )
        return {"resultado": "ok", "mensaje": "Unidad publicada."}

    # -----------------------------------------------------------------------
    # VISTA STUDENT
    # -----------------------------------------------------------------------
    def student_view(self, context=None):
        """Ensambla dinámicamente los componentes de la unidad."""

        # FIX: se eliminó el "return self.studio_view(context)" que dejaba
        # todo el código de student_view como código inalcanzable (unreachable).
        json_crudo = self.unidad_json if self.unidad_json else "{}"

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

        for css in recursos.get("css", []):
            frag.add_css(load_resource(css))
        for js in recursos.get("js", []):
            frag.add_javascript(load_resource(js))

        frag.add_css(load_resource("static/core/student/student.css"))
        frag.add_javascript(load_resource("static/core/student/student.js"))
        frag.add_javascript(
            load_resource("static/components/revision/revision.js")
        )
        frag.initialize_js("StudentMasterInit")

        return frag

    # -----------------------------------------------------------------------
    # HANDLER DE CALIFICACIÓN
    # -----------------------------------------------------------------------
    @XBlock.json_handler
    def calificar_unidad(self, data, suffix=""):
        """Recibe las respuestas y delega la evaluación."""

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

        if resultado.get("resultado") == "ok":
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
        return [("IA Assistant XBlock", "<ia_assistant/>")]
