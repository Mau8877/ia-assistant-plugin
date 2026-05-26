from xblock.core import XBlock
from xblock.fields import Scope, String
from web_fragments.fragment import Fragment

from .resources_manifest import (
    STUDIO_CSS_PATHS,
    STUDIO_HTML_PATH,
    STUDIO_JS_PATHS,
    STUDENT_CSS_PATHS,
    STUDENT_HTML_PATH,
    STUDENT_JS_PATHS,
)
from .utils.resources import read_static_text


class IAAssistantXBlock(XBlock):
    """
    IA Assistant XBlock.

    Version minima inicial para validar que el plugin instala correctamente,
    puede ser importado por el SDK y expone vistas separadas para Studio y
    Student sin implementar todavia la interfaz final.
    """

    display_name = String(
        default="IA Assistant",
        scope=Scope.settings,
        help="Nombre visible del bloque en Open edX.",
    )

    prompt_docente = String(
        default="",
        scope=Scope.content,
        help="Prompt escrito por el docente para generar la unidad.",
    )

    unidad_json = String(
        default="{}",
        scope=Scope.content,
        help="JSON final de la unidad.",
    )

    sdk_view_mode = String(
        default="student",
        scope=Scope.settings,
        help=(
            "Solo para pruebas en XBlock SDK. "
            "Valores permitidos: student, studio."
        ),
    )

    def student_view(self, context=None):
        """
        Renderiza la vista minima para LMS/alumno.

        En XBlock SDK, el escenario Studio usa sdk_view_mode='studio'
        porque Workbench renderiza student_view por defecto.
        """
        if self._is_sdk_studio_mode():
            return self.studio_view(context)

        fragment = Fragment(read_static_text(STUDENT_HTML_PATH))
        self._add_css_resources(fragment, STUDENT_CSS_PATHS)
        self._add_js_resources(fragment, STUDENT_JS_PATHS)
        return fragment

    def studio_view(self, context=None):
        """
        Renderiza la vista minima para Studio/docente.
        """
        fragment = Fragment(read_static_text(STUDIO_HTML_PATH))
        self._add_css_resources(fragment, STUDIO_CSS_PATHS)
        self._add_js_resources(fragment, STUDIO_JS_PATHS)
        return fragment

    def _is_sdk_studio_mode(self):
        """
        Indica si el escenario del SDK debe mostrar la vista Studio.
        """
        return str(self.sdk_view_mode).strip().lower() == "studio"

    @staticmethod
    def _add_css_resources(fragment, resource_paths):
        """
        Agrega recursos CSS al fragmento en el orden recibido.
        """
        for resource_path in resource_paths:
            fragment.add_css(read_static_text(resource_path))

    @staticmethod
    def _add_js_resources(fragment, resource_paths):
        """
        Agrega recursos JavaScript al fragmento en el orden recibido.
        """
        for resource_path in resource_paths:
            fragment.add_javascript(read_static_text(resource_path))

    @staticmethod
    def workbench_scenarios():
        """
        Escenarios para probar el XBlock en XBlock SDK.
        """
        return [
            (
                "IA Assistant - Student minimo",
                """
                <ia_assistant sdk_view_mode="student"/>
                """,
            ),
            (
                "IA Assistant - Studio SDK",
                """
                <ia_assistant sdk_view_mode="studio"/>
                """,
            ),
        ]

    @XBlock.json_handler
    def save_unit(self, data, suffix=""):
        """
        Handler minimo para guardar datos.
        """
        self.prompt_docente = data.get("prompt_docente", "")
        self.unidad_json = data.get("unidad_json", "{}")

        return {
            "success": True,
            "message": "Unidad guardada correctamente.",
        }
