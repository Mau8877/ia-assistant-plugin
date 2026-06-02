# Estado actual de IA Assistant Studio

## 1. Resumen ejecutivo

IA Assistant Studio ya cuenta con un editor visual funcional para los componentes base de una unidad educativa. El docente puede trabajar con componentes de teoria, quiz multiple, pregunta abierta y codigo desde una interfaz de Studio organizada por picker, tabs y editores por componente.

El componente teoria fue migrado al editor TOAST UI Editor mediante un adapter seguro. Esta integracion mantiene fallback al editor Markdown artesanal y conserva el contrato JSON existente. El contenido de teoria se guarda como Markdown, no como HTML.

El JSON de unidad se genera correctamente en memoria mediante `window.IAAssistant.Studio.State`. Los componentes quiz multiple, pregunta abierta y codigo siguen funcionando visualmente despues de la integracion de Toast UI.

La persistencia minima ya fue implementada: Studio puede enviar `State.getUnit()` al handler `save_unit`, guardar en `unidad_json`, recargar datos iniciales y reconstruir el estado desde lo persistido. Tambien cuenta con boton Guardar con feedback visual y autoguardado cada 60 segundos si detecta cambios reales. Student fase 1A ya recibe la unidad persistida y renderiza titulo, unidad vacia, cards verticales y teoria con Toast Viewer local. Quiz, pregunta abierta, codigo, respuestas, calificacion e IA siguen pendientes.

Veredicto: Studio como editor base esta practicamente finalizado. El siguiente paso recomendado es probar el flujo completo y avanzar con los players Student restantes.

## 2. Objetivo del Studio

Studio permite al docente construir una unidad educativa desde una interfaz visual.

Actualmente permite:

- crear una unidad en memoria;
- asignar titulo a la unidad;
- agregar componentes desde el picker;
- editar cada componente con su editor visual;
- activar componentes desde tabs;
- reordenar componentes mediante drag and drop en tabs;
- eliminar componentes con confirmacion;
- renombrar componentes desde las tabs;
- visualizar el JSON actual de la unidad;
- mantener estado frontend mediante `window.IAAssistant.Studio.State`.

Todavia debe persistir ese estado en `unidad_json` para que Open edX lo guarde y pueda recuperarlo al recargar Studio o al renderizar Student.

## 3. Contrato JSON general

```json
{
  "version": 1,
  "titulo": "Unidad sin título",
  "componentes": []
}
```

Campos:

- `version`: version del formato de unidad. Actualmente se usa `1`.
- `titulo`: titulo visible/general de la unidad.
- `componentes`: lista ordenada de componentes de la unidad.

Este contrato no debe romperse. Cualquier nueva rama debe preservar `version`, `titulo` y `componentes` como base persistente.

## 4. Componentes actuales

### 4.1 Teoria

Contrato:

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

Campos:

- `titulo`: titulo interno del bloque de teoria.
- `formato`: actualmente siempre `"markdown"`.
- `contenido`: Markdown compatible con Toast UI.

Teoria ya usa TOAST UI Editor mediante `TeoriaToastUIAdapter`.

Features aceptadas en teoria:

- parrafo;
- H1-H6;
- negrita;
- cursiva;
- tachado;
- separador;
- cita;
- lista con vinetas;
- lista numerada;
- checklist;
- tabla;
- link;
- codigo inline;
- bloque de codigo.

Features bloqueadas por ahora:

- imagenes;
- uploads/attachments;
- embeds externos.

Normalizacion actual:

- `<br>` fuera de code fence se convierte a salto de linea.
- imagenes Markdown fuera de code fence se reemplazan por texto seguro.
- `<img>` fuera de code fence se reemplaza por texto seguro.
- no existe sanitizador completo de HTML crudo todavia.

### 4.2 Quiz multiple

Contrato:

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

Campos:

- `pregunta`: enunciado de la pregunta que vera el estudiante.
- `opciones`: lista de opciones disponibles.
- `id` de opcion: identificador estable de cada opcion.
- `texto`: texto visible de la opcion.
- `feedback`: retroalimentacion asociada a la opcion.
- `respuestas_correctas`: lista de ids de opciones correctas.

