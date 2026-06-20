# Sistema de carga idempotente de productos SHUM

## Objetivo

Reducir peticiones innecesarias a SHUM API/Airtable para el listado principal de inventario y hacer que `products-container` renderice desde una copia local confiable.

El sistema separa dos scopes que no deben mezclarse conceptualmente:

- **Productos nube**: copia local del catálogo que viene de SHUM/Airtable.
- **Drafts**: productos creados localmente que todavía no son un producto publicado/sincronizado.

## Contrato de almacenamiento

| Scope | Key localStorage | Contenido |
| --- | --- | --- |
| Productos nube | `kv-catalog-cloud-products` | Productos renderizables en inventario, provenientes de SHUM/Airtable o parchados tras create/update |
| Metadata nube | `kv-catalog-cloud-products-meta` | Fecha de carga, fuente y conteo |
| Drafts | `kv-catalog-product-drafts` | Borradores locales separados del catálogo nube |
| Legado | `kv-catalog-products` | Mirror de compatibilidad mientras se termina de retirar el key anterior |

`kv-catalog-products` no debe usarse como fuente conceptual nueva. Solo queda como espejo temporal para compatibilidad con partes antiguas del sistema.

## Regla de idempotencia diaria

La carga completa de productos desde SHUM/Airtable solo debe ejecutarse cuando:

1. No existe caché local de productos nube.
2. La metadata `fetchedDate` no corresponde al día local actual.
3. La caché existe pero la app necesita recuperarse de datos inválidos.

Además, si dos partes de la app intentan cargar el catálogo al mismo tiempo, ambas deben reutilizar la misma petición en curso en vez de abrir dos requests paralelos.

Si `kv-catalog-cloud-products-meta.fetchedDate` es igual al día actual, la app debe:

1. Leer `kv-catalog-cloud-products`.
2. Leer `kv-catalog-product-drafts`.
3. Componer `window.AppState.products = drafts + productos nube`.
4. Renderizar `products-container` sin pedir todo el catálogo a SHUM.

## Flujo de arranque

1. `loadProductsFromStorage()` lee drafts y productos nube por separado.
2. Si la caché nube es fresca, usa localStorage.
3. Si la caché está vencida, pide todos los productos a SHUM/Airtable una sola vez.
4. La respuesta se normaliza con `SyncManager.mapAirtableToLocal()`.
5. Los productos nube se guardan en `kv-catalog-cloud-products`.
6. Los drafts se mantienen en `kv-catalog-product-drafts`.
7. `window.AppState.products` se arma como una vista combinada para que las pantallas actuales sigan funcionando.

## Flujo de crear producto

1. El producto se guarda localmente como draft mientras se envía a SHUM.
2. SHUM/Airtable responde con el record creado.
3. `SyncManager.syncProduct()` normaliza ese record.
4. `ProductCloudCache.patch(product)` inserta el producto en `kv-catalog-cloud-products`.
5. El draft pasa a `published/synced`.
6. No se descarga de nuevo todo el catálogo.

## Flujo de actualizar producto

1. La edición marca el producto local como `dirty`.
2. Al actualizar, SHUM/Airtable responde con el record actualizado.
3. `SyncManager.syncProduct()` normaliza la respuesta.
4. `ProductCloudCache.patch(product)` reemplaza el producto correspondiente por `airtable_id`, `codigo` o `id`.
5. `products-container` puede reflejar el cambio desde caché local.
6. No se descarga de nuevo todo el catálogo.

## Reglas de mantenimiento

- No escribir productos nuevos directamente en `kv-catalog-products`.
- Usar `saveProductsToStorage()` para persistir cambios de catálogo desde la app.
- Usar `ProductCloudCache.patch(product)` cuando SHUM devuelva un record creado o actualizado.
- Drafts y productos nube pueden convivir en `window.AppState.products`, pero deben persistirse en scopes separados.
- La caché diaria aplica exclusivamente a la petición masiva de productos. No cambia reglas de clientes, cotizaciones, taxonomías ni otros módulos.

## Archivos responsables

- `inventory/js/storage.js`: separación de scopes, caché diaria, merge para `AppState`.
- `inventory/js/shum-sync.js`: normalización de respuesta create/update y parche de caché nube.
- `inventory/js/screens/inventory-screen.js`: render de `products-container` desde `window.AppState.products`.
