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
        }
    };
}());
