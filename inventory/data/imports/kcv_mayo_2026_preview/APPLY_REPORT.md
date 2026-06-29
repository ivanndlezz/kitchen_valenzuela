# Aplicacion de Importacion - Inventario KCV Mayo 2026

## Resultado local

Se aplicaron las categorias solicitadas:

- `To update`: aplicado a coincidencias exactas.
- `To create`: creado como nuevos productos.
- `Duplicate`: ignorado por ahora.
- `exists_other_code`: ignorado por ahora.
- `variant`: ignorado por ahora.

Archivos activos modificados:

- `inventory/data/local_products.json`
- `inventory/data/inventory-products.json`
- `inventory/data/products-all.csv`

Conteos finales:

| Archivo | Actualizados | Creados | Total final |
|---|---:|---:|---:|
| `local_products.json` | 92 | 69 | 169 |
| `inventory-products.json` | 92 | 69 | 169 |
| `products-all.csv` | 433 | 69 | 555 |

Nota: el CSV amplio tenia mas coincidencias que los JSON locales, por eso actualiza 433 filas en CSV y 92 en cada JSON.

## Nube / Airtable

Se intento sincronizar contra SHUM API / Airtable con permiso externo, pero el endpoint rechazo la conexion:

```text
curl: (35) Recv failure: Connection reset by peer
```

Resultado en nube:

- Actualizados en Airtable: 0
- Creados en Airtable: 0

Esto no fue un error de datos ni del script: una llamada minima al endpoint `https://klef.newfacecards.com/shum-api/api.php` tambien fallo con `Connection reset by peer`.

## Respaldos

Antes de aplicar se guardaron respaldos dentro de:

- `inventory/data/imports/kcv_mayo_2026_preview/backups/`

La primera aplicacion local quedo respaldada en:

- `inventory/data/imports/kcv_mayo_2026_preview/backups/kcv-may-2026-apply-20260629-101455/`

## Scripts usados

- `tools/import_kcv_inventory.py`
- `tools/apply_kcv_inventory_import.py`
