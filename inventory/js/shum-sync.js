/**
 * shum-sync.js
 * SyncManager engine for remote Airtable API connections, local backup JSON,
 * and standard LocalStorage catalog synchronization. Also renders the Comparative Sync Panel.
 */

window.SyncManager = {
  config: {
    endpoint: "https://klef.newfacecards.com/shum-api/api.php",
    baseId: "apppjeEy9lY65U4On",
    table: "products",
    jsonUrl: "./data/kv_products_2026_05_05_19_31_43.json",
    saveServerUrl: "http://localhost:8765/save_inventory",
    priority: "airtable", // "airtable" > "local" > "json"
    quotes: {
      endpoint: "https://klef.newfacecards.com/shum-api/api.php",
      baseId: "appSVqxolsBlPACLH",
      table: "quotes",
      jsonBackupTable: "quote_backups"
    }
  },

  async shumRequest(action, params) {
    try {
      const response = await fetch(this.config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...params })
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "API request failed");
      }
      return result.data;
    } catch (error) {
      console.error("SHUM API Error:", error);
      throw error;
    }
  },

  mapLocalToAirtable(p) {
    return {
      "Nombre": p.nombre || "",
      "Código": String(p.codigo || ""),
      "Clase de Código de barras": p.barcodeType || "code128",
      "Marca": p.marca || "Generales",
      "Código de categoría": p.categoriaCodigo === "01" ? 1 : (p.categoriaCodigo === "02" ? 2 : (p.categoriaCodigo === "03" ? 3 : 0)),
      "unit code": p.unitCode || "Pieza",
      "Venta unit code": p.unitCode || "Pieza",
      "Comprar unit code": p.unitCode || "Pieza",
      "Costo": Number(p.costo) || 0,
      "Precio": Number(p.precio) || 0,
      "Cantidad de alerta": Number(p.alertaCantidad) || 0,
      "Tasa de impuestos": p.tasaImpuesto || "IVA",
      "Método de impuestos": p.metodoImpuesto || "Exclusivo",
      "Imagen": p.imagen || "no_image.png",
      "Código de la Sub categoría": p.subCategoria || "",
      "Producto de campo personalizado 1": p.descripcion || "",
      "Producto Campo Personalizadoo 2": p.especificaciones || "",
      "Producto Campo Personalizadoo 3": p.especial3 || "",
      "Producto Campo Personalizadoo 4": p.especial4 || "",
      "Producto Campo Personalizadoo 5": p.especial5 || "",
      "Producto Campo Personalizadoo 6": p.especial6 || "",
      "Cantidad": Number(p.stock) || 0
    };
  },

  mapAirtableToLocal(rec) {
    const f = rec.fields || {};
    const id = rec.id;
    const code = f["Código"] || "";
    
    let cat = "other";
    const airtableCat = f["Código de categoría"];
    if (airtableCat === 1 || airtableCat === "01" || airtableCat === "1") cat = "01";
    else if (airtableCat === 2 || airtableCat === "02" || airtableCat === "2") cat = "02";
    else if (airtableCat === 3 || airtableCat === "03" || airtableCat === "3") cat = "03";

    return {
      id: code || id,
      nombre: f["Nombre"] || "",
      codigo: code,
      barcodeType: f["Clase de Código de barras"] || "code128",
      marca: f["Marca"] || "Generales",
      categoriaCodigo: cat,
      unitCode: f["unit code"] || "Pieza",
      costo: Number(f["Costo"]) || 0,
      precio: Number(f["Precio"]) || 0,
      alertaCantidad: Number(f["Cantidad de alerta"]) || 0,
      tasaImpuesto: f["Tasa de impuestos"] || "IVA",
      metodoImpuesto: f["Método de impuestos"] || "Exclusivo",
      imagen: f["Imagen"] || "no_image.png",
      subCategoria: f["Código de la Sub categoría"] || "",
      descripcion: f["Producto de campo personalizado 1"] || "",
      especificaciones: f["Producto Campo Personalizadoo 2"] || "",
      especial3: f["Producto Campo Personalizadoo 3"] || "",
      especial4: f["Producto Campo Personalizadoo 4"] || "",
      especial5: f["Producto Campo Personalizadoo 5"] || "",
      especial6: f["Producto Campo Personalizadoo 6"] || "",
      stock: Number(f["Cantidad"]) || 0,
      airtable_id: id,
      sync_status: "synced",
      updatedAt: rec.createdTime || new Date().toISOString()
    };
  },

  mapLocalToAirtableClient(client) {
    return {
      "client_id": client.id || "",
      "contact_name": client.nombre || "",
      "company": client.empresa || "",
      "legal_name": client.legal_name || "",
      "tax_id": client.rfc || "",
      "phone": client.telefono || "",
      "email": client.correo || "",
      "address": client.direccion || "",
      "city": client.ciudad || "",
      "state": client.estado || "",
      "category": client.categoria || "REFACCIONES",
      "industry": client.industry || "",
      "alt_contact": client.alt_contact || "",
      "alt_phone": client.alt_phone || "",
      "alt_email": client.alt_email || "",
      "alt_city": client.alt_city || "",
      "alt_state": client.alt_state || "",
      "purchase_frequency": client.purchase_frequency || "",
      "notes": client.notes || "",
      "column_12": client.column_12 || ""
    };
  },

  mapAirtableToLocalClient(record) {
    const f = record.fields || {};
    return {
      id: (f["client_id"] || record.id || "").replace(/\n/g, ""),
      nombre: (f["contact_name"] || "").replace(/\n/g, ""),
      empresa: (f["company"] || "").replace(/\n/g, ""),
      legal_name: (f["legal_name"] || "").replace(/\n/g, ""),
      rfc: (f["tax_id"] || "").replace(/\n/g, ""),
      telefono: (f["phone"] || "").replace(/\n/g, ""),
      correo: (f["email"] || "").replace(/\n/g, ""),
      direccion: (f["address"] || "").replace(/\n/g, ""),
      ciudad: (f["city"] || "").replace(/\n/g, ""),
      estado: (f["state"] || "").replace(/\n/g, ""),
      categoria: (f["category"] || "").replace(/\n/g, ""),
      industry: (f["industry"] || "").replace(/\n/g, ""),
      alt_contact: (f["alt_contact"] || "").replace(/\n/g, ""),
      alt_phone: (f["alt_phone"] || "").replace(/\n/g, ""),
      alt_email: (f["alt_email"] || "").replace(/\n/g, ""),
      alt_city: (f["alt_city"] || "").replace(/\n/g, ""),
      alt_state: (f["alt_state"] || "").replace(/\n/g, ""),
      purchase_frequency: (f["purchase_frequency"] || "").replace(/\n/g, ""),
      notes: (f["notes"] || "").replace(/\n/g, ""),
      column_12: (f["column_12"] || "").replace(/\n/g, ""),
      airtable_id: record.id,
      sync_status: "synced",
      updatedAt: record.createdTime || new Date().toISOString()
    };
  },

  async fetchAllClientsFromAirtable() {
    let allRecords = [];
    let offset = null;
    let pages = 0;
    const maxPages = 20;
    const seenIds = new Set();

    do {
      const params = {
        baseId: this.config.baseId,
        table: window.Config.CLIENTS_TABLE || "clients"
      };
      if (offset) {
        params.offset = offset;
      }
      const result = await this.shumRequest("list", params);
      const records = result && result.records ? result.records : [];
      const newRecords = records.filter(rec => {
        if (seenIds.has(rec.id)) return false;
        seenIds.add(rec.id);
        return true;
      });
      allRecords = allRecords.concat(newRecords);
      offset = result && result.offset ? result.offset : null;
      pages++;
      if (records.length > 0 && newRecords.length === 0) {
        break;
      }
    } while (offset && pages < maxPages);

    return allRecords;
  },

  async syncClient(client) {
    const mapped = this.mapLocalToAirtableClient(client);
    let result;

    // Auto-reconcile check: search by client_id/id if airtable_id is missing
    if (!client.airtable_id) {
      try {
        const listRes = await this.shumRequest("list", {
          baseId: this.config.baseId,
          table: window.Config.CLIENTS_TABLE || "clients",
          filter: {
            filterByFormula: `{client_id} = '${client.id}'`
          }
        });
        const records = listRes && listRes.records ? listRes.records : [];
        if (records.length > 0 && records[0].id) {
          client.airtable_id = records[0].id;
          console.log("SyncManager: Auto-linked client via ID:", client.id, "to Airtable ID:", client.airtable_id);
        }
      } catch (e) {
        console.warn("SyncManager: Failed to reconcile client by ID", e);
      }
    }

    if (client.airtable_id) {
      result = await this.shumRequest("update", {
        baseId: this.config.baseId,
        table: window.Config.CLIENTS_TABLE || "clients",
        recordId: client.airtable_id,
        data: mapped
      });
    } else {
      result = await this.shumRequest("create", {
        baseId: this.config.baseId,
        table: window.Config.CLIENTS_TABLE || "clients",
        data: mapped
      });
      if (result && result.id) {
        client.airtable_id = result.id;
      }
    }

    client.sync_status = "synced";
    client.updatedAt = new Date().toISOString();
    return result;
  },

  async deleteClientFromAirtable(airtableId) {
    return await this.shumRequest("delete", {
      baseId: this.config.baseId,
      table: window.Config.CLIENTS_TABLE || "clients",
      recordId: airtableId
    });
  },

  async fetchAllFromAirtable() {
    let allRecords = [];
    let offset = null;
    let pages = 0;
    const maxPages = 20;
    const seenIds = new Set();

    do {
      const params = {
        baseId: this.config.baseId,
        table: this.config.table
      };
      if (offset) {
        params.offset = offset;
      }
      const result = await this.shumRequest("list", params);
      const records = result && result.records ? result.records : [];
      const newRecords = records.filter(rec => {
        if (seenIds.has(rec.id)) return false;
        seenIds.add(rec.id);
        return true;
      });
      allRecords = allRecords.concat(newRecords);
      offset = result && result.offset ? result.offset : null;
      pages++;
      if (records.length > 0 && newRecords.length === 0) {
        break;
      }
    } while (offset && pages < maxPages);

    return allRecords;
  },

  async syncProduct(p) {
    const mapped = this.mapLocalToAirtable(p);
    let result;

    // Auto-reconcile check: search by SKU if airtable_id is missing
    if (!p.airtable_id) {
      try {
        const listRes = await this.shumRequest("list", {
          baseId: this.config.baseId,
          table: this.config.table,
          filter: {
            filterByFormula: `{Código} = '${p.codigo}'`
          }
        });
        const records = listRes && listRes.records ? listRes.records : [];
        if (records.length > 0 && records[0].id) {
          p.airtable_id = records[0].id;
          console.log("SyncManager: Auto-linked product via SKU:", p.codigo, "to Airtable ID:", p.airtable_id);
        }
      } catch (e) {
        console.warn("SyncManager: Failed to reconcile by SKU", e);
      }
    }

    if (p.airtable_id) {
      result = await this.shumRequest("update", {
        baseId: this.config.baseId,
        table: this.config.table,
        recordId: p.airtable_id,
        data: mapped
      });
    } else {
      result = await this.shumRequest("create", {
        baseId: this.config.baseId,
        table: this.config.table,
        data: mapped
      });
      if (result && result.id) {
        p.airtable_id = result.id;
      }
    }

    p.sync_status = "synced";
    p.updatedAt = new Date().toISOString();
    return result;
  },

  async deleteFromAirtable(airtableId) {
    return await this.shumRequest("delete", {
      baseId: this.config.baseId,
      table: this.config.table,
      recordId: airtableId
    });
  },

  async saveToLocalJSON(products) {
    try {
      const response = await fetch(this.config.saveServerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(products)
      });
      return response.ok;
    } catch (e) {
      console.warn("SyncManager: Save server not reachable", e);
      return false;
    }
  },

  async loadFromLocalJSON() {
    try {
      const response = await fetch(this.config.jsonUrl + "?t=" + Date.now());
      if (!response.ok) return [];
      return await response.json();
    } catch (e) {
      console.warn("SyncManager: Could not load JSON file", e);
      return [];
    }
  },

  mapLocalToAirtableQuote(quote) {
    const toDate = (v) => v ? v.slice(0, 10) : null;
    return {
      "quote_id": quote.id,
      "status": quote.status,
      "client_id": quote.clientId || "",
      "created_at": toDate(quote.createdAt),
      "updated_at": toDate(quote.updatedAt),
      "sent_at": toDate(quote.sentAt),
      "reserved_at": toDate(quote.reservedAt),
      "current_step": quote.currentStep || 1,
      "items_json": JSON.stringify(quote.items || []),
      "subtotal": Number(quote.subtotal) || 0,
      "tax": Number(quote.tax) || 0,
      "total": Number(quote.total) || 0
    };
  },

  mapAirtableToLocalQuote(record) {
    const f = record.fields || {};
    return {
      id: f["quote_id"] || record.id,
      status: f["status"] || "draft",
      clientId: f["client_id"] || "",
      createdAt: f["created_at"] || new Date().toISOString(),
      updatedAt: f["updated_at"] || new Date().toISOString(),
      sentAt: f["sent_at"] || null,
      reservedAt: f["reserved_at"] || null,
      currentStep: Number(f["current_step"]) || 1,
      items: f["items_json"] ? JSON.parse(f["items_json"]) : [],
      subtotal: Number(f["subtotal"]) || 0,
      tax: Number(f["tax"]) || 0,
      total: Number(f["total"]) || 0,
      airtable_id: record.id,
      sync_status: "synced"
    };
  },

  async fetchAllQuotesFromAirtable() {
    let allRecords = [];
    let offset = null;
    let pages = 0;
    const maxPages = 20;
    const seenIds = new Set();

    do {
      const params = {
        baseId: this.config.quotes.baseId,
        table: this.config.quotes.table
      };
      if (offset) {
        params.offset = offset;
      }
      const result = await this.shumRequest("list", params);
      const records = result && result.records ? result.records : [];
      const newRecords = records.filter(rec => {
        if (seenIds.has(rec.id)) return false;
        seenIds.add(rec.id);
        return true;
      });
      allRecords = allRecords.concat(newRecords);
      offset = result && result.offset ? result.offset : null;
      pages++;
      if (records.length > 0 && newRecords.length === 0) {
        break;
      }
    } while (offset && pages < maxPages);

    return allRecords;
  },

  async syncQuote(quote) {
    const mapped = this.mapLocalToAirtableQuote(quote);
    let result;

    if (!quote.airtable_id) {
      try {
        const listRes = await this.shumRequest("list", {
          baseId: this.config.quotes.baseId,
          table: this.config.quotes.table,
          filter: {
            filterByFormula: `{quote_id} = '${quote.id}'`
          }
        });
        const records = listRes && listRes.records ? listRes.records : [];
        if (records.length > 0 && records[0].id) {
          quote.airtable_id = records[0].id;
          console.log("SyncManager: Auto-linked quote via ID:", quote.id, "to Airtable ID:", quote.airtable_id);
        }
      } catch (e) {
        console.warn("SyncManager: Failed to reconcile quote by ID", e);
      }
    }

    if (quote.airtable_id) {
      try {
        result = await this.shumRequest("update", {
          baseId: this.config.quotes.baseId,
          table: this.config.quotes.table,
          recordId: quote.airtable_id,
          data: mapped
        });
      } catch (err) {
        if (err.message && err.message.includes("does not exist")) {
          console.warn("SyncManager: Record ID no longer exists on Airtable. Recreating...");
          quote.airtable_id = null;
          result = await this.shumRequest("create", {
            baseId: this.config.quotes.baseId,
            table: this.config.quotes.table,
            data: mapped
          });
          if (result && result.id) {
            quote.airtable_id = result.id;
          }
        } else {
          throw err;
        }
      }
    } else {
      result = await this.shumRequest("create", {
        baseId: this.config.quotes.baseId,
        table: this.config.quotes.table,
        data: mapped
      });
      if (result && result.id) {
        quote.airtable_id = result.id;
      }
    }

    quote.sync_status = "synced";
    quote.updatedAt = new Date().toISOString();
    return result;
  },

  async deleteQuoteFromAirtable(airtableId) {
    return await this.shumRequest("delete", {
      baseId: this.config.quotes.baseId,
      table: this.config.quotes.table,
      recordId: airtableId
    });
  }
};

