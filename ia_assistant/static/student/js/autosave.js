(function () {
  "use strict";

  window.IAAssistant = window.IAAssistant || {};
  window.IAAssistant.Student = window.IAAssistant.Student || {};

  var saveTimer = null;
  var lastSavedPayload = "";
  var isSaving = false;
  var runtimeRef = null;
  var elementRef = null;
  var rootRef = null;
  var statusElement = null;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getAnswers() {
    var Answers = window.IAAssistant.Student.Answers;
    if (!Answers || typeof Answers.getAllAnswersMap !== "function") {
      return {};
    }
    return Answers.getAllAnswersMap();
  }

  function formatPayload(answers) {
    try {
      return JSON.stringify(answers || {});
    } catch (error) {
      return "";
    }
  }

  function setSaveStatus(message, variant) {
    if (!statusElement) {
      return;
    }
    statusElement.textContent = message || "";
    statusElement.className = "ia-assistant-student-save-status";
    if (variant) {
      statusElement.classList.add(
        "ia-assistant-student-save-status--" + variant,
      );
    }
  }

  function ensureStatusElement(root) {
    if (!root || !root.querySelector) {
      return null;
    }

    var existing = root.querySelector(
      "[data-ia-assistant-student-save-status]",
    );
    if (existing) {
      return existing;
    }

    var header = root.querySelector(".ia-assistant-student__header");
    var status = document.createElement("div");
    status.setAttribute("data-ia-assistant-student-save-status", "");
    status.className = "ia-assistant-student-save-status";
    status.textContent = "Guardado";

    if (header && header.parentNode) {
      header.parentNode.insertBefore(status, header.nextSibling);
    } else {
      root.insertBefore(status, root.firstChild);
    }

    return status;
  }

  function saveNow() {
    if (isSaving) {
      return;
    }

    var answers = getAnswers();
    var payloadString = formatPayload(answers);

    if (payloadString === lastSavedPayload) {
      setSaveStatus("Guardado", "saved");
      return;
    }

    if (!runtimeRef || !elementRef || !window.IAAssistant.Student.Api) {
      setSaveStatus("No se pudo guardar", "error");
      return;
    }

    isSaving = true;
    setSaveStatus("Guardando...", "saving");

    window.IAAssistant.Student.Api.saveAnswers(
      runtimeRef,
      elementRef,
      answers,
      function (result) {
        isSaving = false;

        if (result && result.ok) {
          lastSavedPayload = payloadString;
          setSaveStatus("Guardado", "saved");
          return;
        }

        var errorMessage = (result && result.error) || "No se pudo guardar";
        setSaveStatus(errorMessage, "error");
      },
    );
  }

  function scheduleSave() {
    if (saveTimer) {
      clearTimeout(saveTimer);
    }

    setSaveStatus("Cambios pendientes", "pending");
    saveTimer = setTimeout(saveNow, 1000);
  }

  function handleAnswerChange() {
    scheduleSave();
  }

  function flushPendingSave() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
      saveNow();
    }
  }

  function init(runtime, element, root) {
    if (!root) {
      return;
    }

    runtimeRef = runtime;
    elementRef = element;
    rootRef = root;
    statusElement = ensureStatusElement(root);

    if (statusElement) {
      var initialAnswers = getAnswers();
      lastSavedPayload = formatPayload(initialAnswers);
      setSaveStatus("Guardado", "saved");
    }

    if (typeof window.addEventListener === "function") {
      window.addEventListener(
        "ia-assistant:student-answer-change",
        handleAnswerChange,
      );
      window.addEventListener("beforeunload", function () {
        flushPendingSave();
      });
    }
  }

  window.IAAssistant.Student.AutoSave = {
    init: init,
    saveNow: saveNow,
    flushPendingSave: flushPendingSave,
    getRuntimeElement: function () {
      return { runtime: runtimeRef, element: elementRef };
    },
  };
})();
