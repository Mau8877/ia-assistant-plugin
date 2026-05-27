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
            var jsonModalOverlay = window.IAAssistant.Studio.Dom.getJsonModalOverlay(root);
            var jsonOutput = window.IAAssistant.Studio.Dom.getJsonOutput(root);
            var jsonCloseButton = window.IAAssistant.Studio.Dom.getJsonCloseButton(root);
            var jsonCopyButton = window.IAAssistant.Studio.Dom.getJsonCopyButton(root);

            function closeJsonModal() {
                jsonModalOverlay.hidden = true;
            }

            function setCopyButtonLabel(label) {
                jsonCopyButton.textContent = label;
            }

            function copyJsonFallback(text) {
                var textarea = document.createElement("textarea");

                textarea.value = text;
                textarea.className = "ia-assistant-json-copy-buffer";
                textarea.setAttribute("readonly", "readonly");
                root.appendChild(textarea);
                textarea.select();
                document.execCommand("copy");
                root.removeChild(textarea);
            }

            function copyJsonToClipboard() {
                var jsonText = jsonOutput.textContent || "";

                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(jsonText).then(function () {
                        setCopyButtonLabel("Copiado");
                    }).catch(function () {
                        copyJsonFallback(jsonText);
                        setCopyButtonLabel("Copiado");
                    });
                    return;
                }

                copyJsonFallback(jsonText);
                setCopyButtonLabel("Copiado");
            }

            if (
                !jsonToggleButton ||
                !jsonModalOverlay ||
                !jsonOutput ||
                !jsonCloseButton ||
                !jsonCopyButton
            ) {
                return;
            }

            jsonToggleButton.addEventListener("click", function () {
                var unit = window.IAAssistant.Studio.State.getUnit();

                jsonOutput.textContent = JSON.stringify(unit, null, 2);
                setCopyButtonLabel("Copiar JSON");
                jsonModalOverlay.hidden = false;
            });

            jsonCloseButton.addEventListener("click", function () {
                closeJsonModal();
            });

            jsonCopyButton.addEventListener("click", function () {
                copyJsonToClipboard();
            });

            jsonModalOverlay.addEventListener("click", function (event) {
                if (event.target === jsonModalOverlay) {
                    closeJsonModal();
                }
            });

            document.addEventListener("keydown", function (event) {
                if (event.key === "Escape" && !jsonModalOverlay.hidden) {
                    closeJsonModal();
                }
            });
        }
    };
}());
