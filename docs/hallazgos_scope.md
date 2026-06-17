# Hallazgos de Scope — Sistema POS/ERP Kitchen Valenzuela

**Proyecto:** Ecosistema POS Omnicanal · Folio D-002
**Elaborado por:** Klef Agency
**Última actualización:** 16 de junio de 2026

---

## Propósito de este documento

Durante el desarrollo del sistema se han identificado puntos donde la implementación actual no corresponde al modelo de datos ni a la arquitectura prevista, o donde distintos conceptos de negocio se están tratando como si fueran el mismo. Este documento centraliza esos hallazgos para su revisión, priorización y corrección ordenada.

Cada hallazgo se documenta con: evidencia del estado actual, por qué constituye un problema de scope, y la solución propuesta.

---

## Índice de Hallazgos

| # | Hallazgo | Módulo afectado | Estado |
|---|---|---|---|
| 01 | Almacenes hardcodeados en lugar de taxonomía dinámica | Inventario / Formulario de producto | 🔴 Identificado |

---

## Hallazgo 01 — Almacenes Hardcodeados

### Estado actual

En el paso 4 (Inventario) del formulario de alta de producto, los almacenes están escritos directamente en el código como dos tarjetas fijas:

```html
<div class="wh-grid">
  <div class="wh-card">
    <div class="wh-name"><span class="wh-dot"></span>Kitchen Clean</div>
    <input type="number" name="wh_qty_3" placeholder="0" min="0">
    <input type="hidden" name="wh_3" value="3">
    <input type="text" name="rack_3" placeholder="Ej. A-12">
  </div>
  <div class="wh-card">
    <div class="wh-name"><span class="wh-dot" style="background: #999"></span>Inoxidables</div>
    <input type="number" name="wh_qty_4" placeholder="0" min="0">
    <input type="hidden" name="wh_4" value="4">
    <input type="text" name="rack_4" placeholder="Ej. B-07">
  </div>
</div>
```

Los nombres ("Kitchen Clean", "Inoxidables"), los IDs (`3`, `4`) y la cantidad de tarjetas están fijos en el HTML. No hay forma de agregar, editar o eliminar un almacén desde la interfaz.

### Evidencia adicional — el campo ya existe en Airtable, pero vacío

El registro de configuración general en Airtable confirma que el campo `almacenes` **ya fue contemplado en el esquema** desde el diseño original, con la misma estructura de los demás campos de taxonomía:

```json
{
  "Marcas": "[\"Generales\",\"robertshaw\",\"RATIONAL\", ...]",
  "Categorias": "{\"29\":{\"name\":\"Equipos\",\"subcategories\":[...]}, ...}",
  "Subcategorias": "{\"29\":[\"Hornos\",\"Refrigeración\", ...], ...}",
  "vendedores": "[{\"id\":\"seller-test-mqa71szx\",\"name\":\"Test\", ...}]",
  "almacenes": "{\"\": \"\"}"
}
```

A diferencia de `Marcas`, `Categorias`, `Subcategorias` y `vendedores` — que ya tienen datos reales y una estructura definida — el campo `almacenes` está presente pero **vacío y sin esquema poblado** (`{"": ""}`). Esto confirma que el problema no es que falte el concepto en el modelo de datos: es que nunca se terminó de construir, y mientras tanto el formulario de producto se programó con un HTML fijo a modo de parche, desconectado por completo de este campo.

Se observa el mismo patrón en otros campos del mismo registro (`product_form_fields`, `media`, `proveedores_envios`), también presentes como placeholder vacío — lo cual sugiere que hay más de una pieza de la arquitectura prevista que quedó pendiente de construcción y podría merecer su propio hallazgo más adelante.

### Por qué es un problema de scope

El sistema ya resuelve este mismo patrón correctamente para otros conceptos de catálogo: **categorías, subcategorías, marcas y vendedores** se gestionan como taxonomías dinámicas — se listan, crean, editan y eliminan desde Airtable a través del `taxonomy-manager`, y cualquier cambio se refleja en todos los formularios sin tocar código.

