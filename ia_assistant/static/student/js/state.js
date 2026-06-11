(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};
    window.IAAssistant.Student = window.IAAssistant.Student || {};

    var DEFAULT_TITLE = "Unidad sin título";
    var currentUnit = createDefaultUnit();

    function createDefaultUnit() {
        return {
            version: 1,
            titulo: DEFAULT_TITLE,
            componentes: []
        };
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function isObject(value) {
        return !!value && typeof value === "object" && !Array.isArray(value);
    }

    function isValidComponent(component) {
        return (
            isObject(component) &&
            typeof component.id === "string" &&
            typeof component.tipo === "string" &&
            typeof component.nombre === "string" &&
            isObject(component.data)
        );
    }

    function normalizeUnit(unit) {
        var normalized;

        if (!isObject(unit) || unit.version !== 1 || typeof unit.titulo !== "string" || !Array.isArray(unit.componentes)) {
            return createDefaultUnit();
        }

        normalized = {
            version: unit.version,
            titulo: unit.titulo,
            componentes: unit.componentes.filter(isValidComponent).map(function (component) {
                return clone(component);
            })
        };

        return normalized;
    }

    function loadUnit(unit) {
        currentUnit = normalizeUnit(unit);
        return getUnit();
    }

    function getUnit() {
        return clone(currentUnit);
    }

    function getComponents() {
        return getUnit().componentes;
    }

    window.IAAssistant.Student.State = {
        loadUnit: loadUnit,
        getUnit: getUnit,
        getComponents: getComponents
    };

    // Answers module: mantiene respuestas del alumno en memoria (solo frontend)
    (function () {
        var answersMap = Object.create(null);

        function normalizeAnswer(ans) {
            if (!ans || typeof ans !== 'object') return null;
            var out = {
                componentId: String(ans.componentId || ans.componentId === 0 ? ans.componentId : (ans.componentId || '')),
                tipo: ans.tipo || '',
                value: ans.value,
                metadata: ans.metadata || {}
            };
            return out;
        }

        function setAnswer(componentId, answerPayload) {
            if (!componentId) return false;
            var payload = normalizeAnswer(answerPayload) || { componentId: componentId, tipo: (answerPayload && answerPayload.tipo) || '', value: (answerPayload && answerPayload.value) || null, metadata: (answerPayload && answerPayload.metadata) || {} };
            payload.componentId = componentId;
            answersMap[String(componentId)] = clone(payload);
            return true;
        }

        function getAnswer(componentId) {
            if (!componentId) return null;
            var found = answersMap[String(componentId)];
            return found ? clone(found) : null;
        }

        function getAllAnswers() {
            return Object.keys(answersMap).map(function (k) { return clone(answersMap[k]); });
        }

        function clearAnswer(componentId) {
            if (componentId) {
                delete answersMap[String(componentId)];
            }
        }

        function hasAnswers() {
            return Object.keys(answersMap).length > 0;
        }

        window.IAAssistant.Student.Answers = {
            setAnswer: setAnswer,
            getAnswer: getAnswer,
            getAllAnswers: getAllAnswers,
            clearAnswer: clearAnswer,
            hasAnswers: hasAnswers
        };
    }());

}());
