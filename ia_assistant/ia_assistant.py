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
    """
    XBlock principal del asistente IA.

    Responsabilidades:
    - Studio:
        * Permitir al docente generar un borrador con IA
        * Editarlo visualmente
        * Guardarlo como JSON final de la unidad
    - Student:
        * Renderizar la unidad final para el alumno
        * Guardar progreso
        * Calificar la entrega
    """

    has_score = True
    icon_class = "problem"

    # ---------------------------------------------------------------------
    # CONFIGURACIÓN GENERAL DEL BLOQUE
    # ---------------------------------------------------------------------
    display_name = String(
        display_name="Nombre a mostrar",
        default="Asistente IA UAGRM",
        scope=Scope.settings,
        help="Nombre visible del bloque en la plataforma.",
    )

    prompt_docente = String(
        default="Genera la unidad sobre...",
        scope=Scope.settings,
        help="Prompt que el docente envía a la IA para generar la unidad.",
    )

    unidad_json = String(
        default="",
        scope=Scope.content,
        help="JSON estructurado de la unidad final publicada.",
    )

    # ---------------------------------------------------------------------
    # ESTADO DEL ALUMNO
    # ---------------------------------------------------------------------
    respuestas_alumno = Dict(
        default={},
        scope=Scope.user_state,
        help="Respuestas borrador/autoguardadas del alumno.",
    )

    intentos_realizados = Integer(
        default=0,
        scope=Scope.user_state,
        help="Cantidad de intentos de envío realizados por el alumno.",
    )

    feedback_guardado = Dict(
        default={},
        scope=Scope.user_state,
        help="Resultado y feedback persistido de la última evaluación.",
    )

    # -----------------------------------------------------------------------
    # VISTA STUDIO (Configuración del Docente)
    # -----------------------------------------------------------------------
    def studio_view(self, context=None):
        """ Renderiza la interfaz donde el profesor escribe el prompt. """
        html_str = load_resource("static/core/studio/studio.html")
        html_formateado = html_str.format(prompt_docente=self.prompt_docente)
        
        frag = Fragment(html_formateado)
        frag.add_css(load_resource("static/core/studio/studio.css"))
        frag.add_javascript(load_resource("static/core/studio/studio.js"))
        frag.initialize_js('StudioDocenteInit')
        return frag

    def _build_student_fragment(self):
        """
        Construye el Fragment para la vista del alumno.

        Aquí sí se renderiza la unidad final publicada.
        """
        json_crudo = self.unidad_json if self.unidad_json else "{}"

        try:
            html_componentes, recursos = renderizar_unidad(json_crudo)
        except Exception:
            logger.exception("Error renderizando la unidad del alumno.")
            html_componentes = (
                '<div class="ia-error">No se pudo renderizar la unidad.</div>'
            )
            recursos = {"css": [], "js": [], "titulo": "Unidad de Aprendizaje"}

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

        # CSS dinámico de componentes usados
        for css_path in recursos.get("css", []):
            try:
                frag.add_css(load_resource(css_path))
            except Exception:
                logger.exception("Error cargando CSS del alumno: %s", css_path)

        # JS dinámico de componentes usados
        for js_path in recursos.get("js", []):
            try:
                frag.add_javascript(load_resource(js_path))
            except Exception:
                logger.exception("Error cargando JS del alumno: %s", js_path)

        # Recursos base del chasis de alumno
        self._add_css_resources(
            frag,
            [
                "static/core/student/student.css",
            ],
        )

        self._add_js_resources(
            frag,
            [
                "static/core/student/student.js",
                "static/components/revision/revision.js",
            ],
        )

        frag.initialize_js("StudentMasterInit")
        return frag

    # -----------------------------------------------------------------------
    # HANDLER DE CALIFICACIÓN
    # -----------------------------------------------------------------------
    @XBlock.json_handler
    def guardar_unidad_editada(self, data, suffix=""):
        """
        Guarda de forma definitiva el JSON editado por el docente.
        """
        try:
            contenido_final = (data or {}).get("contenido_final", "").strip()

            if not contenido_final:
                return {
                    "resultado": "error",
                    "mensaje": "El contenido editado está vacío.",
                }

            # Validación básica: asegurar que sea JSON parseable
            try:
                json.loads(contenido_final)
            except json.JSONDecodeError:
                return {
                    "resultado": "error",
                    "mensaje": "El contenido no es un JSON válido.",
                }

            self.unidad_json = contenido_final

            logger.info(
                "IA Assistant: Unidad editada manualmente y guardada exitosamente."
            )

            return {"resultado": "ok", "mensaje": "Unidad publicada."}

        except Exception as exc:
            logger.exception("IA Assistant: Error guardando unidad editada.")
            return {
                "resultado": "error",
                "mensaje": f"Error inesperado al guardar la unidad: {str(exc)}",
            }

    # ---------------------------------------------------------------------
    # HANDLERS DE ALUMNO
    # ---------------------------------------------------------------------
    @XBlock.json_handler
    def guardar_progreso(self, data, suffix=""):
        """
        Guarda el progreso del alumno en tiempo real.
        """
        try:
            self.respuestas_alumno = data or {}
            return {"resultado": "ok", "mensaje": "Progreso guardado."}
        except Exception as exc:
            logger.exception("Error al guardar progreso del alumno.")
            return {"resultado": "error", "mensaje": str(exc)}

    @XBlock.json_handler
    def calificar_unidad(self, data, suffix=""):
        """
        Evalúa la entrega del alumno.

        Reglas:
        - Solo permite un número máximo de intentos
        - Solo publica nota si la evaluación terminó correctamente
        """
        MAX_INTENTOS = 1

        try:
            if self.intentos_realizados >= MAX_INTENTOS:
                logger.warning(
                    "IA Assistant: Alumno intentó enviar nuevamente sin intentos disponibles."
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
                    self,
                    "grade",
                    {
                        "value": nota_final / 100.0,
                        "max_value": 1.0,
                    },
                )

                logger.info(
                    "IA Assistant: Nota publicada correctamente: %s",
                    nota_final,
                )
            else:
                logger.error(
                    "IA Assistant: Falló la calificación. Mensaje: %s",
                    resultado.get("mensaje"),
                )

            return resultado

        except Exception as exc:
            logger.exception("IA Assistant: Error inesperado al calificar.")
            return {
                "resultado": "error",
                "mensaje": f"Error inesperado durante la calificación: {str(exc)}",
            }

    # ---------------------------------------------------------------------
    # WORKBENCH
    # ---------------------------------------------------------------------
    @staticmethod
    def workbench_scenarios():
        """
        Escenario mínimo para pruebas en el SDK/workbench de XBlock.
        """
        return [("IA Assistant XBlock", "<ia_assistant/>")]
