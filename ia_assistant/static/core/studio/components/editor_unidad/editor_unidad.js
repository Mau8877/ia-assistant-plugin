
class EDITOR_UNIDAD {
    constructor(element, handlerGuardar) {
        this.ELEMENT = element;
        this.HANDLER_GUARDAR = handlerGuardar;
        this.INICIALIZAR_EVENTOS_TABS();
        this.INICIALIZAR_EVENTO_GUARDAR();

        // FIX #3: defer garantiza que el DOM del XBlock esté listo antes de leer valores
        $.when($.ready).then(() => {
            this.CARGAR_DATOS_EXISTENTES();
        });
    }

    // FIX #1 HELPER: Escapa caracteres que rompen atributos HTML value=""
    _ESC(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    INICIALIZAR_EVENTOS_TABS() {
        $('.main-tab-btn', this.ELEMENT).click((e) => {
            let target = $(e.currentTarget);
            $('.main-tab-btn', this.ELEMENT).removeClass('active');
            $('.main-tab-content', this.ELEMENT).removeClass('active');
            target.addClass('active');
            $('#' + target.data('target'), this.ELEMENT).addClass('active');
        });

        $('.sub-tab-btn', this.ELEMENT).click((e) => {
            e.preventDefault();
            let target = $(e.currentTarget);
            $('.sub-tab-btn', this.ELEMENT).removeClass('active');
            $('.sub-tab-content', this.ELEMENT).removeClass('active-content').hide();
            target.addClass('active');
            $('#' + target.data('target'), this.ELEMENT).show().addClass('active-content');
        });
    }

    INICIALIZAR_EVENTO_GUARDAR() {
        $('#btn-guardar-final', this.ELEMENT).click((e) => {
            e.preventDefault();
            let $btn = $(e.currentTarget);

            let contenido_final = '';
            if ($('#vista-visual', this.ELEMENT).hasClass('active')) {
                contenido_final = this.RECOLECTAR_JSON_DE_PESTANAS();
                $('#contenido-preview', this.ELEMENT).val(contenido_final);
            } else {
                contenido_final = $('#contenido-preview', this.ELEMENT).val();
            }

            let originalText = $btn.find('.btn-text').text();
            this.BLOQUEAR_BOTON($btn, 'Publicando...');
            this.OCULTAR_MENSAJES();

            $.ajax({
                type: 'POST',
                url: this.HANDLER_GUARDAR,
                data: JSON.stringify({ contenido_final: contenido_final }),
                contentType: 'application/json', // FIX: header necesario para Open edX handlers
                success: (data) => {
                    this.RESTAURAR_BOTON($btn, originalText);
                    if (data.resultado === 'ok') {
                        $('#mensaje-estado', this.ELEMENT).slideDown(300);
                        setTimeout(() => { $('#mensaje-estado', this.ELEMENT).slideUp(300); }, 4000);
                    } else {
                        this.MOSTRAR_ERROR(data.mensaje);
                    }
                },
                error: () => {
                    this.RESTAURAR_BOTON($btn, originalText);
                    this.MOSTRAR_ERROR('Error al guardar en la base de datos.');
                }
            });
        });
    }

    PROCESAR_NUEVO_JSON(jsonString) {
        $('#contenido-preview', this.ELEMENT).val(jsonString);
        try {
            let jsonData = JSON.parse(jsonString);
            this.DISTRIBUIR_COMPONENTES_VISUALES(jsonData);
            $('#btn-guardar-final', this.ELEMENT).prop('disabled', false);
        } catch (e) {
            console.error('[EDITOR] Error crítico parseando JSON:', e);
            this.MOSTRAR_ERROR('La IA devolvió contenido, pero el formato visual falló. Usa el Modo Avanzado.');
        }
    }

    DISTRIBUIR_COMPONENTES_VISUALES(data) {
        let el = this.ELEMENT;
        // FIX #1: usar _ESC() en todos los valores interpolados en HTML
        $('#edit-titulo-unidad', el).val(data.titulo_unidad || '');
        $('#edit-teoria, #edit-quiz, #edit-abierta, #edit-codigo', el).empty();

        if (data.componentes) {
            data.componentes.forEach((comp, idx) => {
                let html = `<div class="editor-card comp-block" data-tipo="${comp.tipo}" data-id="${this._ESC(comp.id)}">`;

                if (comp.tipo === 'teoria') {
                    html += `
                        <div class="form-group">
                            <label>Contenido Teórico</label>
                            <div class="quill-container" style="height: 250px; background: #fff;">${comp.contenido_html || ''}</div>
                        </div>`;
                    $('#edit-teoria', el).append(html + '</div>');
                }
                else if (comp.tipo === 'quiz_multiple') {
                    html += `<div class="form-group"><label>Preguntas del Quiz</label>`;
                    comp.preguntas.forEach((q, qIdx) => {
                        html += `
                        <div class="editor-card q-block" style="border-left-color: #cbd5e1;">
                            <div class="form-group">
                                <label>Enunciado de la Pregunta ${qIdx + 1}</label>
                                <input type="text" class="form-control d-enunciado" value="${this._ESC(q.enunciado)}">
                            </div>
                            <div class="quiz-options">
                                <label>Opciones (Marca el círculo de la correcta):</label>
                                ${q.opciones.map((opt, oIdx) => `
                                    <div style="display:flex; gap:10px; margin-bottom:5px;">
                                        <input type="radio" name="correcta_${idx}_${qIdx}" value="${oIdx}" ${q.correcta === oIdx ? 'checked' : ''}>
                                        <input type="text" class="form-control d-opcion" value="${this._ESC(opt)}">
                                    </div>
                                `).join('')}
                            </div>
                        </div>`;
                    });
                    html += `</div>`;
                    $('#edit-quiz', el).append(html + '</div>');
                }
                else if (comp.tipo === 'pregunta_abierta') {
                    html += `
                        <div class="form-group">
                            <label>Pregunta de Análisis</label>
                            <textarea class="form-control d-enunciado-gral" rows="3">${this._ESC(comp.enunciado)}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Criterios de Evaluación</label>
                            <input type="text" class="form-control d-puntos" value="${this._ESC(comp.puntos_clave)}">
                        </div>`;
                    $('#edit-abierta', el).append(html + '</div>');
                }
                else if (comp.tipo === 'codigo') {
                    let specs = comp.especificaciones || {};
                    html += `
                        <div class="form-group">
                            <label>Enunciado del Problema</label>
                            <textarea class="form-control d-enunciado-gral" rows="2">${this._ESC(comp.enunciado)}</textarea>
                        </div>
                        <div class="row" style="display: flex; gap: 15px; margin-bottom: 15px;">
                            <div style="flex: 1;">
                                <label>Lenguaje</label>
                                <input type="text" class="form-control d-lenguaje" value="${this._ESC(comp.lenguaje || 'python')}" placeholder="java, python, cpp...">
                            </div>
                            <div style="flex: 2;">
                                <label>Input Esperado</label>
                                <input type="text" class="form-control d-entrada" value="${this._ESC(specs.entrada_esperada)}">
                            </div>
                            <div style="flex: 2;">
                                <label>Output Esperado</label>
                                <input type="text" class="form-control d-salida" value="${this._ESC(specs.salida_esperada)}">
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Código Inicial (Base para el alumno)</label>
                            <textarea class="form-control d-codigo-base" rows="6"
                                style="font-family: monospace; background: #1e1e1e; color: #d4d4d4; padding: 10px;">${this._ESC(comp.codigo_inicial)}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Criterios de Evaluación (Puntos Clave)</label>
                            <input type="text" class="form-control d-puntos" value="${this._ESC(comp.puntos_clave)}">
                        </div>`;
                    $('#edit-codigo', el).append(html + '</div>');
                }
            });
        }

        // Inicializar Quill en los contenedores de teoría
        $('.quill-container', el).each(function () {
            var quill = new Quill(this, {
                theme: 'snow',
                modules: {
                    toolbar: [
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ header: [1, 2, 3, false] }],
                        [{ list: 'ordered' }, { list: 'bullet' }],
                        [{ color: [] }, { background: [] }],
                        ['code-block', 'clean']
                    ]
                }
            });
            $(this).data('quill-instance', quill);
        });

