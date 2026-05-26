(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};
    window.IAAssistant.Studio = window.IAAssistant.Studio || {};

    var currentUnit = createDefaultUnit();
    var activeComponentId = null;
    var componentTypeSequences = {};

    function createDefaultUnit() {
        return {
            version: 1,
            titulo: "Unidad sin título",
            componentes: []
        };
    }

    function cloneData(data) {
        return JSON.parse(JSON.stringify(data));
    }

    function findComponent(componentId) {
        return currentUnit.componentes.find(function (component) {
            return component.id === componentId;
        }) || null;
    }

    function hasComponentType(componentType) {
        return currentUnit.componentes.some(function (component) {
            return component.tipo === componentType;
        });
    }

    function createComponentId(componentType) {
        componentTypeSequences[componentType] = (componentTypeSequences[componentType] || 0) + 1;

        return componentType + "_" + componentTypeSequences[componentType];
    }

    window.IAAssistant.Studio.State = {
        getUnit: function () {
            return cloneData(currentUnit);
        },

        resetUnit: function () {
            currentUnit = createDefaultUnit();
            activeComponentId = null;
            componentTypeSequences = {};
        },

        setUnitTitle: function (title) {
            var cleanTitle = typeof title === "string" ? title.trim() : "";

            currentUnit.titulo = cleanTitle || "Unidad sin título";
        },

        addComponent: function (componentType) {
            var componentDefinition = window.IAAssistant.Registry.get(componentType);
            var component;

            if (!componentDefinition) {
                return null;
            }

            if (!componentDefinition.authorable) {
                return null;
            }

            if (!componentDefinition.allowMultiple && hasComponentType(componentDefinition.type)) {
                return null;
            }

            var componentId = createComponentId(componentDefinition.type);

            component = {
                id: componentId,
                tipo: componentDefinition.type,
                nombre: componentId,
                data: componentDefinition.createDefaultData()
            };

            currentUnit.componentes.push(component);
            activeComponentId = component.id;

            return cloneData(component);
        },

        removeComponent: function (componentId) {
            var initialLength = currentUnit.componentes.length;

            currentUnit.componentes = currentUnit.componentes.filter(function (component) {
                return component.id !== componentId;
            });

            if (activeComponentId === componentId) {
                activeComponentId = currentUnit.componentes.length ?
                    currentUnit.componentes[0].id :
                    null;
            }

            return currentUnit.componentes.length !== initialLength;
        },

        activateComponent: function (componentId) {
            if (!findComponent(componentId)) {
                return false;
            }

            activeComponentId = componentId;
            return true;
        },

        renameComponent: function (componentId, newName) {
            var component = findComponent(componentId);
            var cleanName = typeof newName === "string" ? newName.trim() : "";

            if (!component || !cleanName) {
                return false;
            }

            component.nombre = cleanName;
            return true;
        },

        updateComponentData: function (componentId, patch) {
            var component = findComponent(componentId);
            var dataPatch = patch && typeof patch === "object" ? patch : {};

            if (!component) {
                return null;
            }

            if (!component.data || typeof component.data !== "object") {
                component.data = {};
            }

            Object.keys(dataPatch).forEach(function (key) {
                component.data[key] = dataPatch[key];
            });

            return cloneData(component);
        },

        getComponents: function () {
            return cloneData(currentUnit.componentes);
        },

        getActiveComponent: function () {
            var activeComponent = findComponent(activeComponentId);

            if (!activeComponent) {
                return null;
            }

            return cloneData(activeComponent);
        },

        getActiveComponentId: function () {
            return activeComponentId;
        }
    };
}());