let localSyncData = [];
let jsonSyncData = [];
let cloudSyncData = [];
let syncActiveFilter = 'all';

function setupSyncUI() {
  const syncBtn = document.getElementById("sync-btn");
  const sheetSyncBtn = document.getElementById("sync-btn-sheet");
  const syncCloseBtn = document.getElementById("sync-close-btn");
  const bulkCloudBtn = document.getElementById("bulk-cloud-btn");
  const bulkSyncBtn = document.getElementById("bulk-sync-btn");
  const syncFilterTabs = document.getElementById("sync-filter-tabs");
  const compareSheetCloseBtn = document.getElementById("compare-sheet-close-btn");
  const compareSheetScrim = document.getElementById("compare-sheet-scrim");

  if (!syncBtn) return;

  syncBtn.addEventListener("click", openSyncModal);
  if (sheetSyncBtn) sheetSyncBtn.addEventListener("click", openSyncModal);
  syncCloseBtn.addEventListener("click", closeSyncModal);
  bulkCloudBtn.addEventListener("click", handleBulkCloudToJSON);
  bulkSyncBtn.addEventListener("click", handleBulkSyncToCloud);
  
  compareSheetCloseBtn.addEventListener("click", closeCompareSheet);
  compareSheetScrim.addEventListener("click", closeCompareSheet);

  // Tab selectors
  syncFilterTabs.querySelectorAll("[data-sync-filter]").forEach(tab => {
    tab.addEventListener("click", () => {
      syncFilterTabs.querySelectorAll(".sync-tab").forEach(t => t.classList.remove("sync-tab--active"));
      tab.classList.add("sync-tab--active");
      syncActiveFilter = tab.dataset.syncFilter;
      renderSyncTable();
    });
  });
}

