# Auditoria de persistencia de IA Assistant Studio

## 1. Resumen ejecutivo

Actualmente existe una base backend minima para persistencia: `ia_assistant/xblock.py` declara `unidad_json` como `String` con `Scope.content` y define un handler `save_unit`. Sin embargo, Studio todavia funciona principalmente con estado frontend en memoria.

Lo que existe:

- `unidad_json` existe como field persistente del XBlock.
- `save_unit` existe como `@XBlock.json_handler`.
- Studio construye el JSON en memoria con `window.IAAssistant.Studio.State.getUnit()`.
- `resources_manifest.py` carga `studio/js/api.js`, `state.js`, `dom.js`, `events.js`, `renderer.js` y `studio.js`.

Lo que falta:

- No se pasa `unidad_json` inicial al frontend.
- `state.js` no tiene metodo `loadUnit`/`hydrate`.
- `api.js` existe, pero esta vacio.
- `studio.html` no tiene boton Guardar.
- `events.js` no conecta ningun guardado.
- `save_unit` no valida estructura de unidad; solo copia strings desde el payload.
- No hay manejo visual de guardando/exito/error.

Diagnostico: hay un handler backend minimo, pero no hay flujo real completo de persistencia Studio -> XBlock -> recarga -> Studio. El riesgo principal es asumir que el JSON ya se guarda cuando en realidad Studio solo lo mantiene en memoria salvo que algun flujo externo llame manualmente al handler.

Proximo parche minimo recomendado: agregar hidratacion inicial segura, `State.loadUnit(unit)`, `api.saveUnit(unit)`, boton Guardar conectado al handler existente o ajustado, validacion minima en backend y mensajes de estado.

## 2. Flujo objetivo de persistencia

Flujo deseado:

```text
Studio visual
-> State.getUnit()
-> handler de guardado
-> unidad_json
-> recarga de Studio
-> datos iniciales
-> State hydrate/load
-> render de editores
```

Estado actual por tramo:

| Tramo | Estado actual |
|------|---------------|
| Studio visual | Existe y funciona en memoria. |
| `State.getUnit()` | Existe. |
| Handler de guardado | Existe `save_unit`, pero es minimo y no valida unidad. |
| Guardar en `unidad_json` | El handler asigna `self.unidad_json = data.get("unidad_json", "{}")`. |
| Recarga de Studio | No reconstruye State desde `unidad_json`. |
| Datos iniciales | No se pasan al frontend actualmente. |
| State hydrate/load | No existe metodo dedicado. |
| Render de editores desde persistido | Pendiente. |

## 3. Fields del XBlock

Fields encontrados en `ia_assistant/xblock.py`:

| Field | Tipo | Scope | Default | Uso actual | Observaciones |
|------|------|-------|---------|------------|---------------|
| `display_name` | `String` | `Scope.settings` | `"IA Assistant"` | Nombre visible del bloque. | Persistente por configuracion del bloque. |
| `prompt_docente` | `String` | `Scope.content` | `""` | Guardado por `save_unit` desde `data.get("prompt_docente", "")`. | No se observa conexion actual desde chatbar/API frontend. |
| `unidad_json` | `String` | `Scope.content` | `"{}"` | Guardado por `save_unit` desde `data.get("unidad_json", "{}")`. | Formato actual esperado: string JSON serializado. El default no coincide con unidad completa default. |
| `sdk_view_mode` | `String` | `Scope.settings` | `"student"` | Permite forzar Studio en XBlock SDK desde `student_view`. | Valores documentados: `student`, `studio`. |

No se encontraron otros fields en `xblock.py`.

## 4. Render de Studio en xblock.py

Metodo que renderiza Studio:

- `studio_view(self, context=None)`

Flujo actual:

```python
fragment = Fragment(read_static_text(STUDIO_HTML_PATH))
self._add_css_resources(fragment, STUDIO_CSS_PATHS)
self._add_js_resources(fragment, STUDIO_JS_PATHS)
return fragment
```

HTML usado:

- `ia_assistant/static/studio/html/studio.html`

CSS/JS:

- Se cargan desde `ia_assistant/resources_manifest.py`.
- `_add_css_resources` usa `fragment.add_css(...)`.
- `_add_js_resources` usa `fragment.add_javascript(...)`.

Inicializacion JS:

- No se encontro `Fragment.initialize_js(...)`.
- `studio/js/studio.js` es un IIFE que ejecuta `window.IAAssistant.Studio.Events.init()`.
- Al no haber `initialize_js`, no se observa paso de `runtime` ni `element` a una funcion JS de inicializacion.

Datos iniciales:

- No se observa serializacion de `self.unidad_json` hacia Studio.
- No hay variable global embebida con unidad inicial.
- No hay atributo DOM con JSON inicial.
- No hay llamada handler posterior para cargar unidad.

Riesgo:

- Para guardar con `runtime.handlerUrl`, el frontend necesita acceso a `runtime`. Actualmente la inicializacion no recibe ese objeto. El parche de persistencia debe decidir si usa `Fragment.initialize_js(...)` con una funcion de init o si expone URLs de handler de otra forma segura.

## 5. Estado frontend actual

Archivo: `ia_assistant/static/studio/js/state.js`.

Unidad inicial:

```javascript
var currentUnit = createDefaultUnit();
```

`createDefaultUnit()` devuelve:

```javascript
{
    version: 1,
    titulo: "Unidad sin titulo",
    componentes: []
}
```

Nota: por codificacion del archivo actual se ve como `"Unidad sin tÃ­tulo"` en lectura de terminal, pero conceptualmente es el default de unidad.

Funciones actuales relevantes:

- `getUnit()`: devuelve copia profunda de `currentUnit`.
- `resetUnit()`: vuelve a unidad default.
- `setUnitTitle(title)`: actualiza titulo.
- `addComponent(componentType)`: crea componente desde registry.
- `removeComponent(componentId)`: elimina componente.
- `reorderComponent(sourceComponentId, targetComponentId, targetPosition)`: reordena.
- `activateComponent(componentId)`: activa componente.
- `renameComponent(componentId, newName)`: cambia `nombre`.
- `updateComponentData(componentId, patch)`: actualiza `data`.
- `getComponents()`: devuelve componentes.
- `getActiveComponent()`: devuelve componente activo.
- `getActiveComponentId()`: devuelve id activo.

No existe actualmente:

- `loadUnit(unit)`;
- `hydrate(unit)`;
- normalizacion de unidad persistida;
- recalculo de secuencias de ids desde una unidad cargada;
- manejo de JSON corrupto.

Que habria que agregar:

- Metodo `State.loadUnit(unit)` o equivalente.
- Validacion/normalizacion frontend ligera para unidad recibida.
- Reconstruccion de `componentTypeSequences` para evitar ids duplicados al agregar componentes despues de cargar.
- Seleccion de componente activo inicial si hay componentes.
- Fallback a unidad default si la unidad persistida esta vacia o corrupta.

## 6. DOM y eventos actuales

Archivos revisados:

- `ia_assistant/static/studio/html/studio.html`
- `ia_assistant/static/studio/js/dom.js`
- `ia_assistant/static/studio/js/events.js`

Boton Guardar:

- No se encontro boton Guardar.
- En el bloque de acciones existe:
  - `+ Anadir componente`
  - `Ver JSON`

Status/mensaje:

- No se encontro area de estado de guardado.
- `messages.js` existe pero esta vacio.

Visor JSON:

- Existe modal/panel JSON.
- `events.js` lo abre con `State.getUnit()` y `JSON.stringify(unit, null, 2)`.
- Permite copiar JSON.

Eventos inicializados:

- `initUnitTitle(root)`.
- `initJsonViewer(root)`.
- `ComponentPicker.init(root)`.
- `Renderer.render()`.

Donde conviene conectar guardado:

- `dom.js`: agregar selectores para boton Guardar y status.
- `events.js`: agregar `initSaveUnit(root)` o similar.
- `api.js`: exponer `saveUnit(unit)`.
- `studio.html`: agregar boton Guardar y contenedor de estado si no existen.

Doble click:

