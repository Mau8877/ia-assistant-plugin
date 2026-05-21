(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};

    window.IAAssistant.Registry.register({
        type: "quiz_multiple",
        label: "Quiz múltiple",
        allowMultiple: false,
        authorable: true,
        reviewable: true,
        system: false,
        studentVisible: true,
        createDefaultData: function () {
            return {
                pregunta: "",
                opciones: [],
                respuesta_correcta: ""
            };
        }
    });
}());
