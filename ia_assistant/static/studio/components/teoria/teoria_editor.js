(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};
    window.IAAssistant.Studio = window.IAAssistant.Studio || {};
    window.IAAssistant.Studio.Components = window.IAAssistant.Studio.Components || {};

    function createDetailRow(label, value) {
        var row = document.createElement("p");
        var labelElement = document.createElement("strong");

        row.className = "ia-assistant-component-editor__detail";
        labelElement.textContent = label + ": ";

        row.appendChild(labelElement);
        row.appendChild(document.createTextNode(value));

        return row;
    }

    function createTextElement(tagName, className, text) {
        var element = document.createElement(tagName);

        element.className = className;
        element.textContent = text;

        return element;
    }

    function createContentField(component) {
        var field = document.createElement("label");
        var labelText = document.createElement("span");
        var textarea = document.createElement("textarea");
        var componentData = component.data && typeof component.data === "object" ?
            component.data :
            {};

        field.className = "ia-assistant-teoria-editor__field";
        labelText.className = "ia-assistant-teoria-editor__label";
        labelText.textContent = "Contenido";

        textarea.className = "ia-assistant-teoria-editor__textarea";
        textarea.name = "ia_assistant_teoria_contenido";
        textarea.rows = 10;
        textarea.value = componentData.contenido || "";

        textarea.addEventListener("input", function () {
            window.IAAssistant.Studio.State.updateComponentData(component.id, {
                contenido: textarea.value
            });
        });

        field.appendChild(labelText);
        field.appendChild(textarea);

        return field;
    }

    window.IAAssistant.Studio.Components.TeoriaEditor = {
        render: function (container, component) {
            var editor = document.createElement("div");
            var details = document.createElement("div");

            if (!component.data || typeof component.data !== "object") {
                component.data = {};
            }

            editor.className = "ia-assistant-teoria-editor";
            details.className = "ia-assistant-component-editor__details";

            editor.appendChild(createTextElement(
                "h3",
                "ia-assistant-component-editor__title",
                "Editor de teoría"
            ));

            details.appendChild(createDetailRow("Nombre", component.nombre || component.id));
            details.appendChild(createDetailRow("ID", component.id));
            details.appendChild(createDetailRow("Tipo", component.tipo));

            editor.appendChild(details);
            editor.appendChild(createContentField(component));

            container.appendChild(editor);
        }
    };
}());
