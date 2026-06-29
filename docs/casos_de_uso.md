# Casos de Uso Generales

## Kitchen Valenzuela - Ecosistema de Inventario, Clientes y Cotizaciones

**Version:** 1.0  
**Fecha:** 29 de junio de 2026  
**Proyecto:** Kitchen Valenzuela  
**Alcance:** Aplicacion principal `inventory/`, backend SHUM API, catalogos, clientes, cotizaciones y sincronizacion.

---

## 1. Contexto

El sistema Kitchen Valenzuela centraliza la operacion comercial y de inventario de equipos industriales. Permite registrar productos, administrar existencias, consultar fichas tecnicas, escanear codigos, mantener clientes, crear cotizaciones y sincronizar la informacion con Airtable mediante un proxy PHP.

El sistema esta disenado como una app web estatica que opera con cache local para velocidad y continuidad, y que sincroniza con servicios remotos cuando hay conexion y credenciales disponibles.

---

## 2. Actores

| Actor | Descripcion |
|---|---|
| Administrador | Configura catalogos, usuarios, roles, almacenes, productos y reglas operativas. |
| Vendedor | Consulta inventario, registra clientes y crea cotizaciones. |
| Operador de inventario | Alta o actualiza productos, existencias, codigos, imagenes y datos tecnicos. |
| Cliente | Recibe cotizaciones y documentos comerciales; no interactua directamente con la app. |
| Sistema SHUM API | Proxy PHP que procesa acciones CRUD hacia Airtable. |
| Airtable | Almacen remoto de productos, cotizaciones y configuraciones. |

---

## 3. Modulos del Sistema

- Inventario y catalogo de productos.
- Formulario y ficha tecnica de producto.
- Escaneo de codigos.
- Clientes.
- Cotizaciones.
- Catalogos administrativos.
- Almacenes y usuario activo.
- Sincronizacion local/remota.
- Backend PHP SHUM API.
- Componentes compartidos.

---

## 4. Casos de Uso

## UC-01: Consultar Inventario

**Actor principal:** Vendedor, Operador de inventario, Administrador  
**Objetivo:** Encontrar productos disponibles y revisar informacion basica de stock, marca, categoria y precio.

### Precondiciones

- La app esta cargada en `inventory/index.html`.
- Existen productos en `localStorage`, en el JSON de respaldo o en Airtable.

### Flujo principal

1. El usuario entra a la pantalla de Inventario.
2. El sistema carga productos desde la fuente prioritaria configurada.
3. El sistema muestra metricas generales: equipos registrados, unidades totales, alertas de stock y marcas.
4. El usuario busca por nombre, SKU, marca, especificaciones o codigo.
5. El usuario filtra por categoria, marca, estado de stock u orden.
6. El sistema actualiza la lista o grid de productos.
7. El usuario abre el detalle de un producto.

### Resultado

El usuario identifica el producto correcto y visualiza su informacion operativa.

---

## UC-02: Registrar Producto Nuevo

**Actor principal:** Operador de inventario, Administrador  
**Objetivo:** Dar de alta un producto con datos comerciales, tecnicos, fiscales, imagen y stock.

### Precondiciones

- El usuario tiene permisos operativos o administrativos.
- Los catalogos requeridos existen o pueden crearse desde el panel de catalogos.

### Flujo principal

1. El usuario presiona la accion de agregar producto.
2. El sistema crea un borrador local.
3. El sistema abre el formulario lateral de producto.
4. El usuario captura nombre, codigo, marca, categoria, subcategoria, unidad, precio, costo, impuestos, imagen, descripcion y especificaciones.
5. El usuario captura existencias generales o por almacen cuando aplica.
6. El sistema valida y normaliza campos de catalogo.
7. El usuario guarda el producto.
8. El sistema persiste localmente y, si procede, sincroniza con Airtable.

### Flujos alternos

- Si la categoria, marca, proveedor o almacen no existe, el usuario puede abrir el administrador de catalogos y agregarlo.
- Si el producto queda incompleto, permanece como borrador.
- Si falla la sincronizacion remota, el registro local conserva los datos para reintento posterior.

### Resultado

