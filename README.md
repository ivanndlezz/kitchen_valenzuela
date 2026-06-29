# Kitchen Valenzuela

Workspace del ecosistema operativo para Kitchen Valenzuela: inventario persistente por escaneo, catalogo comercial, clientes, cotizaciones, sincronizacion con Airtable mediante un middleware API y componentes reutilizables para formularios y utilidades de captura.

## Estado del Proyecto

El proyecto esta organizado como una aplicacion web estatica con modulos JavaScript en navegador. La app principal vive en `inventory/` y usa `localStorage` como cache local, con sincronizacion remota hacia Airtable mediante un proxy PHP.

La version actual cubre:

- Inventario de equipos industriales con busqueda, filtros, tarjetas, lista y metricas.
- Alta, edicion, detalle y borrado local/remoto de productos.
- Escaneo de codigos de barras por camara o lectura en inputs.
- Gestion de clientes.
- Flujo de cotizaciones por pasos.
- Catalogos operativos: categorias, subcategorias, marcas, usuarios, roles, proveedores y almacenes.
- Selector de almacen y usuario activo.
- Sincronizacion comparativa entre datos locales, JSON de respaldo y Airtable.
- Backend PHP compatible con el endpoint historico `shum_api.php`.

## Estructura

```text
.
|-- inventory/                 # Aplicacion principal de inventario, clientes y cotizaciones
|   |-- index.html             # Entrada principal de la app
|   |-- css/                   # Estilos por pantalla/componente
|   |-- js/                    # Estado, sincronizacion, pantallas, sheets y componentes
|   |-- data/                  # JSON/CSV de productos usados como respaldo o carga inicial
|   `-- docs/                  # Documentacion tecnica especifica del inventario/backend
|-- shared/                    # Componentes y utilidades reutilizables
|   |-- components/product-form/
|   `-- utilities/scanning/
|-- backend/                   # Implementacion backend canonica
|   `-- php/shum_api.php       # Proxy PHP hacia Airtable
|-- docs/                      # Documentacion general, hallazgos, cambios y casos de uso
|-- demos/                     # Prototipos y pruebas aisladas
|-- tools/                     # Scripts de apoyo
|-- labs/                      # Experimentos o trabajo no promovido a produccion
|-- archive/                   # Respaldos historicos
|-- cotizador_impecable.html   # Prototipo standalone del cotizador
`-- shum_api.php               # Entrada de compatibilidad para despliegues antiguos
```

## Aplicacion Principal

La app se abre desde:

```text
inventory/index.html
```

Pantallas principales:

- `#/inventory` o `#/dashboard`: inventario, metricas, filtros y listado de productos.
- `#/quotation`: listado y flujo de cotizaciones.
- `#/quotation/new`: creacion de nueva cotizacion.
- `#/quotation/{id}/step{n}`: detalle de cotizacion por pasos.
- `#/clients`: directorio de clientes.
- `#/product` o `#/products`: ficha tecnica individual.
- `#/catalogs` o `#/taxonomy`: catalogos administrativos.

## Modulos Relevantes

### Inventario

- `inventory/js/screens/inventory-screen.js`: metricas, filtros y render de productos.
- `inventory/js/components/product-drawer.js`: panel de detalle y edicion de producto.
- `inventory/js/sheets/product-form-sheet.js`: formulario lateral de producto.
- `inventory/js/storage.js`: carga y persistencia local de productos.
- `inventory/js/warehouse-scope.js`: selector de almacen activo.

### Cotizaciones y clientes

- `inventory/js/screens/quotation-screen.js`: flujo de cotizaciones, pasos, totales, duplicado, eliminacion y PDF/impresion.
- `inventory/js/screens/clients-screen.js`: directorio y CRUD de clientes.
- `inventory/js/sheets/client-sheet.js`: formulario lateral de cliente.
- `inventory/js/quote-field-sync.js`: sincronizacion de campos usados por cotizaciones.

### Catalogos

- `inventory/js/screens/taxonomy-screen.js`: pantalla de catalogos.
- `inventory/js/sheets/taxonomy-manager-panel.js`: alta, edicion y eliminacion de categorias, marcas, proveedores, almacenes, usuarios y roles.
- `inventory/js/taxonomy-reconciliation.js`: normalizacion y conciliacion de datos importados.