Los almacenes son, por naturaleza, el mismo tipo de entidad: una lista de valores que cambia con el tiempo (Kitchen Valenzuela puede abrir una bodega nueva, renombrar una existente, o dejar de usar otra). Tratarlos como HTML fijo rompe la consistencia del modelo de datos y crea una excepción injustificada en la arquitectura.

Esto también implica un techo operativo: si el negocio crece a un tercer almacén, alguien tiene que modificar código para agregarlo — exactamente el tipo de fricción que el resto del sistema fue diseñado para evitar.

### Solución propuesta

**1. Definir y poblar el esquema de `almacenes` (campo ya existente)**

El campo `almacenes` ya existe en el registro de configuración de Airtable, pero sin estructura. Se debe definir su esquema siguiendo el mismo patrón que `Categorias` (objeto indexado por ID con `name` y atributos adicionales): cada almacén con `id`, `name`, `color` (para el punto de color que ya existe visualmente en el HTML), `active`, y opcionalmente `address` o `notes`. Una vez definido el esquema, poblarlo con los dos almacenes actuales ("Kitchen Clean" y "Inoxidables") como punto de partida, en lugar de mantenerlos fijos en código.

**2. CRUD de almacenes vía taxonomy-manager**

Extender el componente `taxonomy-manager` existente para soportar el tipo `warehouse`, igual que ya soporta `category`, `subcategory` y `brand`. Esto da automáticamente: listar, crear, editar (con cascada a productos relacionados) y eliminar (con confirmación y desvinculación).

**3. Renderizado dinámico del paso de Inventario**

Sustituir el bloque `.wh-grid` fijo por un ciclo que genere una `.wh-card` por cada almacén activo en Airtable, manteniendo la misma estructura de campos (`Cantidad`, `Estante`) por almacén. Si se agrega un almacén nuevo, aparece automáticamente en el formulario sin despliegue de código.

**4. Botón de agregar almacén dentro del formulario**

Igual que categoría, subcategoría y marca tienen su botón `+` junto al select, el paso de Inventario debe incluir una acción para crear un almacén nuevo sin salir del formulario de producto.

### Requerimiento adicional — Selector de almacén activo (header)

Fuera del formulario, en el encabezado general del sistema, se requiere un selector de **almacén de trabajo activo** — análogo a elegir el espacio de trabajo activo en una herramienta como Notion.

**Ubicación:** en el `header__actions`, junto al botón de sincronización.

**Comportamiento esperado:**
- Al cargar el sistema, se muestra el almacén activo actual (ej. "Kitchen Clean ▾").
- Al hacer clic, despliega la lista de almacenes disponibles (la misma fuente de datos del Hallazgo 01).
- Al seleccionar uno, el contexto de trabajo cambia: las pantallas de inventario, POS y reportes filtran o priorizan ese almacén.
- El almacén activo debe persistir por sesión de usuario.

**Pendiente de definir:** si el almacén activo afecta solo la vista (filtro de lectura) o también el comportamiento de escritura (ej. a qué almacén se asigna por defecto una nueva entrada de stock, o desde qué almacén se descuenta inventario en una venta del POS cuando el producto existe en más de uno).

### Impacto en otros módulos

| Módulo | Impacto |
|---|---|
| Formulario de producto (paso 4) | Reemplazar bloque fijo por renderizado dinámico |
| Taxonomy-manager | Agregar tipo `warehouse` |
| Header general | Agregar selector de almacén activo |
| Sincronización (Shopify) | Definir cómo se mapea almacén de Kitchen Valenzuela a "ubicación" de Shopify, si son N:1 o 1:1 |
| Reportes de inventario | Deben poder filtrarse o agruparse por almacén dinámicamente |

---

## Hallazgo 02 — *(pendiente de documentar)*

> Próximo hallazgo: distinción entre los tres tipos de costo/envío que se están mezclando — flete proveedor→bodega, costo de envío al cliente en cotización, y costo de envío preestablecido para la tienda en línea. Cada uno tiene naturaleza, momento y responsable distintos, y actualmente parecen tratarse como un solo concepto en algunas partes del sistema.
