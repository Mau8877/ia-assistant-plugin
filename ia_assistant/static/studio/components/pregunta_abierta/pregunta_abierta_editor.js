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

    function createTextareaField(component, fieldName, label, rows) {
        var field = document.createElement("label");
        var labelText = document.createElement("span");
        var textarea = document.createElement("textarea");
        var componentData = component.data && typeof component.data === "object" ?
            component.data :
            {};

        field.className = "ia-assistant-pregunta-abierta-editor__field";
        labelText.className = "ia-assistant-pregunta-abierta-editor__label";
        labelText.textContent = label;

        textarea.className = "ia-assistant-pregunta-abierta-editor__textarea";
        textarea.name = "ia_assistant_pregunta_abierta_" + fieldName;
        textarea.rows = rows;
        textarea.value = componentData[fieldName] || "";

        textarea.addEventListener("input", function () {
            var patch = {};

            patch[fieldName] = textarea.value;
            window.IAAssistant.Studio.State.updateComponentData(component.id, patch);
        });

        field.appendChild(labelText);
        field.appendChild(textarea);

        return field;
    }

    window.IAAssistant.Studio.Components.PreguntaAbiertaEditor = {
        render: function (container, component) {
            var editor = document.createElement("div");
            var details = document.createElement("div");

            if (!component.data || typeof component.data !== "object") {
                component.data = {};
            }

            editor.className = "ia-assistant-pregunta-abierta-editor";
            details.className = "ia-assistant-component-editor__details";

            editor.appendChild(createTextElement(
                "h3",
                "ia-assistant-component-editor__title",
                "Editor de pregunta abierta"
            ));

            details.appendChild(createDetailRow("Nombre", component.nombre || component.id));
            details.appendChild(createDetailRow("ID", component.id));
            details.appendChild(createDetailRow("Tipo", component.tipo));

            editor.appendChild(details);
            editor.appendChild(createTextareaField(component, "enunciado", "Enunciado", 5));
            editor.appendChild(createTextareaField(component, "rubrica", "R\u00fabrica", 5));

            container.appendChild(editor);
        }
    };
}());
