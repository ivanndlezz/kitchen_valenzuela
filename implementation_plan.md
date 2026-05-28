# Plan de Implementación: Inventario Persistente Creado por Escaneo

Este plan detalla los cambios necesarios para convertir la interfaz del catálogo e inventario de Kitchen Valenzuela en una herramienta autogestionada localmente (sin cargar datos JSON iniciales de servidor) y que permite registrar nuevos equipos industriales escaneando códigos de barras y completando sus datos mediante un formulario interactivo integrado en el panel lateral (drawer).

## Resumen del Flujo de Usuario
1. **Punto de Entrada**: Al entrar, si no hay productos registrados en el `localStorage`, el catálogo muestra un estado vacío con una ilustración/diseño premium invitando a escanear. En el header también se añade el botón **[Escanear Código]**.
2. **Escaneo del Código**: Al hacer clic en escanear, se abre un modal flotante con pestañas:
   - **Modo Foto (System)**: Permite tomar una foto con la cámara del dispositivo o subir una imagen de la galería.
   - **Modo Video (Apple)**: Permite iniciar una transmisión en vivo para detectar códigos de barras usando la webcam / cámara trasera.
3. **Registro Automático**: Una vez que se detecta un código (ej. `Freidora-123` o `56.00.562`):
   - Si ya existe en `localStorage`, se abre el drawer con sus detalles actuales.
   - Si no existe, se crea un objeto de producto vacío con valores por defecto y el código detectado, se guarda en el `localStorage` de inmediato y se añade al catálogo.
4. **Visualización y Edición (Glider Tab)**:
   - Se abre el drawer para el producto.
   - En la parte superior del drawer aparece un control de pestañas: `[Producto | Editar]`.
   - La pestaña **Producto** muestra la ficha técnica tradicional (con su código de barras Code 128 nítido autogenerado).
   - La pestaña **Editar** muestra un formulario para modificar todos los campos técnicos del producto. Al guardar, el catálogo y las métricas se actualizan reactivamente y se persisten en `localStorage`.

---

## Cambios Propuestos

### 1. Interfaz HTML
#### [MODIFY] [index.html](file:///Users/a74525/Documents/sites/kitchen_valenzuela/home/index.html)
- Cargar la biblioteca local de escaneo: `<script src="../shared/utilities/scanning/html5-qrcode.min.js"></script>` antes de `app.js`.
- Añadir el botón de escaneo en la cabecera (junto al botón de cambiar tema).
- Agregar la estructura del modal del escáner dual (`.scanner-modal`) con su scrim, selector de pestañas (Foto vs Video), contenedor para la cámara en vivo y botones de interacción.
- En el drawer (`#detail-drawer`), agregar la cabecera de pestañas glider `.drawer__tabs`:
  ```html
  <div class="drawer__tabs" role="tablist">
    <button class="drawer__tab drawer__tab--active" data-drawer-tab="product" role="tab">Producto</button>
    <button class="drawer__tab" data-drawer-tab="form" role="tab">Formulario</button>
  </div>
  ```
- Separar el cuerpo del drawer (`.drawer__body`) en dos contenedores lógicos que se alternan:
  - `.drawer__view-product` (Ficha técnica).
  - `.drawer__view-form` (Formulario de edición).

---

### 2. Estilos CSS
#### [MODIFY] [app.css](file:///Users/a74525/Documents/sites/kitchen_valenzuela/home/app.css)
- **Modal del Escáner**:
  - Diseñar el overlay centrado `.scanner-modal` con fondo de desenfoque (`backdrop-filter: blur(10px)`), bordes redondeados premium y transiciones de escala.
  - Diseñar la interfaz de pestañas del escáner y el recuadro del lector de cámara en vivo (aspect-ratio cuadrado, bordes estilizados).
- **Glider Tabs del Drawer**:
  - Estilizar `.drawer__tabs` como un control segmentado moderno (estilo píldora/cápsula con fondo oscuro translúcido y acento dorado o azul al estar activo).
