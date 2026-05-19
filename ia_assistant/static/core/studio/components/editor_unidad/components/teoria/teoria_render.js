window.IA_Components = window.IA_Components || {};
window.IA_Components.Renderers = window.IA_Components.Renderers || {};

window.IA_Components.Renderers.teoria = function (comp, ESC) {
  // 1. Obtenemos el HTML puro que Python nos inyectó en la memoria global
  let template = window.IA_Components.Templates.teoria;

  // 2. Si por alguna razón no cargó, devolvemos un error visible
  if (!template) {
    console.error("Falta la plantilla HTML para Teoría");
    return `<div class="error">Error: Plantilla teoría no encontrada</div>`;
  }

  // 3. Reemplazamos los comodines con la data y la función de escape
  return template
    .replace(/__ID__/g, ESC(comp.id))
    .replace(/__CONTENIDO__/g, comp.contenido_html || "");
};
