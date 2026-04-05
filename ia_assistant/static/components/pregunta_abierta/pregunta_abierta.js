window.IA_Components = window.IA_Components || {};

/**
 * Recolecta todas las respuestas abiertas del elemento dado.
 * Se asegura de limpiar el texto y verificar que el ID exista.
 */
window.IA_Components.obtenerRespuestasAbiertas = function(element) {
    var respuestas = [];
    
    $(element).find('.ia-comp-abierta').each(function() {
        var compId = $(this).attr('id');
        var textoAlumno = $(this).find('.respuesta-alumno').val();

        if (compId) {
            respuestas.push({
                id: compId,
                texto: textoAlumno ? textoAlumno.trim() : ""
            });
        }
    });

    return respuestas;
};