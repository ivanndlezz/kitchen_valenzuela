/**
 * inventory-screen.js
 * Catalog display metrics calculation, filters application, and catalog cards/list renderer.
 */

function calculateMetrics() {
  const totalProducts = window.AppState.products.length;
  const totalStock = window.AppState.products.reduce((sum, p) => sum + (parseFloat(p.stock) || 0), 0);
  const lowStock = window.AppState.products.filter(p => (parseFloat(p.stock) || 0) <= (parseFloat(p.alertaCantidad) || 0)).length;
  
  const brandsSet = new Set();
  window.AppState.products.forEach(p => {
    if (p.marca && p.marca.trim() !== "") {
      brandsSet.add(p.marca.trim().toUpperCase());
    }
  });
  const totalBrands = brandsSet.size;

  window.DOM.metricTotalProducts.textContent = totalProducts;
  window.DOM.metricTotalStock.textContent = totalStock;
  window.DOM.metricLowStock.textContent = lowStock;
  window.DOM.metricTotalBrands.textContent = totalBrands;

  // Badges inside tabs
  updateCategoryCountBadges();
}

function updateCategoryCountBadges() {
  const counts = { all: 0, "01": 0, "02": 0, "03": 0, other: 0 };
  counts.all = window.AppState.products.length;

  window.AppState.products.forEach(p => {
    const cat = p.categoriaCodigo;
    if (cat === "01" || cat === "02" || cat === "03") {
      counts[cat]++;
    } else {
      counts.other++;
    }
  });

  for (const [cat, count] of Object.entries(counts)) {
    const badge = document.getElementById(`count-badge-${cat}`);
    if (badge) badge.textContent = count;
  }
}

function populateBrandFilter() {
  const brandsSet = new Set();
  window.AppState.products.forEach(p => {
    if (p.marca && p.marca.trim() !== "") {
      brandsSet.add(p.marca.trim());
    }
  });
  window.AppState.brands = Array.from(brandsSet).sort();

  const previousValue = window.DOM.brandSelect.value;
  let html = '<option value="all">Todas las Marcas</option>';
  window.AppState.brands.forEach(brand => {
    html += `<option value="${brand}">${brand}</option>`;
  });
  window.DOM.brandSelect.innerHTML = html;
  
  if (window.AppState.brands.includes(previousValue)) {
    window.DOM.brandSelect.value = previousValue;
  } else {
    window.DOM.brandSelect.value = "all";
    window.AppState.filters.brand = "all";
  }
}

function applyFilters() {
  const query = window.AppState.filters.text.toLowerCase().trim();
  const cat = window.AppState.filters.category;
  const brand = window.AppState.filters.brand;
  const stock = window.AppState.filters.stockFilter;

  window.AppState.filteredProducts = window.AppState.products.filter(p => {
    // Search text matches SKU, name, brand, description
    const matchText = !query || 
      String(p.codigo).toLowerCase().includes(query) ||
      String(p.nombre).toLowerCase().includes(query) ||
      String(p.marca).toLowerCase().includes(query) ||
      String(p.descripcion || "").toLowerCase().includes(query) ||
      String(p.especificaciones || "").toLowerCase().includes(query);

    // Category
    let matchCat = true;
    if (cat !== "all") {
      if (cat === "other") {
        matchCat = p.categoriaCodigo !== "01" && p.categoriaCodigo !== "02" && p.categoriaCodigo !== "03";
      } else {
        matchCat = p.categoriaCodigo === cat;
      }
    }

    // Brand
    const matchBrand = brand === "all" || p.marca === brand;

    // Stock filter
    let matchStock = true;
    const stockVal = parseFloat(p.stock) || 0;
    const alertVal = parseFloat(p.alertaCantidad) || 0;
    if (stock === "in-stock") {
      matchStock = stockVal > 0;
    } else if (stock === "low-stock") {
      matchStock = stockVal <= alertVal;
    }

    return matchText && matchCat && matchBrand && matchStock;
  });

  sortFilteredProducts();
  renderProducts();
}

function sortFilteredProducts() {
  const sort = window.AppState.filters.sort;
  window.AppState.filteredProducts.sort((a, b) => {
    if (sort === "name-asc") {
      return a.nombre.localeCompare(b.nombre);
    } else if (sort === "price-asc") {
      return (a.precio || 0) - (b.precio || 0);
    } else if (sort === "price-desc") {
      return (b.precio || 0) - (a.precio || 0);
    } else if (sort === "stock-desc") {
      return (b.stock || 0) - (a.stock || 0);
    }
    return 0;
  });
}

