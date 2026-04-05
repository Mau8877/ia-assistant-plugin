function StudentMasterInit(runtime, element) {
    var $el = $(element);
    var startTime = Date.now();
    
    // Rutas de comunicación con Python
    var handlerUrl = runtime.handlerUrl(element, 'calificar_unidad');
    var saveHandlerUrl = runtime.handlerUrl(element, 'guardar_progreso');

    function obtenerDataRespuestas() {
        var dataFinal = { respuestas_abiertas: [], respuestas_codigo: [] };

        // 1. Quizzes (Solo recolecta si la IA realmente generó uno)
        var $compQuiz = $el.find('.ia-comp-quiz');
        if ($compQuiz.length > 0) {
            var quizId = $compQuiz.attr('id');
            var correctas = 0; 
            var totalQ = $compQuiz.find('.ia-pregunta').length;
            var selecciones = []; // Guardamos qué marcó para poder restaurarlo
            
            $compQuiz.find('.ia-pregunta').each(function(index) {
                var correcta = String($(this).attr('data-correcta')); 
                var seleccionada = $(this).find('input:checked').val();
                if (seleccionada !== undefined) {
                    if (String(seleccionada) === correcta) correctas++;
                    selecciones.push({ index: index, valor: seleccionada });
                }
            });
            
            var puntajeCrudo = totalQ > 0 ? (correctas / totalQ) * 100 : 0;
            dataFinal.respuestas_quiz = { 
                puntaje: parseFloat(puntajeCrudo.toFixed(2)), 
                detalles: {}, 
                id: quizId,
                selecciones: selecciones // Añadido al paquete de memoria
            };
        }

        // 2. Abiertas
        $el.find('.ia-comp-abierta').each(function() {
            var idVal = $(this).attr('id');
            if (idVal) dataFinal.respuestas_abiertas.push({ id: idVal, texto: $(this).find('.respuesta-alumno').val() });
        });

        // 3. Código
        $el.find('.ia-comp-codigo').each(function() {
            var idVal = $(this).attr('id');
            if (idVal) dataFinal.respuestas_codigo.push({ id: idVal, texto: $(this).find('.code-input').val() });
        });

        return dataFinal;
    }

    // ==========================================
    // SISTEMA DE RESTAURACIÓN DE MEMORIA
    // ==========================================
    function restaurarMemoria() {
        try {
            // 1. Obtener datos de intentos y memoria
            var rawSaved = $el.find('#saved-answers-data').text();
            var intentosAgotados = $el.find('#ia-intentos-data').text().trim() === "true";

            if (rawSaved && rawSaved !== "{}" && rawSaved !== "") {
                var saved = JSON.parse(rawSaved);

                // 2. Restaurar Quizzes
                if (saved.respuestas_quiz && saved.respuestas_quiz.selecciones) {
                    saved.respuestas_quiz.selecciones.forEach(function(sel) {
                        var $q = $el.find('.ia-pregunta').eq(sel.index);
                        if ($q.length > 0) {
                            $q.find('input[value="' + sel.valor + '"]').prop('checked', true);
                        }
                    });
                }

                // 3. Restaurar Abiertas
                if (saved.respuestas_abiertas) {
                    saved.respuestas_abiertas.forEach(function(item) {
                        $el.find('#' + item.id + ' .respuesta-alumno').val(item.texto);
                    });
                }

                // 4. Restaurar Código
                if (saved.respuestas_codigo) {
                    saved.respuestas_codigo.forEach(function(item) {
                        $el.find('#' + item.id + ' .code-input').val(item.texto);
                    });
                }
                console.log("Memoria del estudiante restaurada con éxito.");
            }

            // ==========================================
            // LÓGICA DE BLOQUEO (MODO LECTURA)
            // ==========================================
            if (intentosAgotados) {
                console.log("Intentos agotados: Bloqueando edición de componentes.");
                
                // Bloquea Radios de Quizzes, Textareas de preguntas y el Editor de Código
                $el.find('input[type="radio"]').prop('disabled', true);
                $el.find('.respuesta-alumno').prop('disabled', true);
                $el.find('.code-input').prop('disabled', true);
                
                // Estilo visual de bloqueo para el editor de código
                $el.find('.code-input').css({
                    'background-color': '#1e1e1e', // Mantenemos el color oscuro
                    'cursor': 'not-allowed',
                    'opacity': '0.8'
                });
            }

        } catch (e) {
            console.warn("No se pudo restaurar la memoria:", e);
        }
    }

    // ==========================================
    // BUCLE DE AUTOGUARDADO (Cada 30s)
    // ==========================================
    setInterval(function() {
        var dataActual = obtenerDataRespuestas();
        $.ajax({
            type: "POST",
            url: saveHandlerUrl,
            data: JSON.stringify(dataActual),
            success: function(response) {
                if(response.resultado === 'ok') {
                    var d = new Date();
                    var hora = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
                    $el.find('#save-status').text('✓ Guardado a las ' + hora);
                }
            }
        });
    }, 30000);

    function organizarComponentes() {
        // 1. Verificamos qué componentes existen realmente en el DOM
        var tieneTeoria = $el.find('.ia-comp-teoria').length > 0;
        var tieneQuiz = $el.find('.ia-comp-quiz').length > 0;
        var tieneAbierta = $el.find('.ia-comp-abierta').length > 0;
        var tieneCodigo = $el.find('.ia-comp-codigo').length > 0;

        // 2. Movemos los componentes a sus respectivas pestañas
        if (tieneTeoria) $el.find('.ia-comp-teoria').detach().appendTo($el.find('#tab-teoria'));
        if (tieneQuiz) $el.find('.ia-comp-quiz').detach().appendTo($el.find('#tab-quiz'));
        if (tieneAbierta) $el.find('.ia-comp-abierta').detach().appendTo($el.find('#tab-abierta'));
        if (tieneCodigo) $el.find('.ia-comp-codigo').detach().appendTo($el.find('#tab-codigo'));

        // 3. OCULTAR PESTAÑAS VACÍAS
        if (!tieneTeoria) $el.find('.tab-btn[data-target="tab-teoria"]').hide();
        if (!tieneQuiz) $el.find('.tab-btn[data-target="tab-quiz"]').hide();
        if (!tieneAbierta) $el.find('.tab-btn[data-target="tab-abierta"]').hide();
        if (!tieneCodigo) $el.find('.tab-btn[data-target="tab-codigo"]').hide();

        // 4. Lógica de Pestaña de Revisión (Solo aparece si hay algo que calificar)
        var tieneEvaluables = tieneQuiz || tieneAbierta || tieneCodigo;
        if (!tieneEvaluables) {
            $el.find('.tab-btn[data-target="tab-revision"]').hide();
        }

        // 5. Ocultar los mensajes de "Empty state" en las pestañas que sí tienen contenido
        $el.find('.tab-content').each(function() {
            if ($(this).children().not('.empty-state, h3, #revision-summary, .ia-master-actions, p, hr, #master-feedback, .ia-revision-container').length > 0) {
                $(this).find('.empty-state').hide();
            }
        });

        // 6. AUTO-SELECCIONAR LA PRIMERA PESTAÑA VISIBLE
        $el.find('.tab-btn').removeClass('active');
        $el.find('.tab-content').hide().removeClass('active-content');
        
        var $primeraPestana = $el.find('.tab-btn:visible').first();
        if ($primeraPestana.length > 0) {
            $primeraPestana.addClass('active');
            $el.find('#' + $primeraPestana.data('target')).show().addClass('active-content');
        }
    }

    // --- ACCIÓN DE ENVÍO ---
    $el.find('#btn-enviar-master').click(function() {
        var $btn = $(this);
        var $feedbackArea = $el.find('#master-feedback');
        
        $btn.text('Evaluando...').prop('disabled', true);
        $feedbackArea.hide();

        $.ajax({
            type: "POST",
            url: handlerUrl,
            data: JSON.stringify(obtenerDataRespuestas()),
            success: function(data) {
                $btn.text('Enviar Evaluación Completa').prop('disabled', false);
                
                if (data.resultado === 'ok') {
                    // 1. Limpieza de colores previos en componentes
                    $el.find('.ia-pregunta, .ia-comp-abierta, .ia-comp-codigo, .ia-comp-quiz').removeClass('is-correct is-incorrect');

                    // 2. Aplicar feedback in-situ en las otras pestañas
                    data.feedback.forEach(function(item) {
                        var $target = $el.find('#' + item.id);

                        if ($target.length > 0) {
                            var statusClass = (item.nota >= 51) ? 'is-correct' : 'is-incorrect';
                            $target.addClass(statusClass);

                            // Inyección de feedback in-situ
                            var $fbContainer = $target.find('.feedback-ia');
                            if ($fbContainer.length > 0) {
                                $fbContainer.find('.fb-text').html('<b>Feedback:</b> ' + item.detalle);
                                $fbContainer.removeAttr('style').css({'display': 'block', 'visibility': 'visible', 'opacity': '1'});
                                $fbContainer.hide().fadeIn(600);
                            }

                            // Colorear radios del Quiz
                            if (item.tipo === 'Quiz' || $target.hasClass('ia-comp-quiz')) {
                                $target.find('.ia-pregunta').each(function() {
                                    var $q = $(this);
                                    var correcta = String($q.attr('data-correcta'));
                                    var seleccionada = $q.find('input:checked').val();
                                    $q.removeClass('is-correct is-incorrect');
                                    if (seleccionada !== undefined && String(seleccionada) === correcta) $q.addClass('is-correct');
                                    else $q.addClass('is-incorrect');
                                });
                            }
                        }
                    });

                    // 3. DELEGAR LA PESTAÑA REVISIÓN AL MÓDULO EXTERNO
                    if (window.IA_Components && window.IA_Components.Revision) {
                        window.IA_Components.Revision.pintarFeedbackFinal($el, data);
                    }

                } else {
                    $feedbackArea.html('<p class="error-msg">❌ ' + data.mensaje + '</p>').show();
                }
            },
            error: function(xhr, status, error) {
                $btn.text('Enviar Evaluación Completa').prop('disabled', false);
                $feedbackArea.html('<p class="error-msg">❌ Error de conexión: ' + error + '</p>').show();
            }
        });
    });

    // --- MANEJO DE TABS ---
    $el.find('.tab-btn').on('click', function(e) {
        e.preventDefault();
        var target = $(this).data('target');
        
        $el.find('.tab-btn').removeClass('active');
        $(this).addClass('active');
        
        $el.find('.tab-content').hide();
        $el.find('#' + target).show();
        
        // Llamada al módulo externo para generar el resumen
        if (target === 'tab-revision') {
            if (window.IA_Components && window.IA_Components.Revision) {
                window.IA_Components.Revision.generarResumen($el);
            }
        }
    });

    setInterval(function() {
        var diff = Math.floor((Date.now() - startTime) / 1000);
        var mins = Math.floor(diff / 60).toString().padStart(2, '0');
        var secs = (diff % 60).toString().padStart(2, '0');
        $el.find('#ia-timer').text(mins + ':' + secs);
    }, 1000);

    // INICIALIZACIÓN
    setTimeout(function() {
        organizarComponentes();
        restaurarMemoria();
        
        var intentosAgotados = $el.find('#ia-intentos-data').text().trim() === "true";
        var rawFeedback = $el.find('#ia-feedback-historial').text();

        if (intentosAgotados) {
            var $btnEnvio = $el.find('#btn-enviar-master');
            $btnEnvio.text('Evaluación ya enviada').prop('disabled', true).css('background-color', '#6c757d');
            
            if (rawFeedback && rawFeedback !== "{}" && rawFeedback !== "") {
                var dataFeedback = JSON.parse(rawFeedback);
                if (window.IA_Components && window.IA_Components.Revision) {
                    window.IA_Components.Revision.pintarFeedbackFinal($el, dataFeedback);
                }
            }
        }
    }, 500);
}