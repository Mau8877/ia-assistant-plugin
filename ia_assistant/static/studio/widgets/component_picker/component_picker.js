(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};
    window.IAAssistant.Studio = window.IAAssistant.Studio || {};

    function createMenu() {
        var menu = document.createElement("div");

        menu.className = "ia-assistant-component-picker__menu";
        menu.hidden = true;

        return menu;
    }

    function getAvailableComponents() {
        return window.IAAssistant.Registry.getAvailable(
            window.IAAssistant.Studio.State.getComponents()
        );
    }

    function clearMenu(menu) {
        while (menu.firstChild) {
            menu.removeChild(menu.firstChild);
        }
    }

    function createEmptyMessage() {
        var emptyMessage = document.createElement("p");

        emptyMessage.className = "ia-assistant-component-picker__empty";
        emptyMessage.textContent = "No hay componentes disponibles.";

        return emptyMessage;
    }

    function createOption(componentDefinition, menu) {
        var option = document.createElement("button");

        option.className = "ia-assistant-component-picker__option";
        option.type = "button";
        option.textContent = componentDefinition.label;
        option.addEventListener("click", function () {
            window.IAAssistant.Studio.State.addComponent(componentDefinition.type);
            renderMenu(menu);
            menu.hidden = true;
        });

        return option;
    }

    function renderMenu(menu) {
        var availableComponents = getAvailableComponents();

        clearMenu(menu);

        if (!availableComponents.length) {
            menu.appendChild(createEmptyMessage());
            return;
        }

        availableComponents.forEach(function (componentDefinition) {
            menu.appendChild(createOption(componentDefinition, menu));
        });
    }

    window.IAAssistant.Studio.ComponentPicker = {
        init: function (root) {
            var dom = window.IAAssistant.Studio.Dom;
            var componentPicker = dom.getComponentPicker(root);
            var triggerButton = dom.getComponentPickerButton(root);
            var menu;

            if (!componentPicker || !triggerButton) {
                return;
            }

            menu = componentPicker.querySelector(".ia-assistant-component-picker__menu");

            if (!menu) {
                menu = createMenu();
                componentPicker.appendChild(menu);
            }

            renderMenu(menu);

            triggerButton.addEventListener("click", function () {
                renderMenu(menu);
                menu.hidden = !menu.hidden;
            });
        }
    };
}());
