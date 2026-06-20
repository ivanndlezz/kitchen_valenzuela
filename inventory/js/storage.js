/**
 * storage.js
 * Persistent localStorage CRUD operations and normalization utilities.
 */

const PRODUCT_LEGACY_STORAGE_KEY = "kv-catalog-products";
const PRODUCT_DRAFTS_STORAGE_KEY = "kv-catalog-product-drafts";
const PRODUCT_CLOUD_STORAGE_KEY = "kv-catalog-cloud-products";
const PRODUCT_CLOUD_META_STORAGE_KEY = "kv-catalog-cloud-products-meta";
let productCloudLoadPromise = null;

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

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isDraftProduct(product) {
  return product && (product.status === "draft" || product.sync_status === "draft");
}

function splitProductScopes(products = []) {
  const drafts = [];
  const cloudProducts = [];
  products.filter(Boolean).forEach(product => {
    if (isDraftProduct(product)) {
      drafts.push(product);
    } else {
      cloudProducts.push(product);
    }
  });
  return {
    drafts: deduplicateProducts(drafts),
    cloudProducts: deduplicateProducts(cloudProducts)
  };
}

function getStoredDraftProducts() {
  const storedDrafts = parseStoredProducts(localStorage.getItem(PRODUCT_DRAFTS_STORAGE_KEY));
  if (storedDrafts.length) return storedDrafts.filter(isDraftProduct);

  const legacyProducts = parseStoredProducts(localStorage.getItem(PRODUCT_LEGACY_STORAGE_KEY));
  return legacyProducts.filter(isDraftProduct);
}

function getStoredCloudProducts() {
  const cloudProducts = parseStoredProducts(localStorage.getItem(PRODUCT_CLOUD_STORAGE_KEY));
  if (cloudProducts.length) return cloudProducts.filter(product => !isDraftProduct(product));

  const legacyProducts = parseStoredProducts(localStorage.getItem(PRODUCT_LEGACY_STORAGE_KEY));
  return legacyProducts.filter(product => product && !isDraftProduct(product));
}

function getCloudProductsMeta() {
  try {
    return JSON.parse(localStorage.getItem(PRODUCT_CLOUD_META_STORAGE_KEY) || "{}") || {};
  } catch (err) {
    console.warn("Storage: Failed to parse cloud products metadata:", err);
    return {};
  }
}

function isCloudProductsCacheFresh(meta = getCloudProductsMeta()) {
  return meta.fetchedDate === getLocalDateKey();
}

function saveDraftProductsToStorage(drafts) {
  localStorage.setItem(PRODUCT_DRAFTS_STORAGE_KEY, JSON.stringify(deduplicateProducts(drafts || [])));
}

