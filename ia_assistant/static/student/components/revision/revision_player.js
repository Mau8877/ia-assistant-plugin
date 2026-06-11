(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};
    window.IAAssistant.Student = window.IAAssistant.Student || {};
    window.IAAssistant.Student.Components = window.IAAssistant.Student.Components || {};

    function createElement(tagName, className, text) {
        var el = document.createElement(tagName);
        if (className) el.className = className;
        if (typeof text === 'string') el.textContent = text;
        return el;
    }

    function render(component, container) {
        var wrapper = createElement('section', 'ia-assistant-student-revision');
        var title = createElement('h3', 'ia-assistant-student-revision__title', 'Revisión de la actividad');
        var note = createElement('p', 'ia-assistant-student-revision__note', 'Esta revisión es local y aun no conecta con el sistema de IA.');
        var summary = createElement('div', 'ia-assistant-student-revision__summary');
        var actions = createElement('div', 'ia-assistant-student-revision__actions');
        var refreshButton = createElement('button', 'ia-assistant-student-revision__refresh', 'Actualizar resumen');

        refreshButton.type = 'button';
        refreshButton.addEventListener('click', function () {
            renderSummary(summary);
        });

        actions.appendChild(refreshButton);

        wrapper.appendChild(title);
        wrapper.appendChild(note);
        wrapper.appendChild(summary);
        wrapper.appendChild(actions);

        container.appendChild(wrapper);

        // initial render
        renderSummary(summary);
    }

    function shortText(text, max) {
        max = max || 120;
        if (!text) return '';
        text = String(text).trim();
        if (text.length <= max) return text;
        return text.slice(0, max - 1) + '…';
    }

    function renderSummary(container) {
        if (!container) return;
        container.innerHTML = '';

        var Answers = window.IAAssistant.Student.Answers;
        if (!Answers) {
            container.appendChild(createElement('p', '', 'Módulo de respuestas no disponible.'));
            return;
        }

        var answers = Answers.getAllAnswers();
        if (!answers || !answers.length) {
            container.appendChild(createElement('p', '', 'Aún no hay respuestas para revisar.'));
            return;
        }

        var list = createElement('ul', 'ia-assistant-student-revision__list');

        answers.forEach(function (ans) {
            var item = createElement('li', 'ia-assistant-student-revision__item');
            var left = createElement('div', 'ia-assistant-student-revision__item-left');
            var right = createElement('div', 'ia-assistant-student-revision__item-right');

            left.appendChild(createElement('strong', '', ans.componentId + ' (' + ans.tipo + ')'));

            if (ans.tipo === 'quiz_multiple') {
                left.appendChild(createElement('div', '', 'Seleccionada: ' + (Array.isArray(ans.value) ? ans.value.join(', ') : (ans.value || '-'))));
                if (ans.metadata && typeof ans.metadata.isCorrect !== 'undefined') {
                    right.appendChild(createElement('div', '', 'Comprobada: ' + (ans.metadata.checked ? 'sí' : 'no')));
                    right.appendChild(createElement('div', '', 'Correcta: ' + (ans.metadata.isCorrect ? 'sí' : 'no')));
                }
            } else if (ans.tipo === 'pregunta_abierta') {
                left.appendChild(createElement('div', '', 'Respuesta: ' + shortText(ans.value)));
            } else if (ans.tipo === 'codigo') {
                left.appendChild(createElement('div', '', 'Código: ' + (ans.value ? shortText(ans.value) : 'Sin código')));
                if (ans.metadata && ans.metadata.lenguaje) {
                    right.appendChild(createElement('div', '', 'Lenguaje: ' + ans.metadata.lenguaje));
                }
            } else {
                left.appendChild(createElement('div', '', 'Valor: ' + shortText(ans.value)));
            }

            item.appendChild(left);
            item.appendChild(right);
            list.appendChild(item);
        });

        container.appendChild(list);
    }

    window.IAAssistant.Student.Components.RevisionPlayer = {
        render: render
    };
}());
