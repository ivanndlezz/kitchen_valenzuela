# Hallazgos de Scope — Sistema POS/ERP Kitchen Valenzuela

**Proyecto:** Ecosistema POS Omnicanal · Folio D-002
**Elaborado por:** Klef Agency
**Última actualización:** 16 de junio de 2026

---

## Índice de Hallazgos (este documento)

| # | Hallazgo | Módulo afectado | Estado |
|---|---|---|---|
| 02 | Tres tipos de "envío" tratados como un solo concepto | Formulario de producto / Cotizaciones / Tienda web | 🔴 Identificado |
| 03 | Configuraciones de tienda web mezcladas dentro del formulario de inventario | Formulario de producto (Paso 7) / Side sheet | 🔴 Identificado |

---

## Hallazgo 02 — Tres Tipos de "Envío" Mezclados como un Solo Concepto

### Estado actual

El sistema utiliza el término "costo de envío" para referirse a tres realidades completamente distintas en naturaleza, momento, actor responsable y visibilidad:

**Tipo A — Flete proveedor → bodega**
Aparece en el modelo de precios de `cotizaciones_casos_de_uso.md` como:
```
Costo del producto
+ Costo de envío proveedor → bodega (flete interno)
= Costo base
```
Es un costo de adquisición interno. No lo ve el cliente. Entra al cálculo del costo base del producto y, por tanto, afecta la utilidad y el precio de venta sugerido.

**Tipo B — Costo de envío al cliente en cotización**
También aparece en el modelo de precios como:
```
Precio de venta sugerido
+ Costo de envío al cliente (por producto, si aplica)
= Precio final al cliente en cotización
```
Es un cargo por producto, editable por el vendedor al momento de cotizar. Sí es visible para el cliente en el documento de cotización. Puede variar entre cotizaciones del mismo producto.

**Tipo C — Costo de envío preset para tienda web**
Es un valor preestablecido en la configuración del producto, orientado exclusivamente al canal de ecommerce (tienda en línea). Define el costo de envío que se muestra o aplica cuando un cliente compra ese producto en la página web. Su naturaleza es de configuración de canal, no de logística interna ni de negociación comercial.

Los tres tipos comparten nombre informal ("costo de envío") pero tienen actores, momentos y efectos completamente distintos:

| | Tipo A — Traslado proveedor→bodega | Tipo B — Envío al cliente (cotización) | Tipo C — Envío preset (web) |
|---|---|---|---|
| **Actor** | Administrador | Vendedor | Administrador |
| **Momento** | Alta/edición de producto | Creación de cotización | Configuración web del producto |
| **Visible al cliente** | No | Sí (en cotización) | Sí (en tienda en línea) |
| **Varía por venta** | No | Sí | No (es preset) |
| **Afecta inventario** | No | No | No |
| **Canal** | Interno / POS | Cotizaciones | Ecommerce |

### Evidencia en Airtable — campos ya existentes

El schema del registro de producto en Airtable confirma que **dos de los tres tipos ya tienen campo propio**, pero bajo nombres que no reflejan su naturaleza y sin documentación que los distinga:

```json
{
  "traslado": 1,
  "envio_web": 1,
  "envio_recepcion": 1
}
```

| Campo en Airtable | Tipo identificado | Observación |
|---|---|---|
| `traslado` | Tipo A — Costo de traslado proveedor→bodega | ✅ Existe. Nombre aceptable pero sin label claro en el formulario. |
| `envio_web` | Tipo C — Envío preset para ecommerce | ✅ Existe. Confirma que el concepto estaba previsto; actualmente sin ubicación en la UI. |
| `envio_recepcion` | **Deprecated — eliminar** | Campo huérfano sin uso activo identificado. Debe eliminarse del schema de Airtable y de cualquier referencia en el formulario o lógica del sistema. |
| *(no existe)* | Tipo B — Costo de envío al cliente en cotización | Correcto que no exista aquí: es un valor de línea en la cotización, no del producto. |

El Tipo B (envío al cliente en cotización) **no aparece** en el registro de producto — lo cual es arquitectónicamente correcto, ya que ese valor pertenece a la línea de cotización, no al catálogo.

Los toggles de publicación web también están presentes y confirman el Hallazgo 03:
```json
{
  "Ocultar en POS": true,
  "Ocultar en tienda": true,
  "Mostrar en página de inicio": true
}
```
Estos campos existen en Airtable con los nombres correctos; el problema es únicamente su ubicación en la UI (ver Hallazgo 03).

