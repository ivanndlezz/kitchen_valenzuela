# Módulo de Cotizaciones — Casos de Uso
## Kitchen Valenzuela · POS Omnicanal · Folio D-002
**Versión:** 1.0
**Fecha:** 15 de junio de 2026
**Elaborado por:** Klef Agency

---

## Contexto del Módulo

El módulo de cotizaciones es el núcleo comercial del sistema. Conecta el catálogo de productos con el cliente, el vendedor, la estructura de precios interna y el documento formal que se entrega. Es el paso previo obligatorio antes de convertir una venta en pedido y descuento de inventario.

El módulo opera en dos momentos distintos:

1. **Al dar de alta un producto** — se definen los valores base de costo, costo de traslado proveedor → bodega y utilidad esperada.
2. **Al crear una cotización** — esos valores pueden ajustarse por producto, se agregan ítems de servicio, se asigna vendedor, días de entrega y condiciones.

---

## Modelo de Precios

Antes de describir los casos de uso, es importante entender cómo se construye el precio final de un producto en el sistema.

```
Costo del producto
+ Costo de traslado (proveedor → bodega)
= Costo base

Costo base
+ Utilidad (% o MXN, según elija el admin)
= Precio de venta sugerido

──────────────────────────────────────────
En la cotización:

Precio de venta sugerido
+ Costo de envío al cliente (por producto, si aplica)
= Precio final al cliente en cotización
```

El **margen de utilidad** es siempre interno. No aparece en el documento de cotización que ve el cliente. El sistema lo muestra únicamente en la vista de administración.

---

## Actores

- **Administrador:** configura productos, precios, utilidad y prefijo de folio.
- **Vendedor:** crea cotizaciones, asigna clientes, ajusta márgenes por línea y genera el documento.
- **Cliente (indirecto):** recibe el PDF de cotización; no interactúa con el sistema.

---

## UC-C01: Configurar Precio y Utilidad en el Producto

**Actor principal:** Administrador
**Momento:** Al crear o editar un producto en el catálogo.

### Flujo principal

1. El administrador abre el formulario de producto (nuevo o existente).
2. Ingresa o actualiza los siguientes campos en la sección **Estructura de Precio**:

| Campo | Descripción | Visibilidad | Tipo |
|---|---|---|---|
| Costo del producto | Precio de adquisición al proveedor | Solo admin | MXN |
| Costo de traslado | Flete del proveedor a las bodegas de Kitchen Valenzuela. No es el envío al cliente. | Solo admin | MXN |
| Tipo de utilidad | El admin elige cómo expresar la utilidad | Solo admin | Selector: % / MXN |
| Valor de utilidad | Porcentaje o monto fijo según el tipo seleccionado | Solo admin | Número |
| Precio de venta calculado | Resultado automático: costo base + utilidad | Solo admin | MXN (solo lectura) |
| Margen de utilidad real | Se recalcula en tiempo real al cambiar cualquier campo | Solo admin | % (solo lectura) |

3. El sistema recalcula automáticamente el **precio de venta** y el **margen real** cada vez que cambia un campo.
4. El administrador guarda. Los valores quedan como configuración base para cuando el producto se cargue en una cotización.

### Flujo alterno — Cambio de tipo de utilidad
- Si el admin cambia de `%` a `MXN` (o viceversa), el sistema convierte el valor actual al nuevo tipo y mantiene el precio de venta resultante igual, ajustando el número mostrado.

### Reglas de negocio
- El costo de traslado proveedor → bodega es opcional. Si no aplica, el costo base equivale al costo del producto.
- La utilidad puede ser 0, pero no negativa.
- El precio de venta calculado nunca se edita directamente; es siempre resultado del cálculo.

---

## UC-C02: Configurar Prefijo de Folio

**Actor principal:** Administrador
**Momento:** Configuración inicial o al necesitar cambiar la serie.

### Flujo principal

1. El administrador accede a **Configuración → Cotizaciones**.
2. Define el prefijo de folio (ej. `KV`, `COT`, `KV-2026`).
3. Define el número inicial de la serie (por defecto: `001`).
4. Guarda. A partir de ese momento, todas las cotizaciones nuevas tomarán el formato `{PREFIJO}-{NNN}` con numeración correlativa y autoincremental.