El producto queda disponible en el inventario y listo para busqueda, cotizacion o sincronizacion.

---

## UC-03: Editar Producto Existente

**Actor principal:** Operador de inventario, Administrador  
**Objetivo:** Actualizar datos de un producto ya registrado.

### Flujo principal

1. El usuario busca y abre el producto.
2. El sistema muestra la ficha tecnica en un panel lateral.
3. El usuario cambia a la vista de edicion.
4. El usuario actualiza campos de producto, precio, stock, imagen o clasificacion.
5. El sistema recalcula datos derivados cuando corresponde.
6. El usuario guarda.
7. El sistema actualiza la copia local y prepara/sincroniza el cambio remoto.

### Resultado

El inventario refleja la informacion mas reciente del producto.

---

## UC-04: Eliminar Producto

**Actor principal:** Administrador  
**Objetivo:** Retirar un producto del inventario operativo.

### Flujo principal

1. El administrador abre el detalle del producto.
2. Selecciona la accion de eliminar.
3. El sistema solicita confirmacion.
4. El sistema elimina el producto localmente.
5. Si el producto tiene identificador remoto, el sistema intenta eliminar o actualizar su estado en Airtable segun la implementacion disponible.

### Resultado

El producto deja de aparecer en el inventario activo.

---

## UC-05: Escanear Codigo de Barras o QR

**Actor principal:** Vendedor, Operador de inventario  
**Objetivo:** Capturar o localizar productos de forma rapida mediante camara o lector.

### Flujo principal

1. El usuario presiona el boton de escaneo o enfoca un input compatible.
2. El sistema abre el modal de scanner.
3. El usuario elige lectura por foto o video.
4. El sistema detecta el codigo usando la utilidad local de escaneo.
5. El valor detectado se escribe en el campo destino o se usa para buscar producto.
6. El sistema cierra o mantiene el scanner segun el flujo activo.

### Resultado

El codigo queda capturado sin escritura manual.

---

## UC-06: Administrar Clientes

**Actor principal:** Vendedor, Administrador  
**Objetivo:** Mantener un directorio de clientes para cotizaciones y seguimiento comercial.

### Flujo principal

1. El usuario entra a la pantalla de Clientes.
2. El sistema muestra el directorio disponible.
3. El usuario registra un cliente nuevo o abre uno existente.
4. Captura o edita nombre, empresa, RFC, telefono, correo y datos complementarios.
5. El sistema guarda localmente.
6. Si la integracion esta disponible, el sistema sincroniza con Airtable.

### Flujos alternos

- El usuario puede eliminar un cliente localmente.
- El sistema puede ejecutar sincronizacion de clientes en segundo plano al cargar la app.

### Resultado

El cliente queda disponible para ser seleccionado en cotizaciones.

---

## UC-07: Crear Cotizacion

**Actor principal:** Vendedor, Administrador  
**Objetivo:** Crear una propuesta comercial con cliente, productos, precios, condiciones y documento final.

### Precondiciones

- Existen productos en inventario.
- El cliente existe o puede registrarse durante el flujo.

### Flujo principal

1. El usuario entra a Cotizaciones y presiona Nueva Cotizacion.
2. El sistema crea un borrador y asigna un folio.
3. El usuario completa los pasos del flujo:
   - Datos generales.
   - Cliente.
   - Productos o conceptos.
   - Vigencia, vendedor y condiciones.
   - Revision final.
4. El usuario agrega productos desde el inventario.
5. El sistema calcula subtotales, impuestos, envio y total.
6. El usuario confirma o guarda la cotizacion.
7. El sistema permite imprimir, generar vista de documento o compartir informacion comercial.

### Resultado

La cotizacion queda guardada y lista para enviarse al cliente.

---

## UC-08: Agregar Producto a Cotizacion

**Actor principal:** Vendedor  
**Objetivo:** Incorporar articulos reales del inventario a una cotizacion.

### Flujo principal

1. El vendedor busca un producto por nombre, codigo o SKU.
2. El sistema muestra resultados del catalogo.
3. El vendedor selecciona un producto.
4. El sistema agrega una linea con datos base de precio, costo, moneda, utilidad y disponibilidad.
5. El vendedor ajusta cantidad, precio, margen, envio o notas comerciales.
6. El sistema recalcula totales en tiempo real.