- **Formulario de Edición**:
  - Estilos de inputs, selects, textareas enfocados en accesibilidad y estética premium.
  - Estados activos, focus con glow sutil en el color de acento.
  - Botones de acción alineados con el sistema de diseño BEM.
- **Empty State**:
  - Mejorar el diseño del catálogo vacío para incluir una ilustración de un código de barras y un botón destacado para escanear el primer artículo.

---

### 3. Lógica JavaScript
#### [MODIFY] [app.js](file:///Users/a74525/Documents/sites/kitchen_valenzuela/home/app.js)
- **Carga de Datos**:
  - Reemplazar la petición `fetchCatalogData` por la lectura directa de `localStorage.getItem("kv-catalog-products")`. Si está vacío, inicializar con `[]`.
- **Motor de Persistencia**:
  - Crear funciones `saveProductsToStorage()` para centralizar los guardados automáticos.
- **Controlador del Escáner**:
  - Integrar el código estructurado en clases de `scanner_foto_pro.html` adaptado para ejecutarse dentro del shell principal:
    - `TabController` para alternar entre Foto y Video.
    - `Html5QrcodeStrategy` y `BarcodeDetectorStrategy` para procesar fotos.
    - `VideoScanController` para la cámara web activa.
  - Cuando se detecte exitosamente un código de barras:
    - Buscar si el SKU ya existe. Si no, insertar el producto nuevo con valores por defecto.
    - Cerrar el modal del escáner.
    - Abrir el drawer de detalles del producto recién escaneado.
- **Glider Tabs en el Drawer**:
  - Escuchar clics en `.drawer__tab`. Alternar las clases activas e intercambiar la visualización entre la ficha técnica y el formulario de edición.
- **Formulario de Edición de Producto**:
  - Generar el formulario dinámicamente o capturar sus eventos.
  - Campos a editar basados en la estructura del JSON:
    - Nombre, Marca, Categoría (Select: Cocción, Refacciones, Limpieza, Otros), Unidad, Costo, Precio, Cantidad de Alerta, Cantidad (Stock), y campos personalizados (Ubicación, Notas, Especificaciones adicionales).
  - Al dar clic en "Guardar":
    - Actualizar el objeto en `AppState.products`.
    - Persistir en `localStorage`.
    - Recalcular marcas únicas (para actualizar el filtro desplegable de marcas).
    - Recalcular analíticas del Dashboard (Equipos totales, Unidades totales, Alertas de Stock, Marcas).
    - Regenerar el catálogo de productos y mostrar un Toast exitoso.
    - Cambiar de regreso a la pestaña de "Producto" para visualizar los cambios aplicados en la ficha técnica (incluyendo el SVG de código de barras Code 128).

---

## Plan de Verificación

### Pruebas Manuales
1. **Carga Inicial**:
   - Abrir la página con `localStorage` limpio. Confirmar que el catálogo se visualiza vacío, que el dashboard marca todos los valores en `0` y que se muestra el estado vacío interactivo.
2. **Escaneo con Foto**:
   - Hacer clic en "Escanear Código".
   - Subir una imagen con un código de barras de muestra.
   - Confirmar que detecta el SKU, añade el artículo al catálogo con stock inicial, y abre el drawer inmediatamente.
3. **Escaneo con Cámara (Video)**:
   - Alternar a la pestaña "Apple (Video)", iniciar cámara y probar con un código real (si aplica en un dispositivo físico) o cancelar para cerrar de forma segura.
4. **Formulario de Edición**:
   - En el drawer, cambiar a la pestaña "Editar".
   - Modificar el nombre a "Horno Industrial de Convección", marca "RATIONAL", precio a "15000" y cantidad a "5".
   - Guardar y verificar que:
     - El drawer vuelve a la pestaña "Producto" y renderiza el nuevo nombre, marca, precio y cantidad.
     - El código de barras Code 128 se actualiza de forma nítida.
     - El catálogo muestra la tarjeta del producto actualizada.
     - El dashboard de métricas se actualiza reactivamente (1 Equipo, 5 unidades en total, 1 marca).
5. **Persistencia**:
   - Recargar la página del navegador. Confirmar que el producto creado sigue existiendo en el catálogo con los datos guardados.
