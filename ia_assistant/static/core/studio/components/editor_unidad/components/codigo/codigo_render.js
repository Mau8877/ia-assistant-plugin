window.IA_Components = window.IA_Components || {};
window.IA_Components.Renderers = window.IA_Components.Renderers || {};

window.IA_Components.Renderers.codigo = function (comp, ESC) {
  let template = window.IA_Components.Templates.codigo;
  let specs = comp.especificaciones || {};

  if (!template) {
    console.error("Falta la plantilla HTML para Código");
    return `<div class="error">Error: Plantilla codigo no encontrada</div>`;
  }

  return template
    .replace(/__ID__/g, ESC(comp.id))
    .replace(/__ENUNCIADO__/g, ESC(comp.enunciado || ""))
    .replace(/__LENGUAJE__/g, ESC(comp.lenguaje || "python"))
    .replace(/__ENTRADA__/g, ESC(specs.entrada_esperada || ""))
    .replace(/__SALIDA__/g, ESC(specs.salida_esperada || ""))
    .replace(/__CODIGO_INICIAL__/g, ESC(comp.codigo_inicial || ""))
    .replace(/__PUNTOS_CLAVE__/g, ESC(comp.puntos_clave || ""));
};