### Por qué es un problema de scope

Tratar los tres como el mismo concepto genera ambigüedad en la interfaz, en el modelo de datos y en la lógica de cálculo. Un vendedor que edita el "costo de envío" en una cotización no debería poder modificar el flete del proveedor ni afectar la configuración de la tienda web. Si los tres comparten el mismo campo o etiqueta, no queda claro qué se está editando ni en qué contexto.

Adicionalmente, el Tipo C no tiene ubicación definida en la arquitectura actual — lo que significa que, en algún momento, alguien podría ubicarlo en el formulario de inventario junto al Tipo A, perpetuando la confusión.

### Solución propuesta

**1. Renombrar para eliminar ambigüedad**

| Anterior | Nuevo nombre | Contexto |
|---|---|---|
| "Costo de envío proveedor → bodega" | **Costo de traslado** *(Envío del proveedor a bodega)* | Formulario de producto — Paso 3 (Precios) o Paso 5 (Logística) |
| "Costo de envío al cliente" | **Costo de envío al cliente** | Módulo de cotizaciones — por línea de producto |
| *(sin nombre definido)* | **Envío en tienda** *(Configuración de envío para ecommerce)* | Tab "Web" del side sheet (ver Hallazgo 03) |

**2. Separar los campos en el modelo de datos**

Cada tipo debe tener su propio campo nombrado en el registro del producto en Airtable, sin reutilizar nombres ni campos entre sí.

**3. El Tipo C (preset web) vive exclusivamente en el Tab "Web"**

Su lugar natural es la configuración web del producto (ver Hallazgo 03), no el formulario de inventario. No debe aparecer en el paso de Logística ni en ningún paso del formulario de alta de producto orientado al POS.

### Impacto en módulos

| Módulo | Impacto |
|---|---|
| Formulario de producto — Paso 3 o 5 | Renombrar campo a "Costo de traslado" con sublabel explicativo |
| Modelo de precios (cotizaciones) | Renombrar a "Costo de envío al cliente" en contexto de cotización |
| Tab "Web" (nuevo) | Alojar configuración de "Envío en tienda" para ecommerce |
| Modelo de datos Airtable | Tres campos distintos, sin nombre compartido |
| Documentación interna | Actualizar `cotizaciones_casos_de_uso.md` con nomenclatura unificada |

---

## Hallazgo 03 — Configuraciones de Tienda Web Mezcladas en el Formulario de Inventario

### Estado actual

El Paso 7 (Medios & Visibilidad) del formulario de alta de producto mezcla dos grupos de configuración con naturalezas completamente distintas:

**Grupo A — Imágenes del producto**
```html
<div class="field">
  <label>Imagen principal</label>
  <div class="upload">...</div>
</div>
<div class="field">
  <label>Galería</label>
  <div class="upload">...</div>
</div>
```
Neutral en cuanto a canal. Las imágenes son del producto, no de un canal específico. Aplican tanto para el POS, las cotizaciones y la tienda web.

**Grupo B — Toggles de publicación web**
```html
<div class="divider">Publicación</div>
<div class="toggle-row">
  <strong>Mostrar en página de inicio</strong>
  <small>Aparece en sección destacados</small>
  <input type="checkbox" name="featured" value="1">
</div>
<div class="toggle-row">
  <strong>Ocultar en POS</strong>
  <small>No aparece en ventas de mostrador</small>
  <input type="checkbox" name="hide_pos" value="1">
</div>
<div class="toggle-row">
  <strong>Ocultar en tienda</strong>
  <small>Producto privado, no público</small>
  <input type="checkbox" name="hide" value="1">
</div>
```
Estos tres toggles son configuración exclusiva del canal web/ecommerce. `featured`, `hide` y `hide_pos` son conceptos que solo tienen sentido en el contexto de la tienda en línea o del POS como canal de venta, no en el contexto de dar de alta un producto en el inventario.

### Evidencia en Airtable — campos ya existentes

Los tres toggles de publicación web ya tienen campo propio en Airtable con nombres en español:

```json
{
  "Ocultar en POS": true,
  "Ocultar en tienda": true,
  "Mostrar en página de inicio": true
}
```

El campo `envio_web` también existe (ver Hallazgo 02). Esto confirma que **la estructura de datos ya está correctamente separada** — el problema es exclusivamente de ubicación en la UI: estos campos web están siendo capturados dentro del formulario de inventario en lugar de hacerlo desde el Tab "Web".

### Por qué es un problema de scope

