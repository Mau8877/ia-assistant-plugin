(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};
    window.IAAssistant.Student = window.IAAssistant.Student || {};
    window.IAAssistant.Student.Components = window.IAAssistant.Student.Components || {};

    function createElement(tagName, className, text) {
        var element = document.createElement(tagName);

        if (className) {
            element.className = className;
        }

        if (typeof text === "string") {
            element.textContent = text;
        }

        return element;
    }

    function contains(list, value) {
        return list.indexOf(value) >= 0;
    }

    function getSelectedOptionIdsFromGroup(groupName) {
        var selected = [];
        var selector = 'input[name="' + groupName + '"]:checked';
        var inputs = document.querySelectorAll(selector);
        Array.prototype.forEach.call(inputs, function (input) {
            selected.push(input.value);
        });
        return selected;
    }

    function setsMatch(selectedIds, correctIds) {
        var selectedMap = {};

        if (selectedIds.length !== correctIds.length) {
            return false;
        }

        selectedIds.forEach(function (id) {
            selectedMap[id] = true;
        });

        return correctIds.every(function (id) {
            return selectedMap[id];
        });
    }

    function getSelectionDetails(selectedIds, correctIds) {
        return {
            selectedCorrectIds: selectedIds.filter(function (id) {
                return contains(correctIds, id);
            }),
            selectedWrongIds: selectedIds.filter(function (id) {
                return !contains(correctIds, id);
            }),
            missingCorrectIds: correctIds.filter(function (id) {
                return !contains(selectedIds, id);
            })
        };
    }

    function getOptionId(option, index) {
        return String(option.id || "opcion_" + String(index + 1));
    }

    function getSafeFieldId(value) {
        return String(value).replace(/[^a-zA-Z0-9_-]/g, "_");
    }

    function getOptionMap(options) {
        var optionMap = {};

        options.forEach(function (option, index) {
            var currentOption = option || {};

            optionMap[getOptionId(currentOption, index)] = currentOption;
        });

        return optionMap;
    }

    function createSummary(message, className) {
        return createElement(
            "p",
            "ia-assistant-student-quiz__summary " + className,
            message
        );
    }

    function createFeedbackItem(option, statusClass, statusText) {
        var item = createElement(
            "article",
            "ia-assistant-student-quiz__feedback-item " + statusClass
        );
        var optionText = createElement(
            "p",
            "ia-assistant-student-quiz__feedback-option",
            option.texto || "Opcion sin texto."
        );
        var status = createElement(
            "p",
            "ia-assistant-student-quiz__feedback-status",
            statusText
        );

        item.appendChild(optionText);
        item.appendChild(status);

        if (option.feedback) {
            item.appendChild(createElement(
                "p",
                "ia-assistant-student-quiz__feedback-text",
                option.feedback
            ));
        }

        return item;
    }

    function renderDetailSection(title, optionIds, optionMap, statusClass, statusText, container) {
        var section;
        var list;

        if (!optionIds.length) {
            return;
        }

        section = createElement(
            "section",
            "ia-assistant-student-quiz__detail-section ia-assistant-student-quiz__detail-section--" + statusClass
        );
        list = createElement("div", "ia-assistant-student-quiz__feedback-list");

        section.appendChild(createElement("h4", "ia-assistant-student-quiz__detail-title", title));
        optionIds.forEach(function (id) {
            list.appendChild(createFeedbackItem(
                optionMap[id] || {},
                "ia-assistant-student-quiz__feedback-item--" + statusClass,
                statusText
            ));
        });
        section.appendChild(list);
        container.appendChild(section);
    }

    function renderMultipleDetails(details, optionMap, result) {
        renderDetailSection(
            "Correctas seleccionadas",
            details.selectedCorrectIds,
            optionMap,
            "success",
            "Correcta seleccionada",
            result
        );
        renderDetailSection(
            "Correctas faltantes",
            details.missingCorrectIds,
            optionMap,
            "warning",
            "Correcta faltante",
            result
        );
        renderDetailSection(
            "Incorrectas seleccionadas",
            details.selectedWrongIds,
            optionMap,
            "error",
            "No era correcta",
            result
        );
    }

    function renderSingleDetails(selectedIds, correctIds, optionMap, isCorrect, result) {
        renderDetailSection(
            "Opcion seleccionada",
            selectedIds,
            optionMap,
            isCorrect ? "success" : "error",
            isCorrect ? "Correcta seleccionada" : "No era correcta",
            result
        );

        if (!isCorrect) {
            renderDetailSection(
                "Respuesta correcta",
                correctIds,
                optionMap,
                "warning",
                "Respuesta correcta",
                result
            );
        }
    }

    function renderSelectedOnly(selectedIds, optionMap, result) {
        renderDetailSection(
            "Opciones seleccionadas",
            selectedIds,
            optionMap,
            "warning",
            "Opcion seleccionada",
            result
        );
    }

    function renderOption(option, inputType, groupName, index, componentId) {
        var optionId = getOptionId(option, index);
        var fieldId = groupName + "_" + getSafeFieldId(optionId);
        var label = createElement("label", "ia-assistant-student-quiz__option");
        var input = document.createElement("input");
        var text = createElement("span", "ia-assistant-student-quiz__option-text");

        input.type = inputType;
        input.name = groupName;
        input.value = optionId;
        input.id = fieldId;

        text.textContent = option.texto || "Opcion sin texto.";

        label.setAttribute("for", fieldId);
        label.appendChild(input);
        label.appendChild(text);

        // reflect existing answer if present
        try {
            var existing = window.IAAssistant.Student.Answers && window.IAAssistant.Student.Answers.getAnswer(componentId);
            if (existing && existing.value) {
                var val = existing.value;
                if (Array.isArray(val) && val.indexOf(optionId) >= 0) input.checked = true;
                if (!Array.isArray(val) && String(val) === String(optionId)) input.checked = true;
            }
        } catch (e) {
            // ignore
        }

        input.addEventListener('change', function () {
            // gather selection for this group
            var selected = getSelectedOptionIdsFromGroup(groupName);
            var payload = {
                componentId: componentId,
                tipo: 'quiz_multiple',
                value: selected.length === 1 ? selected[0] : selected,
                metadata: { checked: false }
            };
            if (window.IAAssistant && window.IAAssistant.Student && window.IAAssistant.Student.Answers) {
                window.IAAssistant.Student.Answers.setAnswer(componentId, payload);
            }
        });

        return label;
    }

    function render(component, container) {
        var data = component.data || {};
        var question = data.pregunta || "";
        var options = Array.isArray(data.opciones) ? data.opciones : [];
        var optionMap = getOptionMap(options);
        var correctIds = Array.isArray(data.respuestas_correctas) ?
            data.respuestas_correctas.map(function (id) {
                return String(id);
            }) :
            [];
        var inputType = correctIds.length > 1 ? "checkbox" : "radio";
        var quiz = createElement("section", "ia-assistant-student-quiz");
        var questionElement = createElement(
            "p",
            "ia-assistant-student-quiz__question",
            question || "Pregunta sin enunciado."
        );
        var form = createElement("form", "ia-assistant-student-quiz__form");
        var optionsContainer = createElement("div", "ia-assistant-student-quiz__options");
        var checkButton = createElement("button", "ia-assistant-student-quiz__check", "Comprobar");
        var result = createElement("div", "ia-assistant-student-quiz__result");
        var groupName = "ia_assistant_quiz_" + getSafeFieldId(component.id || String(Date.now()));

        form.addEventListener("submit", function (event) {
            var selectedIds;
            var selectionDetails;
            var isCorrect;

            event.preventDefault();
            result.className = "ia-assistant-student-quiz__result";
            result.textContent = "";

            selectedIds = getSelectedOptionIdsFromGroup(groupName);

            if (!selectedIds.length) {
                result.classList.add("ia-assistant-student-quiz__result--warning");
                result.appendChild(createSummary(
                    "Selecciona al menos una opcion antes de comprobar.",
                    "ia-assistant-student-quiz__summary--warning"
                ));
                return;
            }

            selectionDetails = getSelectionDetails(selectedIds, correctIds);

            if (!correctIds.length) {
                result.classList.add("ia-assistant-student-quiz__result--warning");
                result.appendChild(createSummary(
                    "Este quiz no tiene respuesta correcta configurada.",
                    "ia-assistant-student-quiz__summary--warning"
                ));
                renderSelectedOnly(selectedIds, optionMap, result);

                // persist answer partially
                if (window.IAAssistant && window.IAAssistant.Student && window.IAAssistant.Student.Answers) {
                    window.IAAssistant.Student.Answers.setAnswer(component.id, {
                        componentId: component.id,
                        tipo: 'quiz_multiple',
                        value: selectedIds.length === 1 ? selectedIds[0] : selectedIds,
                        metadata: { checked: true }
                    });
                }

                return;
            }

            isCorrect = inputType === "radio" ?
                contains(correctIds, selectedIds[0]) :
                setsMatch(selectedIds, correctIds);

            if (correctIds.length > 1) {
                result.classList.add(
                    isCorrect ?
                        "ia-assistant-student-quiz__result--success" :
                        "ia-assistant-student-quiz__result--warning"
                );
                result.appendChild(createSummary(
                    "Tu seleccion: " +
                        String(selectionDetails.selectedCorrectIds.length) +
                        "/" +
                        String(correctIds.length) +
                        " respuestas correctas",
                    isCorrect ?
                        "ia-assistant-student-quiz__summary--success" :
                        "ia-assistant-student-quiz__summary--warning"
                ));
                result.appendChild(createSummary(
                    isCorrect ?
                        "Respuesta correcta. Seleccionaste todas las opciones correctas." :
                        "Respuesta incompleta o incorrecta. Revisa los detalles.",
                    isCorrect ?
                        "ia-assistant-student-quiz__summary--success" :
                        "ia-assistant-student-quiz__summary--warning"
                ));
                renderMultipleDetails(selectionDetails, optionMap, result);

                // persist checked state
                if (window.IAAssistant && window.IAAssistant.Student && window.IAAssistant.Student.Answers) {
                    window.IAAssistant.Student.Answers.setAnswer(component.id, {
                        componentId: component.id,
                        tipo: 'quiz_multiple',
                        value: selectedIds.length === 1 ? selectedIds[0] : selectedIds,
                        metadata: { checked: true, isCorrect: !!isCorrect }
                    });
                }

                return;
            }

            result.classList.add(
                isCorrect ?
                    "ia-assistant-student-quiz__result--success" :
                    "ia-assistant-student-quiz__result--error"
            );
            result.appendChild(createSummary(
                isCorrect ? "Respuesta correcta." : "Respuesta incorrecta.",
                isCorrect ?
                    "ia-assistant-student-quiz__summary--success" :
                    "ia-assistant-student-quiz__summary--error"
            ));
            renderSingleDetails(selectedIds, correctIds, optionMap, isCorrect, result);

            // persist checked state
            if (window.IAAssistant && window.IAAssistant.Student && window.IAAssistant.Student.Answers) {
                window.IAAssistant.Student.Answers.setAnswer(component.id, {
                    componentId: component.id,
                    tipo: 'quiz_multiple',
                    value: selectedIds.length === 1 ? selectedIds[0] : selectedIds,
                    metadata: { checked: true, isCorrect: !!isCorrect }
                });
            }
        });

        quiz.appendChild(questionElement);

        if (!options.length) {
            quiz.appendChild(createElement(
                "p",
                "ia-assistant-student-quiz__empty",
                "Este quiz no tiene opciones configuradas."
            ));
            container.appendChild(quiz);
            return;
        }

        options.forEach(function (option, index) {
            optionsContainer.appendChild(renderOption(option || {}, inputType, groupName, index, component.id));
        });

        checkButton.type = "submit";
        form.appendChild(optionsContainer);
        form.appendChild(checkButton);
        form.appendChild(result);
        quiz.appendChild(form);
        container.appendChild(quiz);
    }

    window.IAAssistant.Student.Components.QuizMultiplePlayer = {
        render: render
    };
}());
