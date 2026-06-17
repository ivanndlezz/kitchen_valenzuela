/**
 * product-form-sheet.js
 * Adopts the initialized multi-step product form into the unified sheet shell.
 */

(function () {
  let autosaveTimer = null;
  let autosaveBound = false;
  let taxonomyActionsBound = false;
  let searchableSelectCloseBound = false;
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

      applyTaxonomyToFormConfig({ categories, brands, suppliers });
      updateTaxonomySelects();
      return { record, categories, brands, sellers, suppliers };
    })();

    try {
      return await taxonomyConfigPromise;
    } catch (error) {
      taxonomyConfigPromise = null;
      throw error;
    }
  }

  function applyTaxonomyToFormConfig({ categories, brands, suppliers }) {
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
  }

  function syncNativeSelect(select, data, emptyText) {
    if (!select) return;
    const currentValue = select.value;
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

    if (currentValue && Array.from(select.options).some(option => option.value === currentValue)) {
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
    syncNativeSelect(document.querySelector('#pf select[name="brand"]'), config.BRANDS || [], "Sin marca");
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

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
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

  function ensureTaxonomySheet() {
    let root = document.getElementById("taxonomy-manager");
    if (root) return root;

    root = document.createElement("div");
    root.id = "taxonomy-manager";
    root.className = "taxonomy-manager";
    root.dataset.state = "closed";
    root.innerHTML = `
      <div class="taxonomy-manager__scrim" data-taxonomy-close></div>
      <aside class="taxonomy-manager__panel" role="dialog" aria-modal="true" aria-labelledby="taxonomy-manager-title">
        <header class="taxonomy-manager__header">
          <div>
            <span class="taxonomy-manager__eyebrow">Catálogo</span>
            <h3 id="taxonomy-manager-title">Gestionar</h3>
          </div>
          <button class="taxonomy-manager__close" type="button" data-taxonomy-close aria-label="Cerrar">x</button>
        </header>
        <div class="taxonomy-manager__body">
          <form class="taxonomy-manager__form" data-taxonomy-create-form>
            <div data-taxonomy-create-fields></div>
          </form>
          <div class="taxonomy-manager__context" data-taxonomy-context></div>
          <div class="taxonomy-manager__list" data-taxonomy-list></div>
        </div>
      </aside>
    `;

    root.addEventListener("click", handleTaxonomySheetClick);
    root.querySelector("[data-taxonomy-create-form]").addEventListener("submit", handleTaxonomyCreate);
    document.body.appendChild(root);
    return root;
  }

  function closeTaxonomySheet() {
    const root = document.getElementById("taxonomy-manager");
    if (!root) return;
    root.dataset.state = "closed";
    root.removeAttribute("data-type");
  }

  function renderTaxonomySheet(state) {
    const root = ensureTaxonomySheet();
    const meta = getTaxonomyMeta(state.type);
    const items = getTaxonomyItems(state.type, state.categories, state.brands, state.categoryKey, state.sellers, state.suppliers);
    const title = root.querySelector("#taxonomy-manager-title");
    const createFields = root.querySelector("[data-taxonomy-create-fields]");
    const context = root.querySelector("[data-taxonomy-context]");
    const list = root.querySelector("[data-taxonomy-list]");

    title.textContent = `Gestionar ${meta.title}`;
    context.textContent = state.type === "subcategory"
      ? `Categoría: ${state.categories[state.categoryKey]?.name || ""}`
      : "";

    if (createFields) {
      if (state.type === "seller" || state.type === "supplier") {
        const itemPlaceholder = state.type === "seller" ? "Nuevo vendedor" : "Nuevo proveedor";
        const emailPlaceholder = state.type === "seller" ? "ventas@kitchencleanvalenzuela.com" : "proveedor@empresa.com";
        createFields.innerHTML = `
          <div class="taxonomy-manager__seller-form">
            <div class="taxonomy-manager__seller-grid">
              <label class="taxonomy-manager__label">
                Nombre
                <input id="taxonomy-manager-input" data-seller-name type="text" autocomplete="off" placeholder="${itemPlaceholder}" />
              </label>
              <label class="taxonomy-manager__label">
                Tel
                <input data-seller-tel type="tel" autocomplete="off" placeholder="6242250029" />
              </label>
              <label class="taxonomy-manager__label taxonomy-manager__seller-email">
                Email
                <input data-seller-email type="email" autocomplete="off" placeholder="${emailPlaceholder}" />
              </label>
            </div>
            <div class="taxonomy-manager__input-row taxonomy-manager__input-row--seller">
              <span></span>
              <button type="submit" data-taxonomy-create-submit>Guardar</button>
            </div>
          </div>
        `;
      } else {
        createFields.innerHTML = `
          <label class="taxonomy-manager__label" for="taxonomy-manager-input">Agregar ${meta.singular}</label>
          <div class="taxonomy-manager__input-row">
            <input id="taxonomy-manager-input" type="text" autocomplete="off" placeholder="${escapeHtml(meta.placeholder)}" />
            <button type="submit" data-taxonomy-create-submit>Guardar</button>
          </div>
        `;
      }
    }

    list.innerHTML = items.length
      ? items.map((item) => (state.type === "seller" || state.type === "supplier")
        ? `
        <div class="taxonomy-manager__item taxonomy-manager__item--seller" data-taxonomy-key="${escapeHtml(item.key)}">
          <div class="taxonomy-manager__item-main">
            <span class="taxonomy-manager__item-name">${escapeHtml(item.label || "Sin nombre")}</span>
            <div class="taxonomy-manager__item-meta">
              <span>${escapeHtml(item.tel || "Sin tel")}</span>
              <span>${escapeHtml(item.email || "Sin email")}</span>
            </div>
          </div>
          <div class="taxonomy-manager__item-actions">
            <button type="button" data-taxonomy-edit="${escapeHtml(item.key)}">Editar</button>
            <button type="button" data-taxonomy-delete="${escapeHtml(item.key)}">Eliminar</button>
          </div>
        </div>
      `
        : `
        <div class="taxonomy-manager__item" data-taxonomy-key="${escapeHtml(item.key)}">
          <span class="taxonomy-manager__item-name">${escapeHtml(item.label)}</span>
          <div class="taxonomy-manager__item-actions">
            <button type="button" data-taxonomy-edit="${escapeHtml(item.key)}">Editar</button>
            <button type="button" data-taxonomy-delete="${escapeHtml(item.key)}">Eliminar</button>
          </div>
        </div>
      `).join("")
      : `<div class="taxonomy-manager__empty">Sin ${meta.title.toLowerCase()} todavía.</div>`;

    root.__taxonomyState = state;
    root.dataset.type = state.type;
  }

  async function openTaxonomySheet(type) {
    const categoryKey = document.getElementById("f-cat")?.value || "";
    if (type === "subcategory" && !categoryKey) {
      window.showToast?.("Selecciona una categoría antes de agregar subcategoría.", "warning");
      return;
    }

    const loaded = await loadTaxonomyConfig();
    const root = ensureTaxonomySheet();
    const state = {
      type,
      categoryKey,
      categories: cloneJson(loaded.categories),
      brands: [...loaded.brands],
      sellers: cloneJson(loaded.sellers || []),
      suppliers: cloneJson(loaded.suppliers || []),
    };

    renderTaxonomySheet(state);
    root.dataset.state = "open";
    window.setTimeout(() => {
      const input = root.querySelector("#taxonomy-manager-input");
      input.value = "";
      input.focus();
    }, 30);
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

  async function persistTaxonomyState(state, selectedKey, selectedLabel, message) {
    await saveTaxonomyConfig(state.categories, state.brands, state.sellers, state.suppliers);
    taxonomyConfigPromise = null;
    applyTaxonomyToFormConfig({ categories: state.categories, brands: state.brands, suppliers: state.suppliers });
    updateTaxonomySelects();
    if (selectedKey || selectedLabel) selectTaxonomyValue(state.type, selectedKey, selectedLabel);
    renderTaxonomySheet(state);
    window.dispatchEvent(new CustomEvent("taxonomy:updated", {
      detail: { type: state.type },
    }));
    window.showToast?.(message, "success");
  }

  async function handleTaxonomyCreate(event) {
    event.preventDefault();
    const root = document.getElementById("taxonomy-manager");
    const state = root?.__taxonomyState;
    const meta = getTaxonomyMeta(state?.type);
    const input = root?.querySelector("#taxonomy-manager-input");
    const submitButton = root?.querySelector("[data-taxonomy-create-submit]");
    const sellerNameInput = root?.querySelector("[data-seller-name]");
    const sellerTelInput = root?.querySelector("[data-seller-tel]");
    const sellerEmailInput = root?.querySelector("[data-seller-email]");
    const value = input?.value.trim();
    if (!state) return;
    if (state.type === "seller" || state.type === "supplier") {
      const name = sellerNameInput?.value.trim() || "";
      const tel = sellerTelInput?.value.trim() || "";
      const email = sellerEmailInput?.value.trim() || "";
      if (!name) return;
      if (!tel && !email) {
        window.showToast?.(`Agrega al menos un teléfono o email para el ${meta.singular}.`, "warning");
        return;
      }
      try {
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.dataset.loading = "true";
          submitButton.textContent = "Guardando...";
        }
        if (sellerNameInput) sellerNameInput.disabled = true;
        if (sellerTelInput) sellerTelInput.disabled = true;
        if (sellerEmailInput) sellerEmailInput.disabled = true;

        const isSeller = state.type === "seller";
        const current = isSeller ? (state.sellers || []) : (state.suppliers || []);
        const item = {
          id: isSeller ? createSellerId(name, tel, email) : createSellerId(name, tel, email).replace(/^seller-/, "supplier-"),
          name,
          tel,
          email,
        };
        if (isSeller) {
          state.sellers = [...current, item];
        } else {
          state.suppliers = [...current, item];
        }
        await persistTaxonomyState(state, item.id, name, `Se agregó el ${meta.singular}.`);
        sellerNameInput.value = "";
        sellerTelInput.value = "";
        sellerEmailInput.value = "";
        sellerNameInput.focus();
      } catch (error) {
        console.error("ProductFormSheet: taxonomy create failed", error);
        window.showToast?.(`No se pudo guardar el ${meta.singular}.`, "danger");
      } finally {
        const currentRoot = document.getElementById("taxonomy-manager");
        const currentNameInput = currentRoot?.querySelector("[data-seller-name]");
        const currentTelInput = currentRoot?.querySelector("[data-seller-tel]");
        const currentEmailInput = currentRoot?.querySelector("[data-seller-email]");
        const currentSubmit = currentRoot?.querySelector("[data-taxonomy-create-submit]");
        if (currentSubmit) {
          currentSubmit.disabled = false;
          currentSubmit.dataset.loading = "false";
          currentSubmit.textContent = "Guardar";
        }
        if (currentNameInput) currentNameInput.disabled = false;
        if (currentTelInput) currentTelInput.disabled = false;
        if (currentEmailInput) currentEmailInput.disabled = false;
      }
      return;
    }
    if (!value) return;

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.dataset.loading = "true";
        submitButton.textContent = "Guardando...";
      }
      if (input) input.disabled = true;

      if (state.type === "category") {
        const key = getNextCategoryKey(state.categories);
        state.categories[key] = { name: value, subcategories: [] };
        await persistTaxonomyState(state, key, value, `Se agregó la ${meta.singular}.`);
        closeTaxonomySheet();
        return;
      } else if (state.type === "subcategory") {
        const current = state.categories[state.categoryKey].subcategories || [];
        state.categories[state.categoryKey].subcategories = Array.from(new Set([...current, value]));
        await persistTaxonomyState(state, slugifyTaxonomyValue(value), value, `Se agregó la ${meta.singular}.`);
        closeTaxonomySheet();
        return;
      } else if (state.type === "brand") {
        const current = state.brands || [];
        state.brands = Array.from(new Set([...current, value]));
        await persistTaxonomyState(state, value, value, `Se agregó la ${meta.singular}.`);
        closeTaxonomySheet();
        return;
      }
      input.value = "";
      input.focus();
    } catch (error) {
      console.error("ProductFormSheet: taxonomy create failed", error);
      window.showToast?.(`No se pudo guardar la ${meta.singular}.`, "danger");
    } finally {
      const currentRoot = document.getElementById("taxonomy-manager");
      const currentInput = currentRoot?.querySelector("#taxonomy-manager-input");
      const currentSubmit = currentRoot?.querySelector("[data-taxonomy-create-submit]");
      if (currentSubmit) {
        currentSubmit.disabled = false;
        currentSubmit.dataset.loading = "false";
        currentSubmit.textContent = "Guardar";
      }
      if (currentInput) currentInput.disabled = false;
    }
  }

  async function handleTaxonomyRename(root, state, key, value) {
    const meta = getTaxonomyMeta(state.type);
    if (!value) return;

    if (state.type === "category") {
      state.categories[key].name = value;
      await persistTaxonomyState(state, key, value, `Se actualizó la ${meta.singular}.`);
    } else if (state.type === "subcategory") {
      const current = state.categories[state.categoryKey].subcategories || [];
      const index = current.findIndex(item => slugifyTaxonomyValue(item) === key);
      if (index === -1) return;
      current[index] = value;
      state.categories[state.categoryKey].subcategories = Array.from(new Set(current));
      await persistTaxonomyState(state, slugifyTaxonomyValue(value), value, `Se actualizó la ${meta.singular}.`);
    } else if (state.type === "brand") {
      const current = state.brands || [];
      const index = current.indexOf(key);
      if (index === -1) return;
      current[index] = value;
      state.brands = Array.from(new Set(current));
      await persistTaxonomyState(state, value, value, `Se actualizó la ${meta.singular}.`);
    } else if (state.type === "supplier") {
      const current = state.suppliers || [];
      const index = current.findIndex(item => item.id === key);
      if (index === -1) return;
      current[index] = {
        ...current[index],
        name: value,
      };
      state.suppliers = [...current];
      await persistTaxonomyState(state, current[index].id, value, `Se actualizó la ${meta.singular}.`);
    } else {
      const current = state.sellers || [];
      const index = current.findIndex(item => item.id === key);
      if (index === -1) return;
      current[index] = {
        ...current[index],
        name: value,
      };
      state.sellers = [...current];
      await persistTaxonomyState(state, current[index].id, value, `Se actualizó la ${meta.singular}.`);
    }
    root.querySelector((state.type === "seller" || state.type === "supplier") ? "[data-seller-name]" : "#taxonomy-manager-input")?.focus();
  }

  async function handleTaxonomyDelete(root, state, key) {
    const meta = getTaxonomyMeta(state.type);
    const deleteButton = Array.from(root.querySelectorAll("[data-taxonomy-delete]"))
      .find(button => button.dataset.taxonomyDelete === key);
    if (deleteButton) {
      deleteButton.disabled = true;
      deleteButton.dataset.loading = "true";
      deleteButton.textContent = "Eliminando...";
    }

    if (state.type === "category") {
      delete state.categories[key];
    } else if (state.type === "subcategory") {
      const current = state.categories[state.categoryKey].subcategories || [];
      state.categories[state.categoryKey].subcategories = current.filter(item => slugifyTaxonomyValue(item) !== key);
    } else if (state.type === "brand") {
      state.brands = (state.brands || []).filter(item => item !== key);
    } else if (state.type === "supplier") {
      state.suppliers = (state.suppliers || []).filter(item => item.id !== key);
    } else {
      state.sellers = (state.sellers || []).filter(item => item.id !== key);
    }

    try {
      await persistTaxonomyState(state, "", "", `Se eliminó la ${meta.singular}.`);
      root.querySelector("#taxonomy-manager-input")?.focus();
    } catch (error) {
      console.error("ProductFormSheet: taxonomy delete failed", error);
      window.showToast?.(`No se pudo eliminar la ${meta.singular}.`, "danger");
    } finally {
      const currentButton = Array.from(root.querySelectorAll("[data-taxonomy-delete]"))
        .find(button => button.dataset.taxonomyDelete === key);
      if (currentButton) {
        currentButton.disabled = false;
        currentButton.dataset.loading = "false";
        currentButton.textContent = "Eliminar";
      }
    }
  }

  function renderTaxonomyEditRow(root, key) {
    const state = root.__taxonomyState;
    const item = getTaxonomyItems(state.type, state.categories, state.brands, state.categoryKey, state.sellers, state.suppliers)
      .find(candidate => candidate.key === key);
    const row = Array.from(root.querySelectorAll("[data-taxonomy-key]"))
      .find(candidate => candidate.dataset.taxonomyKey === key);
    if (!item || !row) return;

    if (state.type === "seller" || state.type === "supplier") {
      row.innerHTML = `
        <div class="taxonomy-manager__seller-edit">
          <label class="taxonomy-manager__label">
            Nombre
            <input class="taxonomy-manager__edit-input" data-seller-edit-name type="text" value="${escapeHtml(item.label)}" />
          </label>
          <label class="taxonomy-manager__label">
            Tel
            <input class="taxonomy-manager__edit-input" data-seller-edit-tel type="tel" value="${escapeHtml(item.tel || "")}" />
          </label>
          <label class="taxonomy-manager__label">
            Email
            <input class="taxonomy-manager__edit-input" data-seller-edit-email type="email" value="${escapeHtml(item.email || "")}" />
          </label>
        </div>
        <div class="taxonomy-manager__item-actions">
          <button type="button" data-taxonomy-save-edit="${escapeHtml(item.key)}">Guardar</button>
          <button type="button" data-taxonomy-cancel-edit>Cancelar</button>
        </div>
      `;
      row.querySelector("[data-seller-edit-name]")?.focus();
      return;
    }

    row.innerHTML = `
      <input class="taxonomy-manager__edit-input" type="text" value="${escapeHtml(item.label)}" />
      <div class="taxonomy-manager__item-actions">
        <button type="button" data-taxonomy-save-edit="${escapeHtml(item.key)}">Guardar</button>
        <button type="button" data-taxonomy-cancel-edit>Cancelar</button>
      </div>
    `;
    row.querySelector(".taxonomy-manager__edit-input")?.focus();
  }

  async function handleTaxonomySheetClick(event) {
    const root = event.currentTarget;
    const state = root.__taxonomyState;

    if (event.target.closest("[data-taxonomy-close]")) {
      closeTaxonomySheet();
      return;
    }
    if (!state) return;

    const editButton = event.target.closest("[data-taxonomy-edit]");
    if (editButton) {
      renderTaxonomyEditRow(root, editButton.dataset.taxonomyEdit);
      return;
    }

    const cancelButton = event.target.closest("[data-taxonomy-cancel-edit]");
    if (cancelButton) {
      renderTaxonomySheet(state);
      return;
    }

    const saveButton = event.target.closest("[data-taxonomy-save-edit]");
    if (saveButton) {
      const row = saveButton.closest("[data-taxonomy-key]");
      const cancelButton = row?.querySelector("[data-taxonomy-cancel-edit]");
      const inputs = row?.querySelectorAll("input");

      const restoreButtonsAndInputs = () => {
        if (saveButton) {
          saveButton.disabled = false;
          saveButton.dataset.loading = "false";
          saveButton.textContent = "Guardar";
        }
        if (cancelButton) cancelButton.disabled = false;
        if (inputs) inputs.forEach(input => input.disabled = false);
      };

      try {
        if (saveButton) {
          saveButton.disabled = true;
          saveButton.dataset.loading = "true";
          saveButton.textContent = "Guardando...";
        }
        if (cancelButton) cancelButton.disabled = true;
        if (inputs) inputs.forEach(input => input.disabled = true);

        if (state.type === "seller" || state.type === "supplier") {
          const name = row?.querySelector("[data-seller-edit-name]")?.value.trim();
          const tel = row?.querySelector("[data-seller-edit-tel]")?.value.trim();
          const email = row?.querySelector("[data-seller-edit-email]")?.value.trim();
          const isSeller = state.type === "seller";
          const currentList = isSeller ? (state.sellers || []) : (state.suppliers || []);
          const sellerItem = currentList.find(item => item.id === saveButton.dataset.taxonomySaveEdit);
          if (!sellerItem) {
            restoreButtonsAndInputs();
            return;
          }
          if (!name) {
            window.showToast?.(`El ${getTaxonomyMeta(state.type).singular} necesita un nombre.`, "warning");
            restoreButtonsAndInputs();
            return;
          }
          if (!tel && !email) {
            window.showToast?.(`Agrega al menos un teléfono o email para el ${getTaxonomyMeta(state.type).singular}.`, "warning");
            restoreButtonsAndInputs();
            return;
          }
          sellerItem.name = name;
          sellerItem.tel = tel || "";
          sellerItem.email = email || "";
          await persistTaxonomyState(state, sellerItem.id, name, `Se actualizó la ${getTaxonomyMeta(state.type).singular}.`);
        } else {
          const value = row?.querySelector(".taxonomy-manager__edit-input")?.value.trim();
          if (!value) {
            restoreButtonsAndInputs();
            return;
          }
          await handleTaxonomyRename(root, state, saveButton.dataset.taxonomySaveEdit, value);
        }
      } catch (error) {
        console.error("ProductFormSheet: taxonomy rename failed", error);
        window.showToast?.("No se pudo actualizar.", "danger");
        restoreButtonsAndInputs();
      }
      return;
    }

    const deleteButton = event.target.closest("[data-taxonomy-delete]");
    if (deleteButton) {
      await handleTaxonomyDelete(root, state, deleteButton.dataset.taxonomyDelete);
    }
  }

  async function saveTaxonomyConfig(categories, brands, sellers = [], suppliers = []) {
    const loaded = await loadTaxonomyConfig();
    const recordId = loaded.record.id || taxonomyConfigRecord?.id;
    if (!recordId) throw new Error("El registro configs no tiene id");

    await window.SyncManager.shumRequest("update", {
      baseId: window.SyncManager.config.baseId,
      table: "configs",
      recordId,
      data: {
        Categorias: JSON.stringify(categories),
        Subcategorias: JSON.stringify(
          Object.fromEntries(Object.entries(categories).map(([key, value]) => [key, value.subcategories || []]))
        ),
        Marcas: JSON.stringify(brands),
        vendedores: JSON.stringify(sellers),
        proveedores: JSON.stringify(suppliers),
      },
    });
  }

  function readDraftValues(form) {
    const imageInput = form?.querySelector('input[name="product_image"]');
    const selectedType = form?.querySelector('input[name="type"]:checked');

    return {
      nombre: getValue(form, 'input[name="name"]') || getValue(document, "#qf-name"),
      codigo: getValue(form, 'input[name="code"]') || getValue(document, "#qf-code"),
      barcodeType: getValue(form, 'select[name="barcode_symbology"]') || "code128",
      marca: getValue(form, 'select[name="brand"]') || "Generales",
      categoriaCodigo: getValue(form, 'select[name="category"]') || "other",
      unitCode: getSelectedText(form, 'select[name="unit"]') || getValue(document, "#qf-unit"),
      costo: getNumber(form, 'input[name="cost"]') || getNumber(document, "#qf-cost"),
      precio: getNumber(form, 'input[name="price"]') || getNumber(document, "#qf-price"),
      alertaCantidad: getNumber(form, 'input[name="alert_quantity"]'),
      tasaImpuesto: getValue(form, 'select[name="tax_rate"]') === "5" ? "IVA" : "",
      metodoImpuesto: getValue(form, 'select[name="tax_method"]') === "0" ? "Inclusivo" : "Exclusivo",
      imagen: imageInput?.files?.[0]?.name || "",
      especificaciones: getValue(form, 'textarea[name="details"]'),
      especial3: getValue(form, 'textarea[name="history"]'),
      especial4: getValue(form, 'input[name="cf1"]'),
      especial5: getValue(form, 'input[name="cf2"]'),
      especial6: getValue(form, 'input[name="cf3"]'),
      stock: getNumber(form, 'input[name="wh_qty_3"]') + getNumber(form, 'input[name="wh_qty_4"]'),
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

    Object.assign(draft, readDraftValues(form), {
      id: draft.id,
      airtable_id: draft.airtable_id || null,
      status: "draft",
      sync_status: "draft",
      createdAt: draft.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    if (typeof window.saveProductsToStorage === "function") {
      window.saveProductsToStorage();
    } else {
      localStorage.setItem("kv-catalog-products", JSON.stringify(window.AppState.products));
    }

    updateHeader();
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
      await openTaxonomySheet(button.dataset.taxonomyAdd);
    } catch (error) {
      console.error("ProductFormSheet: taxonomy sheet failed", error);
      window.showToast?.("No se pudo abrir el administrador.", "danger");
    } finally {
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
          window.openProductDrawer(product);
        }
      }
    });

    const form = document.getElementById("pf");
    if (form && !autosaveBound) {
      form.addEventListener("input", scheduleDraftAutosave);
      form.addEventListener("change", scheduleDraftAutosave);
      autosaveBound = true;
    }
    if (form && !taxonomyActionsBound) {
      form.addEventListener("click", handleTaxonomyAction);
      taxonomyActionsBound = true;
    }
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
  };

  window.ProductFormTaxonomy = {
    load: loadTaxonomyConfig,
    open: openTaxonomySheet,
    refresh() {
      taxonomyConfigPromise = null;
      return loadTaxonomyConfig();
    },
  };
})();
