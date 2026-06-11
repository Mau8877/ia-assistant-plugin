(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};
    window.IAAssistant.Studio = window.IAAssistant.Studio || {};

    var saveUrl = "";
    var generateTeacherUnitUrl = "";
    var generateTeacherComponentCreateUrl = "";
    var generateTeacherComponentEditUrl = "";

    function getCookie(name) {
        var cookieName = name + "=";
        var cookies = document.cookie ? document.cookie.split(";") : [];
        var index;
        var cookie;

        for (index = 0; index < cookies.length; index += 1) {
            cookie = cookies[index].trim();

            if (cookie.indexOf(cookieName) === 0) {
                return decodeURIComponent(cookie.slice(cookieName.length));
            }
        }

        return "";
    }

    function createJsonHeaders() {
        var csrfToken = getCookie("csrftoken") || getCookie("csrf_token");
        var headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "X-Requested-With": "XMLHttpRequest"
        };

        if (csrfToken) {
            headers["X-CSRFToken"] = csrfToken;
        } else if (window.console && window.console.warn) {
            window.console.warn(
                "No se encontro cookie CSRF; el guardado podria fallar con 403."
            );
        }

        return headers;
    }

    function parseJsonResponse(response) {
        return response.json().catch(function () {
            throw new Error("Respuesta invalida del servidor.");
        });
    }

    function createHttpError(response) {
        return response.text().catch(function () {
            return "";
        }).then(function () {
            if (response.status === 403) {
                throw new Error(
                    "No se pudo guardar la unidad: CSRF token faltante o invalido."
                );
            }

            throw new Error("No se pudo guardar la unidad.");
        });
    }

    function ensureOkResponse(payload) {
        if (!payload || payload.ok === false || payload.success === false) {
            throw new Error(
                payload && payload.error ?
                    payload.error :
                    "No se pudo guardar la unidad."
            );
        }

        return payload;
    }

    function postJson(url, payload) {
        if (!url) {
            return Promise.reject(
                new Error("No hay URL configurada para esta accion.")
            );
        }

        return fetch(url, {
            method: "POST",
            credentials: "same-origin",
            headers: createJsonHeaders(),
            body: JSON.stringify(payload || {})
        }).then(function (response) {
            if (!response.ok) {
                return createHttpError(response);
            }

            return parseJsonResponse(response);
        }).then(ensureOkResponse);
    }

    window.IAAssistant.Studio.Api = {
        configure: function (options) {
            var apiOptions = options || {};

            saveUrl = apiOptions.saveUrl || "";
            generateTeacherUnitUrl = apiOptions.generateTeacherUnitUrl || "";
            generateTeacherComponentCreateUrl =
                apiOptions.generateTeacherComponentCreateUrl || "";
            generateTeacherComponentEditUrl =
                apiOptions.generateTeacherComponentEditUrl || "";
        },

        isConfigured: function () {
            return Boolean(saveUrl);
        },

        saveUnit: function (unit) {
            return postJson(saveUrl, {
                unit: unit
            });
        },

        generateTeacherUnit: function (promptDocente, contexto) {
            return postJson(generateTeacherUnitUrl, {
                prompt_docente: promptDocente,
                contexto: contexto || {}
            });
        },

        generateTeacherComponentCreate: function (
            promptDocente,
            targetComponentType,
            unitContext
        ) {
            return postJson(generateTeacherComponentCreateUrl, {
                prompt_docente: promptDocente,
                target_component_type: targetComponentType,
                unit_context: unitContext || {}
            });
        },

        generateTeacherComponentEdit: function (
            promptDocente,
            activeComponent,
            unitContext
        ) {
            return postJson(generateTeacherComponentEditUrl, {
                prompt_docente: promptDocente,
                active_component: activeComponent,
                unit_context: unitContext || {}
            });
        }
    };
}());
