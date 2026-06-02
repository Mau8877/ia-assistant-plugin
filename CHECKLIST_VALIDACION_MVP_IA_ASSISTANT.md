# Checklist de validacion MVP IA Assistant

## 1. Studio

- [ ] Abrir Studio sin errores de consola.
- [ ] Crear unidad nueva.
- [ ] Editar titulo.
- [ ] Agregar teoria.
- [ ] Agregar quiz multiple.
- [ ] Agregar pregunta abierta.
- [ ] Agregar codigo.
- [ ] Renombrar componente.
- [ ] Reordenar componente.
- [ ] Eliminar componente con confirmacion.
- [ ] Ver JSON.
- [ ] Guardar manualmente.
- [ ] Confirmar feedback de guardado.

## 2. Persistencia

- [ ] Guardar.
- [ ] Refrescar.
- [ ] Confirmar que la unidad reaparece.
- [ ] Confirmar que ids, tipos y data se conservan.
- [ ] Confirmar que autoguardado no dispara requests por cada tecla.
- [ ] Confirmar que autoguardado muestra feedback correcto.

## 3. Teoria

- [ ] Encabezados.
- [ ] Parrafos.
- [ ] Negrita y cursiva.
- [ ] Listas.
- [ ] Tabla.
- [ ] Codigo inline.
- [ ] Bloque de codigo.
- [ ] Link.
- [ ] Sin boton de imagen.
- [ ] Preview renderiza correctamente.

## 4. Quiz multiple

- [ ] Quiz con una correcta usa radio.
- [ ] Quiz con varias correctas usa checkbox.
- [ ] Comprobar sin seleccion muestra advertencia.
- [ ] Correcta exacta muestra resultado correcto.
- [ ] Parcial muestra X/Y.
- [ ] Incorrecta extra vuelve incorrecto.
- [ ] Feedback se agrupa por opcion.

## 5. Pregunta abierta

- [ ] Enunciado visible.
- [ ] Textarea local.
- [ ] Rubrica no visible en Student.
- [ ] Respuesta no se guarda todavia.

## 6. Codigo

- [ ] Enunciado visible.
- [ ] Lenguaje visible.
- [ ] Instrucciones visibles.
- [ ] Textarea inicia con codigo base.
- [ ] Tab indenta.
- [ ] Shift+Tab desindenta.
- [ ] Enter conserva indentacion.
- [ ] Restaurar codigo base funciona.
- [ ] Codigo no se ejecuta.
- [ ] Respuesta no se guarda.

## 7. Vista previa alumno

- [ ] Abre desde Studio.
- [ ] Usa unidad actual sin guardar.
- [ ] Cierra correctamente.
- [ ] No llama backend.
- [ ] No rompe Studio.
- [ ] No deja errores en consola.

## 8. Student real

- [ ] Pendiente validar en LMS/Open edX real.
- [ ] Confirmar que carga `initial_unit`.
- [ ] Confirmar que renderiza la unidad persistida.
- [ ] Confirmar que no depende del escenario SDK eliminado.

## 9. Manifest

- [ ] No hay rutas duplicadas innecesarias.
- [ ] No hay rutas claramente inexistentes.
- [ ] Orden de carga correcto: common.
- [ ] Orden de carga correcto: vendor.
- [ ] Orden de carga correcto: state/dom/renderer.
- [ ] Orden de carga correcto: players.
- [ ] Orden de carga correcto: inicializadores.

## 10. Limites conocidos

- IA no implementada.
- Respuestas no persistidas.
- Calificacion no implementada.
- Progreso no implementado.
- Codigo no ejecutable.
- HTML crudo pendiente de politica/sanitizacion.
- Rubrica oculta sin opcion configurable.

## 11. Resultado de validacion

| Area | Resultado | Observaciones |
|------|-----------|---------------|
| Studio | | |
| Persistencia | | |
| Autoguardado | | |
| Teoria | | |
| Quiz | | |
| Pregunta abierta | | |
| Codigo | | |
| Preview | | |
| Student real | | |
| Manifest | | |
| Consola | | |
