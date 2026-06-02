(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};
    window.IAAssistant.Student = window.IAAssistant.Student || {};

    var TYPE_LABELS = {
        teoria: "Teoría",
        quiz_multiple: "Quiz múltiple",
        pregunta_abierta: "Pregunta abierta",
        codigo: "Código",
        revision: "Revisión"
    };

    function clearElement(element) {
        while (element && element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }

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

    function getTypeLabel(component) {
        var registry = window.IAAssistant.Registry;
        var definition = registry && registry.get ? registry.get(component.tipo) : null;

        return (definition && definition.label) || TYPE_LABELS[component.tipo] || component.tipo;
    }

    function getComponentTitle(component) {
        var data = component.data || {};

        if (component.nombre && component.nombre !== component.id) {
            return component.nombre;
        }

        return data.titulo || data.pregunta || data.enunciado || component.nombre || getTypeLabel(component);
    }

    function getTypeClass(componentType) {
        return String(componentType || "desconocido").replace(/[^a-zA-Z0-9_-]/g, "_");
    }

    function renderEmptyState(container) {
        var empty = createElement("section", "ia-assistant-student-empty");
        var title = createElement("h3", "ia-assistant-student-empty__title", "Unidad sin componentes");
        var message = createElement(
            "p",
            "ia-assistant-student-empty__message",
            "El contenido de esta unidad todavía no está disponible."
        );

        empty.appendChild(title);
        empty.appendChild(message);
        container.appendChild(empty);
    }

    function renderPlaceholder(component, container) {
        var message = createElement(
            "p",
            "ia-assistant-student-placeholder",
            "Este componente todavía no está disponible para el alumno."
        );

        message.setAttribute("data-component-type", component.tipo || "");
        container.appendChild(message);
    }

    function renderComponentBody(component, container) {
        var components = window.IAAssistant.Student.Components || {};
        var teoriaPlayer = components.TeoriaPlayer;

        if (
            component.tipo === "teoria" &&
            teoriaPlayer &&
            typeof teoriaPlayer.render === "function"
        ) {
            teoriaPlayer.render(component, container);
            return;
        }

        renderPlaceholder(component, container);
    }

    function renderCard(component, index) {
        var card = createElement(
            "article",
            "ia-assistant-student-card ia-assistant-student-card--" + getTypeClass(component.tipo)
        );
        var header = createElement("header", "ia-assistant-student-card__header");
        var meta = createElement("div", "ia-assistant-student-card__meta");
        var number = createElement("span", "ia-assistant-student-card__number", String(index + 1));
        var badge = createElement("span", "ia-assistant-student-card__badge", getTypeLabel(component));
        var title = createElement("h3", "ia-assistant-student-card__title", getComponentTitle(component));
        var body = createElement("div", "ia-assistant-student-card__body");

        meta.appendChild(number);
        meta.appendChild(badge);
        header.appendChild(meta);
        header.appendChild(title);
        card.appendChild(header);
        card.appendChild(body);

        renderComponentBody(component, body);

        return card;
    }

    function render(root) {
        var Dom = window.IAAssistant.Student.Dom;
        var State = window.IAAssistant.Student.State;
        var unit = State.getUnit();
        var titleElement = Dom.getTitle(root);
        var container = Dom.getComponentsContainer(root);

        if (!root || !container) {
            return;
        }

        if (titleElement) {
            titleElement.textContent = unit.titulo || "Unidad sin título";
        }

        clearElement(container);

        if (!unit.componentes.length) {
            renderEmptyState(container);
            return;
        }

        unit.componentes.forEach(function (component, index) {
            container.appendChild(renderCard(component, index));
        });
    }

    window.IAAssistant.Student.Renderer = {
        render: render
    };
}());