function openSyncModal() {
  const syncModal = document.getElementById("sync-modal");
  syncModal.classList.add("sync-modal--active");
  window.DOM.scrim.classList.add("drawer__scrim--active");
  
  // Start loading data
  loadAllSyncSources();
}

function closeSyncModal() {
  const syncModal = document.getElementById("sync-modal");
  syncModal.classList.remove("sync-modal--active");
  window.DOM.scrim.classList.remove("drawer__scrim--active");
  
  // Reload main view to reflect changes
  if (typeof calculateMetrics === "function") calculateMetrics();
  if (typeof populateBrandFilter === "function") populateBrandFilter();
  if (typeof applyFilters === "function") applyFilters();
}

async function loadAllSyncSources() {
  const loader = document.getElementById("sync-loading");
  const wrapper = document.getElementById("sync-table-wrapper");
  
  loader.style.display = "flex";
  wrapper.style.display = "none";

  try {
    // 1. Local
    localSyncData = window.AppState.products;

    // 2. JSON Backup
    const rawJson = await window.SyncManager.loadFromLocalJSON();
    jsonSyncData = rawJson.map(normalizeJsonProduct);

    // 3. Cloud Airtable
    const rawCloud = await window.SyncManager.fetchAllFromAirtable();
    cloudSyncData = rawCloud.map(rec => window.SyncManager.mapAirtableToLocal(rec));

    renderSyncTable();
  } catch (err) {
    console.error(err);
    showToast("Error al conectar con la Nube / JSON local.", "danger");
    
    // Fallback render
    renderSyncTable();
  } finally {
    loader.style.display = "none";
    wrapper.style.display = "block";
  }
}

