(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};
    window.IAAssistant.Studio = window.IAAssistant.Studio || {};

    window.IAAssistant.Studio.Renderer = {
        render: function () {
            var root = window.IAAssistant.Studio.Dom.getRoot();

            if (!root) {
                return;
            }

            window.IAAssistant.Studio.ComponentTabs.render(root);
        }
    };
}());
