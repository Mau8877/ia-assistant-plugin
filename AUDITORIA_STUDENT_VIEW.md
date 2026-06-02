# Auditoría de Student View de IA Assistant

## 1. Resumen ejecutivo

Student View existe como estructura mínima, pero todavía no renderiza `unidad_json`.

Actualmente:

- `student_view` carga `student/html/student.html`.
- `student_view` carga CSS/JS desde `STUDENT_CSS_PATHS` y `STUDENT_JS_PATHS`.
- No usa `Fragment.initialize_js(...)` en Student.
- No pasa `unidad_json` al frontend Student.
- `student.html` muestra un placeholder estático.
- `student/js/state.js`, `dom.js`, `renderer.js` y `events.js` existen, pero están vacíos.
- Los players Student por componente existen como archivos, pero están vacíos.

Lo que falta:

- pasar unidad persistida segura desde backend a Student;
- inicializar `window.IAAssistantStudent`;
- cargar estado Student desde `initial_unit`;
- renderizar título de unidad;
- renderizar componentes en orden;
- renderizar teoría Markdown compatible con Toast;
- renderizar quiz, pregunta abierta y código en modo alumno;
- manejar unidad vacía, JSON corrupto y componentes desconocidos.

Riesgo principal: asumir que Student ya puede leer lo guardado. Hoy `unidad_json` se guarda y Studio lo recupera, pero Student no recibe esa unidad ni tiene renderer real.

Próximo parche mínimo recomendado: pasar `initial_unit` a Student con `Fragment.initialize_js`, crear inicializador Student, implementar renderer vertical de cards y decidir si teoría usa Toast Viewer local o un renderer compatible agregado explícitamente.

## 2. Objetivo de Student fase 1

Student fase 1 debe:

- leer `unidad_json` persistido;
- mostrar título de unidad;
- renderizar componentes en orden;
- usar lista vertical de cards abiertas;
- renderizar teoría;
- renderizar quiz simple;
- renderizar pregunta abierta simple;
- renderizar código simple;
- no guardar respuestas;
- no calificar;
- no conectar IA.

No debe implementar progreso, historial, autosave de respuestas, ejecución de código ni generación asistida.

## 3. Diferencia entre Studio y Student

Studio es una interfaz de edición docente. Student es una interfaz de lectura e interacción para el alumno.

Por eso Student no debe copiar tabs de Studio. Las tabs en Studio sirven para editar, reordenar, renombrar, eliminar y alternar componentes. En Student, el alumno necesita recorrer contenido en orden, no administrar estructura.

Elementos de Studio que no deben aparecer en Student:

- picker de componentes;
- tabs editables;
- drag and drop;
- renombrar componentes;
- eliminar componentes;
- Ver JSON;
- Guardar;
- autoguardado;
- editores de campos;
- chatbar IA docente.

Elementos reutilizables:

- tokens de diseño en `common/css/tokens.css`;
- estilos base en `common/css/components.css`;
- colores por tipo de componente;
- cards;
- badges;
- espaciados;
- registry de componentes.

## 4. Estado actual de student_view

En `ia_assistant/xblock.py`, `student_view(self, context=None)` hace:

```python
if self._is_sdk_studio_mode():
    return self.studio_view(context)

fragment = Fragment(read_static_text(STUDENT_HTML_PATH))
self._add_css_resources(fragment, STUDENT_CSS_PATHS)
self._add_js_resources(fragment, STUDENT_JS_PATHS)
return fragment
```

HTML cargado:

```text
ia_assistant/static/student/html/student.html
```

CSS/JS:

- se cargan desde `ia_assistant/resources_manifest.py`;
- CSS con `STUDENT_CSS_PATHS`;
- JS con `STUDENT_JS_PATHS`.

Inicialización:

- no se encontró `Fragment.initialize_js(...)` en `student_view`;
- `student/js/student.js` es un IIFE mínimo;
- no recibe `runtime`, `element` ni `initial_unit`.

Datos iniciales:

- no se pasa `self.unidad_json` al frontend Student;
- no hay variable global embebida;
- no hay atributo DOM con JSON;
- no hay handler de carga posterior.

Relación con SDK:

- `sdk_view_mode == "studio"` hace que `student_view` devuelva `studio_view`;
- si `sdk_view_mode` no es `"studio"`, se renderiza Student mínimo.

## 5. Recursos Student actuales

| Archivo | Existe | Función actual | Observaciones |
|--------|--------|----------------|---------------|
| `ia_assistant/static/student/html/student.html` | Sí | Placeholder visual de Student. | Solo muestra título IA Assistant y mensaje estático. |
| `ia_assistant/static/student/css/student.css` | Sí | Estilos mínimos del placeholder. | No define cards de componentes ni layout de unidad. |
| `ia_assistant/static/student/js/student.js` | Sí | Crea namespace y loguea carga. | No inicializa estado ni renderer. |
| `ia_assistant/static/student/js/state.js` | Sí | Vacío. | Debe manejar unidad inicial en fase 1. |
| `ia_assistant/static/student/js/dom.js` | Sí | Vacío. | Debe centralizar selectores Student. |
| `ia_assistant/static/student/js/renderer.js` | Sí | Vacío. | Debe renderizar unidad y componentes. |
| `ia_assistant/static/student/js/events.js` | Sí | Vacío. | Debe conectar interacción local de quiz/pregunta/código si corresponde. |
| `student/components/teoria/teoria_player.js` | Sí | Vacío. | Debe renderizar teoría. |
| `student/components/quiz_multiple/quiz_multiple_player.js` | Sí | Vacío. | Debe renderizar quiz local. |
| `student/components/pregunta_abierta/pregunta_abierta_player.js` | Sí | Vacío. | Debe renderizar pregunta abierta local. |
| `student/components/codigo/codigo_player.js` | Sí | Vacío. | Debe renderizar código. |
| `student/components/revision/revision_player.js` | Sí | Vacío. | No implementar todavía salvo decisión explícita. |

## 6. Flujo deseado de Student

```text
student_view
-> leer unidad_json segura
-> pasar initial_unit al frontend
-> Student renderer inicializa
-> renderizar título
-> renderizar cards de componentes en orden
```

Estado actual:

| Paso | Estado |
|------|--------|
| `student_view` | Existe. |
| leer `unidad_json` segura | Existe helper privado para Studio: `_get_initial_unit()`. Puede reutilizarse. |
| pasar `initial_unit` a Student | Falta. |
| inicializador Student | Falta. |
| estado Student | Falta. |
| renderer de título | Falta. |
| renderer de cards | Falta. |
| players por componente | Archivos existen, pero están vacíos. |

## 7. Contrato JSON que debe leer Student

Unidad general:

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

Student debe mostrar `data.titulo` si existe y renderizar `data.contenido` como Markdown compatible con Toast. `data.formato` debe seguir siendo `"markdown"`.

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

Student debe mostrar pregunta, opciones, feedback local y permitir comprobación local sin persistir respuesta.

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

Student debe mostrar enunciado, textarea local y rúbrica como ayuda si existe.

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

Student debe mostrar enunciado, lenguaje, instrucciones y código base en bloque visual. No debe ejecutar código.

### Revisión

`revision` existe en schema/registry como:

- `authorable: false`;
- `system: true`;
- `studentVisible: true`;
- `allowMultiple: false`.

Aunque `studentVisible` es `true`, no hay implementación clara de player. Recomendación fase 1: ignorar `revision` o mostrarla solo si se define un comportamiento seguro.

## 8. Diseño recomendado para Student

| Diseño | Ventajas | Desventajas | Recomendación |
|-------|----------|-------------|---------------|
| Tabs | Permiten navegación compacta. | Copian metáfora de edición; ocultan contenido; no son ideales para lectura secuencial; sugieren administración de componentes. | No recomendado para Student fase 1. |
| Lista vertical de cards abiertas | Lectura natural; conserva orden; fácil de implementar; no oculta contenido; funciona bien en móvil. | Puede crecer mucho si la unidad es larga. | Recomendado para fase 1. |
| Acordeón | Reduce scroll y permite foco por componente. | Requiere estados, accesibilidad y decisiones sobre qué abrir/cerrar. | Mejora posterior. |

Conclusión: fase 1 debe usar lista vertical de cards abiertas. Acordeón puede venir después. Tabs no son recomendables para Student.

