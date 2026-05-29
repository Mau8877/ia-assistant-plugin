# Auditoría técnica del editor Markdown de teoría

## 1. Resumen ejecutivo

La arquitectura actual del editor Markdown de teoría está correctamente separada en tres responsabilidades principales:

- `ia_assistant/static/common/js/markdown_basic.js` contiene utilidades puras para reconocer y normalizar Markdown básico.
- `ia_assistant/static/studio/components/teoria/teoria_markdown_editor.js` contiene la experiencia de edición visual, la toolbar, el modo Markdown avanzado y la conversión Markdown <-> DOM visual.
- `ia_assistant/static/studio/components/teoria/teoria_editor.js` coordina el componente de Studio: lee `component.data`, asegura `formato: "markdown"`, monta el editor Markdown y actualiza State.

La separación de archivos es conceptualmente correcta. Los problemas actuales no parecen venir del contrato JSON, de `schema.py`, de State, del backend ni de Student. Los problemas reales están concentrados en la complejidad natural de `contenteditable`, especialmente en:

- selección y rangos del navegador;
- conversión de nodos visuales a Markdown;
- toggle de formatos inline;
- edición dentro o cerca de elementos inline;
- serialización de estructuras anidadas;
- comportamiento del caret al salir de `strong`, `em` o `code`.

El sistema ya evita varios riesgos importantes: no usa `innerHTML` para contenido del docente, renderiza con `createElement`, `textContent` y `appendChild`, fuerza pegado como texto plano en el área visual, y guarda Markdown en `data.contenido`, no HTML.

Lo que NO parece ser el problema:

- No parece ser un problema de schema.
- No parece ser un problema de backend.
- No parece ser un problema de State.
- No parece ser un problema de orden de carga en Studio.
- No parece ser un problema de CSS, salvo detalles de estado visual futuro.

El área a seguir auditando y corrigiendo con cuidado es `teoria_markdown_editor.js`, en particular la familia de funciones que manipulan selección, inline formatting y serialización.

## 2. Contrato de datos actual

El componente `teoria` trabaja actualmente con este contrato:

```json
{
  "data": {
    "titulo": "",
    "formato": "markdown",
    "contenido": ""
  }
}
```

Este contrato es correcto para la versión actual. El editor debe mantener siempre:

- `data.titulo` como string.
- `data.formato` como `"markdown"`.
- `data.contenido` como string Markdown.

No se deben agregar campos nuevos para resolver problemas de toolbar o edición. Tampoco se debe guardar HTML derivado del editor visual.

## 3. Archivos revisados

### 3.1. `ia_assistant/static/common/js/markdown_basic.js`

Responsabilidad actual:

- Normalizar saltos de línea.
- Escapar texto, aunque actualmente el editor visual trabaja principalmente con `textContent`, no con HTML.
- Detectar estructuras básicas de Markdown.
- Extraer texto de estructuras Markdown simples.
- Tokenizar inline Markdown básico.
- Exponer una API común en `window.IAAssistant.MarkdownBasic`.

Funciones principales:

- `normalizeMarkdown(markdown)`
- `escapeText(text)`
- `isHeading(line)`
- `getHeadingLevel(line)`
- `isHorizontalRule(line)`
- `isBulletListItem(line)`
- `isNumberedListItem(line)`
- `isQuote(line)`
- `isCodeFence(line)`
- `getHeadingText(line)`
- `getBulletListText(line)`
- `getNumberedListText(line)`
- `getQuoteText(line)`
- `parseInlineTokens(text)`
- `getSupportedFeatures()`

Este archivo no depende del DOM ni de State. Está en el lugar correcto.

### 3.2. `ia_assistant/static/studio/components/teoria/teoria_markdown_editor.js`

Responsabilidad actual:

- Crear el editor Markdown visual.
- Crear la toolbar.
- Crear el modo visual con `contenteditable`.
- Crear el modo Markdown avanzado con `textarea`.
- Convertir Markdown a nodos visuales seguros.
- Serializar nodos visuales de vuelta a Markdown.
- Aplicar acciones inline y acciones de bloque.
- Proteger contextos peligrosos, especialmente `pre` y `code` dentro de `pre`.

Este archivo concentra la mayoría de la complejidad. Es el archivo correcto para corregir bugs del editor visual.

