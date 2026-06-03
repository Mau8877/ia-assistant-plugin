# Arquitectura IA Docente Fase 1

## 1. Objetivo

Esta fase prepara la arquitectura base para generar unidades educativas con IA, sin conectar todavía la generación desde la UI, sin crear handler XBlock de IA y sin hacer llamadas externas reales.

La meta es dejar una separación limpia para que una fase posterior pueda:

- llamar a un proveedor IA desde backend;
- generar una propuesta de `unidad_json`;
- validar y normalizar la salida;
- insertar la unidad en Studio para revisión docente.

## 2. Decisiones

- Se usa `ia_assistant/services/`, que ya existía en el proyecto.
- No se crea `ia_assistant/ai/` todavía para evitar arquitectura duplicada.
- No se mete lógica IA en `xblock.py`.
- No se toca Student.
- No se cambia el contrato JSON.
- No se guarda automáticamente una propuesta generada por IA.
- No se llama a OpenRouter todavía.
- No se expone API key al frontend.

## 3. Archivos creados/modificados

- `ia_assistant/config.py`
  - Centraliza configuración de OpenRouter.
  - Lee `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_BASE_URL` y `OPENROUTER_TIMEOUT`.

- `ia_assistant/validators.py`
  - Agrega validación y normalización del contrato de unidad generado por IA.
  - Permite solo `teoria`, `quiz_multiple`, `pregunta_abierta` y `codigo`.
  - Excluye `revision` para IA Docente fase 1.
  - Mantiene una fachada única por ahora: no se desacopla todavía en varios módulos.
  - Normaliza IDs de componentes por tipo y opciones de quiz a IDs seguros.
  - Remapea `respuestas_correctas` a los IDs normalizados y elimina duplicados.

- `ia_assistant/services/ai_errors.py`
  - Define errores controlados de IA.
  - Convierte errores a payloads JSON seguros.

- `ia_assistant/services/openrouter_client.py`
  - Define `OpenRouterClient`.
  - Queda preparado pero deshabilitado para llamadas externas.

- `ia_assistant/services/prompt_builder.py`
  - Construye el prompt de sistema para IA Docente.
  - Construye el prompt de usuario desde `prompt_docente` y contexto opcional.

- `ia_assistant/services/unit_service.py`
  - Orquesta el flujo futuro de generación.
  - Construye prompts, llama al cliente, parsea JSON y valida.
  - Actualmente devuelve error controlado porque el cliente está deshabilitado.

- `ia_assistant/services/__init__.py`
  - Mantiene el paquete liviano sin imports pesados al cargar XBlock.

## 4. Flujo futuro

```text
Studio
-> handler XBlock
-> unit_service
-> prompt_builder
-> openrouter_client
-> validators
-> Studio.State
```

El flujo futuro debe mantener esta regla:

```text
IA genera propuesta
-> backend valida
-> docente revisa
-> docente guarda
```

La IA no debe guardar directamente en `unidad_json`.

## 5. Estado actual de esta fase

Estado actual:

- Arquitectura base lista.
- Configuración centralizada.
- Errores controlados definidos.
- Prompt builder preparado.
- Validadores de unidad generada preparados.
- Orquestador preparado.
- Cliente OpenRouter preparado pero deshabilitado.
- Servicios base con mensajes y docstrings en español.
- `unit_service.py` valida respuestas no textuales como error controlado.
- El prompt interno sigue siendo básico y se mejorará en una fase futura.
- Existe una Chatbar IA visual en Studio, pero todavía no está conectada a backend ni genera unidades.

No existe todavía:

- Handler XBlock de IA.
- API frontend para generación IA.
- Conexión funcional entre la Chatbar IA de Studio y el backend.
- Llamada real a OpenRouter.
- Inserción de unidad generada en `Studio.State`.
- IA Student.
- Persistencia de respuestas.
- Calificación.

## 6. Siguiente fase recomendada

Orden recomendado:

1. Implementar llamada real OpenRouter en `openrouter_client.py`.
2. Implementar handler XBlock `generate_unit_from_prompt`.
3. Implementar método frontend en `studio/js/api.js`.
4. Conectar la Chatbar IA existente en Studio con el nuevo método frontend.
5. Insertar la unidad validada en `Studio.State`.
6. Validar generación completa con Vista previa alumno.

La siguiente fase debe seguir sin guardar automáticamente. El docente debe revisar la propuesta y luego guardar con el flujo actual.
