# Backend Documentation

## Overview

This project integrates with the **SHUM API** and uses **Airtable** as a backend data store. Below is a concise description of the current backend architecture, the Airtable bases we manage, the purpose of each base, and the key fields used throughout the application.

---

## SHUM API Integration

- **Proxy Endpoint:** `https://klef.newfacecards.com/shum-api/api.php` – a custom PHP script that forwards requests to Airtable.
- **Client Configuration (shum-sync.js):**
  - `baseId`: Airtable base ID for products (`apppjeEy9lY65U4On`).
  - `table`: Primary table name (`products`).
  - Additional `quotes` configuration with its own base ID (`appSVqxolsBlPACLH`) and table (`quotes`).
- **Request Flow:** The client calls `shumRequest(action, params)` which sends a JSON payload via `POST` to the proxy endpoint. The payload includes `action` (e.g., `list`, `create`, `update`, `delete`, `get`), `baseId`, `table`, and relevant data.
- **Server‑side Handling (shum_api.php):**
  - Reads the JSON payload, validates required fields.
  - Constructs the Airtable REST URL `https://api.airtable.com/v0/{baseId}/{table}`.
  - Uses the API key from `garden.php` (scoped by `scope` and `key_id`) to authenticate.
  - Performs the requested CRUD operation against Airtable and returns a JSON response with `success`, `message`, and optional `data`.
- **Error Handling:** Errors are returned in the JSON response (`success: false`) with a descriptive message; the client displays them via the UI error handler.
- **Authentication:** API key passed via `Authorization: Bearer <TOKEN>` header.
- **Proxy write token:** Mutating actions (`create`, `update`, `delete`) can require `X-KV-Import-Token` when `garden.php` defines `shum_proxy.kv_import_token`.
- **Main Endpoints Used:**
  - `GET /products` – Retrieve product catalog.
  - `POST /products` – Create a new product entry.
  - `PUT /products/:id` – Update product information.
  - `DELETE /products/:id` – Remove a product.
- **Error Handling:** Standard HTTP status codes are mapped to UI alerts; see `shared/components/product-form/errorHandler.js` for implementation details.

---

## CORS and Proxy Token

The SHUM proxy intentionally allows any origin:

```php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-KV-Import-Token");
```

This is required because the same proxy is used from:

- The production PWA.
- Live Server or other local development servers with variable ports.
- Postman/cURL during maintenance.
- Codex or other local automation tools.

Origin is not the security boundary. Write protection is handled by the optional proxy token.

### Server-side token

Store the token outside the repository in `/home/rccgaowg/zakra/garden.php`:

```php
"shum_proxy" => [
    "kv_import_token" => "REPLACE_WITH_LONG_SECRET_TOKEN"
]
```

When this value exists, the proxy requires the request header below for mutating actions:

```text
X-KV-Import-Token: REPLACE_WITH_LONG_SECRET_TOKEN
```

Applies to:

- `create`
- `update`
- `delete`

Does not apply to:

- `list`
- `get`

This keeps Postman and read-only checks easy while protecting writes.

### PWA token storage

The PWA sends the token automatically when it exists in one of these places:

```js
window.Config.SHUM_PROXY_TOKEN
localStorage.getItem("kv-shum-import-token")
sessionStorage.getItem("kv-shum-import-token")
```

For local testing, set it in DevTools:

```js
localStorage.setItem("kv-shum-import-token", "REPLACE_WITH_LONG_SECRET_TOKEN");
```

Do not commit the real token to the repository. Because browser-side tokens are visible in DevTools, this is a practical admin safeguard, not a replacement for a full authenticated backend.

---

## Airtable Bases

**Airtable Configuration**

- **App ID (Products):** `apppjeEy9lY65U4On`
- **Table (Products):** `products`
- **App ID (Quotes):** `appSVqxolsBlPACLH`
- **Table (Quotes):** `quotes`

| Airtable Base  | Purpose                                                             | Key Fields                                                                        |
| -------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| **Products**   | Stores the master list of products displayed in the inventory form. | `Name`, `Code`, `Barcode`, `Category`, `Price`, `Stock`, `CreatedAt`, `UpdatedAt` |
| **Categories** | Holds category metadata for dropdown selections.                    | `CategoryId`, `CategoryName`, `ParentCategory`                                    |
| **Suppliers**  | Information about product suppliers.                                | `SupplierId`, `SupplierName`, `ContactEmail`, `Phone`, `Address`                  |
| **AuditLog**   | Tracks changes made to products for compliance and debugging.       | `LogId`, `ProductId`, `Action`, `User`, `Timestamp`, `Details`                    |

_If additional bases are added, list them here with purpose and fields._

---

## Backend Tasks

1. **Synchronize Form Data → Airtable**
   - On product form submission, data is validated client‑side, sent to the SHUM API, which updates the relevant Airtable base.
2. **Fetch Reference Data**
   - Categories and suppliers are fetched from Airtable at app initialization to populate dropdowns.
3. **Audit Logging**
   - Every create, update, or delete operation creates an entry in the `AuditLog` base.