Se valido visualmente que sigue funcionando despues de integrar Toast UI.

### 4.3 Pregunta abierta

Contrato:

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

Campos:

- `enunciado`: consigna o pregunta que vera el estudiante.
- `rubrica`: criterio de evaluacion o guia esperada.

Se valido visualmente que sigue funcionando.

### 4.4 Codigo

Contrato:

```json
{
  "id": "codigo_1",
  "tipo": "codigo",
  "nombre": "codigo_1",
  "data": {
    "enunciado": "",
    "lenguaje": "c",
    "codigo_base": "",
    "instrucciones": ""
  }
}
```

Campos:

- `enunciado`: consigna del ejercicio de codigo.
- `lenguaje`: lenguaje seleccionado para el ejercicio.
- `codigo_base`: plantilla o codigo inicial.
- `instrucciones`: indicaciones adicionales.

Existe soporte visual para lenguajes/plantillas minimas y se valido que sigue funcionando. Nota: la definicion base actual inicia `lenguaje` como string vacio; el contrato esperado para flujo docente puede normalizarlo a `"c"` desde el editor o plantilla. Esto debe verificarse en la rama de persistencia si se requiere default fijo.

### 4.5 Revision

`revision` existe como concepto/componente de sistema.

Propiedades actuales desde registry:

- `authorable: false`;
- `system: true`;
- `allowMultiple: false`;
- `studentVisible: true`.

No debe mostrarse como componente editable normal del Studio por ahora. Puede usarse mas adelante para IA, feedback o revision.

## 5. Arquitectura frontend actual de Studio

Archivos principales:

- `ia_assistant/static/common/css/tokens.css`
  - Tokens de diseno, colores base y colores por componente.

- `ia_assistant/static/common/css/components.css`
  - Componentes visuales compartidos.

- `ia_assistant/static/common/js/namespace.js`
  - Namespace global seguro bajo `window.IAAssistant`.

- `ia_assistant/static/common/js/registry.js`
  - Registro de definiciones de componentes.
  - Expone `register`, `list`, `get`, `getAvailable`, `isReviewable`, `getReviewable` y `hasReviewable`.

- `ia_assistant/static/common/js/utils.js`
  - Utilidades comunes.

- `ia_assistant/static/common/js/markdown_basic.js`
  - Fallback/utilidad Markdown artesanal conservada.

- `ia_assistant/static/studio/js/state.js`
  - Estado de unidad en memoria.
  - Maneja titulo, componentes, componente activo, ids, renombrado, reordenamiento y actualizacion de `data`.

- `ia_assistant/static/studio/js/dom.js`
  - Selectores DOM generales de Studio.
  - Centraliza acceso a root, picker, tabs, editor, titulo de unidad y visor JSON.

- `ia_assistant/static/studio/js/events.js`
  - Eventos principales.
  - Inicializa titulo de unidad, visor JSON, picker y render inicial.

- `ia_assistant/static/studio/components/*/*.definition.js`
  - Definiciones comunes de componentes: tipo, label, authorable, reviewable, system, studentVisible y data inicial.

- `ia_assistant/static/studio/components/*/*_editor.js`
  - Editores visuales de cada componente en Studio.

Otros widgets importantes:

- `studio/widgets/component_picker`
  - Permite agregar componentes authorable desde registry.

- `studio/widgets/component_tabs`
  - Renderiza tabs, permite activar, renombrar, eliminar y reordenar componentes.

- `studio/widgets/confirm_modal`
  - Confirmaciones para acciones destructivas.

- `studio/widgets/chatbar_ia`
  - Interfaz reservada para futura IA. Por ahora no debe guardar mensajes en `unidad_json`.

## 6. Integracion Toast UI en teoria

Archivos vendor activos:

- `ia_assistant/static/vendor/toastui/toastui-editor-all.min.js`
- `ia_assistant/static/vendor/toastui/toastui-editor.min.css`