function buildMasterIndex() {
  const map = new Map();
  const addEntry = (code, source, record) => {
    const clean = String(code).trim();
    if (!clean) return;
    if (!map.has(clean)) {
      map.set(clean, { code: clean, local: null, json: null, airtable: null });
    }
    map.get(clean)[source] = record;
  };

  localSyncData.forEach(r => addEntry(r.codigo, 'local', r));
  jsonSyncData.forEach(r => addEntry(r.codigo, 'json', r));
  cloudSyncData.forEach(r => addEntry(r.codigo, 'airtable', r));

  return Array.from(map.values());
}

function getSyncStatus(row) {
  const hasLocal = !!row.local;
  const hasJson = !!row.json;
  const hasCloud = !!row.airtable;

  if (hasLocal && hasJson && hasCloud) {
    if (hasDiscrepancy(row, 'nombre') || hasDiscrepancy(row, 'precio') || hasDiscrepancy(row, 'stock') || hasDiscrepancy(row, 'marca')) {
      return { label: 'Conflicto', type: 'conflicts' };
    }
    return { label: 'Sincronizado', type: 'synced' };
  }
  if (hasLocal && hasJson && !hasCloud) return { label: 'Sin Nube', type: 'pending' };
  if (hasLocal && !hasJson && hasCloud) return { label: 'Sin JSON', type: 'no-json' };
  if (!hasLocal && hasJson && !hasCloud) return { label: 'Solo JSON', type: 'json-only' };
  if (hasLocal && !hasJson && !hasCloud) return { label: 'Solo Local', type: 'local-only' };
  if (!hasLocal && !hasJson && hasCloud) return { label: 'Solo Nube', type: 'cloud-only' };
  return { label: 'Desconocido', type: 'unknown' };
}

