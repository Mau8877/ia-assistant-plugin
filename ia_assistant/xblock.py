import json

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
from .schema import COMPONENT_TYPES, UNIT_SCHEMA_VERSION, get_default_unit
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

        initial_unit, load_warning = self._get_initial_unit()
        fragment = Fragment(read_static_text(STUDENT_HTML_PATH))
        self._add_css_resources(fragment, STUDENT_CSS_PATHS)
        self._add_js_resources(fragment, STUDENT_JS_PATHS)
        fragment.initialize_js(
            "IAAssistantStudent",
            {
                "initial_unit": initial_unit,
                "load_warning": load_warning,
            },
        )
        return fragment

    def studio_view(self, context=None):
        """
        Renderiza la vista minima para Studio/docente.
        """
        initial_unit, load_warning = self._get_initial_unit()
        fragment = Fragment(read_static_text(STUDIO_HTML_PATH))
        self._add_css_resources(fragment, STUDIO_CSS_PATHS)
        self._add_js_resources(fragment, STUDIO_JS_PATHS)
        fragment.initialize_js(
            "IAAssistantStudio",
            {
                "initial_unit": initial_unit,
                "load_warning": load_warning,
            },
        )
        return fragment

    def _is_sdk_studio_mode(self):
        """
        Indica si el escenario del SDK debe mostrar la vista Studio.
        """
        return str(self.sdk_view_mode).strip().lower() == "studio"

    def _get_initial_unit(self):
        """
        Devuelve una unidad inicial segura para hidratar Studio.
        """
        raw_unit = self.unidad_json

        if not raw_unit or str(raw_unit).strip() in ("", "{}"):
            return get_default_unit(), ""

        try:
            unit = json.loads(raw_unit)
        except (TypeError, ValueError):
            return (
                get_default_unit(),
                "No se pudo cargar la unidad guardada. Se inicio una unidad vacia.",
            )

        if not self._is_valid_unit(unit):
            return (
                get_default_unit(),
                "La unidad guardada no tiene un formato valido. Se inicio una unidad vacia.",
            )

        return unit, ""

    @staticmethod
    def _is_non_empty_string(value):
        return isinstance(value, str) and bool(value.strip())

    @classmethod
    def _is_valid_unit(cls, unit):
        """
        Valida la estructura minima persistible de una unidad.
        """
        if not isinstance(unit, dict):
            return False

        if unit.get("version") != UNIT_SCHEMA_VERSION:
            return False

        if not isinstance(unit.get("titulo"), str):
            return False

        components = unit.get("componentes")

        if not isinstance(components, list):
            return False

        for component in components:
            if not cls._is_valid_component(component):
                return False

        return True

    @classmethod
    def _is_valid_component(cls, component):
        if not isinstance(component, dict):
            return False

        component_type = component.get("tipo")
        component_data = component.get("data")

        if not cls._is_non_empty_string(component.get("id")):
            return False

        if not cls._is_non_empty_string(component_type):
            return False

        if component_type not in COMPONENT_TYPES:
            return False

        if not isinstance(component.get("nombre"), str):
            return False

        if not isinstance(component_data, dict):
            return False

        if (
            component_type == "teoria" and
            component_data.get("formato") != "markdown"
        ):
            return False

        return True

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
                "IA Assistant - Studio SDK",
                """
                <ia_assistant sdk_view_mode="studio"/>
                """,
            ),
        ]

    @XBlock.json_handler
    def save_unit(self, data, suffix=""):
        """
        Guarda la unidad de Studio en unidad_json.
        """
        payload = data or {}
        unit = payload.get("unit")

        if unit is None and "unidad_json" in payload:
            try:
                unit = json.loads(payload.get("unidad_json") or "{}")
            except (TypeError, ValueError):
                unit = None

        if not self._is_valid_unit(unit):
            return {
                "ok": False,
                "success": False,
                "error": "La unidad no tiene un formato valido.",
            }

        if "prompt_docente" in payload:
            self.prompt_docente = payload.get("prompt_docente") or ""

        self.unidad_json = json.dumps(unit, ensure_ascii=False)

        return {
            "ok": True,
            "success": True,
            "message": "Unidad guardada correctamente.",
            "unit": unit,
        }
