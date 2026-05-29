(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};
    window.IAAssistant.Studio = window.IAAssistant.Studio || {};

    function getRootFromElement(element) {
        var currentElement = element;

        if (currentElement && currentElement.jquery) {
            currentElement = currentElement[0];
        }

        if (
            currentElement &&
            currentElement.matches &&
            currentElement.matches(".ia-assistant-studio")
        ) {
            return currentElement;
        }

        if (currentElement && currentElement.querySelector) {
            return currentElement.querySelector(".ia-assistant-studio");
        }

        return window.IAAssistant.Studio.Dom.getRoot();
    }

    window.IAAssistantStudio = function (runtime, element, initArgs) {
        var settings = initArgs || {};
        var root = getRootFromElement(element);
        var saveUrl = "";

        if (
            runtime &&
            typeof runtime.handlerUrl === "function"
        ) {
            saveUrl = runtime.handlerUrl(element, "save_unit");
        }

        if (window.IAAssistant.Studio.Api) {
            window.IAAssistant.Studio.Api.configure({
                saveUrl: saveUrl
            });
        }

        if (window.IAAssistant.Studio.State.loadUnit) {
            window.IAAssistant.Studio.State.loadUnit(settings.initial_unit);
        }

        window.IAAssistant.Studio.Events.init(root, settings);

        if (window.console && window.console.log) {
            window.console.log("IA Assistant Studio cargado.");
        }
    };
}());