- Se recomienda controlar estado `isSaving` en `events.js` o un modulo dedicado para deshabilitar boton mientras hay request pendiente.

## 7. API frontend actual

Archivo:

- `ia_assistant/static/studio/js/api.js`

Estado:

- Existe, pero esta vacio.

No expone actualmente:

- `saveUnit`;
- `loadUnit`;
- manejo de errores;
- uso de `runtime.handlerUrl`;
- `fetch`;
- `jQuery.ajax`.

Recomendacion:

- Mantener `api.js` como punto central de llamadas backend.
- Agregar namespace `window.IAAssistant.Studio.Api`.
- Recibir/configurar URL de handler desde inicializacion segura.
- Exponer `saveUnit(unit)`.

Punto pendiente:

- Como `studio.js` actualmente no recibe `runtime`, se debe ajustar inicializacion JS para poder construir URL de handler. La via usual en XBlock es `fragment.initialize_js(...)`, pero debe implementarse cuidadosamente en el parche posterior.

## 8. Handlers backend actuales

Handlers encontrados en `ia_assistant/xblock.py`:

| Handler | Existe | Proposito | Payload | Respuesta | Observaciones |
|---------|--------|-----------|---------|-----------|---------------|
| `save_unit` | Si | Guardado minimo de prompt y unidad. | Espera `prompt_docente` y `unidad_json`. | `{ "success": True, "message": "Unidad guardada correctamente." }` | No valida unidad, no parsea JSON, no devuelve unidad normalizada. |

No se encontro handler de carga dedicado.

Carga:

- Actualmente podria hacerse al renderizar Studio, pasando `self.unidad_json` al frontend.
- No parece necesario crear handler de carga si `studio_view` puede inyectar unidad inicial de forma segura.

Handler IA:

- No encontrado en `xblock.py`.

Handlers SDK/debug:

- No se encontraron handlers adicionales.
- `workbench_scenarios()` existe para XBlock SDK.

## 9. Validacion actual y validacion minima recomendada

### 9.1 Validacion actual

Archivo:

- `ia_assistant/schema.py`

Existe:

- `UNIT_SCHEMA_VERSION = 1`.
- `DEFAULT_UNIT`.
- `COMPONENT_DEFINITIONS`.
- listas derivadas de tipos:
  - `COMPONENT_TYPES`;
  - `AUTHORABLE_COMPONENT_TYPES`;
  - `REVIEWABLE_COMPONENT_TYPES`;
  - `SYSTEM_COMPONENT_TYPES`;
  - `STUDENT_VISIBLE_COMPONENT_TYPES`.
- helpers:
  - `get_component_definition`;
  - `get_default_data`;
  - `is_authorable_component`;
  - `is_reviewable_component`;
  - `is_system_component`;
  - `is_student_visible_component`.

No se encontro:

- funcion `validate_unit`;
- validacion profunda de componentes;
- validacion en `save_unit`;
- validacion frontend antes de guardar.

### 9.2 Validacion minima recomendada para guardar

Reglas minimas:

- El payload debe contener una unidad.
- La unidad debe ser objeto/dict.
- `version` debe existir y ser `1`.
- `titulo` debe ser string.
- `componentes` debe ser array/list.
- Cada componente debe tener:
  - `id` string no vacio;
  - `tipo` string conocido;
  - `nombre` string;
  - `data` objeto/dict.
- `tipo` debe estar en `COMPONENT_TYPES`.
- Para `teoria`, `data.formato` debe ser `"markdown"`.
- No validar profundamente todos los campos todavia si eso aumenta riesgo.

Validacion recomendada para serializacion:

- Si `unidad_json` field sigue siendo `String`, guardar JSON serializado con `json.dumps(...)`.
- Devolver unidad normalizada al frontend si se normaliza algo.

## 10. Manejo de errores recomendado

Casos y comportamiento recomendado:

- Payload invalido:
  - Backend devuelve `{ ok: false, error: "La unidad no tiene un formato valido." }`.

- JSON corrupto persistido:
  - Studio no debe romper.
  - Usar unidad default.
  - Mostrar advertencia discreta: "No se pudo cargar la unidad guardada. Se inicio una unidad vacia."

