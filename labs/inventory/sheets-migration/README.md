# Inventory Sheets Migration Lab

This is a runnable copy of the main `inventory/` app for migrating the old hardcoded drawers into the unified sheet system.

Use this lab for the risky steps:

- Client drawer migration.
- Product detail drawer migration.
- Product form adopt/mount migration.
- Old drawer CSS cleanup.

Keep production `inventory/` stable while experimenting here. Once all sheet behavior works in the lab, promote the changed files back to `inventory/` intentionally.

## Migration Status

- `compare` uses `SheetManager` with `CompareSheet`.
- `client-form` uses `SheetManager` with `ClientSheet` and live form adoption.
- `product-detail` uses `SheetManager` with `ProductDetailSheet`.
- `product-form` uses `SheetManager` with `ProductFormSheet` and live form adoption.

The legacy sheet DOM nodes are now hidden source mounts. They keep initialized forms alive while the visible UI renders through `#sheet-root`.

## Local Storage

This lab loads `js/lab-storage.js` before the app scripts. It prefixes app storage keys with `kv-lab-sheets:` so tests do not overwrite production Inventory browser data.

## Run

From the repository root:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/labs/inventory/sheets-migration/index.html
```
