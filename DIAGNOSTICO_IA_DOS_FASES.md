# Diagnóstico IA en dos fases - IA Assistant

## 1. Resumen ejecutivo

Conviene dividir la IA del plugin en dos fases porque resuelven problemas distintos, con datos distintos y riesgos distintos.

IA Docente debe ayudar a crear contenido educativo estructurado para `unidad_json`. Su usuario principal es el docente. Su salida esperada es una propuesta de unidad o componentes que el docente revisa, edita, previsualiza y guarda con el flujo existente.

IA Student debe revisar respuestas del alumno y dar feedback pedagógico. Su usuario principal es el estudiante. Requiere respuestas persistidas, identificación del usuario, política de intentos, privacidad, costos y una decisión clara sobre si el feedback es solo orientativo o también califica.

Veredicto:

- Primero IA Docente.
- Después IA Student.
- No implementar revisión de respuestas antes de tener persistencia de respuestas.
- No mezclar generación de contenido con calificación.
- No meter proveedor IA, prompts ni validación profunda directamente en `xblock.py`.

## 2. Estado actual relacionado con IA

### Existente y usable

- `prompt_docente` existe como field en `ia_assistant/xblock.py`, con `Scope.content`.
- `unidad_json` existe como fuente persistente de la unidad.
- `save_unit` existe como handler de guardado de unidad.
- Studio ya produce y recupera `unidad_json`.
- Studio tiene `api.js`, `state.js`, `dom.js`, `events.js` y `studio.js`.
- Existe Vista previa alumno dentro de Studio.
- Student renderer y players funcionan localmente para teoría, quiz múltiple, pregunta abierta y código.
- `revision` existe como componente de sistema en `ia_assistant/schema.py`.
- `ia_assistant/services/` existe.
- `ia_assistant/config.py` existe.
- `ia_assistant/validators.py` existe.

### Existente pero incompleto

- `prompt_docente` se puede guardar si llega al payload de `save_unit`, pero no hay flujo IA docente completo.
- `revision` existe en schema, pero no hay experiencia real de revisión IA.
- `ia_assistant/services/openrouter_client.py` existe, pero está vacío.
- `ia_assistant/services/prompt_builder.py` existe, pero está vacío.
- `ia_assistant/services/unit_service.py` existe, pero está vacío.
- `ia_assistant/config.py` está vacío.
- `ia_assistant/validators.py` está vacío.
- `studio/widgets/chatbar_ia/chatbar_ia.js` está vacío.
- `studio/js/messages.js` está vacío.

### No implementado

- No hay handler IA.
- No hay llamada a OpenRouter funcional.
- No hay configuración funcional de API key.
- No hay generación de unidad con IA.
- No hay validación/normalización robusta de JSON generado por IA.
- No hay persistencia de respuestas del alumno.
- No hay feedback IA para respuestas.
- No hay calificación.

## 3. Diagnóstico de arquitectura actual

### 3.1 Mapa actual de carpetas

Estructura real encontrada:

```text
ia-assistant-plugin/
  README.md
  REGLAS_CODIGO.md
  setup.py
  MANIFEST.in
  ia_assistant/
    __init__.py
    config.py
    fields.py
    resources_manifest.py
    schema.py
    validators.py
    xblock.py
    services/
      __init__.py
      openrouter_client.py
      prompt_builder.py
      unit_service.py
    utils/
      __init__.py
      resources.py
    static/
      common/
      studio/
      student/
      vendor/
```

En esta revisión local, varios documentos de auditoría mencionados en el contexto no aparecen en raíz. Pendiente de confirmar si están en otra copia de trabajo, sin guardar o fuera de esta carpeta.

### 3.2 Responsabilidad actual de cada zona

`xblock.py`:

- Declara `IAAssistantXBlock`.
- Declara fields persistentes.
- Renderiza `studio_view` y `student_view`.
- Carga recursos desde el manifest.
- Hidrata `initial_unit`.
- Declara `save_unit`.
- Contiene validación mínima de unidad.
- Declara escenarios SDK.

`schema.py`:

- Define `UNIT_SCHEMA_VERSION`.
- Define `DEFAULT_UNIT`.
- Define componentes oficiales.
- Define defaults y flags por componente.
- Expone helpers de lectura de schema.

