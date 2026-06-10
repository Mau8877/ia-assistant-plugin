(function () {
  "use strict";

  window.IAAssistant = window.IAAssistant || {};
  window.IAAssistant.Studio = window.IAAssistant.Studio || {};

  var MODE_UNIT = "unit";
  var MODE_CREATE = "create";
  var MODE_EDIT = "edit";
  var MODE_IDLE = "idle";

  function getCleanPrompt(textarea) {
    return textarea && textarea.value ? textarea.value.trim() : "";
  }

  function normalizeText(value) {
    var text = value || "";

    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function includesAny(text, words) {
    return words.some(function (word) {
      return text.indexOf(word) >= 0;
    });
  }

  function getPayloadMessage(payload, fallbackMessage) {
    if (!payload) {
      return fallbackMessage;
    }

    return payload.message || payload.error || fallbackMessage;
  }

  function getTypeLabel(type) {
    var labels = {
      teoria: "Teoría",
      quiz_multiple: "Quiz",
      pregunta_abierta: "Pregunta abierta",
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

  function getShortComponentTitle(component) {
    var title = getComponentTitle(component);

    if (title.length <= 42) {
      return title;
    }

    return title.slice(0, 39) + "...";
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
    var computedStyle;
    var fontSize;
    var lineHeight;
    var paddingTop;
    var paddingBottom;
    var borderTop;
    var borderBottom;
    var maxHeight;

    if (!textarea) {
      return;
    }

    computedStyle = window.getComputedStyle(textarea);
    fontSize = parseFloat(computedStyle.fontSize) || 14;
    lineHeight = parseFloat(computedStyle.lineHeight) || fontSize * 1.35;
    paddingTop = parseFloat(computedStyle.paddingTop) || 0;
    paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;
    borderTop = parseFloat(computedStyle.borderTopWidth) || 0;
    borderBottom = parseFloat(computedStyle.borderBottomWidth) || 0;

    maxHeight = Math.ceil(
      lineHeight * 3 + paddingTop + paddingBottom + borderTop + borderBottom,
    );

    textarea.style.height = "auto";

    if (textarea.scrollHeight > maxHeight) {
      textarea.style.height = maxHeight + "px";
      textarea.style.overflowY = "auto";
      return;
    }

    textarea.style.height = textarea.scrollHeight + "px";
    textarea.style.overflowY = "hidden";
  }

  function detectComponentType(prompt) {
    var text = normalizeText(prompt);

    if (
      includesAny(text, [
        "pregunta abierta",
        "respuesta abierta",
        "pregunta de desarrollo",
        "desarrollo",
        "reflexion",
        "reflexiva",
      ])
    ) {
      return "pregunta_abierta";
    }

    if (
      includesAny(text, [
        "quiz",
        "cuestionario",
        "seleccion multiple",
        "opcion multiple",
        "opciones",
        "pregunta multiple",
        "preguntas multiples",
        "test",
      ])
    ) {
      return "quiz_multiple";
    }

    if (
      includesAny(text, [
        "codigo",
        "programa",
        "programacion",
        "algoritmo",
        "ejercicio de codigo",
        "java",
        "python",
        "javascript",
        "typescript",
        "c++",
        "c#",
        "php",
        "html",
        "css",
      ])
    ) {
      return "codigo";
    }

    if (
      includesAny(text, [
        "teoria",
        "teorico",
        "explicacion",
        "contenido teorico",
        "lectura",
        "concepto",
        "conceptos",
      ])
    ) {
      return "teoria";
    }

    return "";
  }

  function detectPromptIntent(prompt) {
    var text = normalizeText(prompt);
    var componentType = detectComponentType(prompt);
    var hasPrompt = Boolean(text.trim());
    var hasEditVerb;
    var hasCreateVerb;
    var hasUnitWord;
    var hasComponentWord;

    if (!hasPrompt) {
      return {
        mode: MODE_IDLE,
        componentType: "",
        confidence: "low",
      };
    }

    hasEditVerb = includesAny(text, [
      "edita",
      "editar",
      "modifica",
      "modificar",
      "mejora",
      "mejorar",
      "corrige",
      "corregir",
      "reescribe",
      "reescribir",
      "ajusta",
      "ajustar",
      "cambia",
      "cambiar",
      "amplia este",
      "resume este",
      "agrega feedback",
      "agregar feedback",
      "feedbacks",
    ]);

    hasCreateVerb = includesAny(text, [
      "crea",
      "crear",
      "genera",
      "generar",
      "haz",
      "hacer",
      "agrega",
      "agregar",
      "anade",
      "añade",
      "anadir",
      "añadir",
      "prepara",
      "preparar",
    ]);

    hasUnitWord = includesAny(text, [
      "unidad",
      "tema",
      "clase",
      "leccion",
      "leccion",
      "modulo",
      "curso",
    ]);

    hasComponentWord = includesAny(text, [
      "componente",
      "actividad",
      "ejercicio",
      "quiz",
      "cuestionario",
      "pregunta abierta",
      "codigo",
      "teoria",
    ]);

    if (hasEditVerb) {
      return {
        mode: MODE_EDIT,
        componentType: "",
        confidence: "high",
      };
    }

    if (hasComponentWord && (hasCreateVerb || componentType)) {
      return {
        mode: MODE_CREATE,
        componentType: componentType,
        confidence: componentType ? "high" : "medium",
      };
    }

    if (hasUnitWord) {
      return {
        mode: MODE_UNIT,
        componentType: "",
        confidence: "high",
      };
    }

    if (componentType && hasCreateVerb) {
      return {
        mode: MODE_CREATE,
        componentType: componentType,
        confidence: "medium",
      };
    }

    return {
      mode: MODE_UNIT,
      componentType: "",
      confidence: "low",
    };
  }

  window.IAAssistant.Studio.ChatbarIA = {
    init: function (root) {
      var currentRoot = root || window.IAAssistant.Studio.Dom.getRoot();
      var form;
      var textarea;
      var intentElement;
      var intentLabel;
      var submitButton;
      var statusElement;
      var proposalActions;
      var applyButton;
      var discardButton;
      var currentIntent = {
        mode: MODE_IDLE,
        componentType: "",
        confidence: "low",
      };
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
      intentElement = form.querySelector("[data-ia-assistant-chatbar-intent]");
      intentLabel = form.querySelector(
        "[data-ia-assistant-chatbar-intent-label]",
      );
      submitButton = form.querySelector("[data-ia-assistant-chatbar-submit]");
      statusElement = form.querySelector("[data-ia-assistant-chatbar-status]");
      proposalActions = form.querySelector(
        "[data-ia-assistant-chatbar-proposal-actions]",
      );
      applyButton = form.querySelector("[data-ia-assistant-chatbar-apply]");
      discardButton = form.querySelector("[data-ia-assistant-chatbar-discard]");

      if (!textarea || !submitButton || !intentElement || !intentLabel) {
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

      function getIntentLabel(intent) {
        var activeComponent;
        var activeText;

        if (!intent || intent.mode === MODE_IDLE) {
          return "Auto: escribe una indicación";
        }

        if (intent.mode === MODE_UNIT) {
          return "Detectado: Generar unidad";
        }

        if (intent.mode === MODE_CREATE) {
          if (!intent.componentType) {
            return "Detectado: Crear componente · tipo no detectado";
          }

          return (
            "Detectado: Crear componente · " +
            getTypeLabel(intent.componentType)
          );
        }

        if (intent.mode === MODE_EDIT) {
          activeComponent =
            window.IAAssistant.Studio.State.getActiveComponent();

          if (!activeComponent) {
            return "Detectado: Editar · sin componente activo";
          }

          activeText = getShortComponentTitle(activeComponent);

          return (
            "Detectado: Editar · " +
            activeText +
            " · " +
            getTypeLabel(activeComponent.tipo)
          );
        }

        return "Auto: escribe una indicación";
      }

      function getIntentClass(intent) {
        if (!intent || intent.mode === MODE_IDLE) {
          return "ia-assistant-chatbar__intent ia-assistant-chatbar__intent--idle";
        }

        if (intent.mode === MODE_CREATE && !intent.componentType) {
          return "ia-assistant-chatbar__intent ia-assistant-chatbar__intent--warning";
        }

        if (
          intent.mode === MODE_EDIT &&
          !window.IAAssistant.Studio.State.getActiveComponent()
        ) {
          return "ia-assistant-chatbar__intent ia-assistant-chatbar__intent--warning";
        }

        return (
          "ia-assistant-chatbar__intent ia-assistant-chatbar__intent--" +
          intent.mode
        );
      }

      function renderDetectedIntent() {
        currentIntent = detectPromptIntent(getCleanPrompt(textarea));

        intentLabel.textContent = getIntentLabel(currentIntent);
        intentElement.className = getIntentClass(currentIntent);
        intentElement.title = intentLabel.textContent;
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
        submitButton.disabled = isBusy;
        submitButton.textContent = isBusy ? "…" : "→";

        if (applyButton) {
          applyButton.disabled = isBusy || !pendingProposal;
        }

        if (discardButton) {
          discardButton.disabled = isBusy || !pendingProposal;
        }
      }

      function validateBeforeGenerate(prompt, intent) {
        var activeComponent;

        if (!prompt) {
          setStatus(
            statusElement,
            "Escribe una indicación antes de generar.",
            "warning",
          );
          return false;
        }

        if (intent.mode === MODE_CREATE && !intent.componentType) {
          setStatus(
            statusElement,
            "No pude detectar el tipo. Escribe teoría, quiz, pregunta abierta o código.",
            "warning",
          );
          renderDetectedIntent();
          return false;
        }

        if (intent.mode === MODE_EDIT) {
          activeComponent =
            window.IAAssistant.Studio.State.getActiveComponent();

          if (!activeComponent) {
            setStatus(
              statusElement,
              "Selecciona un componente para editar.",
              "warning",
            );
            renderDetectedIntent();
            return false;
          }
        }

        return true;
      }

      function getGeneratePromise(prompt, intent) {
        var Api = window.IAAssistant.Studio.Api;
        var State = window.IAAssistant.Studio.State;
        var unitContextValue = State.getUnit();
        var activeComponent;

        if (!Api) {
          return Promise.reject(new Error("La API de IA no está disponible."));
        }

        if (intent.mode === MODE_CREATE) {
          return Api.generateTeacherComponentCreate(
            prompt,
            intent.componentType,
            unitContextValue,
          );
        }

        if (intent.mode === MODE_EDIT) {
          activeComponent = State.getActiveComponent();

          return Api.generateTeacherComponentEdit(
            prompt,
            activeComponent,
            unitContextValue,
          );
        }

        return Api.generateTeacherUnit(prompt, unitContextValue);
      }

      function createProposalFromPayload(payload, intent) {
        if (!payload || payload.ok === false) {
          throw new Error(
            getPayloadMessage(payload, "No se pudo generar la propuesta."),
          );
        }

        if (intent.mode === MODE_CREATE || intent.mode === MODE_EDIT) {
          if (!payload.component) {
            throw new Error("La IA no devolvió un componente válido.");
          }

          return {
            kind: intent.mode,
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
        var intent = detectPromptIntent(prompt);

        currentIntent = intent;
        renderDetectedIntent();

        if (!validateBeforeGenerate(prompt, intent)) {
          return;
        }

        setPendingProposal(null);
        setBusy(true);
        setStatus(statusElement, "Generando propuesta...", "loading");

        getGeneratePromise(prompt, intent)
          .then(function (payload) {
            var proposal = createProposalFromPayload(payload, intent);

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
            renderDetectedIntent();
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
        renderDetectedIntent();
        updateChatbarVisibility();
      }

      textarea.addEventListener("input", function () {
        renderDetectedIntent();
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
        window.setTimeout(renderDetectedIntent, 0);
        window.setTimeout(updateChatbarVisibility, 0);
      });

      initOverlayVisibilityWatcher();
      renderDetectedIntent();
      setPendingProposal(null);
      resizeTextarea(textarea);
      updateChatbarVisibility();
    },
  };
})();
