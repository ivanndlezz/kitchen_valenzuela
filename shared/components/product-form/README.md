# Arquitectura — Product Form Refactor

## Estructura de archivos

```
product-form/
├── config.js        — Datos estáticos (SSOT)
├── state.js         — Estado mutable (SSOT)
├── dom.js           — Utilidades DOM puras
├── accordion.js     — Abrir/cerrar pasos
├── stepPills.js     — Barra de navegación + progreso
├── summary.js       — Chips de resumen por paso
├── review.js        — Panel de revisión (paso 9)
├── bottomBar.js     — Barra de acciones inferior
├── quickForm.js     — Overlay de campos obligatorios
├── formHandlers.js  — Reacciones a inputs del formulario
└── main.js          — Composition root / bootstrap
```

---

## Principios aplicados

### SSOT — Single Source of Truth

| Dato | Antes | Después |
|---|---|---|
| Datos estáticos (tipos, categorías, unidades…) | `CONFIG` objeto global | `config.js` — un solo lugar, exportado |
| Spec de campos del review | Hardcodeada en `buildReview()` | `STEPS[].reviewFields` en `config.js` |
| Mapeo quick-form ↔ main-form | Duplicado como `QF_MAP` array local | `QF_FIELD_MAP` en `config.js` |
| Estado mutable (`currentStep`, `doneSet`, etc.) | Objeto `State` global mutable | `state.js` con getters/setters explícitos |

---

### SRP — Single Responsibility Principle

Cada módulo tiene **una razón para cambiar**:

- `config.js` cambia si cambian los datos del negocio.
- `state.js` cambia si cambia la forma de persistir estado.
- `accordion.js` cambia si cambia el comportamiento de expansión.
- `review.js` cambia si cambia el layout del panel de revisión.
- `formHandlers.js` cambia si cambian las reglas reactivas de inputs.
- `main.js` cambia si cambia el orden de inicialización.

El archivo original mezclaba todo esto en ~500 líneas sin separación.

---

### SoC — Separation of Concerns

```
Datos ──────► config.js
                  │
Estado ─────► state.js ◄───── leído por todos, escrito solo aquí
                  │
DOM puro ───► dom.js  (sin lógica de negocio)
                  │
Comportamiento:
  accordion.js  → abrir/cerrar paneles
  stepPills.js  → pills + barra de progreso
  summary.js    → chips de resumen
  review.js     → panel de revisión
  bottomBar.js  → botones inferiores
  quickForm.js  → overlay campos obligatorios
  formHandlers.js → reacciones a inputs
                  │
Bootstrap ──► main.js (composition root, sin lógica propia)
```

---

### DRY — Don't Repeat Yourself

| Duplicación original | Solución |
|---|---|
| `populateProductTypes()` + bloque de `qfTypesContainer` (casi idénticos) | `buildPillGroup(container, types, name)` en `dom.js` |
| `toggleStep` y `goToStep` repetían el patrón close-all → open | `closeAllExcept(n)` como primitiva compartida |
| Sync to/from quick-form con dos arrays de strings | `QF_FIELD_MAP` en config; `forEach` en ambas direcciones |
| Construcción de review hardcodeada por sección | Loop sobre `STEPS[].reviewFields` + resolvers por tipo |

---

### OCP — Open/Closed Principle

**Review fields especiales** (`productType`, `dimensions`, `mainImage`, `gallery`):
En el original eran condicionales dentro de `buildReview`.
Ahora son entradas en `SPECIAL_RESOLVERS` en `review.js`.
Agregar un campo especial = agregar una entrada al objeto, sin tocar el loop de render.

**Nuevos tipos de campo en el review** (p.ej. `type: "file-list"`):
Se agrega un resolver; el resto no cambia.

---

### LSP / ISP (donde aplica)

- `populateSelect` acepta `string[]` o `Record<string, string|{name}>` — el
  caller no necesita saber cuál es; la función maneja ambos contratos.
- Los event handlers (`handleCategoryChange`, `handleUnitChange`, etc.) son
  funciones puras sin dependencias del módulo que las llama.

---

## Flujo de eventos (desacoplamiento)

`accordion.js` dispara `CustomEvent("stepChange")` en lugar de llamar
directamente a `syncPills()`. Esto rompe la dependencia circular
`accordion ↔ stepPills` sin necesitar un event bus externo.

```
[user click] → accordion.toggleStep(n)
                    │
                    └─► dispatchEvent("stepChange")
                              │
                              ├─► stepPills.syncPills()  ← escucha el evento
                              └─► (otros listeners futuros)
```

---

## Migración al HTML

Reemplaza el `<script src="app.js">` por:

```html
<script type="module" src="main.js"></script>
```

No se requiere bundler — los módulos ES funcionan nativamente en todos los
navegadores modernos. Para producción, un bundler (Vite/esbuild) puede
consolidarlos en un solo archivo.
