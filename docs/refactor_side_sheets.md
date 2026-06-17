# Refactor de Side Sheets

**Proyecto:** Kitchen Valenzuela POS / ERP  
**Fecha:** 16 de junio de 2026  
**Objetivo:** Unificar la arquitectura de side sheets para reducir duplicación, facilitar mantenimiento y permitir hidratación dinámica de secciones sin hardcodear cada variante.

---

## Contexto

Hoy los side sheets están resueltos con bloques HTML y lógica específica por caso de uso. Eso funciona, pero con el crecimiento del sistema el costo de mantenimiento sube rápido:

- hay estructuras repetidas entre sheets,
- los cambios de layout se aplican en varios lugares,
- cada nuevo caso termina replicando partes del shell,
- la hidratación de contenido vive dispersa entre componentes.

La observación principal es correcta: el problema ya no es solo de UI, sino de arquitectura. Conviene definir un **corpus único** para los side sheets y tratar cada sheet como una instancia configurable de ese corpus.

---

## Principio Rector

Un side sheet debe ser un contenedor base reutilizable, y cada caso de uso debe aportar solamente sus piezas variables.

La estructura común que todos comparten es:

1. `header.app-sheet__top`
2. `app-sheet__eyebrow`
3. `app-sheet__title`
4. `app-sheet__controls`
5. `app-sheet__close`
6. `navigation`
7. `main`
8. `footer` o `app-sheet__fixed-controls`

Los campos o nodos opcionales deben aparecer solo si existen.  
La excepción es `app-sheet__close`, que debe existir siempre.

---

## Propuesta De Arquitectura

### 1. Definir un shell base

Crear una clase base para side sheets, responsable de:

- renderizar el contenedor general,
- alojar los slots principales,
- exponer métodos de hidratación,
- manejar apertura, cierre y estado visual,
- normalizar el montaje de contenido por secciones.

### 2. Especializar por herencia

La idea es que `taxonomy-manager__panel` no sea un bloque aislado, sino una clase hija o una implementación concreta del side sheet base.

Esto implica dos niveles:

- **Clase padre:** `AppSideSheet`
- **Clase hija:** `TaxonomyManagerPanel`

La clase hija hereda la estructura y solo redefine:

- contenido del `nav`,
- contenido del `main`,
- controles específicos del footer,
- comportamiento de interacción propio.

### 3. Hidratar por partes

En lugar de renderizar un sheet completo con HTML fijo, el shell debe permitir montar piezas independientes.

Propuesta de API:

```js
hydrateTop(eyebrow, title, controlsByID) {
  // eyebrow puede ser texto o HTML
  // title puede ser texto o HTML
  // controls puede ser texto o HTML
}

hydrateNav(component) {
  // se hidrata el componente según su id
}

hydrateMain(html) {
}

hydrateBottomControls(template, custom) {
}
```

---

## Regla De Composición

La composición debe ser declarativa y con prioridad de slots:

- si una sección recibe contenido, se hidrata,
- si no recibe contenido, se oculta o queda vacía,
- el close siempre se renderiza,
- los controles inferiores pueden ser estándar o custom,
- el `main` no debería conocer el shell que lo envuelve.

Esto permite que un mismo shell sirva para:

- ficha de producto,
- edición de producto,
- taxonomy manager,
- futuras pantallas de configuración,
- cualquier panel lateral de administración.

---

## Qué Se Busca Evitar

La refactorización debería eliminar estas prácticas:

- HTML duplicado entre sheets,
- condicionales de layout distribuidas en varios archivos,
- headers rearmados manualmente en cada panel,
- controles persistentes copiados en cada implementación,
- lógica de apertura/cierre mezclada con render de contenido,
- dependencia de un archivo específico para cada pequeño variant shell.

---

## Criterio Técnico

Hay dos maneras de interpretarlo:

### Opción A: Solo shell común

Se crea una clase base común y cada sheet la usa por composición.

Ventajas:

- menor acoplamiento,
- más fácil de migrar,
- menos riesgo inmediato.

### Opción B: Shell común + herencia formal

`taxonomy-manager__panel` hereda del side sheet base.

Ventajas:

- modelo OOP más limpio,
- contractos más explícitos,
- mejor base para nuevos paneles.

Recomendación: usar **shell común + herencia formal** solo donde haya realmente comportamiento compartido, y no forzar herencia donde la composición sea suficiente. La herencia debe servir para compartir contrato y comportamiento, no para meter toda la UI dentro de una jerarquía rígida.

---

## Plan De Refactor

### Fase 1. Inventario de shells actuales

Auditar todos los side sheets y detectar:

- qué tienen en común,
- qué partes son únicas,
- qué contenido debería convertirse en slot,
- qué handlers están acoplados al HTML actual.

### Fase 2. Crear el shell base

Construir la clase base con:

- top/header,
- nav,
- main,
- footer/bottom controls,
- close button,
- soporte para HTML o nodos renderizados.

### Fase 3. Migrar taxonomy manager

Convertir `taxonomy-manager__panel` en la primera implementación hija.

Esto sirve como prueba de concepto porque:

- tiene header,
- tiene navegación,
- tiene contenido principal,
- tiene controles propios,
- y es un panel suficientemente estable para refactorizarlo con seguridad.

### Fase 4. Migrar product sheets

Llevar después:

- product detail,
- product form,
- tabs o vistas internas relacionadas.

### Fase 5. Normalizar hidratación

Unificar cómo se montan secciones:

- `hydrateTop`
- `hydrateNav`
- `hydrateMain`
- `hydrateBottomControls`

Y definir una convención para pasar contenido:

- texto plano,
- HTML,
- componentes,
- nodos ya construidos.

### Fase 6. Limpiar deuda

Una vez migrados los primeros sheets:

- eliminar duplicación residual,
- simplificar handlers específicos,
- documentar el contrato del shell,
- dejar ejemplos mínimos para crear nuevos side sheets.

---

## Resultado Esperado

Al terminar el refactor, el sistema debería permitir:

- crear nuevos side sheets sin rehacer la estructura base,
- cambiar el chrome visual en un solo lugar,
- hidratar secciones de forma independiente,
- reducir el hardcode de layouts,
- mantener un contrato claro entre shell y contenido.

---

## Nota De Producto

La meta no es volver todo “más OO” por estética.  
La meta es que el sistema sea más fácil de mantener, más predecible y menos frágil cuando crezca.

Si una clase ayuda a encapsular el shell y su ciclo de vida, vale la pena.  
Si una vista se resuelve mejor por composición, también debe poder hacerlo.

