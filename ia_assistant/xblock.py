from xblock.core import XBlock
from xblock.fields import Boolean, Scope, String
from web_fragments.fragment import Fragment


class IAAssistantXBlock(XBlock):
    """
    IA Assistant XBlock.

    Versión mínima inicial para validar que el plugin:
    - instala correctamente
    - puede ser importado por el SDK
    - expone student_view y studio_view
    - permite probar Studio desde XBlock SDK sin romper LMS
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
        help="JSON final de la unidad generada por IA.",
    )

    sdk_force_studio_view = Boolean(
        default=False,
        scope=Scope.settings,
        help=(
            "Solo para pruebas en XBlock SDK. "
            "Si está activo, student_view renderiza studio_view."
        ),
    )

    def student_view(self, context=None):
        """
        Vista mínima para LMS/alumno.

        En producción, esta vista NO debe mostrar la interfaz docente.

        En XBlock SDK, como el Workbench renderiza student_view por defecto,
        usamos sdk_force_studio_view=True en un escenario especial para poder
        probar la pantalla de Studio localmente.
        """
        if self.sdk_force_studio_view:
            return self.studio_view(context)

        html = """
        <div class="ia-assistant-student">
            <h3>IA Assistant</h3>
            <p>Vista de alumno pendiente de implementación.</p>
        </div>
        """

        return Fragment(html)

    def studio_view(self, context=None):
        """
        Vista mínima para Studio/docente.

        Esta será la primera parte real que vamos a desarrollar.
        Por ahora solo confirma que la vista docente carga correctamente.
        """
        html = """
        <div class="ia-assistant-studio">
            <h2>IA Assistant - Studio</h2>

            <p>
                Plugin cargado correctamente en modo docente.
            </p>

            <div>
                <label for="ia-assistant-prompt">
                    Prompt del docente
                </label>

                <textarea
                    id="ia-assistant-prompt"
                    style="width: 100%; min-height: 120px;"
                    placeholder="Escribe aquí el prompt para generar la unidad..."
                ></textarea>
            </div>

            <br>

            <div>
                <button type="button">
                    Generar unidad
                </button>
            </div>
        </div>
        """

        return Fragment(html)

    @staticmethod
    def workbench_scenarios():
        """
        Escenarios para probar el XBlock en XBlock SDK.

        El SDK renderiza student_view por defecto.
        Por eso el segundo escenario activa sdk_force_studio_view,
        para poder ver la interfaz docente localmente.
        """
        return [
            (
                "IA Assistant - Student mínimo",
                """
                <ia_assistant/>
                """,
            ),
            (
                "IA Assistant - Studio SDK",
                """
                <ia_assistant sdk_force_studio_view="true"/>
                """,
            ),
        ]

    @XBlock.json_handler
    def save_unit(self, data, suffix=""):
        """
        Handler mínimo para guardar datos.

        Más adelante aquí validaremos y guardaremos unidad_json.
        """
        self.prompt_docente = data.get("prompt_docente", "")
        self.unidad_json = data.get("unidad_json", "{}")

        return {
            "success": True,
            "message": "Unidad guardada correctamente.",
        }
