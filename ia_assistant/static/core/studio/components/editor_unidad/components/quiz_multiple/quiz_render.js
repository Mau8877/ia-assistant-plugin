window.IA_Components = window.IA_Components || {};
window.IA_Components.Renderers = window.IA_Components.Renderers || {};

window.IA_Components.Renderers.quiz_multiple = function (comp, ESC, idx) {
  let template = window.IA_Components.Templates.quiz_multiple;

  if (!template) {
    console.error("Falta la plantilla HTML para Quiz");
    return `<div class="error">Error: Plantilla quiz no encontrada</div>`;
  }

  let preguntasHtml = "";

  // Generamos las preguntas y sus opciones
  if (comp.preguntas && comp.preguntas.length > 0) {
    comp.preguntas.forEach((q, qIdx) => {
      // 1. Mapeamos las opciones (Nietos)
      let opcionesHtml = q.opciones
        .map(
          (opt, oIdx) => `
                <div style="display:flex; gap:10px; margin-bottom:5px; align-items: center;">
                    <input type="radio" name="correcta_${idx}_${qIdx}" value="${oIdx}" ${q.correcta === oIdx ? "checked" : ""}>
                    <input type="text" class="form-control d-opcion" value="${ESC(opt)}">
                </div>
            `,
        )
        .join("");

      // 2. Armamos la pregunta (Hijo)
      preguntasHtml += `
                <div class="q-block">
                    <div class="form-group" style="margin-bottom: 10px;">
                        <label>Enunciado de la Pregunta ${qIdx + 1}</label>
                        <input type="text" class="form-control d-enunciado" value="${ESC(q.enunciado)}">
                    </div>
                    <div class="quiz-options">
                        <label>Opciones (Marca el círculo de la correcta):</label>
                        ${opcionesHtml}
                    </div>
                </div>`;
    });
  }

  // 3. Inyectamos todo en el Chasis (Padre)
  return template
    .replace(/__ID__/g, ESC(comp.id))
    .replace(/__PREGUNTAS_HTML__/g, preguntasHtml);
};
