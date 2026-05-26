# Auditoria Arquitectonica - IA Assistant

## 1. Resumen ejecutivo

El plugin esta bien encaminado para la etapa actual: hay separacion clara entre Python, common frontend, Studio y Student; los recursos se cargan desde un manifest; Studio usa un State centralizado; y los editores modifican `component.data` sin tocar identidad del componente.

No se observan errores graves de arquitectura que obliguen a detener el desarrollo. Si hay riesgos importantes antes de avanzar demasiado: el contrato esta duplicado entre `schema.py` y las definitions JS, el backend de guardado aun no valida, y el `Registry.get()` no expone metadata extra como `createDefaultOption`, lo que debilita la centralizacion recien agregada para opciones de quiz.

## 2. Estado actual del plugin

- `xblock.py` define el XBlock principal, campos persistentes, vistas separadas `student_view` y `studio_view`, carga de recursos y un handler minimo `save_unit`.
- Studio y Student estan separados por HTML, CSS, JS y listas de recursos distintas en `resources_manifest.py`.
- `resources_manifest.py` centraliza orden de carga de HTML, CSS y JS.
- `schema.py` define version, unidad default, tipos de componentes, flags, default data y campos editables por IA.
- `registry.js` registra componentes en frontend y permite listarlos, obtenerlos y filtrar authorables/reviewables.
- Las definitions JS existen para `teoria`, `quiz_multiple`, `pregunta_abierta`, `codigo` y `revision`.
- `state.js` mantiene la unidad en memoria, componente activo, secuencias por tipo y operaciones basicas CRUD de componentes.
- Existen editores funcionales para `teoria` y `quiz_multiple`.
- `pregunta_abierta` ya esta conectada al renderer con placeholder propio.
- `codigo` y `revision` tienen archivos de editor vacios, por ahora caen en placeholder generico si no se conectan.
- Studio incluye boton `Ver JSON`, que muestra `State.getUnit()` en un panel.

## 3. Flujo actual de Studio

1. `xblock.py` renderiza `studio/html/studio.html`.
2. `xblock.py` carga CSS y JS en el orden definido por `resources_manifest.py`.
3. `studio.js` llama a `window.IAAssistant.Studio.Events.init()`.
4. `events.js` inicializa el titulo de unidad, el visor JSON y el `ComponentPicker`.
5. `Renderer.render()` renderiza tabs y editor activo.
6. `State` guarda la unidad actual en memoria, incluyendo `version`, `titulo` y `componentes`.
7. `ComponentPicker` consulta `Registry.getAvailable()` y agrega componentes con `State.addComponent()`.
8. `ComponentTabs` renderiza tabs, activa componentes, renombra y elimina.
9. `Renderer` delega a editores especificos para `teoria`, `quiz_multiple` y `pregunta_abierta`.
10. Los editores actualizan solo `component.data` usando `State.updateComponentData()`.
11. `Ver JSON` serializa `State.getUnit()` para inspeccion manual.

## 4. Revision de responsabilidades por archivo