## 9. Render de teoría y Markdown

Studio guarda Markdown compatible con Toast UI. Las features aceptadas actualmente incluyen:

- párrafo;
- H1-H6;
- negrita;
- cursiva;
- tachado;
- separador;
- cita;
- lista con viñetas;
- lista numerada;
- checklist;
- tabla;
- link;
- código inline;
- bloque de código.

El navegador no renderiza Markdown por sí solo. Si se muestra `data.contenido` como texto crudo, el alumno verá `#`, `**`, tablas en texto y fences de código sin formato. Eso no cumple el objetivo de Student.

Opciones:

| Opción | Ventajas | Desventajas | Recomendación |
|--------|----------|-------------|---------------|
| Toast Viewer local | Compatible con Markdown que produce Toast; reduce parser propio; mejor soporte de tablas/checklists/tachado. | Requiere confirmar/agregar assets viewer locales y revisar sanitización. | Recomendado si se confirma viewer local. |
| Parser propio/básico | Control total; no suma vendor nuevo. | `markdown_basic.js` no cubre todo lo que Studio guarda; repetir parser es riesgoso. | No recomendado como renderer principal. |
| Markdown crudo | Muy simple. | Mala experiencia; no renderiza tablas/checklists/tachado. | No recomendado salvo fallback temporal. |

Recomendación: usar Toast Viewer local o un renderer compatible con Markdown extendido. Evitar depender del parser artesanal básico como solución final.

## 10. Vendor Toast / Viewer

Vendor actual:

```text
ia_assistant/static/vendor/toastui/README.md
ia_assistant/static/vendor/toastui/toastui-editor-all.min.js
ia_assistant/static/vendor/toastui/toastui-editor.min.css
```

No se encontraron archivos dedicados:

```text
toastui-editor-viewer.js
toastui-editor-viewer.css
```

La búsqueda dentro de `toastui-editor-all.min.js` muestra referencias internas a modo `viewer`, pero eso no confirma por sí solo la API pública exacta que conviene usar en Student. Pendiente de confirmar manualmente/documentalmente si el bundle standalone activo expone un modo Viewer estable, por ejemplo mediante alguna API de `window.toastui.Editor`.

Opciones para implementación posterior:

1. Confirmar si `toastui-editor-all.min.js` permite crear viewer de forma segura.
2. Si no, agregar vendor local explícito:

```text
vendor/toastui/toastui-editor-viewer.js
vendor/toastui/toastui-editor-viewer.css
```

Rutas posibles para manifest Student si se agregan assets dedicados:

```python
"vendor/toastui/toastui-editor-viewer.css",
"student/css/student.css",
```

```python
"vendor/toastui/toastui-editor-viewer.js",
"student/components/teoria/teoria_player.js",
```

No descargar ni agregar nada en esta auditoría.

## 11. Seguridad del render Markdown

Riesgos:

- HTML crudo dentro de Markdown;
- links con `javascript:`;
- imágenes o embeds externos;
- contenido raro persistido manualmente en `unidad_json`;
- uso de `innerHTML` directo con Markdown crudo.

Recomendaciones:

- no usar `innerHTML` directo con `data.contenido`;
- si se usa Toast Viewer, revisar configuración/sanitización antes de aceptar HTML crudo;
- mantener imágenes bloqueadas por ahora;
- tratar links con cuidado, idealmente `target="_blank"` y `rel="noopener noreferrer"` si se generan anchors;
- ignorar o mostrar fallback seguro para componentes desconocidos;
- si aparece HTML crudo no contemplado, no ejecutar scripts ni handlers;
- mantener Student tolerante: un componente inválido no debe romper toda la unidad.

Pendiente: política completa de HTML crudo. Studio hoy normaliza `<br>` e imágenes, pero no sanitiza todo HTML.

## 12. Render de quiz múltiple fase 1

Comportamiento recomendado:

- mostrar `data.pregunta`;
- si `respuestas_correctas.length <= 1`, renderizar opciones como radio;
- si `respuestas_correctas.length > 1`, renderizar opciones como checkbox;
- botón `Comprobar`;
- al comprobar, mostrar correcto/incorrecto local;
- mostrar `feedback` de opciones seleccionadas si existe;
- no persistir respuesta;
- no calificación global;
- no modificar `unidad_json`.