function getFieldVal(r, fieldKey) {
  if (!r) return null;
  return r[fieldKey] !== undefined ? r[fieldKey] : null;
}

function hasDiscrepancy(row, fieldKey) {
  const vals = [];
  if (row.local) vals.push(getFieldVal(row.local, fieldKey));
  if (row.json) vals.push(getFieldVal(row.json, fieldKey));
  if (row.airtable) vals.push(getFieldVal(row.airtable, fieldKey));

  const presentVals = vals.filter(v => v !== null && v !== undefined);
  if (presentVals.length <= 1) return false;

  const first = String(presentVals[0]).trim().toLowerCase();
  return presentVals.some(v => String(v).trim().toLowerCase() !== first);
}

function renderSyncTable() {
  const tbody = document.getElementById("sync-tbody");
  const master = buildMasterIndex();
  
  // Global counts
  const total = master.length;
  const synced = master.filter(r => getSyncStatus(r).type === 'synced').length;
  const pending = master.filter(r => {
    const type = getSyncStatus(r).type;
    return type === 'pending' || type === 'local-only' || type === 'no-json';
  }).length;
  const conflicts = master.filter(r => getSyncStatus(r).type === 'conflicts').length;
  const localOnly = master.filter(r => getSyncStatus(r).type === 'local-only').length;

  // Update badge elements
  const bAll = document.getElementById("sync-badge-all");
  const bSynced = document.getElementById("sync-badge-synced");
  const bPending = document.getElementById("sync-badge-pending");
  const bConflicts = document.getElementById("sync-badge-conflicts");
  const bLocalOnly = document.getElementById("sync-badge-local-only");
  
  if (bAll) bAll.textContent = total;
  if (bSynced) bSynced.textContent = synced;
  if (bPending) bPending.textContent = pending;
  if (bConflicts) bConflicts.textContent = conflicts;
  if (bLocalOnly) bLocalOnly.textContent = localOnly;

  // Counter boards
  const cLocal = document.getElementById("sync-count-local");
  const cJson = document.getElementById("sync-count-json");
  const cCloud = document.getElementById("sync-count-cloud");

  if (cLocal) cLocal.textContent = localSyncData.length;
  if (cJson) cJson.textContent = jsonSyncData.length;
  if (cCloud) cCloud.textContent = cloudSyncData.length;

  const summaryCards = document.getElementById("sync-summary");
  if (summaryCards) {
    summaryCards.innerHTML = `
      <div class="sync-card">
        <div class="sync-card__value">${total}</div>
        <div class="sync-card__label">Total únicos</div>
      </div>
      <div class="sync-card">
        <div class="sync-card__value" style="color: var(--color-success);">${synced}</div>
        <div class="sync-card__label">Sincronizados</div>
      </div>
      <div class="sync-card">
        <div class="sync-card__value" style="color: var(--color-warning);">${pending}</div>
        <div class="sync-card__label">Sin Nube</div>
      </div>
      <div class="sync-card">
        <div class="sync-card__value" style="color: var(--color-danger);">${conflicts}</div>
        <div class="sync-card__label">Conflictos</div>
      </div>
    `;
  }

  // Filter list
  let rows = master;
  if (syncActiveFilter === 'synced') {
    rows = master.filter(r => getSyncStatus(r).type === 'synced');
  } else if (syncActiveFilter === 'pending') {
    rows = master.filter(r => {
      const type = getSyncStatus(r).type;
      return type === 'pending' || type === 'local-only' || type === 'no-json';
    });
  } else if (syncActiveFilter === 'conflicts') {
    rows = master.filter(r => getSyncStatus(r).type === 'conflicts');
  } else if (syncActiveFilter === 'local-only') {
    rows = master.filter(r => getSyncStatus(r).type === 'local-only');
  }

  if (rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 48px; color: var(--text-secondary);">
          No hay registros para mostrar con el filtro activo.
        </td>
      </tr>
    `;
    return;
  }

  let html = "";
  rows.forEach(row => {
    const r = row.local || row.json || row.airtable;
    const status = getSyncStatus(row);
    const name = r.nombre || "Equipo sin nombre";
    const sku = row.code;
    const brand = r.marca || "Generales";
    const price = r.precio ? `$${r.precio.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : "—";
    const stock = r.stock !== undefined ? r.stock : "—";

    const hasLocal = !!row.local;
    const hasJson = !!row.json;
    const hasCloud = !!row.airtable;

    const conflictClass = status.type === 'conflicts' ? 'class="has-conflict"' : '';

    html += `
      <tr ${conflictClass} data-compare-sku="${sku}">
        <td>
          <div style="font-weight:600; color:var(--text-main);">${name}</div>
          <div style="font-size:11px; font-family:monospace; color:var(--text-secondary); margin-top:2px;">SKU: ${sku}</div>
        </td>
        <td>${brand}</td>
        <td class="center">${hasLocal ? '<span class="check-yes">✓</span>' : '<span class="check-no">✗</span>'}</td>
        <td class="center">${hasJson ? '<span class="check-yes">✓</span>' : '<span class="check-no">✗</span>'}</td>
        <td class="center">${hasCloud ? '<span class="check-yes">✓</span>' : '<span class="check-no">✗</span>'}</td>
        <td>
          <span class="sync-badge sync-badge--${status.type}">${status.label}</span>
        </td>
        <td class="right">${price}</td>
        <td class="right">${stock}</td>
      </tr>
    `;
  });

  tbody.innerHTML = html;
  createLucideIcons();

  // Event delegation to open compare row sheet
  tbody.querySelectorAll("tr[data-compare-sku]").forEach(tr => {
    tr.addEventListener("click", () => {
      const sku = tr.dataset.compareSku;
      openCompareSheet(sku);
    });
  });
}

