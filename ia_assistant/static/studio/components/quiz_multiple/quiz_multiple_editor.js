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

    function createDetailRow(label, value) {
        var row = document.createElement("p");
        var labelElement = document.createElement("strong");

        row.className = "ia-assistant-component-editor__detail";
        labelElement.textContent = label + ": ";

        row.appendChild(labelElement);
        row.appendChild(document.createTextNode(value));

        return row;
    }

    function createQuestionField(component) {
        var field = document.createElement("label");
        var labelText = document.createElement("span");
        var textarea = document.createElement("textarea");
        var componentData = component.data && typeof component.data === "object" ?
            component.data :
            {};

        field.className = "ia-assistant-quiz-multiple-editor__field";
        labelText.className = "ia-assistant-quiz-multiple-editor__label";
        labelText.textContent = "Pregunta";

        textarea.className = "ia-assistant-quiz-multiple-editor__textarea";
        textarea.name = "ia_assistant_quiz_multiple_pregunta";
        textarea.rows = 4;
        textarea.value = componentData.pregunta || "";

        textarea.addEventListener("input", function () {
            window.IAAssistant.Studio.State.updateComponentData(component.id, {
                pregunta: textarea.value
            });
        });

        field.appendChild(labelText);
        field.appendChild(textarea);

        return field;
    }

    function getOptions(component) {
        var componentData = component.data && typeof component.data === "object" ?
            component.data :
            {};
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
        var componentData = component.data && typeof component.data === "object" ?
            component.data :
            {};
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

    function updateOptions(component, options) {
        var cleanOptions = options.map(function (option) {
            return {
                id: option.id,
                texto: option.texto,
                feedback: option.feedback
            };
        });

        if (!component.data || typeof component.data !== "object") {
            component.data = {};
        }

        component.data.opciones = cleanOptions.map(function (option) {
            return {
                id: option.id,
                texto: option.texto,
                feedback: option.feedback
            };
        });

        window.IAAssistant.Studio.State.updateComponentData(component.id, {
            opciones: cleanOptions.map(function (option) {
                return {
                    id: option.id,
                    texto: option.texto,
                    feedback: option.feedback
                };
            })
        });
    }

    function updateCorrectAnswers(component, correctAnswers) {
        var cleanCorrectAnswers = correctAnswers.filter(function (optionId, index) {
            return typeof optionId === "string" &&
                optionId &&
                correctAnswers.indexOf(optionId) === index;
        });

        if (!component.data || typeof component.data !== "object") {
            component.data = {};
        }

        component.data.respuestas_correctas = cleanCorrectAnswers;
        delete component.data.respuesta_correcta;

        window.IAAssistant.Studio.State.updateComponentData(component.id, {
            respuestas_correctas: cleanCorrectAnswers,
            respuesta_correcta: undefined
        });
    }

    function migrateCorrectAnswers(component) {
        var componentData = component.data && typeof component.data === "object" ?
            component.data :
            {};

        if (Object.prototype.hasOwnProperty.call(componentData, "respuesta_correcta")) {
            updateCorrectAnswers(component, getCorrectAnswers(component));
        }
    }

    function createOptionField(label, value, className, onInput) {
        var field = document.createElement("label");
        var labelText = document.createElement("span");
        var input = document.createElement("input");

        field.className = "ia-assistant-quiz-multiple-editor__option-field";
        labelText.className = "ia-assistant-quiz-multiple-editor__option-label";
        labelText.textContent = label;

        input.className = className;
        input.type = "text";
        input.value = value;
        input.addEventListener("input", function () {
            onInput(input.value);
        });

        field.appendChild(labelText);
        field.appendChild(input);

        return field;
    }

    function createCorrectAnswerField(component, option) {
        var field = document.createElement("label");
        var checkbox = document.createElement("input");
        var labelText = document.createElement("span");
        var correctAnswers = getCorrectAnswers(component);

        field.className = "ia-assistant-quiz-multiple-editor__correct-field";
        checkbox.className = "ia-assistant-quiz-multiple-editor__correct-checkbox";
        checkbox.type = "checkbox";
        checkbox.checked = correctAnswers.indexOf(option.id) !== -1;
        checkbox.addEventListener("change", function () {
            var currentCorrectAnswers = getCorrectAnswers(component);

            if (checkbox.checked && currentCorrectAnswers.indexOf(option.id) === -1) {
                updateCorrectAnswers(component, currentCorrectAnswers.concat([option.id]));
                return;
            }

            if (!checkbox.checked) {
                updateCorrectAnswers(component, currentCorrectAnswers.filter(function (optionId) {
                    return optionId !== option.id;
                }));
            }
        });

        labelText.className = "ia-assistant-quiz-multiple-editor__correct-label";
        labelText.textContent = "Respuesta correcta";

        field.appendChild(checkbox);
        field.appendChild(labelText);

        return field;
    }

    function renderOptionsList(list, component) {
        var options = getOptions(component);
        var correctAnswers = getCorrectAnswers(component);

        while (list.firstChild) {
            list.removeChild(list.firstChild);
        }

        options.forEach(function (option) {
            var item = document.createElement("div");
            var header = document.createElement("div");
            var optionId = document.createElement("span");
            var deleteButton = document.createElement("button");

            item.className = "ia-assistant-quiz-multiple-editor__option";
            if (correctAnswers.indexOf(option.id) !== -1) {
                item.className += " ia-assistant-quiz-multiple-editor__option--correct";
            }
            header.className = "ia-assistant-quiz-multiple-editor__option-header";
            optionId.className = "ia-assistant-quiz-multiple-editor__option-id";
            optionId.textContent = option.id;

            deleteButton.className = "ia-assistant-quiz-multiple-editor__option-delete";
            deleteButton.type = "button";
            deleteButton.textContent = "Eliminar";
            deleteButton.addEventListener("click", function () {
                updateCorrectAnswers(component, getCorrectAnswers(component).filter(function (optionId) {
                    return optionId !== option.id;
                }));
                updateOptions(component, getOptions(component).filter(function (currentOption) {
                    return currentOption.id !== option.id;
                }));
                renderOptionsList(list, component);
            });

            header.appendChild(optionId);
            header.appendChild(deleteButton);

            item.appendChild(header);
            item.appendChild(createCorrectAnswerField(component, option));
            item.appendChild(createOptionField(
                "Texto",
                option.texto,
                "ia-assistant-quiz-multiple-editor__option-input",
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
                }
            ));
            item.appendChild(createOptionField(
                "Feedback",
                option.feedback,
                "ia-assistant-quiz-multiple-editor__option-input",
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

    function createOptionsSection(component) {
        var section = document.createElement("section");
        var header = document.createElement("div");
        var list = document.createElement("div");
        var addButton = document.createElement("button");

        section.className = "ia-assistant-quiz-multiple-editor__options";
        header.className = "ia-assistant-quiz-multiple-editor__options-header";
        list.className = "ia-assistant-quiz-multiple-editor__options-list";

        header.appendChild(createTextElement(
            "h4",
            "ia-assistant-quiz-multiple-editor__options-title",
            "Opciones"
        ));

        addButton.className = "ia-assistant-quiz-multiple-editor__add-option";
        addButton.type = "button";
        addButton.textContent = "A\u00f1adir opci\u00f3n";
        addButton.addEventListener("click", function () {
            var options = getOptions(component);
            var nextOption = createDefaultOption(getNextOptionId(options));
            var nextOptions = options.concat([nextOption]);

            updateOptions(component, nextOptions);
            renderOptionsList(list, component);
        });

        header.appendChild(addButton);
        section.appendChild(header);
        section.appendChild(list);

        renderOptionsList(list, component);

        return section;
    }

    window.IAAssistant.Studio.Components.QuizMultipleEditor = {
        render: function (container, component) {
            var editor = document.createElement("div");
            var details = document.createElement("div");

            if (!component.data || typeof component.data !== "object") {
                component.data = {};
            }

            migrateCorrectAnswers(component);

            editor.className = "ia-assistant-quiz-multiple-editor";
            details.className = "ia-assistant-component-editor__details";

            editor.appendChild(createTextElement(
                "h3",
                "ia-assistant-component-editor__title",
                "Editor de quiz m\u00faltiple"
            ));

            details.appendChild(createDetailRow("Nombre", component.nombre || component.id));
            details.appendChild(createDetailRow("ID", component.id));
            details.appendChild(createDetailRow("Tipo", component.tipo));

            editor.appendChild(details);
            editor.appendChild(createQuestionField(component));
            editor.appendChild(createOptionsSection(component));

            container.appendChild(editor);
        }
    };
}());