Archivos a tocar después:

- `student/components/quiz_multiple/quiz_multiple_player.js`;
- `student/css/student.css` o CSS específico del player si se decide cargarlo;
- `student/js/renderer.js` para delegar por tipo.

## 13. Render de pregunta abierta fase 1

Comportamiento recomendado:

- mostrar `data.enunciado`;
- textarea local para que el alumno redacte;
- mostrar `data.rubrica` como ayuda si existe;
- no guardar respuesta;
- no IA;
- no calificar;
- no feedback automático.

Esto puede implementarse con DOM nativo y `textContent` para textos del docente.

## 14. Render de código fase 1

Comportamiento recomendado:

- mostrar `data.enunciado`;
- mostrar `data.lenguaje` como badge si existe;
- mostrar `data.instrucciones` si existe;
- mostrar `data.codigo_base` en `<pre><code>`;
- opcional: textarea local para que el alumno escriba una solución, pero no es necesario para la primera versión si no se va a guardar ni ejecutar;
- no ejecutar código;
- no usar CodeMirror/Monaco todavía.

Para fase 1 conviene priorizar lectura clara del enunciado y código base.

## 15. Componente revision

`revision` existe en schema y registry como componente de sistema. No es authorable y no tiene editor normal de Studio.

Recomendación fase 1:

- ignorarlo en Student si aparece, o mostrar fallback seguro solo si el equipo define contenido visible;
- no hacerlo protagonista hasta que exista diseño de IA/revisión;
- no mezclarlo con calificación o feedback automático todavía.

## 16. Recursos y manifest

`resources_manifest.py` ya define:

```python
STUDENT_CSS_PATHS = [
    "common/css/tokens.css",
    "common/css/components.css",
    "student/css/student.css",
]
```

```python
STUDENT_JS_PATHS = [
    "common/js/namespace.js",
    "common/js/utils.js",
    "common/js/registry.js",
    "common/components/teoria/teoria.definition.js",
    "common/components/quiz_multiple/quiz_multiple.definition.js",
    "common/components/pregunta_abierta/pregunta_abierta.definition.js",
    "common/components/codigo/codigo.definition.js",
    "common/components/revision/revision.definition.js",
    "student/js/state.js",
    "student/js/dom.js",
    "student/js/renderer.js",
    "student/js/events.js",
    "student/components/teoria/teoria_player.js",
    "student/components/quiz_multiple/quiz_multiple_player.js",
    "student/components/pregunta_abierta/pregunta_abierta_player.js",
    "student/components/codigo/codigo_player.js",
    "student/components/revision/revision_player.js",
    "student/js/student.js",
]
```

Observaciones:

- hay orden razonable: common, definitions, student core, players, `student.js`;
- no se carga `markdown_basic.js` en Student actualmente;
- no se carga Toast Viewer/Editor en Student actualmente;
- si teoría usa Toast Viewer, habrá que agregar recursos vendor Student;
- si se agrega CSS por player, habrá que incluirlo en `STUDENT_CSS_PATHS`.

## 17. Parche mínimo recomendado

Backend:

- reutilizar `_get_initial_unit()` en `student_view`;
- pasar `initial_unit` y `load_warning` con `Fragment.initialize_js("IAAssistantStudent", ...)`;
- no crear handler de carga si no hace falta.

Frontend:

- crear `window.IAAssistantStudent(runtime, element, initArgs)`;
- implementar `Student.State.loadUnit(unit)`;
- implementar `Student.Dom` con root, título y contenedor de componentes;
- implementar `Student.Renderer.render(root)`;
- renderizar unidad vacía si no hay componentes;
- renderizar lista vertical de cards.

Markdown:

- confirmar Toast Viewer local antes de implementar teoría;
- si falta, agregar vendor viewer local en parche explícito;
- evitar `innerHTML` directo con Markdown crudo.

CSS:

- cards verticales;
- badges por tipo;
- colores por componente;
- layout responsive sencillo.

## 18. Archivos a modificar en implementación posterior

