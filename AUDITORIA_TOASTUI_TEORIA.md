# Auditoria TOAST UI Editor en teoria

## 1. Resumen ejecutivo

Toast UI Editor esta cargado correctamente en Studio segun la verificacion manual reportada:

```javascript
window.toastui && window.toastui.Editor
window.IAAssistant.Studio.TeoriaToastUIAdapter.isToastAvailable()
```

El orden de carga tambien esta bien ubicado: `resources_manifest.py` carga `vendor/toastui/toastui-editor-all.min.js`, luego `studio/components/teoria/teoria_toastui_adapter.js`, y despues `studio/components/teoria/teoria_editor.js`.

El adapter esta en la capa correcta. `teoria_editor.js` no toca `window.toastui` directamente; llama a `TeoriaToastUIAdapter.create(...)` y recibe Markdown por `onChange(markdown)`.

El contrato JSON sigue bien. `teoria_editor.js` fuerza `data.formato = "markdown"` y actualiza `data.contenido` con el resultado de `editor.getMarkdown()`.

El riesgo actual no es el contrato de datos, sino la configuracion y salida Markdown de Toast. Como no hay `toolbarItems`, hooks ni normalizacion antes de guardar, Toast puede generar Markdown extendido y HTML parcial como `<br>`. El problema principal es decidir y controlar que Markdown oficial acepta teoria.

## 2. Contrato actual de teoria

```json
{
  "data": {
    "titulo": "",
    "formato": "markdown",
    "contenido": ""
  }
}
```

`data.contenido` guarda Markdown. No debe guardar HTML como fuente principal.

`data.formato` sigue siendo `"markdown"` y debe mantenerse asi.

No se deben tocar `id`, `tipo` ni `nombre`. Tampoco se deben crear campos nuevos para resolver esta auditoria.

## 3. Como se esta inicializando Toast

En `ia_assistant/static/studio/components/teoria/teoria_toastui_adapter.js`, Toast se crea dentro de `createToastEditor(...)`:

```javascript
var editor = new window.toastui.Editor({
    el: container,
    height: "500px",
    initialEditType: "wysiwyg",
    initialValue: normalizeMarkdown(initialMarkdown),
    previewStyle: "vertical"
});
```

Opciones actuales:

- `el`: contenedor recibido desde `teoria_editor.js`.
- `height`: `"500px"`.
- `initialEditType`: `"wysiwyg"`.
- `initialValue`: Markdown inicial normalizado solo como string.
- `previewStyle`: `"vertical"`.

Eventos actuales:

- Si `editor.on` existe, el adapter registra `change`.
- En cada `change`, llama `editor.getMarkdown()`.
- El Markdown se pasa a `onChange(markdown)`.

Fallback actual:

- Si `window.toastui && window.toastui.Editor` no existe, usa textarea.
- Si crear Toast lanza error, limpia el contenedor y usa textarea.
- El mensaje del fallback usa `textContent`.

Estado final aplicado: el adapter configura `toolbarItems` explicitamente y no incluye `image`.

## 4. Toolbar actual

El adapter configura una toolbar explicita:

```javascript
[
    ["heading", "bold", "italic", "strike"],
    ["hr", "quote"],
    ["ul", "ol", "task", "indent", "outdent"],
    ["table", "link"],
    ["code", "codeblock"]
]
```

Recomendacion inicial:

- Mantener: headings, bold, italic, strike, hr, quote, ul, ol, task, table, link, code, codeblock.
- Bloquear por ahora: image. Estado final: no se incluye `image` en `toolbarItems`.
- Vigilar: HTML parcial como `<br>`, links con esquemas peligrosos, tablas grandes y contenido pegado desde fuentes externas.

## 5. Origen posible de `<br>`

Markdown observado:

```md
<br>
```

Posibles causas:

- Salto de linea manual en WYSIWYG.
- Soft break, normalmente asociado a `Shift+Enter` o un salto dentro del mismo bloque.
- Conversion interna HTML a Markdown de Toast.
- Pegado de contenido con saltos o HTML parcial.
- Cambio de modo WYSIWYG a Markdown y vuelta a WYSIWYG.

El adapter no inserta `<br>`. Solo llama `editor.getMarkdown()`.

`teoria_editor.js` tampoco inserta `<br>`. Solo recibe el Markdown desde el adapter y lo guarda mediante `updateDataField(...)`.

La causa mas probable es que Toast lo genere internamente al serializar ciertos saltos de linea o contenido pegado.

No se ve en el codigo actual ninguna configuracion para evitar `<br>`. Puede existir alguna opcion de Toast relacionada con conversion Markdown/HTML, pero debe revisarse en documentacion antes de asumirla.