### Reglas de negocio
- El prefijo es alfanumérico, máximo 10 caracteres.
- El sistema nunca reutiliza un folio, incluso si una cotización es eliminada.
- El admin puede cambiar el prefijo en cualquier momento; la numeración continúa desde el último número usado.

---

## UC-C03: Crear una Cotización

**Actor principal:** Vendedor (o Administrador)
**Precondición:** Debe existir al menos un producto en el catálogo y un cliente registrado.

### Flujo principal

1. El vendedor accede al módulo de **Cotizaciones** y presiona **Nueva Cotización**.
2. El sistema genera automáticamente el folio (`KV-001`, `KV-002`…) y registra la fecha de creación.
3. El vendedor completa el encabezado de la cotización:

| Campo | Tipo | Requerido |
|---|---|---|
| Cliente | Búsqueda por nombre o RFC | Sí |
| Vendedor asignado | Selector del catálogo de usuarios | Sí |
| Fecha de validez | Selector de fecha | Sí |
| Folio | Automático (solo lectura) | — |

4. El vendedor agrega líneas a la cotización. Cada línea puede ser:
   - Un **producto del inventario** (UC-C04)
   - Un **concepto personalizado de servicio** (UC-C05)

5. El vendedor revisa el resumen de totales (subtotal, IVA 16%, total).
6. El vendedor edita o confirma las **condiciones de la cotización** (UC-C06).
7. El vendedor guarda la cotización en estado **Borrador**.
8. El vendedor genera el PDF y lo envía al cliente.

### Estados de la cotización

```
Borrador → Enviada → Aprobada → Pedido (descuenta inventario) → Facturada
                   ↘ Rechazada / Vencida
```

- El inventario **no se descuenta** hasta que la cotización pasa al estado **Pedido**.
- Solo el administrador puede cambiar el estado de **Aprobada** a **Pedido**.

---

## UC-C04: Agregar Producto del Inventario a la Cotización

**Actor principal:** Vendedor
**Momento:** Durante la creación o edición de una cotización.

### Flujo principal

1. El vendedor busca el producto por nombre, código o SKU en el buscador de líneas.
2. El sistema carga el producto con sus valores predeterminados (precio de venta calculado, costo de traslado proveedor → bodega).
3. La línea muestra los siguientes campos editables **en contexto de cotización**:

| Campo | Visible en PDF al cliente | Editable en cotización |
|---|---|---|
| Nombre del producto | Sí | No |
| Cantidad | Sí | Sí |
| Precio unitario al cliente | Sí | Sí |
| Costo de envío al cliente | Sí (si > 0) | Sí |
| Días de entrega | Sí | Sí |
| Utilidad aplicada (% o MXN) | **No** | Sí |
| Margen real de esta línea | **No** | Solo lectura |
| Subtotal de línea | Sí | Solo lectura |

4. El vendedor ajusta los valores según el contexto de la venta (cliente, volumen, urgencia).
5. Los totales de la cotización se recalculan en tiempo real.

### Campo: Días de entrega
- Texto libre con nota (ej. `"En stock — entrega inmediata"`, `"45 días hábiles por importación"`, `"Sujeto a disponibilidad"`).
- No es un número calculado; es una nota informativa por producto que aparece en el documento de cotización.

### Reglas de negocio
- El costo de envío al cliente es opcional por producto. Si no aplica, no aparece en el PDF.
- Modificar la utilidad en la cotización **no modifica** la configuración base del producto en el catálogo. Es un ajuste local a esa cotización.
- El precio unitario al cliente puede editarse directamente; el sistema recalcula la utilidad resultante automáticamente.

---

## UC-C05: Agregar Concepto Personalizado (Servicio o Partida a Medida)

**Actor principal:** Vendedor
**Momento:** Durante la creación o edición de una cotización.

### Flujo principal

1. El vendedor presiona **+ Agregar concepto personalizado** en la lista de líneas.
2. El sistema abre un **panel lateral deslizante** con el formulario del concepto personalizado.
3. El vendedor llena los campos:

| Campo | Tipo | Requerido | Visible en PDF |
|---|---|---|---|
| Descripción del concepto | Texto libre | Sí | Sí |
| Cantidad | Número | Sí | Sí |
| Precio unitario | MXN | Sí | Sí |
| Unidad (pieza, hora, servicio, etc.) | Texto libre | No | Sí |
| Días de entrega / plazo | Texto libre | No | Sí |
| Nota interna | Texto libre | No | **No** |

4. El vendedor guarda el concepto. Aparece como una línea más en la cotización, visualmente diferenciada de los productos de inventario (ej. con etiqueta `Servicio`).
5. El concepto personalizado **no descuenta inventario** al convertirse en pedido.

### Reglas de negocio
- No se requiere código de producto ni clave de inventario; es una partida libre.
- La nota interna solo la ve el equipo de Kitchen Valenzuela, nunca el cliente.
- El concepto personalizado sí aplica IVA 16% igual que los productos, salvo que se marque explícitamente como exento.

---

## UC-C06: Editar Condiciones de la Cotización

**Actor principal:** Vendedor
**Momento:** Al finalizar la cotización, antes de generar el PDF.

### Flujo principal

1. Al crear una nueva cotización, el sistema pre-carga un bloque de **condiciones estándar** configuradas por el administrador (ej. vigencia, forma de pago, política de cancelación, garantías).
2. El vendedor revisa el texto en un editor de texto enriquecido (o campo de texto grande).
3. El vendedor puede editar, agregar o eliminar párrafos según el caso específico del cliente.
4. Los cambios aplican **solo a esa cotización**; las condiciones estándar del sistema no se modifican.

### Gestión de condiciones estándar (Admin)
- El admin puede configurar en **Configuración → Cotizaciones** un bloque de condiciones predeterminadas que se precargarán en cada nueva cotización.
- Puede definir múltiples bloques o leyendas como "plantillas de condiciones" para diferentes tipos de venta.

---

## UC-C07: Convertir Cotización Aprobada en Pedido

**Actor principal:** Administrador
**Precondición:** La cotización debe estar en estado **Aprobada**.

### Flujo principal

1. El administrador abre la cotización aprobada.
2. Presiona **Convertir en Pedido**.
3. El sistema valida que todos los productos de inventario tengan stock suficiente.
4. Si hay stock: el sistema descuenta las cantidades del inventario central y cambia el estado a **Pedido**.
5. El sistema habilita el botón de **Generar Factura CFDI 4.0** (módulo Facturama).

### Flujo alterno — Stock insuficiente
- Si uno o más productos no tienen stock suficiente, el sistema muestra una alerta indicando cuáles productos tienen problema y cuántas unidades faltan.
- El administrador puede: (a) proceder de todas formas dejando el inventario en negativo con una advertencia registrada, o (b) cancelar y ajustar la cotización.

### Reglas de negocio
- Los conceptos personalizados (servicios) no afectan el inventario al convertirse en pedido.
- El descuento de inventario es atómico: o se descuentan todos los productos o ninguno (no descuentos parciales silenciosos).
- Una vez convertida en Pedido, la cotización no puede volver a estado Borrador o Aprobada.

---

## Pendiente de Definir

### Diseño y estructura del documento de cotización

El formato visual del documento que recibe el cliente está **pendiente de diseño**. Una vez definida la estructura, se mapearán los campos dinámicos para la exportación e impresión.

Campos que el PDF debe incluir (mínimo identificado):

**Encabezado**
- Logo de Kitchen Valenzuela
- Folio de cotización
- Fecha de emisión y fecha de validez
- Datos del vendedor asignado

**Datos del cliente**
- Nombre / Razón social
- RFC (si aplica)
- Correo y teléfono

**Tabla de productos/servicios**
- Descripción
- Cantidad y unidad
- Precio unitario
- Costo de envío al cliente (si aplica, por línea)
- Días de entrega (por línea)
- Subtotal de línea

**Totales**
- Subtotal
- IVA 16%
- Total

**Condiciones**
- Bloque de texto editable con leyendas preestablecidas

**Pie de página**
- Datos de contacto de Kitchen Valenzuela
- Aviso de vigencia

> **Acción requerida:** Kitchen Valenzuela debe proveer o aprobar el diseño y estructura del documento de cotización para proceder con la implementación del generador de documentos.
