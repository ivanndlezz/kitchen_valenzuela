# Contador de peticiones SHUM

## Objetivo

Mantener en Airtable un contador simple de peticiones de productos hechas a SHUM API usando el field `peticiones` en la tabla `configs`.

Este contador pertenece al scope de productos/products-container. No cuenta clientes, cotizaciones, taxonomías ni otros módulos, porque eso rompería el contrato de optimización de carga del inventario.

## Regla principal

Las llamadas hechas por `SyncManager.shumRequest()` se agregan al contador solo si pertenecen a tablas configuradas en `requestCounter.trackedTables`.

La actualización del propio field `peticiones` también se cuenta, pero no dispara otro conteo recursivo. En lugar de autocontarse como una nueva petición normal, el sistema suma matemáticamente el patch dentro del incremento.

Ejemplo:

- 1 petición normal a SHUM
- 1 patch a `configs.peticiones`
- incremento total: `+2`

Si el sistema todavía no conoce el record de `configs`, primero hace una lectura de `configs`. En ese caso esa lectura también se cuenta:

- 1 petición normal a SHUM
- 1 lectura de `configs` para resolver el record
- 1 patch a `configs.peticiones`
- incremento total: `+3`

## Batching

El contador usa un pequeño debounce para no hacer un patch por cada request individual.

Ejemplo:

- 10 peticiones normales agrupadas
- 1 patch a `configs.peticiones`
- incremento total: `+11`

Esto mantiene el conteo honesto y reduce carga innecesaria sobre SHUM/Airtable.

## Implementación

El flujo vive en `inventory/js/shum-sync.js`:

- `shumRequest(action, params, options)`
- `queueRequestCounterIncrement(amount)`
- `flushRequestCounter()`
- `resolveRequestCounterRecord()`

La configuración está en `SyncManager.config.requestCounter`:

```js
requestCounter: {
  enabled: true,
  table: "configs",
  field: "peticiones",
  trackedTables: ["products"],
  storageKey: "kv-shum-request-counter",
  flushDelayMs: 800
}
```

`storageKey` guarda localmente el record id de `configs` y el último valor conocido. SHUM no soporta `retrieve`, así que el sistema no intenta leer el record en cada flush; solo lista `configs` cuando todavía no conoce el record id.
