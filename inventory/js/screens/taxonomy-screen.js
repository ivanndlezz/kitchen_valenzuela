/**
 * taxonomy-screen.js
 * Catalog screen for product categories, subcategories, brands, and sellers.
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

  function renderSellers(data) {
    const sellers = (data.sellers || []).map((seller) => {
      if (typeof seller === "string") {
        return { name: seller, tel: "", email: "" };
      }
      return {
        name: seller?.name || seller?.nombre || seller?.label || "",
        tel: seller?.tel || seller?.telefono || seller?.phone || "",
        email: seller?.email || seller?.correo || seller?.mail || "",
      };
    });

    if (!sellers.length) {
      return `<div class="quote-empty-state">No hay vendedores registrados.</div>`;
    }

    return `
      <div class="taxonomy-list">
        ${sellers.map((seller) => `
          <div class="taxonomy-list__row taxonomy-list__row--seller">
            <div class="taxonomy-list__seller">
              <strong>${escapeHtml(seller.name || "Sin nombre")}</strong>
              <span>${escapeHtml(seller.tel || "Sin tel")}</span>
              <span>${escapeHtml(seller.email || "Sin email")}</span>
            </div>
            <button type="button" class="taxonomy-card__action" data-open-taxonomy="seller">
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

  function renderTaxonomyBody() {
    const body = getBody();
    if (!body) return;

    if (!cachedTaxonomy) {
      body.innerHTML = `<div class="quote-empty-state">Cargando catálogos...</div>`;
      return;
    }

    if (activeTab === "categories") {
      body.innerHTML = renderCategories(cachedTaxonomy);
    } else if (activeTab === "sellers") {
      body.innerHTML = renderSellers(cachedTaxonomy);
    } else if (activeTab === "suppliers") {
      body.innerHTML = renderSuppliers(cachedTaxonomy);
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

    const addSeller = document.getElementById("taxonomy-add-seller");
    if (addSeller && addSeller.dataset.bound !== "true") {
      addSeller.addEventListener("click", () => openManager("seller"));
      addSeller.dataset.bound = "true";
    }

    const addSupplier = document.getElementById("taxonomy-add-supplier");
    if (addSupplier && addSupplier.dataset.bound !== "true") {
      addSupplier.addEventListener("click", () => openManager("supplier"));
      addSupplier.dataset.bound = "true";
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
