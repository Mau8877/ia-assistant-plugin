(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};
    window.IAAssistant.Studio = window.IAAssistant.Studio || {};

    var saveUrl = "";

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

    window.IAAssistant.Studio.Api = {
        configure: function (options) {
            var apiOptions = options || {};

            saveUrl = apiOptions.saveUrl || "";
        },

        isConfigured: function () {
            return Boolean(saveUrl);
        },

        saveUnit: function (unit) {
            if (!saveUrl) {
                return Promise.reject(new Error("No hay URL de guardado configurada."));
            }

            return fetch(saveUrl, {
                method: "POST",
                credentials: "same-origin",
                headers: createJsonHeaders(),
                body: JSON.stringify({
                    unit: unit
                })
            }).then(function (response) {
                if (!response.ok) {
                    return createHttpError(response);
                }

                return parseJsonResponse(response);
            }).then(ensureOkResponse);
        }
    };
}());