4. **Periodic Sync**
   - A nightly job (server‑side cron) ensures Airtable data stays consistent with the external SHUM system.

---

## Key Fields Overview

### Product Fields

- `Name` (string) – Product name (required).
- `Code` (string) – Internal product code (unique).
- `Barcode` (string) – Barcode symbology identifier.
- `Category` (reference) – Links to a record in the **Categories** base.
- `Price` (number) – Retail price.
- `Stock` (number) – Current stock level.

### Category Fields

- `CategoryId` (string) – Unique ID.
- `CategoryName` (string) – Human‑readable name.
- `ParentCategory` (reference) – Optional parent for hierarchical structures.

### Supplier Fields

- `SupplierId` (string) – Unique ID.
- `SupplierName` (string) – Supplier name.
- `ContactEmail` (string) – Primary contact email.
- `Phone` (string) – Contact phone number.
- `Address` (string) – Physical address.

---

## Future Enhancements

- Add **image handling** for products (store image URLs in Airtable).
- Implement **role‑based access control** for the audit log.
- Expand SHUM integration to include **inventory forecasting** endpoints.

---

_Document version: 1.0 – Created on 2026‑06‑09_

---

All fields:

````JSON
{
    "success": true,
    "message": "Record retrieved.",
    "data": {
        "id": "reclPVbehybWV0eUe",
        "createdTime": "2026-06-01T23:58:02.000Z",
        "fields": {
            "Producto Campo Personalizadoo 3": "1",
            "cf1_name": "1",
            "Cantidad de alerta": 1,
            "cf6_name": "1",
            "cf3_name": "1",
            "Categoria": "1",
            "unit code": "1",
            "Precio de promocion": true,
            "Ocultar en POS": true,
            "Marca": "1",
            "Clave Unidad": "1",
            "promo_hasta": "2026-01-01",
            "Imagen": "1",
            "Código de la Sub categoría": "Sub01-01",
            "cf2_data": "1",
            "Ocultar en tienda": true,
            "cf1_data": "1",
            "recID": "reclPVbehybWV0eUe",
            "Código de categoría": 1,
            "cf4_data": "1",
            "Precio": 1,
            "Mostrar en página de inicio": true,
            "Producto Campo Personalizadoo 2": "1",
            "Clave Prod": "1",
            "cf4_name": "1",
            "Producto Campo Personalizadoo 5": "1",
            "Tasa de impuestos": "IVA",
            "cf5_name": "1",
            "Producto de campo personalizado 1": "1",
            "Método de impuestos": "Exclusivo",
            "Código": "1",
            "Nombre": "1",
            "cf5_data": "1",
            "Costo": 1,
            "Subcategoria": "1",
            "cf3_data": "1",
            "Tipo de producto": "1",
            "Producto Campo Personalizadoo 4": "1",
            "Cantidad": 1,
            "Nombre secundario": "1",
            "envio_recepcion": 1,
            "cf2_name": "1",
            "Clase de Código de barras": "code128",
            "Variantes de producto": "1",
            "cf6_data": "1",
            "Comprar unit code": "1",
            "Producto Campo Personalizadoo 6": "1",
            "Venta unit code": "1",
            "precio_promo": 1,
            "promo_desde": "2026-01-01"
        }
    }
}

