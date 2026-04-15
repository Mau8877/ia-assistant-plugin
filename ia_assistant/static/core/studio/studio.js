function STUDIO_DOCENTE_INIT(runtime, element) {

    // GUARD: verificación temprana para detectar problemas de orden de carga
    if (typeof EDITOR_UNIDAD === 'undefined') {
        console.error(
            '[STUDIO_DOCENTE_INIT] ERROR CRÍTICO: EDITOR_UNIDAD no está definido. ' +
            'Verificá que editor_unidad.js se carga ANTES que studio_docente_init.js ' +
            'en el método js_urls() de tu XBlock Python.'
        );
        return; // Salida segura: no continuar para evitar errores en cascada
    }

    if (typeof GENERADOR_UNIDAD === 'undefined') {
        console.error(
            '[STUDIO_DOCENTE_INIT] ERROR CRÍTICO: GENERADOR_UNIDAD no está definido. ' +
            'Verificá que generador_unidad.js se carga ANTES que studio_docente_init.js.'
        );
        return;
    }

    // 1. Definición de rutas hacia los handlers Python del XBlock
    var HANDLER_LLAMAR_IA = runtime.handlerUrl(element, 'generar_borrador_ia');
    var HANDLER_GUARDAR_UNIDAD = runtime.handlerUrl(element, 'guardar_unidad_editada');

    // 2. Instanciación del Módulo Editor
    var EDITOR = new EDITOR_UNIDAD(element, HANDLER_GUARDAR_UNIDAD);

    // 3. Instanciación del Módulo Generador con los callbacks del Editor inyectados
    var GENERADOR = new GENERADOR_UNIDAD(element, HANDLER_LLAMAR_IA, {
        onStart: function () {
            EDITOR.OCULTAR_MENSAJES();
            $('#btn-guardar-final', element).prop('disabled', true);
        },
        onSuccess: function (jsonCrudo) {
            EDITOR.PROCESAR_NUEVO_JSON(jsonCrudo);
        },
        onError: function (mensaje) {
            EDITOR.MOSTRAR_ERROR(mensaje);
        }
    });

    // Inicializar íconos Lucide si están disponibles
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }

    console.log('[SISTEMA] Módulos de Studio inicializados y conectados correctamente.');
}