| Archivo | Cambio esperado | Riesgo |
|--------|-----------------|--------|
| `ia_assistant/xblock.py` | Pasar `initial_unit` a Student con `initialize_js`. | Medio: toca vista LMS/alumno. |
| `ia_assistant/resources_manifest.py` | Agregar Toast Viewer o CSS/JS de players si corresponde. | Medio: ruta faltante rompe render. |
| `ia_assistant/static/student/html/student.html` | Reemplazar placeholder por estructura de unidad y contenedor de componentes. | Bajo/medio. |
| `ia_assistant/static/student/js/student.js` | Inicializador `IAAssistantStudent`. | Medio. |
| `ia_assistant/static/student/js/state.js` | Guardar unidad inicial en memoria local Student. | Bajo. |
| `ia_assistant/static/student/js/dom.js` | Selectores Student. | Bajo. |
| `ia_assistant/static/student/js/renderer.js` | Render base de unidad y delegación por tipo. | Medio. |
| `student/components/teoria/teoria_player.js` | Render teoría con viewer/renderer compatible. | Alto: seguridad Markdown. |
| `student/components/quiz_multiple/quiz_multiple_player.js` | Interacción local de quiz. | Medio. |
| `student/components/pregunta_abierta/pregunta_abierta_player.js` | Textarea local y rúbrica. | Bajo. |
| `student/components/codigo/codigo_player.js` | Enunciado, lenguaje, instrucciones y bloque de código. | Bajo. |
| `student/css/student.css` | Layout vertical, cards, badges y estados. | Bajo. |
| `vendor/toastui/*viewer*` | Agregar si se decide usar Toast Viewer dedicado. | Medio: confirmar archivos reales. |
| Docs | Actualizar estado Student. | Bajo. |

## 19. Archivos que NO deben tocarse

En Student fase 1 no deben tocarse:

- Studio;
- persistencia/guardar salvo lectura compartida de `unidad_json`;
- IA;
- OpenRouter;
- Toast Editor de Studio;
- Toast adapter de Studio;
- vendor existente salvo agregar Viewer si se decide;
- schema salvo lectura;
- respuestas persistidas;
- calificaciones;
- nuevos componentes.

## 20. Plan de implementación por microtareas

1. Confirmar recursos Student actuales.
2. Pasar unidad persistida a Student.
3. Crear inicializador Student.
4. Crear renderer base de unidad.
5. Renderizar título y unidad vacía.
6. Renderizar teoría con viewer/renderer compatible.
7. Renderizar quiz local.
8. Renderizar pregunta abierta local.
9. Renderizar código.
10. Pulir cards y badges.
11. Probar en SDK/Open edX.

## 21. Pruebas manuales recomendadas

1. Crear unidad en Studio.
2. Guardar.
3. Abrir Student.
4. Ver título.
5. Ver teoría renderizada.
6. Ver tabla/checklist/link/código.
7. Ver quiz.
8. Probar Comprobar.
9. Ver pregunta abierta.
10. Ver código.
11. Probar unidad vacía.
12. Probar componente desconocido si es posible.
13. Confirmar que no hay errores en consola.
14. Confirmar que Studio no fue afectado.

## 22. Riesgos y decisiones pendientes

- Toast Viewer vs renderer propio.
- Confirmar API pública del bundle `toastui-editor-all.min.js` para modo viewer.
- Sanitización HTML.
- Links seguros.
- Imágenes.
- Acordeón futuro.
- Guardar respuestas futuro.
- Calificación futuro.
- Revisión/IA futuro.
- Qué mostrar ante componentes desconocidos.
- Qué hacer con `revision` si aparece en `unidad_json`.

## 23. Conclusión

Student View todavía es placeholder. No renderiza `unidad_json`, no recibe datos iniciales y no tiene players implementados.

La recomendación de diseño para fase 1 es lista vertical de cards abiertas, no tabs. El primer objetivo debe ser mostrar la unidad persistida en orden y de forma segura.

El punto más delicado es teoría: Studio guarda Markdown extendido compatible con Toast, por lo que Student debe usar Toast Viewer local o un renderer compatible. El parser básico actual no alcanza para cubrir todas las features aceptadas.

Próximo parche recomendado: pasar `initial_unit` a Student con `initialize_js`, crear el inicializador `IAAssistantStudent`, renderizar título/unidad vacía/cards, y resolver teoría con Viewer local o confirmar el modo viewer del bundle actual.