        // Empty states
        ['#edit-teoria', '#edit-quiz', '#edit-abierta', '#edit-codigo'].forEach(target => {
            if ($(target, el).is(':empty')) {
                $(target, el).html('<div class="empty-state">No se generaron componentes de este tipo.</div>');
            }
        });
    }

    CARGAR_DATOS_EXISTENTES() {
        let jsonInicial = $('#json-inicial-db', this.ELEMENT).val();
        if (jsonInicial && jsonInicial.trim() !== '' && jsonInicial !== '{}') {
            console.log('[EDITOR] Datos previos encontrados en la BD. Restaurando...');
            this.PROCESAR_NUEVO_JSON(jsonInicial);
        } else {
            console.log('[EDITOR] No hay datos previos. Editor en blanco.');
        }
    }

    RECOLECTAR_JSON_DE_PESTANAS() {
        let el = this.ELEMENT;
        let data = {
            titulo_unidad: $('#edit-titulo-unidad', el).val(),
            componentes: []
        };

        $('.comp-block', el).each(function () {
            let $bloque = $(this);
            let tipo = $bloque.data('tipo');
            let compObj = { tipo: tipo, id: $bloque.data('id') };

            if (tipo === 'teoria') {
                let quillInst = $bloque.find('.quill-container').data('quill-instance');
                compObj.contenido_html = quillInst ? quillInst.root.innerHTML : '';
            }
            else if (tipo === 'quiz_multiple') {
                compObj.preguntas = [];
                $bloque.find('.q-block').each(function () {
                    let $q = $(this);
                    let opciones = [];
                    // FIX #2: se obtiene el valor del radio checkeado por nombre de grupo,
                    // no comparando siblings (que fallaba cuando el radio no era adyacente).
                    let radioName = $q.find('input[type="radio"]').first().attr('name');
                    let correctaIdx = parseInt($q.find(`input[name="${radioName}"]:checked`).val()) || 0;

                    $q.find('.d-opcion').each(function () {
                        opciones.push($(this).val());
                    });

                    compObj.preguntas.push({
                        enunciado: $q.find('.d-enunciado').val(),
                        opciones: opciones,
                        correcta: correctaIdx
                    });
                });
            }
            else if (tipo === 'pregunta_abierta') {
                compObj.enunciado = $bloque.find('.d-enunciado-gral').val();
                compObj.puntos_clave = $bloque.find('.d-puntos').val() || '';
            }
            else if (tipo === 'codigo') {
                compObj.enunciado = $bloque.find('.d-enunciado-gral').val();
                compObj.lenguaje = $bloque.find('.d-lenguaje').val();
                compObj.codigo_inicial = $bloque.find('.d-codigo-base').val();
                compObj.especificaciones = {
                    entrada_esperada: $bloque.find('.d-entrada').val(),
                    salida_esperada: $bloque.find('.d-salida').val()
                };
                compObj.puntos_clave = $bloque.find('.d-puntos').val() || '';
            }

            data.componentes.push(compObj);
        });

        return JSON.stringify(data, null, 2);
    }

    // UTILS UI
    MOSTRAR_ERROR(mensaje) {
        $('#mensaje-estado', this.ELEMENT).hide();
        $('#mensaje-error .error-texto', this.ELEMENT).text(mensaje);
        $('#mensaje-error', this.ELEMENT).slideDown(200);
    }
    OCULTAR_MENSAJES() {
        $('#mensaje-error', this.ELEMENT).slideUp(200);
        $('#mensaje-estado', this.ELEMENT).slideUp(200);
    }
    BLOQUEAR_BOTON($btn, texto) {
        $btn.prop('disabled', true);
        $btn.find('.btn-text').text(texto);
    }
    RESTAURAR_BOTON($btn, texto) {
        $btn.prop('disabled', false);
        $btn.find('.btn-text').text(texto);
    }
}
