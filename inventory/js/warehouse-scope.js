/**
 * warehouse-scope.js
 * Header-level working context for the active warehouse/scope.
 */

(function () {
  const STORAGE_KEY = "kv-active-warehouse-scope";
  const ALL_WAREHOUSES = "all";

  const state = {
    select: null,
    warehouses: [],
    activeId: ALL_WAREHOUSES,
  };

  function getFallbackWarehouses() {
    return (window.ProductFormConfig?.WAREHOUSES || [])
      .filter(warehouse => warehouse && warehouse.active !== false)
      .map(warehouse => ({
        id: getPrimitiveText(warehouse.id || warehouse.key || warehouse.value).trim(),
        name: getWarehouseText(warehouse).trim(),
        color: warehouse.color || "",
        active: warehouse.active !== false,
      }))
      .filter(warehouse => warehouse.id && warehouse.name);
  }

  function normalizeWarehouses(warehouses) {
    const source = Array.isArray(warehouses)
      ? warehouses
      : warehouses && typeof warehouses === "object"
        ? Object.entries(warehouses).map(([id, value]) => ({ id, ...(typeof value === "object" ? value : { name: value }) }))
        : [];

    return source
      .filter(warehouse => warehouse && warehouse.active !== false)
      .map((warehouse, index) => {
        const id = getPrimitiveText(warehouse.id || warehouse.key || warehouse.slug).trim() || String(index + 1);
        const name = getWarehouseText(warehouse).trim();
        return {
          id,
          name,
          color: warehouse.color || "",
          active: warehouse.active !== false,
        };
      })
      .filter(warehouse => warehouse.id && warehouse.name);
  }

  function getSavedScope() {
    return localStorage.getItem(STORAGE_KEY) || ALL_WAREHOUSES;
  }

  function resolveActiveId(nextId) {
    const requested = String(nextId || ALL_WAREHOUSES);
    if (requested === ALL_WAREHOUSES) return ALL_WAREHOUSES;
    return state.warehouses.some(warehouse => warehouse.id === requested)
      ? requested
      : ALL_WAREHOUSES;
  }

  function getActiveWarehouse() {
    if (state.activeId === ALL_WAREHOUSES) return null;
    return state.warehouses.find(warehouse => warehouse.id === state.activeId) || null;
  }

  function renderOptions(preferredId) {
    if (!state.select) return;

    const options = [
      '<option value="all">Todos los almacenes</option>',
      ...state.warehouses.map(warehouse => (
        `<option value="${escapeHtml(warehouse.id)}">${escapeHtml(warehouse.name)}</option>`
      )),
    ];

    state.select.innerHTML = options.join("");
    state.activeId = resolveActiveId(preferredId || state.activeId || getSavedScope());
    state.select.value = state.activeId;
  }

  function persistScope(nextId) {
    state.activeId = resolveActiveId(nextId);
    localStorage.setItem(STORAGE_KEY, state.activeId);

    if (window.AppState) {
      window.AppState.activeWarehouseId = state.activeId;
    }

    window.dispatchEvent(new CustomEvent("warehouse:scope-changed", {
      detail: {
        warehouseId: state.activeId,
        warehouse: getActiveWarehouse(),
        scope: state.activeId === ALL_WAREHOUSES ? "all" : "warehouse",
      },
    }));
  }

  async function refreshFromTaxonomy() {
    const preferredId = state.activeId || getSavedScope();
    const fallback = getFallbackWarehouses();
    state.warehouses = fallback;
    renderOptions(preferredId);

    if (!window.ProductFormTaxonomy || typeof window.ProductFormTaxonomy.load !== "function") {
      return;
    }

    try {
      const taxonomy = await window.ProductFormTaxonomy.load();
      const warehouses = normalizeWarehouses(taxonomy?.warehouses);
      if (warehouses.length) {
        state.warehouses = warehouses;
        renderOptions(preferredId);
      }
    } catch (error) {
      console.warn("WarehouseScope: No se pudieron cargar almacenes desde configs.", error);
    }
  }

  function bindEvents() {
    state.select?.addEventListener("change", event => {
      persistScope(event.target.value);
    });

    document.querySelector("[data-warehouse-scope-add]")?.addEventListener("click", () => {
      if (window.ProductFormTaxonomy && typeof window.ProductFormTaxonomy.open === "function") {
        window.ProductFormTaxonomy.open("warehouse");
      }
    });

    window.addEventListener("taxonomy:updated", event => {
      if (event.detail?.type !== "warehouse") return;
      refreshFromTaxonomy().then(() => {
        persistScope(event.detail?.selectedKey || state.activeId);
      });
    });
  }

  function init() {
    state.select = document.getElementById("warehouse-scope-select");
    if (!state.select) return;

    state.activeId = getSavedScope();
    if (window.AppState) {
      window.AppState.activeWarehouseId = state.activeId;
    }

    bindEvents();
    refreshFromTaxonomy().then(() => {
      persistScope(state.activeId);
    });
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
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

    const keys = ["name", "nombre", "label", "title", "text", "value"];
    for (const key of keys) {
      const text = getWarehouseText(value[key]);
      if (text) return text;
    }

    return "";
  }

  window.WarehouseScope = {
    init,
    refresh: refreshFromTaxonomy,
    getActiveId: () => state.activeId,
    getActiveWarehouse,
    getWarehouses: () => state.warehouses.slice(),
  };
})();