| Archivo | Responsabilidad actual | Esta bien ubicado? | Observaciones |
|---|---|---:|---|
| `xblock.py` | Clase XBlock, vistas, carga de recursos y handler minimo de guardado | Si | El handler `save_unit` aun no valida ni usa servicios. Bien para etapa inicial, insuficiente para persistencia real. |
| `resources_manifest.py` | Orden y rutas de recursos Studio/Student | Si | Buena decision. Evita mezclar paths en `xblock.py`. |
| `schema.py` | Contrato Python de unidad y componentes | Si | Buena base. Hay que mantenerlo sincronizado con definitions JS. |
| `validators.py` | Validacion backend futura | Si | Actualmente vacio; sera critico antes de guardar. |
| `services/unit_service.py` | Servicio de unidad futuro | Si | Actualmente vacio; buen lugar para normalizar/validar antes de persistir. |
| `config.py` | Configuracion futura, OpenRouter/API keys | Si | Actualmente vacio; correcto mientras no haya IA. |
| `utils/resources.py` | Lectura segura de archivos static | Si | Buena responsabilidad, con bloqueo de rutas absolutas y `..`. |
| `registry.js` | Registry frontend de componentes | Si | Riesgo: `copyComponentDefinition()` no copia helpers extra como `createDefaultOption`. |
| `definitions JS` | Contrato/defaults frontend por componente | Si | Duplican `schema.py`; aceptable por ahora, pero necesita control de consistencia. |
| `state.js` | Estado de Studio en memoria | Si | No mezcla DOM. Usa clones para devolver datos. |
| `dom.js` | Selectores centralizados | Si | Bien acotado. |
| `events.js` | Inicializacion y eventos globales de Studio | Si | Tiene un listener de click algo indirecto para re-render tras picker. Aceptable, pero mejorable. |
| `renderer.js` | Render de tabs y delegacion a editores | Si | Contiene placeholder generico y resolucion runtime de editores. Bien. |
| `studio.js` | Entry point de Studio | Si | Muy pequeno. Log de consola podria eliminarse mas adelante. |
| `api.js` | API frontend futura | Si | Vacio; no hay guardado frontend conectado todavia. |
| `messages.js` | Mensajes UI futuros | Si | Vacio; no preocupa por ahora. |
| `teoria_editor.js` | Editor de `data.titulo` y `data.contenido` | Si | Correcto y acotado. |
| `quiz_multiple_editor.js` | Editor de pregunta, opciones y respuestas correctas | Si | Funcional, pero ya concentra bastante logica; podria extraer helpers si crece. |
| `pregunta_abierta_editor.js` | Placeholder especifico | Si | Correcto para fase incremental. |
| `component_picker.js` | Agregar componentes authorables | Si | Bien conectado al registry y state. |
| `component_tabs.js` | Tabs, activar, renombrar, eliminar | Si | Correcto. Detalle menor de indentacion en `isVisibleInStudio`. |
| `chatbar_ia.js` | Chatbar futura | Si | Vacio; HTML/CSS existe. No es problema mientras IA no este conectada. |

## 5. Revision del schema y definitions

- Los tipos coinciden entre `schema.py` y las definitions JS: `teoria`, `quiz_multiple`, `pregunta_abierta`, `codigo`, `revision`.
- Los flags principales coinciden: `allow_multiple/allowMultiple`, `authorable`, `reviewable`, `system`, `student_visible/studentVisible`.
- Los defaults coinciden en los componentes revisados.
- `quiz_multiple` usa `respuestas_correctas: []` en `schema.py` y `quiz_multiple.definition.js`.
- Las opciones de `quiz_multiple` estan oficializadas como `{ id, texto, feedback }` en `schema.py` mediante `option_default_data` y en JS mediante `createDefaultOption(optionId)`.
- `pregunta_abierta` usa `rubrica` tanto en `schema.py` como en definition JS.
- `revision` sigue como `system: true`, `authorable: false`, `allowMultiple: false`; por tanto no deberia aparecer en picker ni tabs de Studio.

Riesgo detectado: aunque `quiz_multiple.definition.js` define `createDefaultOption`, `registry.js` no copia esa funcion en `Registry.get()`. En la practica, `quiz_multiple_editor.js` intenta usarla, pero recibe una copia sin ese helper y cae al fallback. El JSON resultante sigue bien, pero la centralizacion no esta funcionando completamente.

## 6. Revision de posibles duplicaciones

### Duplicacion aceptable

- `schema.py` y definitions JS duplican defaults y flags porque backend y frontend necesitan contrato local. Es aceptable en esta etapa.
- `state.js` replica la estructura base de unidad (`version`, `titulo`, `componentes`) para operar sin backend. Es aceptable mientras haya validacion backend antes de guardar.
- Los editores repiten helpers pequenos de DOM como `createDetailRow`. Es tolerable por ahora.

### Duplicacion peligrosa