Adapter:

- `ia_assistant/static/studio/components/teoria/teoria_toastui_adapter.js`

Editor:

- `ia_assistant/static/studio/components/teoria/teoria_editor.js`

Fallas historicas:

- Los archivos `toastui-editor.js` y `toastui-editor.css` del `npm pack` no expusieron `window.toastui.Editor` en Studio.
- Por eso se uso el bundle standalone `toastui-editor-all.min.js`.
- Los archivos antiguos fueron eliminados del vendor porque ya no estaban activos.

Reglas:

- No CDN en runtime.
- No `import/export`.
- No npm runtime.
- No script tags manuales.
- No asumir `window.toastui` sin guard.
- Usar adapter con fallback.

Flujo:

```text
data.contenido
-> initialMarkdown
-> TeoriaToastUIAdapter
-> Toast UI Editor
-> getMarkdown()
-> normalizeTheoryMarkdown()
-> onChange(markdown)
-> State/updateData
-> JSON
```

## 7. Manifest de recursos

`ia_assistant/resources_manifest.py` controla CSS/JS cargado por el XBlock.

Orden CSS esperado:

```python
"vendor/toastui/toastui-editor.min.css",
"studio/components/teoria/teoria_editor.css",
```

Orden JS esperado:

```python
"studio/components/teoria/teoria_markdown_editor.js",
"vendor/toastui/toastui-editor-all.min.js",
"studio/components/teoria/teoria_toastui_adapter.js",
"studio/components/teoria/teoria_editor.js",
```

Notas:

- Toast debe cargarse antes del adapter.
- El adapter debe cargarse antes de `teoria_editor.js`.
- Los fallbacks se conservan.
- No se deben declarar rutas inexistentes porque `xblock.py` lee los archivos del manifest.

## 8. Estado de validacion manual

Pruebas reportadas/validadas manualmente durante la estabilizacion:

1. `window.toastui.Editor` existe.
2. `TeoriaToastUIAdapter` existe.
3. `isToastAvailable()` devuelve `true`.
4. Teoria renderiza Toast UI.
5. `data.formato` sigue siendo `"markdown"`.
6. `data.contenido` guarda Markdown.
7. Heading funciona.
8. Negrita funciona.
9. Cursiva funciona.
10. Tachado funciona.
11. Listas funcionan.
12. Checklist funciona.
13. Link funciona.
14. Tabla funciona.
15. Codigo inline funciona.
16. Bloque de codigo funciona.
17. `Shift + Enter` no guarda `<br>`.
18. Imagenes no estan en toolbar.
19. Quiz sigue funcionando.
20. Pregunta abierta sigue funcionando.
21. Codigo sigue funcionando.
22. Titulo de unidad funciona.
23. Titulo interno de teoria funciona.

Ejemplo de JSON validado:

```json
{
  "version": 1,
  "titulo": "Tren al sur",
  "componentes": [
    {
      "id": "teoria_1",
      "tipo": "teoria",
      "nombre": "teoria_1",
      "data": {
        "titulo": "Hola aburrido",
        "formato": "markdown",
        "contenido": "# Prueba Toast UI teoría\n\nEste es un párrafo normal..."
      }
    }
  ]
}
```

## 9. Documentos creados durante la estabilizacion

- `AUDITORIA_MARKDOWN_TEORIA.md`
  - Auditoria del editor Markdown artesanal anterior.

- `TOASTUI_INTEGRATION_PLAN.md`
  - Plan/estado de integracion Toast.

- `AUDITORIA_TOASTUI_TEORIA.md`
  - Auditoria de salida Markdown Toast y decisiones de features.

## 10. Estado actual: que esta cerrado y que no

