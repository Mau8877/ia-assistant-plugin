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

CRITICAL_STUDIO_CSS = {"static/vendors/quill.snow.css"}
CRITICAL_STUDIO_JS = {
    "static/vendors/quill.js",
    "static/vendors/lucide.js",
}


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

    # ---------------------------------------------------------------------
    # HELPERS PRIVADOS
    # ---------------------------------------------------------------------
    def _safe_json_string(self, value, default="{}"):
        """
        Convierte un valor a string JSON seguro para enviarlo al frontend.

        - Si ya es string, lo devuelve.
        - Si es falsy, devuelve default.
        - Si no puede serializar, devuelve default.
        """
        if not value:
            return default

        if isinstance(value, str):
            return value

        try:
            return json.dumps(value)
        except Exception:
            logger.exception("No se pudo serializar el valor a JSON string.")
            return default

    def _add_css_resources(self, frag, css_paths):
        """
        Agrega múltiples archivos CSS locales al fragmento.
        Evita repetir código y centraliza logs de fallo.
        """
        for path in css_paths:
            try:
                frag.add_css(load_resource(path))
            except Exception:
                logger.exception(
                    "Error cargando CSS en Studio. Recurso: %s", path
                )
                if path in CRITICAL_STUDIO_CSS:
                    frag.add_javascript(
                        (
                            "console.error("
                            "'[IA Assistant] Fallo cargando CSS crítico de Studio: %s'"
                            ");"
                        )
                        % path
                    )

    def _add_js_resources(self, frag, js_paths):
        """
        Agrega múltiples archivos JS locales al fragmento.
        El orden de js_paths importa.
        """
        for path in js_paths:
            try:
                frag.add_javascript(load_resource(path))
            except Exception:
                logger.exception(
                    "Error cargando JS en Studio. Recurso: %s", path
                )
                if path in CRITICAL_STUDIO_JS:
                    frag.add_javascript(
                        (
                            "console.error("
                            "'[IA Assistant] Fallo cargando JS crítico de Studio: %s'"
                            ");"
                        )
                        % path
                    )

    def _build_studio_templates_payload(self):
        """
        Carga los templates HTML de micro-componentes y los envía al JS
        para renderizado dinámico en Studio.
        """
        return {
            "teoria": load_resource(
                "static/core/studio/components/editor_unidad/components/teoria/teoria.html"
            ),
            "quiz_multiple": load_resource(
                "static/core/studio/components/editor_unidad/components/quiz_multiple/quiz.html"
            ),
            "pregunta_abierta": load_resource(
                "static/core/studio/components/editor_unidad/components/pregunta_abierta/pregunta_abierta.html"
            ),
            "codigo": load_resource(
                "static/core/studio/components/editor_unidad/components/codigo/codigo.html"
            ),
        }

    def _build_studio_fragment(self):
        """
        Construye el Fragment de Studio.

        Estrategia:
        - HTML maestro + subcomponentes
        - CSS local
        - Vendors locales primero
        - Luego renderers hijos
        - Luego orquestadores/padres
        - Finalmente initialize_js con los datos
        """
        # ---------------------------------------------------------------
        # 1) HTML
        # ---------------------------------------------------------------
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

        # No se inyecta el JSON de la unidad dentro del HTML del editor.
        # El JSON se enviará luego vía initialize_js para evitar desbordes
        # y problemas de escape en el DOM.
        html_editor_formateado = html_editor_raw

        html_final = html_maestro_raw.format(
            html_generador=html_generador_formateado,
            html_editor=html_editor_formateado,
        )

        frag = Fragment(html_final)

        # ---------------------------------------------------------------
        # 2) CSS
        # ---------------------------------------------------------------
        css_paths = [
            # Vendor local
            "static/vendors/quill.snow.css",
            # Core Studio
            "static/core/studio/studio.css",
            "static/core/studio/components/generador_unidad/generador_unidad.css",
            "static/core/studio/components/editor_unidad/editor_unidad.css",
            # Micro-componentes del editor
            "static/core/studio/components/editor_unidad/components/teoria/teoria.css",
            "static/core/studio/components/editor_unidad/components/quiz_multiple/quiz.css",
            "static/core/studio/components/editor_unidad/components/pregunta_abierta/pregunta_abierta.css",
            "static/core/studio/components/editor_unidad/components/codigo/codigo.css",
        ]
        self._add_css_resources(frag, css_paths)

        # ---------------------------------------------------------------
        # 3) JS
        # ---------------------------------------------------------------
        # Importante:
        # - Vendors primero
        # - Luego renderers hijos
        # - Luego editor/generador
        # - Luego inicializador maestro
        js_paths = [
            # Vendors locales (más estables que depender de CDN)
            "static/vendors/quill.js",
            "static/vendors/lucide.js",
            # Renderers hijos
            "static/core/studio/components/editor_unidad/components/teoria/teoria_render.js",
            "static/core/studio/components/editor_unidad/components/quiz_multiple/quiz_render.js",
            "static/core/studio/components/editor_unidad/components/pregunta_abierta/pregunta_abierta_render.js",
            "static/core/studio/components/editor_unidad/components/codigo/codigo_render.js",
            # Orquestadores/padres
            "static/core/studio/components/editor_unidad/editor_unidad.js",
            "static/core/studio/components/generador_unidad/generador_unidad.js",
            # Inicializador final
            "static/core/studio/studio.js",
        ]
        self._add_js_resources(frag, js_paths)

        # ---------------------------------------------------------------
        # 4) Datos para el frontend
        # ---------------------------------------------------------------
        datos_para_js = {
            "json_guardado": self.unidad_json if self.unidad_json else "{}",
            "templates": self._build_studio_templates_payload(),
        }

        frag.initialize_js("STUDIO_DOCENTE_INIT", datos_para_js)
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

    # ---------------------------------------------------------------------
    # VISTAS PRINCIPALES
    # ---------------------------------------------------------------------
    def studio_view(self, context=None):
        """
        Vista de Studio.

        Permite al docente:
        - redactar prompt
        - generar borrador con IA
        - editar visualmente la unidad
        - guardar/publicar la versión final
        """
        try:
            return self._build_studio_fragment()
        except Exception:
            logger.exception("Error construyendo studio_view.")
            html_error = """
                <div style="padding:16px;border:1px solid #d9534f;background:#fdf2f2;color:#a94442;">
                    <strong>Error:</strong> no se pudo cargar la interfaz de Studio.
                    Revisa logs del servidor para más detalles.
                </div>
            """
            return Fragment(html_error)

    def student_view(self, context=None):
        """
        Vista del alumno.

        Renderiza la unidad ya publicada, no la interfaz de Studio.
        """

        try:
            return self._build_student_fragment()
        except Exception:
            logger.exception("Error construyendo student_view.")
            html_error = """
                <div style="padding:16px;border:1px solid #d9534f;background:#fdf2f2;color:#a94442;">
                    <strong>Error:</strong> no se pudo cargar la interfaz del alumno.
                    Revisa logs del servidor para más detalles.
                </div>
            """
            return Fragment(html_error)

    # ---------------------------------------------------------------------
    # HANDLERS DE STUDIO
    # ---------------------------------------------------------------------
    @XBlock.json_handler
    def generar_borrador_ia(self, data, suffix=""):
        """
        Genera un borrador de unidad usando el prompt actual del docente.

        No publica todavía el resultado; solo lo devuelve al frontend para
        previsualización/edición.
        """
        try:
            nuevo_prompt = (data or {}).get("prompt", "").strip()
            self.prompt_docente = nuevo_prompt

            logger.info(
                "IA Assistant: Iniciando generación de borrador para docente."
            )

            resultado = generar_contenido_unidad(nuevo_prompt)

            if resultado.get("resultado") == "ok":
                logger.info("IA Assistant: Borrador generado correctamente.")
                return {
                    "resultado": "ok",
                    "contenido_crudo": resultado.get("json_unidad", "{}"),
                }

            logger.warning(
                "IA Assistant: La generación devolvió error controlado: %s",
                resultado,
            )
            return resultado

        except Exception as exc:
            logger.exception(
                "IA Assistant: Error inesperado al generar borrador."
            )
            return {
                "resultado": "error",
                "mensaje": f"Error inesperado al generar el borrador: {str(exc)}",
            }

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
