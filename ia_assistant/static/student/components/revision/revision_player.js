(function () {
  "use strict";

  window.IAAssistant = window.IAAssistant || {};
  window.IAAssistant.Student = window.IAAssistant.Student || {};
  window.IAAssistant.Student.Components =
    window.IAAssistant.Student.Components || {};

  function createElement(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) el.className = cls;
    if (typeof text === "string") el.textContent = text;
    return el;
  }

  function shortText(value, max) {
    max = max || 120;
    if (!value && value !== 0) return "";
    var s = String(value).trim();
    return s.length <= max ? s : s.slice(0, max - 1) + "…";
  }

  function getFriendlyTypeLabel(tipo) {
    if (tipo === "quiz_multiple") return "Quiz";
    if (tipo === "pregunta_abierta") return "Pregunta abierta";
    if (tipo === "codigo") return "Código";
    return String(tipo || "").replace(/_/g, " ");
  }

  var activeRevisionRoot = null;
  var revisionListenerRegistered = false;

  function getComponentTitle(component) {
    var data = component && component.data ? component.data : {};
    if (component.nombre && component.nombre !== component.id)
      return component.nombre;
    if (data.titulo) return data.titulo;
    if (data.pregunta) return data.pregunta;
    if (data.enunciado) return data.enunciado;
    return "Componente sin título";
  }

  function getComponentPrompt(component) {
    var data = component && component.data ? component.data : {};
    if (data.pregunta) return data.pregunta;
    if (data.enunciado) return data.enunciado;
    if (data.titulo) return data.titulo;
    return "";
  }

  function getQuizOptionMap(component) {
    var data = component && component.data ? component.data : {};
    var options = Array.isArray(data.opciones) ? data.opciones : [];
    return options.reduce(function (map, option, index) {
      var current = option || {};
      var id = String(current.id || "opcion_" + String(index + 1));
      map[id] = current;
      return map;
    }, {});
  }

  function getSelectedQuizText(component, answer) {
    if (
      !answer ||
      typeof answer.value === "undefined" ||
      answer.value === null ||
      answer.value === ""
    ) {
      return "";
    }
    var optionMap = getQuizOptionMap(component);
    var val = answer.value;
    var ids = Array.isArray(val) ? val : [String(val)];
    var labels = ids.map(function (id) {
      var option = optionMap[String(id)];
      if (option && typeof option.texto === "string" && option.texto.trim()) {
        return option.texto.trim();
      }
      return String(id);
    });
    return labels.join(", ");
  }

  function getCodePreview(code) {
    if (!code && code !== 0) return "";
    var text = String(code);
    var lines = text.split(/\r?\n/);
    var previewLines = lines.slice(0, 3);
    var preview = previewLines.join("\n");
    if (lines.length > 3) preview += "\n…";
    return preview;
  }

  function updateActiveRevisionSummary() {
    if (!activeRevisionRoot) return;
    var content = activeRevisionRoot.querySelector(
      ".ia-assistant-student-revision__content",
    );
    if (!content) return;
    content.innerHTML = "";
    content.appendChild(renderSummaryBox(activeRevisionRoot));
  }

  function handleAnswerChange() {
    updateActiveRevisionSummary();
  }

  function ensureRevisionListener() {
    if (revisionListenerRegistered) return;
    revisionListenerRegistered = true;
    if (
      typeof window !== "undefined" &&
      typeof window.addEventListener === "function"
    ) {
      window.addEventListener(
        "ia-assistant:student-answer-change",
        handleAnswerChange,
      );
    }
  }

  function determineStateAndSummary(component, answer) {
    var tipo = component.tipo;
    if (tipo === "quiz_multiple") {
      if (
        !answer ||
        typeof answer.value === "undefined" ||
        answer.value === null ||
        (Array.isArray(answer.value) && answer.value.length === 0) ||
        answer.value === ""
      ) {
        return { state: "Pendiente", summary: "" };
      }
      var selText = getSelectedQuizText(component, answer);
      if (!answer.metadata || !answer.metadata.checked) {
        return { state: "Respondido sin comprobar", summary: selText };
      }
      if (answer.metadata.isCorrect) {
        return { state: "Correcto", summary: selText };
      }
      return { state: "Revisar", summary: selText };
    }

    if (tipo === "pregunta_abierta") {
      var txt =
        answer && typeof answer.value === "string" ? answer.value.trim() : "";
      if (!txt) return { state: "Pendiente", summary: "" };
      return { state: "Respondido", summary: shortText(txt, 120) };
    }

    if (tipo === "codigo") {
      var code = answer && typeof answer.value === "string" ? answer.value : "";
      if (!code || !code.trim()) return { state: "Pendiente", summary: "" };
      var lang =
        answer && answer.metadata && answer.metadata.lenguaje
          ? answer.metadata.lenguaje
          : "";
      var summ = shortText(code, 120) + (lang ? " — " + lang : "");
      return { state: "Código escrito", summary: summ };
    }

    return { state: "Pendiente", summary: "" };
  }

  function renderSummaryBox(root) {
    var State = window.IAAssistant.Student.State;
    var Answers = window.IAAssistant.Student.Answers;
    var container = createElement(
      "div",
      "ia-assistant-student-revision__inner",
    );

    if (!State || !Answers) {
      container.appendChild(
        createElement(
          "p",
          "",
          "Módulos de estado o respuestas no disponibles.",
        ),
      );
      return container;
    }

    var components = State.getComponents() || [];
    var auditables = components.filter(function (c) {
      return (
        ["quiz_multiple", "pregunta_abierta", "codigo"].indexOf(c.tipo) >= 0
      );
    });

    if (!auditables.length) {
      container.appendChild(
        createElement(
          "p",
          "ia-assistant-student-revision__empty",
          "No hay actividades para revisar en esta unidad.",
        ),
      );
      return container;
    }

    // Count state categories and build cards
    var respondedCount = 0;
    var pendingCount = 0;
    var pendingCheckCount = 0;
    var correctCount = 0;
    var reviewCount = 0;
    var cardsWrapper = createElement(
      "div",
      "ia-assistant-student-revision__cards",
    );

    auditables.forEach(function (component) {
      var answer = null;
      try {
        answer = Answers.getAnswer(component.id);
      } catch (e) {
        answer = null;
      }
      var info = determineStateAndSummary(component, answer);
      if (info.state !== "Pendiente") respondedCount += 1;
      if (info.state === "Pendiente") pendingCount += 1;
      if (info.state === "Respondido sin comprobar") pendingCheckCount += 1;
      if (info.state === "Correcto") correctCount += 1;
      if (info.state === "Revisar") reviewCount += 1;

      var card = createElement("article", "ia-assistant-revision-card");
      var head = createElement("div", "ia-assistant-revision-card__head");
      var left = createElement("div", "ia-assistant-revision-card__left");
      var right = createElement("div", "ia-assistant-revision-card__right");

      var badge = createElement(
        "span",
        "ia-assistant-revision-card__type",
        getFriendlyTypeLabel(component.tipo),
      );
      var title = createElement(
        "h4",
        "ia-assistant-revision-card__title",
        getComponentTitle(component),
      );
      left.appendChild(badge);
      left.appendChild(title);

      var stateBadge = createElement(
        "span",
        "ia-assistant-revision-card__state ia-assistant-badge ia-assistant-badge--" +
          cssClassForState(info.state),
        info.state,
      );
      right.appendChild(stateBadge);

      head.appendChild(left);
      head.appendChild(right);

      var body = createElement("div", "ia-assistant-revision-card__body");
      var promptText = getComponentPrompt(component);
      if (promptText) {
        var promptLabel = createElement(
          "p",
          "ia-assistant-revision-card__prompt",
          (component.tipo === "codigo" ? "Consigna: " : "Pregunta: ") + promptText,
        );
        body.appendChild(promptLabel);
      }

      if (info.summary) {
        if (component.tipo === "codigo") {
          var codePreview = createElement(
            "pre",
            "ia-assistant-revision-card__code-preview",
            getCodePreview(answer.value),
          );
          body.appendChild(createElement("p", "ia-assistant-revision-card__label", "Tu respuesta:"));
          body.appendChild(codePreview);
          var lang =
            answer && answer.metadata && answer.metadata.lenguaje
              ? String(answer.metadata.lenguaje)
              : "";
          if (lang) {
            body.appendChild(
              createElement(
                "p",
                "ia-assistant-revision-card__language",
                "Lenguaje: " + lang,
              ),
            );
          }
        } else {
          body.appendChild(
            createElement(
              "p",
              "ia-assistant-revision-card__answer",
              "Tu respuesta: " + info.summary,
            ),
          );
        }
      } else {
        body.appendChild(
          createElement(
            "p",
            "ia-assistant-revision-card__noanswer",
            "No hay respuesta todavía.",
          ),
        );
      }

      card.appendChild(head);
      card.appendChild(body);
      cardsWrapper.appendChild(card);
    });

    // top summary
    var top = createElement("div", "ia-assistant-student-revision__top");
    var title = createElement(
      "h3",
      "ia-assistant-student-revision__title",
      "Revisión de la actividad",
    );
    var subtitle = createElement(
      "p",
      "ia-assistant-student-revision__subtitle",
      "Revisa tus respuestas antes de solicitar evaluación.",
    );
    var count = createElement(
      "p",
      "ia-assistant-student-revision__count",
      "Respuestas: " +
        String(respondedCount) +
        "/" +
        String(auditables.length) +
        " · Pendientes: " +
        String(pendingCount) +
        " · Sin comprobar: " +
        String(pendingCheckCount),
    );

    top.appendChild(title);
    top.appendChild(subtitle);
    top.appendChild(count);

    container.appendChild(top);
    container.appendChild(cardsWrapper);

    // info note
    var infoNote = createElement(
      "p",
      "ia-assistant-student-revision__note",
      "Esta revisión resume tus respuestas en esta sesión. La evaluación con IA se conectará en una siguiente fase.",
    );
    container.appendChild(infoNote);

    return container;
  }

  function cssClassForState(state) {
    if (!state) return "unknown";
    switch (state) {
      case "Pendiente":
        return "pending";
      case "Respondido sin comprobar":
        return "pending-check";
      case "Respondido":
        return "responded";
      case "Correcto":
        return "success";
      case "Revisar":
        return "error";
      case "Código escrito":
        return "code";
      default:
        return "unknown";
    }
  }

  function render(component, container) {
    // component parameter is synthetic; ignore its data and build from State
    var root = createElement("section", "ia-assistant-student-revision");
    var controls = createElement(
      "div",
      "ia-assistant-student-revision__controls",
    );
    var refresh = createElement(
      "button",
      "ia-assistant-student-revision__refresh",
      "Actualizar resumen",
    );
    refresh.type = "button";
    refresh.addEventListener("click", function () {
      // re-render summary area
      updateActiveRevisionSummary();
    });

    controls.appendChild(refresh);
    root.appendChild(controls);

    var content = createElement(
      "div",
      "ia-assistant-student-revision__content",
    );
    content.appendChild(renderSummaryBox(root));
    root.appendChild(content);

    if (activeRevisionRoot !== root) {
      activeRevisionRoot = root;
    }
    ensureRevisionListener();

    container.appendChild(root);
  }

  window.IAAssistant.Student.Components.RevisionPlayer = {
    render: render,
  };
})();
