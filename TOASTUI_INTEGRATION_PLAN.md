# Integracion local de TOAST UI Editor

## Estado actual

Studio teoria usa TOAST UI Editor mediante `TeoriaToastUIAdapter`. El editor artesanal se conserva como fallback temporal.

La integracion esta lista para commit funcional, con Student pendiente de render compatible.

## Reglas base

- No usar CDN.
- No usar `import/export` en runtime.
- No depender de `npm` en runtime.
- No usar script tags manuales en HTML.
- No asumir que `window.toastui` existe.
- No crear placeholders falsos.
- No agregar rutas inexistentes a `resources_manifest.py`.
- No retirar fallbacks hasta validar Student y Open edX.

## Paso 1: Preparar vendor local

La carpeta vendor local es:

```text
ia_assistant/static/vendor/toastui/
```

La integracion activa debe usar el bundle standalone local:

```text
toastui-editor-all.min.js
toastui-editor.min.css
```

Estos archivos salen del paquete `@toast-ui/editor`, carpeta `dist/`.

Nota historica: los archivos `toastui-editor.js` y `toastui-editor.css` generados desde `npm pack` no expusieron `window.toastui.Editor` en Studio; `window.toastui` quedo como `{}`. Por eso se usa `toastui-editor-all.min.js`.

## Paso 2: Recursos activos en manifest

Cuando ambos archivos reales esten presentes, agregar a `ia_assistant/resources_manifest.py` en este orden:

CSS:

```python
"vendor/toastui/toastui-editor.min.css",
"studio/components/teoria/teoria_editor.css",
```

El CSS de Toast debe cargarse antes de `teoria_editor.css` para que el CSS del plugin pueda ajustar integracion visual si hace falta.

JS:

```python
"vendor/toastui/toastui-editor-all.min.js",
"studio/components/teoria/teoria_toastui_adapter.js",
"studio/components/teoria/teoria_editor.js",
```

El JS de Toast debe cargarse antes del adapter, y el adapter antes de `teoria_editor.js`.

No agregar estas rutas si los archivos reales no existen, porque `xblock.py` lee cada ruta declarada en el manifest y una ruta ausente puede romper el render del XBlock.

## Paso 3: Adapter seguro

Crear:

```text
ia_assistant/static/studio/components/teoria/teoria_toastui_adapter.js
```

El adapter debe exponer una API compatible:

```javascript
window.IAAssistant.Studio.TeoriaToastUIAdapter.create({
    container: HTMLElement,
    initialMarkdown: string,
    onChange: function (markdown) {}
});
```

El adapter debe:

- verificar `window.toastui && window.toastui.Editor`;
- crear TOAST UI Editor solo si esta disponible;
- configurar `toolbarItems` sin imagen;
- usar fallback seguro si Toast no cargo;
- no romper Studio si `window.toastui` es `undefined`;
- mantener `contenido` como Markdown string;
- no guardar HTML;
- no cambiar JSON;
- no tocar State directamente si puede comunicar cambios via `onChange(markdown)`;
- usar `textContent` para mensajes del fallback.
- normalizar suavemente Markdown antes de emitir cambios.

Fallback minimo aceptable:

- textarea simple;
- `value = initialMarkdown`;
- `input` llama a `onChange(normalizeTheoryMarkdown(textarea.value))`;
- mensaje discreto indicando que se usa Markdown simple.

Toolbar oficial por ahora:

```javascript
[
    ["heading", "bold", "italic", "strike"],
    ["hr", "quote"],
    ["ul", "ol", "task", "indent", "outdent"],
    ["table", "link"],
    ["code", "codeblock"]
]
```

No se incluye `image`.

Features mantenidas oficialmente por ahora:

- parrafo
- H1-H6
- negrita
- cursiva
- tachado
- separador
- cita
- lista con vinetas
- lista numerada
- checklist
- tabla
- link
- codigo inline
- bloque de codigo

Features bloqueadas por ahora:

- imagenes
- uploads/attachments
- embeds externos

Normalizacion aplicada antes de guardar:

- `<br>`, `<br/>` y `<br />` fuera de code fence se convierten a salto de linea Markdown.
- imagenes Markdown fuera de code fence se reemplazan por `[imagen removida]` o `[imagen removida: alt]`.
- `<img ...>` fuera de code fence se reemplaza por `[imagen removida]`.
- dentro de bloques fenced con triple backtick no se modifica el contenido.

Queda pendiente definir una politica completa para HTML crudo. Por ahora solo se manejan `<br>` e `<img ...>` para evitar romper Markdown pegado de forma inesperada.

## Paso 4: Teoria usando Toast con fallback

Aplicado: el editor de teoria usa `TeoriaToastUIAdapter` mediante `teoria_editor.js`.

Reglas:

- Mantener el editor artesanal actual como fallback temporal o ruta de escape hasta verificar Toast en Open edX.
- No cambiar `data.titulo`.
- No cambiar `data.formato`.
- No cambiar `data.contenido`.
- No cambiar `id`, `tipo` ni `nombre`.
- No tocar backend, Student, OpenRouter ni State.

Estado final: teoria ya usa Toast a traves del adapter, sin tocar directamente `window.toastui` desde `teoria_editor.js`.

## Checklist antes de activar

- `toastui-editor-all.min.js` existe en `static/vendor/toastui/`.
- `toastui-editor.min.css` existe en `static/vendor/toastui/`.
- `resources_manifest.py` carga CSS/JS en el orden correcto.
- El adapter verifica `window.toastui`.
- El adapter tiene fallback.
- Studio no rompe si Toast no esta disponible.
- El JSON de teoria sigue usando `titulo`, `formato: "markdown"` y `contenido`.
- Student todavia debe renderizar Markdown compatible con Toast UI en el futuro.

## Pendientes

- Definir tratamiento completo de HTML crudo.
- Preparar Student para renderizar Markdown compatible con Toast UI.
- Decidir cuando retirar el fallback artesanal.