- `schema.py` y definitions JS pueden divergir facilmente. Ya hay campos evolucionando rapido (`respuesta_correcta` a `respuestas_correctas`), asi que conviene vigilar.
- `quiz_multiple_editor.js` conoce estructura de opcion y tambien existe `createDefaultOption`. Si `Registry.get()` no expone ese helper, el editor vuelve a inventar el default por fallback.
- `renderer.js` tiene una cadena manual de `if` por tipo de componente. No es grave todavia, pero crecera con cada editor.
- `save_unit` guarda strings sin usar `validators.py`, `unit_service.py` ni `schema.py`. Antes de persistir datos reales, eso seria una duplicacion/omision peligrosa del contrato.

## 7. Revision pensando en IA futura

El diseno actual ayuda a una IA futura porque:

- Cada componente tiene `id` estable por tipo y secuencia.
- Los cambios de editores se hacen por `component.id`.
- `schema.py` tiene `ai_editable_fields`, una buena base para limitar que IA toque solo campos permitidos.
- Los datos editables viven en `component.data`, no mezclados con UI.
- `id`, `tipo`, `version` y flags estan fuera de los editores.
- OpenRouter aun no esta conectado, lo cual evita exponer claves o introducir complejidad prematura.

Riesgos para IA:

- Falta un resumen liviano/normalizado de unidad para prompts.
- Falta `prompt_builder.py` o equivalente para construir instrucciones seguras.
- Falta `openrouter_client.py` o servicio aislado.
- Falta validacion backend de respuestas IA antes de mezclar o guardar.
- Si `ai_editable_fields` no se usa estrictamente, la IA podria tocar `id`, `tipo`, `nombre`, `version` o campos no permitidos.
- Hay que decidir como la IA propone cambios: parche por componente, unidad completa propuesta o draft revisable.

## 8. Revision pensando en guardado backend

El diseno prepara parcialmente el guardado:

- Existe campo persistente `unidad_json`.
- Existe handler `save_unit`.
- Existe `schema.py` como contrato.
- Existen `validators.py` y `unit_service.py` como lugares adecuados para validacion/normalizacion.

Lo que falta antes de guardar de verdad:

- `save_unit` debe parsear `unidad_json` como JSON.
- Debe validar estructura base: `version`, `titulo`, `componentes`.
- Debe validar cada componente contra `COMPONENT_DEFINITIONS`.
- Debe rechazar tipos desconocidos y datos mal formados.
- Debe normalizar defaults faltantes sin pisar campos existentes validos.
- Debe validar reglas especificas: opciones de quiz, `respuestas_correctas` referenciando IDs existentes, `revision` no authorable, etc.
- `api.js` aun no llama al handler; el guardado frontend real esta pendiente.

## 9. Revision de errores de novato o riesgos

- No se ve logica de estado metida en `renderer.js`; el renderer consulta State y delega, lo cual esta bien.
- No se ve logica DOM metida en `state.js`; State no usa selectores ni nodos.
- Algunos editores todavia conocen schemas internos. En `quiz_multiple`, esto se mitigo con definition/schema, pero `Registry.get()` no expone `createDefaultOption`.
- Los paths de recursos estan en `resources_manifest.py`, no mezclados en `xblock.py`. Bien.
- Los IDs de componentes son estables en memoria y no se renumeran al eliminar. Bien.
- Las opciones de quiz usan IDs `opcion_N` y no se renumeran. Bien.
- No hay dependencia excesiva de posiciones en arrays para respuestas correctas; se usan IDs.
- No hay mezcla de Student con Studio en JS principal.
- `revision` no deberia aparecer en Studio porque `authorable` es false y tabs filtran por authorable.
- No hay conexion prematura a IA/OpenRouter.
- Archivos vacios (`api.js`, `messages.js`, `validators.py`, `unit_service.py`, `config.py`, algunos editores) no son problema por ahora, pero deben dejar de estar vacios antes de sus fases respectivas.
- Posible riesgo: `updateComponentData(..., { respuesta_correcta: undefined })` deja internamente una propiedad undefined hasta serializar/clonar. JSON la omite, pero seria mas limpio tener soporte explicito para borrar campos o una normalizacion.
- Posible riesgo: `studio.js` deja un `console.log`; no es grave, pero conviene quitarlo antes de entrega final.

## 10. Hallazgos

### Bien hecho

