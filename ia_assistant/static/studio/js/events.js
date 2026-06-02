(function () {
    "use strict";

    window.IAAssistant = window.IAAssistant || {};
    window.IAAssistant.Studio = window.IAAssistant.Studio || {};

    var AUTOSAVE_INTERVAL_MS = 60000;
    var STATUS_CLEAR_MS = 2800;
    var ERROR_STATUS_CLEAR_MS = 4200;
    var SUCCESS_RESET_MS = 2200;
    var ERROR_RESET_MS = 3200;
    var isSaving = false;
    var autosaveTimerId = null;
    var lastSavedSnapshot = "";
    var buttonResetTimerId = null;
    var statusClearTimerId = null;

    function getCurrentSnapshot() {
        return JSON.stringify(window.IAAssistant.Studio.State.getUnit());
    }

    function getErrorMessage(error) {
        return error && error.message ?
            error.message :
            "No se pudo guardar la unidad.";
    }

    function hasLoadedContent() {
        var unit = window.IAAssistant.Studio.State.getUnit();
        var title = unit && typeof unit.titulo === "string" ? unit.titulo.trim() : "";
        var defaultTitles = [
            "Unidad sin titulo",
            "Unidad sin título",
            "Unidad sin tÃ­tulo"
        ];

        if (unit.componentes && unit.componentes.length) {
            return true;
        }

        return Boolean(title && defaultTitles.indexOf(title) < 0);
    }

    window.IAAssistant.Studio.Events = {
        init: function (root, initArgs) {
            var currentRoot = root || window.IAAssistant.Studio.Dom.getRoot();
            var settings = initArgs || {};

            if (!currentRoot) {
                return;
            }

            this.initUnitTitle(currentRoot);
            this.initJsonViewer(currentRoot);
            this.initSaveUnit(currentRoot);
            this.initStudentPreview(currentRoot);
            window.IAAssistant.Studio.ComponentPicker.init(currentRoot);
            window.IAAssistant.Studio.Renderer.render();
            this.initAutosave(currentRoot);

            if (settings.load_warning) {
                this.setSaveStatus(
                    currentRoot,
                    settings.load_warning,
                    "warning",
                    ERROR_STATUS_CLEAR_MS
                );
            } else if (hasLoadedContent()) {
                this.setSaveStatus(
                    currentRoot,
                    "Unidad cargada correctamente.",
                    "success",
                    STATUS_CLEAR_MS
                );
            }

            currentRoot.addEventListener("click", function (event) {
                if (!event.target.closest(".ia-assistant-component-picker__option")) {
                    return;
                }

                window.IAAssistant.Studio.Renderer.render();
            });
        },

        initUnitTitle: function (root) {
            var unitTitleInput = window.IAAssistant.Studio.Dom.getUnitTitleInput(root);
            var unitTitle = window.IAAssistant.Studio.State.getUnit().titulo ||
                "Unidad sin título";

            if (!unitTitleInput) {
                return;
            }

            unitTitleInput.value = unitTitle;
            unitTitleInput.addEventListener("input", function () {
                window.IAAssistant.Studio.State.setUnitTitle(unitTitleInput.value);
            });
        },

        clearSaveStatusLater: function (root, delay) {
            var self = this;

            if (statusClearTimerId) {
                window.clearTimeout(statusClearTimerId);
            }

            statusClearTimerId = window.setTimeout(function () {
                self.setSaveStatus(root, "", "idle");
            }, delay);
        },

        setSaveStatus: function (root, message, statusType, autoClearMs) {
            var saveStatus = window.IAAssistant.Studio.Dom.getSaveStatus(root);
            var cleanType = statusType || "neutral";

            if (!saveStatus) {
                return;
            }

            if (statusClearTimerId) {
                window.clearTimeout(statusClearTimerId);
                statusClearTimerId = null;
            }

            saveStatus.textContent = message || "";
            saveStatus.className = "ia-assistant-save-status " +
                "ia-assistant-save-status--" + cleanType;
            saveStatus.hidden = !message;

            if (message && autoClearMs) {
                this.clearSaveStatusLater(root, autoClearMs);
            }
        },

        setSaveButtonState: function (root, state, label) {
            var saveButton = window.IAAssistant.Studio.Dom.getSaveButton(root);
            var cleanState = state || "idle";

            if (!saveButton) {
                return;
            }

            if (buttonResetTimerId) {
                window.clearTimeout(buttonResetTimerId);
                buttonResetTimerId = null;
            }

            saveButton.classList.remove(
                "ia-assistant-save-button--saving",
                "ia-assistant-save-button--success",
                "ia-assistant-save-button--error"
            );
            saveButton.disabled = cleanState === "saving";
            saveButton.textContent = label || "Guardar";

            if (cleanState !== "idle") {
                saveButton.classList.add("ia-assistant-save-button--" + cleanState);
            }
        },

        resetSaveButtonLater: function (root, delay) {
            var self = this;

            if (buttonResetTimerId) {
                window.clearTimeout(buttonResetTimerId);
            }

            buttonResetTimerId = window.setTimeout(function () {
                self.setSaveButtonState(root, "idle", "Guardar");
            }, delay);
        },

        saveCurrentUnit: function (root, options) {
            var self = this;
            var saveOptions = options || {};
            var unit;
            var snapshot;

            if (isSaving) {
                return Promise.resolve(false);
            }

            if (
                !window.IAAssistant.Studio.Api ||
                !window.IAAssistant.Studio.Api.isConfigured ||
                !window.IAAssistant.Studio.Api.isConfigured()
            ) {
                return Promise.resolve(false);
            }

            unit = window.IAAssistant.Studio.State.getUnit();
            snapshot = JSON.stringify(unit);
            isSaving = true;

            if (saveOptions.showButtonFeedback) {
                self.setSaveButtonState(root, "saving", "Guardando...");
                self.setSaveStatus(root, "Guardando unidad...", "saving");
            } else {
                self.setSaveStatus(root, "Autoguardando...", "saving");
            }

            return window.IAAssistant.Studio.Api.saveUnit(unit).then(function (response) {
                lastSavedSnapshot = snapshot;

                if (saveOptions.showButtonFeedback) {
                    self.setSaveButtonState(root, "success", "✓ Guardado");
                    self.setSaveStatus(
                        root,
                        response.message || "Unidad guardada correctamente.",
                        "success",
                        STATUS_CLEAR_MS
                    );
                    self.resetSaveButtonLater(root, SUCCESS_RESET_MS);
                } else {
                    self.setSaveStatus(
                        root,
                        "Autoguardado realizado.",
                        "success",
                        STATUS_CLEAR_MS
                    );
                }

                return response;
            }).catch(function (error) {
                var errorMessage = getErrorMessage(error);

                if (saveOptions.showButtonFeedback) {
                    self.setSaveButtonState(root, "error", "Error");
                    self.resetSaveButtonLater(root, ERROR_RESET_MS);
                }

                self.setSaveStatus(
                    root,
                    errorMessage,
                    "error",
                    ERROR_STATUS_CLEAR_MS
                );
                throw error;
            }).finally(function () {
                isSaving = false;

                if (saveOptions.showButtonFeedback) {
                    return;
                }

                self.setSaveButtonState(root, "idle", "Guardar");
            });
        },

        initAutosave: function (root) {
            var self = this;

            lastSavedSnapshot = getCurrentSnapshot();

            if (autosaveTimerId) {
                window.clearInterval(autosaveTimerId);
            }

            autosaveTimerId = window.setInterval(function () {
                var currentSnapshot;

                if (isSaving) {
                    return;
                }

                if (
                    !window.IAAssistant.Studio.Api ||
                    !window.IAAssistant.Studio.Api.isConfigured ||
                    !window.IAAssistant.Studio.Api.isConfigured()
                ) {
                    return;
                }

                currentSnapshot = getCurrentSnapshot();

                if (currentSnapshot === lastSavedSnapshot) {
                    return;
                }

                self.saveCurrentUnit(root, {
                    source: "autosave",
                    showButtonFeedback: false
                }).catch(function () {
                    return false;
                });
            }, AUTOSAVE_INTERVAL_MS);
        },

        initSaveUnit: function (root) {
            var saveButton = window.IAAssistant.Studio.Dom.getSaveButton(root);
            var self = this;

            if (!saveButton) {
                return;
            }

            saveButton.addEventListener("click", function () {
                self.saveCurrentUnit(root, {
                    source: "manual",
                    showButtonFeedback: true
                }).catch(function () {
                    return false;
                });
            });
        },

        initStudentPreview: function (root) {
            var previewButton = window.IAAssistant.Studio.Dom.getStudentPreviewButton(root);
            var closeButtons = window.IAAssistant.Studio.Dom.getStudentPreviewCloseButtons(root);
            var preview = window.IAAssistant.Studio.Dom.getStudentPreview(root);
            var StudentPreview = window.IAAssistant.Studio.StudentPreview;

            if (!previewButton || !preview || !StudentPreview) {
                return;
            }

            previewButton.addEventListener("click", function () {
                StudentPreview.open(root);
            });

            Array.prototype.forEach.call(closeButtons, function (button) {
                button.addEventListener("click", function () {
                    StudentPreview.close();
                });
            });

            document.addEventListener("keydown", function (event) {
                if (event.key === "Escape" && !preview.hidden) {
                    StudentPreview.close();
                }
            });
        },

        initJsonViewer: function (root) {
            var jsonToggleButton = window.IAAssistant.Studio.Dom.getJsonToggleButton(root);
            var jsonModalOverlay = window.IAAssistant.Studio.Dom.getJsonModalOverlay(root);
            var jsonOutput = window.IAAssistant.Studio.Dom.getJsonOutput(root);
            var jsonCloseButton = window.IAAssistant.Studio.Dom.getJsonCloseButton(root);
            var jsonCopyButton = window.IAAssistant.Studio.Dom.getJsonCopyButton(root);

            function closeJsonModal() {
                jsonModalOverlay.hidden = true;
            }

            function setCopyButtonLabel(label) {
                jsonCopyButton.textContent = label;
            }

            function copyJsonFallback(text) {
                var textarea = document.createElement("textarea");

                textarea.value = text;
                textarea.className = "ia-assistant-json-copy-buffer";
                textarea.setAttribute("readonly", "readonly");
                root.appendChild(textarea);
                textarea.select();
                document.execCommand("copy");
                root.removeChild(textarea);
            }

            function copyJsonToClipboard() {
                var jsonText = jsonOutput.textContent || "";

                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(jsonText).then(function () {
                        setCopyButtonLabel("Copiado");
                    }).catch(function () {
                        copyJsonFallback(jsonText);
                        setCopyButtonLabel("Copiado");
                    });
                    return;
                }

                copyJsonFallback(jsonText);
                setCopyButtonLabel("Copiado");
            }

            if (
                !jsonToggleButton ||
                !jsonModalOverlay ||
                !jsonOutput ||
                !jsonCloseButton ||
                !jsonCopyButton
            ) {
                return;
            }

            jsonToggleButton.addEventListener("click", function () {
                var unit = window.IAAssistant.Studio.State.getUnit();

                jsonOutput.textContent = JSON.stringify(unit, null, 2);
                setCopyButtonLabel("Copiar JSON");
                jsonModalOverlay.hidden = false;
            });

            jsonCloseButton.addEventListener("click", function () {
                closeJsonModal();
            });

            jsonCopyButton.addEventListener("click", function () {
                copyJsonToClipboard();
            });

            jsonModalOverlay.addEventListener("click", function (event) {
                if (event.target === jsonModalOverlay) {
                    closeJsonModal();
                }
            });

            document.addEventListener("keydown", function (event) {
                if (event.key === "Escape" && !jsonModalOverlay.hidden) {
                    closeJsonModal();
                }
            });
        }
    };
}());
