import json
import logging
from xblock.core import XBlock
from xblock.fields import Scope, String, Dict, Integer
from xblock.fragment import Fragment

# --- Importaciones de Capas Refactorizadas ---
from .utils.load_resource import load_resource
from .component_manager import renderizar_unidad
from .ia_docente.ia_docente_client import generar_contenido_unidad
from .ia_alumno.evaluator.calcular_nota import calcular_nota_final

# Configuración de logs para el workbench de Django
logger = logging.getLogger(__name__)

class IAAssistantXBlock(XBlock):
    has_score = True
    icon_class = 'problem'

    display_name = String(
        display_name="Nombre a mostrar",
        default="Asistente IA UAGRM",
        scope=Scope.settings,
        help="Nombre del bloque en la plataforma"
    )

    prompt_docente = String(
        default="Genera la unidad sobre...",
        scope=Scope.settings,
        help="El texto que el docente le envía a la IA."
    )

    unidad_json = String(
        default="",
        scope=Scope.content,
        help="JSON estructurado de la unidad."
    )

    # -----------------------------------------------------------------------
    # MEMORIA DEL ESTUDIANTE (AUTOGUARDADO)
    # -----------------------------------------------------------------------
    respuestas_alumno = Dict(
        default={},
        scope=Scope.user_state,
        help="Memoria del estudiante con sus respuestas borrador."
    )

    intentos_realizados = Integer(
        default=0,
        scope=Scope.user_state,
        help="Número de veces que el alumno ha enviado la evaluación."
    )

    feedback_guardado = Dict(
        default={},
        scope=Scope.user_state,
        help="Guarda el feedback detallado de la IA para mostrarlo permanentemente."
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

    @XBlock.json_handler
    def guardar_prompt(self, data, suffix=''):
        """ 
        Handler Ajax que delega la generación a ia_docente_client. 
        """
        nuevo_prompt = data.get('prompt', '')
        self.prompt_docente = nuevo_prompt 

        logger.info(f"IA Assistant: Iniciando generación para docente...")
        
        # Delegación a la lógica de negocio en ia_docente
        resultado = generar_contenido_unidad(nuevo_prompt)

        if resultado['resultado'] == 'ok':
            self.unidad_json = resultado['json_unidad']
            logger.info("IA Assistant: Unidad generada y persistida exitosamente.")
            return {"resultado": "ok", "mensaje": "Unidad generada correctamente."}
        else:
            return resultado

    # -----------------------------------------------------------------------
    # VISTA STUDENT (Interfaz del Alumno)
    # -----------------------------------------------------------------------
    def student_view(self, context=None):
        """ Ensambla dinámicamente los componentes de la unidad. """
        
        #return self.studio_view(context)

        json_crudo = self.unidad_json if self.unidad_json else "{}"
        
        # El component_manager se encarga de convertir JSON -> HTML y listar recursos
        html_componentes, recursos = renderizar_unidad(json_crudo)

        intentos_agotados = "true" if self.intentos_realizados >= 1 else "false"
        html_base = load_resource("static/core/student/student.html").format(
            unidad_id=str(self.scope_ids.usage_id),
            unidad_titulo=recursos.get('titulo', 'Unidad de Aprendizaje'),
            componentes_html=html_componentes,
            unidad_json=json_crudo,
            prompt_debug=self.prompt_docente,
            feedback_historial=json.dumps(self.feedback_guardado) if self.feedback_guardado else "{}",
            intentos_agotados=intentos_agotados,
            respuestas_guardadas=json.dumps(self.respuestas_alumno) if self.respuestas_alumno else "{}"
        )
        
        frag = Fragment(html_base)
        
        # Inyectar dinámicamente CSS/JS de los componentes usados
        for css in recursos.get('css', []): frag.add_css(load_resource(css))
        for js in recursos.get('js', []): frag.add_javascript(load_resource(js))
        
        # Recursos base del "Chasis" del estudiante
        frag.add_css(load_resource("static/core/student/student.css"))
        frag.add_javascript(load_resource("static/core/student/student.js"))
        frag.add_javascript(load_resource("static/components/revision/revision.js"))
        frag.initialize_js('StudentMasterInit')
        
        print(f"DEBUG: El JSON en la base de datos es: {self.unidad_json}")

        return frag

    # -----------------------------------------------------------------------
    # HANDLER DE CALIFICACIÓN
    # -----------------------------------------------------------------------
    @XBlock.json_handler
    def calificar_unidad(self, data, suffix=''):
        """ 
        Recibe las respuestas y delega la evaluación. 
        Solo publica la nota si el proceso fue exitoso.
        """

        MAX_INTENTOS = 1
        if self.intentos_realizados >= MAX_INTENTOS:
            logger.warning("IA Assistant: Alumno intentó enviar de nuevo pero ya agotó sus intentos.")
            return {
                "resultado": "error", 
                "mensaje": "Ya has agotado tus intentos permitidos para esta evaluación."
            }

        logger.info("IA Assistant: Procesando entrega del alumno...")
        resultado = calcular_nota_final(data, self.unidad_json)
        
        # --- BLINDAJE DE LÓGICA ---
        # Solo publicamos la nota si la IA y el evaluador respondieron 'ok'
        if resultado.get('resultado') == 'ok':
            # 2. INCREMENTAR INTENTO SOLO SI TODO SALIÓ BIEN
            self.intentos_realizados += 1 
            self.feedback_guardado = resultado

            nota_final = resultado.get('nota', 0)
            self.runtime.publish(self, 'grade', {
                'value': nota_final / 100.0, 
                'max_value': 1.0
            })
            logger.info(f"IA Assistant: Nota de {nota_final} publicada.")
        else:
            logger.error(f"IA Assistant: Fallo en calificación. Mensaje: {resultado.get('mensaje')}")
        
        return resultado

    # -----------------------------------------------------------------------
    # HANDLER DE AUTOGUARDADO
    # -----------------------------------------------------------------------
    @XBlock.json_handler
    def guardar_progreso(self, data, suffix=''):
        """ Guarda el borrador de las respuestas del alumno en tiempo real. """
        try:
            self.respuestas_alumno = data
            return {"resultado": "ok", "mensaje": "Progreso guardado"}
        except Exception as e:
            logger.error(f"Error al guardar progreso: {str(e)}")
            return {"resultado": "error", "mensaje": str(e)}

    @staticmethod
    def workbench_scenarios():
        """ Escenario para el SDK de XBlock. """
        return [("IA Assistant XBlock", "<ia_assistant/>")]