Recomendacion: normalizar `getMarkdown()` antes de guardar. Un primer normalizador suave podria convertir lineas que sean solo `<br>` a saltos Markdown o eliminarlas si no aportan contenido. Tambien deberia vigilar HTML parcial.

## 6. Imagenes

La toolbar por defecto de Toast UI Editor probablemente incluye imagen. Esto coincide con el riesgo detectado: si no se configura `toolbarItems`, el usuario puede insertar imagen desde UI o pegar Markdown de imagen.

Estado final: `toolbarItems` se configura explicitamente sin el item de imagen.

Tambien conviene revisar hooks de imagen. Toast UI suele tener mecanismos para manejar carga/insercion de imagenes; si existe un hook tipo `addImageBlobHook` en esta version, deberia bloquearse o devolver sin insertar. Esto debe confirmarse en documentacion o inspeccion puntual del bundle.

Si el usuario pega Markdown de imagen en modo Markdown:

```md
![alt](url)
```

quitar la imagen de la toolbar no alcanza. El contenido podria seguir entrando por pegado o escritura manual.

Opciones:

- A) Dejarlo como texto Markdown y que Student no lo renderice todavia.
- B) Eliminar o normalizar imagenes antes de guardar.
- C) Bloquear con validacion visual y pedir correccion.

Recomendacion mas segura por ahora: C para experiencia docente, acompaniada de B como proteccion defensiva suave si el normalizador se implementa con cuidado. En la primera iteracion funcional, quitar imagen de toolbar y detectar `![...](...)` antes de guardar es mas claro que guardar imagenes que Student aun no soporta oficialmente.

Regla deseada:

- No permitir insertar imagenes desde toolbar.
- No permitir uploads ni attachments.
- Si aparece Markdown de imagen, mostrar advertencia o normalizar segun decision de producto.

## 7. Features Markdown detectadas

| Feature | Ejemplo Markdown | Generado por Toast | Recomendacion |
|--------|------------------|--------------------|---------------|
| H1 | `# a` | Si | Mantener oficialmente |
| H2 | `## b` | Si | Mantener oficialmente |
| H3 | `### c` | Si | Mantener oficialmente |
| H4 | `#### d` | Si | Mantener si Student sera compatible |
| H5 | `##### e` | Si | Mantener si Student sera compatible |
| H6 | `###### f` | Si | Mantener si Student sera compatible |
| negrita | `**asd**` | Si | Mantener oficialmente |
| cursiva | `*texto*` | Si | Mantener oficialmente |
| tachado | `~~texto~~` | Si | Mantener si el renderer futuro lo soporta |
| separador | `***` | Si | Mantener oficialmente |
| cita | `> texto` | Si | Mantener oficialmente |
| lista con vinetas | `* item` | Si | Mantener oficialmente |
| lista numerada | `1. item` | Si | Mantener oficialmente |
| checklist | `* [x] item` | Si | Mantener si Student sera compatible |
| tabla | `| col1 | col2 |` | Si | Mantener con vigilancia de tamano |
| link | `[texto](url)` | Probable | Mantener con sanitizacion o validacion |
| imagen | `![alt](url)` | Probable | Bloquear por ahora |
| codigo inline | `` `codigo` `` | Si | Mantener oficialmente |
| bloque de codigo | triple backtick | Si | Mantener oficialmente |
| HTML parcial `<br>` | `<br>` | Si | Normalizar o vigilar |

## 8. Propuesta de features oficiales para primera version

### 8.1 Mantener oficialmente

- parrafo
- H1-H6 si Student se hace compatible
- negrita
- cursiva
- tachado si no genera problemas en Student
- separador
- cita
- lista con vinetas
- lista numerada
- checklist si Toast lo guarda limpio y Student lo soporta
- tabla si Toast lo guarda limpio y Student lo soporta
- link si se valida o sanitiza
- codigo inline
- bloque de codigo

### 8.2 Bloquear por ahora

- imagenes
- HTML crudo
- uploads/attachments
- embeds externos

### 8.3 Normalizar o vigilar

- `<br>`
- HTML parcial
- links peligrosos tipo `javascript:`
- tablas muy grandes
- Markdown pegado desde fuentes externas

## 9. Opciones de configuracion recomendadas para Toast

Opciones a revisar y posiblemente configurar en `teoria_toastui_adapter.js`:

- `toolbarItems`: declarar toolbar permitida y quitar imagen.
- `initialEditType`: mantener `"wysiwyg"` si la experiencia docente visual es prioritaria.
- `previewStyle`: mantener `"vertical"` o revisar si tiene sentido solo en modo Markdown.
- `usageStatistics`: revisar si la version permite `false`; conviene desactivarlo si existe.
- `hideModeSwitch`: revisar si conviene mantener cambio de modo. Por ahora parece util para inspeccionar Markdown.
- `hooks`: revisar hooks de imagen, especialmente si existe `addImageBlobHook`.
- `customHTMLRenderer`: dejar para una fase posterior si el problema aparece al renderizar, no al guardar.
- `linkAttributes`: revisar si existe en Toast o resolver seguridad de links en Student.

Propuesta conceptual de configuracion, a validar con documentacion de Toast:

```javascript
new window.toastui.Editor({
    el: container,
    height: "500px",
    initialEditType: "wysiwyg",
    initialValue: normalizeMarkdown(initialMarkdown),
    previewStyle: "vertical",
    usageStatistics: false,
    toolbarItems: [
        ["heading", "bold", "italic", "strike"],
        ["hr", "quote"],
        ["ul", "ol", "task", "indent", "outdent"],
        ["table", "link"],
        ["code", "codeblock"]
    ]
});
```

La decision aplicada usa esa lista sin `image`.

No se debe usar CDN, `import/export`, npm runtime ni script tags manuales.

## 10. Normalizacion antes de guardar

Conviene crear una funcion:

```javascript
normalizeTheoryMarkdown(markdown)
```

Ubicacion recomendada inicial: `teoria_toastui_adapter.js`, porque ahi se llama `editor.getMarkdown()` antes de emitir `onChange(markdown)`. Si crece demasiado, podria moverse a un archivo separado en un parche posterior.

Responsabilidades posibles:

- Convertir una linea aislada `<br>` a salto de linea Markdown o eliminarla si es redundante.
- Eliminar o bloquear Markdown de imagen si se decide no permitir imagenes.
- Bloquear HTML crudo o dejarlo como texto escapado, segun decision posterior.
- Detectar links con `javascript:` para advertir o normalizar.
- Mantener Markdown valido y no convertir a HTML.

No conviene implementar un normalizador agresivo sin pruebas manuales, porque podria destruir contenido legitimo del docente.

## 11. Student futuro

Si Studio guarda Markdown extendido de Toast, Student debe renderizar Markdown compatible.

El renderer artesanal actual o futuro debe soportar las features oficiales elegidas: tablas, checklist, tachado, codeblock y links requieren atencion especial.

Probablemente convenga evaluar Toast Viewer o un renderer Markdown seguro compatible, pero no se debe tocar Student en esta tarea.

## 12. Donde tocar despues

Archivos a tocar para el siguiente parche:

- `ia_assistant/static/studio/components/teoria/teoria_toastui_adapter.js`
  - `toolbarItems`
  - normalizacion antes de `onChange`
  - bloqueo o fallback de imagenes

- `ia_assistant/static/studio/components/teoria/teoria_editor.css`
  - ajustes visuales si la toolbar se ve mal

- `TOASTUI_INTEGRATION_PLAN.md`
  - documentar features aceptadas

No tocar:

- `schema.py`
- State
- backend
- Student
- otros editores
- JSON contract

## 13. Plan de parche recomendado

1. Configurar toolbar de Toast sin imagen.
2. Crear normalizador suave de Markdown.
3. Decidir tratamiento de `<br>`.
4. Probar links.
5. Documentar features oficiales.
6. Despues, preparar Student compatible.

## 14. Conclusion

La causa mas probable de `<br>` es la serializacion interna de Toast al convertir saltos de linea, soft breaks, contenido pegado o cambios entre WYSIWYG y Markdown. El adapter y `teoria_editor.js` no insertan `<br>`.

La recomendacion sobre imagenes es bloquearlas por ahora: quitar imagen de `toolbarItems`, revisar hooks de imagen y detectar Markdown `![alt](url)` antes de guardar o mostrar advertencia.

Conviene mantener inicialmente parrafos, headings, negrita, cursiva, tachado, separador, citas, listas, checklist, tablas, links, codigo inline y bloques de codigo, siempre que Student se haga compatible y se vigilen links/HTML parcial.

Decision aplicada despues de esta auditoria: `teoria_toastui_adapter.js` configura `toolbarItems` sin imagen y normaliza suavemente Markdown antes de emitir cambios. La normalizacion convierte `<br>` fuera de code fence a saltos de linea, reemplaza imagenes Markdown por `[imagen removida]` o `[imagen removida: alt]`, y reemplaza `<img ...>` por `[imagen removida]`. El tratamiento completo de HTML crudo queda pendiente.
