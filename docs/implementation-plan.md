# Deduplicate Products in Inventory UI, Local Storage, and Local JSON Backups

## Problem Description
In the inventory UI, a product with code `XHC010` (and all other products) is rendered multiple times (exactly 20 times). This happens because:
1. The remote Airtable sync API returned 20 pages of the same 100 products (likely due to the backend PHP endpoint not handling the pagination offset correctly, causing the frontend to fetch page 1 repeatedly up to its limit of 20 pages).
2. The frontend concatenated all pages together, resulting in 2,000 records containing 20 duplicates of each product.
3. This duplicated dataset was synced and saved to the local JSON backups (`data/local_products.json` and `data/kv_products_2026_05_05_19_31_43.json`) and stored in the user's `localStorage` as `kv-catalog-products`.

To resolve this issue, we will:
1. **Deduplicate the local JSON backup files** in the filesystem (so they only contain the 100 unique products).
2. **Implement frontend deduplication in `js/storage.js`** when loading products from local storage or JSON backups (saving a clean, deduplicated array back to local storage).
3. **Implement deduplication and early-exit logic in `js/shum-sync.js`** during the Airtable sync process so that if the API returns duplicate records, we stop looping and only save unique records.

---

## Proposed Changes

### Database & Backups

#### [MODIFY] [local_products.json](file:///Users/a74525/Documents/sites/kitchen_valenzuela/inventory/data/local_products.json)
We will run a script to remove duplicate entries in this file, keeping only the first occurrence of each unique `Código`.

#### [MODIFY] [kv_products_2026_05_05_19_31_43.json](file:///Users/a74525/Documents/sites/kitchen_valenzuela/inventory/data/kv_products_2026_05_05_19_31_43.json)
We will run a script to remove duplicate entries in this file, keeping only the first occurrence of each unique `Código`.

---

### Logic

#### [MODIFY] [storage.js](file:///Users/a74525/Documents/sites/kitchen_valenzuela/inventory/js/storage.js)
1. Add a helper function `deduplicateProducts(products)` that filters an array of products by unique `codigo` / `Código`.
2. Modify `loadProductsFromStorage()` to wrap the loaded/parsed array with `deduplicateProducts` before setting `window.AppState.products` and saving back to `localStorage`.

#### [MODIFY] [shum-sync.js](file:///Users/a74525/Documents/sites/kitchen_valenzuela/inventory/js/shum-sync.js)
Modify `fetchAllFromAirtable()` to:
1. Keep track of already seen record IDs (`seenIds` set).
2. Loop over fetched page records and skip any record ID that was already seen.
3. If a fetched page contains only duplicate records (no new records added), break out of the pagination loop early instead of looping up to `maxPages` (which fetches 20 pages of duplicate data).

---

## Verification Plan

### Automated/Scripted Verification
- Run a Python verification script to confirm that `data/local_products.json` and `data/kv_products_2026_05_05_19_31_43.json` contain exactly 100 unique records.
- Run a check to verify that `localStorage` on reload contains only unique product entries (verified manually or with unit test if applicable).

### Manual Verification
- Open the application and verify that product cards/rows are only rendered once.
- Verify that `lowStock`, `totalProducts`, and other metrics in the metrics bar display correct counts instead of being multiplied by 20.