### Reglas de negocio

- Agregar un producto a una cotizacion no descuenta inventario de inmediato.
- Los ajustes dentro de la cotizacion no modifican la ficha base del producto.
- El descuento de inventario debe ocurrir en una etapa posterior de pedido/venta, si se habilita ese flujo.

### Resultado

La cotizacion contiene una partida de producto lista para revision.

---

## UC-09: Registrar Cliente Durante Cotizacion

**Actor principal:** Vendedor  
**Objetivo:** Crear un cliente sin abandonar el flujo de cotizacion.

### Flujo principal

1. En el paso de cliente, el vendedor elige registrar nuevo cliente.
2. Captura los datos requeridos.
3. El sistema valida la informacion minima.
4. El sistema guarda el cliente.
5. El sistema selecciona automaticamente el cliente creado en la cotizacion actual.

### Resultado

La cotizacion queda vinculada al nuevo cliente.

---

## UC-10: Duplicar Cotizacion

**Actor principal:** Vendedor, Administrador  
**Objetivo:** Reutilizar una cotizacion anterior como base de una nueva propuesta.

### Flujo principal

1. El usuario abre el listado de cotizaciones.
2. Selecciona la accion de duplicar.
3. El sistema crea una nueva cotizacion con datos copiados.
4. El sistema asigna un nuevo folio.
5. El usuario ajusta cliente, productos, precios, fechas o condiciones.
6. El usuario guarda.

### Resultado

Existe una nueva cotizacion basada en una propuesta anterior, sin sobrescribir la original.

---

## UC-11: Administrar Catalogos

**Actor principal:** Administrador  
**Objetivo:** Mantener listas controladas para clasificacion y operacion.

### Catalogos incluidos

- Categorias.
- Subcategorias.
- Marcas.
- Proveedores.
- Almacenes.
- Usuarios.
- Roles.

### Flujo principal

1. El administrador entra a Catalogos.
2. Selecciona el tipo de catalogo.
3. Crea, edita o elimina un elemento.
4. El sistema guarda la configuracion localmente y/o en Airtable `configs`.
5. El sistema actualiza selectores de formularios relacionados.

### Resultado

Los formularios de producto, filtros y controles usan catalogos actualizados.

---

## UC-12: Conciliar Taxonomia Importada

**Actor principal:** Administrador, Operador de inventario  
**Objetivo:** Resolver valores importados que no coinciden con los catalogos oficiales.

### Flujo principal

1. El sistema detecta un valor importado no definido, como marca o categoria.
2. Muestra una alerta visual en el campo afectado.
3. El usuario elige entre asociar el valor a un catalogo existente o agregarlo como nuevo.
4. El sistema guarda el alias o el nuevo valor.
5. El formulario actualiza los selectores y limpia la alerta.

### Resultado

Los datos importados quedan normalizados sin perder la informacion original.

---

## UC-13: Seleccionar Almacen Activo

**Actor principal:** Operador de inventario, Administrador  
**Objetivo:** Trabajar con una vista o contexto de almacen.

### Flujo principal

1. El usuario abre el selector de almacen en el encabezado.
2. Elige Todos los almacenes o un almacen especifico.
3. El sistema guarda el almacen activo en el estado de la app.
4. Los componentes compatibles usan ese contexto para mostrar o capturar informacion.

### Resultado

El usuario opera con un contexto de almacen claro.

### Nota

El contrato actual de almacenes esta documentado en `docs/almacenes_schema.md`. La distribucion por almacen se conserva localmente cuando existe; Airtable sigue recibiendo el total en el campo `Cantidad`.

---

## UC-14: Seleccionar Usuario Activo

**Actor principal:** Vendedor, Operador, Administrador  
**Objetivo:** Registrar el contexto operativo de quien usa la app.

### Flujo principal

1. El usuario presiona el selector de usuario.
2. El sistema muestra usuarios y roles disponibles.
3. El usuario selecciona su identidad operativa.
4. El sistema guarda usuario y rol activos.
5. La UI puede adaptar etiquetas, permisos visibles o contexto de acciones segun rol.

