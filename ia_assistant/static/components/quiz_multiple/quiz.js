window.IA_Components = window.IA_Components || {};

window.IA_Components.evaluarQuiz = function(element) {
    var correctas = 0;
    var total = 0;
    
    $('.ia-pregunta', element).each(function() {
        total++;
        var qElem = $(this);
        
        // FORZAMOS A STRING PARA EVITAR ERRORES DE TIPO
        var correctaIdx = String(qElem.attr('data-correcta')); 
        var seleccionadaIdx = qElem.find('input[type="radio"]:checked').val();
        
        qElem.removeClass('is-correct is-incorrect');

        if (seleccionadaIdx === undefined) {
            qElem.addClass('is-incorrect');
        } 
        // USAMOS == O FORZAMOS String(seleccionadaIdx)
        else if (String(seleccionadaIdx) === correctaIdx) {
            correctas++;
            qElem.addClass('is-correct');
        } else {
            qElem.addClass('is-incorrect');
        }
    });
    
    return {
        total: total,
        correctas: correctas,
        puntaje: total > 0 ? (correctas / total) * 100 : 0
    };
};