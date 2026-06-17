## Technical Analysis: Product Display Limitation (100 of 500 Products)

### Problem Summary

The inventory application displays only **100 products** when the expected count is **500 products**. This is **NOT caused by pagination logic** in the frontend code.

### Root Cause Analysis

#### 1. Data Source Limitation (Primary Issue)

The backup JSON file contains exactly 100 products:

```
File: inventory/data/kv_products_2026_05_05_19_31_43.json
Product count: 100 (verified via grep -c '"Nombre"')
File size: 83,449 bytes
```

In contrast, the CSV source file contains ~487 products:

```
File: inventory/data/products-all.csv
Line count: 488 (excluding header = 487 products)
```

#### 2. Product Loading Flow (storage.js:16-52)

```javascript
async function loadProductsFromStorage() {
  // STEP 1: Check localStorage
  const saved = localStorage.getItem("kv-catalog-products");
  if (saved) {
    // Load from localStorage if exists
    window.AppState.products = JSON.parse(saved);
    window.AppState.products = deduplicateProducts(window.AppState.products);
  } else {
    // STEP 2: Fallback to local JSON backup (ONLY 100 PRODUCTS)
    const raw = await window.SyncManager.loadFromLocalJSON();
    window.AppState.products = raw.map(normalizeJsonProduct);
    // ...
  }
}
```

**No cloud/Airtable auto-fetch on initial load.** The SHUM API (`fetchAllFromAirtable`) is only called when:

- User opens the Sync Modal (button click)
- User triggers bulk sync manually

### Code Locations - No Pagination in Main Inventory

| File                  | Lines   | Function                 | Pagination Logic?                                   |
| --------------------- | ------- | ------------------------ | --------------------------------------------------- |
| `inventory-screen.js` | 132-269 | `renderProducts()`       | **NONE** - renders all filteredProducts             |
| `inventory-screen.js` | 71-114  | `applyFilters()`         | **NONE** - full iteration, no slice/limit           |
| `inventory-screen.js` | 116-130 | `sortFilteredProducts()` | **NONE** - sorts complete array                     |
| `quotation-screen.js` | 621-640 | `renderQuoteProducts()`  | **YES** - `slice(0, 25)` limit (quote context only) |

### Pagination Search Results

Searched for: `pagin|slice|limit|offset|take|100`

Found pagination **only in quotation workflow** (line 640):

```javascript
filtered = filtered.slice(0, 25); // quotation-screen.js
```

This limits product search **within quotes** to 25 items, irrelevant to main inventory display.

### Configuration References

| Location               | Value                                                    | Purpose                                   |
| ---------------------- | -------------------------------------------------------- | ----------------------------------------- |
| `shum-sync.js:12`      | `jsonUrl: "./data/kv_products_2026_05_05_19_31_43.json"` | Fallback JSON path                        |
| `shum-sync.js:242-273` | `fetchAllFromAirtable()`                                 | Pagination with offset, 20 page max       |
| `storage.js:16-52`     | `loadProductsFromStorage()`                              | Primary load function (no cloud priority) |

### Proposed Fix Options

#### Option A: Update JSON File (Quick Fix)

Replace `kv_products_2026_05_05_19_31_43.json` with full CSV data (487+ products).

#### Option B: Add Cloud Priority on Init (Better)

Modify `storage.js` to attempt Airtable fetch before falling back to JSON:

```javascript
// NEW BEHAVIOR: Try Airtable FIRST
if (!saved) {
  try {
    const cloudData = await window.SyncManager.fetchAllFromAirtable();
    if (cloudData.length > 0) {
      window.AppState.products = cloudData.map(
        window.SyncManager.mapAirtableToLocal,
      );
      localStorage.setItem(
        "kv-catalog-products",
        JSON.stringify(window.AppState.products),
      );
      return; // Skip JSON fallback
    }
  } catch (e) {
    /* continue to JSON fallback */
  }
}
```

#### Option C: Add Configuration Flag

```javascript
window.SyncManager.config = {
  ...
  priority: "airtable", // "airtable" > "local" > "json"
  ...
};
```

