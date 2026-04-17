window.IA_Components = window.IA_Components || {};

window.IA_Components.EDITOR_UNIDAD = class {
  constructor(element, handlerGuardar, jsonInicial) {
    this.ELEMENT = element;
    this.HANDLER_GUARDAR = handlerGuardar;
    this.INICIALIZAR_EVENTOS_TABS();
    this.INICIALIZAR_EVENTO_GUARDAR();

    let jsonCrudo = jsonInicial;

    // Esperamos a que el DOM esté listo para que Quill pueda dibujar sus editores
    $.when($.ready).then(() => {
      if (jsonCrudo && jsonCrudo.trim() !== "" && jsonCrudo !== "{}") {
        console.log(
          "[EDITOR] Datos previos recibidos desde Python. Restaurando...",
        );
        this.PROCESAR_NUEVO_JSON(jsonCrudo);
      } else {
        console.log("[EDITOR] No hay datos previos. Editor en blanco.");
      }
    });
  }

  _ESC(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  INICIALIZAR_EVENTOS_TABS() {
    $(".main-tab-btn", this.ELEMENT).click((e) => {
      let target = $(e.currentTarget);
      $(".main-tab-btn", this.ELEMENT).removeClass("active");
      $(".main-tab-content", this.ELEMENT).removeClass("active");
      target.addClass("active");
      $("#" + target.data("target"), this.ELEMENT).addClass("active");
    });

    $(".sub-tab-btn", this.ELEMENT).click((e) => {
      e.preventDefault();
      let target = $(e.currentTarget);
      $(".sub-tab-btn", this.ELEMENT).removeClass("active");
      $(".sub-tab-content", this.ELEMENT).removeClass("active-content").hide();
      target.addClass("active");
      $("#" + target.data("target"), this.ELEMENT)
        .show()
        .addClass("active-content");
    });
  }

  INICIALIZAR_EVENTO_GUARDAR() {
    $("#btn-guardar-final", this.ELEMENT).click((e) => {
      e.preventDefault();
      let $btn = $(e.currentTarget);

      let contenido_final = "";
      if ($("#vista-visual", this.ELEMENT).hasClass("active")) {
        contenido_final = this.RECOLECTAR_JSON_DE_PESTANAS();
        $("#contenido-preview", this.ELEMENT).val(contenido_final);
      } else {
        contenido_final = $("#contenido-preview", this.ELEMENT).val();
      }

      let originalText = $btn.find(".btn-text").text();
      this.BLOQUEAR_BOTON($btn, "Publicando...");
      this.OCULTAR_MENSAJES();

      $.ajax({
        type: "POST",
        url: this.HANDLER_GUARDAR,
        data: JSON.stringify({ contenido_final: contenido_final }),
        contentType: "application/json",
        success: (data) => {
          this.RESTAURAR_BOTON($btn, originalText);
          if (data.resultado === "ok") {
            $("#mensaje-estado", this.ELEMENT).slideDown(300);
            setTimeout(() => {
              $("#mensaje-estado", this.ELEMENT).slideUp(300);
            }, 4000);
          } else {
            this.MOSTRAR_ERROR(data.mensaje);
          }
        },
        error: () => {
          this.RESTAURAR_BOTON($btn, originalText);
          this.MOSTRAR_ERROR("Error al guardar en la base de datos.");
        },
      });
    });
  }

  PROCESAR_NUEVO_JSON(jsonString) {
    $("#contenido-preview", this.ELEMENT).val(jsonString);
    try {
      let jsonData = JSON.parse(jsonString);
      this.DISTRIBUIR_COMPONENTES_VISUALES(jsonData);
      $("#btn-guardar-final", this.ELEMENT).prop("disabled", false);
    } catch (e) {
      console.error("[EDITOR] Error crítico parseando JSON:", e);
      this.MOSTRAR_ERROR(
        "La IA devolvió contenido, pero el formato visual falló. Usa el Modo Avanzado.",
      );
    }
  }

  DISTRIBUIR_COMPONENTES_VISUALES(data) {
    let el = this.ELEMENT;
    $("#edit-titulo-unidad", el).val(data.titulo_unidad || "");
    $("#edit-teoria, #edit-quiz, #edit-abierta, #edit-codigo", el).empty();

    if (data.componentes && window.IA_Components.Renderers) {
      data.componentes.forEach((comp, idx) => {
        // Buscamos dinámicamente si existe una fábrica para este tipo de componente
        let renderFunction = window.IA_Components.Renderers[comp.tipo];

        if (renderFunction) {
          // Le pasamos el componente y nuestra función de escape
          let html = renderFunction(comp, this._ESC.bind(this), idx);

          // Lo enviamos a la pestaña correspondiente
          if (comp.tipo === "teoria") $("#edit-teoria", el).append(html);
          else if (comp.tipo === "quiz_multiple")
            $("#edit-quiz", el).append(html);
          else if (comp.tipo === "pregunta_abierta")
            $("#edit-abierta", el).append(html);
          else if (comp.tipo === "codigo") $("#edit-codigo", el).append(html);
        }
      });
    }

    // Inicializar Quill (Se queda igual que antes)
    $(".quill-container", el).each(function () {
      var quill = new Quill(this, {
        theme: "snow",
        modules: {
          toolbar: [
            ["bold", "italic", "underline", "strike"],
            [{ header: [1, 2, 3, false] }],
            [{ list: "ordered" }, { list: "bullet" }],
            [{ color: [] }, { background: [] }],
            ["code-block", "clean"],
          ],
        },
      });
      $(this).data("quill-instance", quill);
    });

    // Empty states (Se queda igual que antes)
    ["#edit-teoria", "#edit-quiz", "#edit-abierta", "#edit-codigo"].forEach(
      (target) => {
        if ($(target, el).is(":empty")) {
          $(target, el).html(
            '<div class="empty-state">No se generaron componentes de este tipo.</div>',
          );
        }
      },
    );
  }

  CARGAR_DATOS_EXISTENTES() {
    let jsonInicial = $("#json-inicial-db", this.ELEMENT).val();
    if (jsonInicial && jsonInicial.trim() !== "" && jsonInicial !== "{}") {
      console.log(
        "[EDITOR] Datos previos encontrados en la BD. Restaurando...",
      );
      this.PROCESAR_NUEVO_JSON(jsonInicial);
    } else {
      console.log("[EDITOR] No hay datos previos. Editor en blanco.");
    }
  }

  RECOLECTAR_JSON_DE_PESTANAS() {
    let el = this.ELEMENT;
    let data = {
      titulo_unidad: $("#edit-titulo-unidad", el).val(),
      componentes: [],
    };

    $(".comp-block", el).each(function () {
      let $bloque = $(this);
      let tipo = $bloque.data("tipo");
      let compObj = { tipo: tipo, id: $bloque.data("id") };

      if (tipo === "teoria") {
        let quillInst = $bloque.find(".quill-container").data("quill-instance");
        compObj.contenido_html = quillInst ? quillInst.root.innerHTML : "";
      } else if (tipo === "quiz_multiple") {
        compObj.preguntas = [];
        $bloque.find(".q-block").each(function () {
          let $q = $(this);
          let opciones = [];
          let radioName = $q.find('input[type="radio"]').first().attr("name");
          let correctaIdx =
            parseInt($q.find(`input[name="${radioName}"]:checked`).val()) || 0;

          $q.find(".d-opcion").each(function () {
            opciones.push($(this).val());
          });

          compObj.preguntas.push({
            enunciado: $q.find(".d-enunciado").val(),
            opciones: opciones,
            correcta: correctaIdx,
          });
        });
      } else if (tipo === "pregunta_abierta") {
        compObj.enunciado = $bloque.find(".d-enunciado-gral").val();
        compObj.puntos_clave = $bloque.find(".d-puntos").val() || "";
      } else if (tipo === "codigo") {
        compObj.enunciado = $bloque.find(".d-enunciado-gral").val();
        compObj.lenguaje = $bloque.find(".d-lenguaje").val();
        compObj.codigo_inicial = $bloque.find(".d-codigo-base").val();
        compObj.especificaciones = {
          entrada_esperada: $bloque.find(".d-entrada").val(),
          salida_esperada: $bloque.find(".d-salida").val(),
        };
        compObj.puntos_clave = $bloque.find(".d-puntos").val() || "";
      }

      data.componentes.push(compObj);
    });

    return JSON.stringify(data, null, 2);
  }

  // UTILS UI
  MOSTRAR_ERROR(mensaje) {
    $("#mensaje-estado", this.ELEMENT).hide();
    $("#mensaje-error .error-texto", this.ELEMENT).text(mensaje);
    $("#mensaje-error", this.ELEMENT).slideDown(200);
  }
  OCULTAR_MENSAJES() {
    $("#mensaje-error", this.ELEMENT).slideUp(200);
    $("#mensaje-estado", this.ELEMENT).slideUp(200);
  }
  BLOQUEAR_BOTON($btn, texto) {
    $btn.prop("disabled", true);
    $btn.find(".btn-text").text(texto);
  }
  RESTAURAR_BOTON($btn, texto) {
    $btn.prop("disabled", false);
    $btn.find(".btn-text").text(texto);
  }
};
