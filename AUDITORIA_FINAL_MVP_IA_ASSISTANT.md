# Auditoría final del MVP IA Assistant

## 1. Resumen ejecutivo

El MVP actual de IA Assistant ya es demostrable como flujo docente-alumno básico: Studio permite crear una unidad visualmente, guardar el JSON persistente, recargarlo, autoguardarlo y previsualizar cómo se verá para el alumno.

Veredicto actual:

- Studio está maduro para el alcance MVP.
- Persistencia está funcional.
- Vista previa alumno está funcional dentro de Studio.
- Student básico está funcional localmente con renderer y players.
- Student real existe, pero todavía debe validarse en LMS/Open edX real.
- IA todavía no está implementada.
- Respuestas, progreso y calificación todavía no están implementados.

La próxima gran decisión es si avanzar hacia IA docente, respuestas/calificación del alumno o una rama corta de pulido visual y validación manual. La recomendación es hacer primero un pulido visual pequeño y checklist manual, y después abrir la rama de IA docente.

## 2. Alcance actual del MVP

El MVP incluye actualmente:

- Studio visual para edición docente.
- Componentes authorables: teoría, quiz múltiple, pregunta abierta y código.
- Teoría con Toast UI Editor en Studio.
- Generación de JSON de unidad.
- Persistencia de `unidad_json`.
- Guardado manual.
- Autoguardado periódico.
- Feedback visual de guardado.
- Botón `Ver JSON`.
- Vista previa alumno dentro de Studio.
- Student View real conservado.
- Renderer Student con lista vertical de cards.
- Players Student locales para teoría, quiz múltiple, pregunta abierta y código.

El MVP no incluye todavía:

- IA generativa.
- Guardado de respuestas de alumno.
- Calificación.
- Progreso.
- Ejecución de código.
- Editor avanzado de código tipo CodeMirror o Monaco.
- Acordeón o navegación avanzada en Student.
- Revisión automática.

## 3. Contrato JSON actual

Contrato general de unidad:

```json
{
  "version": 1,
  "titulo": "Unidad sin título",
  "componentes": []
}
```

### Teoría

```json
{
  "id": "teoria_1",
  "tipo": "teoria",
  "nombre": "teoria_1",
  "data": {
    "titulo": "",
    "formato": "markdown",
    "contenido": ""
  }
}
```

### Quiz múltiple

```json
{
  "id": "quiz_multiple_1",
  "tipo": "quiz_multiple",
  "nombre": "quiz_multiple_1",
  "data": {
    "pregunta": "",
    "opciones": [
      {
        "id": "opcion_1",
        "texto": "",
        "feedback": ""
      }
    ],
    "respuestas_correctas": []
  }
}
```

### Pregunta abierta

```json
{
  "id": "pregunta_abierta_1",
  "tipo": "pregunta_abierta",
  "nombre": "pregunta_abierta_1",
  "data": {
    "enunciado": "",
    "rubrica": ""
  }
}
```

### Código

```json
{
  "id": "codigo_1",
  "tipo": "codigo",
  "nombre": "codigo_1",
  "data": {
    "enunciado": "",
    "lenguaje": "",
    "codigo_base": "",
    "instrucciones": ""
  }
}
```

### Revisión

`revision` aparece como concepto de sistema en `ia_assistant/schema.py`, pero no está implementado como experiencia completa. No conviene forzarlo todavía hasta definir IA, revisión de respuestas y alcance pedagógico.

## 4. Estado de Studio

### 4.1 Funciones actuales

Studio tiene actualmente:

- Creación de unidad.
- Edición de título de unidad.
- Picker de componentes.
- Tabs de componentes.
- Renombrar componentes.
- Eliminar componentes.
- Reordenar componentes.
- Editores por componente.
- `Ver JSON`.
- `Guardar`.
- Autoguardado.
- Feedback visual de guardado.
- `Vista previa alumno`.

### 4.2 Teoría en Studio

La teoría usa Toast UI Editor mediante recursos locales. El contenido fuente se guarda como Markdown en `data.contenido`, con `data.formato` en `markdown`.

