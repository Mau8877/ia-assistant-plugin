(function () {
  "use strict";

  window.IAAssistant = window.IAAssistant || {};
  window.IAAssistant.Studio = window.IAAssistant.Studio || {};

  var MODE_UNIT = "unit";
  var MODE_CREATE = "create";
  var MODE_EDIT = "edit";

  function getCleanPrompt(textarea) {
    return textarea && textarea.value ? textarea.value.trim() : "";
  }

  function getPayloadMessage(payload, fallbackMessage) {
    if (!payload) {
      return fallbackMessage;
    }

    return payload.message || payload.error || fallbackMessage;
  }

  function getDefaultPlaceholder(mode) {
    if (mode === MODE_CREATE) {
      return "Crea un componente basado en la unidad actual...";
    }

    if (mode === MODE_EDIT) {
      return "Mejora o ajusta el componente activo...";
    }

    return "Genera una unidad completa...";
  }

  function getTypeLabel(type) {
    var labels = {
      teoria: "Teoría",
      quiz_multiple: "Quiz",
      pregunta_abierta: "Abierta",
      codigo: "Código",
    };

    return labels[type] || type || "Componente";
  }

  function getComponentTitle(component) {
    var data = component && component.data ? component.data : {};

    return (
      data.titulo ||
      data.pregunta ||
      data.enunciado ||
      component.nombre ||
      component.id ||
      "Componente activo"
    );
  }

  function setStatus(statusElement, message, type) {
    var cleanType = type || "neutral";

    if (!statusElement) {
      return;
    }

    statusElement.textContent = message || "";
    statusElement.className =
      "ia-assistant-chatbar__status " +
      "ia-assistant-chatbar__status--" +
      cleanType;
    statusElement.hidden = !message;
  }

  function resizeTextarea(textarea) {
    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 96) + "px";
  }

  window.IAAssistant.Studio.ChatbarIA = {
    init: function (root) {
      var currentRoot = root || window.IAAssistant.Studio.Dom.getRoot();
      var form;
      var textarea;
      var modeSelect;
      var unitContext;
      var typeSelect;
      var activeComponentContext;
      var activeTitle;
      var activeType;
      var submitButton;
      var statusElement;
      var proposalActions;
      var applyButton;
      var discardButton;
      var currentMode = MODE_UNIT;
      var pendingProposal = null;

      if (!currentRoot) {
        return;
      }

      form = currentRoot.querySelector("[data-ia-assistant-chatbar]");

      if (
        !form ||
        form.getAttribute("data-ia-assistant-chatbar-ready") === "true"
      ) {
        return;
      }

      textarea = form.querySelector("[data-ia-assistant-chatbar-textarea]");
      modeSelect = form.querySelector(
        "[data-ia-assistant-chatbar-mode-select]",
      );
      unitContext = form.querySelector(
        "[data-ia-assistant-chatbar-unit-context]",
      );
      typeSelect = form.querySelector(
        "[data-ia-assistant-chatbar-component-type]",
      );
      activeComponentContext = form.querySelector(
        "[data-ia-assistant-chatbar-active-component]",
      );
      activeTitle = form.querySelector(
        "[data-ia-assistant-chatbar-active-title]",
      );
      activeType = form.querySelector(
        "[data-ia-assistant-chatbar-active-type]",
      );
      submitButton = form.querySelector("[data-ia-assistant-chatbar-submit]");
      statusElement = form.querySelector("[data-ia-assistant-chatbar-status]");
      proposalActions = form.querySelector(
        "[data-ia-assistant-chatbar-proposal-actions]",
      );
      applyButton = form.querySelector("[data-ia-assistant-chatbar-apply]");
      discardButton = form.querySelector("[data-ia-assistant-chatbar-discard]");

      if (!textarea || !modeSelect || !submitButton) {
        return;
      }

      form.setAttribute("data-ia-assistant-chatbar-ready", "true");
      currentRoot.classList.add("ia-assistant-studio--with-floating-chatbar");

      function isOverlayOpen() {
        return Boolean(
          currentRoot.querySelector(".ia-assistant-json-panel:not([hidden])") ||
          currentRoot.querySelector(
            ".ia-assistant-student-preview:not([hidden])",
          ),
        );
      }

      function updateChatbarVisibility() {
        var shouldHide = isOverlayOpen();

        form.hidden = shouldHide;
        currentRoot.classList.toggle(
          "ia-assistant-studio--with-floating-chatbar",
          !shouldHide,
        );
      }

      function initOverlayVisibilityWatcher() {
        var overlays = currentRoot.querySelectorAll(
          ".ia-assistant-json-panel, .ia-assistant-student-preview",
        );

        if (window.MutationObserver) {
          Array.prototype.forEach.call(overlays, function (overlay) {
            var observer = new MutationObserver(function () {
              updateChatbarVisibility();
            });

            observer.observe(overlay, {
              attributes: true,
              attributeFilter: ["hidden"],
            });
          });
        }

        currentRoot.addEventListener("click", function () {
          window.setTimeout(updateChatbarVisibility, 0);
        });

        document.addEventListener("keydown", function () {
          window.setTimeout(updateChatbarVisibility, 0);
        });

        updateChatbarVisibility();
      }

      function renderContext() {
        var activeComponent;

        if (unitContext) {
          unitContext.hidden = currentMode !== MODE_UNIT;
        }

        if (typeSelect) {
          typeSelect.hidden = currentMode !== MODE_CREATE;
        }

        if (activeComponentContext) {
          activeComponentContext.hidden = currentMode !== MODE_EDIT;
        }

        if (currentMode === MODE_EDIT && activeComponentContext) {
          activeComponent =
            window.IAAssistant.Studio.State.getActiveComponent();

          if (activeComponent) {
            activeTitle.textContent = getComponentTitle(activeComponent);
            activeType.textContent = getTypeLabel(activeComponent.tipo);
          } else {
            activeTitle.textContent = "Sin componente activo";
            activeType.textContent = "";
          }
        }

        textarea.placeholder = getDefaultPlaceholder(currentMode);
        resizeTextarea(textarea);
      }

      function setPendingProposal(proposal) {
        pendingProposal = proposal || null;

        if (proposalActions) {
          proposalActions.hidden = !pendingProposal;
        }

        if (applyButton) {
          applyButton.disabled = !pendingProposal;
        }

        if (discardButton) {
          discardButton.disabled = !pendingProposal;
        }
      }

      function setBusy(isBusy) {
        textarea.disabled = isBusy;
        modeSelect.disabled = isBusy;
        submitButton.disabled = isBusy;
        submitButton.textContent = isBusy ? "…" : "↑";

        if (typeSelect) {
          typeSelect.disabled = isBusy;
        }

        if (applyButton) {
          applyButton.disabled = isBusy || !pendingProposal;
        }

        if (discardButton) {
          discardButton.disabled = isBusy || !pendingProposal;
        }
      }

      function setMode(mode) {
        currentMode = mode || MODE_UNIT;
        modeSelect.value = currentMode;
        renderContext();
      }

      function validateBeforeGenerate(prompt) {
        var activeComponent;

        if (!prompt) {
          setStatus(
            statusElement,
            "Escribe una indicación antes de generar.",
            "warning",
          );
          return false;
        }

        if (currentMode === MODE_CREATE && (!typeSelect || !typeSelect.value)) {
          setStatus(
            statusElement,
            "Selecciona el tipo de componente.",
            "warning",
          );
          return false;
        }

        if (currentMode === MODE_EDIT) {
          activeComponent =
            window.IAAssistant.Studio.State.getActiveComponent();

          if (!activeComponent) {
            setStatus(
              statusElement,
              "Selecciona un componente para editar.",
              "warning",
            );
            renderContext();
            return false;
          }
        }

        return true;
      }

      function getGeneratePromise(prompt) {
        var Api = window.IAAssistant.Studio.Api;
        var State = window.IAAssistant.Studio.State;
        var unitContextValue = State.getUnit();
        var activeComponent;

        if (!Api) {
          return Promise.reject(new Error("La API de IA no está disponible."));
        }

        if (currentMode === MODE_CREATE) {
          return Api.generateTeacherComponentCreate(
            prompt,
            typeSelect.value,
            unitContextValue,
          );
        }

        if (currentMode === MODE_EDIT) {
          activeComponent = State.getActiveComponent();

          return Api.generateTeacherComponentEdit(
            prompt,
            activeComponent,
            unitContextValue,
          );
        }

        return Api.generateTeacherUnit(prompt, unitContextValue);
      }

      function createProposalFromPayload(payload) {
        if (!payload || payload.ok === false) {
          throw new Error(
            getPayloadMessage(payload, "No se pudo generar la propuesta."),
          );
        }

        if (currentMode === MODE_CREATE || currentMode === MODE_EDIT) {
          if (!payload.component) {
            throw new Error("La IA no devolvió un componente válido.");
          }

          return {
            kind: currentMode,
            component: payload.component,
          };
        }

        if (!payload.unit) {
          throw new Error("La IA no devolvió una unidad válida.");
        }

        return {
          kind: MODE_UNIT,
          unit: payload.unit,
        };
      }

      function generateProposal() {
        var prompt = getCleanPrompt(textarea);

        if (!validateBeforeGenerate(prompt)) {
          return;
        }

        setPendingProposal(null);
        setBusy(true);
        setStatus(statusElement, "Generando propuesta...", "loading");

        getGeneratePromise(prompt)
          .then(function (payload) {
            var proposal = createProposalFromPayload(payload);

            setPendingProposal(proposal);
            setStatus(
              statusElement,
              "Propuesta generada. Aplica o descarta.",
              "success",
            );
          })
          .catch(function (error) {
            setStatus(
              statusElement,
              error && error.message
                ? error.message
                : "No se pudo generar la propuesta.",
              "error",
            );
          })
          .finally(function () {
            setBusy(false);
            resizeTextarea(textarea);
            renderContext();
            updateChatbarVisibility();
          });
      }

      function applyPendingProposal() {
        var State = window.IAAssistant.Studio.State;
        var Renderer = window.IAAssistant.Studio.Renderer;
        var applied = false;

        if (!pendingProposal) {
          setStatus(statusElement, "No hay propuesta pendiente.", "warning");
          return;
        }

        if (pendingProposal.kind === MODE_CREATE) {
          applied = State.addGeneratedComponent(pendingProposal.component);
        } else if (pendingProposal.kind === MODE_EDIT) {
          applied = State.replaceComponent(pendingProposal.component);
        } else {
          applied = State.replaceUnit(pendingProposal.unit);
        }

        if (!applied) {
          setStatus(statusElement, "No se pudo aplicar la propuesta.", "error");
          return;
        }

        Renderer.render();
        setPendingProposal(null);
        setStatus(
          statusElement,
          "Propuesta aplicada. Revisa y presiona Guardar.",
          "success",
        );
        renderContext();
        updateChatbarVisibility();
      }

      modeSelect.addEventListener("change", function () {
        setMode(modeSelect.value);
        setStatus(statusElement, "", "neutral");
      });

      textarea.addEventListener("input", function () {
        resizeTextarea(textarea);
      });

      textarea.addEventListener("keydown", function (event) {
        if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
          event.preventDefault();
          generateProposal();
        }
      });

      form.addEventListener("submit", function (event) {
        event.preventDefault();
        generateProposal();
      });

      if (applyButton) {
        applyButton.addEventListener("click", function () {
          applyPendingProposal();
        });
      }

      if (discardButton) {
        discardButton.addEventListener("click", function () {
          setPendingProposal(null);
          setStatus(statusElement, "Propuesta descartada.", "neutral");
        });
      }

      currentRoot.addEventListener("click", function () {
        if (currentMode === MODE_EDIT) {
          window.setTimeout(renderContext, 0);
        }

        window.setTimeout(updateChatbarVisibility, 0);
      });

      initOverlayVisibilityWatcher();
      setMode(MODE_UNIT);
      setPendingProposal(null);
      resizeTextarea(textarea);
      updateChatbarVisibility();
    },
  };
})();