### File Structure

```
inventory/
├── index.html
├── js/
│   ├── app.js              (main orchestrator)
│   ├── storage.js          (load/save logic)
│   ├── shum-sync.js        (Airtable API client)
│   └── screens/
│       ├── inventory-screen.js  (renderProducts - NO LIMITS)
│       └── quotation-screen.js  (renderQuoteProducts - 25 limit)
└── data/
    ├── kv_products_2026_05_05_19_31_43.json  (100 products - CURRENT FALLBACK)
    ├── local_products.json  (100 products - same as above)
    └── products-all.csv     (~487 products - SOURCE DATA)
```

### Conclusion

**The 100-product limit is a data source constraint, not a code limitation.** The JSON backup file lacks the remaining ~400 products. Solution requires either updating the JSON file with complete data or modifying the initialization sequence to prioritize Airtable API fetch.

Understood. You want to change the product loading priority so that the SHUM API (Airtable) has priority over the local JSON file.

Current Configuration Analysis

In shum-sync.js line 12, the JSON file is configured as a fallback source:

jsonUrl: "./data/kv_products_2026_05_05_19_31_43.json"

In storage.js lines 32-40, the loading flow is:

First: Attempts to load from localStorage (kv-catalog-products)

Fallback: If localStorage is empty, it loads from the local JSON

No items: Automatic load from the cloud (Airtable) on startup

Required Changes to Prioritize SHUM API

To invert the priority and make Airtable the primary source, the following steps are required:

1. Modify storage.js - loadProductsFromStorage() Function

async function loadProductsFromStorage() {
// NEW: First, attempt to load from Airtable via SHUM API
try {
if (window.SyncManager && typeof window.SyncManager.fetchAllFromAirtable === "function") {
console.log("Attempting to load products from Airtable...");
const raw = await window.SyncManager.fetchAllFromAirtable();
if (raw && raw.length > 0) {
window.AppState.products = raw.map(window.SyncManager.mapAirtableToLocal);
window.AppState.products = deduplicateProducts(window.AppState.products);
localStorage.setItem("kv-catalog-products", JSON.stringify(window.AppState.products));
console.log(`Loaded ${window.AppState.products.length} products from Airtable`);
return;
}
}
} catch (err) {
console.warn("Failed to load from Airtable, falling back to JSON:", err);
}

// NEXT: Attempt to load from localStorage
const saved = localStorage.getItem("kv-catalog-products");
if (saved) {
// ... existing code ...
} else {
// FINALLY: Fallback to local JSON
// ... existing code ...
}
}

2. Modify shum-sync.js - Configuration

Change the priority order in the loading function or add a configuration flag:

window.SyncManager = {
config: {
endpoint: "[https://klef.newfacecards.com/shum-api/api.php](https://klef.newfacecards.com/shum-api/api.php)",
baseId: "apppjeEy9lY65U4On",
table: "products",
jsonUrl: "./data/kv_products_2026_05_05_19_31_43.json",
saveServerUrl: "http://localhost:8765/save_inventory",
priority: "airtable" // <-- ADD: "airtable" | "local" | "json"
},

3. Update in app.js

The current flow in app.js lines 13-18:

async function init() {
cacheElements();
setupTheme();
setupToastContainer();
trackReload();
await loadProductsFromStorage(); // <-- The change is needed here
setupEventListeners();

Important Considerations

The JSON file only has 100 products - if Airtable has more products, you should see more products (up to ~500 if the Airtable base contains that amount) after changing the priority.

The fetchAllFromAirtable() function in shum-sync.js (lines 242-273) already handles pagination with offset to fetch all records from Airtable; there is no artificial limit.

The JSON kv_products_2026_05_05_19_31_43.json will remain as a fallback in case the API is unavailable.

Exact Location of Changes

File

Lines

Action

storage.js

16-52

Reorder loading logic

shum-sync.js

12

Add priority: "airtable" flag

app.js

8-18

The init already calls loadProductsFromStorage() correctly