function saveCloudProductsToStorage(products, metaPatch = {}) {
  const currentMeta = getCloudProductsMeta();
  const cloudProducts = (products || []).filter(product => !isDraftProduct(product));
  const normalizedProducts = window.TaxonomyReconciliation?.normalizeProducts
    ? window.TaxonomyReconciliation.normalizeProducts(cloudProducts)
    : cloudProducts;
  const nextProducts = deduplicateProducts(normalizedProducts);
  const nextMeta = {
    ...currentMeta,
    ...metaPatch,
    count: nextProducts.length,
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(PRODUCT_CLOUD_STORAGE_KEY, JSON.stringify(nextProducts));
  localStorage.setItem(PRODUCT_CLOUD_META_STORAGE_KEY, JSON.stringify(nextMeta));
  window.TaxonomyReconciliation?.run?.(nextProducts);
  return nextProducts;
}

function getProductIdentity(product) {
  if (!product) return "";
  return String(product.airtable_id || product.id || product.codigo || product["Código"] || "").trim();
}

function isSameProduct(a, b) {
  if (!a || !b) return false;
  const aAirtableId = String(a.airtable_id || "").trim();
  const bAirtableId = String(b.airtable_id || "").trim();
  if (aAirtableId && bAirtableId && aAirtableId === bAirtableId) return true;

  const aCode = String(a.codigo || a["Código"] || "").trim();
  const bCode = String(b.codigo || b["Código"] || "").trim();
  if (aCode && bCode && aCode === bCode) return true;

  const aId = getProductIdentity(a);
  const bId = getProductIdentity(b);
  return Boolean(aId && bId && aId === bId);
}

function upsertProduct(products, product) {
  if (!product) return products || [];
  const next = [...(products || [])];
  const index = next.findIndex(item => isSameProduct(item, product));
  if (index === -1) {
    next.push(product);
  } else {
    next[index] = { ...next[index], ...product };
  }
  return deduplicateProducts(next);
}

function mergeProductScopes(drafts, cloudProducts) {
  return deduplicateProducts([...(drafts || []), ...(cloudProducts || [])]);
}

function patchCloudProductCache(product) {
  if (!product || isDraftProduct(product)) return;

  const cloudProducts = upsertProduct(getStoredCloudProducts(), product);
  saveCloudProductsToStorage(cloudProducts, {
    source: "mutation",
    lastPatchedAt: new Date().toISOString()
  });

  if (window.AppState?.products) {
    window.AppState.products = upsertProduct(window.AppState.products, product);
  }
}

function fetchCloudProductRecordsOnce() {
  if (!window.SyncManager || typeof window.SyncManager.fetchAllFromAirtable !== "function") {
    return Promise.resolve([]);
  }
  if (!productCloudLoadPromise) {
    productCloudLoadPromise = window.SyncManager.fetchAllFromAirtable()
      .finally(() => {
        productCloudLoadPromise = null;
      });
  }
  return productCloudLoadPromise;
}

async function loadProductsFromStorage() {
  const storedDrafts = getStoredDraftProducts();
  const cachedCloudProducts = window.TaxonomyReconciliation?.normalizeProducts
    ? window.TaxonomyReconciliation.normalizeProducts(getStoredCloudProducts())
    : getStoredCloudProducts();
  const cloudMeta = getCloudProductsMeta();

  if (cachedCloudProducts.length && isCloudProductsCacheFresh(cloudMeta)) {
    window.AppState.products = mergeProductScopes(storedDrafts, cachedCloudProducts);
    window.AppState.isLoading = false;
    window.TaxonomyReconciliation?.run?.(cachedCloudProducts);
    console.log(`Storage: Loaded ${cachedCloudProducts.length} cloud products from daily cache.`);
    return;
  }

  window.AppState.isLoading = true;

  if (typeof window.renderSkeletons === 'function') {
    window.renderSkeletons(8);
  }

  let loadedFromCloud = false;
  try {
    if (window.SyncManager && typeof window.SyncManager.fetchAllFromAirtable === "function") {
      console.log("Storage: Daily cloud cache is stale; loading products from SHUM/Airtable...");
      const cloudRecords = await fetchCloudProductRecordsOnce();
      if (cloudRecords && cloudRecords.length > 0) {
        const cloudProducts = saveCloudProductsToStorage(cloudRecords.map(rec => window.SyncManager.mapAirtableToLocal(rec)), {
          fetchedAt: new Date().toISOString(),
          fetchedDate: getLocalDateKey(),
          source: "shum"
        });
        window.AppState.products = mergeProductScopes(storedDrafts, cloudProducts);
        console.log(`Storage: Loaded ${cloudProducts.length} products from SHUM/Airtable.`);
        loadedFromCloud = true;
      }
    }
  } catch (err) {
    console.warn("Storage: Failed to refresh SHUM/Airtable products, using local fallback:", err);
  }

  if (!loadedFromCloud && cachedCloudProducts.length) {
    window.AppState.products = mergeProductScopes(storedDrafts, cachedCloudProducts);
    console.log(`Storage: Using stale cloud cache with ${cachedCloudProducts.length} products.`);
    loadedFromCloud = true;
  }

  if (!loadedFromCloud) {
    try {
      if (window.SyncManager && typeof window.SyncManager.loadFromLocalJSON === "function") {
        const raw = await window.SyncManager.loadFromLocalJSON();
        if (raw && raw.length > 0) {
          const jsonProducts = saveCloudProductsToStorage(raw.map(normalizeJsonProduct), {
            fetchedAt: new Date().toISOString(),
            fetchedDate: getLocalDateKey(),
            source: "json"
          });
          window.AppState.products = mergeProductScopes(storedDrafts, jsonProducts);
          console.log(`Storage: Fallback — imported ${jsonProducts.length} products from backup JSON.`);
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

function saveProductsToStorage() {
  const products = window.AppState.products || [];
  const { drafts, cloudProducts } = splitProductScopes(products);

  saveDraftProductsToStorage(drafts);
  saveCloudProductsToStorage(cloudProducts);
  localStorage.setItem(PRODUCT_LEGACY_STORAGE_KEY, JSON.stringify(mergeProductScopes(drafts, cloudProducts)));

  if (typeof calculateMetrics === "function") calculateMetrics();
  if (typeof populateBrandFilter === "function") populateBrandFilter();
  if (typeof applyFilters === "function") applyFilters();
}

window.ProductCloudCache = {
  getProducts: getStoredCloudProducts,
  getMeta: getCloudProductsMeta,
  isFresh: isCloudProductsCacheFresh,
  patch: patchCloudProductCache,
  saveProducts: saveCloudProductsToStorage
};

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

  const customFields = [1, 2, 3, 4, 5, 6]
    .map((n) => ({
      name: p[`cf${n}_name`] || p.customFields?.[n - 1]?.name || "",
      value: p[`cf${n}_data`] || p.customFields?.[n - 1]?.value || "",
    }))
    .filter((field) => field.name || field.value);

  return {
    id: String(p["Código"] || p.codigo || p.id),
    nombre: p["Nombre"] || p.nombre || "",
    codigo: String(p["Código"] || p.codigo || ""),
    barcodeType: p["Clase de Código de barras"] || p.barcodeType || "code128",
    marca: p["Marca"] || p.marca || "Generales",
    categoriaCodigo: cat,
    unitCode: p["unit code"] || p.unitCode || "Pieza",
    saleUnitCode: p["Venta unit code"] || p.saleUnitCode || p["unit code"] || p.unitCode || "Pieza",
    purchaseUnitCode: p["Comprar unit code"] || p.purchaseUnitCode || p["unit code"] || p.unitCode || "Pieza",
    costo: parseFloat(p["Costo"] || p.costo) || 0,
    precio: parseFloat(p["Precio"] || p.precio) || 0,
    currency: String(p["currency"] || p.currency || "MXN").toUpperCase() === "USD" ? "USD" : "MXN",
    exchangeRate: parseFloat(p["exchange_rate"] || p.exchangeRate) || 1,
    quoteCurrency: String(p["quote_currency"] || p.quoteCurrency || p["currency"] || p.currency || "MXN").toUpperCase() === "USD" ? "USD" : "MXN",
    quoteExchangeRate: parseFloat(p["quote_exchange_rate"] || p.quoteExchangeRate || p["exchange_rate"] || p.exchangeRate) || 1,
    alertaCantidad: parseFloat(p["Cantidad de alerta"] || p.alertaCantidad) || 0,
    weight: parseFloat(p.weight || p["weight"] || p["Peso"]) || 0,
    length: parseFloat(p.length || p["length"] || p["Largo"]) || 0,
    width: parseFloat(p.width || p["width"] || p["Ancho"]) || 0,
    height: parseFloat(p.height || p["height"] || p["Alto"]) || 0,
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
    customFields,
    cf1_name: p["cf1_name"] || p.cf1_name || "",
    cf1_data: p["cf1_data"] || p.cf1_data || "",
    cf2_name: p["cf2_name"] || p.cf2_name || "",
    cf2_data: p["cf2_data"] || p.cf2_data || "",
    cf3_name: p["cf3_name"] || p.cf3_name || "",
    cf3_data: p["cf3_data"] || p.cf3_data || "",
    cf4_name: p["cf4_name"] || p.cf4_name || "",
    cf4_data: p["cf4_data"] || p.cf4_data || "",
    cf5_name: p["cf5_name"] || p.cf5_name || "",
    cf5_data: p["cf5_data"] || p.cf5_data || "",
    cf6_name: p["cf6_name"] || p.cf6_name || "",
    cf6_data: p["cf6_data"] || p.cf6_data || "",
    envioWeb: parseFloat(p["envio_web"] || p.envioWeb) || 0,
    webCurrency: String(p["web_currency"] || p.webCurrency || "MXN").toUpperCase() === "USD" ? "USD" : "MXN",
    webExchangeRate: parseFloat(p["web_exchange_rate"] || p.webExchangeRate) || 1,
    featured: readBool(p["Mostrar en página de inicio"] ?? p.featured),
    hidePos: readBool(p["Ocultar en POS"] ?? p.hidePos),
    hideStore: readBool(p["Ocultar en tienda"] ?? p.hideStore),
    stock: parseFloat(p["Cantidad"] || p.stock) || 0,
    warehouseStock: p.warehouseStock && typeof p.warehouseStock === "object" ? p.warehouseStock : {},
    airtable_id: p.airtable_id || null,
    sync_status: p.sync_status || "pending",
    updatedAt: p.updatedAt || new Date().toISOString()
  };
}
