/**
 * storage.js
 * Persistent localStorage CRUD operations and normalization utilities.
 */

function deduplicateProducts(products) {
  const seen = new Set();
  return products.filter(p => {
    const code = p.codigo || p["Código"] || "";
    if (seen.has(code)) return false;
    seen.add(code);
    return true;
  });
}

async function loadProductsFromStorage() {
  const saved = localStorage.getItem("kv-catalog-products");
  if (saved) {
    try {
      window.AppState.products = JSON.parse(saved);
      const before = window.AppState.products.length;
      window.AppState.products = deduplicateProducts(window.AppState.products);
      if (before !== window.AppState.products.length) {
        console.log(`Deduplicated products: ${before} → ${window.AppState.products.length}`);
        localStorage.setItem("kv-catalog-products", JSON.stringify(window.AppState.products));
      }
    } catch (err) {
      console.error("Failed to parse local catalog database:", err);
      window.AppState.products = [];
    }
  } else {
    // Attempt auto-import from backup JSON if LocalStorage is empty
    try {
      if (window.SyncManager && typeof window.SyncManager.loadFromLocalJSON === "function") {
        const raw = await window.SyncManager.loadFromLocalJSON();
        if (raw && raw.length > 0) {
          window.AppState.products = raw.map(normalizeJsonProduct);
          window.AppState.products = deduplicateProducts(window.AppState.products);
          localStorage.setItem("kv-catalog-products", JSON.stringify(window.AppState.products));
          console.log(`SyncManager: Auto-imported ${window.AppState.products.length} products from backup JSON.`);
        } else {
          window.AppState.products = [];
        }
      } else {
        window.AppState.products = [];
      }
    } catch (err) {
      console.warn("Failed to load initial backup JSON:", err);
      window.AppState.products = [];
    }
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
    window.AppState.clients = [
      { id: "C001", nombre: "Juan Pérez", empresa: "Restaurante El Sol", rfc: "PEPJ800101XXX", telefono: "5512345678", correo: "juan@elsol.com", direccion: "Av. Reforma 123, CDMX" },
      { id: "C002", nombre: "María Gómez", empresa: "Pastelería Dulce", rfc: "GOMA900202YYY", telefono: "5587654321", correo: "maria@dulce.com", direccion: "Calle Juárez 456, Monterrey" }
    ];
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
    imagen: p["Imagen"] || p.imagen || "no_image.png",
    subCategoria: p["Código de la Sub categoría"] || p.subCategoria || "",
    descripcion: p["Producto de campo personalizado 1"] || p.descripcion || "",
    especificaciones: p["Producto Campo Personalizadoo 2"] || p.especificaciones || "",
    especial3: p["Producto Campo Personalizadoo 3"] || p.especial3 || "",
    especial4: p["Producto Campo Personalizadoo 4"] || p.especial4 || "",
    especial5: p["Producto Campo Personalizadoo 5"] || p.especial5 || "",
    especial6: p["Producto Campo Personalizadoo 6"] || p.especial6 || "",
    stock: parseFloat(p["Cantidad"] || p.stock) || 0,
    airtable_id: p.airtable_id || null,
    sync_status: p.sync_status || "pending",
    updatedAt: p.updatedAt || new Date().toISOString()
  };
}
