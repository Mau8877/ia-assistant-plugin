function STUDIO_DOCENTE_INIT(runtime, element, data) {
  // Asegurarnos de que el objeto base existe antes de preguntar por sus hijos
  window.IA_Components = window.IA_Components || {};

  // 🌟 Guardamos las plantillas HTML en el namespace global
  window.IA_Components.Templates = data.templates || {};

  // GUARD: verificación temprana apuntando al nuevo namespace
  if (typeof window.IA_Components.EDITOR_UNIDAD === "undefined") {
    console.error(
      "[STUDIO_DOCENTE_INIT] ERROR CRÍTICO: EDITOR_UNIDAD no está definido en IA_Components. " +
        "Verificá que editor_unidad.js se carga ANTES que studio_docente_init.js " +
        "en el método js_urls() de tu XBlock Python.",
    );
    return; // Salida segura
  }

  if (typeof window.IA_Components.GENERADOR_UNIDAD === "undefined") {
    console.error(
      "[STUDIO_DOCENTE_INIT] ERROR CRÍTICO: GENERADOR_UNIDAD no está definido en IA_Components. " +
        "Verificá que generador_unidad.js se carga ANTES que studio_docente_init.js.",
    );
    return;
  }

  // 1. Definición de rutas hacia los handlers Python del XBlock
  var HANDLER_LLAMAR_IA = runtime.handlerUrl(element, "generar_borrador_ia");
  var HANDLER_GUARDAR_UNIDAD = runtime.handlerUrl(
    element,
    "guardar_unidad_editada",
  );

  var jsonInicial = data.json_guardado;

  // 2. Instanciación del Módulo Editor (le pasamos el JSON como tercer parámetro)
  var EDITOR = new window.IA_Components.EDITOR_UNIDAD(
    element,
    HANDLER_GUARDAR_UNIDAD,
    jsonInicial,
  );

  // 3. Instanciación del Módulo Generador (Llamando al Namespace)
  var GENERADOR = new window.IA_Components.GENERADOR_UNIDAD(
    element,
    HANDLER_LLAMAR_IA,
    {
      onStart: function () {
        EDITOR.OCULTAR_MENSAJES();
        $("#btn-guardar-final", element).prop("disabled", true);
      },
      onSuccess: function (jsonCrudo) {
        EDITOR.PROCESAR_NUEVO_JSON(jsonCrudo);
      },
      onError: function (mensaje) {
        EDITOR.MOSTRAR_ERROR(mensaje);
      },
    },
  );

  // Inicializar íconos Lucide si están disponibles
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }

  console.log(
    "[SISTEMA] Módulos de Studio inicializados y conectados correctamente.",
  );
}