El formulario de alta de producto existe para registrar un producto en el inventario: su identidad, clasificación, precios, existencias y logística. Es un formulario orientado al POS y al catálogo interno.

Mezclar dentro de ese formulario controles que gobiernan cómo se publica ese producto en la tienda web rompe el principio de responsabilidad única del formulario. Quien da de alta un producto en el inventario (típicamente el administrador de catálogo) no debería necesitar tomar decisiones sobre la tienda web en ese mismo momento — son decisiones de canal que pueden hacerse después, en otro momento y posiblemente por otro actor.

Además, a medida que la tienda web crezca en configuraciones (SEO, precio web, envío en tienda, estado de publicación por canal, variantes), ese bloque de "Publicación" dentro del Paso 7 se volvería insostenible.

El side sheet del producto ya tiene la infraestructura de navegación para resolver esto: actualmente opera con dos vistas (`Resumen` / `Editar`), lo que lo convierte en un switch booleano. Agregar un tercer Tab resuelve el problema sin reestructurar el formulario de inventario.

### Solución propuesta

**1. Agregar Tab "Web" al side sheet del producto**

El switch actual de dos vistas:
```html
<span class="view-switch__btn" data-view="general">Resumen</span>
<span class="view-switch__btn" data-view="advanced">Editar</span>
```

Se extiende a tres:
```html
<span class="view-switch__btn" data-view="general">Resumen</span>
<span class="view-switch__btn" data-view="advanced">Editar</span>
<span class="view-switch__btn" data-view="web">Web</span>
```

El Tab "Web" aloja exclusivamente configuraciones del canal ecommerce. El componente deja de ser un toggle booleano y pasa a ser una navegación de tres estados.

**2. Reubicar los toggles de publicación al Tab "Web"**

Los campos `featured`, `hide` y `hide_pos` salen del Paso 7 del formulario de inventario y pasan al Tab "Web". El Paso 7 queda únicamente con el grupo de imágenes, renombrado a **"Medios"** (eliminando "& Visibilidad" del título, que ya no aplica en ese contexto).

**3. Contenido inicial del Tab "Web"**

El Tab "Web" concentra todas las configuraciones orientadas al canal ecommerce:

| Campo | Descripción |
|---|---|
| Estado de publicación | Publicado / Borrador / Oculto |
| Mostrar en página de inicio | Aparece en sección destacados |
| Ocultar en tienda | Producto privado, no visible al público |
| Ocultar en POS | No aparece en ventas de mostrador |
| Envío en tienda | Costo de envío preset para ecommerce (ver Hallazgo 02, Tipo C) |
| *(futuro)* Descripción SEO | Meta descripción para buscadores |
| *(futuro)* URL amigable (slug) | Ruta del producto en la tienda |
| *(futuro)* Variantes web | Configuración de variantes para ecommerce |

**4. El Tab "Web" solo es relevante si la tienda web está activa**

Si Kitchen Valenzuela no tiene tienda en línea activa, el Tab "Web" puede ocultarse o mostrarse deshabilitado, sin afectar el formulario de inventario.

### Impacto en módulos

| Módulo | Impacto |
|---|---|
| Side sheet del producto | Agregar tercer Tab "Web"; convertir switch booleano a navegación de 3 estados |
| Paso 7 — Medios & Visibilidad | Eliminar sección "Publicación"; renombrar a "Medios" |
| Tab "Web" (nuevo) | Alojar `featured`, `hide`, `hide_pos`, envío en tienda y futuras configs de ecommerce |
| Modelo de datos Airtable | Asegurar que los campos web estén separados de los campos de inventario |
| Documentación | Actualizar referencia cruzada con Hallazgo 02 (Tipo C vive aquí) |

---

## Hallazgo 04 — Flujo de Campos Personalizados Incorrecto (Paso 8)

### Estado actual

El Paso 8 (Campos personalizados) presenta 6 inputs de texto planos y estáticos, organizados en un grid:

```html
<div class="grid-3">
  <div class="field">
    <label>Campo 1 <span class="hint">cf1</span></label>
    <input type="text" name="cf1" placeholder="Valor">
  </div>
  <!-- ...hasta Campo 6 -->
</div>
```

Adicionalmente, el paso incluye un botón `btn-done` ("Marcar como completo"), igual que el resto de los pasos del formulario.

El modelo de datos en Airtable contempla 12 fields para estos campos — 2 por slot:

| Slot | Campo nombre | Campo valor |
|---|---|---|
| 1 | `cf1_name` | `cf1_data` |
| 2 | `cf2_name` | `cf2_data` |
| 3 | `cf3_name` | `cf3_data` |
| 4 | `cf4_name` | `cf4_data` |
| 5 | `cf5_name` | `cf5_data` |
| 6 | `cf6_name` | `cf6_data` |

`cf{n}_name` es la etiqueta del campo personalizado (definida por el usuario). `cf{n}_data` es el valor de ese campo. La implementación actual solo captura un valor (`cf{n}`) por slot, ignorando completamente el campo de nombre — lo que hace que todos los campos personalizados aparezcan sin etiqueta propia en el sistema.

### Por qué es un problema de scope

Hay dos problemas distintos:

**1. El modelo de datos no se está respetando.** Cada slot tiene nombre + valor (`cf{n}_name` + `cf{n}_data`). La UI actual solo captura el valor, dejando el nombre vacío. Esto hace que los campos personalizados sean inútiles como atributos identificables del producto.

**2. El paso 8 no es opcional.** El botón "Marcar como completo" y la lógica de progreso del formulario tratan los campos personalizados como un paso obligatorio a completar, igual que Nombre, Categoría o Precio. Los campos personalizados son, por definición, opcionales — el propio nombre lo indica. No todos los productos los necesitan, y forzar al usuario a "completar" este paso genera fricción innecesaria y contamina el indicador de progreso.

**3. El modelo de interacción es incorrecto.** Mostrar 6 inputs vacíos desde el inicio no comunica que son opcionales ni cuántos están disponibles. El usuario no sabe si debe llenarlos todos, cuántos puede usar, ni qué tipo de información va en cada uno.

### Solución propuesta

**1. Eliminar el botón `btn-done` del Paso 8**

El paso de campos personalizados no participa en el progreso del formulario ni tiene estado de "completo". Es un área de atributos opcionales que puede estar vacía sin que eso afecte la validez del producto.

**2. Reemplazar los 6 inputs fijos por un sistema de slots dinámicos**

**Estado vacío del paso:**
```
[ + Agregar campo personalizado ]        6 slots disponibles
```

Un pill button como única UI visible cuando no hay campos agregados. Un contador de slots a la derecha indica la disponibilidad total.

**Al presionar el pill button:**
Se abre un panel (side sheet del sistema o mini-panel local dentro del step) con dos campos:

- **Nombre del campo** — no como `<input>` convencional con borde de caja, sino como texto editable estilo `contenteditable` con línea de subrayado, comunicando que es una etiqueta que el usuario define libremente (ej. `________________________`).
- **Valor** — input estándar debajo del nombre.

**Al guardar:**
El slot queda ocupado y se renderiza como una tarjeta o chip dentro del paso, mostrando el nombre del campo como etiqueta y el valor debajo. El contador descuenta: `5 slots disponibles`.

Cada slot ocupado tiene acción de editar (reabre el panel con los datos) y eliminar (libera el slot, contador sube).

**Al llegar a 6 slots ocupados:**
El pill button se deshabilita visualmente. No se pueden agregar más campos.

**3. Mapeo correcto al modelo de datos**

Cada slot ocupa el siguiente par disponible en orden (`cf1_name`/`cf1_data`, luego `cf2_name`/`cf2_data`, etc.). El sistema asigna el número de slot internamente — el usuario nunca ve `cf1`, `cf2`; solo ve sus etiquetas y valores.

### Evidencia en Airtable

Los 12 campos ya existen en el schema:

```json
{
  "cf1_name": "1", "cf1_data": "1",
  "cf2_name": "1", "cf2_data": "1",
  "cf3_name": "1", "cf3_data": "1",
  "cf4_name": "1", "cf4_data": "1",
  "cf5_name": "1", "cf5_data": "1",
  "cf6_name": "1", "cf6_data": "1"
}
```

El modelo de datos está completo y correcto. El problema es únicamente de UI y de lógica de formulario.

### Impacto en módulos

| Módulo | Impacto |
|---|---|
| Formulario de producto — Paso 8 | Eliminar `btn-done`; reemplazar 6 inputs fijos por sistema de slots dinámicos |
| Lógica de progreso del formulario | Excluir Paso 8 del cálculo de progreso y del flujo de "marcar como completo" |
| Step pills (navegación) | Evaluar si el Paso 8 debe aparecer con indicador de completado o simplemente como paso opcional sin estado |
| Modelo de datos Airtable | Sin cambios — los 12 campos ya existen y son correctos |
