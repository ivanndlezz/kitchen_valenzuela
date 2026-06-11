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

  function normalizeBrandList(rawBrands) {
    const defaults = getFormConfig().BRANDS || [];
    const values = Array.isArray(rawBrands)
      ? rawBrands
      : rawBrands && typeof rawBrands === "object" && !isEmptyConfigObject(rawBrands)
        ? Object.values(rawBrands)
        : defaults;

    return Array.from(new Set(values.map(value => String(value || "").trim()).filter(Boolean)));
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

      applyTaxonomyToFormConfig({ categories, brands });
      updateTaxonomySelects();
      return { record, categories, brands };
    })();

    try {
      return await taxonomyConfigPromise;
    } catch (error) {
      taxonomyConfigPromise = null;
      throw error;
    }
  }

  function applyTaxonomyToFormConfig({ categories, brands }) {
    const config = getFormConfig();
    if (config.CATEGORIES && categories) {
      Object.keys(config.CATEGORIES).forEach(key => delete config.CATEGORIES[key]);
      Object.assign(config.CATEGORIES, categories);
    }
    if (Array.isArray(config.BRANDS) && brands) {
      config.BRANDS.splice(0, config.BRANDS.length, ...brands);
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

  function getTaxonomyItems(type, categories, brands, categoryKey) {
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
            <label class="taxonomy-manager__label" for="taxonomy-manager-input">Agregar</label>
            <div class="taxonomy-manager__input-row">
              <input id="taxonomy-manager-input" type="text" autocomplete="off" />
              <button type="submit">Guardar</button>
            </div>
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
    const items = getTaxonomyItems(state.type, state.categories, state.brands, state.categoryKey);
    const title = root.querySelector("#taxonomy-manager-title");
    const label = root.querySelector(".taxonomy-manager__label");
    const input = root.querySelector("#taxonomy-manager-input");
    const context = root.querySelector("[data-taxonomy-context]");
    const list = root.querySelector("[data-taxonomy-list]");

    title.textContent = `Gestionar ${meta.title}`;
    label.textContent = `Agregar ${meta.singular}`;
    input.placeholder = meta.placeholder;
    context.textContent = state.type === "subcategory"
      ? `Categoría: ${state.categories[state.categoryKey]?.name || ""}`
      : "";

    list.innerHTML = items.length
      ? items.map((item) => `
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
    const select = document.querySelector('#pf select[name="brand"]');
    if (!select) return;
    select.value = label;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  async function persistTaxonomyState(state, selectedKey, selectedLabel, message) {
    await saveTaxonomyConfig(state.categories, state.brands);
    taxonomyConfigPromise = null;
    applyTaxonomyToFormConfig({ categories: state.categories, brands: state.brands });
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
    const input = root?.querySelector("#taxonomy-manager-input");
    const value = input?.value.trim();
    if (!state || !value) return;

    const meta = getTaxonomyMeta(state.type);
    try {
      if (state.type === "category") {
        const key = getNextCategoryKey(state.categories);
        state.categories[key] = { name: value, subcategories: [] };
        await persistTaxonomyState(state, key, value, `Se agregó la ${meta.singular}.`);
      } else if (state.type === "subcategory") {
        const current = state.categories[state.categoryKey].subcategories || [];
        state.categories[state.categoryKey].subcategories = Array.from(new Set([...current, value]));
        await persistTaxonomyState(state, slugifyTaxonomyValue(value), value, `Se agregó la ${meta.singular}.`);
      } else {
        state.brands = Array.from(new Set([...state.brands, value]));
        await persistTaxonomyState(state, value, value, `Se agregó la ${meta.singular}.`);
      }
      input.value = "";
      input.focus();
    } catch (error) {
      console.error("ProductFormSheet: taxonomy create failed", error);
      window.showToast?.(`No se pudo guardar la ${meta.singular}.`, "danger");
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
    } else {
      const index = state.brands.findIndex(item => item === key);
      if (index === -1) return;
      state.brands[index] = value;
      state.brands = Array.from(new Set(state.brands));
      await persistTaxonomyState(state, value, value, `Se actualizó la ${meta.singular}.`);
    }
    root.querySelector("#taxonomy-manager-input")?.focus();
  }

  async function handleTaxonomyDelete(root, state, key) {
    const meta = getTaxonomyMeta(state.type);

    if (state.type === "category") {
      delete state.categories[key];
    } else if (state.type === "subcategory") {
      const current = state.categories[state.categoryKey].subcategories || [];
      state.categories[state.categoryKey].subcategories = current.filter(item => slugifyTaxonomyValue(item) !== key);
    } else {
      state.brands = state.brands.filter(item => item !== key);
    }

    try {
      await persistTaxonomyState(state, "", "", `Se eliminó la ${meta.singular}.`);
      root.querySelector("#taxonomy-manager-input")?.focus();
    } catch (error) {
      console.error("ProductFormSheet: taxonomy delete failed", error);
      window.showToast?.(`No se pudo eliminar la ${meta.singular}.`, "danger");
    }
  }

  function renderTaxonomyEditRow(root, key) {
    const state = root.__taxonomyState;
    const item = getTaxonomyItems(state.type, state.categories, state.brands, state.categoryKey)
      .find(candidate => candidate.key === key);
    const row = Array.from(root.querySelectorAll("[data-taxonomy-key]"))
      .find(candidate => candidate.dataset.taxonomyKey === key);
    if (!item || !row) return;

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
      const value = row?.querySelector(".taxonomy-manager__edit-input")?.value.trim();
      try {
        await handleTaxonomyRename(root, state, saveButton.dataset.taxonomySaveEdit, value);
      } catch (error) {
        console.error("ProductFormSheet: taxonomy rename failed", error);
        window.showToast?.("No se pudo actualizar.", "danger");
      }
      return;
    }

    const deleteButton = event.target.closest("[data-taxonomy-delete]");
    if (deleteButton) {
      await handleTaxonomyDelete(root, state, deleteButton.dataset.taxonomyDelete);
    }
  }

  async function saveTaxonomyConfig(categories, brands) {
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
      descripcion: getValue(form, 'textarea[name="product_details"]'),
      especificaciones: getValue(form, 'textarea[name="details"]'),
      especial3: getValue(form, 'textarea[name="history"]'),
      especial4: getValue(form, 'input[name="cf1"]'),
      especial5: getValue(form, 'input[name="cf2"]'),
      especial6: getValue(form, 'input[name="cf3"]'),
      stock: getNumber(form, 'input[name="wh_qty_3"]') + getNumber(form, 'input[name="wh_qty_4"]'),
      tipoProducto: selectedType?.value || "standard",
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