### 3.3. `ia_assistant/static/studio/components/teoria/teoria_editor.js`

Responsabilidad actual:

- Asegurar que `component.data.formato` sea `"markdown"`.
- Renderizar header, estado, campo de título y contenedor del editor Markdown.
- Llamar a `window.IAAssistant.Studio.TeoriaMarkdownEditor.create(...)`.
- Recibir cambios por `onChange(markdown)`.
- Actualizar State con `titulo`, `formato` y `contenido`.

Funciones principales:

- `ensureMarkdownFormat(component)`
- `updateDataField(component, fieldName, value)`
- `createTitleField(component, onStatusChange)`
- `createContentField(component, onStatusChange)`
- `render(...)`

Este archivo no debería recibir lógica de toolbar ni de parsing Markdown.

### 3.4. `ia_assistant/static/studio/components/teoria/teoria_editor.css`

Responsabilidad actual:

- Estilos del editor de teoría.
- Estilos del header.
- Estilos del estado/recomendaciones.
- Estilos del campo de título.
- Estilos de la toolbar.
- Estilos del editor visual.
- Estilos del textarea de Markdown avanzado.
- Estilos básicos para headings, listas, blockquote, code inline, pre/code y hr.

El CSS usa clases con prefijo `ia-assistant-`, tokens del sistema y no contiene selectores globales peligrosos ni `!important`.

### 3.5. `ia_assistant/resources_manifest.py`

Responsabilidad actual:

- Declarar el orden de carga CSS y JS.

Para Studio, el orden relevante actual es correcto:

```python
"common/js/markdown_basic.js",
...
"studio/components/teoria/teoria_markdown_editor.js",
"studio/components/teoria/teoria_editor.js",
```

También carga:

```python
"studio/components/teoria/teoria_editor.css",
```

No se detecta un problema de manifest para el editor Markdown de teoría.

## 4. Flujo general de datos

### 4.1. Desde JSON hacia el editor

El flujo actual es:

1. El componente activo llega a `TeoriaEditor.render(container, component)`.
2. `teoria_editor.js` llama a `ensureMarkdownFormat(component)`.
3. `ensureMarkdownFormat(component)` garantiza que exista `component.data` y asigna `component.data.formato = "markdown"`.
4. `createTitleField(...)` lee `component.data.titulo`.
5. `createContentField(...)` lee `component.data.contenido`.
6. `createContentField(...)` llama a:

```javascript
markdownEditor.create({
    container: editorContainer,
    initialMarkdown: componentData.contenido || "",
    onChange: function (markdown) {
        updateDataField(component, "contenido", markdown);
        onStatusChange();
    }
});
```

7. `teoria_markdown_editor.js` recibe `initialMarkdown`.
8. `create(...)` normaliza ese Markdown con `MarkdownBasic.normalizeMarkdown(...)`.
9. `renderMarkdownToVisual(visualEditor, currentMarkdown)` convierte el Markdown a nodos visuales.
10. El docente ve el editor visual por defecto.

### 4.2. Desde el editor visual hacia JSON

El flujo inverso actual es:

1. El docente edita el `div` visual con `contenteditable`.
2. El evento `input` llama a `syncFromVisual()`.
3. `syncFromVisual()` llama a `serializeVisualToMarkdown(visualEditor)`.
4. `serializeVisualToMarkdown(...)` genera un string Markdown.
5. `emitChange(markdown)` normaliza el Markdown y llama a `onChange(currentMarkdown)`.
6. `teoria_editor.js` recibe el Markdown en `onChange`.
7. `updateDataField(component, "contenido", markdown)` actualiza `component.data.contenido`.
8. `updateDataField(...)` llama a:

```javascript
window.IAAssistant.Studio.State.updateComponentData(component.id, {
    titulo: component.data.titulo || "",
    formato: "markdown",
    contenido: component.data.contenido || ""
});
```

9. El JSON persistible sigue usando `titulo`, `formato` y `contenido`.

## 5. `markdown_basic.js` en detalle

`markdown_basic.js` es un helper común. Su API actual es pequeña y adecuada para una primera versión.

### 5.1. Normalización

`normalizeMarkdown(markdown)` hace:

- Si el valor no es string, devuelve `""`.
- Convierte `\r\n` y `\r` a `\n`.