Mensaje de commit sugerido para futura implementación:

```text
feat: render persisted unit in student view
```

## 24. Nota de implementacion fase 1A

Student View fase 1A fue implementado despues de esta auditoria:

- `student_view` pasa `initial_unit` y `load_warning` con `Fragment.initialize_js`.
- `IAAssistantStudent` inicializa `Student.State`, `Student.Events` y `Student.Renderer`.
- Student renderiza titulo de unidad, unidad vacia y lista vertical de cards abiertas.
- Teoria usa Toast Viewer local desde `vendor/toastui/toastui-editor-viewer.js` y `vendor/toastui/toastui-editor-viewer.css`.
- Quiz multiple, pregunta abierta, codigo y revision quedan como placeholders seguros.
- No se guardan respuestas.
- No hay calificacion.
- No hay IA ni OpenRouter.

## 25. Nota SDK Workbench

Se retiro el escenario `IA Assistant - Student minimo` del XBlock SDK porque creaba una instancia separada con `unidad_json="{}"` y confundia la validacion contra el contenido guardado desde Studio.

Esto no elimina Student View real: `student_view`, `static/student/*`, `IAAssistantStudent`, recursos Student y renderer Student se mantienen. La validacion de Student debe hacerse luego desde una vista previa alumno conectada al JSON actual de Studio o desde Open edX/LMS real.

## 26. Nota de vista previa alumno en Studio

Se agrego una vista previa alumno dentro de Studio para validar la unidad actual sin depender de escenarios SDK separados:

- usa `window.IAAssistant.Studio.State.getUnit()`;
- no guarda ni llama backend;
- reutiliza `window.IAAssistant.Student.State` y `window.IAAssistant.Student.Renderer`;
- renderiza teoria con el player Student y Toast disponible en Studio;
- mantiene placeholders seguros para quiz multiple, pregunta abierta, codigo y revision hasta implementar sus players completos.

Student View real para LMS/Open edX se mantiene separado.

## 27. Nota de implementacion fase 1B

Student View fase 1B agrega players basicos para los componentes pendientes:

- quiz multiple renderiza opciones con radio o checkbox segun cantidad de respuestas correctas, permite comprobar localmente y muestra feedback de opciones seleccionadas;
- pregunta abierta muestra enunciado, textarea local y rubrica si existe;
- codigo muestra enunciado, lenguaje, instrucciones y bloque `<pre><code>` con `textContent`;
- las respuestas viven solo en el navegador y no se guardan;
- no hay calificacion global;
- no hay IA;
- el codigo no se ejecuta;
- `revision` sigue pendiente.

## 28. Nota de ajuste visual fase 1B

Se ajusto la salida visual de los players Student:

- quiz multiple muestra contador `X/Y` cuando hay varias respuestas correctas;
- el feedback de quiz se agrupa por opcion, con estado de correcta seleccionada, incorrecta seleccionada o correcta faltante;
- la rubrica de pregunta abierta no se muestra al alumno por ahora, porque puede contener criterios internos o respuesta esperada;
- codigo ahora muestra un textarea local inicializado con `codigo_base` y boton para restaurar la plantilla;
- nada de esto guarda respuestas ni llama backend;
- calificacion, persistencia de respuestas y visibilidad configurable de rubrica siguen pendientes.

## 29. Nota de UX quiz y codigo

Se refino la experiencia de Student/Preview:

- quiz multiple separa el detalle en secciones: correctas seleccionadas, correctas faltantes e incorrectas seleccionadas;
- quiz multiple mantiene resumen `X/Y` para respuestas multiples y muestra mensajes claros para seleccion exacta o parcial;
- respuesta unica conserva radio y muestra detalle estructurado de opcion seleccionada y respuesta correcta cuando corresponde;
- el textarea de codigo ahora funciona como editor basico local: `Tab` indenta, `Shift+Tab` desindenta y `Enter` conserva indentacion;
- el textarea de codigo desactiva autocorreccion/autocapitalizacion y mantiene fuente monoespaciada;
- no hay syntax highlighting, ejecucion, persistencia ni calificacion.