El flujo actual evita depender de HTML como fuente principal. También existe fallback artesanal para edición Markdown, lo cual reduce riesgo si Toast no carga. Según la documentación previa, imágenes quedan bloqueadas o fuera de alcance de la fase actual, y la normalización de saltos `<br>` ya fue tratada en la integración.

### 4.3 Quiz en Studio

Quiz múltiple permite configurar:

- Pregunta.
- Opciones.
- Feedback por opción.
- Respuestas correctas.

No guarda respuestas del alumno ni califica globalmente.

### 4.4 Pregunta abierta en Studio

Pregunta abierta permite configurar:

- Enunciado.
- Rúbrica.

La rúbrica existe en el JSON, pero en Student fase actual no se muestra automáticamente para evitar exponer criterios internos sin una opción de visibilidad.

### 4.5 Código en Studio

Código permite configurar:

- Enunciado.
- Lenguaje.
- Código base.
- Instrucciones.

El player Student usa ese código base como plantilla editable local, pero no ejecuta ni evalúa código.

### 4.6 Riesgos de Studio

Riesgos actuales:

- Cambios en `ia_assistant/resources_manifest.py` pueden romper el orden de carga del XBlock.
- Cambiar el contrato JSON sin migración rompería persistencia y renderers.
- El editor artesanal de teoría sigue siendo un fallback útil; retirarlo demasiado pronto aumentaría riesgo.
- Falta una política final para HTML crudo completo dentro del Markdown.
- La integración Toast depende de archivos vendor locales que deben mantenerse documentados.

## 5. Estado de persistencia

La persistencia usa el field `unidad_json` en `ia_assistant/xblock.py`, declarado como `String` con `Scope.content`.

El handler `save_unit`:

- Sigue decorado con `@XBlock.json_handler`.
- Recibe la unidad desde el payload.
- Valida estructura mínima.
- Guarda `unidad_json` como string JSON serializado.
- Devuelve respuesta con estado de éxito y unidad.

La carga inicial usa un helper backend para obtener unidad segura desde `unidad_json`, con fallback a unidad default y warning si el JSON persistido está vacío o corrupto.

En frontend:

- `ia_assistant/static/studio/js/state.js` tiene `State.loadUnit`.
- `ia_assistant/static/studio/js/api.js` guarda con `Api.saveUnit(unit)`.
- `api.js` corrige CSRF usando cookies `csrftoken` o `csrf_token`, `credentials: "same-origin"` y header `X-CSRFToken` cuando existe.
- Guardado manual funciona.
- Autoguardado funciona por snapshot.
- Feedback visual de guardado funciona.
- Al refrescar Studio, la unidad reaparece.

Qué se guarda:

- Unidad completa en `unidad_json`.
- `prompt_docente` puede actualizarse si llega en el payload, pero no hay flujo IA docente implementado todavía.

Qué no se guarda:

- Respuestas de alumno.
- Progreso.
- Calificaciones.
- Estado de preview.

## 6. Estado de Vista previa alumno

Studio incluye un botón `Vista previa alumno`.

La preview:

- Vive dentro de Studio.
- Usa `window.IAAssistant.Studio.State.getUnit()`.
- No depende de `unidad_json` persistido.
- No llama backend.
- No guarda.
- No modifica respuestas.
- Reutiliza `window.IAAssistant.Student.State` y `window.IAAssistant.Student.Renderer`.
- Renderiza la unidad actual como lista vertical de cards.

El escenario SDK `IA Assistant - Student minimo` fue eliminado porque creaba otra instancia vacía con `unidad_json="{}"`, lo que confundía las pruebas. Student View real no fue eliminado.

## 7. Estado de Student View real

`student_view` real existe en `ia_assistant/xblock.py`.

Estado actual:

- Carga HTML Student.
- Carga CSS/JS Student desde `ia_assistant/resources_manifest.py`.
- Usa `Fragment.initialize_js("IAAssistantStudent", ...)`.
- Recibe `initial_unit`.
- Usa Student renderer.
- Se mantiene como vista real para LMS/Open edX.

