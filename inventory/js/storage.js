/**
 * storage.js
 * Persistent localStorage CRUD operations and normalization utilities.
 */

function deduplicateProducts(products) {
  const seen = new Set();
  return products.filter(p => {
    const code = String(p.codigo || p["Código"] || "").trim();
    const isDraft = p.status === "draft" || p.sync_status === "draft";
    const key = isDraft || !code
      ? `id:${p.id || p.createdAt || p.updatedAt || Math.random()}`
      : `code:${code}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseStoredProducts(saved) {
  if (!saved) return [];
  try {
    const products = JSON.parse(saved);
    return Array.isArray(products) ? products : [];
  } catch (err) {
    console.error("Failed to parse local catalog database:", err);
    return [];
  }
}

function getStoredDraftProducts(saved) {
  return parseStoredProducts(saved).filter(p => p && (p.status === "draft" || p.sync_status === "draft"));
}

async function loadProductsFromStorage() {
  const saved = localStorage.getItem("kv-catalog-products");
  const storedDrafts = getStoredDraftProducts(saved);
  const priorityAirtable = window.SyncManager && window.SyncManager.config && window.SyncManager.config.priority === "airtable";
  if (saved && !priorityAirtable) {
    // Existing cached data is used when no Airtable priority override
    window.AppState.products = parseStoredProducts(saved);
    const before = window.AppState.products.length;
    window.AppState.products = deduplicateProducts(window.AppState.products);
    if (before !== window.AppState.products.length) {
      console.log(`Deduplicated products: ${before} → ${window.AppState.products.length}`);
      localStorage.setItem("kv-catalog-products", JSON.stringify(window.AppState.products));
    }
  } else {
    // LocalStorage is empty or priority forces Airtable load
    window.AppState.isLoading = true;

    // Show skeleton placeholders while fetching
    if (typeof window.renderSkeletons === 'function') {
      window.renderSkeletons(8);
    }

    // STEP 1: Try Airtable (SHUM API) first — has the complete catalog (~500 products)
    let loadedFromCloud = false;
    try {
      if (window.SyncManager && typeof window.SyncManager.fetchAllFromAirtable === "function") {
        console.log("Storage: Attempting to load products from Airtable (priority source)...");
        const cloudRecords = await window.SyncManager.fetchAllFromAirtable();
        if (cloudRecords && cloudRecords.length > 0) {
          const cloudProducts = cloudRecords.map(rec => window.SyncManager.mapAirtableToLocal(rec));
          window.AppState.products = [...storedDrafts, ...cloudProducts];
          window.AppState.products = deduplicateProducts(window.AppState.products);
          localStorage.setItem("kv-catalog-products", JSON.stringify(window.AppState.products));
          console.log(`Storage: Loaded ${window.AppState.products.length} products from Airtable.`);
          loadedFromCloud = true;
        }
      }
    } catch (err) {
      console.warn("Storage: Failed to load from Airtable, falling back to JSON:", err);
    }

    // STEP 2: Fallback to local JSON backup if Airtable failed or returned nothing
    if (!loadedFromCloud) {
      try {
        if (window.SyncManager && typeof window.SyncManager.loadFromLocalJSON === "function") {
          const raw = await window.SyncManager.loadFromLocalJSON();
          if (raw && raw.length > 0) {
            const jsonProducts = raw.map(normalizeJsonProduct);
            window.AppState.products = [...storedDrafts, ...jsonProducts];
            window.AppState.products = deduplicateProducts(window.AppState.products);
            localStorage.setItem("kv-catalog-products", JSON.stringify(window.AppState.products));
            console.log(`Storage: Fallback — imported ${window.AppState.products.length} products from backup JSON.`);
          } else {
            window.AppState.products = storedDrafts;
          }
        } else {
          window.AppState.products = storedDrafts;
        }
      } catch (err) {
        console.warn("Storage: Failed to load backup JSON:", err);
        window.AppState.products = storedDrafts;
      }
    }
    window.AppState.isLoading = false;
  }
}

function saveProductsToStorage() {
  localStorage.setItem("kv-catalog-products", JSON.stringify(window.AppState.products));
  if (typeof calculateMetrics === "function") calculateMetrics();
  if (typeof populateBrandFilter === "function") populateBrandFilter();
  if (typeof applyFilters === "function") applyFilters();
}

function loadClientsFromStorage() {
  const saved = localStorage.getItem("kv-catalog-clients");
  if (saved) {
    try {
      window.AppState.clients = JSON.parse(saved);
    } catch (e) {
      window.AppState.clients = [];
    }
  } else {
    window.AppState.clients = [];
    saveClientsToStorage();
  }
}

function saveClientsToStorage() {
  localStorage.setItem("kv-catalog-clients", JSON.stringify(window.AppState.clients));
}

function loadQuotationsFromStorage() {
  const saved = localStorage.getItem("kv-catalog-quotations");
  if (saved) {
    try {
      window.AppState.quotations = JSON.parse(saved);
    } catch (e) {
      window.AppState.quotations = [];
    }
  }
}

function saveQuotationsToStorage() {
  localStorage.setItem("kv-catalog-quotations", JSON.stringify(window.AppState.quotations));
}

function generateQuoteFolio() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const todayQuotes = window.AppState.quotations.filter(q => q.id.includes(dateStr));
  const seq = String(todayQuotes.length + 1).padStart(3, '0');
  return `KV-${dateStr}-${seq}`;
}

function normalizeJsonProduct(p) {
  if (!p) return null;
  if (p.hasOwnProperty('barcodeType')) return p;

  let cat = p["Código de categoría"] || p.categoriaCodigo || "other";
  if (cat === 1 || cat === "1") cat = "01";
  if (cat === 2 || cat === "2") cat = "02";
  if (cat === 3 || cat === "3") cat = "03";

  const readBool = (value) => value === true || value === 1 || value === "1" || value === "true";

  return {
    id: String(p["Código"] || p.codigo || p.id),
    nombre: p["Nombre"] || p.nombre || "",
    codigo: String(p["Código"] || p.codigo || ""),
    barcodeType: p["Clase de Código de barras"] || p.barcodeType || "code128",
    marca: p["Marca"] || p.marca || "Generales",
    categoriaCodigo: cat,
    unitCode: p["unit code"] || p.unitCode || "Pieza",
    costo: parseFloat(p["Costo"] || p.costo) || 0,
    precio: parseFloat(p["Precio"] || p.precio) || 0,
    alertaCantidad: parseFloat(p["Cantidad de alerta"] || p.alertaCantidad) || 0,
    tasaImpuesto: p["Tasa de impuestos"] || p.tasaImpuesto || "IVA",
    metodoImpuesto: p["Método de impuestos"] || p.metodoImpuesto || "Exclusivo",
    imagen: (function(){
        const img = p["Imagen"] || p.imagen || "no_image.png";
        if (img.startsWith('http')) return img;
        return (window.Config && window.Config.IMAGE_BASE_URL ? window.Config.IMAGE_BASE_URL : "") + img;
    })(),
    subCategoria: p["Código de la Sub categoría"] || p.subCategoria || "",
    descripcion: p["Producto de campo personalizado 1"] || p.descripcion || "",
    especificaciones: p["Producto Campo Personalizadoo 2"] || p.especificaciones || "",
    especial3: p["Producto Campo Personalizadoo 3"] || p.especial3 || "",
    especial4: p["Producto Campo Personalizadoo 4"] || p.especial4 || "",
    especial5: p["Producto Campo Personalizadoo 5"] || p.especial5 || "",
    especial6: p["Producto Campo Personalizadoo 6"] || p.especial6 || "",
    envioWeb: parseFloat(p["envio_web"] || p.envioWeb) || 0,
    featured: readBool(p["Mostrar en página de inicio"] ?? p.featured),
    hidePos: readBool(p["Ocultar en POS"] ?? p.hidePos),
    hideStore: readBool(p["Ocultar en tienda"] ?? p.hideStore),
    stock: parseFloat(p["Cantidad"] || p.stock) || 0,
    airtable_id: p.airtable_id || null,
    sync_status: p.sync_status || "pending",
    updatedAt: p.updatedAt || new Date().toISOString()
  };
}