| Area | Estado | Comentario |
|------|--------|------------|
| UI base Studio | Casi cerrado | La estructura visual principal funciona. |
| Picker de componentes | Casi cerrado | Agrega componentes desde registry. |
| Tabs/componentes | Casi cerrado | Activa, renombra, elimina y reordena componentes. |
| Teoria | Casi cerrado | Usa Toast UI con adapter, fallback y normalizacion suave. |
| Quiz multiple | Casi cerrado | Validado visualmente despues de Toast. |
| Pregunta abierta | Casi cerrado | Validada visualmente. |
| Codigo | Casi cerrado | Validado visualmente; default de lenguaje debe revisarse si se exige `"c"`. |
| JSON en memoria | Funcional | `State.getUnit()` produce estructura de unidad. |
| Persistencia XBlock | Implementada, pendiente de prueba manual final | Studio guarda con boton manual en `unidad_json` y carga unidad inicial desde el XBlock. |
| Student | Parcial | Fase 1A renderiza titulo, unidad vacia, cards y teoria con Toast Viewer local. |
| IA | Pendiente | Debe venir despues de persistencia y Student base. |
| Render Markdown avanzado en Student | Parcial | Teoria usa Toast Viewer local; queda validacion manual completa. |
| Politica HTML crudo | Pendiente | Solo hay normalizacion puntual para `<br>` e imagenes. |

## 11. Riesgos actuales

1. El JSON todavia podria estar solo en memoria si no esta conectado al guardado real del XBlock.
2. Student fase 1A renderiza teoria con Toast Viewer, pero faltan players interactivos y validacion manual completa.
3. HTML crudo completo no esta sanitizado/definido.
4. Imagenes estan bloqueadas en toolbar y existe defensa normalizadora, pero conviene revisar persistencia final.
5. El fallback artesanal sigue existiendo y luego habra que decidir cuando retirarlo.
6. Si se toca `resources_manifest.py` mal, puede romper Studio.
7. Si IA genera JSON fuera del contrato, rompera los editores.

## 12. Persistencia / guardar JSON

La persistencia minima implementada cierra este flujo:

```text
Studio visual
-> State.getUnit()
-> unidad_json
-> guardar en XBlock
-> recargar Studio
-> reconstruir State desde unidad_json
```

Estado aplicado:

- `xblock.py` pasa unidad inicial a Studio mediante `Fragment.initialize_js`.
- `save_unit` recibe `{ unit }`, valida estructura minima y guarda JSON serializado en `unidad_json`.
- `State.loadUnit(unit)` hidrata Studio y recalcula secuencias de ids.
- `api.saveUnit(unit)` centraliza la llamada al handler.
- Studio tiene boton Guardar manual con loader y estados de exito/error.
- Hay autoguardado cada 60 segundos, solo si el snapshot de la unidad cambio.
- Falta prueba manual final de guardar/recargar.

Contrato esperado:

- guardar exactamente la estructura de unidad;
- no romper componentes;
- no guardar HTML como fuente principal;
- preservar `formato: "markdown"`.

No hacer en esta rama:

- IA;
- Student completo;
- cambios grandes de UI;
- nuevos componentes.

## 13. Que debe pedirse en la auditoria de persistencia

Preguntas que debe responder la auditoria:

1. Como se declara `unidad_json` en `xblock.py`?
2. Que scope tiene `unidad_json`?
3. Se inicializa con string, dict o JSON serializado?
4. Se pasa `unidad_json` al frontend?
5. `State` recibe datos iniciales del backend?
6. Existe handler para guardar?
7. Existe boton guardar en Studio?
8. Que endpoint usa?
9. Hay validacion de payload?
10. Que pasa si el JSON esta corrupto?
11. Que pasa si no hay `unidad_json`?
12. Como se deben mostrar errores?
13. Como se confirma exito?
14. Que impacto tiene en SDK?
15. Que impacto tiene en Open edX real?

## 14. Requisitos para la fase de persistencia

Funcionales:

- guardar unidad;
- cargar unidad;
- mantener orden de componentes;
- mantener titulos;
- mantener Markdown;
- mantener opciones/respuestas;
- manejar errores.

Tecnicos:

- handler XBlock seguro;
- validacion minima;
- no ejecutar IA;
- no tocar Student;
- compatible con SDK y Open edX;
- no romper fallback.

UX:

