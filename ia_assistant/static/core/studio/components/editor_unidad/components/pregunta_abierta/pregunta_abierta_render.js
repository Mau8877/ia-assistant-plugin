window.IA_Components = window.IA_Components || {};
window.IA_Components.Renderers = window.IA_Components.Renderers || {};

window.IA_Components.Renderers.pregunta_abierta = function (comp, ESC) {
  let template = window.IA_Components.Templates.pregunta_abierta;

  if (!template) {
    console.error("Falta la plantilla HTML para Pregunta Abierta");
    return `<div class="error">Error: Plantilla pregunta_abierta no encontrada</div>`;
  }

  return template
    .replace(/__ID__/g, ESC(comp.id))
    .replace(/__ENUNCIADO__/g, ESC(comp.enunciado || ""))
    .replace(/__PUNTOS_CLAVE__/g, ESC(comp.puntos_clave || ""));
};
