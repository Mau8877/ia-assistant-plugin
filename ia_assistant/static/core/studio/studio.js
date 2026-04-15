function STUDIO_DOCENTE_INIT(runtime, element) {

    var MAX_ESPERA_MS = 5000;
    var INTERVALO_MS  = 50;
    var transcurrido  = 0;

    function _intentar_inicializar() {

        // ¿Las clases ya están disponibles en el scope global?
        if (typeof EDITOR_UNIDAD === 'undefined' || typeof GENERADOR_UNIDAD === 'undefined') {

            transcurrido += INTERVALO_MS;

            if (transcurrido >= MAX_ESPERA_MS) {
                console.error(
                    '[STUDIO_DOCENTE_INIT] TIMEOUT: Las clases EDITOR_UNIDAD / GENERADOR_UNIDAD ' +
                    'no se cargaron en ' + MAX_ESPERA_MS + 'ms. ' +
                    'Revisá que los archivos JS llegan al navegador (pestaña Network del DevTools).'
                );
                return; // Abort limpio
            }

            // Reintentar en el próximo tick
            setTimeout(_intentar_inicializar, INTERVALO_MS);
            return;
        }

        // ── Todo listo, proceder ─────────────────────────────────────────

        // Verificar que el elemento del XBlock existe en el DOM
        // (fix del segundo error: "xblockElement is empty or not defined")
        if (!element || $(element).length === 0) {
            console.error('[STUDIO_DOCENTE_INIT] ERROR: el elemento del XBlock no está en el DOM todavía.');
            return;
        }

        // 1. Rutas a los handlers Python del XBlock
        var HANDLER_LLAMAR_IA      = runtime.handlerUrl(element, 'generar_borrador_ia');
        var HANDLER_GUARDAR_UNIDAD = runtime.handlerUrl(element, 'guardar_unidad_editada');

        // 2. Instanciar el Editor
        var EDITOR = new EDITOR_UNIDAD(element, HANDLER_GUARDAR_UNIDAD);

        // 3. Instanciar el Generador con los callbacks del Editor inyectados
        var GENERADOR = new GENERADOR_UNIDAD(element, HANDLER_LLAMAR_IA, {
            onStart: function() {
                EDITOR.OCULTAR_MENSAJES();
                $('#btn-guardar-final', element).prop('disabled', true);
            },
            onSuccess: function(jsonCrudo) {
                EDITOR.PROCESAR_NUEVO_JSON(jsonCrudo);
            },
            onError: function(mensaje) {
                EDITOR.MOSTRAR_ERROR(mensaje);
            }
        });

        // 4. Íconos Lucide (opcional, no bloquea si no está)
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        console.log('[SISTEMA] Módulos de Studio inicializados correctamente.');
    }

    // Primer intento diferido: le da un tick al DOM de Open edX para montarse
    setTimeout(_intentar_inicializar, 0);
}
