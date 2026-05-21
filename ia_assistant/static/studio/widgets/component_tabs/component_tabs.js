(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};
    window.IAAssistant.Studio = window.IAAssistant.Studio || {};

    function clearTabs(tabsRoot) {
        while (tabsRoot.firstChild) {
            tabsRoot.removeChild(tabsRoot.firstChild);
        }
    }

    function createEmptyMessage() {
        var emptyMessage = document.createElement("p");

        emptyMessage.className = "ia-assistant-component-tabs__empty";
        emptyMessage.textContent = "Los componentes agregados apareceran aqui.";

        return emptyMessage;
    }

    function getComponentName(component) {
        return component.nombre || component.id;
    }

    function isVisibleInStudio(component) {
        var componentDefinition = window.IAAssistant.Registry.get(component.tipo);

            return Boolean(componentDefinition && componentDefinition.authorable);
    }

    function createRenameButton(component) {
        var renameButton = document.createElement("button");

        renameButton.className = "ia-assistant-component-tabs__rename";
        renameButton.type = "button";
        renameButton.textContent = "Editar";
        renameButton.setAttribute("aria-label", "Renombrar " + getComponentName(component));
        renameButton.addEventListener("click", function (event) {
            var newName;

            event.stopPropagation();
            newName = window.prompt("Nombre del componente", getComponentName(component));

            if (!newName || !newName.trim()) {
                return;
            }

            window.IAAssistant.Studio.State.renameComponent(component.id, newName);
            window.IAAssistant.Studio.Renderer.render();
        });

        return renameButton;
    }

    function createRemoveButton(component) {
        var removeButton = document.createElement("button");

        removeButton.className = "ia-assistant-component-tabs__remove";
        removeButton.type = "button";
        removeButton.textContent = "x";
        removeButton.setAttribute("aria-label", "Eliminar " + getComponentName(component));
        removeButton.addEventListener("click", function (event) {
            event.stopPropagation();

            if (!window.confirm("Eliminar componente?")) {
                return;
            }

            window.IAAssistant.Studio.State.removeComponent(component.id);
            window.IAAssistant.Studio.Renderer.render();
        });

        return removeButton;
    }

    function createTab(component, activeComponentId) {
        var tab = document.createElement("button");
        var label = document.createElement("span");

        tab.className = "ia-assistant-component-tabs__item";
        tab.type = "button";

        if (component.id === activeComponentId) {
            tab.className += " ia-assistant-component-tabs__item--active";
        }

        label.className = "ia-assistant-component-tabs__label";
        label.textContent = getComponentName(component);

        tab.appendChild(label);
        tab.appendChild(createRenameButton(component));
        tab.appendChild(createRemoveButton(component));
        tab.addEventListener("click", function () {
            window.IAAssistant.Studio.State.activateComponent(component.id);
            window.IAAssistant.Studio.Renderer.render();
        });

        return tab;
    }

    window.IAAssistant.Studio.ComponentTabs = {
        render: function (root) {
            var tabsRoot = window.IAAssistant.Studio.Dom.getComponentTabs(root);
            var components = window.IAAssistant.Studio.State.getComponents()
                .filter(isVisibleInStudio);
            var activeComponentId = window.IAAssistant.Studio.State.getActiveComponentId();

            if (!tabsRoot) {
                return;
            }

            clearTabs(tabsRoot);

            if (!components.length) {
                tabsRoot.appendChild(createEmptyMessage());
                return;
            }

            components.forEach(function (component) {
                tabsRoot.appendChild(createTab(component, activeComponentId));
            });
        }
    };
}());