### Escaneo

- `inventory/js/components/scanner.js`: logica del modal de escaneo.
- `shared/utilities/scanning/html5-qrcode.min.js`: motor de lectura QR/codigo de barras.
- `shared/utilities/scanning/lucide.min.js`: iconos locales usados por la UI.

### Sincronizacion

- `inventory/js/shum-sync.js`: `SyncManager`, mapeo local/Airtable, contador de peticiones y panel comparativo.
- `backend/php/shum_api.php`: proxy PHP hacia Airtable.
- `shum_api.php`: entrada de compatibilidad para rutas antiguas.

## Datos y Persistencia

La app usa una estrategia mixta:

- `localStorage`: estado de trabajo, productos, clientes, cotizaciones, preferencias de UI y cache.
- `inventory/data/*.json` y `inventory/data/*.csv`: respaldos/cargas iniciales de catalogo.
- Airtable: fuente remota de productos, cotizaciones y configuraciones.
- Proxy SHUM API: endpoint PHP que recibe acciones CRUD y las traduce a llamadas REST de Airtable.

Configuracion principal en `inventory/js/shum-sync.js`:

- Productos: base `apppjeEy9lY65U4On`, tabla `products`.
- Cotizaciones: base `appSVqxolsBlPACLH`, tabla `quotes`.
- Configs: tabla `configs`, usada para catalogos, almacenes y contador de peticiones.

## Backend

El backend es un proxy PHP. Su funcion es evitar exponer credenciales de Airtable en el cliente y mantener una interfaz uniforme para las acciones:

- `list`
- `get`
- `create`
- `update`
- `delete`

La implementacion canonica esta en:

```text
backend/php/shum_api.php
```

La raiz conserva:

```text
shum_api.php
```

por compatibilidad con despliegues o documentacion previa.

### Token del Proxy

El proxy permite cualquier origin para soportar PWA, Live Server con puertos variables, Postman/cURL y automatizaciones locales. La proteccion de escritura se hace con `X-KV-Import-Token` cuando `garden.php` define:

```php
"shum_proxy" => [
    "kv_import_token" => "REPLACE_WITH_LONG_SECRET_TOKEN"
]
```

El token aplica a `create`, `update` y `delete`. `list` y `get` siguen disponibles para lectura y pruebas.

En la PWA se puede configurar temporalmente desde DevTools:

```js
localStorage.setItem("kv-shum-import-token", "REPLACE_WITH_LONG_SECRET_TOKEN");
```

No guardar el token real en el repositorio.

## Como Ejecutar en Local

Como la app es estatica, puede abrirse directamente desde el navegador. Para evitar restricciones de archivos locales, se recomienda servir el workspace:

```bash
python3 -m http.server 8000
```

Luego abrir:

```text
http://localhost:8000/inventory/
```

## Flujo de Trabajo Recomendado

1. Desarrollar cambios terminados en `inventory/`.
2. Usar `labs/` para pruebas que todavia no deben promoverse.
3. Mover a `shared/` solo componentes estables y reutilizables.
4. Mantener `docs/` actualizado cuando cambien reglas de negocio, campos o flujos.
5. Validar cambios de sincronizacion contra el mapeo de `SyncManager` antes de tocar el proxy.

## Documentacion

Documentos utiles:

- `docs/casos_de_uso.md`: casos de uso generales del proyecto.
- `docs/cotizaciones_casos_de_uso.md`: casos de uso detallados del modulo de cotizaciones.
- `docs/almacenes_schema.md`: contrato actual de almacenes.
- `inventory/docs/backend-documentation.md`: documentacion tecnica del backend y Airtable.
- `docs/reglas_codex_kitchen_valenzuela.md`: reglas de trabajo del proyecto.

## Notas de Mantenimiento

- No mover rutas historicas sin actualizar referencias y despliegues.
- Mantener el mapeo local/Airtable sincronizado cuando cambien nombres de campos.
- Evitar duplicar logica entre formularios de producto; preferir los componentes en `shared/components/product-form/` cuando aplique.
- Las credenciales de Airtable deben permanecer del lado servidor.
