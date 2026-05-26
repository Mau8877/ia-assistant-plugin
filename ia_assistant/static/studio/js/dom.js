(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};
    window.IAAssistant.Studio = window.IAAssistant.Studio || {};

    window.IAAssistant.Studio.Dom = {
        getRoot: function () {
            return document.querySelector(".ia-assistant-studio");
        },

        getComponentPicker: function (root) {
            var currentRoot = root || this.getRoot();

            if (!currentRoot) {
                return null;
            }

            return currentRoot.querySelector(".ia-assistant-component-picker");
        },

        getComponentPickerButton: function (root) {
            var componentPicker = this.getComponentPicker(root);

            if (!componentPicker) {
                return null;
            }

            return componentPicker.querySelector(".ia-assistant-component-picker__button");
        },

        getComponentTabs: function (root) {
            var currentRoot = root || this.getRoot();

            if (!currentRoot) {
                return null;
            }

            return currentRoot.querySelector(".ia-assistant-component-tabs");
        },

        getComponentEditor: function (root) {
            var currentRoot = root || this.getRoot();

            if (!currentRoot) {
                return null;
            }

            return currentRoot.querySelector(".ia-assistant-component-editor");
        },

        getUnitTitleInput: function (root) {
            var currentRoot = root || this.getRoot();

            if (!currentRoot) {
                return null;
            }

            return currentRoot.querySelector("[data-ia-assistant-unit-title]");
        },

        getJsonToggleButton: function (root) {
            var currentRoot = root || this.getRoot();

            if (!currentRoot) {
                return null;
            }

            return currentRoot.querySelector(".ia-assistant-json-toggle");
        },

        getJsonPanel: function (root) {
            var currentRoot = root || this.getRoot();

            if (!currentRoot) {
                return null;
            }

            return currentRoot.querySelector(".ia-assistant-json-panel");
        },

        getJsonOutput: function (root) {
            var currentRoot = root || this.getRoot();

            if (!currentRoot) {
                return null;
            }

            return currentRoot.querySelector(".ia-assistant-json-output");
        },

        getJsonCloseButton: function (root) {
            var currentRoot = root || this.getRoot();

            if (!currentRoot) {
                return null;
            }

            return currentRoot.querySelector(".ia-assistant-json-close");
        }
    };
}());