- boton guardar;
- estado "guardando";
- toast/mensaje de exito;
- mensaje de error;
- evitar doble click si ya esta guardando.

## 15. Segunda rama: Student

Student debe venir despues de persistencia.

Objetivo:

- leer `unidad_json` persistido;
- renderizar la unidad al alumno.

Orden sugerido:

1. Renderizar teoria.
2. Usar Toast Viewer o renderer compatible con Markdown Toast.
3. Renderizar quiz.
4. Renderizar pregunta abierta.
5. Renderizar codigo.
6. Despues considerar progreso/respuestas si aplica.

Puntos importantes:

- Si Studio guarda tablas/checklists/tachado, Student debe renderizarlos.
- No conviene usar parser basico si no soporta Markdown extendido.
- Evaluar Toast Viewer local.
- Mantener seguridad en links.
- No permitir HTML peligroso sin sanitizacion.

## 16. Tercera rama: IA

IA debe venir mas adelante.

Objetivo:

- a partir de `prompt_docente`, generar o editar `unidad_json`;
- insertar resultado en `State`;
- permitir revision manual del docente antes de guardar;
- validar JSON generado antes de aceptar.

Modos posibles:

- `CREATE`: generar unidad nueva.
- `EDIT`: editar unidad actual usando la unidad actual como contexto.
- `SUGGEST`: proponer mejoras sin aplicar.

Requisitos:

- la IA no debe escribir directo en backend sin revision;
- debe generar JSON compatible con schema;
- debe validar tipos de componente;
- debe normalizar Markdown en teoria;
- debe evitar imagenes por ahora;
- debe producir componentes conocidos;
- debe manejar errores de JSON.

## 17. Orden recomendado de trabajo

1. Persistencia.
2. Student.
3. IA.

Motivo:

- Persistencia es base para todo.
- Student necesita contenido guardado.
- IA necesita insertar y guardar contenido validado.

## 18. Criterios para considerar Studio finalizado

| Criterio | Estado |
|----------|--------|
| Todos los componentes crean JSON valido | Parcialmente validado en memoria |
| El estado se mantiene en UI | Validado |
| Se puede ver JSON | Validado |
| Se puede guardar | Implementado, pendiente de prueba manual final |
| Se puede recargar | Implementado, pendiente de prueba manual final |
| No hay errores en consola | Pendiente de nueva verificacion tras persistencia |
| Otros componentes no se rompen | Validado visualmente |
| Documentacion actualizada | En curso / actualizado con este documento |

Guardar/recargar real ya tiene implementacion minima y queda pendiente de prueba manual final en Studio.

## 19. Criterios para el proximo commit de persistencia

El proximo commit de persistencia deberia ser:

- pequeno;
- centrado solo en persistencia;
- sin IA;
- sin Student;
- con auditoria previa;
- con prueba manual de guardar/recargar.

Mensaje sugerido:

```text
feat: persist studio unit json
```

## 20. Conclusion

Studio editor base esta listo en lo esencial. Toast UI resolvio el problema del editor Markdown artesanal en teoria y mantiene una salida Markdown compatible con el contrato actual. El JSON de componentes esta estable en memoria y los editores base se mantienen funcionales.

La persistencia minima ya permite guardar `State.getUnit()` en `unidad_json`, recargarlo y reconstruir Studio desde ese dato persistido. Student fase 1A ya muestra la unidad persistida como lista vertical y renderiza teoria con Toast Viewer local.

En XBlock SDK se retiro el escenario `IA Assistant - Student minimo` porque abria otra instancia vacia y confundia las pruebas. Student View real sigue existiendo; la validacion alumno debe hacerse despues mediante vista previa conectada al JSON actual o en Open edX/LMS real.

Studio ahora incluye una Vista previa alumno que toma `State.getUnit()` y reutiliza el renderer Student sin guardar, sin llamar backend y sin depender de `unidad_json` persistido.

Despues deben venir los players Student restantes para quiz, pregunta abierta y codigo. Finalmente debe venir IA, porque necesita generar o editar JSON validado y persistible.
