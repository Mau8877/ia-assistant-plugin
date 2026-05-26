(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};
    window.IAAssistant.Studio = window.IAAssistant.Studio || {};

    window.IAAssistant.Studio.Events = {
        init: function () {
            var root = window.IAAssistant.Studio.Dom.getRoot();

            if (!root) {
                return;
            }

            this.initUnitTitle(root);
            this.initJsonViewer(root);
            window.IAAssistant.Studio.ComponentPicker.init(root);
            window.IAAssistant.Studio.Renderer.render();

            root.addEventListener("click", function (event) {
                if (!event.target.closest(".ia-assistant-component-picker__option")) {
                    return;
                }

                window.IAAssistant.Studio.Renderer.render();
            });
        },

        initUnitTitle: function (root) {
            var unitTitleInput = window.IAAssistant.Studio.Dom.getUnitTitleInput(root);
            var unitTitle = window.IAAssistant.Studio.State.getUnit().titulo ||
                "Unidad sin título";

            if (!unitTitleInput) {
                return;
            }

            unitTitleInput.value = unitTitle;
            unitTitleInput.addEventListener("input", function () {
                window.IAAssistant.Studio.State.setUnitTitle(unitTitleInput.value);
            });
        },

        initJsonViewer: function (root) {
            var jsonToggleButton = window.IAAssistant.Studio.Dom.getJsonToggleButton(root);
            var jsonPanel = window.IAAssistant.Studio.Dom.getJsonPanel(root);
            var jsonOutput = window.IAAssistant.Studio.Dom.getJsonOutput(root);
            var jsonCloseButton = window.IAAssistant.Studio.Dom.getJsonCloseButton(root);

            if (!jsonToggleButton || !jsonPanel || !jsonOutput || !jsonCloseButton) {
                return;
            }

            jsonToggleButton.addEventListener("click", function () {
                var unit = window.IAAssistant.Studio.State.getUnit();

                jsonOutput.textContent = JSON.stringify(unit, null, 2);
                jsonPanel.hidden = false;
            });

            jsonCloseButton.addEventListener("click", function () {
                jsonPanel.hidden = true;
            });
        }
    };
}());