function openCompareSheet(sku) {
  const master = buildMasterIndex();
  const row = master.find(r => r.code === sku);
  if (!row) return;

  const overlay = document.getElementById("compare-sheet-overlay");
  const body = document.getElementById("compare-sheet-body");
  if (!overlay || !body) return;
  
  const r = row.local || row.json || row.airtable;
  const status = getSyncStatus(row);
  const name = r.nombre || "Equipo sin nombre";

  let fieldsHTML = "";
  const fieldsToCompare = [
    { key: "codigo", label: "SKU / Código" },
    { key: "nombre", label: "Nombre" },
    { key: "marca", label: "Marca" },
    { key: "precio", label: "Precio de Venta", format: v => v !== null ? `$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : "—" },
    { key: "costo", label: "Costo Neto", format: v => v !== null ? `$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : "—" },
    { key: "stock", label: "Stock / Cantidad" },
    { key: "alertaCantidad", label: "Alerta Mínima" },
    { key: "unitCode", label: "Unidad de Medida" },
    { key: "descripcion", label: "Descripción" },
    { key: "especificaciones", label: "Especificaciones" },
    { key: "especial3", label: "Ubicación / Notas" },
    { key: "especial4", label: "Dimensiones" },
    { key: "especial5", label: "Campo 5" },
    { key: "especial6", label: "Campo 6" }
  ];

  fieldsToCompare.forEach(field => {
    const isConflict = hasDiscrepancy(row, field.key);
    const rowClass = isConflict ? 'class="detail-field-row field-conflict"' : 'class="detail-field-row"';
    
    const getVal = source => {
      const data = row[source];
      if (!data) return '<span class="val-empty">No existe</span>';
      const val = getFieldVal(data, field.key);
      if (val === null || val === "") return "—";
      return field.format ? field.format(val) : val;
    };

    fieldsHTML += `
      <tr ${rowClass}>
        <td style="font-weight:600; color:var(--text-secondary);">
          ${field.label}
          ${isConflict ? '<span class="conflict-indicator" title="Discrepancia detectada"><i data-lucide="alert-triangle"></i></span>' : ""}
        </td>
        <td>${getVal('local')}</td>
        <td>${getVal('json')}</td>
        <td>${getVal('airtable')}</td>
      </tr>
    `;
  });

  let actionsHTML = "";
  // 1. Upload to Airtable
  if (row.local) {
    actionsHTML += `
      <button class="sheet-action-btn action-airtable" id="action-sync-cloud">
        <i data-lucide="cloud-lightning"></i> ${row.airtable ? 'Re-subir a Nube' : 'Subir a Airtable'}
      </button>
    `;
  }

  // 2. Save JSON Local
  if (row.local) {
    actionsHTML += `
      <button class="sheet-action-btn action-json" id="action-sync-json">
        <i data-lucide="file-check"></i> Respaldo JSON Local
      </button>
    `;
  }

  // 3. Overwrite Local with Cloud
  if (row.airtable) {
    actionsHTML += `
      <button class="sheet-action-btn highlight-warning" id="action-overwrite-from-cloud">
        <i data-lucide="cloud-download"></i> Nube a Local
      </button>
    `;
  }

  // 4. Overwrite Local with JSON
  if (row.json) {
    actionsHTML += `
      <button class="sheet-action-btn highlight-warning" id="action-overwrite-from-json">
        <i data-lucide="download"></i> JSON a Local
      </button>
    `;
  }

  // 5. Delete everywhere
  actionsHTML += `
    <button class="sheet-action-btn action-delete-product" id="action-delete-everywhere">
      <i data-lucide="trash-2"></i> Eliminar Registro
    </button>
  `;

  body.innerHTML = `
    <div class="sheet-detail-header">
      <div class="sheet-detail-name">${name}</div>
      <div class="sheet-detail-uuid">SKU / ID: ${sku}</div>
      <div style="margin-top: 10px;">
        <span class="sync-badge sync-badge--${status.type}">${status.label}</span>
      </div>
    </div>

    <div class="compare-sheet-table-wrapper">
      <table class="compare-detail-table">
        <thead>
          <tr>
            <th>Campo</th>
            <th>Local</th>
            <th>JSON</th>
            <th>Nube</th>
          </tr>
        </thead>
        <tbody>
          ${fieldsHTML}
        </tbody>
      </table>
    </div>

    <div class="sheet-actions-section">
      <h4 class="sheet-actions-title">Acciones de Resolución</h4>
      <div class="sheet-actions-grid">
        ${actionsHTML}
      </div>
    </div>
  `;

  overlay.classList.add("active");
  createLucideIcons();

  // Action button clicks
  document.getElementById("action-sync-cloud")?.addEventListener("click", async () => {
    await handleSingleSyncToCloud(row.local);
  });
  document.getElementById("action-sync-json")?.addEventListener("click", async () => {
    await handleSingleSyncToJSON(row.local);
  });
  document.getElementById("action-overwrite-from-cloud")?.addEventListener("click", () => {
    handleOverwriteLocal(row.airtable);
  });
  document.getElementById("action-overwrite-from-json")?.addEventListener("click", () => {
    handleOverwriteLocal(row.json);
  });
  document.getElementById("action-delete-everywhere")?.addEventListener("click", async () => {
    await handleDeleteEverywhere(sku, row);
  });
}