function renderProducts() {
  if (window.AppState.filteredProducts.length === 0) {
    if (window.AppState.products.length === 0) {
      // Absolute empty state
      window.DOM.productsContainer.innerHTML = `
        <div class="catalog__empty">
          <div class="catalog__empty-icon">
            <i data-lucide="scan-barcode"></i>
          </div>
          <h3 class="catalog__empty-title">Tu Inventario está Vacío</h3>
          <p class="catalog__empty-subtitle">Comienza escaneando un código de barras de cualquier equipo industrial o refacción para registrarlo.</p>
          <button class="catalog__empty-action" id="empty-scan-btn">
            <i data-lucide="plus-circle"></i> Escanear Primer Artículo
          </button>
        </div>
      `;
      document.getElementById("empty-scan-btn")?.addEventListener("click", openScanner);
    } else {
      // Query empty state
      window.DOM.productsContainer.innerHTML = `
        <div class="catalog__empty">
          <div class="catalog__empty-icon">
            <i data-lucide="search"></i>
          </div>
          <h3 class="catalog__empty-title">Sin Resultados</h3>
          <p class="catalog__empty-subtitle">Ningún artículo coincide con los criterios de búsqueda o filtros activos.</p>
        </div>
      `;
    }
    createLucideIcons();
    return;
  }

  let html = "";
  const isList = window.AppState.filters.view === "list";

  window.AppState.filteredProducts.forEach(p => {
    let badgeClass = "product-card__badge--otros";
    let badgeLabel = "Otro";
    if (p.categoriaCodigo === "01") {
      badgeClass = "product-card__badge--coccion";
      badgeLabel = "Cocción";
    } else if (p.categoriaCodigo === "02") {
      badgeClass = "product-card__badge--refacciones";
      badgeLabel = "Refacciones";
    } else if (p.categoriaCodigo === "03") {
      badgeClass = "product-card__badge--limpieza";
      badgeLabel = "Limpieza";
    }

    let gradient = "var(--cat-otros-bg)";
    let icon = "box";
    if (p.categoriaCodigo === "01") {
      gradient = "var(--cat-coccion-bg)";
      icon = "flame";
    } else if (p.categoriaCodigo === "02") {
      gradient = "var(--cat-refacciones-bg)";
      icon = "settings";
    } else if (p.categoriaCodigo === "03") {
      gradient = "var(--cat-limpieza-bg)";
      icon = "droplets";
    }

    // Stock badge
    let stockBadgeClass = "product-card__stock-badge--out-stock";
    let stockBadgeText = "Sin existencias";
    let stockIcon = "x-circle";
    const stockNum = parseFloat(p.stock) || 0;
    const alertNum = parseFloat(p.alertaCantidad) || 0;

    if (stockNum > alertNum) {
      stockBadgeClass = "product-card__stock-badge--in-stock";
      stockBadgeText = `${stockNum} unidades`;
      stockIcon = "check";
    } else if (stockNum > 0) {
      stockBadgeClass = "product-card__stock-badge--low-stock";
      stockBadgeText = `Bajo stock (${stockNum})`;
      stockIcon = "alert-triangle";
    }

    const formattedPrice = `$${(p.precio || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const encodedId = typeof encodeId === "function" ? encodeId(p.id) : p.id;
    if (isList) {
      html += `
        <div class="product-card" data-open-id="${encodedId}">
          <div class="product-card__image-container">
            <div class="product-card__image-fallback" style="background: ${gradient}">
              <i data-lucide="${icon}"></i>
            </div>
          </div>
          <div style="flex: 1; min-width: 0;">
            <span class="product-card__brand">${p.marca}</span>
            <h2 class="product-card__name">${p.nombre}</h2>
            <span class="product-card__sku">SKU: ${p.codigo}</span>
          </div>
          <div class="product-card__meta-row">
            <div class="product-card__price-info">
              <span class="product-card__price-label">Precio Neto</span>
              <span class="product-card__price-val">${formattedPrice}</span>
            </div>
            <span class="product-card__stock-badge ${stockBadgeClass}">
              <i data-lucide="${stockIcon}"></i> ${stockBadgeText}
            </span>
          </div>
        </div>
      `;
    } else {
      html += `
        <div class="product-card" data-open-id="${encodedId}">
          <div class="product-card__badges">
            <span class="product-card__badge ${badgeClass}">${badgeLabel}</span>
          </div>
          <div class="product-card__image-container">
            <div class="product-card__image-fallback" style="background: ${gradient}">
              <i data-lucide="${icon}"></i>
            </div>
            <div class="product-card__brand-overlay">${p.marca}</div>
          </div>
          <h2 class="product-card__name">${p.nombre}</h2>
          <span class="product-card__sku">SKU: ${p.codigo}</span>
          <div class="product-card__meta-row">
            <div class="product-card__price-info">
              <span class="product-card__price-label">Precio</span>
              <span class="product-card__price-val">${formattedPrice}</span>
            </div>
            <span class="product-card__stock-badge ${stockBadgeClass}">
              <i data-lucide="${stockIcon}"></i> ${stockBadgeText}
            </span>
          </div>
        </div>
      `;
    }
  });

  window.DOM.productsContainer.innerHTML = html;
  createLucideIcons();
}

window.renderInventoryView = function() {
  calculateMetrics();
  populateBrandFilter();
  applyFilters();
};
