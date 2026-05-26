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

    function updateDataField(component, fieldName, value) {
        var patch = {};

        patch[fieldName] = value;
        window.IAAssistant.Studio.State.updateComponentData(component.id, patch);
    }

    function createTextInputField(component, fieldName, label) {
        var field = document.createElement("label");
        var labelText = document.createElement("span");
        var input = document.createElement("input");
        var componentData = component.data && typeof component.data === "object" ?
            component.data :
            {};

        field.className = "ia-assistant-codigo-editor__field";
        labelText.className = "ia-assistant-codigo-editor__label";
        labelText.textContent = label;

        input.className = "ia-assistant-codigo-editor__input";
        input.name = "ia_assistant_codigo_" + fieldName;
        input.type = "text";
        input.value = componentData[fieldName] || "";

        input.addEventListener("input", function () {
            updateDataField(component, fieldName, input.value);
        });

        field.appendChild(labelText);
        field.appendChild(input);

        return field;
    }

    function createTextareaField(component, fieldName, label, rows, modifierClass) {
        var field = document.createElement("label");
        var labelText = document.createElement("span");
        var textarea = document.createElement("textarea");
        var componentData = component.data && typeof component.data === "object" ?
            component.data :
            {};

        field.className = "ia-assistant-codigo-editor__field";
        labelText.className = "ia-assistant-codigo-editor__label";
        labelText.textContent = label;

        textarea.className = "ia-assistant-codigo-editor__textarea";
        if (modifierClass) {
            textarea.className += " " + modifierClass;
        }
        textarea.name = "ia_assistant_codigo_" + fieldName;
        textarea.rows = rows;
        textarea.value = componentData[fieldName] || "";

        textarea.addEventListener("input", function () {
            updateDataField(component, fieldName, textarea.value);
        });

        field.appendChild(labelText);
        field.appendChild(textarea);

        return field;
    }

    window.IAAssistant.Studio.Components.CodigoEditor = {
        render: function (container, component) {
            var editor = document.createElement("div");
            var details = document.createElement("div");

            if (!component.data || typeof component.data !== "object") {
                component.data = {};
            }

            editor.className = "ia-assistant-codigo-editor";
            details.className = "ia-assistant-component-editor__details";

            editor.appendChild(createTextElement(
                "h3",
                "ia-assistant-component-editor__title",
                "Editor de c\u00f3digo"
            ));

            details.appendChild(createDetailRow("Nombre", component.nombre || component.id));
            details.appendChild(createDetailRow("ID", component.id));
            details.appendChild(createDetailRow("Tipo", component.tipo));

            editor.appendChild(details);
            editor.appendChild(createTextareaField(component, "enunciado", "Enunciado", 4));
            editor.appendChild(createTextInputField(component, "lenguaje", "Lenguaje"));
            editor.appendChild(createTextareaField(
                component,
                "codigo_base",
                "C\u00f3digo base",
                8,
                "ia-assistant-codigo-editor__textarea--code"
            ));
            editor.appendChild(createTextareaField(component, "instrucciones", "Instrucciones", 5));

            container.appendChild(editor);
        }
    };
}());
