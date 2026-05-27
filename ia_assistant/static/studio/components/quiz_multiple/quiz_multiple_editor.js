(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};
    window.IAAssistant.Studio = window.IAAssistant.Studio || {};
    window.IAAssistant.Studio.Components = window.IAAssistant.Studio.Components || {};

    function createTextElement(tagName, className, text) {
        var element = document.createElement(tagName);

        element.className = className;
        element.textContent = text;

        return element;
    }

    function getComponentData(component) {
        if (!component.data || typeof component.data !== "object") {
            component.data = {};
        }

        return component.data;
    }

    function getOptions(component) {
        var componentData = getComponentData(component);
        var options = Array.isArray(componentData.opciones) ?
            componentData.opciones :
            [];

        return options.map(function (option) {
            var cleanOption = option && typeof option === "object" ? option : {};

            return {
                id: cleanOption.id || "",
                texto: cleanOption.texto || "",
                feedback: cleanOption.feedback || ""
            };
        });
    }

    function getCorrectAnswers(component) {
        var componentData = getComponentData(component);
        var correctAnswers = Array.isArray(componentData.respuestas_correctas) ?
            componentData.respuestas_correctas :
            null;

        if (!correctAnswers) {
            correctAnswers = componentData.respuesta_correcta ?
                [componentData.respuesta_correcta] :
                [];
        }

        return correctAnswers.filter(function (optionId, index) {
            return typeof optionId === "string" &&
                optionId &&
                correctAnswers.indexOf(optionId) === index;
        });
    }

    function getNextOptionId(options) {
        var maxOptionNumber = 0;

        options.forEach(function (option) {
            var match = typeof option.id === "string" ?
                option.id.match(/^opcion_(\d+)$/) :
                null;
            var optionNumber = match ? parseInt(match[1], 10) : 0;

            if (optionNumber > maxOptionNumber) {
                maxOptionNumber = optionNumber;
            }
        });

        return "opcion_" + (maxOptionNumber + 1);
    }

    function createDefaultOption(optionId) {
        var registry = window.IAAssistant.Registry;
        var definition = registry && typeof registry.get === "function" ?
            registry.get("quiz_multiple") :
            null;

        if (definition && typeof definition.createDefaultOption === "function") {
            return definition.createDefaultOption(optionId);
        }

        return {
            id: optionId,
            texto: "",
            feedback: ""
        };
    }

    function cleanOptions(options) {
        return options.map(function (option) {
            return {
                id: option.id,
                texto: option.texto,
                feedback: option.feedback
            };
        });
    }

    function cleanCorrectAnswers(correctAnswers) {
        return correctAnswers.filter(function (optionId, index) {
            return typeof optionId === "string" &&
                optionId &&
                correctAnswers.indexOf(optionId) === index;
        });
    }

    function updateQuizData(component, patch) {
        var componentData = getComponentData(component);
        var dataPatch = patch && typeof patch === "object" ? patch : {};

        Object.keys(dataPatch).forEach(function (key) {
            if (typeof dataPatch[key] === "undefined") {
                delete componentData[key];
                return;
            }

            componentData[key] = dataPatch[key];
        });

        window.IAAssistant.Studio.State.updateComponentData(component.id, dataPatch);
    }

    function updateOptions(component, options) {
        updateQuizData(component, {
            opciones: cleanOptions(options)
        });
    }

    function updateCorrectAnswers(component, correctAnswers) {
        updateQuizData(component, {
            respuestas_correctas: cleanCorrectAnswers(correctAnswers),
            respuesta_correcta: undefined
        });
    }

    function migrateCorrectAnswers(component) {
        var componentData = getComponentData(component);

        if (Object.prototype.hasOwnProperty.call(componentData, "respuesta_correcta")) {
            updateCorrectAnswers(component, getCorrectAnswers(component));
        }
    }

    function createEditorHeader() {
        var header = document.createElement("header");
        var heading = document.createElement("div");
        var title = document.createElement("h3");
        var badge = document.createElement("span");
        var description = document.createElement("p");

        header.className = "ia-assistant-quiz-multiple-editor__header";
        heading.className = "ia-assistant-quiz-multiple-editor__heading";
        title.className = "ia-assistant-quiz-multiple-editor__title";
        badge.className = "ia-assistant-quiz-multiple-editor__type-badge";
        description.className = "ia-assistant-quiz-multiple-editor__description";

        title.textContent = "❓ Quiz múltiple";
        badge.textContent = "Quiz";
        description.textContent = "Crea una pregunta con una o varias respuestas correctas.";

        heading.appendChild(title);
        heading.appendChild(badge);
        header.appendChild(heading);
        header.appendChild(description);

        return header;
    }

    function createQuestionSection(component) {
        var section = document.createElement("section");
        var heading = createTextElement(
            "h4",
            "ia-assistant-quiz-multiple-editor__section-title",
            "❓ Pregunta"
        );
        var help = createTextElement(
            "p",
            "ia-assistant-quiz-multiple-editor__help",
            "Escribe la pregunta que verá el estudiante."
        );
        var textarea = document.createElement("textarea");

        section.className = "ia-assistant-quiz-multiple-editor__question";
        textarea.className = "ia-assistant-quiz-multiple-editor__question-textarea";
        textarea.name = "ia_assistant_quiz_multiple_pregunta";
        textarea.rows = 4;
        textarea.value = getComponentData(component).pregunta || "";
        textarea.addEventListener("input", function () {
            updateQuizData(component, {
                pregunta: textarea.value
            });
        });

        section.appendChild(heading);
        section.appendChild(help);
        section.appendChild(textarea);

        return section;
    }

    function getValidationMessages(component) {
        var options = getOptions(component);
        var correctAnswers = getCorrectAnswers(component);
        var optionIds = options.map(function (option) {
            return option.id;
        });
        var messages = [];

        if (options.length < 2) {
            messages.push("⚠ Debes agregar al menos 2 opciones.");
        }

        if (!correctAnswers.length) {
            messages.push("⚠ Marca al menos una respuesta correcta.");
        }

        if (options.some(function (option) {
            return !option.texto.trim();
        })) {
            messages.push("⚠ Hay opciones sin texto.");
        }

        if (correctAnswers.some(function (optionId) {
            return optionIds.indexOf(optionId) === -1;
        })) {
            messages.push("⚠ Hay respuestas correctas que no existen en las opciones.");
        }

        return messages;
    }

    function renderStatus(statusRoot, component) {
        var messages = getValidationMessages(component);
        var statusItem;

        while (statusRoot.firstChild) {
            statusRoot.removeChild(statusRoot.firstChild);
        }

        if (!messages.length) {
            statusItem = createTextElement(
                "p",
                "ia-assistant-quiz-multiple-editor__status " +
                    "ia-assistant-quiz-multiple-editor__status--ready",
                "✓ Quiz listo para revisar"
            );
            statusRoot.appendChild(statusItem);
            return;
        }

        messages.forEach(function (message) {
            statusItem = createTextElement(
                "p",
                "ia-assistant-quiz-multiple-editor__status " +
                    "ia-assistant-quiz-multiple-editor__status--warning",
                message
            );
            statusRoot.appendChild(statusItem);
        });
    }

    function renderSummary(summaryRoot, component) {
        var options = getOptions(component);
        var correctAnswers = getCorrectAnswers(component);

        summaryRoot.textContent = options.length + " opciones · " +
            correctAnswers.length + " correctas";
    }

    function createOptionTextField(label, value, isMultiline, onInput) {
        var field = document.createElement("label");
        var labelText = document.createElement("span");
        var input = isMultiline ?
            document.createElement("textarea") :
            document.createElement("input");

        field.className = "ia-assistant-quiz-multiple-editor__option-field";
        labelText.className = "ia-assistant-quiz-multiple-editor__option-label";
        labelText.textContent = label;

        input.className = isMultiline ?
            "ia-assistant-quiz-multiple-editor__option-feedback" :
            "ia-assistant-quiz-multiple-editor__option-input";
        input.value = value;

        if (isMultiline) {
            input.rows = 2;
        } else {
            input.type = "text";
        }

        input.addEventListener("input", function () {
            onInput(input.value);
        });

        field.appendChild(labelText);
        field.appendChild(input);

        return field;
    }

    function deleteOptionWithConfirmation(component, option, onChange) {
        var confirmModal = window.IAAssistant.Studio.ConfirmModal;

        if (!confirmModal || typeof confirmModal.confirm !== "function") {
            if (window.console && typeof window.console.warn === "function") {
                window.console.warn("ConfirmModal no esta disponible. No se elimino la opcion.");
            }
            return;
        }

        confirmModal.confirm({
            title: "Eliminar opción",
            message: "¿Seguro que deseas eliminar esta opción? Esta acción no se puede deshacer.",
            confirmText: "Eliminar",
            cancelText: "Cancelar",
            variant: "danger",
            onConfirm: function () {
                var nextOptions = getOptions(component).filter(function (currentOption) {
                    return currentOption.id !== option.id;
                });
                var nextCorrectAnswers = getCorrectAnswers(component).filter(function (optionId) {
                    return optionId !== option.id;
                });

                updateQuizData(component, {
                    opciones: cleanOptions(nextOptions),
                    respuestas_correctas: cleanCorrectAnswers(nextCorrectAnswers),
                    respuesta_correcta: undefined
                });
                onChange();
            }
        });
    }

    function createCorrectToggle(component, option, isCorrect, onChange) {
        var field = document.createElement("label");
        var checkbox = document.createElement("input");
        var labelText = document.createElement("span");

        field.className = "ia-assistant-quiz-multiple-editor__correct-field";
        checkbox.className = "ia-assistant-quiz-multiple-editor__correct-checkbox";
        checkbox.type = "checkbox";
        checkbox.checked = isCorrect;
        checkbox.addEventListener("change", function () {
            var currentCorrectAnswers = getCorrectAnswers(component);

            if (checkbox.checked && currentCorrectAnswers.indexOf(option.id) === -1) {
                updateCorrectAnswers(component, currentCorrectAnswers.concat([option.id]));
                onChange();
                return;
            }

            if (!checkbox.checked) {
                updateCorrectAnswers(component, currentCorrectAnswers.filter(function (optionId) {
                    return optionId !== option.id;
                }));
                onChange();
            }
        });

        labelText.className = "ia-assistant-quiz-multiple-editor__correct-label";
        labelText.textContent = isCorrect ? "✓ Correcta" : "Marcar correcta";

        field.appendChild(checkbox);
        field.appendChild(labelText);

        return field;
    }

    function renderOptionsList(list, component, onChange, onStatusChange) {
        var options = getOptions(component);
        var correctAnswers = getCorrectAnswers(component);

        while (list.firstChild) {
            list.removeChild(list.firstChild);
        }

        options.forEach(function (option, index) {
            var item = document.createElement("article");
            var header = document.createElement("div");
            var title = createTextElement(
                "h5",
                "ia-assistant-quiz-multiple-editor__option-title",
                "Opción " + (index + 1)
            );
            var actions = document.createElement("div");
            var deleteButton = document.createElement("button");
            var isCorrect = correctAnswers.indexOf(option.id) !== -1;

            item.className = "ia-assistant-quiz-multiple-editor__option";
            if (isCorrect) {
                item.className += " ia-assistant-quiz-multiple-editor__option--correct";
            }

            header.className = "ia-assistant-quiz-multiple-editor__option-header";
            actions.className = "ia-assistant-quiz-multiple-editor__option-actions";
            deleteButton.className = "ia-assistant-quiz-multiple-editor__option-delete";
            deleteButton.type = "button";
            deleteButton.textContent = "×";
            deleteButton.setAttribute("aria-label", "Eliminar opción");
            deleteButton.setAttribute("title", "Eliminar");
            deleteButton.addEventListener("click", function () {
                deleteOptionWithConfirmation(component, option, onChange);
            });

            actions.appendChild(createCorrectToggle(component, option, isCorrect, onChange));
            actions.appendChild(deleteButton);
            header.appendChild(title);
            header.appendChild(actions);

            item.appendChild(header);
            item.appendChild(createOptionTextField(
                "Texto de la opción",
                option.texto,
                false,
                function (newValue) {
                    updateOptions(component, getOptions(component).map(function (currentOption) {
                        if (currentOption.id !== option.id) {
                            return currentOption;
                        }

                        return {
                            id: currentOption.id,
                            texto: newValue,
                            feedback: currentOption.feedback
                        };
                    }));
                    onStatusChange();
                }
            ));
            item.appendChild(createOptionTextField(
                "💬 Feedback",
                option.feedback,
                true,
                function (newValue) {
                    updateOptions(component, getOptions(component).map(function (currentOption) {
                        if (currentOption.id !== option.id) {
                            return currentOption;
                        }

                        return {
                            id: currentOption.id,
                            texto: currentOption.texto,
                            feedback: newValue
                        };
                    }));
                }
            ));

            list.appendChild(item);
        });
    }

    function createOptionsSection(component, statusRoot) {
        var section = document.createElement("section");
        var header = document.createElement("div");
        var heading = document.createElement("div");
        var title = createTextElement(
            "h4",
            "ia-assistant-quiz-multiple-editor__section-title",
            "Opciones"
        );
        var summary = document.createElement("p");
        var list = document.createElement("div");
        var addButton = document.createElement("button");

        function refreshOptions() {
            renderSummary(summary, component);
            renderOptionsList(list, component, refreshOptions, refreshStatus);
            renderStatus(statusRoot, component);
        }

        function refreshStatus() {
            renderSummary(summary, component);
            renderStatus(statusRoot, component);
        }

        section.className = "ia-assistant-quiz-multiple-editor__options";
        header.className = "ia-assistant-quiz-multiple-editor__options-header";
        heading.className = "ia-assistant-quiz-multiple-editor__options-heading";
        summary.className = "ia-assistant-quiz-multiple-editor__options-summary";
        list.className = "ia-assistant-quiz-multiple-editor__options-list";

        addButton.className = "ia-assistant-quiz-multiple-editor__add-option";
        addButton.type = "button";
        addButton.textContent = "＋ Añadir opción";
        addButton.addEventListener("click", function () {
            var options = getOptions(component);
            var nextOption = createDefaultOption(getNextOptionId(options));

            updateOptions(component, options.concat([nextOption]));
            refreshOptions();
        });

        heading.appendChild(title);
        heading.appendChild(summary);
        header.appendChild(heading);
        header.appendChild(addButton);
        section.appendChild(header);
        section.appendChild(list);

        refreshOptions();

        return section;
    }

    window.IAAssistant.Studio.Components.QuizMultipleEditor = {
        render: function (container, component) {
            var editor = document.createElement("div");
            var statusRoot = document.createElement("div");

            getComponentData(component);
            migrateCorrectAnswers(component);

            editor.className = "ia-assistant-quiz-multiple-editor";
            statusRoot.className = "ia-assistant-quiz-multiple-editor__status-list";

            editor.appendChild(createEditorHeader());
            editor.appendChild(createQuestionSection(component));
            editor.appendChild(statusRoot);
            editor.appendChild(createOptionsSection(component, statusRoot));
            renderStatus(statusRoot, component);

            container.appendChild(editor);
        }
    };
}());
