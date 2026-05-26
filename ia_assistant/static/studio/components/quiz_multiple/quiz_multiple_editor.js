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

    window.IAAssistant.Studio.Components.QuizMultipleEditor = {
        render: function (container, component) {
            var editor = document.createElement("div");
            var details = document.createElement("div");

            editor.className = "ia-assistant-component-editor__placeholder";
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
            editor.appendChild(createTextElement(
                "p",
                "ia-assistant-component-editor__message",
                "Editor de quiz m\u00faltiple"
            ));

            container.appendChild(editor);
        }
    };
}());