Pendiente:

- Validar Student real en Open edX/LMS real.
- Confirmar comportamiento exacto de publicación y lectura de `Scope.content` en el entorno final.

## 8. Estado de Student Renderer y players

### 8.1 Teoría

Teoría se renderiza con Toast Viewer o fallback seguro.

Soporta Markdown compatible con Toast, incluyendo elementos como encabezados, tablas, checklists, código y links si el viewer los procesa. El fallback evita inyectar Markdown como HTML directo.

### 8.2 Quiz múltiple

Quiz múltiple tiene player local:

- Usa radio si hay una respuesta correcta.
- Usa checkbox si hay varias respuestas correctas.
- Tiene botón `Comprobar`.
- Muestra resumen X/Y para respuestas múltiples.
- Separa feedback en:
  - correctas seleccionadas;
  - correctas faltantes;
  - incorrectas seleccionadas.
- Asocia feedback al texto de cada opción.
- No guarda respuesta.
- No califica globalmente.

### 8.3 Pregunta abierta

Pregunta abierta tiene player local:

- Muestra enunciado.
- Muestra textarea local.
- Oculta rúbrica por ahora.
- No guarda respuesta.
- No llama IA.
- No califica.

### 8.4 Código

Código tiene player local:

- Muestra enunciado.
- Muestra lenguaje.
- Muestra instrucciones.
- Muestra textarea editable inicializado con `codigo_base`.
- Soporta Tab para indentar.
- Soporta Shift+Tab para desindentar.
- Soporta Enter con indentación básica.
- Tiene botón para restaurar código base.
- No ejecuta código.
- No guarda respuesta.

### 8.5 Revisión

Revisión está pendiente. No conviene implementarla hasta definir respuestas, IA, rúbricas, visibilidad y reglas de feedback.

## 9. Seguridad y límites actuales

Límites y decisiones de seguridad:

- El código Student evita `innerHTML` con datos dinámicos del docente en los players básicos.
- Teoría delega render Markdown al Toast Viewer cuando está disponible.
- El fallback de teoría usa texto seguro.
- Imágenes en teoría no son parte confiable del alcance actual.
- HTML crudo completo sigue pendiente de política final.
- Links seguros siguen pendientes de revisión específica.
- No se guardan respuestas de alumno.
- No se ejecuta código.
- IA no está implementada.

Riesgo principal:

- Si en una rama futura se permite HTML crudo o Markdown enriquecido sin sanitización clara, puede aparecer riesgo XSS.

## 10. Estado visual / UX

Studio:

- Tiene una interfaz funcional de edición docente.
- Guardado y autoguardado tienen feedback visual.
- `Ver JSON` y `Vista previa alumno` ayudan a validar el contenido.

Preview y Student:

- Usan lista vertical de cards.
- Teoría se ve correctamente.
- Quiz tiene feedback más didáctico con secciones.
- Pregunta abierta es simple y clara.
- Código se siente como editor básico sin dependencia externa.
- Estados vacíos existen.

Pulidos posibles no urgentes:

- Revisar responsive final.
- Ajustar microcopy.
- Pulir espaciados de cards.
- Mejorar estados vacíos.
- Agregar accesibilidad básica más completa.

## 11. Estado de documentación

Documentos existentes:

- `ESTADO_STUDIO_IA_ASSISTANT.md`: estado general acumulado del Studio y avances recientes.
- `AUDITORIA_MARKDOWN_TEORIA.md`: análisis de teoría Markdown.
- `TOASTUI_INTEGRATION_PLAN.md`: plan de integración Toast UI.
- `AUDITORIA_TOASTUI_TEORIA.md`: auditoría específica de Toast en teoría.
- `AUDITORIA_PERSISTENCIA_STUDIO.md`: auditoría y estado de persistencia Studio.
- `AUDITORIA_STUDENT_VIEW.md`: auditoría y evolución de Student View.
- `AUDITORIA_FINAL_MVP_IA_ASSISTANT.md`: documento final de decisión del MVP.