`resources_manifest.py`:

- Centraliza rutas de HTML, CSS y JS de Studio y Student.
- Controla orden de carga.
- Ya está creciendo y es sensible a rutas inexistentes.

Studio:

- Contiene UI docente.
- Maneja estado de unidad.
- Guarda unidad.
- Autoguarda.
- Previsualiza Student.
- Contiene editores de componentes.

Student:

- Contiene UI alumno.
- Renderiza unidad persistida o unidad de preview.
- Contiene players locales.
- No guarda respuestas.

Common:

- Define namespace, registry, utilidades y tokens compartidos.

Vendor:

- Contiene Toast UI local.
- No debe mezclarse con lógica propia.

Documentos `.md`:

- Documentan decisiones y auditorías.
- En esta revisión local solo se encontraron `README.md` y `REGLAS_CODIGO.md` en raíz. Pendiente de confirmar los documentos mencionados por contexto.

### 3.3 Evaluación de separación actual

Studio y Student están suficientemente separados para el MVP. Studio tiene su estado, eventos, API y editores. Student tiene su estado, renderer y players.

Common está bien usado para namespace, registry, tokens y utilidades. No se detectó que IA deba ir en Common.

`xblock.py` ya contiene más validación de la ideal para una fase IA. Para IA, conviene mover validación reutilizable a `validators.py` o un módulo especializado.

`resources_manifest.py` está manejable, pero sensible. Si IA Docente agrega varios archivos frontend, conviene hacerlo con pocos módulos bien ordenados.

La arquitectura actual soporta IA si se aprovechan `services/`, `config.py` y `validators.py`. No soporta una IA limpia si se implementa toda la lógica en `xblock.py`.

La arquitectura actual sí puede soportar validadores compartidos en backend, pero todavía falta implementarlos.

### 3.4 Riesgos arquitectónicos actuales

- `xblock.py` podría crecer demasiado si IA se mete directo ahí.
- Handlers IA podrían mezclarse con persistencia.
- Validación IA podría duplicarse entre backend/frontend.
- Proveedor IA podría quedar acoplado al handler.
- Prompts podrían quedar hardcodeados dentro del handler.
- `services/` existe pero está vacío; hay riesgo de ignorarlo y duplicar arquitectura.
- `config.py` existe pero está vacío; la API key podría terminar leída en varios lugares.
- `validators.py` existe pero está vacío; la validación podría seguir dispersa.
- Falta documentación funcional de configuración de API key.
- Falta separación explícita entre generación docente y revisión Student.

## 4. Carpetas y archivos faltantes o recomendados

El proyecto ya tiene una carpeta `ia_assistant/services/` con nombres útiles:

```text
ia_assistant/services/
  openrouter_client.py
  prompt_builder.py
  unit_service.py
```

Recomendación principal: usar esta carpeta existente antes de crear una carpeta nueva `ai/`. Es coherente con `REGLAS_CODIGO.md`, que recomienda `services/` para lógica de negocio e integración externa.

Arquitectura recomendada para IA Docente fase 1:

```text
ia_assistant/
  config.py
  validators.py
  services/
    openrouter_client.py
    prompt_builder.py
    unit_service.py
    ai_errors.py
```

Alternativa válida si se quiere una frontera más explícita:

```text
ia_assistant/
  ai/
    __init__.py
    provider.py
    unit_generator.py
    prompts.py
    validators.py
    errors.py
```

Pero crear `ai/` ahora podría duplicar `services/`. La opción más simple y compatible con la estructura real es completar `services/`.

### `ia_assistant/services/openrouter_client.py`

Responsabilidad:

- Encapsular llamada al proveedor IA.
- Leer configuración desde `config.py`.
- Manejar timeout.
- Manejar errores del proveedor.
- No conocer Studio.
- No guardar en XBlock.
- No validar contrato completo de unidad.

### `ia_assistant/services/unit_service.py`

Responsabilidad:

- Orquestar IA Docente.
- Recibir prompt docente y contexto.
- Llamar a `prompt_builder`.
- Llamar a `openrouter_client`.
- Parsear respuesta.
- Pasar resultado a validación/normalización.
- Devolver unidad validada o error controlado.