function closeCompareSheet() {
  const overlay = document.getElementById("compare-sheet-overlay");
  if (overlay) overlay.classList.remove("active");
}

async function handleSingleSyncToCloud(p) {
  if (!p) return;
  const btn = document.getElementById("action-sync-cloud");
  if (btn) btn.disabled = true;

  try {
    showToast("Sincronizando con Airtable...", "info");
    await window.SyncManager.syncProduct(p);
    localStorage.setItem("kv-catalog-products", JSON.stringify(window.AppState.products));
    showToast("Producto sincronizado con Airtable 🎉", "success");
    
    closeCompareSheet();
    await loadAllSyncSources();
  } catch (e) {
    showToast("Error al sincronizar con Airtable.", "danger");
    if (btn) btn.disabled = false;
  }
}

async function handleSingleSyncToJSON(p) {
  if (!p) return;
  const btn = document.getElementById("action-sync-json");
  if (btn) btn.disabled = true;

  try {
    showToast("Guardando a JSON...", "info");
    
    // Combine local changes
    const newJsonList = [...jsonSyncData];
    const idx = newJsonList.findIndex(x => x.codigo === p.codigo);
    if (idx !== -1) {
      newJsonList[idx] = p;
    } else {
      newJsonList.push(p);
    }

    // Preserve original layout fields compatibility
    const mappedList = newJsonList.map(item => {
      return {
        "Nombre": item.nombre,
        "Código": item.codigo,
        "Clase de Código de barras": item.barcodeType,
        "Marca": item.marca,
        "Código de categoría": item.categoriaCodigo,
        "unit code": item.unitCode,
        "Venta unit code": item.unitCode,
        "Comprar unit code": item.unitCode,
        "Costo": item.costo,
        "Precio": item.precio,
        "Cantidad de alerta": item.alertaCantidad,
        "Tasa de impuestos": item.tasaImpuesto || "IVA",
        "Método de impuestos": item.metodoImpuesto || "Exclusivo",
        "Imagen": item.imagen || "no_image.png",
        "Código de la Sub categoría": item.subCategoria || "",
        "Variantes de producto": "",
        "Producto de campo personalizado 1": item.descripcion,
        "Producto Campo Personalizadoo 2": item.especificaciones,
        "Producto Campo Personalizadoo 3": item.especial3,
        "Producto Campo Personalizadoo 4": item.especial4,
        "Producto Campo Personalizadoo 5": item.especial5,
        "Producto Campo Personalizadoo 6": item.especial6,
        "Cantidad": item.stock
      };
    });

    const saved = await window.SyncManager.saveToLocalJSON(mappedList);
    if (saved) {
      showToast("JSON respaldado con éxito en servidor", "success");
    } else {
      showToast("Servidor local no disponible. Descargando archivo...", "warning");
      triggerJSONDownload(mappedList);
    }

    closeCompareSheet();
    await loadAllSyncSources();
  } catch (e) {
    showToast("Error al respaldar a JSON.", "danger");
    if (btn) btn.disabled = false;
  }
}

function handleOverwriteLocal(sourceRecord) {
  if (!sourceRecord) return;
  if (confirm(`¿Quieres sobrescribir la copia local con esta versión? Perderás cualquier cambio no guardado.`)) {
    const idx = window.AppState.products.findIndex(x => x.codigo === sourceRecord.codigo);
    
    const normalized = normalizeJsonProduct(sourceRecord);
    if (idx !== -1) {
      window.AppState.products[idx] = normalized;
    } else {
      window.AppState.products.push(normalized);
    }
    
    saveProductsToStorage();
    showToast("Caché Local actualizada", "success");
    
    closeCompareSheet();
    loadAllSyncSources();
  }
}

async function handleDeleteEverywhere(sku, row) {
  if (confirm("¿Estás seguro de que deseas eliminar este producto de LocalStorage, JSON local y Airtable?")) {
    try {
      showToast("Eliminando producto...", "info");
      
      // 1. Delete local
      window.AppState.products = window.AppState.products.filter(x => x.codigo !== sku);
      saveProductsToStorage();

      // 2. Delete Airtable
      const airtableId = row.airtable?.airtable_id || row.local?.airtable_id;
      if (airtableId) {
        await window.SyncManager.deleteFromAirtable(airtableId);
      }

      // 3. Delete JSON
      const newJsonList = jsonSyncData.filter(x => x.codigo !== sku);
      const mappedList = newJsonList.map(item => {
        return {
          "Nombre": item.nombre,
          "Código": item.codigo,
          "Clase de Código de barras": item.barcodeType,
          "Marca": item.marca,
          "Código de categoría": item.categoriaCodigo,
          "unit code": item.unitCode,
          "Venta unit code": item.unitCode,
          "Comprar unit code": item.unitCode,
          "Costo": item.costo,
          "Precio": item.precio,
          "Cantidad de alerta": item.alertaCantidad,
          "Tasa de impuestos": item.tasaImpuesto || "IVA",
          "Método de impuestos": item.metodoImpuesto || "Exclusivo",
          "Imagen": item.imagen || "no_image.png",
          "Código de la Sub categoría": item.subCategoria || "",
          "Variantes de producto": "",
          "Producto de campo personalizado 1": item.descripcion,
          "Producto Campo Personalizadoo 2": item.especificaciones,
          "Producto Campo Personalizadoo 3": item.especial3,
          "Producto Campo Personalizadoo 4": item.especial4,
          "Producto Campo Personalizadoo 5": item.especial5,
          "Producto Campo Personalizadoo 6": item.especial6,
          "Cantidad": item.stock
        };
      });

      await window.SyncManager.saveToLocalJSON(mappedList);

      showToast("Producto eliminado de todas las fuentes", "success");
      closeCompareSheet();
      await loadAllSyncSources();
    } catch (err) {
      showToast("Ocurrió un error al eliminar de alguna fuente.", "danger");
    }
  }
}