Hay documentación útil pero parcialmente redundante. Más adelante convendría consolidar en un README técnico o guía de mantenimiento, pero no es urgente antes de la siguiente rama.

## 12. Matriz de estado del proyecto

| Área | Estado | Nivel de confianza | Comentario |
|------|--------|--------------------|------------|
| Studio base | Listo | Alto | Editor visual funcional para el MVP. |
| Teoría Studio | Funcional | Alto | Toast UI Editor local con Markdown. |
| Quiz Studio | Funcional | Alto | Configura pregunta, opciones, feedback y correctas. |
| Pregunta abierta Studio | Funcional | Alto | Configura enunciado y rúbrica. |
| Código Studio | Funcional | Alto | Configura enunciado, lenguaje, base e instrucciones. |
| Persistencia | Funcional | Alto | `unidad_json`, guardado manual y recarga. |
| Autoguardado | Funcional | Medio-alto | Guarda por snapshot y evita spam de requests. |
| Preview alumno | Funcional | Alto | Usa estado actual de Studio sin backend. |
| Student real | Parcial | Medio | Existe y renderiza, pendiente validar en LMS real. |
| Teoría Student | Funcional | Alto | Toast Viewer/fallback. |
| Quiz Student | Funcional | Medio-alto | Feedback local, sin persistencia. |
| Pregunta abierta Student | Funcional | Medio-alto | Textarea local, rúbrica oculta. |
| Código Student | Funcional | Medio-alto | Textarea tipo editor básico, sin ejecución. |
| Revisión | Pendiente | Bajo | Concepto de sistema sin experiencia completa. |
| IA | No implementado | Bajo | Falta flujo docente y proveedor. |
| Respuestas alumno | No implementado | Bajo | No hay almacenamiento ni scopes definidos. |
| Calificación | No implementado | Bajo | No hay scoring ni progreso. |
| Seguridad HTML | Riesgoso | Medio | Markdown ok en fase actual; HTML crudo pendiente. |
| Open edX real | Pendiente | Medio | Necesita validación fuera de SDK/preview. |

## 13. Riesgos técnicos principales

1. Manifest con rutas inexistentes rompe XBlock.
2. Student real debe validarse en Open edX real.
3. HTML crudo en Markdown todavía no tiene sanitización completa.
4. Rúbrica oculta no tiene opción configurable.
5. Respuestas de alumno no se guardan.
6. No hay calificación ni progreso.
7. IA futura puede generar JSON inválido si no se valida.
8. Código no se ejecuta ni se evalúa.
9. Si se retira fallback artesanal demasiado pronto, puede ser riesgoso.
10. Dependencia local Toast debe mantenerse documentada.

## 14. Qué NO conviene tocar más por ahora

Conviene congelar temporalmente:

- Contrato JSON actual.
- Studio base.
- Toast en teoría.
- Persistencia y autoguardado.
- Preview base.
- Players Student básicos.
- Manifest, salvo necesidad clara.

Estas áreas ya sostienen el MVP. Seguir tocándolas sin una razón concreta puede introducir regresiones y retrasar la siguiente rama de valor.

## 15. Opciones de siguientes ramas

### Opción A: Pulido visual final

Incluye:

- Responsive.
- Textos.
- Cards.
- Estados vacíos.
- Pequeños ajustes de UX.

Ventajas:

- Bajo riesgo.
- Mejora demo.
- Ayuda a estabilizar antes de IA.

Desventajas:

- No agrega funcionalidad grande.

### Opción B: IA docente

Incluye:

- Prompt docente.
- Generar `unidad_json`.
- Insertar propuesta en Studio.
- Validar JSON.
- Revisión manual antes de guardar.

Ventajas:

- Es el corazón del producto IA Assistant.
- Alto valor demostrable.

Desventajas:

- Riesgo alto.
- Depende de validación robusta.
- Requiere diseño de flujo y errores.

### Opción C: Respuestas del alumno

Incluye:

- Guardar respuestas.
- Progreso.
- Intentos.
- Calificación.

