/**
 * taxonomy-screen.js
 * Catalog screen for product categories, subcategories, brands, users, and roles.
 */

(function () {
  let activeTab = "categories";
  let cachedTaxonomy = null;

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getBody() {
    return document.getElementById("taxonomy-screen-body");
  }

  function setActiveTab(tab) {
    activeTab = tab;
    document.querySelectorAll("[data-taxonomy-tab]").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.taxonomyTab === tab);
    });
    renderTaxonomyBody();
  }

  async function loadTaxonomy() {
    const body = getBody();
    if (!window.ProductFormTaxonomy?.load) {
      if (body) body.innerHTML = `<div class="quote-empty-state">El administrador de catálogos no está disponible.</div>`;
      return null;
    }

    try {
      cachedTaxonomy = await window.ProductFormTaxonomy.load();
      return cachedTaxonomy;
    } catch (error) {
      console.error("TaxonomyScreen: failed to load taxonomy", error);
      if (body) body.innerHTML = `<div class="quote-empty-state">No se pudieron cargar los catálogos.</div>`;
      return null;
    }
  }

  function renderCategories(data) {
    const categories = Object.entries(data.categories || {});
    if (!categories.length) {
      return `<div class="quote-empty-state">No hay categorías registradas.</div>`;
    }

    return `
      <div class="taxonomy-grid">
        ${categories.map(([key, category]) => {
          const subcategories = category.subcategories || [];
          return `
            <article class="taxonomy-card">
              <div class="taxonomy-card__top">
                <div>
                  <span class="taxonomy-card__code">${escapeHtml(key)}</span>
                  <h3>${escapeHtml(category.name || key)}</h3>
                </div>
                <button type="button" class="taxonomy-card__action" data-open-taxonomy="category">
                  Editar
                </button>
              </div>
              <div class="taxonomy-card__meta">${subcategories.length} subcategorías</div>
              <div class="taxonomy-chip-list">
                ${subcategories.length
                  ? subcategories.map(sub => `<span class="taxonomy-chip">${escapeHtml(sub)}</span>`).join("")
                  : `<span class="taxonomy-chip taxonomy-chip--empty">Sin subcategorías</span>`}
              </div>
            </article>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderTextList(items, emptyText, type) {
    if (!items.length) {
      return `<div class="quote-empty-state">${escapeHtml(emptyText)}</div>`;
    }

    return `
      <div class="taxonomy-list">
        ${items.map((item) => `
          <div class="taxonomy-list__row">
            <span>${escapeHtml(item)}</span>
            <button type="button" class="taxonomy-card__action" data-open-taxonomy="${escapeHtml(type)}">
              Editar
            </button>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderBrands(data) {
    return renderTextList(data.brands || [], "No hay marcas registradas.", "brand");
  }

  function renderUsers(data) {
    const users = (data.users || data.sellers || []).map((user) => {
      if (typeof user === "string") {
        return { name: user, tel: "", email: "", roles: ["vendedor"] };
      }
      return {
        name: user?.name || user?.nombre || user?.label || "",
        tel: user?.tel || user?.telefono || user?.phone || "",
        email: user?.email || user?.correo || user?.mail || "",
        roles: Array.isArray(user?.roles) ? user.roles : [user?.role || user?.rol || "vendedor"].filter(Boolean),
        warehouseIds: Array.isArray(user?.warehouseIds) ? user.warehouseIds : [user?.warehouseIds || user?.warehouses || user?.almacenes].filter(Boolean),
      };
    });

    if (!users.length) {
      return `<div class="quote-empty-state">No hay usuarios registrados.</div>`;
    }

    return `
      <div class="taxonomy-list">
        ${users.map((user) => `
          <div class="taxonomy-list__row taxonomy-list__row--seller">
            <div class="taxonomy-list__seller">
              <strong>${escapeHtml(user.name || "Sin nombre")}</strong>
              <span>${escapeHtml((user.roles || []).join(", ") || "Sin rol")}</span>
              <span>Almacenes: ${escapeHtml((user.warehouseIds || []).join(", ") || "Todos")}</span>
              <span>${escapeHtml(user.tel || "Sin tel")}</span>
              <span>${escapeHtml(user.email || "Sin email")}</span>
            </div>
            <button type="button" class="taxonomy-card__action" data-open-taxonomy="user">
              Editar
            </button>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderSuppliers(data) {
    const suppliers = (data.suppliers || []).map((supplier) => {
      if (typeof supplier === "string") {
        return { name: supplier, tel: "", email: "" };
      }
      return {
        name: supplier?.name || supplier?.nombre || supplier?.label || "",
        tel: supplier?.tel || supplier?.telefono || supplier?.phone || "",
        email: supplier?.email || supplier?.correo || supplier?.mail || "",
      };
    });

    if (!suppliers.length) {
      return `<div class="quote-empty-state">No hay proveedores registrados.</div>`;
    }

    return `
      <div class="taxonomy-list">
        ${suppliers.map((supplier) => `
          <div class="taxonomy-list__row taxonomy-list__row--seller">
            <div class="taxonomy-list__seller">
              <strong>${escapeHtml(supplier.name || "Sin nombre")}</strong>
              <span>${escapeHtml(supplier.tel || "Sin tel")}</span>
              <span>${escapeHtml(supplier.email || "Sin email")}</span>
            </div>
            <button type="button" class="taxonomy-card__action" data-open-taxonomy="supplier">
              Editar
            </button>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderWarehouses(data) {
    const warehouses = data.warehouses || [];
    if (!warehouses.length) {
      return `<div class="quote-empty-state">No hay almacenes registrados.</div>`;
    }

    return `
      <div class="taxonomy-list">
        ${warehouses.map((warehouse) => `
          <div class="taxonomy-list__row">
            <div class="taxonomy-list__seller">
              <strong>${escapeHtml(warehouse.name || "Sin nombre")}</strong>
              <span>ID ${escapeHtml(warehouse.id || "")}</span>
            </div>
            <button type="button" class="taxonomy-card__action" data-open-taxonomy="warehouse">
              Editar
            </button>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderRoles(data) {
    const roles = data.roles || [];
    if (!roles.length) {
      return `<div class="quote-empty-state">No hay roles registrados.</div>`;
    }

    return `
      <div class="taxonomy-list">
        ${roles.map((role) => `
          <div class="taxonomy-list__row taxonomy-list__row--seller">
            <div class="taxonomy-list__seller">
              <strong>${escapeHtml(role.label || role.name || role.id || "Sin nombre")}</strong>
              <span>${escapeHtml((role.uiScopes || []).join(", ") || "Sin UI scopes")}</span>
              <span>${escapeHtml((role.capabilities || []).join(", ") || "Sin capabilities")}</span>
            </div>
            <button type="button" class="taxonomy-card__action" data-open-taxonomy="role">
              Editar
            </button>
          </div>
        `).join("")}
      </div>
    `;
  }

  function renderTaxonomyBody() {
    const body = getBody();
    if (!body) return;

    if (!cachedTaxonomy) {
      body.innerHTML = `
        <div class="taxonomy-grid" aria-busy="true">
          ${Array.from({ length: 4 }).map(() => `
            <article class="taxonomy-card">
              <div class="taxonomy-card__top">
                <div style="width: 100%;">
                  <div class="skeleton-bone" style="width: 42px; height: 16px; margin-bottom: 12px;"></div>
                  <div class="skeleton-bone" style="width: 70%; height: 22px;"></div>
                </div>
                <div class="skeleton-bone" style="width: 72px; height: 28px;"></div>
              </div>
              <div class="skeleton-bone" style="width: 38%; height: 14px; margin: 18px 0 14px;"></div>
              <div class="taxonomy-chip-list">
                <span class="skeleton-bone" style="width: 86px; height: 28px;"></span>
                <span class="skeleton-bone" style="width: 112px; height: 28px;"></span>
              </div>
            </article>
          `).join("")}
        </div>
      `;
      return;
    }

    if (activeTab === "categories") {
      body.innerHTML = renderCategories(cachedTaxonomy);
    } else if (activeTab === "users") {
      body.innerHTML = renderUsers(cachedTaxonomy);
    } else if (activeTab === "suppliers") {
      body.innerHTML = renderSuppliers(cachedTaxonomy);
    } else if (activeTab === "warehouses") {
      body.innerHTML = renderWarehouses(cachedTaxonomy);
    } else if (activeTab === "roles") {
      body.innerHTML = renderRoles(cachedTaxonomy);
    } else {
      body.innerHTML = renderBrands(cachedTaxonomy);
    }

    if (typeof createLucideIcons === "function") createLucideIcons();
  }

  async function openManager(type) {
    if (type === "subcategory") type = "category";
    await window.ProductFormTaxonomy?.open(type);
  }

function bindTaxonomyScreen() {
    document.querySelectorAll("[data-taxonomy-tab]").forEach((button) => {
      if (button.dataset.bound === "true") return;
      button.addEventListener("click", () => setActiveTab(button.dataset.taxonomyTab));
      button.dataset.bound = "true";
    });

    const addCategory = document.getElementById("taxonomy-add-category");
    if (addCategory && addCategory.dataset.bound !== "true") {
      addCategory.addEventListener("click", () => openManager("category"));
      addCategory.dataset.bound = "true";
    }

    const addBrand = document.getElementById("taxonomy-add-brand");
    if (addBrand && addBrand.dataset.bound !== "true") {
      addBrand.addEventListener("click", () => openManager("brand"));
      addBrand.dataset.bound = "true";
    }

    const addUser = document.getElementById("taxonomy-add-user");
    if (addUser && addUser.dataset.bound !== "true") {
      addUser.addEventListener("click", () => openManager("user"));
      addUser.dataset.bound = "true";
    }

    const addSupplier = document.getElementById("taxonomy-add-supplier");
    if (addSupplier && addSupplier.dataset.bound !== "true") {
      addSupplier.addEventListener("click", () => openManager("supplier"));
      addSupplier.dataset.bound = "true";
    }

    const addWarehouse = document.getElementById("taxonomy-add-warehouse");
    if (addWarehouse && addWarehouse.dataset.bound !== "true") {
      addWarehouse.addEventListener("click", () => openManager("warehouse"));
      addWarehouse.dataset.bound = "true";
    }

    const addRole = document.getElementById("taxonomy-add-role");
    if (addRole && addRole.dataset.bound !== "true") {
      addRole.addEventListener("click", () => openManager("role"));
      addRole.dataset.bound = "true";
    }

    const body = getBody();
    if (body && body.dataset.bound !== "true") {
      body.addEventListener("click", (event) => {
        const button = event.target.closest("[data-open-taxonomy]");
        if (!button) return;
        openManager(button.dataset.openTaxonomy);
      });
      body.dataset.bound = "true";
    }

    if (window.__taxonomyScreenUpdateBound !== true) {
      window.addEventListener("taxonomy:updated", async () => {
        if (!document.getElementById("section-taxonomy")?.classList.contains("app-section--active")) return;
        cachedTaxonomy = await window.ProductFormTaxonomy?.refresh();
        renderTaxonomyBody();
      });
      window.__taxonomyScreenUpdateBound = true;
    }
  }

  window.renderTaxonomyView = async function () {
    bindTaxonomyScreen();
    await loadTaxonomy();
    renderTaxonomyBody();
  };
})();
