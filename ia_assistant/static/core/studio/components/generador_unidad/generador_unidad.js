/* components/generador_unidad/generador_unidad.js */

class GENERADOR_UNIDAD {
    constructor(element, handlerLlamar, callbacks) {
        this.ELEMENT = element;
        this.HANDLER_LLAMAR = handlerLlamar;
        
        // El generador no sabe qué se hará con los datos, solo los pasa.
        this.ON_SUCCESS = callbacks.onSuccess; 
        this.ON_ERROR = callbacks.onError;
        this.ON_START = callbacks.onStart;

        this.INICIALIZAR_EVENTOS();
    }

    INICIALIZAR_EVENTOS() {
        $('#btn-generar', this.ELEMENT).click((e) => {
            e.preventDefault();
            this.EJECUTAR_PETICION_IA($(e.currentTarget));
        });
    }

    EJECUTAR_PETICION_IA($btn) {
        let prompt_texto = $('#prompt-input', this.ELEMENT).val().trim();
        
        if (prompt_texto === '') { 
            this.ON_ERROR('El prompt no puede estar vacío.'); 
            return; 
        }

        let originalText = $btn.find('.btn-text').text();
        
        // Bloquear UI e iniciar simulación
        $btn.prop('disabled', true);
        if(this.ON_START) this.ON_START(); // Avisamos al orquestador que empezamos
        
        let intervalo = this.INICIAR_SIMULADOR_PROGRESO($btn);
        
        $.ajax({
            type: "POST",
            url: this.HANDLER_LLAMAR,
            data: JSON.stringify({"prompt": prompt_texto}),
            timeout: 180000, // 3 MINUTOS MAXIMO
            success: (data) => {
                clearInterval(intervalo); 
                this.RESTAURAR_BOTON($btn, originalText);
                
                if (data.resultado === 'ok') {
                    // Misión cumplida: Pasamos el JSON al Orquestador
                    this.ON_SUCCESS(data.contenido_crudo); 
                } else {
                    this.ON_ERROR(data.mensaje);
                }
            },
            error: (xhr, status, error) => {
                clearInterval(intervalo); 
                this.RESTAURAR_BOTON($btn, originalText);
                
                if (status === "timeout") {
                    this.ON_ERROR('TIMEOUT: La IA tardó más de 3 minutos. Intenta con un tema más específico.');
                } else {
                    this.ON_ERROR('Error de conexión: ' + error);
                }
            }
        });
    }

    INICIAR_SIMULADOR_PROGRESO($btn) {
        let PASOS_CARGA = [
            'Conectando...',
            'Realizando ultimos ajustes...'
        ];
        let PASO_ACTUAL = 0;
        $btn.find('.btn-text').text(PASOS_CARGA[0]);
        
        return setInterval(() => {
            PASO_ACTUAL++;
            if(PASO_ACTUAL < PASOS_CARGA.length) {
                $btn.find('.btn-text').text(PASOS_CARGA[PASO_ACTUAL]);
            }
        }, 10000);
    }

    RESTAURAR_BOTON($btn, texto) {
        $btn.prop('disabled', false);
        $btn.find('.btn-text').text(texto);
    }
}