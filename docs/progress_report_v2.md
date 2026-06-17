# Reporte de Avances — Ecosistema POS Omnicanal
## Kitchen Valenzuela · Folio D-002
**Fecha:** 15 de junio de 2026
**Elaborado por:** Klef Agency

---

## ¿Dónde estamos hoy?

El proyecto avanza en dos frentes simultáneos. En el **Frente B** (nuestra solución directa), el sistema ya es funcional: pueden registrar productos, generar códigos de barras y operar el catálogo. En el **Frente A** (el sistema externo contratado a Caja Soft), hemos documentado múltiples fallas que el tercero debe resolver antes de poder integrarlo.

---

## Lo que ya pueden hacer hoy

Estas son las capacidades disponibles en el sistema que Klef Agency ha construido:

| Capacidad | Estado |
|---|---|
| Registrar y editar productos con categoría, subcategoría y marca | ✅ Disponible |
| Buscar productos con filtro predictivo en listas largas | ✅ Disponible |
| Generar código de barras automático por producto (SVG, sin equipo externo) | ✅ Disponible |
| Escanear productos desde la cámara del dispositivo como alternativa al escáner físico | ✅ Disponible |
| Autoguardado de formularios — nunca pierden un producto a medias | ✅ Disponible |
| Ver métricas del catálogo en tiempo real (total productos, categorías, marcas) | ✅ Disponible |

---

## Lo que viene próximamente

| Módulo | Responsable | Estado |
|---|---|---|
| Flujo de cotizaciones → pedido → descuento de inventario | Klef Agency | 🔄 En desarrollo |
| Facturación CFDI 4.0 automática (Facturama) | Klef Agency | 🔄 Siguiente etapa |
| Integración con kitchencleanvalenzuela.net | Condicionado a Caja Soft | ⏳ En espera |
| Capacitación del equipo (Aisha, Rubén, Dulce) | Klef Agency | 📅 Pendiente de agendar |
| Adquisición de hardware físico (iPad, escáner, etiquetadora Dymo) | Kitchen Valenzuela | 📦 Pendiente del cliente |

---

## Frente A — Sistema externo (kitchencleanvalenzuela.net / Caja Soft)

Este frente no está bajo control de Klef Agency: es el sistema que Kitchen Valenzuela contrató directamente a un tercero. Nuestro rol aquí es dar seguimiento, documentar fallas y presionar para que lo entreguen completo.

**Fallas documentadas por Dulce entre el 4 y 11 de junio:**

- **Alta de productos:** el sistema no permitía guardar artículos sin dar mensajes de error claros. Se reportó el 4 de junio; quedó parcialmente resuelto el 5 de junio con un workaround (limpiar caché y volver a capturar desde cero).
- **Campo Subcategoría:** en ocasiones no carga opciones disponibles, bloqueando el alta de productos.
- **Módulo de cotizaciones:** al escribir el nombre de un producto para buscarlo, aparece una ventana de error que impide la selección. Reportado el 10 de junio; pendiente de resolución por Caja Soft.
- **Descarga de cotizaciones en PDF:** arroja error al intentar exportar. Reportado el 11 de junio; pendiente de revisión por Caja Soft.
- **Alta de clientes:** falla al guardar el registro aunque el campo de correo acepta la escritura. Pendiente de respuesta.

> **Nota importante:** Mientras estas fallas no sean corregidas por Caja Soft, la integración entre ambos sistemas no puede realizarse. Klef Agency tiene documentadas todas las incidencias y está en contacto activo con el equipo del Ing. Mike Palomera para su resolución.

---

## Frente B — Sistema Klef Agency (solución directa)

Este es el software que Klef Agency está construyendo y entregando. A continuación el detalle técnico para referencia del equipo.

### Completado

**Gestión de catálogo y taxonomía**
Creación, edición y eliminación de categorías, subcategorías y marcas desde el panel de administración. Al crear un elemento nuevo, el panel se cierra automáticamente y el valor queda seleccionado de inmediato — sin pasos extra.

**Generación de códigos de barras (SVG nativo)**
Cada producto genera automáticamente su código de barras en formato Code 128, directamente en el sistema sin depender de servicios externos. Listo para imprimir en etiquetas físicas una vez que se adquiera la etiquetadora Dymo.

**Escáner auxiliar por cámara**
Si no se cuenta con el escáner físico bluetooth, el sistema permite leer códigos de barras usando la cámara del dispositivo (tablet, computadora o celular). Esto garantiza que la operación no se detenga por falta de hardware.

**Autoguardado de formularios**
El sistema guarda automáticamente el avance del formulario de productos mientras se captura. Si se cierra la ventana o se pierde la conexión, los datos se recuperan al volver a abrir el formulario.

**Selectores inteligentes con búsqueda**
Las listas de categorías, subcategorías y marcas incluyen un buscador predictivo para catálogos largos, con desplazamiento correcto en pantallas táctiles.

**Métricas del catálogo en tiempo real**
El panel muestra en todo momento el total de productos, categorías, subcategorías y marcas registradas, actualizándose automáticamente con cada cambio.

### En desarrollo

**Módulo de cotizaciones**
Permitirá generar una cotización formal con folio, código de barras de seguimiento, tiempos de entrega por producto (inmediato o pedido especial), exportación en PDF y envío por correo. Al ser aprobada por el cliente, se convierte automáticamente en pedido y descuenta el inventario.

**Facturación CFDI 4.0**
Una vez aprobado el pedido y registrado el pago, el sistema generará automáticamente la factura electrónica a través de Facturama con los datos fiscales del cliente (RFC, régimen fiscal, uso de CFDI).

### Pendiente de acción del cliente

**Hardware físico**
Para habilitar la impresión de etiquetas y el escaneo físico en mostrador, Kitchen Valenzuela necesita adquirir:
- iPad o Tablet compatible
- Escáner de códigos de barras Bluetooth
- Etiquetadora Dymo compatible

El software ya está preparado para estos dispositivos. Solo se requiere el hardware para activar estas funciones en su modalidad física.

---

## Próximos pasos

**Klef Agency:**
1. Desarrollar el módulo de cotizaciones con generación de PDF y gestión de estados.
2. Integrar la API de Facturama para timbrado automático de CFDI 4.0.
3. Dar seguimiento a Caja Soft para la resolución de fallas pendientes.
4. Coordinar fecha de capacitación con Aisha, Rubén y Dulce.

**Kitchen Valenzuela:**
1. Gestionar con Caja Soft la resolución de las fallas documentadas — especialmente el módulo de cotizaciones y la descarga de PDF.
2. Confirmar fechas disponibles para la sesión de capacitación.
3. Iniciar proceso de adquisición del hardware físico (iPad, escáner, etiquetadora).
