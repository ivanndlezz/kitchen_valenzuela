# 📝 Especificación de Requisitos de Software (SRS) - IEEE 830
## Ecosistema POS Omnicanal, ERP y CRM (Kitchen Valenzuela)

---

## 1. Introducción

### 1.1 Propósito
Este documento define los requisitos funcionales y de sistema para el **Ecosistema POS Omnicanal (Frente B)** de Kitchen Valenzuela. Se enfoca en detallar los **Casos de Uso** principales que gobiernan el sistema para la administración de inventarios, cotizaciones, facturación CFDI 4.0 y el manejo de clientes, sirviendo como guía de desarrollo y aceptación de software.

### 1.2 Alcance del Sistema
El sistema actúa como un punto de venta híbrido (POS), planificador de recursos empresariales básico (ERP) y gestor de relaciones con clientes (CRM). Centraliza el inventario utilizando una arquitectura en la nube (Airtable / Shopify / Shum API) y proporciona interfaces adaptadas a dispositivos móviles y de escritorio.

### 1.3 Referencias
- Propuesta de Ecosistema POS Omnicanal (Folio: [D-002](file:///Users/a74525/Documents/sites/kitchen_valenzuela/pos-kitchen-v-d002.md))
- Reporte de Avances Actualizado ([progress_report.md](file:///Users/a74525/Documents/sites/kitchen_valenzuela/progress_report.md))

---

## 2. Descripción General

### 2.1 Perspectiva del Producto
El software interactúa con un middleware proxy (API SHUM) para persistir datos en Airtable de forma local y remota. Soporta operaciones sin hardware especializado (gracias a lectores virtuales de cámara) y se integra con Facturama para la facturación electrónica.

### 2.2 Actores del Sistema
- **Cajero / Vendedor (POS User)**: Realiza consultas de stock, inicia cotizaciones, registra clientes y escanea códigos.
- **Administrador / Contralor (ERP User)**: Gestiona el catálogo, marcas, categorías, precios y visualiza métricas de stock.
- **Cliente (Indirecto)**: Recibe cotizaciones formales por correo y solicita CFDI de sus compras.

---

## 3. Casos de Uso del Sistema

```mermaid
useCaseDiagram
    actor Cajero as "Cajero / Vendedor"
    actor Admin as "Administrador / Contralor"
    
    usecase UC1 as "UC-01: Administrar Catálogo y Taxonomía"
    usecase UC2 as "UC-02: Registrar / Editar Producto"
    usecase UC3 as "UC-03: Generar Código de Barras (Nativo SVG)"
    usecase UC4 as "UC-04: Escanear Producto (Físico / Cámara)"
    usecase UC5 as "UC-05: Crear y Gestionar Cotizaciones"
    usecase UC6 as "UC-06: Registrar Cliente y Datos Fiscales"
    usecase UC7 as "UC-07: Sincronizar Inventario Omnicanal"
    
    Admin --> UC1
    Admin --> UC2
    Cajero --> UC4
    Cajero --> UC5
    Cajero --> UC6
    
    UC2 ..> UC3 : <<include>>
    UC5 ..> UC7 : <<include>>
```

---

### UC-01: Administrar Catálogo y Taxonomía (Categorías, Subcategorías y Marcas)

- **Actor Principal**: Administrador / Contralor
- **Precondiciones**: El usuario debe tener acceso al panel de administración de productos del POS.
- **Flujo Principal**:
  1. El usuario abre el formulario de producto y hace clic en el botón de añadir/editar taxonomías (`+` junto al select).
  2. El sistema despliega el panel lateral `.taxonomy-manager`.
  3. El usuario ingresa el nombre de la nueva categoría, subcategoría o marca y presiona "Guardar".
  4. El sistema valida que el ítem no exista en la lista (evita duplicados con un `Set`).
  5. El sistema persiste el nuevo ítem en la base de datos (Airtable / LocalConfig) y dispara eventos de actualización.
  6. El sistema **cierra automáticamente** el panel lateral, enfoca el select del producto y asigna el ítem recién creado.
- **Flujos Alternos**:
  - *Edición / Renombrado*: El usuario renombra un ítem; el sistema actualiza todos los productos relacionados en cascada y refresca la UI en tiempo real.
  - *Eliminación*: El usuario elimina un ítem; el sistema solicita confirmación y desvincula el elemento en los registros de inventario.

---

### UC-02: Registrar / Editar Producto con Autoguardado

- **Actor Principal**: Administrador / Contralor
- **Precondiciones**: El catálogo debe estar inicializado.
- **Flujo Principal**:
  1. El usuario selecciona "Nuevo Producto" o abre la edición de un artículo existente.
  2. El usuario llena los campos: Nombre, Código, Precio, Stock, Categoria, Subcategoría y Marca.
  3. Durante la edición, el sistema guarda automáticamente los datos localmente como borrador (*autosave draft*) cada cierto intervalo para prevenir pérdidas por desconexión.
  4. El usuario presiona "Guardar".
  5. El sistema realiza una normalización de datos (ej. convierte marcas en objetos residuales a texto plano simple).
  6. El sistema envía los datos limpios a la API.
- **Flujos Alternos**:
  - *Fallo de Red*: Si la API no está disponible, el sistema mantiene el borrador local y lo encola para la sincronización cuando retorne la conexión.

---

### UC-03: Generar Código de Barras (Nativo SVG)

- **Actor Principal**: Administrador / Contralor (Automático por el sistema)
- **Precondiciones**: El producto debe contar con un código único (`Code`).
- **Flujo Principal**:
  1. Durante la carga o visualización de la ficha de un producto, el sistema lee el campo `Code`.
  2. La función `generateBarcodeSVG` calcula los patrones del estándar Code 128.
  3. El sistema genera un string SVG puro que dibuja las barras y espacios equivalentes al código numérico/alfanumérico.
  4. El sistema renderiza el código de barras en el componente de vista y en el drawer de detalle.
- **Flujos Alternos**:
  - *Código Vacío*: Si el producto no tiene código, el sistema oculta el contenedor y sugiere la generación de un código secuencial automático.

---

### UC-04: Escanear Producto (Escáner Físico o Cámara Web de Contingencia)

- **Actor Principal**: Cajero / Vendedor
- **Precondiciones**: El dispositivo debe contar con cámara habilitada o tener el lector físico bluetooth emparejado.
- **Flujo Principal (Físico)**:
  1. El usuario coloca el cursor en la barra de búsqueda del POS.
  2. El usuario gatilla el escáner bluetooth apuntando al producto.
  3. El escáner envía el texto como entrada de teclado (`KeyboardEvent`) y el sistema busca la coincidencia exacta por `Code` o `Barcode` en la base de datos local del POS, agregando el producto al carrito.
- **Flujo de Contingencia (Software / Cámara)**:
  1. Ante la falta de hardware, el cajero pulsa el icono de "Escáner Virtual".
  2. El sistema activa el stream de la cámara web (o solicita subir un archivo de imagen).
  3. El sistema utiliza el API nativo del navegador `BarcodeDetector` (o fallback alternativo) para extraer el valor en tiempo real de la imagen.
  4. Una vez detectado el código, el sistema emite un sonido de confirmación, cierra la cámara y añade el producto coincidente a la orden.

---

### UC-05: Crear y Gestionar Cotizaciones (CRM / ERP Flow)

- **Actor Principal**: Cajero / Vendedor
- **Precondiciones**: El vendedor debe estar logueado y los productos deben tener stock cargado.
- **Flujo Principal**:
  1. El vendedor agrega productos a la ventana de cotización en curso.
  2. El sistema calcula subtotales, IVA (16%), y permite especificar campos como el *tiempo de entrega estimado* por producto (ej. "En Stock" vs "Entrega en 4-6 semanas" para pedidos especiales).
  3. El vendedor asocia la cotización a un cliente registrado en la base de datos (UC-06).
  4. El vendedor pulsa "Generar Cotización".
  5. El sistema asigna un folio único correlativo, genera un código de barras de seguimiento e inicia la persistencia en Airtable/Quotes.
  6. El vendedor descarga el documento en formato PDF formateado o lo envía por correo al cliente.
- **Flujos Alternos**:
  - *Aprobación de Cotización*: Cuando el cliente acepta la cotización, el administrador cambia el estado de "Draft/Cotización" a "Pedido". El sistema descuenta el stock de manera automática del inventario central y habilita la facturación.

---

### UC-06: Registrar Cliente y Datos Fiscales (CRM / Facturación)

- **Actor Principal**: Cajero / Vendedor
- **Precondiciones**: Ninguna.
- **Flujo Principal**:
  1. El vendedor accede al módulo de clientes y presiona "Nuevo Cliente".
  2. El sistema solicita el Nombre/Razón Social, Correo Electrónico y Teléfono.
  3. Para efectos de facturación electrónica mexicana (CFDI 4.0), el sistema solicita obligatoriamente: RFC, Régimen Fiscal, Código Postal del domicilio fiscal, y Uso de CFDI.
  4. El sistema valida la estructura del RFC mediante expresiones regulares.
  5. El vendedor presiona "Registrar".
  6. El sistema guarda la ficha del cliente en Airtable/Clients y la deja disponible para cotizaciones y facturación rápida.

---

### UC-07: Sincronización de Inventario Omnicanal

- **Actor Principal**: Sistema (Automático / Sync Manager)
- **Precondiciones**: Conexión a internet estable.
- **Flujo Principal**:
  1. Al concretar una venta en el POS, autorizar una cotización (UC-05), o recibir un ajuste de stock, el módulo `SyncManager` intercepta el evento.
  2. Se actualizan las tablas internas en memoria y base de datos local del cliente.
  3. El sistema envía una petición asíncrona hacia Airtable (a través del PHP proxy) y hacia Shopify (mediante webhooks/API).
  4. Los canales web (Shopify Online / Tienda) reciben la actualización e igualan el stock de inmediato.
- **Flujos Alternos**:
  - *Conflicto de Edición Simultánea*: Si dos terminales editan el stock al mismo tiempo, el backend de sincronización aplica la regla de *última escritura válida* o arroja una alerta de concurrencia (`OptimisticLockException`) guardando el log de auditoría.

---

## 4. Requisitos de Rendimiento e Interfaz

### 4.1 Requisitos de Interfaz de Usuario
- El panel de productos y el punto de venta deben ser 100% responsivos (adaptados a iPads/Tablets de 10 pulgadas).
- Las listas desplegables largas (categorías/marcas) deben incorporar un buscador predictivo nativo en el combo y un `padding-bottom` adecuado de 40px para garantizar la usabilidad en pantallas táctiles.

### 4.2 Restricciones
- La velocidad de guardado y carga no debe depender exclusivamente de la velocidad de respuesta de las APIs de terceros (Airtable/Shopify); el POS debe renderizar de inmediato y sincronizar en background siempre que sea viable.