Esto evita inconsistencias de saltos de línea entre navegadores o sistemas operativos.

### 5.2. Detección de bloques

El archivo reconoce:

- Headings H1-H3 con `^#{1,3}\s+`.
- Separador horizontal con `---`.
- Lista con viñetas con `- `.
- Lista numerada con `1. `, `2. `, etc.
- Cita con `>`.
- Fence de código con triple backtick.

Estas funciones son usadas por `renderMarkdownToVisual(...)`.

### 5.3. Extracción de texto

Existen helpers como:

- `getHeadingText(line)`
- `getBulletListText(line)`
- `getNumberedListText(line)`
- `getQuoteText(line)`

Estos helpers remueven la sintaxis Markdown inicial y dejan el texto que se renderizará visualmente.

### 5.4. Inline tokens

`parseInlineTokens(text)` reconoce:

- Código inline: `` `texto` ``
- Negrita: `**texto**`
- Cursiva: `*texto*`

Limitación importante: no es un parser Markdown completo. Usa regex simple:

```javascript
/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g
```

Esto significa que puede fallar o comportarse de forma limitada en casos como:

- anidaciones complejas;
- asteriscos literales;
- negrita que contiene cursiva;
- cursiva que contiene código con caracteres especiales;
- tokens incompletos.

Para el MVP, esta decisión es razonable, pero conviene no intentar resolver Markdown completo aquí sin una estrategia clara.

## 6. `teoria_editor.js` en detalle

`teoria_editor.js` es el coordinador del componente. No contiene la toolbar ni la lógica de Markdown visual, lo cual es correcto.

### 6.1. `ensureMarkdownFormat(component)`

Garantiza:

```javascript
component.data.formato = "markdown";
```

Si una teoría antigua llega sin `formato`, el editor la asume como Markdown.

Observación: esta función muta el objeto local `component.data`. La persistencia ocurre después cuando se llama a `updateDataField(...)`.

### 6.2. `updateDataField(component, fieldName, value)`

Actualiza el campo local y luego manda a State:

```javascript
{
    titulo: component.data.titulo || "",
    formato: "markdown",
    contenido: component.data.contenido || ""
}
```

Esto mantiene el contrato completo de `data`.

### 6.3. `createContentField(component, onStatusChange)`

Crea el contenedor del editor y delega en:

```javascript
window.IAAssistant.Studio.TeoriaMarkdownEditor.create(...)
```

Esto es correcto: `teoria_editor.js` no debería saber cómo funciona Markdown visual.

### 6.4. Estado de la teoría

El editor muestra recomendaciones si:

- falta `titulo`;
- falta `contenido`.

No bloquea edición ni altera contrato.

## 7. `teoria_markdown_editor.js` en detalle

Este es el archivo principal del editor visual.

### 7.1. `create(options)`

Recibe:

```javascript
{
    container: HTMLElement,
    initialMarkdown: string,
    onChange: function(markdown) {}
}
```

Crea:

- `root`: contenedor general.
- `visualEditor`: `div` con `contentEditable = "true"`.
- `textarea`: modo Markdown avanzado.
- toolbar con acciones agrupadas.

Estado interno:

- `currentMarkdown`
- `isAdvancedMode`

Flujo inicial:

1. Normaliza `initialMarkdown`.
2. Crea `visualEditor`.
3. Crea `textarea`, oculto por defecto.
4. Renderiza Markdown a visual.
5. Agrega toolbar, visual editor y textarea al contenedor.

### 7.2. Modo visual por defecto

El modo visual es el modo inicial porque:

```javascript
textarea.hidden = true;
renderMarkdownToVisual(visualEditor, currentMarkdown);
```

El docente empieza editando el `contenteditable`, no el Markdown crudo.

### 7.3. Modo Markdown avanzado

El botón `Markdown avanzado` ejecuta `toggleMode(modeButton)`.

Cuando entra a modo avanzado:

1. Serializa el DOM visual:

```javascript
currentMarkdown = serializeVisualToMarkdown(visualEditor);
```

2. Copia ese Markdown al textarea.
3. Oculta el editor visual.
4. Muestra el textarea.
5. Cambia el texto del botón a `Volver a visual`.
6. Llama a `emitChange(currentMarkdown)`.

Cuando vuelve a visual:

1. Lee `textarea.value`.
2. Normaliza Markdown.
3. Renderiza el Markdown a nodos visuales.
4. Oculta textarea.
5. Muestra visual.
6. Cambia el botón a `Markdown avanzado`.
7. Llama a `emitChange(currentMarkdown)`.

Riesgo: al alternar modos, cualquier Markdown fuera del subset MVP puede normalizarse o simplificarse si pasa por el render visual y luego por la serialización visual.

## 8. Markdown a visual

La conversión Markdown -> visual ocurre en:

```javascript
renderMarkdownToVisual(container, markdown)
```

Funciones auxiliares:

- `appendInlineNodes(parent, text)`
- `appendParagraph(container, lines)`
- `appendList(container, items, ordered)`
- `createTextElement(tagName, text)`

### 8.1. Headings

Si `MarkdownBasic.isHeading(line)` devuelve true:

1. Se obtiene el nivel con `getHeadingLevel(line)`.
2. Se crea `h1`, `h2` o `h3`.
3. Se remueve el prefijo Markdown con `getHeadingText(line)`.
4. Se renderiza contenido inline con `appendInlineNodes(...)`.

### 8.2. Párrafos

Las líneas no reconocidas se acumulan en `paragraphLines`.

Cuando se encuentra una línea vacía o un bloque distinto, se llama a:

```javascript
appendParagraph(container, paragraphLines);
```

Limitación: múltiples líneas de un mismo párrafo se unen con espacio:

```javascript
lines.join(" ")
```

Esto puede perder saltos de línea intencionales dentro de un párrafo, aunque es aceptable para el MVP.

### 8.3. Negrita, cursiva y código inline

Se reconocen por `MarkdownBasic.parseInlineTokens(text)`.

Luego:

- `bold` crea `strong`.
- `italic` crea `em`.
- `code` crea `code`.
- texto normal crea `TextNode`.

No se usa `innerHTML`.

### 8.4. Listas

Para lista con viñetas:

- Detecta líneas `- item`.
- Acumula ítems contiguos.
- Crea `ul`.
- Crea `li` por cada ítem.

Para lista numerada:

- Detecta líneas `1. item`.
- Acumula ítems contiguos.
- Crea `ol`.
- Crea `li` por cada ítem.

### 8.5. Citas

Detecta `> texto`, crea `blockquote`, renderiza inline dentro.

Limitación: no agrupa múltiples líneas consecutivas de cita en un único blockquote.

### 8.6. Bloques de código

Detecta fences con triple backtick.

Al abrir fence:

- activa `inCodeBlock`.

Al cerrar fence:

- crea `pre`;
- crea `code`;
- asigna el contenido con `textContent`;
- inserta `pre > code`.

No interpreta lenguaje salvo que al serializar siempre escribe `text`.

### 8.7. Separador horizontal

Detecta `---` y crea `hr`.

## 9. Visual a Markdown

La conversión visual -> Markdown ocurre en:

```javascript
serializeVisualToMarkdown(container)
```

Funciones auxiliares:

- `serializeInlineNode(node)`
- `serializeInlineChildren(element)`
- `serializeBlock(element, index)`
- `serializeList(listElement)`

### 9.1. Serialización inline

`serializeInlineNode(node)` hace:

- Text node -> texto plano.
- `strong` o `b` -> `**contenido**`.
- `em` o `i` -> `*contenido*`.
- `code` inline -> `` `texto` ``.
- `br` -> `\n`.
- otros elementos -> serializa hijos o `textContent`.

Riesgo principal: en el caso de `code` inline, usa:

```javascript
node.textContent
```

Eso ignora hijos anidados. En principio `code` inline no debería tener estructura interna compleja, pero `contenteditable` puede generar nodos inesperados.

### 9.2. Serialización de bloques

`serializeBlock(element, index)` hace:

- `h1` -> `# texto`
- `h2` -> `## texto`
- `h3` -> `### texto`
- `blockquote` -> `> texto`
- `li` -> `${index + 1}. texto`
- `pre` -> fence con `text`
- `hr` -> `---`
- cualquier otro -> texto inline serializado

Observación: el caso `li` dentro de `serializeBlock` casi no debería usarse para listas normales, porque las listas son manejadas por `serializeList(...)`.

### 9.3. Serialización de listas

