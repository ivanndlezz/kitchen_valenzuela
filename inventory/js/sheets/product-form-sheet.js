/**
 * product-form-sheet.js
 * Adopts the initialized multi-step product form into the unified sheet shell.
 */

(function () {
  let autosaveTimer = null;
  let autosaveBound = false;
  let taxonomyActionsBound = false;
  let searchableSelectCloseBound = false;
  let userScopeBound = false;
  let taxonomyConfigPromise = null;
  let taxonomyConfigRecord = null;

  function getSource() {
    return document.getElementById("product-form-sheet");
  }

  function getStepPills() {
    return document.getElementById("step-pills");
  }

  function getBody() {
    return document.querySelector("#product-form-sheet .pf-sheet__body") ||
      document.querySelector(".app-sheet__main .pf-sheet__body");
  }

  function getBottomBar() {
    return document.getElementById("bottom-bar");
  }

  function getProductContext() {
    const form = document.getElementById("pf");
    const draftId = form?.dataset.draftId;
    const currentId = window.__currentProductId;
    const productId = draftId || currentId || "";
    const product = productId && window.AppState?.products
      ? window.AppState.products.find(p => p.id === productId)
      : null;

    return { productId, product };
  }

  function getDraftSuffix(productId) {
    if (!productId || !String(productId).startsWith("draft-")) return "";
    return String(productId).replace(/^draft-/, "");
  }

  function getValue(form, selector) {
    const el = form?.querySelector(selector);
    return el ? String(el.value || "").trim() : "";
  }

  function getNumber(form, selector) {
    const value = getValue(form, selector);
    return value ? Number(value) || 0 : 0;
  }

  function normalizeCurrency(value) {
    return String(value || "MXN").toUpperCase() === "USD" ? "USD" : "MXN";
  }

  function getExchangeRate(form, selector, fallback = 1) {
    const value = getNumber(form, selector);
    return value > 0 ? value : fallback;
  }

  function syncCurrencyRateField(select) {
    if (!select) return;
    const scope = select.dataset.currencyScope;
    const field = document.querySelector(`[data-currency-rate-field="${scope}"]`);
    const input = field?.querySelector("input");
    const isUsd = normalizeCurrency(select.value) === "USD";
    if (field) field.hidden = !isUsd;
    if (input && isUsd && !input.value) input.value = "1";
  }

  function bindCurrencyControls() {
    document.querySelectorAll("[data-currency-scope]").forEach((select) => {
      if (select.dataset.currencyBound === "true") {
        syncCurrencyRateField(select);
        return;
      }
      select.addEventListener("change", () => syncCurrencyRateField(select));
      select.dataset.currencyBound = "true";
      syncCurrencyRateField(select);
    });
  }

  function getSelectedText(form, selector) {
    const el = form?.querySelector(selector);
    if (!el || el.selectedIndex < 0) return "";
    return el.options[el.selectedIndex]?.textContent?.trim() || "";
  }

  function getFormConfig() {
    return window.ProductFormConfig || {};
  }

  function parseJsonField(value, fallback) {
    if (!value) return fallback;
    if (typeof value === "object") return value;
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn("ProductFormSheet: could not parse config field", error);
      return fallback;
    }
  }

  function cloneJson(value) {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function isEmptyConfigObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const keys = Object.keys(value);
    return keys.length === 0 || keys.every(key => !String(key).trim() && !String(value[key] || "").trim());
  }

  function normalizeCategoryMap(rawCategories, rawSubcategories) {
    const defaults = getFormConfig().CATEGORIES || {};
    const normalized = {};

    Object.entries(defaults).forEach(([key, value]) => {
      normalized[key] = {
        name: typeof value === "object" ? value.name : String(value || key),
        subcategories: Array.isArray(value?.subcategories) ? [...value.subcategories] : [],
      };
    });

    if (Array.isArray(rawCategories)) {
      rawCategories.forEach((item) => {
        if (!item) return;
        const key = String(item.id || item.value || item.codigo || item.code || item.name || "").trim();
        const name = String(item.name || item.label || item.nombre || item.value || key).trim();
        if (!key || !name) return;
        normalized[key] = {
          name,
          subcategories: Array.isArray(item.subcategories) ? [...item.subcategories] : normalized[key]?.subcategories || [],
        };
      });
    } else if (rawCategories && typeof rawCategories === "object" && !isEmptyConfigObject(rawCategories)) {
      Object.entries(rawCategories).forEach(([key, value]) => {
        const cleanKey = String(key || "").trim();
        if (!cleanKey) return;
        const name = typeof value === "object"
          ? String(value.name || value.label || value.nombre || cleanKey).trim()
          : String(value || "").trim();
        if (!name) return;
        normalized[cleanKey] = {
          name,
          subcategories: Array.isArray(value?.subcategories) ? [...value.subcategories] : normalized[cleanKey]?.subcategories || [],
        };
      });
    }

    if (rawSubcategories && typeof rawSubcategories === "object" && !isEmptyConfigObject(rawSubcategories)) {
      Object.entries(rawSubcategories).forEach(([categoryKey, subcategories]) => {
        const key = String(categoryKey || "").trim();
        if (!key || !normalized[key]) return;
        const values = Array.isArray(subcategories)
          ? subcategories
          : Object.values(subcategories || {});
        normalized[key].subcategories = values
          .map(value => String(value || "").trim())
          .filter(Boolean);
      });
    }

    return normalized;
  }

  function normalizeTextList(rawValues, defaults = []) {
    const values = Array.isArray(rawValues)
      ? rawValues
      : rawValues && typeof rawValues === "object" && !isEmptyConfigObject(rawValues)
        ? Object.values(rawValues)
        : defaults;

    return Array.from(new Set(values.map(value => String(value || "").trim()).filter(Boolean)));
  }

  function normalizeBrandList(rawBrands) {
    const brands = Array.isArray(rawBrands)
      ? rawBrands
      : rawBrands && typeof rawBrands === "object" && !isEmptyConfigObject(rawBrands)
        ? Object.values(rawBrands)
        : getFormConfig().BRANDS || [];

    const normalized = brands.map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        return String(item.name || item.nombre || item.label || "").trim();
      }
      return String(item || "").trim();
    }).filter(Boolean);

    return Array.from(new Set(normalized));
  }

  function normalizeSellerList(rawSellers) {
    const values = Array.isArray(rawSellers)
      ? rawSellers
      : rawSellers && typeof rawSellers === "object" && !isEmptyConfigObject(rawSellers)
        ? Object.values(rawSellers)
        : [];

    return values
      .map((item, index) => {
        if (typeof item === "string") {
          const name = String(item || "").trim();
          if (!name) return null;
          return {
            id: `seller-${slugifyTaxonomyValue(name) || "item"}-${index + 1}`,
            name,
            tel: "",
            email: "",
          };
        }

        if (!item || typeof item !== "object") return null;

        const name = String(item.name || item.nombre || item.label || "").trim();
        const tel = String(item.tel || item.telefono || item.phone || "").trim();
        const email = String(item.email || item.correo || item.mail || "").trim();
        const id = String(item.id || item.key || item.value || "").trim() || `seller-${slugifyTaxonomyValue(name || email || tel || `item-${index + 1}`) || `item-${index + 1}`}`;
        if (!name && !tel && !email) return null;

        return { id, name, tel, email };
      })
      .filter(Boolean);
  }

  function normalizeSupplierList(rawSuppliers) {
    const values = Array.isArray(rawSuppliers)
      ? rawSuppliers
      : rawSuppliers && typeof rawSuppliers === "object" && !isEmptyConfigObject(rawSuppliers)
        ? Object.values(rawSuppliers)
        : [];

    return values
      .map((item, index) => {
        if (typeof item === "string") {
          const name = String(item || "").trim();
          if (!name) return null;
          return {
            id: `supplier-${slugifyTaxonomyValue(name) || "item"}-${index + 1}`,
            name,
            tel: "",
            email: "",
          };
        }

        if (!item || typeof item !== "object") return null;

        const name = String(item.name || item.nombre || item.label || "").trim();
        const tel = String(item.tel || item.telefono || item.phone || "").trim();
        const email = String(item.email || item.correo || item.mail || "").trim();
        const id = String(item.id || item.key || item.value || "").trim() || `supplier-${slugifyTaxonomyValue(name || email || tel || `item-${index + 1}`) || `item-${index + 1}`}`;
        if (!name && !tel && !email) return null;

        return { id, name, tel, email };
      })
      .filter(Boolean);
  }

  function normalizeWarehouseList(rawWarehouses) {
    const defaults = [];
    const source = Array.isArray(rawWarehouses)
      ? rawWarehouses
      : rawWarehouses && typeof rawWarehouses === "object" && !isEmptyConfigObject(rawWarehouses)
        ? Object.entries(rawWarehouses).map(([id, value]) => ({ id, ...(typeof value === "object" ? value : { name: value }) }))
        : getFormConfig().WAREHOUSES || defaults;

    const normalized = source
      .map((item, index) => {
        const id = getPrimitiveText(item?.id || item?.key || item?.slug).trim() || String(index + 1);
        const name = getWarehouseText(item).trim();
        if (!id || !name) return null;
        return {
          id,
          name,
          color: String(item?.color || "#111111").trim(),
          active: item?.active !== false,
        };
      })
      .filter(Boolean);

    return normalized.length ? normalized : defaults;
  }

  function getPrimitiveText(value) {
    if (value == null) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);
    return "";
  }

  function getWarehouseText(value) {
    if (value == null) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);
    if (typeof value !== "object") return "";

    for (const key of ["name", "nombre", "label", "title", "text", "value"]) {
      const text = getWarehouseText(value[key]);
      if (text) return text;
    }

    return "";
  }

  function parseAliasConfig(fields) {
    const rawAliases = parseJsonField(
      fields.Aliases || fields.aliases || fields.TaxonomyAliases || fields.taxonomy_aliases,
      {}
    );
    return window.TaxonomyReconciliation?.normalizeAliasConfig
      ? window.TaxonomyReconciliation.normalizeAliasConfig(rawAliases)
      : rawAliases;
  }



  function getSellerLabel(item) {
    if (!item) return "";
    return String(item.name || item.nombre || item.label || "").trim();
  }

  function getSellerMeta(item) {
    if (!item || typeof item !== "object") return { tel: "", email: "" };
    return {
      tel: String(item.tel || item.telefono || item.phone || "").trim(),
      email: String(item.email || item.correo || item.mail || "").trim(),
    };
  }

  function createSellerId(name, tel, email) {
    const base = slugifyTaxonomyValue(name || email || tel || "seller");
    return `seller-${base || "item"}-${Date.now().toString(36)}`;
  }

  async function loadTaxonomyConfig() {
    if (taxonomyConfigPromise) return taxonomyConfigPromise;

    taxonomyConfigPromise = (async () => {
      if (!window.SyncManager || typeof window.SyncManager.shumRequest !== "function") {
        throw new Error("SyncManager no cargado");
      }

      const result = await window.SyncManager.shumRequest("list", {
        baseId: window.SyncManager.config.baseId,
        table: "configs",
      });
      const record = result?.records?.[0];
      if (!record) throw new Error("No se encontró el registro configs");

      taxonomyConfigRecord = record;
      const fields = record.fields || {};
      const categories = normalizeCategoryMap(
        parseJsonField(fields.Categorias, {}),
        parseJsonField(fields.Subcategorias, {})
      );
      const brands = normalizeBrandList(parseJsonField(fields.Marcas, []));
      const sellers = normalizeSellerList(parseJsonField(fields.vendedores, []));
      const suppliers = normalizeSupplierList(parseJsonField(fields.proveedores, []));
      const warehouses = normalizeWarehouseList(parseJsonField(fields.Almacenes || fields.almacenes, []));
      const aliases = parseAliasConfig(fields);

      applyTaxonomyToFormConfig({ categories, brands, suppliers, warehouses, aliases });
      updateTaxonomySelects();
      return { record, categories, brands, sellers, suppliers, warehouses, aliases };
    })();

    try {
      return await taxonomyConfigPromise;
    } catch (error) {
      taxonomyConfigPromise = null;
      throw error;
    }
  }

  function applyTaxonomyToFormConfig({ categories, brands, suppliers, warehouses, aliases }) {
    const config = getFormConfig();
    if (config.CATEGORIES && categories) {
      Object.keys(config.CATEGORIES).forEach(key => delete config.CATEGORIES[key]);
      Object.assign(config.CATEGORIES, categories);
    }
    if (Array.isArray(config.BRANDS) && brands) {
      config.BRANDS.splice(0, config.BRANDS.length, ...brands);
    }
    if (suppliers) {
      if (!config.SUPPLIERS) config.SUPPLIERS = {};
      Object.keys(config.SUPPLIERS).forEach(key => {
        if (key !== "") delete config.SUPPLIERS[key];
      });
      suppliers.forEach(supplier => {
        config.SUPPLIERS[supplier.id] = supplier.name;
      });
    }
    if (aliases) {
      config.TAXONOMY_ALIASES = aliases;
      window.TaxonomyReconciliation?.setAliases?.(aliases);
    }
    if (warehouses) {
      config.WAREHOUSES = normalizeWarehouseList(warehouses);
      renderWarehouseFields();
    }
  }

  function getWarehouses() {
    return normalizeWarehouseList(getFormConfig().WAREHOUSES);
  }

  function renderWarehouseFields(selectedWarehouseId) {
    const grid = document.querySelector("#pf [data-warehouse-grid]");
    if (!grid) return;

    const previous = {};
    grid.querySelectorAll("input").forEach((input) => {
      previous[input.name] = input.value;
    });

    const allWarehouses = getWarehouses().filter((warehouse) => warehouse.active !== false);
    const warehouses = getAccessibleWarehouses(allWarehouses);

    if (!warehouses.length) {
      grid.innerHTML = `
        <div class="wh-empty">
          <button class="custom-fields__add" type="button" data-taxonomy-add="warehouse">
            <i data-lucide="plus"></i>
            Agregar almacén
          </button>
        </div>
      `;
      window.createLucideIcons?.();
      return;
    }

    const currentSelectedId = String(
      selectedWarehouseId ||
      grid.querySelector("[data-warehouse-selector]")?.value ||
      grid.dataset.selectedWarehouseId ||
      warehouses[0]?.id ||
      ""
    );
    const selected = warehouses.find((warehouse) => String(warehouse.id) === currentSelectedId) || warehouses[0];
    const selectedId = String(selected.id);
    grid.dataset.selectedWarehouseId = selectedId;

    const hiddenInputs = allWarehouses
      .filter((warehouse) => String(warehouse.id) !== selectedId)
      .map((warehouse) => {
        const id = String(warehouse.id);
        return `
          <input type="hidden" name="wh_qty_${escapeHtml(id)}" value="${escapeHtml(previous[`wh_qty_${id}`] || "")}" data-warehouse-hidden />
          <input type="hidden" name="rack_${escapeHtml(id)}" value="${escapeHtml(previous[`rack_${id}`] || "")}" data-warehouse-hidden />
          <input type="hidden" name="wh_${escapeHtml(id)}" value="${escapeHtml(id)}" data-warehouse-hidden />
        `;
      })
      .join("");

    grid.innerHTML = `
      <div class="wh-editor" data-warehouse-editor>
        <div class="field wh-editor__selector">
          <label>Almacén</label>
          <select name="warehouse_selector" data-warehouse-selector aria-label="Seleccionar almacén">
            ${warehouses.map((warehouse) => `
              <option value="${escapeHtml(warehouse.id)}" ${String(warehouse.id) === selectedId ? "selected" : ""}>${escapeHtml(warehouse.name)}</option>
            `).join("")}
          </select>
        </div>
        <div class="wh-editor__stock" data-warehouse-id="${escapeHtml(selectedId)}">
          <input type="hidden" name="wh_${escapeHtml(selectedId)}" value="${escapeHtml(selectedId)}" />
          <div class="field">
            <label>Cantidad</label>
            <input type="number" name="wh_qty_${escapeHtml(selectedId)}" value="${escapeHtml(previous[`wh_qty_${selectedId}`] || "")}" placeholder="0" min="0" />
          </div>
          <div class="field">
            <label>Estante</label>
            <input type="text" name="rack_${escapeHtml(selectedId)}" value="${escapeHtml(previous[`rack_${selectedId}`] || "")}" placeholder="Ej. A-12" />
          </div>
        </div>
        <div class="wh-editor__hidden" hidden>${hiddenInputs}</div>
      </div>
    `;

    const selector = grid.querySelector("[data-warehouse-selector]");
    enhanceSearchableSelect(selector);
    selector?.addEventListener("change", () => {
      grid.dataset.selectedWarehouseId = selector.value;
      renderWarehouseFields(selector.value);
      window.ProductFormUpdateState?.sync?.();
    });
  }

  function getAccessibleWarehouses(warehouses) {
    const user = window.UserScope?.getActiveUser?.();
    const role = window.UserScope?.getActiveRole?.();
    const capabilities = normalizeStringList([
      ...(user?.capabilities || []),
      ...(role?.capabilities || []),
    ]);
    if (capabilities.includes("gestionar_almacenes") || capabilities.includes("gestionar_almacenes_todos") || role?.id === "admin") {
      return warehouses;
    }

    const allowed = new Set(normalizeStringList([
      ...(user?.warehouseIds || []),
      ...(user?.warehouses || []),
      ...(user?.almacenes || []),
      ...(role?.warehouseIds || []),
      ...(role?.warehouses || []),
      ...(role?.almacenes || []),
    ]));

    if (!allowed.size) return warehouses;
    return warehouses.filter((warehouse) => allowed.has(String(warehouse.id)));
  }

  function normalizeStringList(value) {
    const source = Array.isArray(value) ? value : [value];
    return source.flatMap((item) => {
      if (Array.isArray(item)) return normalizeStringList(item);
      if (item == null) return [];
      if (typeof item === "string") return item.split(",").map(part => part.trim()).filter(Boolean);
      return [String(item).trim()].filter(Boolean);
    });
  }

  function getWarehouseStockTotal(form) {
    return Array.from(form?.querySelectorAll('input[name^="wh_qty_"]') || [])
      .reduce((sum, input) => sum + (Number(input.value) || 0), 0);
  }

  function getWarehouseStockMap(form) {
    return Object.fromEntries(
      Array.from(form?.querySelectorAll('input[name^="wh_qty_"]') || []).map((input) => [
        input.name.replace(/^wh_qty_/, ""),
        Number(input.value) || 0,
      ])
    );
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function syncNativeSelect(select, data, emptyText, options = {}) {
    if (!select) return;
    const currentValue = select.value;
    const currentOption = select.options[select.selectedIndex];
    const currentLabel = currentOption?.textContent?.trim() || currentValue;
    select.innerHTML = "";

    if (emptyText) {
      const emptyOption = document.createElement("option");
      emptyOption.value = "";
      emptyOption.textContent = emptyText;
      select.appendChild(emptyOption);
    }

    if (Array.isArray(data)) {
      data.forEach((item) => {
        const option = document.createElement("option");
        option.value = item;
        option.textContent = item;
        select.appendChild(option);
      });
    } else {
      Object.entries(data || {}).forEach(([key, value]) => {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = typeof value === "object" ? value.name : value;
        select.appendChild(option);
      });
    }

    const hasCurrentValue = currentValue && Array.from(select.options).some(option => option.value === currentValue);
    if (hasCurrentValue) {
      select.value = currentValue;
    } else if (options.preserveMissing && currentValue) {
      const option = document.createElement("option");
      option.value = currentValue;
      option.textContent = currentLabel;
      select.appendChild(option);
      select.value = currentValue;
    }
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function syncSubcategorySelect(categoryKey, selectedValue) {
    const select = document.getElementById("f-subcat");
    if (!select) return;

    const category = getFormConfig().CATEGORIES?.[categoryKey];
    const subcategories = category?.subcategories || [];
    select.innerHTML = '<option value="">Sin subcategoría</option>';
    subcategories.forEach((subcategory) => {
      const option = document.createElement("option");
      option.value = subcategory.toLowerCase().replace(/\s/g, "_");
      option.textContent = subcategory;
      select.appendChild(option);
    });
    select.disabled = subcategories.length === 0;
    if (selectedValue && Array.from(select.options).some(option => option.value === selectedValue)) {
      select.value = selectedValue;
    }
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function updateTaxonomySelects() {
    const config = getFormConfig();
    syncNativeSelect(document.getElementById("f-cat"), config.CATEGORIES || {}, "Seleccionar");
    syncNativeSelect(document.getElementById("qf-cat"), config.CATEGORIES || {}, "Seleccionar");
    syncNativeSelect(document.querySelector('#pf select[name="brand"]'), config.BRANDS || [], "Sin marca", { preserveMissing: true });
    syncNativeSelect(document.querySelector('#pf select[name="supplier"]'), config.SUPPLIERS || {}, "Sin proveedor");
    syncSubcategorySelect(document.getElementById("f-cat")?.value || "");
  }

  function getNextCategoryKey(categories) {
    const numericKeys = Object.keys(categories || {})
      .map(key => Number(key))
      .filter(Number.isFinite);
    return String((numericKeys.length ? Math.max(...numericKeys) : 0) + 1);
  }

  function slugifyTaxonomyValue(value) {
    return String(value || "").trim().toLowerCase().replace(/\s/g, "_");
  }

  function getTaxonomyMeta(type) {
    const meta = {
      category: {
        title: "Categorías",
        singular: "categoría",
        placeholder: "Nueva categoría",
      },
      subcategory: {
        title: "Subcategorías",
        singular: "subcategoría",
        placeholder: "Nueva subcategoría",
      },
      brand: {
        title: "Marcas",
        singular: "marca",
        placeholder: "Nueva marca",
      },
      seller: {
        title: "Vendedores",
        singular: "vendedor",
        placeholder: "Nuevo vendedor",
      },
      supplier: {
        title: "Proveedores",
        singular: "proveedor",
        placeholder: "Nuevo proveedor",
      },
    };
    return meta[type] || meta.brand;
  }

  function getTaxonomyItems(type, categories, brands, categoryKey, sellers = [], suppliers = []) {
    if (type === "category") {
      return Object.entries(categories || {}).map(([key, value]) => ({
        key,
        label: value?.name || key,
      }));
    }
    if (type === "subcategory") {
      return (categories?.[categoryKey]?.subcategories || []).map((label) => ({
        key: slugifyTaxonomyValue(label),
        label,
      }));
    }
    if (type === "seller") {
      return (sellers || []).map((item) => ({
        key: item.id,
        label: getSellerLabel(item),
        tel: getSellerMeta(item).tel,
        email: getSellerMeta(item).email,
      }));
    }
    if (type === "supplier") {
      return (suppliers || []).map((item) => ({
        key: item.id,
        label: getSellerLabel(item),
        tel: getSellerMeta(item).tel,
        email: getSellerMeta(item).email,
      }));
    }
    return (brands || []).map((label) => ({ key: label, label }));
  }



  function selectTaxonomyValue(type, key, label) {
    if (type === "category") {
      const select = document.getElementById("f-cat");
      if (!select) return;
      select.value = key;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
    if (type === "subcategory") {
      syncSubcategorySelect(document.getElementById("f-cat")?.value || "", slugifyTaxonomyValue(label));
      return;
    }
    if (type === "seller") return;
    if (type === "supplier") {
      const select = document.querySelector('#pf select[name="supplier"]');
      if (!select) return;
      select.value = key;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      return;
    }
    const select = document.querySelector('#pf select[name="brand"]');
    if (!select) return;
    select.value = label;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }



  function readDraftValues(form) {
    const imageInput = form?.querySelector('input[name="product_image"]');
    const selectedType = form?.querySelector('input[name="type"]:checked');
    const customFields = window.ProductFormCustomFields?.getFields?.() || [];

    return {
      nombre: getValue(form, 'input[name="name"]') || getValue(document, "#qf-name"),
      codigo: getValue(form, 'input[name="code"]') || getValue(document, "#qf-code"),
      barcodeType: getValue(form, 'select[name="barcode_symbology"]') || "code128",
      marca: getValue(form, 'select[name="brand"]') || "Generales",
      categoriaCodigo: getValue(form, 'select[name="category"]') || "other",
      unitCode: getSelectedText(form, 'select[name="unit"]') || getValue(document, "#qf-unit"),
      costo: getNumber(form, 'input[name="cost"]') || getNumber(document, "#qf-cost"),
      precio: getNumber(form, 'input[name="price"]') || getNumber(document, "#qf-price"),
      currency: normalizeCurrency(getValue(form, 'select[name="currency"]') || "MXN"),
      exchangeRate: getExchangeRate(form, 'input[name="exchange_rate"]'),
      quoteCurrency: normalizeCurrency(getValue(document, "#qf-currency") || getValue(form, 'select[name="currency"]') || "MXN"),
      quoteExchangeRate: getExchangeRate(document, "#qf-exchange-rate", getExchangeRate(form, 'input[name="exchange_rate"]')),
      alertaCantidad: getNumber(form, 'input[name="alert_quantity"]'),
      tasaImpuesto: getValue(form, 'select[name="tax_rate"]') === "5" ? "IVA" : "",
      metodoImpuesto: getValue(form, 'select[name="tax_method"]') === "0" ? "Inclusivo" : "Exclusivo",
      imagen: imageInput?.files?.[0]?.name || "",
      weight: getNumber(form, 'input[name="weight"]'),
      length: getNumber(form, 'input[name="length"]'),
      width: getNumber(form, 'input[name="width"]'),
      height: getNumber(form, 'input[name="height"]'),
      especificaciones: getValue(form, 'textarea[name="details"]'),
      especial3: getValue(form, 'textarea[name="history"]'),
      especial4: customFields[0]?.value || "",
      especial5: customFields[1]?.value || "",
      especial6: customFields[2]?.value || "",
      customFields,
      stock: getWarehouseStockTotal(form),
      warehouseStock: getWarehouseStockMap(form),
      tipoProducto: selectedType?.value || "standard",
      supplier: getValue(form, 'select[name="supplier"]'),
      supplier_part_no: getValue(form, 'input[name="supplier_part_no"]'),
      supplier_price: getNumber(form, 'input[name="supplier_price"]'),
    };
  }

  function updateHeader(root) {
    const sheetRoot = root || document.getElementById("sheet-root");
    const title = sheetRoot?.querySelector('[data-bind-text="title"]');
    const eyebrow = sheetRoot?.querySelector('[data-bind-text="meta.eyebrow"]');
    const meta = getMeta();

    if (title) title.textContent = getTitle();
    if (eyebrow) {
      eyebrow.textContent = meta.eyebrow;
      if (meta.status) {
        eyebrow.setAttribute("data-status", meta.status);
      } else {
        eyebrow.removeAttribute("data-status");
      }
    }
    window.SheetManager?.updateMeta(meta);
  }

  function saveDraftProgress() {
    const form = document.getElementById("pf");
    const draftId = form?.dataset.draftId;
    if (!form || !draftId || !window.AppState?.products) return;

    const draft = window.AppState.products.find(product => product.id === draftId);
    if (!draft) return;
    const isDraft = String(draft.id || "").startsWith("draft-") || draft.status === "draft" || draft.sync_status === "draft";

    Object.assign(draft, readDraftValues(form), {
      id: draft.id,
      airtable_id: draft.airtable_id || null,
      status: isDraft ? "draft" : (draft.status || "published"),
      sync_status: isDraft ? "draft" : "dirty",
      createdAt: draft.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (typeof window.saveProductsToStorage === "function") {
      window.saveProductsToStorage();
    } else {
      localStorage.setItem("kv-catalog-products", JSON.stringify(window.AppState.products));
    }

    updateHeader();
    window.ProductFormUpdateState?.sync?.();
  }

  function scheduleDraftAutosave() {
    window.clearTimeout(autosaveTimer);
    autosaveTimer = window.setTimeout(saveDraftProgress, 350);
  }

  function getSelectPlaceholder(select) {
    const firstOption = select.options?.[0];
    if (firstOption && !firstOption.value) return firstOption.textContent.trim();
    return select.getAttribute("aria-label") || select.name || "Seleccionar";
  }

  function syncSearchableSelect(wrapper) {
    const select = wrapper.querySelector("select");
    const input = wrapper.querySelector(".custom-select-input");
    const optionsBox = wrapper.querySelector(".custom-select-options");
    if (!select || !input || !optionsBox) return;

    const selectedOption = select.options[select.selectedIndex];
    input.value = selectedOption && selectedOption.value
      ? selectedOption.textContent.trim()
      : "";
    input.placeholder = getSelectPlaceholder(select);
    input.disabled = select.disabled;
    wrapper.dataset.disabled = String(select.disabled);

    optionsBox.innerHTML = Array.from(select.options).map((option) => {
      const label = option.textContent.trim();
      const selected = option.value === select.value ? " selected" : "";
      const empty = option.value ? "" : " is-empty";
      return `
        <button
          class="custom-select-option${selected}${empty}"
          type="button"
          data-value="${option.value}"
        >${label}</button>
      `;
    }).join("");
  }

  function openSearchableSelect(wrapper) {
    const select = wrapper.querySelector("select");
    const input = wrapper.querySelector(".custom-select-input");
    if (!select || !input || select.disabled) return;

    closeSearchableSelects(wrapper);
    wrapper.classList.add("is-open");
    wrapper.dataset.previousValue = select.value || "";
    input.value = "";
    filterSearchableOptions(wrapper);
  }

  function closeSearchableSelect(wrapper) {
    if (!wrapper) return;
    wrapper.classList.remove("is-open");
    delete wrapper.dataset.previousValue;
    syncSearchableSelect(wrapper);
    filterSearchableOptions(wrapper);
  }

  function filterSearchableOptions(wrapper) {
    const input = wrapper.querySelector(".custom-select-input");
    const query = input?.value?.trim().toLowerCase() || "";

    wrapper.querySelectorAll(".custom-select-option").forEach((option) => {
      const text = option.textContent.trim().toLowerCase();
      option.hidden = Boolean(query) && !text.includes(query);
    });
  }

  function closeSearchableSelects(exceptWrapper) {
    document.querySelectorAll("#pf .custom-select-wrapper.is-open").forEach((wrapper) => {
      if (wrapper !== exceptWrapper) closeSearchableSelect(wrapper);
    });
  }

  function enhanceSearchableSelect(select) {
    if (!select || select.dataset.searchableReady === "true") return;

    const wrapper = document.createElement("div");
    wrapper.className = "custom-select-wrapper";
    select.parentNode.insertBefore(wrapper, select);
    wrapper.appendChild(select);

    const trigger = document.createElement("div");
    trigger.className = "custom-select-trigger";
    trigger.innerHTML = `
      <input
        type="text"
        class="custom-select-input"
        autocomplete="off"
        autocapitalize="none"
      >
      <svg class="custom-select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    `;

    const dropdown = document.createElement("div");
    dropdown.className = "custom-select-dropdown";
    dropdown.innerHTML = `<div class="custom-select-options"></div>`;

    wrapper.appendChild(trigger);
    wrapper.appendChild(dropdown);
    select.dataset.searchableReady = "true";
    select.tabIndex = -1;

    syncSearchableSelect(wrapper);

    const input = wrapper.querySelector(".custom-select-input");
    const optionsBox = wrapper.querySelector(".custom-select-options");

    input.addEventListener("focus", () => {
      openSearchableSelect(wrapper);
    });

    input.addEventListener("input", () => {
      if (select.disabled) return;
      wrapper.classList.add("is-open");
      filterSearchableOptions(wrapper);
    });

    input.addEventListener("blur", () => {
      window.setTimeout(() => {
        if (!wrapper.contains(document.activeElement)) {
          closeSearchableSelect(wrapper);
        }
      }, 80);
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeSearchableSelect(wrapper);
        input.blur();
        return;
      }

      if (event.key === "Enter" && wrapper.classList.contains("is-open")) {
        const firstVisibleOption = Array.from(wrapper.querySelectorAll(".custom-select-option"))
          .find(option => !option.hidden);
        if (firstVisibleOption) {
          event.preventDefault();
          firstVisibleOption.click();
        }
      }
    });

    trigger.addEventListener("click", (event) => {
      if (select.disabled || event.target === input) return;
      input.focus();
      openSearchableSelect(wrapper);
    });

    optionsBox.addEventListener("pointerdown", (event) => {
      if (event.target.closest(".custom-select-option")) {
        event.preventDefault();
      }
    });

    optionsBox.addEventListener("click", (event) => {
      const optionButton = event.target.closest(".custom-select-option");
      if (!optionButton) return;
      select.value = optionButton.dataset.value || "";
      select.dispatchEvent(new Event("change", { bubbles: true }));
      select.dispatchEvent(new Event("input", { bubbles: true }));
      closeSearchableSelect(wrapper);
    });

    select.addEventListener("change", () => syncSearchableSelect(wrapper));

    const observer = new MutationObserver(() => syncSearchableSelect(wrapper));
    observer.observe(select, {
      attributes: true,
      attributeFilter: ["disabled"],
      childList: true,
      subtree: true,
    });
  }

  function enhanceSearchableSelects(root) {
    const scope = root || document;
    scope.querySelectorAll("#pf select").forEach(enhanceSearchableSelect);

    if (!searchableSelectCloseBound) {
      document.addEventListener("click", (event) => {
        if (!event.target.closest("#pf .custom-select-wrapper")) {
          closeSearchableSelects();
        }
      });
      searchableSelectCloseBound = true;
    }
  }

  async function handleTaxonomyAction(event) {
    const button = event.target.closest("[data-taxonomy-add]");
    if (!button) return;
    event.preventDefault();

    try {
      button.disabled = true;
      window.ProductFormTaxonomy.open(button.dataset.taxonomyAdd).catch((error) => {
        console.error("ProductFormSheet: taxonomy sheet failed", error);
        window.showToast?.("No se pudo abrir el administrador.", "danger");
      });
      window.setTimeout(() => {
        button.disabled = false;
      }, 250);
    } catch (error) {
      console.error("ProductFormSheet: taxonomy sheet failed", error);
      window.showToast?.("No se pudo abrir el administrador.", "danger");
      button.disabled = false;
    }
  }

  function getTitle() {
    const { productId, product } = getProductContext();
    const draftSuffix = getDraftSuffix(productId);
    const productName = product?.nombre?.trim();

    if (productName) return `Editar ${productName}`;
    if (draftSuffix) return `Editar Producto | ${draftSuffix}`;
    if (window.__currentProductId) return "Editar Producto";
    return "Nuevo Producto";
  }

  function getMeta() {
    const { productId } = getProductContext();
    const isDraft = String(productId || "").startsWith("draft-");

    return {
      eyebrow: "Producto",
      activeId: productId || "",
      mode: window.__currentProductId ? "edit" : "create",
      status: isDraft ? "draft" : "",
    };
  }

  function renderTopControls() {
    const showWeb = window.__currentProductId ? "" : 'style="display:none;"';
    return `
      <div class="view-switch view-switch--single sheet-mode-switch" data-sheet-mode-switch="product-form">
        <button class="view-switch__toggle" type="button" aria-label="Volver al resumen del producto">
          <span class="view-switch__toggle-inner">
            <span class="view-switch__btn" data-view="general" data-selected="false" data-product-form-back>
              Resumen
            </span>
            <span class="view-switch__btn" data-view="advanced" data-selected="true">
              Editar
            </span>
            <span class="view-switch__btn" data-view="web" data-selected="false" data-product-form-web ${showWeb}>
              Web
            </span>
          </span>
        </button>
      </div>
    `;
  }

  function hydrate(root) {
    root.querySelector("[data-product-form-back]")?.addEventListener("click", () => {
      window.closeProductFormSheet?.();
      if (window.__currentProductId) {
        const product = window.AppState?.products?.find(p => p.id === window.__currentProductId);
        if (product && typeof window.openProductDrawer === "function") {
          window.setProductSheetHash?.("product", product, "general");
          window.openProductDrawer(product);
        }
      }
    });

    root.querySelector("[data-product-form-web]")?.addEventListener("click", () => {
      window.closeProductFormSheet?.();
      if (window.__currentProductId) {
        const product = window.AppState?.products?.find(p => p.id === window.__currentProductId);
        if (product && typeof window.ProductDetailSheet?.openWeb === "function") {
          window.setProductSheetHash?.("product", product, "web");
          window.ProductDetailSheet.openWeb(product);
        }
      }
    });

    const form = document.getElementById("pf");
    if (form && !autosaveBound) {
      form.addEventListener("input", scheduleDraftAutosave);
      form.addEventListener("change", scheduleDraftAutosave);
      document.getElementById("quick-form")?.addEventListener("input", scheduleDraftAutosave);
      document.getElementById("quick-form")?.addEventListener("change", scheduleDraftAutosave);
      autosaveBound = true;
    }
    if (form && !taxonomyActionsBound) {
      form.addEventListener("click", handleTaxonomyAction);
      taxonomyActionsBound = true;
    }
    if (!userScopeBound) {
      window.addEventListener("user:scope-changed", () => renderWarehouseFields());
      userScopeBound = true;
    }
    renderWarehouseFields();
    bindCurrencyControls();
    enhanceSearchableSelects(form);
    loadTaxonomyConfig().catch((error) => {
      console.warn("ProductFormSheet: taxonomy config unavailable", error);
    });
    updateHeader(root);
  }

  function detach() {
    const source = getSource();
    const stepPills = getStepPills();
    const body = getBody();
    const bottomBar = getBottomBar();
    if (!source) return;

    if (stepPills && stepPills.parentElement !== source) {
      source.appendChild(stepPills);
    }
    if (bottomBar && body && bottomBar.parentElement !== body) {
      body.appendChild(bottomBar);
    }
    if (body && body.parentElement !== source) {
      source.appendChild(body);
    }
  }

  window.ProductFormSheet = {
    getTitle,
    getMeta,
    renderTopControls,
    getStepPills,
    getBody,
    getBottomBar,
    hydrate,
    detach,
    saveDraftProgress,
    applyTaxonomyToFormConfig,
    updateTaxonomySelects,
    selectTaxonomyValue,
  };
})();