function triggerJSONDownload(dataList) {
  const jsonString = JSON.stringify(dataList, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "kv_products_2026_05_05_19_31_43.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Bulk sync to Cloud (Airtable)
async function handleBulkSyncToCloud() {
  const unsynced = localSyncData.filter(p => p.sync_status !== 'synced' || !p.airtable_id);
  if (unsynced.length === 0) {
    showToast("Todos los productos locales están sincronizados con la Nube.", "info");
    return;
  }

  const btn = document.getElementById("bulk-sync-btn");
  if (!btn) return;
  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader" class="spinning"></i> Sincronizando...`;
  createLucideIcons();

  let successCount = 0;
  try {
    showToast(`Sincronizando ${unsynced.length} productos con Airtable...`, "info");
    
    const promises = unsynced.map(async p => {
      try {
        await window.SyncManager.syncProduct(p);
        successCount++;
      } catch (err) {
        console.error(`Failed to sync product ${p.codigo}:`, err);
      }
    });

    await Promise.all(promises);
    
    // Save updated local storage
    localStorage.setItem("kv-catalog-products", JSON.stringify(window.AppState.products));
    showToast(`¡Se sincronizaron ${successCount} productos con éxito!`, "success");
    await loadAllSyncSources();
  } catch (err) {
    showToast("Ocurrió un error en la sincronización masiva.", "danger");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="refresh-cw"></i> Sincronizar Todo`;
    createLucideIcons();
  }
}

// Bulk cloud import to JSON Backup
async function handleBulkCloudToJSON() {
  const btn = document.getElementById("bulk-cloud-btn");
  if (!btn) return;
  btn.disabled = true;
  btn.innerHTML = `<i data-lucide="loader" class="spinning"></i> Importando...`;
  createLucideIcons();

  try {
    showToast("Descargando catálogo completo de Airtable...", "info");
    const records = await window.SyncManager.fetchAllFromAirtable();
    
    if (!records || records.length === 0) {
      showToast("No se encontraron registros en Airtable para importar.", "warning");
      return;
    }

    // Convert to flat list backup JSON format
    const flatList = records.map(rec => {
      const f = rec.fields || {};
      return {
        "Nombre": f["Nombre"] || "",
        "Código": f["Código"] || "",
        "Clase de Código de barras": f["Clase de Código de barras"] || "code128",
        "Marca": f["Marca"] || "Generales",
        "Código de categoría": f["Código de categoría"] || "",
        "unit code": f["unit code"] || "Pieza",
        "Venta unit code": f["Venta unit code"] || "Pieza",
        "Comprar unit code": f["Comprar unit code"] || "Pieza",
        "Costo": Number(f["Costo"]) || 0,
        "Precio": Number(f["Precio"]) || 0,
        "Cantidad de alerta": Number(f["Cantidad de alerta"]) || 0,
        "Tasa de impuestos": f["Tasa de impuestos"] || "IVA",
        "Método de impuestos": f["Método de impuestos"] || "Exclusivo",
        "Imagen": f["Imagen"] || "no_image.png",
        "Código de la Sub categoría": f["Código de la Sub categoría"] || "",
        "Variantes de producto": f["Variantes de producto"] || "",
        "Producto de campo personalizado 1": f["Producto de campo personalizado 1"] || "",
        "Producto Campo Personalizadoo 2": f["Producto Campo Personalizadoo 2"] || "",
        "Producto Campo Personalizadoo 3": f["Producto Campo Personalizadoo 3"] || "",
        "Producto Campo Personalizadoo 4": f["Producto Campo Personalizadoo 4"] || "",
        "Producto Campo Personalizadoo 5": f["Producto Campo Personalizadoo 5"] || "",
        "Producto Campo Personalizadoo 6": f["Producto Campo Personalizadoo 6"] || "",
        "Cantidad": Number(f["Cantidad"]) || 0
      };
    });

    const saved = await window.SyncManager.saveToLocalJSON(flatList);
    
    // Also save in LocalStorage to mirror
    window.AppState.products = flatList.map(normalizeJsonProduct);
    localStorage.setItem("kv-catalog-products", JSON.stringify(window.AppState.products));

    if (saved) {
      showToast(`¡Éxito! Importados ${flatList.length} productos y guardados en kv_products...json.`, "success");
    } else {
      showToast("Servidor local no disponible. Descargando archivo JSON...", "warning");
      triggerJSONDownload(flatList);
    }

    await loadAllSyncSources();
  } catch (err) {
    console.error(err);
    showToast("Error al importar de la Nube a JSON.", "danger");
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i data-lucide="cloud-download"></i> Nube a JSON`;
    createLucideIcons();
  }
}