- Separacion clara entre Studio y Student.
- Manifest de recursos centralizado y ordenado.
- Namespace JS consistente.
- Registry comun para componentes.
- State centralizado y sin DOM.
- Renderer delega a editores por tipo.
- ComponentPicker lee del registry y respeta `authorable`/`allowMultiple`.
- ComponentTabs maneja activar, renombrar y eliminar sin tocar data.
- Editores actualizan `component.data` con patches pequenos.
- `quiz_multiple` ya evita renumerar opciones y usa IDs para respuestas correctas.
- `schema.py` incluye flags utiles para authoring, review, system, student y AI.

### Riesgos menores

- Helpers DOM repetidos entre renderer y editores.
- Placeholders y archivos vacios pueden confundir si no se documenta la etapa.
- Encoding/mojibake visible en algunos textos leidos por consola; en navegador puede depender de carga UTF-8.
- `events.js` usa un listener global de click para re-render tras picker; funciona, pero podria ser mas explicito.
- `studio.js` tiene log de consola.

### Riesgos importantes

- `Registry.get()` no copia `createDefaultOption`; la centralizacion de opciones quiz no se aprovecha realmente desde el editor.
- Backend de guardado no valida ni usa `validators.py`/`unit_service.py`.
- `schema.py` y definitions JS pueden divergir con facilidad.
- Falta estrategia de migracion/normalizacion formal para cambios de schema.
- `updateComponentData` no tiene semantica de eliminacion de claves; esto afecta migraciones como `respuesta_correcta` a `respuestas_correctas`.

### No es problema por ahora

- OpenRouter no conectado.
- Chatbar sin IA.
- Student poco desarrollado.
- `api.js` y `messages.js` vacios.
- `codigo_editor.js` y `revision_editor.js` vacios.
- No guardar automaticamente en `unidad_json` desde cada cambio.
- Placeholder generico para componentes sin editor completo.

## 11. Recomendaciones

### Hacer ahora

1. Ajustar `registry.js` para preservar helpers seguros de definitions, al menos `createDefaultOption`.
2. Revisar que `schema.py` y definitions JS sigan sincronizados despues del cambio a `respuestas_correctas`.
3. Decidir una forma limpia de eliminar campos obsoletos desde `State.updateComponentData` o desde una normalizacion.
4. Documentar que `api.js`, `validators.py` y `unit_service.py` estan pendientes por fase, no olvidados.
5. Mantener el avance incremental de editores sin conectar backend/IA todavia.

### Hacer despues de terminar editores Studio

1. Crear editores reales para `pregunta_abierta`, `codigo` y, si aplica, revision system-only.
2. Extraer helpers comunes de editores si la duplicacion crece.
3. Considerar un mapa de editores en renderer para evitar una cadena larga de `if`.
4. Revisar accesibilidad basica de inputs, botones y tabs.
5. Revisar textos con acentos y encoding en todos los archivos.

### Hacer cuando toque backend/guardado

1. Implementar `validators.py` contra `schema.py`.
2. Implementar `unit_service.py` para parsear, validar, normalizar y serializar unidad.
3. Cambiar `save_unit` para usar validators/service antes de persistir.
4. Implementar `api.js` para llamar al handler de guardado.
5. Agregar manejo de errores visibles via `messages.js`.

### Hacer cuando toque IA

1. Definir contrato de propuesta IA: patch, componente, o unidad draft.
2. Crear prompt builder usando `ai_editable_fields`.
3. Aislar OpenRouter en servicio propio y leer API key solo desde `config.py`.
4. Validar toda salida IA en backend antes de mostrar/guardar.
5. Evitar que IA modifique `id`, `tipo`, `nombre`, `version` o flags internos.

## 12. Proximo paso recomendado

El siguiente paso tecnico recomendado es corregir la pequeña deuda de contrato en `registry.js`: hacer que `Registry.get("quiz_multiple")` conserve `createDefaultOption`, o definir una politica clara para metadata/helper functions de definitions. Es un cambio pequeno, pero evita que el editor dependa del fallback y mantiene la arquitectura coherente antes de seguir con mas editores.