- Error de red:
  - Mostrar: "No se pudo guardar. Revisa tu conexion e intenta nuevamente."

- Error backend:
  - Mostrar: "No se pudo guardar la unidad."

- Handler no encontrado:
  - Mostrar error generico y registrar detalle en consola si corresponde.

- Timeout:
  - Mostrar error de guardado y reactivar boton.

- Doble click:
  - Deshabilitar boton mientras `isSaving` sea true.

- Respuesta inesperada:
  - Tratar como error y no marcar guardado exitoso.

Mensajes simples para docente:

- Exito: "Unidad guardada correctamente."
- Guardando: "Guardando unidad..."
- Error validacion: "Revisa la unidad antes de guardar."
- Error tecnico: "No se pudo guardar la unidad. Intenta nuevamente."

## 11. Compatibilidad SDK y Open edX

XBlock SDK:

- `sdk_view_mode` permite mostrar Studio desde `student_view`.
- El handler `save_unit` deberia funcionar si el runtime de SDK provee URL de handler.
- Se debe probar en Workbench que `runtime.handlerUrl` este disponible cuando se use `initialize_js`.

Open edX Studio real:

- `Scope.content` para `unidad_json` parece apropiado para guardar contenido por instancia del bloque.
- La persistencia debe quedar asociada a la instancia del XBlock.
- Guardar en Studio no necesariamente implica publicar curso al alumno; el comportamiento exacto depende del flujo de Open edX y debe verificarse.

Riesgos:

- Si no se usa correctamente `runtime.handlerUrl`, el frontend no podra llamar `save_unit`.
- Si la serializacion inicial se hace con HTML/JS inline inseguro, puede romper Studio o abrir riesgo XSS.
- Si `unidad_json` queda corrupto, Studio debe poder recuperarse.

## 12. Parche minimo recomendado

Backend:

- Ajustar o reemplazar `save_unit`.
- Leer payload con una clave clara, por ejemplo `unit`.
- Validar minimo.
- Guardar en `self.unidad_json` como JSON serializado si el field sigue siendo `String`.
- Opcionalmente guardar `prompt_docente` si se envia, pero no mezclar IA ahora.
- Devolver:

```json
{
  "ok": true,
  "unidad": {}
}
```

o mantener `success`, pero elegir un contrato consistente.

Frontend:

- Implementar `window.IAAssistant.Studio.Api.saveUnit(unit)`.
- Conectar boton Guardar.
- Agregar estado guardando.
- Mostrar mensajes exito/error.
- Cargar unidad inicial al abrir Studio.
- Agregar `State.loadUnit(unit)` o equivalente.

Render inicial:

- Pasar unidad inicial desde `xblock.py` a JS de Studio de forma segura.
- Si no hay unidad, usar default.
- Si hay error, usar default con advertencia.

Inicializacion JS:

- Evaluar migrar de IIFE directo a funcion inicializable con `Fragment.initialize_js(...)` para recibir `runtime`, `element` y datos iniciales.
- Alternativa: inyectar datos/handler URLs en DOM de forma segura. Requiere cuidado.

## 13. Archivos a modificar en el proximo parche

| Archivo | Cambio esperado | Riesgo |
|--------|-----------------|--------|
| `ia_assistant/xblock.py` | Pasar unidad inicial, ajustar `save_unit`, validar minimo, posiblemente usar `initialize_js`. | Alto: afecta render y guardado. |
| `ia_assistant/schema.py` | Agregar helper de validacion minima si corresponde. | Medio: debe evitar validacion demasiado estricta. |
| `ia_assistant/static/studio/js/state.js` | Agregar `loadUnit(unit)` y recalcular secuencias. | Medio: si se calcula mal, puede duplicar ids. |
| `ia_assistant/static/studio/js/api.js` | Implementar `saveUnit(unit)` y configuracion de handler URL. | Medio: depende de runtime. |
| `ia_assistant/static/studio/js/events.js` | Conectar boton Guardar, estados y errores. | Medio: puede afectar inicializacion Studio. |
| `ia_assistant/static/studio/js/dom.js` | Agregar selectores de guardar/status. | Bajo. |
| `ia_assistant/static/studio/html/studio.html` | Agregar boton Guardar y region de estado si falta. | Bajo/medio: cuidar diseno existente. |
| CSS de Studio | Estilos minimos para estado de guardado. | Bajo. |
| Docs | Actualizar estado y pruebas manuales. | Bajo. |
| `ia_assistant/resources_manifest.py` | Solo si se agrega un nuevo archivo JS/CSS. | Medio: orden incorrecto rompe Studio. |