`serializeList(listElement)` detecta si el elemento es `ol` o `ul`.

Para `ul`:

```markdown
- item
```

Para `ol`:

```markdown
1. item
2. item
```

Usa `serializeInlineChildren(item)`, por lo que soporta inline dentro de `li`.

### 9.4. Serialización de bloque de código

Para `pre`:

```javascript
return "```text\n" + contenido + "\n```";
```

Esto significa que todo bloque se serializa como `text`, incluso si en el Markdown original había otro lenguaje.

Esto no rompe el contrato, pero es una limitación.

## 10. Toolbar

La toolbar se crea en:

```javascript
createToolbar(visualEditor, onAction, onModeChange)
```

Está dividida en grupos:

- Formato
- Texto
- Bloques
- Vista

### 10.1. Grupo Formato

Acciones:

- `Normal` -> `normal`
- `H1` -> `h1`
- `H2` -> `h2`
- `H3` -> `h3`

Estas acciones son de bloque.

### 10.2. Grupo Texto

Acciones:

- `B` -> `bold`
- `I` -> `italic`
- `Código` -> `inlineCode`

Estas acciones son inline.

### 10.3. Grupo Bloques

Acciones:

- `• Lista` -> `bulletList`
- `1. Lista` -> `numberedList`
- `Cita` -> `quote`
- `Bloque código` -> `codeBlock`
- `Separador` -> `horizontalRule`

Estas acciones son de bloque.

### 10.4. Grupo Vista

Acción:

- `Markdown avanzado`

Esta acción cambia entre editor visual y textarea Markdown.

### 10.5. Prevención de pérdida de selección

Los botones hacen:

```javascript
button.addEventListener("mousedown", function (event) {
    event.preventDefault();
});
```

Esto evita que el botón robe foco antes de aplicar la acción, preservando mejor la selección actual.

## 11. Aplicación de acciones

Todas las acciones pasan por:

```javascript
applyVisualAction(container, action)
```

Flujo:

1. Obtiene `window.getSelection()`.
2. Si la acción es inline, valida con `isInlineActionAllowed(...)`.
3. Si la acción es de bloque, valida con `isBlockActionAllowed(...)`.
4. Si la acción no está permitida, llama a `warnBlockedAction()` y devuelve `false`.
5. Si está permitida, enfoca el contenedor.
6. Ejecuta la acción correspondiente.
7. Devuelve `true`.

El botón solo llama a `onAction()` si `applyVisualAction(...)` devuelve `true`.

Esto evita llamar `onChange` cuando una acción fue bloqueada.

## 12. Acciones inline

### 12.1. Detección

`isInlineAction(action)` devuelve true para:

- `bold`
- `italic`
- `inlineCode`

### 12.2. Guardrails inline

`isInlineActionAllowed(action, selection, editorRoot)` bloquea si:

- la selección no pertenece al editor;
- no hay rango;
- la selección toca bloque de código;
- la selección cruza bloques;
- la acción es `inlineCode` y la selección contiene salto de línea.

Esto protege contra Markdown roto por selecciones multi-bloque o código inline multilinea.

### 12.3. Toggle inline

La acción inline se aplica con:

```javascript
toggleInlineFormat(container, tagName, fallbackText)
```

Para `bold`:

```javascript
toggleInlineFormat(container, "strong", "texto");
```

Para `italic`:

```javascript
toggleInlineFormat(container, "em", "texto");
```

Para `inlineCode`:

```javascript
toggleInlineFormat(container, "code", "codigo");
```

### 12.4. Selección explícita dentro de formato

Si hay selección no colapsada y todo está dentro del mismo formato inline, el editor llama a:

```javascript
unwrapElementPreservingChildren(existingFormat)
```

Esto quita el wrapper `strong`, `em` o `code`, preservando sus hijos.

### 12.5. Selección colapsada dentro de formato

Si el cursor está dentro de un formato inline y no hay selección, el editor llama a:

```javascript
exitInlineFormatAtCaret(existingFormat, selection.getRangeAt(0))
```

Casos:

- Cursor al inicio: mueve caret antes del elemento.
- Cursor al final: mueve caret después del elemento.
- Cursor en medio: divide el inline en dos elementos formateados y deja el caret entre ambos.

Esto evita borrar o normalizar texto ya escrito cuando el docente solo quiere salir de negrita/cursiva/código.