Ventajas:

- Convierte Student en actividad real.

Desventajas:

- Mucho backend.
- Decisiones de scopes.
- Privacidad y datos.
- Diseño de evaluación.

### Opción D: Revisión/feedback IA

Incluye:

- Usar rúbrica.
- Evaluar pregunta abierta.
- Revisar código.
- Dar feedback.

Ventajas:

- Muy potente pedagógicamente.

Desventajas:

- Depende de IA y respuestas persistidas.
- Alto riesgo funcional y de seguridad.

### Opción E: Acordeón/navegación Student

Incluye:

- Cards colapsables.
- Navegación por secciones.

Ventajas:

- Mejora UX.

Desventajas:

- No es prioritario frente a IA o respuestas.

## 16. Recomendación de siguiente paso

Recomendación:

1. Hacer una rama corta de pulido visual y checklist manual.
2. Después abrir la rama de IA docente.
3. Dejar respuestas/calificación para más adelante.

Motivo:

El MVP ya tiene una base sólida para mostrar una unidad creada manualmente. Antes de meter IA, conviene reducir ruido visual, validar el flujo completo con una unidad real y congelar el contrato actual. Luego IA docente tendrá más valor porque podrá generar una unidad que ya se edita, previsualiza y persiste correctamente.

## 17. Propuesta de rama IA docente futura

Alcance mínimo de IA fase 1:

- No guardar automáticamente.
- No llamar a Student.
- No calificar.
- Usar prompt docente.
- Generar propuesta de unidad JSON.
- Validar estructura.
- Insertar en `Studio.State`.
- Permitir que el docente revise.
- Guardar con flujo manual/autoguardado existente.

Flujo recomendado:

```text
prompt_docente
-> IA genera JSON
-> validación
-> previsualización/confirmación
-> insertar en Studio
-> docente edita
-> guardar
```

Riesgos:

- JSON inválido.
- Componente desconocido.
- Markdown inseguro.
- Imágenes.
- Prompts largos.
- Errores de proveedor.
- Fallback si no hay API key.

## 18. Propuesta de pulido visual futuro

Microtareas sugeridas:

- Revisar responsive de Studio.
- Revisar responsive de preview.
- Ajustar mensajes vacíos.
- Pulir copy de botones.
- Ajustar espaciado de cards.
- Revisar estado inicial de preview.
- Revisar accesibilidad básica de botones, modales y formularios.
- Confirmar que los mensajes de guardado desaparecen correctamente.
- Confirmar que no hay solapamientos visuales.

Modo oscuro queda pendiente salvo que se defina como requisito explícito.

## 19. Pruebas manuales recomendadas antes de seguir

Checklist:

1. Studio crea unidad completa.
2. Guardado manual.
3. Autoguardado.
4. Refrescar y recuperar unidad.
5. `Ver JSON`.
6. Vista previa alumno.
7. Teoría con Markdown completo.
8. Quiz de respuesta única.
9. Quiz de respuestas múltiples.
10. Pregunta abierta.
11. Código con editor básico.
12. Consola sin errores.
13. Manifest sin rutas faltantes.
14. Student real en LMS/Open edX, si el entorno está disponible.

## 20. Conclusión

El MVP actual está en un punto sano: Studio, persistencia, autoguardado y preview alumno ya permiten demostrar el producto como constructor de unidades interactivas. Student básico también existe y renderiza los componentes principales, aunque todavía sin respuestas persistidas, calificación ni IA.

El próximo paso recomendado es una rama breve de pulido visual y validación manual. Después, la rama de mayor valor es IA docente fase 1: generar una propuesta de `unidad_json`, validarla, insertarla en Studio y dejar que el docente revise antes de guardar.

Nota posterior: se aplicó una microfase de pulido visual del MVP y se creó `CHECKLIST_VALIDACION_MVP_IA_ASSISTANT.md` para validar manualmente Studio, persistencia, preview, Student y manifest antes de abrir la rama de IA docente.

Mensaje de commit sugerido para esta auditoría documental:

```text
docs: add final mvp audit
```