## 14. Archivos que NO deben tocarse

En el parche de persistencia no deben tocarse:

- Student;
- OpenRouter;
- IA;
- Toast adapter;
- editores de componentes salvo dependencia real detectada;
- `resources_manifest.py` salvo si se agrega api/init nuevo o cambia orden requerido;
- vendor Toast;
- componentes nuevos.

## 15. Plan de implementacion por microtareas

1. Agregar/ajustar metodo para obtener unidad inicial segura.
2. Agregar `State.loadUnit(unit)` si falta.
3. Agregar o ajustar handler backend de guardado.
4. Agregar `api.saveUnit(unit)`.
5. Conectar boton Guardar.
6. Mostrar estado de guardado.
7. Probar guardar y recargar.
8. Probar JSON con teoria Toast.
9. Probar quiz/pregunta/codigo.
10. Documentar.

## 16. Pruebas manuales recomendadas

1. Abrir Studio sin unidad guardada.
2. Crear titulo de unidad.
3. Crear teoria con Markdown Toast.
4. Crear quiz.
5. Crear pregunta abierta.
6. Crear codigo.
7. Ver JSON.
8. Guardar.
9. Recargar Studio.
10. Confirmar que todo reaparece igual.
11. Modificar algo y guardar de nuevo.
12. Recargar de nuevo.
13. Probar JSON corrupto si es posible o simular fallback.
14. Probar error de red/backend si es posible.
15. Confirmar que Student no fue tocado.

## 17. Riesgos y decisiones pendientes

Riesgos/decisiones:

- `unidad_json` como string vs dict: actualmente es `String`, por lo que conviene guardar JSON serializado.
- Validacion minima vs profunda: se recomienda minima ahora.
- Manejo de JSON corrupto: usar default y advertir.
- Como mostrar errores: falta UI de mensajes.
- Autosave: implementado como autoguardado periodico cada 60 segundos.
- Guardar al cambiar o solo con boton: recomendado boton manual.
- IA futura: deberia usar el mismo contrato/validacion de guardado despues.

Recomendacion actual:

- boton Guardar manual;
- autoguardado periodico cada 60 segundos;
- validacion minima;
- guardar JSON serializado mientras `unidad_json` sea `String`;
- mantener Student fuera de scope.

## 18. Nota de implementacion aplicada

La persistencia manual de Studio fue implementada despues de esta auditoria:

- `studio_view` pasa `initial_unit` y `load_warning` mediante `Fragment.initialize_js`.
- `State.loadUnit(unit)` hidrata la unidad persistida y recalcula secuencias de ids.
- `Api.saveUnit(unit)` envia `{ unit }` al handler `save_unit`.
- Studio tiene boton Guardar manual y mensajes de guardando/exito/error.
- Se agrego autoguardado cada 60 segundos con comparacion de snapshots.
- El autoguardado no dispara requests si no hay cambios reales.
- El boton Guardar muestra loader, estado de exito y estado de error.
- `save_unit` valida estructura minima y guarda `unidad_json` como string JSON serializado.
- Student e IA siguen pendientes y fuera de este parche.

## 19. Conclusion

La persistencia auditada ya tiene un parche minimo aplicado para guardar y recargar `unidad_json` desde Studio.

Queda pendiente validar manualmente el flujo completo en Studio/Open edX: crear unidad, guardar, recargar y confirmar que teoria, quiz, pregunta abierta y codigo reaparecen con el mismo orden y contenido.

Mensaje de commit sugerido:

```text
feat: persist studio unit json
```