### 12.6. Selección colapsada fuera de formato

Si no hay selección y no existe formato inline actual, `wrapSelection(...)` inserta un placeholder formateado:

- `texto`
- `codigo`

Luego selecciona el contenido placeholder.

Es una solución MVP aceptable, aunque en una UX más madura podría activarse un "modo typing" para que lo próximo escrito salga formateado sin insertar placeholder.

## 13. Acciones de bloque

### 13.1. Guardrails de bloque

`isBlockActionAllowed(action, selection, editorRoot)` bloquea si:

- la selección no pertenece al editor;
- la selección toca un bloque de código real;
- el bloque actual no es compatible.

Bloques compatibles actuales:

- `p`
- `h1`
- `h2`
- `h3`
- `li`
- `blockquote`
- `div`

Bloques no compatibles:

- `pre`
- `hr`
- `code` dentro de `pre`

### 13.2. Normal / H1 / H2 / H3 / Cita

Estas acciones usan:

```javascript
convertBlock(container, tagName)
```

Si el bloque actual es `li`, reemplaza la lista por el nuevo bloque. Si no, reemplaza directamente el tag del bloque.

Riesgo: convertir un `li` a bloque normal reemplaza la lista completa por un solo bloque con el contenido del item actual. Esto es simple, pero puede ser destructivo si había más ítems.

### 13.3. Listas

`convertToList(container, ordered)` transforma el bloque actual en:

- `ul > li`
- `ol > li`

Preserva contenido con `fillElementFromBlock(...)`.

Riesgo: convertir desde una lista existente reemplaza la lista completa, no solo el ítem actual.

### 13.4. Bloque de código

`convertToCodeBlock(container)` transforma el bloque actual en:

```html
<pre><code>texto</code></pre>
```

Usa `textContent`, por lo que pierde inline formatting deliberadamente. Esto es correcto para código.

### 13.5. Separador

`insertHorizontalRule(container)` inserta:

- `hr`
- un `p` vacío después

Luego mueve el caret al párrafo posterior.

## 14. Selección y rangos

La implementación usa APIs nativas:

- `window.getSelection()`
- `Range`
- `range.cloneContents()`
- `range.extractContents()`
- `range.insertNode(...)`
- `range.setStart...`
- `range.setEnd...`

### 14.1. Validación de pertenencia al editor

`selectionBelongsToEditor(selection, editorRoot)` exige que:

- exista selección;
- exista rango;
- `anchorNode` esté dentro del editor;
- `focusNode` esté dentro del editor.

Esto evita que la toolbar modifique contenido fuera del editor.

### 14.2. Detección del bloque actual

`getSelectionBlock(node, editorRoot)` busca el ancestro más cercano entre:

```text
p,h1,h2,h3,li,blockquote,pre,hr,div
```

Si no encuentra uno válido, devuelve `null`.

### 14.3. Detección de selección multi-bloque

`selectionCrossesBlocks(selection, editorRoot)` compara:

- bloque del inicio del range;
- bloque del final del range.

Si son distintos, considera que cruza bloques.

Esto es útil para bloquear inline en selección multi-bloque.

### 14.4. Riesgo con `contenteditable`

`contenteditable` puede insertar nodos no previstos, por ejemplo:

- `div`
- `span`
- `font`
- `br`
- wrappers generados por el navegador;
- fragmentos pegados desde otras apps.

La implementación mitiga parcialmente esto:

- fuerza paste como texto plano;
- serializa elementos desconocidos como texto/hijos;
- no usa `innerHTML`.

Aun así, es una zona frágil. Los bugs futuros probablemente estarán aquí.

## 15. Seguridad

### 15.1. Uso de `innerHTML`

No se detecta uso de `innerHTML`, `outerHTML` ni `insertAdjacentHTML` en los archivos revisados para renderizar contenido del docente.

### 15.2. Render seguro

El editor visual usa:

- `document.createElement(...)`
- `document.createTextNode(...)`
- `textContent`
- `appendChild(...)`
- `insertBefore(...)`
- `removeChild(...)`

Esto reduce riesgos de XSS.

### 15.3. Pegado

El área visual intercepta paste:

```javascript
visualEditor.addEventListener("paste", function (event) {
    event.preventDefault();
    insertPlainTextAtSelection(
        visualEditor,
        event.clipboardData ? event.clipboardData.getData("text/plain") : ""
    );
    syncFromVisual();
});
```

Esto evita que HTML pegado se convierta en nodos ejecutables.

### 15.4. HTML escrito en Markdown avanzado

Si el docente escribe:

```html
<script>alert(1)</script>
```

El render Markdown -> visual lo tratará como línea de párrafo y lo insertará como texto mediante `textContent` o text nodes. No se ejecuta como HTML.

### 15.5. Riesgo residual

El riesgo XSS evidente es bajo en el editor actual. El riesgo mayor no es ejecución de HTML, sino pérdida o transformación inesperada de contenido por serialización visual.

## 16. CSS y experiencia visual

El CSS está en `teoria_editor.css`.

### 16.1. Clases

Todas las clases revisadas usan prefijo `ia-assistant-`.

Ejemplos:

- `.ia-assistant-teoria-editor`
- `.ia-assistant-teoria-editor__toolbar`
- `.ia-assistant-teoria-editor__visual-editor`
- `.ia-assistant-teoria-editor__textarea`

### 16.2. Tokens

Usa tokens como:

- `--ia-assistant-component-teoria-accent`
- `--ia-assistant-component-teoria-soft`
- `--ia-assistant-color-border`
- `--ia-assistant-color-surface`
- `--ia-assistant-color-background-soft`
- `--ia-assistant-color-text`
- `--ia-assistant-color-muted`
- `--ia-assistant-font-monospace`

### 16.3. Toolbar

La toolbar tiene clases suficientes para seguir puliendo:

- `__toolbar`
- `__toolbar-group`
- `__toolbar-label`
- `__toolbar-button`
- `__toolbar-button--mode`

Pendiente opcional: estados activos como `aria-pressed="true"` o clase active para B/I/Código cuando el cursor está dentro del formato.

### 16.4. Editor visual

`.ia-assistant-teoria-editor__visual-editor` tiene:

- borde;
- fondo;
- padding;
- min-height;
- focus visible;
- estilos para headings, citas, code, pre, hr.

El área visual parece editor/documento y no un simple div plano.

### 16.5. Selectores peligrosos

No se detectan:

- `body`
- `html`
- `.container`
- `.btn`
- `!important`

## 17. Manifest y orden de carga

El manifest carga correctamente:

1. `common/js/namespace.js`
2. `common/js/utils.js`
3. `common/js/markdown_basic.js`
4. `common/js/registry.js`
5. definiciones comunes
6. JS base de Studio
7. widgets
8. `studio/components/teoria/teoria_markdown_editor.js`
9. `studio/components/teoria/teoria_editor.js`
10. demás editores
11. `studio/js/studio.js`

El CSS de teoría también está cargado:

```python
"studio/components/teoria/teoria_editor.css"
```

No se detecta riesgo de orden de carga para este editor.

## 18. Bugs y fragilidades reales

### 18.1. Parser inline básico

`parseInlineTokens(...)` es intencionalmente simple. Puede fallar con Markdown inline complejo.

Ejemplo de zonas frágiles:

- `**texto *cursiva* texto**`
- `*texto **negrita** texto*`
- asteriscos literales;
- tokens incompletos;
- backticks anidados o múltiples.

Se recomienda no ampliar esto de forma improvisada. Si se amplía, hacerlo como parser incremental claro o con tests manuales bien documentados.

### 18.2. Serialización de nodos inesperados

Aunque el paste es texto plano, `contenteditable` puede generar nodos inesperados por acciones del navegador.

La serialización actual intenta degradar a texto, pero puede:

- perder estructura;
- unir texto de forma inesperada;
- generar Markdown no ideal;
- simplificar HTML visual desconocido.

### 18.3. Conversión de listas

Las conversiones desde `li` pueden reemplazar la lista completa por un bloque único.

Esto puede ser sorprendente si el usuario tiene varios ítems y convierte solo uno.

### 18.4. Bloque de código

Todo bloque de código se serializa como:

```markdown
```text
contenido
```
```

No preserva lenguaje original.

### 18.5. Citas multilínea

No agrupa varias líneas consecutivas de cita en un solo `blockquote`.

### 18.6. Párrafos multilinea

