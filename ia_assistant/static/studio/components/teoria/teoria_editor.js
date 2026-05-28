(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};
    window.IAAssistant.Studio = window.IAAssistant.Studio || {};
    window.IAAssistant.Studio.Components = window.IAAssistant.Studio.Components || {};

    function ensureMarkdownFormat(component) {
        if (!component.data || typeof component.data !== "object") {
            component.data = {};
        }

        component.data.formato = "markdown";
    }

    function updateDataField(component, fieldName, value) {
        var patch = {};

        ensureMarkdownFormat(component);
        component.data[fieldName] = value;
        patch.formato = "markdown";
        patch[fieldName] = value;
        window.IAAssistant.Studio.State.updateComponentData(component.id, patch);
    }

    function createTextElement(tagName, className, text) {
        var element = document.createElement(tagName);

        element.className = className;
        element.textContent = text;

        return element;
    }

    function getTheoryRecommendations(component) {
        var componentData = component.data && typeof component.data === "object" ?
            component.data :
            {};
        var recommendations = [];

        if (!String(componentData.titulo || "").trim()) {
            recommendations.push("Agrega un t\u00edtulo visible para la teor\u00eda.");
        }

        if (!String(componentData.contenido || "").trim()) {
            recommendations.push("Escribe el contenido te\u00f3rico en Markdown.");
        }

        return recommendations;
    }

    function renderTheoryStatus(statusRoot, component) {
        var recommendations = getTheoryRecommendations(component);
        var statusBox = document.createElement("section");
        var statusTitle = createTextElement(
            "h4",
            "ia-assistant-teoria-editor__status-title",
            "Estado de la teor\u00eda"
        );
        var message;
        var recommendationList;

        while (statusRoot.firstChild) {
            statusRoot.removeChild(statusRoot.firstChild);
        }

        statusBox.className = "ia-assistant-teoria-editor__status-box";
        statusBox.appendChild(statusTitle);

        if (!recommendations.length) {
            message = createTextElement(
                "p",
                "ia-assistant-teoria-editor__status-empty",
                "Sin recomendaciones pendientes."
            );
            statusBox.appendChild(message);
            statusRoot.appendChild(statusBox);
            return;
        }

        recommendationList = document.createElement("ul");
        recommendationList.className = "ia-assistant-teoria-editor__status-list-items";

        recommendations.forEach(function (recommendation) {
            recommendationList.appendChild(createTextElement(
                "li",
                "ia-assistant-teoria-editor__status-item",
                recommendation
            ));
        });

        statusBox.appendChild(recommendationList);
        statusRoot.appendChild(statusBox);
    }

    function createStatusSection(component) {
        var statusRoot = document.createElement("div");

        statusRoot.className = "ia-assistant-teoria-editor__status";
        renderTheoryStatus(statusRoot, component);

        return statusRoot;
    }

    function createEditorHeader() {
        var header = document.createElement("header");
        var heading = document.createElement("div");
        var title = document.createElement("h3");
        var badge = document.createElement("span");
        var description = document.createElement("p");

        header.className = "ia-assistant-teoria-editor__header";
        heading.className = "ia-assistant-teoria-editor__heading";
        title.className = "ia-assistant-teoria-editor__title";
        badge.className = "ia-assistant-teoria-editor__type-badge";
        description.className = "ia-assistant-teoria-editor__description";

        title.textContent = "Teor\u00eda";
        badge.textContent = "Markdown";
        description.textContent = "Crea contenido te\u00f3rico con formato Markdown simple.";

        heading.appendChild(title);
        heading.appendChild(badge);
        header.appendChild(heading);
        header.appendChild(description);

        return header;
    }

    function createTitleField(component, onStatusChange) {
        var field = document.createElement("label");
        var labelText = document.createElement("span");
        var help = document.createElement("span");
        var input = document.createElement("input");
        var componentData = component.data && typeof component.data === "object" ?
            component.data :
            {};

        field.className = "ia-assistant-teoria-editor__field";
        labelText.className = "ia-assistant-teoria-editor__label";
        labelText.textContent = "T\u00edtulo visible";
        help.className = "ia-assistant-teoria-editor__help";
        help.textContent = "Escribe el t\u00edtulo que ver\u00e1 el estudiante.";

        input.className = "ia-assistant-teoria-editor__input";
        input.name = "ia_assistant_teoria_titulo";
        input.type = "text";
        input.value = componentData.titulo || "";

        input.addEventListener("input", function () {
            updateDataField(component, "titulo", input.value);
            onStatusChange();
        });

        field.appendChild(labelText);
        field.appendChild(help);
        field.appendChild(input);

        return field;
    }

    function getSelectedText(textarea) {
        return textarea.value.slice(textarea.selectionStart, textarea.selectionEnd);
    }

    function replaceSelection(textarea, replacement, selectionMode) {
        textarea.setRangeText(
            replacement,
            textarea.selectionStart,
            textarea.selectionEnd,
            selectionMode || "end"
        );
    }

    function wrapSelection(textarea, beforeText, afterText, fallbackText) {
        var selectionStart = textarea.selectionStart;
        var selectedText = getSelectedText(textarea);
        var innerText = selectedText || fallbackText;
        var replacement = beforeText + innerText + afterText;
        var cursorStart;
        var cursorEnd;

        replaceSelection(textarea, replacement, "end");

        if (!selectedText) {
            cursorStart = selectionStart + beforeText.length;
            cursorEnd = cursorStart + fallbackText.length;
            textarea.setSelectionRange(cursorStart, cursorEnd);
        }
    }

    function prefixMarkdownLines(textarea, prefixText, fallbackText) {
        var value = textarea.value;
        var selectionStart = textarea.selectionStart;
        var selectionEnd = textarea.selectionEnd;
        var hasSelection = selectionStart !== selectionEnd;
        var lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
        var lineEnd = hasSelection ?
            selectionEnd :
            selectionStart;
        var selectedBlock;
        var replacement;

        if (!hasSelection) {
            replaceSelection(textarea, prefixText + fallbackText, "end");
            textarea.setSelectionRange(
                selectionStart + prefixText.length,
                selectionStart + prefixText.length + fallbackText.length
            );
            return;
        }

        if (lineEnd > lineStart && value.charAt(lineEnd - 1) === "\n") {
            lineEnd -= 1;
        }

        selectedBlock = value.slice(lineStart, lineEnd);
        replacement = selectedBlock
            .split("\n")
            .map(function (line) {
                return prefixText + line;
            })
            .join("\n");

        textarea.setRangeText(replacement, lineStart, lineEnd, "select");
    }

    function applyMarkdownAction(textarea, action) {
        if (action === "bold") {
            wrapSelection(textarea, "**", "**", "texto");
            return;
        }

        if (action === "italic") {
            wrapSelection(textarea, "*", "*", "texto");
            return;
        }

        if (action === "heading") {
            prefixMarkdownLines(textarea, "## ", "T\u00edtulo");
            return;
        }

        if (action === "list") {
            prefixMarkdownLines(textarea, "- ", "Elemento");
            return;
        }

        if (action === "code") {
            wrapSelection(textarea, "`", "`", "codigo");
            return;
        }

        if (action === "quote") {
            prefixMarkdownLines(textarea, "> ", "Cita");
        }
    }

    function createToolbarButton(label, action, textarea, component, onStatusChange) {
        var button = document.createElement("button");

        button.className = "ia-assistant-teoria-editor__toolbar-button";
        button.type = "button";
        button.textContent = label;
        button.addEventListener("click", function () {
            applyMarkdownAction(textarea, action);
            updateDataField(component, "contenido", textarea.value);
            onStatusChange();
            textarea.focus();
        });

        return button;
    }

    function createMarkdownToolbar(textarea, component, onStatusChange) {
        var toolbar = document.createElement("div");
        var actions = [
            { label: "B", action: "bold" },
            { label: "I", action: "italic" },
            { label: "H2", action: "heading" },
            { label: "Lista", action: "list" },
            { label: "C\u00f3digo", action: "code" },
            { label: "Cita", action: "quote" }
        ];

        toolbar.className = "ia-assistant-teoria-editor__toolbar";
        toolbar.setAttribute("aria-label", "Herramientas Markdown");

        actions.forEach(function (actionDefinition) {
            toolbar.appendChild(createToolbarButton(
                actionDefinition.label,
                actionDefinition.action,
                textarea,
                component,
                onStatusChange
            ));
        });

        return toolbar;
    }

    function createContentField(component, onStatusChange) {
        var field = document.createElement("div");
        var labelText = document.createElement("span");
        var help = document.createElement("span");
        var textarea = document.createElement("textarea");
        var componentData = component.data && typeof component.data === "object" ?
            component.data :
            {};

        field.className = "ia-assistant-teoria-editor__field";
        labelText.className = "ia-assistant-teoria-editor__label";
        labelText.textContent = "Contenido Markdown";
        help.className = "ia-assistant-teoria-editor__help";
        help.textContent = "Redacta el contenido usando Markdown simple.";

        textarea.className = "ia-assistant-teoria-editor__textarea";
        textarea.name = "ia_assistant_teoria_contenido";
        textarea.rows = 12;
        textarea.value = componentData.contenido || "";
        textarea.spellcheck = true;
        textarea.setAttribute("aria-label", "Contenido Markdown");

        textarea.addEventListener("input", function () {
            updateDataField(component, "contenido", textarea.value);
            onStatusChange();
        });

        field.appendChild(labelText);
        field.appendChild(help);
        field.appendChild(createMarkdownToolbar(textarea, component, onStatusChange));
        field.appendChild(textarea);

        return field;
    }

    window.IAAssistant.Studio.Components.TeoriaEditor = {
        render: function (container, component) {
            var editor = document.createElement("div");
            var statusRoot;

            function refreshStatus() {
                renderTheoryStatus(statusRoot, component);
            }

            ensureMarkdownFormat(component);

            editor.className = "ia-assistant-teoria-editor";
            statusRoot = createStatusSection(component);

            editor.appendChild(createEditorHeader());
            editor.appendChild(statusRoot);
            editor.appendChild(createTitleField(component, refreshStatus));
            editor.appendChild(createContentField(component, refreshStatus));

            container.appendChild(editor);
        }
    };
}());
