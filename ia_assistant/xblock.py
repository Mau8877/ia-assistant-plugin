from xblock.core import XBlock
from xblock.fields import Scope, String
from web_fragments.fragment import Fragment

from .utils.resources import read_static_text


STUDIO_HTML_PATH = "studio/html/studio.html"
STUDENT_HTML_PATH = "student/html/student.html"

STUDIO_CSS_PATHS = [
    "common/css/tokens.css",
    "common/css/components.css",
    "studio/css/studio.css",
    "studio/css/layout.css",
    "studio/css/forms.css",
]

STUDIO_JS_PATHS = [
    "common/js/namespace.js",
    "common/js/utils.js",
    "common/js/registry.js",
    "common/components/teoria/teoria.definition.js",
    "common/components/quiz_multiple/quiz_multiple.definition.js",
    "common/components/pregunta_abierta/pregunta_abierta.definition.js",
    "common/components/codigo/codigo.definition.js",
    "common/components/revision/revision.definition.js",
    "studio/js/state.js",
    "studio/js/dom.js",
    "studio/js/api.js",
    "studio/js/messages.js",
    "studio/js/renderer.js",
    "studio/js/events.js",
    "studio/widgets/chatbar_ia/chatbar_ia.js",
    "studio/widgets/component_picker/component_picker.js",
    "studio/widgets/component_tabs/component_tabs.js",
    "studio/components/teoria/teoria_editor.js",
    "studio/components/quiz_multiple/quiz_multiple_editor.js",
    "studio/components/pregunta_abierta/pregunta_abierta_editor.js",
    "studio/components/codigo/codigo_editor.js",
    "studio/components/revision/revision_editor.js",
    "studio/js/studio.js",
]

STUDENT_CSS_PATHS = [
    "common/css/tokens.css",
    "common/css/components.css",
    "student/css/student.css",
]

STUDENT_JS_PATHS = [
    "common/js/namespace.js",
    "common/js/utils.js",
    "common/js/registry.js",
    "common/components/teoria/teoria.definition.js",
    "common/components/quiz_multiple/quiz_multiple.definition.js",
    "common/components/pregunta_abierta/pregunta_abierta.definition.js",
    "common/components/codigo/codigo.definition.js",
    "common/components/revision/revision.definition.js",
    "student/js/state.js",
    "student/js/dom.js",
    "student/js/renderer.js",
    "student/js/events.js",
    "student/components/teoria/teoria_player.js",
    "student/components/quiz_multiple/quiz_multiple_player.js",
    "student/components/pregunta_abierta/pregunta_abierta_player.js",
    "student/components/codigo/codigo_player.js",
    "student/components/revision/revision_player.js",
    "student/js/student.js",
]


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