### `ia_assistant/services/prompt_builder.py`

Responsabilidad:

- Guardar/construir prompts del sistema.
- Separar prompt de IA Docente y futuro prompt de IA Student.
- Evitar prompts hardcodeados en `xblock.py`.

### `ia_assistant/validators.py`

Responsabilidad recomendada:

- Validar y normalizar JSON generado por IA.
- Reutilizar reglas del contrato actual.
- Bloquear tipos desconocidos.
- Normalizar IDs.
- Validar `data` por componente.
- Bloquear imágenes y HTML peligroso.
- Devolver warnings.

### `ia_assistant/services/ai_errors.py`

Responsabilidad:

- Errores controlados de IA:
  - sin API key;
  - proveedor sin crédito;
  - timeout;
  - JSON inválido;
  - contenido inseguro;
  - proveedor no disponible.

### Futuro `ia_assistant/student_responses/`

Conviene evaluarlo solo antes de IA Student. No implementarlo ahora.

Podría contener:

```text
ia_assistant/student_responses/
  __init__.py
  schema.py
  validators.py
  services.py
```

Esta carpeta tendría sentido si las respuestas se vuelven complejas y no deben mezclarse con `unidad_json`.

### Frontend Studio recomendado

Para IA Docente fase 1 se puede empezar sin crear demasiados archivos:

- Usar `studio/js/api.js` para llamar al handler IA.
- Usar `studio/js/dom.js` para selectores del panel.
- Usar `studio/js/events.js` para eventos mínimos.

Si el panel crece, conviene crear:

```text
ia_assistant/static/studio/js/ai_panel.js
ia_assistant/static/studio/css/ai.css
```

No se recomienda crear `ai_api.js` si duplica `api.js`, porque las reglas del proyecto piden centralizar llamadas backend en `api.js`.

## 5. Definición de IA Fase 1: IA Docente

Objetivo:

Ayudar al docente a crear contenido educativo estructurado.

Debe generar o proponer:

- Título de unidad.
- Componentes.
- Teoría en Markdown.
- Quiz múltiple con opciones, correctas y feedback.
- Pregunta abierta con enunciado y rúbrica.
- Ejercicio de código con enunciado, lenguaje, código base e instrucciones.

No debe:

- Guardar automáticamente.
- Calificar.
- Revisar respuestas del alumno.
- Escribir respuestas de alumno.
- Ejecutar código.
- Modificar Student.
- Saltarse validación.

Flujo propuesto:

```text
Docente escribe prompt
-> backend llama proveedor IA
-> IA devuelve JSON propuesto
-> backend valida/normaliza
-> Studio recibe propuesta
-> docente revisa en editor
-> docente previsualiza
-> docente guarda manualmente o por autoguardado
```

## 6. Contrato de salida para IA Docente

La IA Docente debe producir el contrato actual:

```json
{
  "version": 1,
  "titulo": "Unidad sin título",
  "componentes": []
}
```

Componentes válidos:

- `teoria`
- `quiz_multiple`
- `pregunta_abierta`
- `codigo`

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

Reglas:

- IDs únicos.
- Tipos válidos.
- `data` completa.
- Teoría siempre Markdown.
- Quiz con opciones y `respuestas_correctas` coherentes.
- Pregunta abierta con rúbrica interna.
- Código con lenguaje, código base e instrucciones.
- No incluir `revision` todavía salvo decisión futura.

## 7. Validación necesaria para IA Docente

Validaciones mínimas:

- JSON parseable.
- Objeto con `version`.
- `componentes` como array.
- Tipos permitidos.
- IDs únicos.
- Nombres no vacíos.
- `data` por tipo.
- Teoría con `formato: "markdown"`.
- Sanitización/normalización de Markdown.
- Bloqueo de imágenes.
- Bloqueo de HTML peligroso.
- Límites de tamaño.
- Fallback si IA devuelve texto no JSON.
- Errores claros al docente.

Validación backend:

- Debe ser la autoridad final.
- Debe vivir en `validators.py` o servicio equivalente.
- Debe rechazar errores críticos.
- Debe devolver warnings cuando normaliza.

Normalización frontend:

- Puede ayudar a cargar la unidad en `Studio.State`.
- No debe reemplazar validación backend.

Feedback al docente:

- Debe explicar si la unidad fue generada, normalizada o rechazada.
- Debe mostrar errores claros sin exponer detalles sensibles del proveedor.

## 8. UX propuesta para IA Docente en Studio

Opciones posibles:

1. Botón/panel `Generar con IA`.
2. Textarea para prompt docente.
3. Selector opcional de nivel, tema o cantidad de componentes.
4. Botón `Generar propuesta`.
5. Estado loading.
6. Resultado:
   - insertar directamente en Studio State, pero sin guardar;
   - o mostrar preview JSON antes de insertar.
7. Docente revisa y edita.
8. Guardado sigue usando el flujo actual.

Recomendación para fase 1:

- Usar un panel simple en Studio.
- Reutilizar la chatbar si se decide que ese será su propósito, pero no mezclarla con mensajes persistidos.
- Botón `Generar propuesta`.
- Si la unidad actual tiene componentes, pedir confirmación antes de reemplazar.
- Insertar propuesta en `Studio.State` solo después de validación backend.
- No guardar automáticamente.
- Permitir vista previa alumno antes de guardar.

## 9. Backend/handlers necesarios para IA Docente

Handler mínimo propuesto:

```text
generate_unit_from_prompt
```

Payload sugerido:

```json
{
  "prompt_docente": "...",
  "contexto": {
    "titulo_actual": "...",
    "componentes_actuales": []
  }
}
```

Respuesta de éxito:

```json
{
  "ok": true,
  "unit": {},
  "warnings": []
}
```

Respuesta de error:

```json
{
  "ok": false,
  "error": "mensaje claro",
  "details": []
}
```

Ubicación recomendada:

- Handler XBlock en `xblock.py`, pequeño y delegando.
- Cliente frontend en `studio/js/api.js`.
- Proveedor IA en `services/openrouter_client.py`.
- Orquestación en `services/unit_service.py`.
- Prompt en `services/prompt_builder.py`.
- Validación/normalización en `validators.py`.
- Errores controlados en `services/ai_errors.py` o equivalente.

No implementar en esta fase de diagnóstico.

## 10. Proveedor IA y configuración

Proveedor esperado:

- OpenRouter, pendiente de confirmar configuración final.

Requisitos:

- Leer API key desde backend.
- Variable recomendada por reglas: `OPENROUTER_API_KEY`.
- No exponer API key al frontend.
- No guardar API keys en repo.
- Manejar ausencia de API key.
- Manejar 401, 402, 429 y 5xx.
- Manejar timeout.
- Tener logs mínimos sin exponer prompts sensibles.
- Todas las llamadas deben salir desde backend.

Estado actual:

- `config.py` existe pero está vacío.
- `services/openrouter_client.py` existe pero está vacío.
- No se encontró proveedor IA funcional.
- Modelo específico: pendiente de confirmar.

## 11. Definición de IA Fase 2: IA Student

Objetivo:

Revisar respuestas del alumno y dar feedback pedagógico.

Casos:

- Pregunta abierta: comparar respuesta con rúbrica.
- Código: revisar solución escrita contra instrucciones, rúbrica o código base.
- Quiz: normalmente no necesita IA porque ya tiene respuestas correctas y feedback por opción.

No debe implementarse todavía si no hay:

- Respuestas persistidas.
- Identificación de usuario.
- Intentos.
- Política de calificación.
- Protección de datos.
- Criterio de cuándo llamar IA.
- UI de feedback.
- Control de costos.

## 12. Dependencias previas para IA Student

Dependencias obligatorias antes de IA Student:

1. Persistencia de respuestas por alumno.
2. Modelo/field adecuado con Scope correcto.
3. Handlers para guardar respuestas.
4. Estado de intentos.
5. Definir si hay calificación o solo feedback.
6. UI para mostrar feedback IA.
7. Rúbrica visible/interna claramente definida.
8. Política de privacidad/datos.
9. Límite de llamadas IA.
10. Manejo de errores.
11. Posible revisión manual docente.

IA Student no debe ser la siguiente rama inmediata porque todavía no existe la base de respuestas. Sin respuestas persistidas, la IA no tiene un objeto estable que revisar ni un lugar claro donde guardar feedback.

