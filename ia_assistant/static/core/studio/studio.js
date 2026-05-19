function renderLucideIcons(root) {
  try {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      if (root) {
        window.lucide.createIcons({ root: root });
      } else {
        window.lucide.createIcons();
      }
    } else {
      console.warn("[IA Assistant] Lucide no está disponible todavía.");
    }
  } catch (error) {
    console.error("[IA Assistant] Error renderizando iconos Lucide:", error);
  }
}

window.IA_RENDER_LUCIDE_ICONS = renderLucideIcons;
window.renderLucideIcons = renderLucideIcons;

function STUDIO_DOCENTE_INIT(runtime, element, data) {
  window.IA_Components = window.IA_Components || {};
  window.IA_Components.Templates = data.templates || {};

  if (typeof window.IA_Components.EDITOR_UNIDAD === "undefined") {
    console.error(
      "[STUDIO_DOCENTE_INIT] ERROR CRÍTICO: EDITOR_UNIDAD no está definido en IA_Components. " +
        "Verificá que editor_unidad.js se carga ANTES que studio_docente_init.js " +
        "en el método js_urls() de tu XBlock Python.",
    );
    window.IA_RENDER_LUCIDE_ICONS(element);
    return;
  }

  if (typeof window.IA_Components.GENERADOR_UNIDAD === "undefined") {
    console.error(
      "[STUDIO_DOCENTE_INIT] ERROR CRÍTICO: GENERADOR_UNIDAD no está definido en IA_Components. " +
        "Verificá que generador_unidad.js se carga ANTES que studio_docente_init.js.",
    );
    window.IA_RENDER_LUCIDE_ICONS(element);
    return;
  }

  var HANDLER_LLAMAR_IA = runtime.handlerUrl(element, "generar_borrador_ia");
  var HANDLER_GUARDAR_UNIDAD = runtime.handlerUrl(
    element,
    "guardar_unidad_editada",
  );

  var jsonInicial = data.json_guardado;

  var EDITOR = new window.IA_Components.EDITOR_UNIDAD(
    element,
    HANDLER_GUARDAR_UNIDAD,
    jsonInicial,
  );

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

  window.IA_RENDER_LUCIDE_ICONS(element);

  console.log(
    "[SISTEMA] Módulos de Studio inicializados y conectados correctamente.",
  );
}
