/**
 * shum-sync.js
 * SyncManager engine for remote Airtable API connections, local backup JSON,
 * and standard LocalStorage catalog synchronization. Also renders the Comparative Sync Panel.
 */

function buildCustomFieldPayload(product = {}) {
  return [1, 2, 3, 4, 5, 6].reduce((payload, n) => {
    const field = product.customFields?.[n - 1] || {};
    payload[`cf${n}_name`] = field.name || product[`cf${n}_name`] || "";
    payload[`cf${n}_data`] = field.value || product[`cf${n}_data`] || "";
    return payload;
  }, {});
}

window.SyncManager = {
  config: {
    endpoint: "https://klef.newfacecards.com/shum-api/api.php",
    baseId: "apppjeEy9lY65U4On",
    table: "products",
    jsonUrl: "./data/kv_products_2026_05_05_19_31_43.json",
    saveServerUrl: "http://localhost:8765/save_inventory",
    priority: "airtable", // "airtable" > "local" > "json"
    requestCounter: {
      enabled: true,
      table: "configs",
      field: "peticiones",
      trackedTables: ["products"],
      storageKey: "kv-shum-request-counter",
      flushDelayMs: 800
    },
    quotes: {
      endpoint: "https://klef.newfacecards.com/shum-api/api.php",
      baseId: "appSVqxolsBlPACLH",
      table: "quotes",
      jsonBackupTable: "quote_backups"
    }
  },

  requestCounterState: {
    pending: 0,
    timer: null,
    flushing: false,
    recordId: "",
    value: null
  },

  async shumRequest(action, params, options = {}) {
    let result = null;
    try {
      const response = await fetch(this.config.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...params })
      });
      result = await response.json();
      if (!result.success) {
        throw new Error(result.message || "API request failed");
      }
      this.rememberRequestCounterRecord(action, params, result.data);
      return result.data;
    } catch (error) {
      console.error("SHUM API Error:", error);
      throw error;
    } finally {
      if (this.shouldTrackRequest(params, options)) {
        this.queueRequestCounterIncrement(1);
      }
    }
  },

  shouldTrackRequest(params = {}, options = {}) {
    const counter = this.config.requestCounter;
    if (!counter?.enabled || options.skipRequestCounter) return false;
    const trackedTables = counter.trackedTables;
    if (!Array.isArray(trackedTables) || trackedTables.length === 0) return true;
    return trackedTables.includes(params.table);
  },

  queueRequestCounterIncrement(amount = 1) {
    const counter = this.config.requestCounter;
    if (!counter?.enabled) return;

    const increment = Number(amount);
    if (Number.isFinite(increment) && increment > 0) {
      this.requestCounterState.pending += increment;
    }
    window.clearTimeout(this.requestCounterState.timer);
    this.requestCounterState.timer = window.setTimeout(() => {
      this.flushRequestCounter().catch((error) => {
        console.warn("SyncManager: Failed to update request counter.", error);
      });
    }, counter.flushDelayMs || 800);
  },

  getRequestCounterFieldValue(fields = {}) {
    const field = this.config.requestCounter?.field || "peticiones";
    const raw = fields[field] ?? fields.Peticiones ?? fields.peticiones;
    const value = Number(raw);
    return Number.isFinite(value) ? value : 0;
  },

  readCachedRequestCounter() {
    const key = this.config.requestCounter?.storageKey;
    if (!key) return null;
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch (error) {
      console.warn("SyncManager: Failed to read cached request counter config.", error);
      return null;
    }
  },

  writeCachedRequestCounter(recordId, value) {
    const key = this.config.requestCounter?.storageKey;
    if (!key || !recordId) return;
    localStorage.setItem(key, JSON.stringify({
      recordId,
      value: Number(value) || 0,
      updatedAt: new Date().toISOString()
    }));
  },

  rememberRequestCounterRecord(action, params = {}, data = {}) {
    const counter = this.config.requestCounter;
    if (!counter?.enabled || params.table !== counter.table) return;

    const record = action === "list"
      ? data?.records?.[0]
      : (data?.id ? data : data?.record);
    if (!record?.id) return;

    this.requestCounterState.recordId = record.id;
    this.requestCounterState.value = this.getRequestCounterFieldValue(record.fields || {});
    this.writeCachedRequestCounter(record.id, this.requestCounterState.value);
  },

  async resolveRequestCounterRecord() {
    const counter = this.config.requestCounter;
    const cached = this.readCachedRequestCounter();
    const state = this.requestCounterState;
    const knownRecordId = state.recordId || cached?.recordId || "";

    if (knownRecordId) {
      state.recordId = knownRecordId;
      state.value = Number(state.value ?? cached?.value) || 0;
      return { recordId: knownRecordId, value: state.value, lookupRequests: 0 };
    }

    const result = await this.shumRequest("list", {
      baseId: this.config.baseId,
      table: counter.table
    }, { skipRequestCounter: true });
    const record = result?.records?.[0];
    if (!record?.id) {
      throw new Error("No se encontró el registro configs para contar peticiones");
    }

    const value = this.getRequestCounterFieldValue(record.fields || {});
    state.recordId = record.id;
    state.value = value;
    this.writeCachedRequestCounter(record.id, value);
    return { recordId: record.id, value, lookupRequests: 1 };
  },

  async flushRequestCounter() {
    const counter = this.config.requestCounter;
    const state = this.requestCounterState;
    if (!counter?.enabled || state.flushing || state.pending <= 0) return;

    state.flushing = true;
    const originalRequests = state.pending;
    state.pending = 0;

    try {
      const resolved = await this.resolveRequestCounterRecord();
      const incrementBy = originalRequests + resolved.lookupRequests + 1;
      const nextValue = (Number(resolved.value) || 0) + incrementBy;

      const result = await this.shumRequest("update", {
        baseId: this.config.baseId,
        table: counter.table,
        recordId: resolved.recordId,
        data: {
          [counter.field]: nextValue
        }
      }, { skipRequestCounter: true });

      const returnedValue = this.getRequestCounterFieldValue(result?.fields || {});
      state.value = returnedValue || nextValue;
      this.writeCachedRequestCounter(resolved.recordId, state.value);
    } finally {
      state.flushing = false;
      if (state.pending > 0) {
        this.queueRequestCounterIncrement(0);
      }
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
      "Venta unit code": p.saleUnitCode || p.unitCode || "Pieza",
      "Comprar unit code": p.purchaseUnitCode || p.unitCode || "Pieza",
      "Costo": Number(p.costo) || 0,
      "Precio": Number(p.precio) || 0,
      "CostoEnvio": Number(p.CostoEnvio ?? p.costoEnvio ?? p.costoTraslado ?? p.transferCost ?? p.transfer_cost) || 0,
      "currency": p.currency || "MXN",
      "exchange_rate": Number(p.exchangeRate) || 1,
      "quote_currency": p.quoteCurrency || p.currency || "MXN",
      "quote_exchange_rate": Number(p.quoteExchangeRate || p.exchangeRate) || 1,
      "quote_utility_type": p.quoteUtilityType || "percent",
      "quote_utility_value": Number(p.quoteUtilityValue) || 0,
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
      ...buildCustomFieldPayload({
        ...p,
        cf1_data: p.cf1_data || p.especial4 || "",
        cf2_data: p.cf2_data || p.especial5 || "",
        cf3_data: p.cf3_data || p.especial6 || "",
      }),
      "envio_web": Number(p.envioWeb) || 0,
      "web_currency": p.webCurrency || "MXN",
      "web_exchange_rate": Number(p.webExchangeRate) || 1,
      "Mostrar en página de inicio": Boolean(p.featured),
      "Ocultar en POS": Boolean(p.hidePos),
      "Ocultar en tienda": Boolean(p.hideStore),
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

    const customFields = [1, 2, 3, 4, 5, 6]
      .map((n) => ({
        name: f[`cf${n}_name`] || "",
        value: f[`cf${n}_data`] || "",
      }))
      .filter((field) => field.name || field.value);

    return {
      id: code || id,
      nombre: f["Nombre"] || "",
      codigo: code,
      barcodeType: f["Clase de Código de barras"] || "code128",
      marca: f["Marca"] || "Generales",
      categoriaCodigo: cat,
      unitCode: f["unit code"] || "Pieza",
      saleUnitCode: f["Venta unit code"] || f["unit code"] || "Pieza",
      purchaseUnitCode: f["Comprar unit code"] || f["unit code"] || "Pieza",
      costo: Number(f["Costo"]) || 0,
      precio: Number(f["Precio"]) || 0,
      CostoEnvio: Number(f["CostoEnvio"] ?? f["Costo de traslado"]) || 0,
      costoEnvio: Number(f["CostoEnvio"] ?? f["Costo de traslado"]) || 0,
      currency: String(f["currency"] || "MXN").toUpperCase() === "USD" ? "USD" : "MXN",
      exchangeRate: Number(f["exchange_rate"]) || 1,
      quoteCurrency: String(f["quote_currency"] || f["currency"] || "MXN").toUpperCase() === "USD" ? "USD" : "MXN",
      quoteExchangeRate: Number(f["quote_exchange_rate"] || f["exchange_rate"]) || 1,
      quoteUtilityType: String(f["quote_utility_type"] || "percent") === "amount" ? "amount" : "percent",
      quoteUtilityValue: Number(f["quote_utility_value"]) || 0,
      alertaCantidad: Number(f["Cantidad de alerta"]) || 0,
      weight: Number(f["weight"] ?? f["Peso"]) || 0,
      length: Number(f["length"] ?? f["Largo"]) || 0,
      width: Number(f["width"] ?? f["Ancho"]) || 0,
      height: Number(f["height"] ?? f["Alto"]) || 0,
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
      customFields,
      cf1_name: f["cf1_name"] || "",
      cf1_data: f["cf1_data"] || "",
      cf2_name: f["cf2_name"] || "",
      cf2_data: f["cf2_data"] || "",
      cf3_name: f["cf3_name"] || "",
      cf3_data: f["cf3_data"] || "",
      cf4_name: f["cf4_name"] || "",
      cf4_data: f["cf4_data"] || "",
      cf5_name: f["cf5_name"] || "",
      cf5_data: f["cf5_data"] || "",
      cf6_name: f["cf6_name"] || "",
      cf6_data: f["cf6_data"] || "",
      envioWeb: Number(f["envio_web"]) || 0,
      webCurrency: String(f["web_currency"] || "MXN").toUpperCase() === "USD" ? "USD" : "MXN",
      webExchangeRate: Number(f["web_exchange_rate"]) || 1,
      featured: Boolean(f["Mostrar en página de inicio"]),
      hidePos: Boolean(f["Ocultar en POS"]),
      hideStore: Boolean(f["Ocultar en tienda"]),
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

  extractReturnedRecord(result) {
    if (!result) return null;
    if (result.id && result.fields) return result;
    if (result.record && result.record.id && result.record.fields) return result.record;
    if (Array.isArray(result.records) && result.records[0]?.id && result.records[0]?.fields) {
      return result.records[0];
    }
    return null;
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

    const returnedRecord = this.extractReturnedRecord(result);
    if (returnedRecord) {
      const syncedProduct = this.mapAirtableToLocal(returnedRecord);
      Object.assign(p, syncedProduct, {
        status: "published",
        sync_status: "synced",
        updatedAt: new Date().toISOString()
      });
      if (window.ProductCloudCache?.patch) {
        window.ProductCloudCache.patch(p);
      }
    } else {
      p.sync_status = "synced";
      p.status = p.status === "draft" ? "published" : (p.status || "published");
      p.updatedAt = new Date().toISOString();
      if (result && result.id) {
        p.airtable_id = result.id;
      }
      if (window.ProductCloudCache?.patch) {
        window.ProductCloudCache.patch(p);
      }
    }
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

  if (!syncBtn) return;

  syncBtn.addEventListener("click", openSyncModal);
  if (sheetSyncBtn) sheetSyncBtn.addEventListener("click", openSyncModal);
  syncCloseBtn.addEventListener("click", closeSyncModal);
  bulkCloudBtn.addEventListener("click", handleBulkCloudToJSON);
  bulkSyncBtn.addEventListener("click", handleBulkSyncToCloud);

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

  const compareContent = window.CompareSheet?.render({
    name,
    sku,
    status,
    fieldsHTML,
    actionsHTML
  });

  if (!compareContent) return;

  if (window.SheetManager) {
    window.SheetManager.open({
      id: "compare",
      title: "Comparador Detallado",
      variant: "side",
      size: "lg",
      mode: "compare",
      meta: {
        eyebrow: "Sincronizacion",
        activeId: sku,
        mode: "compare"
      },
      data: { row, sku, status },
      slots: {
        main: compareContent
      }
    });
  } else {
    return;
  }

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
  if (window.SheetManager) {
    window.SheetManager.close("compare");
  }
}

async function handleSingleSyncToCloud(p) {
  if (!p) return;
  const btn = document.getElementById("action-sync-cloud");
  if (btn) btn.disabled = true;

  try {
    showToast("Sincronizando con Airtable...", "info");
    await window.SyncManager.syncProduct(p);
    saveProductsToStorage();
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
        ...buildCustomFieldPayload(item),
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
          ...buildCustomFieldPayload(item),
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
    
    // Save updated local storage through the product scope utility.
    saveProductsToStorage();
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
        "cf1_name": f["cf1_name"] || "",
        "cf1_data": f["cf1_data"] || "",
        "cf2_name": f["cf2_name"] || "",
        "cf2_data": f["cf2_data"] || "",
        "cf3_name": f["cf3_name"] || "",
        "cf3_data": f["cf3_data"] || "",
        "cf4_name": f["cf4_name"] || "",
        "cf4_data": f["cf4_data"] || "",
        "cf5_name": f["cf5_name"] || "",
        "cf5_data": f["cf5_data"] || "",
        "cf6_name": f["cf6_name"] || "",
        "cf6_data": f["cf6_data"] || "",
        "Cantidad": Number(f["Cantidad"]) || 0
      };
    });

    const saved = await window.SyncManager.saveToLocalJSON(flatList);
    
    // Also save in LocalStorage to mirror
    window.AppState.products = flatList.map(normalizeJsonProduct);
    saveProductsToStorage();

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