## 13. Contrato conceptual para respuestas de alumno

Contrato tentativo para pregunta abierta:

```json
{
  "component_id": "pregunta_abierta_1",
  "tipo": "pregunta_abierta",
  "respuesta": "...",
  "updated_at": "..."
}
```

Contrato tentativo para código:

```json
{
  "component_id": "codigo_1",
  "tipo": "codigo",
  "codigo_respuesta": "...",
  "lenguaje": "c",
  "updated_at": "..."
}
```

Contrato tentativo para feedback IA:

```json
{
  "component_id": "pregunta_abierta_1",
  "feedback": "...",
  "nivel": "parcial",
  "sugerencias": [],
  "created_at": "..."
}
```

Esto es conceptual. No debe implementarse todavía sin definir scopes, privacidad, intentos y calificación.

## 14. Riesgos de IA Student

Riesgos:

- Respuestas sensibles de estudiantes.
- Costos por llamada.
- Feedback incorrecto.
- Alucinaciones.
- Sesgo.
- Privacidad.
- Calificación injusta.
- Dependencia de proveedor.
- Latencia.
- Prompt injection por respuestas del alumno.
- Ejecución de código no permitida.
- Almacenamiento de feedback.

## 15. Separación estricta entre ambas fases

| Aspecto | IA Docente | IA Student |
|--------|------------|------------|
| Usuario principal | Docente | Alumno |
| Objetivo | Crear contenido educativo | Revisar respuestas y dar feedback |
| Entrada | Prompt docente y contexto de unidad | Respuesta del alumno y rúbrica/instrucciones |
| Salida | `unidad_json` propuesto | Feedback sobre respuesta |
| Requiere respuestas alumno | No | Sí |
| Requiere calificación | No | Pendiente de definir |
| Riesgo | Medio-alto | Alto |
| Prioridad | Alta | Posterior |
| Persistencia | Unidad existente | Respuestas/feedback nuevos |
| Impacto UX | Studio | Student |
| Dependencia backend | Handler IA + provider | Handlers respuestas + provider + privacidad |

## 16. Orden recomendado de implementación

Orden recomendado:

1. Diagnóstico/diseño IA.
2. Crear arquitectura base IA si hace falta.
3. IA Docente fase 1 básica.
4. IA Docente validación y pulido.
5. Respuestas de alumno fase 1.
6. IA Student diagnóstico ampliado.
7. IA Student feedback no calificativo.
8. Calificación si se decide.

Motivo:

IA Docente puede apoyarse en el MVP actual: Studio, persistencia, preview y contrato JSON ya existen. IA Student no debe empezar hasta tener respuestas persistidas y reglas de feedback.

## 17. IA Docente Fase 1 - alcance mínimo recomendado

MVP exacto recomendado:

- Un botón `Generar con IA`.
- Un textarea de prompt docente.
- Un handler backend.
- Un proveedor IA desde backend.
- Un prompt del sistema que exige JSON.
- Validador del JSON generado.
- Inserción en Studio State.
- Confirmación si reemplaza unidad existente.
- No guardar automático.
- No Student.
- No calificación.

## 18. Prompt interno recomendado para IA Docente

Prompt base propuesto:

```text
Eres un asistente para docentes que genera unidades educativas interactivas.

Devuelve SOLO JSON valido. No uses markdown fences. No agregues texto antes ni despues del JSON.

El JSON debe cumplir este contrato:
{
  "version": 1,
  "titulo": "string",
  "componentes": []
}

Tipos permitidos de componentes:
- teoria
- quiz_multiple
- pregunta_abierta
- codigo

Reglas generales:
- Usa ids unicos con formato tipo_numero, por ejemplo teoria_1.
- Cada componente debe tener id, tipo, nombre y data.
- No uses campos desconocidos.
- No incluyas imagenes.
- No incluyas HTML peligroso.
- No incluyas revision.

Teoria:
- data.titulo debe ser string.
- data.formato debe ser "markdown".
- data.contenido debe ser Markdown educativo claro.

Quiz multiple:
- data.pregunta debe ser string.
- data.opciones debe ser una lista de opciones con id, texto y feedback.
- data.respuestas_correctas debe contener ids existentes de opciones correctas.

Pregunta abierta:
- data.enunciado debe ser string.
- data.rubrica debe ser una guia interna para el docente.

Codigo:
- data.enunciado debe ser string.
- data.lenguaje debe ser string.
- data.codigo_base debe ser una plantilla editable.
- data.instrucciones debe ser string.
```