peticion:
``` plain
postman request POST 'https://klef.newfacecards.com/shum-api/api.php' \
  --header 'Content-Type: application/json' \
  --body '{
  "baseId": "apppjeEy9lY65U4On",
  "table": "products",
  "action": "get",
  "recordId": "reclPVbehybWV0eUe"
}
'

```JSON
{
    "success": true,
    "message": "Records listed.",
    "data": {
        "records": [
            {
                "id": "recn2Be41sQcuowmT",
                "createdTime": "2026-06-09T01:56:06.000Z",
                "fields": {
                    "error_log": "[2026-06-07 09:45:11.802] [WARN ] [InventoryService] [User: SYSTEM] Alerta de Stock Bajo detectada para ID 304: \"Mesa de Trabajo de Acero Inoxidable 1.80m\". Stock actual: 2 unidades. Mínimo requerido: 5 unidades.\n[2026-06-07 10:05:33.114] [ERROR] [InventoryService] [User: chef_carlos] [CRUD:CREATE] Error al crear producto. Razón: Validación fallida. El campo 'precio_compra' ($ -1,250.00) no puede ser un valor negativo. SKU propuesto: FRE-GAS-20L.\n[2026-06-07 14:22:18.411] [ERROR] [InventoryService] [User: aux_soporte] [CRUD:READ] Error al recuperar información del producto ID 9999. Razón: EntityNotFoundException. El producto con ID especificado no existe en la base de datos.\n[2026-06-07 15:40:05.744] [WARN ] [SecurityService] [User: chef_carlos] Intento de eliminación no autorizado. El rol 'CHEF' no tiene permisos para ejecutar [CRUD:DELETE] sobre la entidad \"Lavavajillas de Capota Industrial Fagor\" (ID 128). Operación denegada.\n[2026-06-07 18:01:45.320] [ERROR] [DatabaseConnector] Pérdida de conexión con el servidor de Base de Datos. Error de socket: Connection reset by peer.\n[2026-06-07 18:01:46.325] [WARN ] [DatabaseConnector] Reintentando conexión con la base de datos (Intento 1/5)...\n[2026-06-08 11:24:55.602] [ERROR] [InventoryService] [User: chef_carlos] [CRUD:UPDATE] Error al actualizar ID 890. Razón: OptimisticLockException. El registro fue modificado simultáneamente por otro usuario (admin_lucia). Transacción cancelada para evitar inconsistencias de datos.\n",
                    "product_form_fields": "{\"\": \"\"}",
                    "media": "{\"\": \"\"}",
                    "almacenes": "{\"\": \"\"}",
                    "Marcas": "{\"\": \"\"}",
                    "Categorias": "{\"\": \"\"}",
                    "history_log": "[2026-06-07 08:30:15.102] [INFO ] [DatabaseConnector] Estableciendo conexión con la base de datos PostgreSQL en 'db-prod-kitchen-01.local'...\n[2026-06-07 08:30:16.448] [INFO ] [DatabaseConnector] Conexión establecida con éxito. Pool de conexiones inicializado con 10 conexiones activas.\n[2026-06-07 08:31:02.315] [INFO ] [InventoryService] [User: admin_lucia] [CRUD:READ] Listado general de inventario solicitado. Filtro aplicado: Ninguno. Registros devueltos: 142.\n[2026-06-07 08:35:44.892] [INFO ] [InventoryService] [User: chef_carlos] [CRUD:CREATE] Iniciando creación de nuevo producto: \"Horno de Convección Eléctrico 6 Bandejas\". Marca: Rational. SKU: HOR-CONV-R6B.\n[2026-06-07 08:35:45.110] [INFO ] [InventoryService] [User: chef_carlos] [CRUD:CREATE] Producto creado con éxito. ID asignado: 1045. Stock inicial: 3 unidades. Ubicación: Pasillo A-Zona 2.\n[2026-06-07 09:12:03.551] [INFO ] [InventoryService] [User: aux_soporte] [CRUD:READ] Búsqueda de producto por ID: 890 (\"Licuadora Industrial 10 Lts - Acero Inox\").\n[2026-06-07 09:14:22.019] [INFO ] [InventoryService] [User: aux_soporte] [CRUD:UPDATE] Actualización de stock para ID 890. Cantidad anterior: 15. Nueva cantidad: 12. Motivo: Salida por despacho a sucursal norte.\n[2026-06-07 11:15:40.903] [INFO ] [InventoryService] [User: admin_lucia] [CRUD:UPDATE] Modificación de datos generales para ID 512 (\"Freidora de Doble Tina a Gas 20L\"). Precio de venta actualizado de $24,500.00 a $26,100.00 debido a reajuste de costes de importación.\n[2026-06-07 13:00:00.005] [INFO ] [InventoryService] [User: SYSTEM] Ejecución de tarea programada: Verificación de almacenamiento físico vs lógico de stock.\n[2026-06-07 15:42:10.129] [INFO ] [InventoryService] [User: admin_lucia] [CRUD:DELETE] Iniciando eliminación física de producto descatalogado: \"Máquina de Hielo en Cubos Brema\" (ID 412).\n[2026-06-07 15:42:10.992] [INFO ] [InventoryService] [User: admin_lucia] [CRUD:DELETE] Producto ID 412 eliminado lógicamente de forma correcta (is_deleted actualizado a true).\n[2026-06-07 18:01:48.511] [INFO ] [DatabaseConnector] Conexión restablecida exitosamente después de 1 reintento.\n[2026-06-08 08:30:00.119] [INFO ] [InventoryService] [User: SYSTEM] Ejecución de tarea programada: Backup diario de la tabla de inventarios.\n[2026-06-08 08:30:04.890] [INFO ] [BackupService] Backup creado exitosamente: \"/backups/kitchen_inventory_20260608.sql\" (Tamaño: 45.8 MB).\n[2026-06-08 09:15:33.220] [INFO ] [InventoryService] [User: admin_lucia] [CRUD:CREATE] Iniciando creación de nuevo producto: \"Peladora de Papas Industrial 15kg/min\". Marca: Sammic. SKU: PEL-PAP-S15.\n[2026-06-08 09:15:33.910] [INFO ] [InventoryService] [User: admin_lucia] [CRUD:CREATE] Producto creado con éxito. ID asignado: 1046. Stock inicial: 1 unidades. Ubicación: Pasillo C-Maquinaria Pesada.\n[2026-06-08 14:02:11.810] [INFO ] [InventoryService] [User: chef_carlos] [CRUD:READ] ",
                    "Subcategorias": "{\"\": \"\"}",
                    "proveedores_envios": "{\"\": \"\"}"
                }
            }
        ]
    }
}

``` plain
postman request POST 'https://klef.newfacecards.com/shum-api/api.php' \
  --header 'Content-Type: application/json' \
  --body '{
  "baseId": "apppjeEy9lY65U4On",
  "table": "configs",
  "action": "list"

}
'
````
