function STUDIO_DOCENTE_INIT(runtime, element) {
    // 1. Definición de Rutas
    var HANDLER_LLAMAR_IA = runtime.handlerUrl(element, 'generar_borrador_ia');
    var HANDLER_GUARDAR_UNIDAD = runtime.handlerUrl(element, 'guardar_unidad_editada');
    
    // 2. Instanciación del Módulo Editor
    var EDITOR = new EDITOR_UNIDAD(element, HANDLER_GUARDAR_UNIDAD);

    // 3. Instanciación del Módulo Generador (Inyectando los Callbacks del Editor)
    var GENERADOR = new GENERADOR_UNIDAD(element, HANDLER_LLAMAR_IA, {
        onStart: function() {
            EDITOR.OCULTAR_MENSAJES();
            $('#btn-guardar-final', element).prop('disabled', true);
        },
        onSuccess: function(jsonCrudo) {
            // Cuando la IA termina, le pasamos el JSON directamente al Editor
            EDITOR.PROCESAR_NUEVO_JSON(jsonCrudo);
        },
        onError: function(mensaje) {
            // Si la IA falla, usamos el sistema de alertas del Editor
            EDITOR.MOSTRAR_ERROR(mensaje);
        }
    });

    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    console.log("[SISTEMA] Módulos de Studio inicializados y conectados correctamente.");
}