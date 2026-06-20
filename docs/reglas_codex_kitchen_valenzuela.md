# Reglas de Trabajo de Codex — Kitchen Valenzuela

Este documento es ley operativa para cualquier cambio en este proyecto. Su objetivo es evitar regresiones, proteger el trabajo manual del usuario y asegurar que cada intervención sea aditiva, precisa y verificable.

## Ley 1 — Los cambios deben ser aditivos, no regresivos

Cada token y cada patch debe avanzar el proyecto. Si un cambio obliga al usuario a corregir una regresión causada por Codex, el trabajo falló.

Antes de editar, Codex debe identificar:

- Qué problema exacto se está resolviendo.
- Qué archivo y bloque mínimo lo causa.
- Qué comportamiento existente debe preservarse.

## Ley 2 — No tocar diseño visual si el problema es funcional

Si el bug es de `overflow`, `position`, `z-index`, estado JS, mapeo de datos o flujo, Codex no debe reescribir CSS visual.

Queda prohibido cambiar sin pedido explícito:

- Clases existentes.
- Paleta, sombras, radios, padding, tamaños o tipografía.
- Estructura visual del componente.
- Apariencia de un componente ya diseñado por el usuario.

La corrección debe limitarse a la regla funcional necesaria.

## Ley 3 — El CSS manual del usuario es fuente de verdad

Si el usuario pegó, ajustó o diseñó CSS manualmente, Codex debe tratarlo como intencional.

No se debe:

- Borrar bloques manuales por parecer duplicados.
- Renombrar clases para “ordenarlas”.
- Mover estilos entre wrappers si eso cambia el resultado visual.
- Normalizar formato si no aporta al bug.

Si un bloque parece peligroso, primero se informa el riesgo y se propone el patch mínimo.

## Ley 4 — Patch mínimo obligatorio

Para bugs puntuales, el patch correcto es el más pequeño que resuelve el problema.

Antes de aplicar, Codex debe preferir:

- Una propiedad CSS antes que reescribir un bloque.
- Un guard clause antes que reestructurar una función.
- Un helper pequeño antes que una refactorización amplia.
- Un cambio local antes que una abstracción nueva.

## Ley 5 — No mezclar scopes

Cada intervención debe pertenecer a un scope claro.

Ejemplos:

- Inventario no debe mezclarse con Web.
- Crear producto no debe mezclarse con actualizar producto.
- Campos personalizados no debe mezclarse con logística.
- Refactor de arquitectura no debe mezclarse con polish visual.

Si aparecen scopes distintos, se separan en pasos y se pausa antes de mezclarlos.

## Ley 6 — Preservar el contrato del usuario

Cuando el usuario dice “ajusta esto”, Codex no debe interpretar “rediseña esto”.

Cuando el usuario muestra un snippet o una imagen, ese material es referencia directa. Codex debe preservar:

- El aspecto.
- Las clases.
- El flujo mental.
- La intención del componente.

## Ley 7 — Antes de editar CSS, leer el contexto completo del bloque

Antes de tocar CSS, Codex debe revisar:

- La regla objetivo.
- Sus padres contenedores.
- Estados relacionados (`.is-open`, `.active`, `.hidden`, etc.).
- Reglas de overflow, stacking y layout cercanas.

No se debe editar CSS por intuición visual sin ubicar la causa real.

## Ley 8 — Verificar que no se rompió lo existente

Después de cada cambio, Codex debe verificar al menos una de estas cosas, según aplique:

- `node --check` para JS tocado.
- Búsqueda con `rg` para confirmar que no quedaron referencias viejas.
- Revisión del diff del archivo tocado.
- Prueba en navegador si el cambio es visual/interactivo y el entorno lo permite.

Si no se pudo verificar visualmente, debe decirse explícitamente.

## Ley 9 — Si Codex rompe algo, no debe defenderse

Ante una regresión causada por Codex:

- Se reconoce.
- Se corrige con el patch mínimo.
- No se justifica como mejora.
- No se expande el scope.

La prioridad es restaurar confianza y comportamiento.

## Ley 10 — El usuario no debe pagar por trabajo repetido

Si Codex causa una regresión, la siguiente intervención debe ser quirúrgica.

No se debe gastar el turno en explicaciones largas, refactors laterales o nuevas ideas. Primero se restaura lo roto.

## Ley 11 — No usar “Cargando...” como UI final

No se debe renderizar texto literal como “Cargando...”, “Cargando datos...” o variantes equivalentes dentro de la interfaz.

Para estados de espera, Codex debe preferir siempre skeleton loadings que respeten la estructura visual del contenido esperado.

Solo se permite texto de carga en logs, comentarios técnicos o mensajes no visibles para el usuario final.

## Checklist obligatorio antes de aplicar un patch

Antes de editar, Codex debe poder responder:

- ¿Cuál es la causa exacta?
- ¿Cuál es el cambio mínimo?
- ¿Qué parte del trabajo manual del usuario estoy preservando?
- ¿Qué no debo tocar?
- ¿Cómo voy a verificar que no hice daño?

Si alguna respuesta no está clara, Codex debe detenerse y revisar más contexto.
