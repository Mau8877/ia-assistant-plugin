function StudioDocenteInit(runtime, element) {
    var handlerUrl = runtime.handlerUrl(element, 'guardar_prompt');
    
    $('#btn-generar', element).click(function(eventObject) {
        eventObject.preventDefault();
        
        var $btn = $(this);
        var prompt_texto = $('#prompt-input', element).val().trim();
        
        if (prompt_texto === '') {
            $('#mensaje-error .error-texto', element).text('El prompt no puede estar vacío. Dale instrucciones a Afrodita.');
            $('#mensaje-estado', element).hide();
            $('#mensaje-error', element).slideDown(200);
            return;
        }

        // Estado de carga
        var originalText = $btn.find('.btn-text').text();
        $btn.prop('disabled', true).addClass('btn-loading');
        $btn.find('.btn-icon').text('⏳');
        $btn.find('.btn-text').text('Generando con IA...');
        
        $('#mensaje-error', element).slideUp(200);
        $('#mensaje-estado', element).slideUp(200);
        
        $.ajax({
            type: "POST",
            url: handlerUrl,
            data: JSON.stringify({"prompt": prompt_texto}),
            success: function(data) {
                // Restaurar botón
                $btn.prop('disabled', false).removeClass('btn-loading');
                $btn.find('.btn-icon').text('✨');
                $btn.find('.btn-text').text(originalText);

                if (data.resultado === 'ok') {
                    $('#mensaje-estado', element).slideDown(300);
                    // Opcional: Ocultar el éxito después de unos segundos
                    setTimeout(function() {
                        $('#mensaje-estado', element).slideUp(300);
                    }, 6000);
                } else {
                    $('#mensaje-error .error-texto', element).text(data.mensaje);
                    $('#mensaje-error', element).slideDown(300);
                }
            },
            error: function() {
                // Restaurar botón
                $btn.prop('disabled', false).removeClass('btn-loading');
                $btn.find('.btn-icon').text('✨');
                $btn.find('.btn-text').text(originalText);
                
                $('#mensaje-error .error-texto', element).text('Error de conexión con el servidor. Por favor, intenta de nuevo.');
                $('#mensaje-error', element).slideDown(300);
            }
        });
    });
}