Varias líneas de un párrafo se unen con espacios. Esto simplifica, pero puede perder intención.

### 18.7. Toggle inline colapsado

Actualmente existe lógica para salir de un inline cuando el cursor está colapsado. Es una zona delicada:

- al inicio mueve caret antes;
- al final mueve caret después;
- en medio divide el inline.

Esta lógica debe probarse manualmente en Chrome/Firefox si el plugin se usará en ambos.

## 19. Dónde conviene tocar

Para bugs de Markdown visual, conviene tocar principalmente:

```text
ia_assistant/static/studio/components/teoria/teoria_markdown_editor.js
```

Funciones a revisar según tipo de bug:

- Markdown -> visual:
  - `renderMarkdownToVisual`
  - `appendInlineNodes`
  - `appendParagraph`
  - `appendList`

- Visual -> Markdown:
  - `serializeVisualToMarkdown`
  - `serializeInlineNode`
  - `serializeInlineChildren`
  - `serializeBlock`
  - `serializeList`

- Toolbar:
  - `createToolbar`
  - `createToolbarButton`
  - `applyVisualAction`

- Guardrails:
  - `selectionBelongsToEditor`
  - `selectionTouchesCodeBlock`
  - `selectionCrossesBlocks`
  - `isInlineActionAllowed`
  - `isBlockActionAllowed`

- Inline toggle:
  - `closestInlineFormat`
  - `getSelectionInlineFormat`
  - `unwrapElementPreservingChildren`
  - `exitInlineFormatAtCaret`
  - `toggleInlineFormat`

- Block transforms:
  - `convertBlock`
  - `convertToList`
  - `convertToCodeBlock`
  - `insertHorizontalRule`

CSS solo debería tocarse para:

- estados visuales activos/deshabilitados;
- pulido visual;
- accesibilidad de foco;
- responsive;
- legibilidad del área visual.

## 20. Dónde NO conviene tocar

Para los bugs actuales del editor Markdown visual, no conviene tocar:

- `ia_assistant/schema.py`
- `ia_assistant/static/common/components/teoria/teoria.definition.js`
- `ia_assistant/static/studio/js/state.js`
- backend
- Student
- OpenRouter
- otros editores
- registry

Tampoco conviene cambiar el contrato JSON.

## 21. Recomendaciones para próximos parches

### 21.1. Hacer parches pequeños

El editor visual tiene muchas interacciones cruzadas. Conviene corregir una familia de comportamiento por vez:

1. Inline toggle.
2. Selección multi-bloque.
3. Listas.
4. Bloques de código.
5. Markdown avanzado.
6. Serialización.

### 21.2. No reescribir de golpe

La separación de responsabilidades ya es correcta. Reescribir todo aumentaría riesgo.

### 21.3. Documentar casos manuales

Cada parche debería indicar casos manuales concretos:

- texto normal -> bold -> advanced Markdown;
- bold -> quitar bold;
- cursor al final de bold -> salir del bold;
- selección entre dos párrafos;
- bloque de código + toolbar;
- paste con HTML.

### 21.4. Considerar estado activo de toolbar

Futuro opcional:

- `aria-pressed="true"` para B/I/Código cuando el cursor esté dentro del formato.
- `aria-disabled="true"` cuando el cursor esté en `pre`.
- Clase visual con prefijo `ia-assistant`.

Esto ayudaría a que el docente entienda por qué una acción está activa o bloqueada.

### 21.5. Mantener Markdown como fuente persistente

El JSON debe seguir guardando Markdown. El DOM visual es una vista editable temporal, no la fuente persistente.

## 22. Conclusión

El sistema Markdown de teoría está en una arquitectura sana para esta etapa: contrato estable, editor separado, utilidades comunes, CSS aislado y manifest correcto.

El mayor riesgo técnico está en `contenteditable`, no en el backend ni en el schema. El código actual ya contiene guardrails importantes y una base funcional para Markdown visual, pero debe seguir endureciéndose con parches pequeños y dirigidos.

La regla principal para continuar debería ser:

- Si el problema es visual/toolbar/selección/serialización, tocar `teoria_markdown_editor.js`.
- Si el problema es layout/estado visual, tocar `teoria_editor.css`.
- Si el problema es contrato o persistencia, recién entonces revisar definición/schema, pero no para los bugs actuales.

