// archivo: static/components/revision/revision.js
(function() {
    window.IA_Components = window.IA_Components || {};
    window.IA_Components.Revision = window.IA_Components.Revision || {};

    function escaparHTML(texto) {
        var div = document.createElement('div');
        div.innerText = texto;
        return div.innerHTML;
    }

    function construirTarjeta(tipo, enunciado, respuesta, clasesExtra) {
        return `
            <div class="rev-card">
                <span class="rev-tipo">${tipo}</span>
                <div class="rev-enunciado">${enunciado}</div>
                <div class="rev-respuesta ${clasesExtra}">${respuesta}</div>
            </div>
        `;
    }

    // --- 1. RESUMEN PRE-ENVÍO ---
    window.IA_Components.Revision.generarResumen = function($el) {
        var $contenedor = $el.find('#revision-dinamica');
        var htmlFinal = "";

        // 1. Quizzes
        $el.find('.ia-comp-quiz .ia-pregunta').each(function() {
            var $q = $(this);
            var enunciado = $q.find('h4').text();
            var $seleccionada = $q.find('input:checked');
            var respuestaTexto = $seleccionada.length > 0 ? escaparHTML($seleccionada.parent().text().trim()) : "Sin responder";
            var clases = $seleccionada.length > 0 ? "" : "es-vacio";
            htmlFinal += construirTarjeta("Quiz", enunciado, respuestaTexto, clases);
        });

        // 2. Abiertas
        $el.find('.ia-comp-abierta').each(function() {
            var $a = $(this);
            var enunciado = $a.find('.ia-abierta-enunciado').html();
            var textoAlumno = $a.find('.respuesta-alumno').val();
            textoAlumno = textoAlumno ? textoAlumno.trim() : "";
            
            var respuestaTexto = textoAlumno.length > 0 ? escaparHTML(textoAlumno) : "Sin responder";
            var clases = textoAlumno.length > 0 ? "" : "es-vacio";
            htmlFinal += construirTarjeta("Pregunta de Análisis", enunciado, respuestaTexto, clases);
        });

        // 3. Código
        $el.find('.ia-comp-codigo').each(function() {
            var $c = $(this);
            var enunciado = $c.find('.enunciado-codigo').html() || "Reto de Código"; 
            var $textarea = $c.find('.code-input');
            
            var textoAlumno = $textarea.val() || "";
            var textoOriginal = $textarea[0].defaultValue || "";
            
            // Verificamos si el alumno no tocó el código inicial o lo borró todo
            var noModificado = (textoAlumno.trim() === "" || textoAlumno.trim() === textoOriginal.trim());
            
            // A diferencia de las abiertas, AQUÍ SIEMPRE MOSTRAMOS EL CÓDIGO (sea el base o el modificado)
            var respuestaTexto = textoAlumno.trim() !== "" ? escaparHTML(textoAlumno) : "Editor vacío";
            
            // Si no modificó el template, aplicamos el fondo rojo de alerta (es-vacio) pero mantenemos la fuente de código
            var clases = noModificado ? "es-vacio es-codigo" : "es-codigo";
            
            htmlFinal += construirTarjeta("Reto de Código", enunciado, respuestaTexto, clases);
        });

        if (htmlFinal === "") htmlFinal = '<div class="empty-state">No hay componentes evaluables.</div>';
        $contenedor.html(htmlFinal);
    };

    // --- 2. FEEDBACK POST-ENVÍO ---
    window.IA_Components.Revision.pintarFeedbackFinal = function($el, data) {
        var $feedbackArea = $el.find('#master-feedback');
        var notaFinalFormateada = parseFloat(data.nota).toFixed(2);
        
        // Cabecera con la calificación final
        var html = `<div class="final-score"><h4>Calificación Final: ${notaFinalFormateada}/100</h4></div>`;

        // Generar las tarjetas para cada componente evaluado
        data.feedback.forEach(function(item) {
            var notaItemFormateada = parseFloat(item.nota).toFixed(2);
            var claseBorde = item.nota >= 51 ? 'fb-good' : 'fb-bad';

            html += `
                <div class="ia-feedback-card ${claseBorde}">
                    <div class="fb-card-header">
                        <b>${item.tipo} (${notaItemFormateada}/100)</b>
                    </div>
                    <i>${item.enunciado || 'Evaluación de componente'}</i>
                    <p><b>Sistema:</b> ${item.detalle}</p> 
                </div>`;
        });

        // Inyectar y mostrar en el contenedor final
        $feedbackArea.html(html).fadeIn();
    };
})();