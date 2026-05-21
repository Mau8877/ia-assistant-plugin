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

            window.IAAssistant.Studio.ComponentPicker.init(root);
        }
    };
}());