Este prompt es una propuesta documental. No está implementado.

## 19. Validación de salida IA Docente

Estrategia propuesta:

- Parsear JSON.
- Si viene con texto extra, intentar extracción segura o rechazar.
- Normalizar IDs.
- Filtrar tipos desconocidos.
- Asegurar `data` por tipo.
- Truncar contenido excesivo.
- Bloquear imágenes.
- Bloquear HTML peligroso.
- Devolver warnings.
- No guardar si hay error crítico.

El resultado validado debe insertarse en Studio, no guardarse directamente.

## 20. UX de errores IA Docente

Mensajes recomendados:

- Prompt vacío: `Escribe una indicacion para generar la unidad.`
- Sin API key: `No hay API key de IA configurada.`
- Proveedor sin crédito: `El proveedor de IA no tiene credito disponible.`
- Timeout: `La generacion tardo demasiado. Intenta nuevamente.`
- Respuesta inválida: `La IA devolvio una respuesta que no se pudo usar.`
- JSON inválido: `La IA no devolvio un JSON valido.`
- Contenido inseguro: `La propuesta contiene contenido no permitido.`

## 21. Archivos que probablemente habría que tocar en IA Docente

Propuesta, no implementación:

- `ia_assistant/xblock.py`
- `ia_assistant/config.py`
- `ia_assistant/validators.py`
- `ia_assistant/services/openrouter_client.py`
- `ia_assistant/services/unit_service.py`
- `ia_assistant/services/prompt_builder.py`
- `ia_assistant/services/ai_errors.py`
- `ia_assistant/resources_manifest.py`
- `ia_assistant/static/studio/html/studio.html`
- `ia_assistant/static/studio/js/api.js`
- `ia_assistant/static/studio/js/events.js`
- `ia_assistant/static/studio/js/state.js`
- `ia_assistant/static/studio/js/dom.js`
- CSS Studio si hace falta.

## 22. Archivos que NO deberían tocarse en IA Docente fase 1

No deberían tocarse:

- Student players.
- Student renderer.
- Persistencia existente salvo usar el guardado actual.
- Contrato JSON.
- Toast vendor.
- Pregunta abierta player.
- Código player.
- Respuestas alumno.
- Calificación.

## 23. Criterios de aceptación IA Docente fase 1

Checklist:

- Prompt vacío muestra error.
- Sin API key muestra error.
- IA genera unidad válida.
- JSON se valida.
- Unidad aparece en Studio.
- `Ver JSON` muestra estructura correcta.
- Preview alumno renderiza componentes generados.
- Guardar manual funciona.
- Refrescar conserva unidad.
- No se llama IA desde frontend.
- No hay API key expuesta.

## 24. Conclusión

La división recomendada es clara: IA Docente primero, IA Student después. IA Docente aprovecha la arquitectura ya funcional de Studio, persistencia y preview. IA Student requiere una rama previa de respuestas de alumno y decisiones de privacidad, intentos, feedback y calificación.

Arquitectónicamente, el proyecto ya tiene una base para separar IA: `services/`, `config.py` y `validators.py`. La recomendación inmediata es completar esa arquitectura existente en lugar de meter IA en `xblock.py` o crear carpetas duplicadas sin necesidad. Si el equipo prefiere una frontera semántica más fuerte, una carpeta `ia_assistant/ai/` también sería válida, pero debería reemplazar o absorber los stubs de `services/`, no convivir como duplicado.

La fase inmediata recomendada es diseñar e implementar IA Docente fase 1 con backend delegado, proveedor encapsulado, prompt separado, validación fuerte y salida insertada en Studio sin guardado automático.

Siguiente prompt recomendado:

```text
Diseñar arquitectura base de IA Docente fase 1 usando services/config/validators sin implementar llamadas externas todavía.
```