### Resultado

Las acciones de la sesion quedan asociadas a un usuario activo.

---

## UC-15: Sincronizar Productos con Airtable

**Actor principal:** Administrador, Operador de inventario  
**Objetivo:** Mantener coherencia entre inventario local, JSON de respaldo y Airtable.

### Flujo principal

1. El usuario presiona el boton de sincronizacion.
2. El sistema consulta datos locales, JSON de respaldo y Airtable.
3. El panel comparativo muestra diferencias, registros faltantes o cambios.
4. El usuario decide la accion de sincronizacion disponible.
5. El sistema ejecuta operaciones CRUD mediante SHUM API.
6. El sistema actualiza caches locales y contador de peticiones.

### Flujos alternos

- Si falla Airtable, el sistema mantiene datos locales.
- Si hay conflicto, el usuario debe revisar la comparacion antes de sobrescribir.

### Resultado

Los datos quedan alineados o el sistema informa diferencias pendientes.

---

## UC-16: Sincronizar Cotizaciones

**Actor principal:** Vendedor, Administrador  
**Objetivo:** Respaldar cotizaciones locales en Airtable.

### Flujo principal

1. El usuario crea o edita una cotizacion.
2. El sistema guarda la cotizacion localmente.
3. El usuario ejecuta sincronizacion o el sistema la prepara segun flujo disponible.
4. `SyncManager` usa la configuracion de `quotes` para enviar datos a Airtable.
5. El sistema confirma exito o muestra error.

### Resultado

Las cotizaciones tienen respaldo remoto cuando la integracion esta disponible.

---

## UC-17: Gestionar Backend SHUM API

**Actor principal:** Sistema SHUM API, Administrador tecnico  
**Objetivo:** Procesar operaciones remotas sin exponer credenciales de Airtable en el cliente.

### Flujo principal

1. El cliente web envia una peticion `POST` con `action`, `baseId`, `table` y datos necesarios.
2. El proxy PHP valida parametros.
3. El proxy construye la URL de Airtable.
4. El proxy agrega autenticacion del lado servidor.
5. Airtable responde.
6. El proxy devuelve JSON con `success`, `message` y `data`.
7. La app procesa la respuesta y muestra toast o actualiza UI.

### Resultado

La app puede leer y escribir datos remotos sin manejar tokens en el navegador.

---

## UC-18: Usar Componentes Compartidos

**Actor principal:** Desarrollador  
**Objetivo:** Reutilizar componentes estables entre pantallas y prototipos.

### Flujo principal

1. El desarrollador identifica logica comun de formulario, escaneo o UI.
2. Usa componentes de `shared/` cuando ya existen.
3. Si una pieza nace en `labs/` o `inventory/`, la promueve a `shared/` solo cuando es estable y reutilizable.
4. Actualiza referencias y documentacion.

### Resultado

El proyecto reduce duplicacion y mantiene un nucleo reutilizable.

---

## 5. Reglas Generales de Negocio

- El inventario local permite operar aunque la sincronizacion remota falle temporalmente.
- Airtable funciona como respaldo/fuente remota para productos, cotizaciones y configuraciones.
- El proxy PHP es obligatorio para proteger credenciales.
- Los catalogos deben mantenerse normalizados para evitar variaciones de marcas, categorias y unidades.
- Una cotizacion no descuenta inventario por el simple hecho de existir.
- Los datos fiscales y comerciales del cliente deben capturarse antes de emitir documentos formales.
- La numeracion de cotizaciones debe evitar duplicados.
- Los cambios de precio en una cotizacion no deben modificar automaticamente el precio base del producto.

---

## 6. Relacion con Otros Documentos

- Casos de uso detallados de cotizaciones: `docs/cotizaciones_casos_de_uso.md`.
- Schema de almacenes: `docs/almacenes_schema.md`.
- Backend y Airtable: `inventory/docs/backend-documentation.md`.
- Documento comercial del proyecto POS omnicanal: `docs/pos-kitchen-v-d002.md`.
