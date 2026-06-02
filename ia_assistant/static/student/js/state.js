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
}());
