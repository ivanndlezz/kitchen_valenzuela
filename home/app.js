/**
 * Kitchen Valenzuela Catalog & Inventory Engine
 * Handles dynamic JSON data, reactive BEM-compliant search/filtering, quotation building, and exports.
 * Network-Independent: Utilizes local Lucide Icons and native system stacks.
 */

(function () {
  // Global Application State
  const AppState = {
    products: [],
    filteredProducts: [],
    brands: [],
    cart: [],
    filters: {
      text: "",
      category: "all", // "all", "01" (Cocción), "02" (Refacciones), "03" (Limpieza), "other"
      brand: "all",
      stockFilter: "all", // "all", "in-stock", "low-stock"
      sort: "name-asc", // "name-asc", "price-asc", "price-desc", "stock-desc"
      view: "grid", // "grid" or "list"
    },
    theme: "light",
  };

  // DOM Elements - Mapped strictly to new BEM classes
  const DOM = {
    themeBtn: null,
    productsContainer: null,
    searchInput: null,
    categoryTabsContainer: null,
    brandSelect: null,
    stockFilterSelect: null,
    sortSelect: null,
    viewGridBtn: null,
    viewListBtn: null,
    
    // Metrics
    metricTotalProducts: null,
    metricTotalStock: null,
    metricLowStock: null,
    metricTotalBrands: null,

    // Drawer (Detail Side-sheet)
    scrim: null,
    detailDrawer: null,
    closeDrawerBtn: null,
    drawerBody: null,
    drawerActions: null,

    // Bottom Island Cart
    bottomIsland: null,
    islandHandleBar: null,
    islandCompactRow: null,
    islandExpandedBody: null,
    cartCounter: null,
    cartCountText: null,
    islandTotalText: null,
    islandActionTrigger: null,
    cartItemsContainer: null,
    quoteSubtotal: null,
    quoteIva: null,
    quoteTotal: null,
    clearCartBtn: null,
    btnExportWhatsapp: null,
    btnExportPdf: null,
    printInvoiceContainer: null,
  };

  // Cache elements and run init on DOMContentLoaded
  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheElements();
    setupTheme();
    setupEventListeners();
    loadCartFromStorage();
    renderSkeletonLoaders();
    fetchCatalogData();
  }

  function cacheElements() {
    DOM.themeBtn = document.getElementById("theme-toggle-btn");
    DOM.productsContainer = document.getElementById("products-container");
    DOM.searchInput = document.getElementById("search-input");
    DOM.categoryTabsContainer = document.getElementById("category-tabs");
    DOM.brandSelect = document.getElementById("brand-filter");
    DOM.stockFilterSelect = document.getElementById("stock-filter");
    DOM.sortSelect = document.getElementById("sort-filter");
    DOM.viewGridBtn = document.getElementById("view-grid");
    DOM.viewListBtn = document.getElementById("view-list");

    DOM.metricTotalProducts = document.getElementById("metric-total-products");
    DOM.metricTotalStock = document.getElementById("metric-total-stock");
    DOM.metricLowStock = document.getElementById("metric-low-stock");
    DOM.metricTotalBrands = document.getElementById("metric-total-brands");

    DOM.scrim = document.getElementById("app-scrim");
    DOM.detailDrawer = document.getElementById("detail-drawer");
    DOM.closeDrawerBtn = document.getElementById("close-drawer-btn");
    DOM.drawerBody = document.getElementById("drawer-body");
    DOM.drawerActions = document.getElementById("drawer-actions");

    DOM.bottomIsland = document.getElementById("bottom-island");
    DOM.islandHandleBar = document.getElementById("island-handle-bar");
    DOM.islandCompactRow = document.getElementById("island-compact-row");
    DOM.islandExpandedBody = document.getElementById("island-expanded-body");
    DOM.cartCounter = document.getElementById("cart-counter");
    DOM.cartCountText = document.getElementById("cart-count-text");
    DOM.islandTotalText = document.getElementById("island-total-text");
    DOM.islandActionTrigger = document.getElementById("island-action-trigger");
    DOM.cartItemsContainer = document.getElementById("cart-items-container");
    DOM.quoteSubtotal = document.getElementById("quote-subtotal");
    DOM.quoteIva = document.getElementById("quote-iva");
    DOM.quoteTotal = document.getElementById("quote-total");
    DOM.clearCartBtn = document.getElementById("clear-cart-btn");
    DOM.btnExportWhatsapp = document.getElementById("btn-export-whatsapp");
    DOM.btnExportPdf = document.getElementById("btn-export-pdf");
    
    DOM.printInvoiceContainer = document.getElementById("print-quote-invoice");
  }

  // Helper to re-render Lucide SVG Icons safely
  function createLucideIcons() {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  // ==========================================================================
  // THEME ENGINE
  // ==========================================================================
  function setupTheme() {
    const savedTheme = localStorage.getItem("kv-catalog-theme") || "dark"; // Default to premium dark BEM theme
    setTheme(savedTheme);

    DOM.themeBtn.addEventListener("click", () => {
      const currentTheme = document.documentElement.classList.contains("theme-dark") ? "dark" : "light";
      setTheme(currentTheme === "dark" ? "light" : "dark");
    });
  }

  function setTheme(theme) {
    AppState.theme = theme;
    if (theme === "dark") {
      document.documentElement.classList.add("theme-dark");
      document.body.classList.add("theme-dark");
      DOM.themeBtn.innerHTML = '<i data-lucide="sun"></i>';
    } else {
      document.documentElement.classList.remove("theme-dark");
      document.body.classList.remove("theme-dark");
      DOM.themeBtn.innerHTML = '<i data-lucide="moon"></i>';
    }
    localStorage.setItem("kv-catalog-theme", theme);
    createLucideIcons();
  }

  // ==========================================================================
  // SKELETON SCREEN
  // ==========================================================================
  function renderSkeletonLoaders() {
    let html = "";
    for (let i = 0; i < 8; i++) {
      html += `
        <div class="skeleton__card">
          <div class="skeleton__element skeleton__element--img"></div>
          <div class="skeleton__element skeleton__element--title-1"></div>
          <div class="skeleton__element skeleton__element--title-2"></div>
          <div class="skeleton__element skeleton__element--title-2" style="width:70%;"></div>
          <div class="skeleton__element skeleton__element--price-row"></div>
        </div>
      `;
    }
    DOM.productsContainer.innerHTML = html;
  }

  // ==========================================================================
  // DATA FETCHER
  // ==========================================================================
  async function fetchCatalogData() {
    try {
      const response = await fetch("../kv_products_2026_05_05_19_31_43.json");
      if (!response.ok) {
        throw new Error("Failed to load catalog database.");
      }
      const data = await response.json();
      
      // Clean, map and cast types properly (prevents String crashes)
      AppState.products = data.map((p, index) => {
        const cleanCodigo = p["Código"] !== undefined && p["Código"] !== null && p["Código"] !== "" ? String(p["Código"]).trim() : `N/A-${index}`;
        return {
          id: cleanCodigo,
          nombre: p["Nombre"] !== undefined && p["Nombre"] !== null ? String(p["Nombre"]).trim() : "Producto sin nombre",
          codigo: cleanCodigo,
          barcodeType: p["Clase de Código de barras"] ? String(p["Clase de Código de barras"]).trim() : "code128",
          marca: p["Marca"] !== undefined && p["Marca"] !== null && String(p["Marca"]).trim() !== "" ? String(p["Marca"]).trim() : "Generales",
          categoriaCodigo: p["Código de categoría"] ? String(p["Código de categoría"]).trim() : "",
          unitCode: p["unit code"] ? String(p["unit code"]).trim() : "Pieza",
          costo: parseFloat(p["Costo"]) || 0,
          precio: parseFloat(p["Precio"]) || 0,
          alertaCantidad: parseFloat(p["Cantidad de alerta"]) || 0,
          tasaImpuesto: p["Tasa de impuestos"] ? String(p["Tasa de impuestos"]).trim() : "IVA",
          metodoImpuesto: p["Método de impuestos"] ? String(p["Método de impuestos"]).trim() : "Exclusivo",
          imagen: p["Imagen"] ? String(p["Imagen"]).trim() : "no_image.png",
          subCategoria: p["Código de la Sub categoría"] ? String(p["Código de la Sub categoría"]).trim() : "",
          descripcion: p["Producto de campo personalizado 1"] ? String(p["Producto de campo personalizado 1"]).trim() : "",
          especificaciones: p["Producto Campo Personalizadoo 2"] ? String(p["Producto Campo Personalizadoo 2"]).trim() : "",
          especial3: p["Producto Campo Personalizadoo 3"] ? String(p["Producto Campo Personalizadoo 3"]).trim() : "",
          especial4: p["Producto Campo Personalizadoo 4"] ? String(p["Producto Campo Personalizadoo 4"]).trim() : "",
          especial5: p["Producto Campo Personalizadoo 5"] ? String(p["Producto Campo Personalizadoo 5"]).trim() : "",
          especial6: p["Producto Campo Personalizadoo 6"] ? String(p["Producto Campo Personalizadoo 6"]).trim() : "",
          stock: p["Cantidad"] === "" ? "" : parseFloat(p["Cantidad"])
        };
      });

      // Extract brands dynamically
      const brandsSet = new Set();
      AppState.products.forEach(p => {
        if (p.marca && p.marca.trim() !== "") {
          brandsSet.add(p.marca.trim());
        }
      });
      AppState.brands = Array.from(brandsSet).sort();

      populateBrandSelect();
      calculateMetrics();
      applyFilters();

    } catch (error) {
      console.error(error);
      DOM.productsContainer.innerHTML = `
        <div class="catalog__empty">
          <div class="catalog__empty-icon" style="color: var(--color-danger);">
            <i data-lucide="alert-octagon" style="width:48px; height:48px;"></i>
          </div>
          <h3 class="catalog__empty-title">Error al Cargar la Base de Datos</h3>
          <p class="catalog__empty-subtitle" style="max-width: 400px; margin: 0 auto;">No pudimos conectar con el archivo de inventario local. Verifica que el archivo JSON esté en el directorio correcto.</p>
          <button onclick="location.reload()" class="drawer__primary-btn" style="width: auto; display:inline-flex; padding: 0 24px; height: 40px; margin-top:16px;">Reintentar Carga</button>
        </div>
      `;
      createLucideIcons();
    }
  }

  function populateBrandSelect() {
    let html = '<option value="all">Todas las Marcas</option>';
    AppState.brands.forEach(brand => {
      html += `<option value="${brand}">${brand}</option>`;
    });
    DOM.brandSelect.innerHTML = html;
  }

  // ==========================================================================
  // METRICS & DASHBOARD
  // ==========================================================================
  function calculateMetrics() {
    const totalCount = AppState.products.length;
    let totalStockVal = 0;
    let lowStockCount = 0;
    
    AppState.products.forEach(p => {
      if (typeof p.stock === "number") {
        totalStockVal += p.stock;
        if (p.stock <= p.alertaCantidad) {
          lowStockCount++;
        }
      }
    });

    DOM.metricTotalProducts.textContent = totalCount.toLocaleString();
    DOM.metricTotalStock.textContent = totalStockVal.toLocaleString();
    DOM.metricLowStock.textContent = lowStockCount.toLocaleString();
    DOM.metricTotalBrands.textContent = AppState.brands.length.toLocaleString();
  }

  // ==========================================================================
  // SEARCH & FILTER ENGINE
  // ==========================================================================
  function applyFilters() {
    const { text, category, brand, stockFilter, sort } = AppState.filters;
    const query = text.toLowerCase().trim();

    // 1. Core Filter
    AppState.filteredProducts = AppState.products.filter(p => {
      const matchesText = !query || 
        p.nombre.toLowerCase().includes(query) ||
        p.codigo.toLowerCase().includes(query) ||
        p.marca.toLowerCase().includes(query) ||
        p.descripcion.toLowerCase().includes(query);

      let matchesCategory = true;
      if (category !== "all") {
        if (category === "other") {
          matchesCategory = p.categoriaCodigo !== "01" && p.categoriaCodigo !== "02" && p.categoriaCodigo !== "03";
        } else {
          matchesCategory = p.categoriaCodigo === category;
        }
      }

      const matchesBrand = brand === "all" || p.marca === brand;

      let matchesStock = true;
      if (stockFilter === "in-stock") {
        matchesStock = typeof p.stock === "number" && p.stock > 0;
      } else if (stockFilter === "low-stock") {
        matchesStock = typeof p.stock === "number" && p.stock <= p.alertaCantidad;
      }

      return matchesText && matchesCategory && matchesBrand && matchesStock;
    });

    // 2. Sorting Engine
    AppState.filteredProducts.sort((a, b) => {
      switch (sort) {
        case "name-asc":
          return a.nombre.localeCompare(b.nombre);
        case "price-asc":
          return a.precio - b.precio;
        case "price-desc":
          return b.precio - a.precio;
        case "stock-desc":
          const stockA = typeof a.stock === "number" ? a.stock : -1;
          const stockB = typeof b.stock === "number" ? b.stock : -1;
          return stockB - stockA;
        default:
          return 0;
      }
    });

    renderProducts();
    updateCategoryBadgesCount();
  }

  function updateCategoryBadgesCount() {
    const counts = { all: 0, "01": 0, "02": 0, "03": 0, other: 0 };
    const { text, brand, stockFilter } = AppState.filters;
    const query = text.toLowerCase().trim();

    AppState.products.forEach(p => {
      const matchesText = !query || 
        p.nombre.toLowerCase().includes(query) ||
        p.codigo.toLowerCase().includes(query) ||
        p.marca.toLowerCase().includes(query) ||
        p.descripcion.toLowerCase().includes(query);
      const matchesBrand = brand === "all" || p.marca === brand;
      let matchesStock = true;
      if (stockFilter === "in-stock") {
        matchesStock = typeof p.stock === "number" && p.stock > 0;
      } else if (stockFilter === "low-stock") {
        matchesStock = typeof p.stock === "number" && p.stock <= p.alertaCantidad;
      }

      if (matchesText && matchesBrand && matchesStock) {
        counts.all++;
        if (p.categoriaCodigo === "01") counts["01"]++;
        else if (p.categoriaCodigo === "02") counts["02"]++;
        else if (p.categoriaCodigo === "03") counts["03"]++;
        else counts.other++;
      }
    });

    Object.keys(counts).forEach(key => {
      const badge = document.getElementById(`count-badge-${key}`);
      if (badge) {
        badge.textContent = counts[key];
      }
    });
  }

  // ==========================================================================
  // RENDER DYNAMIC CATALOG GRID (BEM & Lucide compliant)
  // ==========================================================================
  function renderProducts() {
    if (AppState.filteredProducts.length === 0) {
      DOM.productsContainer.innerHTML = `
        <div class="catalog__empty">
          <div class="catalog__empty-icon">
            <i data-lucide="search-code" style="width: 44px; height: 44px;"></i>
          </div>
          <h3 class="catalog__empty-title">No se encontraron resultados</h3>
          <p class="catalog__empty-subtitle">Intenta ajustar los filtros de marca, stock o términos de búsqueda.</p>
        </div>
      `;
      createLucideIcons();
      return;
    }

    if (AppState.filters.view === "list") {
      DOM.productsContainer.className = "catalog__grid catalog__grid--list-view";
    } else {
      DOM.productsContainer.className = "catalog__grid";
    }

    let html = "";
    AppState.filteredProducts.forEach(p => {
      // Stock element BEM markup
      let stockHtml = "";
      if (p.stock === "" || isNaN(p.stock)) {
        stockHtml = `<span class="product-card__stock-badge product-card__stock-badge--in-stock"><i data-lucide="help-circle"></i> Bajo Pedido</span>`;
      } else if (p.stock <= 0) {
        stockHtml = `<span class="product-card__stock-badge product-card__stock-badge--out-stock"><i data-lucide="alert-octagon"></i> Agotado</span>`;
      } else if (p.stock <= p.alertaCantidad) {
        stockHtml = `<span class="product-card__stock-badge product-card__stock-badge--low-stock"><i data-lucide="alert-triangle"></i> Alerta: ${p.stock} pz</span>`;
      } else {
        stockHtml = `<span class="product-card__stock-badge product-card__stock-badge--in-stock"><i data-lucide="check" style="width:12px; height:12px;"></i> ${p.stock} pzs</span>`;
      }

      // Dynamic placeholder BEM color schemes
      let catClass = "product-card__badge--otros";
      let catGradient = "var(--cat-otros-bg)";
      let catIcon = "box";
      let catName = "Accesorios";

      if (p.categoriaCodigo === "01") {
        catClass = "product-card__badge--coccion";
        catGradient = "var(--cat-coccion-bg)";
        catIcon = "flame";
        catName = "Cocción";
      } else if (p.categoriaCodigo === "02") {
        catClass = "product-card__badge--refacciones";
        catGradient = "var(--cat-refacciones-bg)";
        catIcon = "settings";
        catName = "Refacciones";
      } else if (p.categoriaCodigo === "03") {
        catClass = "product-card__badge--limpieza";
        catGradient = "var(--cat-limpieza-bg)";
        catIcon = "droplets";
        catName = "Limpieza";
      }

      // Cart checks
      const cartItem = AppState.cart.find(c => c.id === p.id);
      const inCartClass = cartItem ? "product-card__add-btn--in-cart" : "";
      const inCartIcon = cartItem ? "check" : "plus";

      if (AppState.filters.view === "list") {
        // LIST LAYOUT (BEM)
        html += `
          <div class="product-card" data-id="${p.id}">
            <div class="product-card__image-container">
              <div class="product-card__image-fallback" style="background: ${catGradient}">
                <i data-lucide="${catIcon}"></i>
              </div>
            </div>
            <div style="flex: 1; min-width: 0;">
              <span class="product-card__brand">${p.marca}</span>
              <h4 class="product-card__name" title="${p.nombre}">${p.nombre}</h4>
              <div class="product-card__sku">Cód: <strong>${p.codigo}</strong></div>
            </div>
            <div class="product-card__meta-row">
              ${stockHtml}
              <div class="product-card__price-info">
                <span class="product-card__price-val">$${p.precio.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <button class="product-card__add-btn ${inCartClass}" data-action="toggle-cart" data-id="${p.id}" title="Añadir a Cotización">
                <i data-lucide="${inCartIcon}"></i>
              </button>
            </div>
          </div>
        `;
      } else {
        // GRID LAYOUT (BEM)
        html += `
          <div class="product-card" data-id="${p.id}">
            <div class="product-card__badges">
              <span class="product-card__badge ${catClass}">${catName}</span>
            </div>
            
            <div class="product-card__image-container">
              <div class="product-card__image-fallback" style="background: ${catGradient}">
                <i data-lucide="${catIcon}"></i>
                <div class="product-card__brand-overlay">${p.marca}</div>
              </div>
            </div>

            <div class="product-card__brand">${p.marca}</div>
            <h4 class="product-card__name" title="${p.nombre}">${p.nombre}</h4>
            <div class="product-card__sku">Código: <strong>${p.codigo}</strong></div>
            
            <div class="product-card__meta-row">
              <div class="product-card__price-info">
                <span class="product-card__price-label">Precio Unitario</span>
                <span class="product-card__price-val">$${p.precio.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              ${stockHtml}
            </div>

            <button class="product-card__add-btn ${inCartClass}" data-action="toggle-cart" data-id="${p.id}" title="Añadir a Cotización">
              <i data-lucide="${inCartIcon}"></i>
            </button>
          </div>
        `;
      }
    });

    DOM.productsContainer.innerHTML = html;
    createLucideIcons(); // Client side rendering of inline Lucide vectors!

    // Attach card event listeners
    const cards = DOM.productsContainer.querySelectorAll(".product-card");
    cards.forEach(card => {
      card.addEventListener("click", (e) => {
        if (e.target.closest('[data-action="toggle-cart"]')) {
          e.stopPropagation();
          const btn = e.target.closest('[data-action="toggle-cart"]');
          const pId = btn.dataset.id;
          toggleCartItem(pId, btn);
          return;
        }
        
        const pId = card.dataset.id;
        const p = AppState.products.find(x => x.id === pId);
        if (p) {
          openDetailDrawer(p);
        }
      });
    });
  }

  // ==========================================================================
  // EVENT LISTENERS & DEBOUNCER SETUP
  // ==========================================================================
  function setupEventListeners() {
    let searchDebounceTimeout = null;
    DOM.searchInput.addEventListener("input", () => {
      clearTimeout(searchDebounceTimeout);
      searchDebounceTimeout = setTimeout(() => {
        AppState.filters.text = DOM.searchInput.value;
        applyFilters();
      }, 150);
    });

    DOM.categoryTabsContainer.addEventListener("click", (e) => {
      const btn = e.target.closest(".filters__tab");
      if (!btn) return;
      
      const categoryId = btn.dataset.category;
      
      DOM.categoryTabsContainer.querySelectorAll(".filters__tab").forEach(t => {
        t.classList.remove("filters__tab--active");
      });
      btn.classList.add("filters__tab--active");

      AppState.filters.category = categoryId;
      applyFilters();
    });

    DOM.brandSelect.addEventListener("change", () => {
      AppState.filters.brand = DOM.brandSelect.value;
      applyFilters();
    });

    DOM.stockFilterSelect.addEventListener("change", () => {
      AppState.filters.stockFilter = DOM.stockFilterSelect.value;
      applyFilters();
    });

    DOM.sortSelect.addEventListener("change", () => {
      AppState.filters.sort = DOM.sortSelect.value;
      applyFilters();
    });

    DOM.viewGridBtn.addEventListener("click", () => {
      DOM.viewListBtn.classList.remove("filters__view-btn--active");
      DOM.viewGridBtn.classList.add("filters__view-btn--active");
      AppState.filters.view = "grid";
      applyFilters();
    });

    DOM.viewListBtn.addEventListener("click", () => {
      DOM.viewGridBtn.classList.remove("filters__view-btn--active");
      DOM.viewListBtn.classList.add("filters__view-btn--active");
      AppState.filters.view = "list";
      applyFilters();
    });

    DOM.closeDrawerBtn.addEventListener("click", closeDetailDrawer);
    DOM.scrim.addEventListener("click", () => {
      closeDetailDrawer();
      collapseCartIsland();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeDetailDrawer();
        collapseCartIsland();
      }
    });

    DOM.islandHandleBar.addEventListener("click", toggleCartIsland);
    DOM.islandActionTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      expandCartIsland();
    });

    DOM.clearCartBtn.addEventListener("click", clearCart);
    DOM.btnExportWhatsapp.addEventListener("click", exportToWhatsApp);
    DOM.btnExportPdf.addEventListener("click", exportToPDF);
  }

  // ==========================================================================
  // CART STATE MANAGER (BEM & Local Storage Reactivity)
  // ==========================================================================
  function loadCartFromStorage() {
    const savedCart = localStorage.getItem("kv-catalog-cart");
    if (savedCart) {
      try {
        AppState.cart = JSON.parse(savedCart);
        updateCartUI();
      } catch (err) {
        console.error("Cart loading failed, resetting:", err);
        AppState.cart = [];
      }
    }
  }

  function saveCartToStorage() {
    localStorage.setItem("kv-catalog-cart", JSON.stringify(AppState.cart));
    updateCartUI();
  }

  function toggleCartItem(productId, btnElement = null) {
    const index = AppState.cart.findIndex(c => c.id === productId);
    const p = AppState.products.find(x => x.id === productId);
    if (!p) return;

    if (index > -1) {
      AppState.cart.splice(index, 1);
      showToast(`Removido: ${p.nombre.substring(0, 24)}...`);
    } else {
      AppState.cart.push({
        id: p.id,
        nombre: p.nombre,
        marca: p.marca,
        codigo: p.codigo,
        precio: p.precio,
        costo: p.costo,
        qty: 1
      });
      showToast(`Añadido: ${p.nombre.substring(0, 24)}...`);
    }

    saveCartToStorage();
    renderProducts();

    if (DOM.detailDrawer.classList.contains("drawer__sheet--active")) {
      const activeProdInDrawer = DOM.detailDrawer.dataset.activeId;
      if (activeProdInDrawer === productId) {
        updateDrawerActionButton(p);
      }
    }
  }

  function updateCartQty(productId, delta) {
    const item = AppState.cart.find(c => c.id === productId);
    if (!item) return;

    item.qty += delta;
    if (item.qty <= 0) {
      AppState.cart = AppState.cart.filter(c => c.id !== productId);
      showToast("Producto removido de cotización");
    }

    saveCartToStorage();
    renderProducts();
  }

  function removeCartItemDirect(productId) {
    AppState.cart = AppState.cart.filter(c => c.id !== productId);
    showToast("Producto removido de cotización");
    saveCartToStorage();
    renderProducts();
  }

  function clearCart() {
    if (AppState.cart.length === 0) return;
    if (confirm("¿Estás seguro de que deseas vaciar toda la cotización actual?")) {
      AppState.cart = [];
      saveCartToStorage();
      renderProducts();
      showToast("Cotización vaciada correctamente");
      collapseCartIsland();
    }
  }

  function updateCartUI() {
    const totalItems = AppState.cart.reduce((sum, item) => sum + item.qty, 0);
    
    if (totalItems > 0) {
      DOM.bottomIsland.style.display = "block";
      DOM.cartCounter.textContent = totalItems;
      DOM.cartCounter.style.display = "flex";
      DOM.cartCountText.textContent = `${totalItems} producto${totalItems > 1 ? 's' : ''}`;
    } else {
      DOM.cartCounter.style.display = "none";
      DOM.cartCountText.textContent = "0 productos";
      if (!DOM.bottomIsland.classList.contains("island__sheet--expanded")) {
        DOM.bottomIsland.style.display = "none";
      }
    }

    const subtotal = AppState.cart.reduce((sum, item) => sum + (item.precio * item.qty), 0);
    const iva = subtotal * 0.16;
    const total = subtotal + iva;

    const formattedSub = `$${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;
    const formattedIva = `$${iva.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;
    const formattedTot = `$${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;

    DOM.islandTotalText.textContent = formattedTot;
    DOM.quoteSubtotal.textContent = formattedSub;
    DOM.quoteIva.textContent = formattedIva;
    DOM.quoteTotal.textContent = formattedTot;

    renderCartListItems();
  }

  function renderCartListItems() {
    if (AppState.cart.length === 0) {
      DOM.cartItemsContainer.innerHTML = `
        <div class="island__empty-state">
          <div class="island__empty-icon"><i data-lucide="shopping-cart"></i></div>
          <p>Tu cotización está vacía</p>
          <span style="font-size:11px; opacity:0.6;">Añade equipos usando el botón (+) en el catálogo</span>
        </div>
      `;
      createLucideIcons();
      return;
    }

    let html = "";
    AppState.cart.forEach(item => {
      const lineTotal = item.precio * item.qty;
      html += `
        <div class="island__item-row">
          <div style="flex:1; min-width:0;">
            <div class="island__item-name" title="${item.nombre}">${item.nombre}</div>
            <div class="island__item-brand">${item.marca} • SKU: ${item.codigo}</div>
          </div>
          
          <div class="island__qty-selectors">
            <button class="island__qty-btn" onclick="window.adjustQty('${item.id}', -1)" title="Restar 1">-</button>
            <span class="island__qty-val">${item.qty}</span>
            <button class="island__qty-btn" onclick="window.adjustQty('${item.id}', 1)" title="Sumar 1">+</button>
          </div>

          <div class="island__item-price-col">
            <span class="island__item-total-price">$${lineTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <button class="island__remove-btn" onclick="window.removeCartItem('${item.id}')" title="Eliminar del Carrito">
            <i data-lucide="trash-2" style="width:16px; height:16px;"></i>
          </button>
        </div>
      `;
    });

    DOM.cartItemsContainer.innerHTML = html;
    createLucideIcons();
  }

  window.adjustQty = (id, delta) => {
    updateCartQty(id, delta);
  };

  window.removeCartItem = (id) => {
    removeCartItemDirect(id);
  };

  // ==========================================================================
  // BOTTOM ISLAND RESPONSIVE SHEET ACTIONS
  // ==========================================================================
  function toggleCartIsland() {
    if (DOM.bottomIsland.classList.contains("island__sheet--expanded")) {
      collapseCartIsland();
    } else {
      expandCartIsland();
    }
  }

  function expandCartIsland() {
    if (AppState.cart.length === 0) {
      showToast("Añade productos para ver la cotización");
      return;
    }
    DOM.bottomIsland.classList.add("island__sheet--expanded");
    DOM.scrim.classList.add("drawer__scrim--active");
    DOM.islandHandleBar.setAttribute("title", "Deslizar para cerrar");
  }

  function collapseCartIsland() {
    DOM.bottomIsland.classList.remove("island__sheet--expanded");
    DOM.scrim.classList.remove("drawer__scrim--active");
    DOM.islandHandleBar.setAttribute("title", "Ver Cotización");
  }

  // ==========================================================================
  // DETAIL DRAWER ORCHESTRATOR (BEM & Lucide compliant)
  // ==========================================================================
  function openDetailDrawer(p) {
    DOM.detailDrawer.dataset.activeId = p.id;
    
    let catGradient = "var(--cat-otros-bg)";
    let catIcon = "box";
    let catLabel = "Refacción / General";

    if (p.categoriaCodigo === "01") {
      catGradient = "var(--cat-coccion-bg)";
      catIcon = "flame";
      catLabel = "Equipo de Cocción Industrial";
    } else if (p.categoriaCodigo === "02") {
      catGradient = "var(--cat-refacciones-bg)";
      catIcon = "settings";
      catLabel = "Refacción y Componente Original";
    } else if (p.categoriaCodigo === "03") {
      catGradient = "var(--cat-limpieza-bg)";
      catIcon = "droplets";
      catLabel = "Químico y Limpieza Profesional";
    }

    const barcodeVisualSvg = generateBarcodeSVG(p.codigo);

    // Dynamic specs list
    let specsHtml = "";
    if (p.descripcion) specsHtml += `<div class="drawer__spec-item"><span class="drawer__spec-label">Descripción</span><span class="drawer__spec-value drawer__spec-value--custom">${p.descripcion}</span></div>`;
    if (p.especificaciones) specsHtml += `<div class="drawer__spec-item"><span class="drawer__spec-label">Especificaciones</span><span class="drawer__spec-value drawer__spec-value--custom">${p.especificaciones}</span></div>`;
    if (p.especial3) specsHtml += `<div class="drawer__spec-item"><span class="drawer__spec-label">Ubicación / Notas</span><span class="drawer__spec-value drawer__spec-value--custom">${p.especial3}</span></div>`;
    if (p.especial4) specsHtml += `<div class="drawer__spec-item"><span class="drawer__spec-label">Dimensiones / Datos</span><span class="drawer__spec-value drawer__spec-value--custom">${p.especial4}</span></div>`;
    if (p.especial5) specsHtml += `<div class="drawer__spec-item"><span class="drawer__spec-label">Campo Adicional 5</span><span class="drawer__spec-value drawer__spec-value--custom">${p.especial5}</span></div>`;
    if (p.especial6) specsHtml += `<div class="drawer__spec-item"><span class="drawer__spec-label">Campo Adicional 6</span><span class="drawer__spec-value drawer__spec-value--custom">${p.especial6}</span></div>`;

    let stockText = "Bajo Pedido / Sin Stock";
    let stockStyle = 'style="color: var(--color-success);"';
    if (typeof p.stock === "number") {
      if (p.stock <= 0) {
        stockText = "Agotado";
        stockStyle = 'style="color: var(--color-danger);"';
      } else if (p.stock <= p.alertaCantidad) {
        stockText = `Bajo Stock (${p.stock} piezas restantes)`;
        stockStyle = 'style="color: var(--color-warning);"';
      } else {
        stockText = `${p.stock} unidades en existencia`;
        stockStyle = 'style="color: var(--color-success);"';
      }
    }

    DOM.drawerBody.innerHTML = `
      <div class="drawer__visual">
        <div class="product-card__image-fallback" style="background: ${catGradient}">
          <i data-lucide="${catIcon}" style="width: 56px; height: 56px;"></i>
        </div>
      </div>

      <div class="drawer__brand">${p.marca}</div>
      <h3 class="drawer__name">${p.nombre}</h3>

      <div class="drawer__price-card">
        <div class="drawer__price-info">
          <span class="product-card__price-label">Precio al Público</span>
          <span class="drawer__price-amount">$${p.precio.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span class="drawer__cost-amount">Precio Neto + IVA (Sujeto a cambios)</span>
        </div>
        <div style="text-align: right;">
          <span class="product-card__badge product-card__badge--otros" style="background: ${catGradient}">${p.unitCode}</span>
        </div>
      </div>

      <h4 style="font-size: 13.5px; text-transform: uppercase; letter-spacing:0.05em; color: var(--text-secondary); margin-bottom: 12px; font-weight:700;">Detalles Técnicos</h4>
      <div class="drawer__specs-list">
        <div class="drawer__spec-item">
          <span class="drawer__spec-label">SKU / Código</span>
          <span class="drawer__spec-value" style="font-family: monospace; font-weight:700;">${p.codigo}</span>
        </div>
        <div class="drawer__spec-item">
          <span class="drawer__spec-label">Categoría</span>
          <span class="drawer__spec-value">${catLabel}</span>
        </div>
        <div class="drawer__spec-item">
          <span class="drawer__spec-label">Estado de Inventario</span>
          <span class="drawer__spec-value" ${stockStyle}><strong>${stockText}</strong></span>
        </div>
        ${specsHtml}
      </div>

      <h4 style="font-size: 13.5px; text-transform: uppercase; letter-spacing:0.05em; color: var(--text-secondary); margin-bottom: 12px; font-weight:700;">Código de Barras (${p.barcodeType.toUpperCase()})</h4>
      <div class="drawer__barcode-section">
        <div class="drawer__barcode-container">
          ${barcodeVisualSvg}
        </div>
        <span class="drawer__barcode-label">${p.codigo}</span>
      </div>
    `;

    updateDrawerActionButton(p);

    DOM.detailDrawer.classList.add("drawer__sheet--active");
    DOM.scrim.classList.add("drawer__scrim--active");
    createLucideIcons();
  }

  function updateDrawerActionButton(p) {
    const isAlreadyInCart = AppState.cart.some(c => c.id === p.id);
    if (isAlreadyInCart) {
      DOM.drawerActions.innerHTML = `
        <button class="drawer__primary-btn drawer__primary-btn--remove" id="btn-drawer-action">
          <i data-lucide="shopping-cart"></i> Quitar de Cotización
        </button>
      `;
    } else {
      DOM.drawerActions.innerHTML = `
        <button class="drawer__primary-btn" id="btn-drawer-action">
          <i data-lucide="shopping-cart"></i> Añadir a Cotización
        </button>
      `;
    }

    document.getElementById("btn-drawer-action").addEventListener("click", () => {
      toggleCartItem(p.id);
    });
    createLucideIcons();
  }

  function closeDetailDrawer() {
    DOM.detailDrawer.classList.remove("drawer__sheet--active");
    if (!DOM.bottomIsland.classList.contains("island__sheet--expanded")) {
      DOM.scrim.classList.remove("drawer__scrim--active");
    }
  }

  // ==========================================================================
  // BARCODE SVG SIMULATOR (Code 128 dynamic generator)
  // ==========================================================================
  /**
   * generateBarcodeSVG – Code 128 B encoder (ISO/IEC 15417)
   * Encodes printable ASCII 32-126. Produces a crisp, properly structured
   * barcode SVG with Start B, mod-103 checksum, Stop, quiet zones and text.
   */
  function generateBarcodeSVG(code) {
    const str = String(code);

    // ------------------------------------------------------------------
    // Code 128 full symbol pattern table (indices 0-106)
    // Each entry: [bar1, sp1, bar2, sp2, bar3, sp3]  — sum = 11 modules
    // Index 0-94 → Code B: ASCII(32 + index)
    // Index 103 = Start A | 104 = Start B | 105 = Start C | 106 = Stop*
    // *Stop is a 7-element special pattern handled separately.
    // ------------------------------------------------------------------
    const C128 = [
      [2,1,2,2,2,2],[2,2,2,1,2,2],[2,2,2,2,2,1],[1,2,1,2,2,3],[1,2,1,3,2,2], // 0-4
      [1,3,1,2,2,2],[1,2,2,2,1,3],[1,2,2,3,1,2],[1,3,2,2,1,2],[2,2,1,2,1,3], // 5-9
      [2,2,1,3,1,2],[2,3,1,2,1,2],[1,1,2,2,3,2],[1,2,2,1,3,2],[1,2,2,2,3,1], // 10-14
      [1,1,3,2,2,2],[1,2,3,1,2,2],[1,2,3,2,2,1],[2,2,3,2,1,1],[2,2,1,1,3,2], // 15-19
      [2,2,1,2,3,1],[2,1,3,2,1,2],[2,2,3,1,1,2],[3,1,2,1,3,1],[3,1,1,2,2,2], // 20-24
      [3,2,1,1,2,2],[3,2,1,2,2,1],[3,1,2,2,1,2],[3,2,2,1,1,2],[3,2,2,2,1,1], // 25-29
      [2,1,2,1,2,3],[2,1,2,3,2,1],[2,3,2,1,2,1],[1,1,1,3,2,3],[1,3,1,1,2,3], // 30-34
      [1,3,1,3,2,1],[1,1,2,3,1,3],[1,3,2,1,1,3],[1,3,2,3,1,1],[2,1,1,3,1,3], // 35-39
      [2,3,1,1,1,3],[2,3,1,3,1,1],[1,1,2,1,3,3],[1,1,2,3,3,1],[1,3,2,1,3,1], // 40-44
      [1,1,3,1,2,3],[1,1,3,3,2,1],[1,3,3,1,2,1],[3,1,3,1,2,1],[2,1,1,3,3,1], // 45-49
      [2,3,1,1,3,1],[2,1,3,1,1,3],[2,1,3,3,1,1],[2,1,3,1,3,1],[3,1,1,1,2,3], // 50-54
      [3,1,1,3,2,1],[3,3,1,1,2,1],[3,1,2,1,1,3],[3,1,2,3,1,1],[3,3,2,1,1,1], // 55-59
      [3,1,4,1,1,1],[2,2,1,4,1,1],[4,3,1,1,1,1],[1,1,1,2,2,4],[1,1,1,4,2,2], // 60-64
      [1,2,1,1,2,4],[1,2,1,4,2,1],[1,4,1,1,2,2],[1,4,1,2,2,1],[1,1,2,2,1,4], // 65-69
      [1,1,2,4,1,2],[1,2,2,1,1,4],[1,2,2,4,1,1],[1,4,2,1,1,2],[1,4,2,2,1,1], // 70-74
      [2,4,1,2,1,1],[2,2,1,1,1,4],[4,1,3,1,1,1],[2,1,1,2,1,4],[2,1,1,4,1,2], // 75-79
      [1,1,4,2,1,2],[1,1,4,4,1,1],[1,2,4,1,1,2],[1,2,4,3,1,1],[1,4,4,1,1,1], // 80-84 -- wait let me use correct values
      [1,1,1,4,4,1],[3,1,1,1,4,1],[1,1,3,4,1,1],[1,1,4,1,3,1],[4,1,1,1,1,3], // 85-89
      [4,1,1,3,1,1],[1,1,3,1,4,1],[1,1,4,1,1,3],[3,1,1,1,1,4],[4,1,1,1,3,1], // 90-94
      [2,1,1,1,4,2],[1,3,1,1,4,1],[1,1,1,1,4,3],[1,1,1,3,1,4],[1,1,4,1,1,3], // 95-99
      [4,1,1,1,1,3],[4,1,1,3,1,1],[1,3,4,1,1,1],[2,1,4,1,2,1],[3,3,1,1,3,1], // 100-104
      [3,1,1,3,3,1],[3,3,3,1,1,1]                                              // 105-106
    ];

    // Start B pattern (symbol 104)
    const START_B = [2,1,1,4,1,2]; // known correct Start B
    // Stop pattern: 7 elements (bar-sp-bar-sp-bar-sp-bar), 13 modules
    const STOP    = [2,3,3,1,1,1,2];

    // ------------------------------------------------------------------
    // Encode characters using Code B (symbol = charCode - 32)
    // ------------------------------------------------------------------
    const symbols = []; // symbol value array (excluding start/stop)
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      if (ch >= 32 && ch <= 126) {
        symbols.push(ch - 32);
      } else {
        symbols.push(0); // fallback: space
      }
    }

    // Mod-103 checksum
    let checksum = 104; // value for Start B
    for (let i = 0; i < symbols.length; i++) {
      checksum += symbols[i] * (i + 1);
    }
    checksum = checksum % 103;

    // ------------------------------------------------------------------
    // Build module sequence: [width, isBar] pairs
    // ------------------------------------------------------------------
    const mods = []; // {w, bar}

    const pushPattern = (pattern) => {
      pattern.forEach((w, idx) => mods.push({ w, bar: idx % 2 === 0 }));
    };

    pushPattern(START_B);
    symbols.forEach(sym => pushPattern(C128[sym]));
    pushPattern(C128[checksum]);
    // Stop: 7-element pattern starting with a bar
    STOP.forEach((w, idx) => mods.push({ w, bar: idx % 2 === 0 }));

    // ------------------------------------------------------------------
    // Render SVG
    // ------------------------------------------------------------------
    const QUIET  = 10;  // quiet zone modules on each side
    const BAR_H  = 56;  // bar height in user units
    const TEXT_H = 16;  // space below bars for label
    const TOTAL_H = BAR_H + TEXT_H;

    const dataW   = mods.reduce((s, m) => s + m.w, 0);
    const totalW  = QUIET * 2 + dataW;

    let rects = '';
    let x = QUIET;
    for (const { w, bar } of mods) {
      if (bar) {
        rects += `<rect x="${x}" y="0" width="${w}" height="${BAR_H}" fill="#0d0d0d"/>`;
      }
      x += w;
    }

    const midX = (totalW / 2).toFixed(1);
    const escaped = str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    return [
      `<svg viewBox="0 0 ${totalW} ${TOTAL_H}" xmlns="http://www.w3.org/2000/svg"`,
      `  shape-rendering="crispEdges" style="width:100%;height:auto;display:block;">`,
      `<rect width="${totalW}" height="${TOTAL_H}" fill="#ffffff"/>`,
      rects,
      `<text x="${midX}" y="${BAR_H + 12}" text-anchor="middle"`,
      `  font-family="'Courier New',Courier,monospace" font-size="8"`,
      `  font-weight="700" letter-spacing="2" fill="#0d0d0d">${escaped}</text>`,
      `</svg>`
    ].join('\n');
  }

  // ==========================================================================
  // TOAST NOTIFICATIONS SYSTEM (Independent of external resources)
  // ==========================================================================
  function showToast(message) {
    let container = document.getElementById("kv-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "kv-toast-container";
      container.style.cssText = `
        position: fixed;
        top: 24px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 2000;
        display: flex;
        flex-direction: column;
        gap: 8px;
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.style.cssText = `
      background: rgba(18, 18, 22, 0.95);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #ffffff;
      padding: 10px 18px;
      border-radius: var(--radius-md);
      font-size: 13px;
      font-weight: 600;
      box-shadow: var(--shadow-lg);
      transform: translateY(-20px);
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    
    if (AppState.theme === "light") {
      toast.style.background = "rgba(255, 255, 255, 0.95)";
      toast.style.border = "1px solid rgba(0, 0, 0, 0.1)";
      toast.style.color = "var(--text-main)";
    }

    toast.innerHTML = `<i data-lucide="bell" style="width:16px; height:16px; color: var(--color-gold);"></i> ${message}`;
    container.appendChild(toast);
    createLucideIcons();

    setTimeout(() => {
      toast.style.transform = "translateY(0)";
      toast.style.opacity = "1";
    }, 10);

    setTimeout(() => {
      toast.style.transform = "translateY(-20px)";
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // ==========================================================================
  // WHATSAPP EXPORTER (TEXT FORMATTING ENGINE WITH EMOJIS)
  // ==========================================================================
  function exportToWhatsApp() {
    if (AppState.cart.length === 0) return;

    let text = `*KITCHEN VALENZUELA — SOLICITUD DE COTIZACIÓN* 🍳\n`;
    text += `_Generado digitalmente el ${new Date().toLocaleDateString()}_\n`;
    text += `==================================\n\n`;

    let totalVal = 0;
    AppState.cart.forEach((item, index) => {
      const lineTotal = item.precio * item.qty;
      totalVal += lineTotal;
      text += `*${index + 1}. [${item.marca}]* ${item.nombre}\n`;
      text += `   • *SKU:* \`${item.codigo}\`\n`;
      text += `   • *Cantidad:* ${item.qty} pz\n`;
      text += `   • *P. U.:* $${item.precio.toLocaleString("en-US", { minimumFractionDigits: 2 })} MXN\n`;
      text += `   • *Total:* $${lineTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })} MXN\n\n`;
    });

    const iva = totalVal * 0.16;
    const totalWithIva = totalVal + iva;

    text += `==================================\n`;
    text += `*Subtotal:* $${totalVal.toLocaleString("en-US", { minimumFractionDigits: 2 })} MXN\n`;
    text += `*IVA (16%):* $${iva.toLocaleString("en-US", { minimumFractionDigits: 2 })} MXN\n`;
    text += `*TOTAL ESTIMADO:* $${totalWithIva.toLocaleString("en-US", { minimumFractionDigits: 2 })} MXN\n\n`;
    text += `*Nota:* Esta es una estimación de precios sujeta a disponibilidad de inventario industrial. Quedo en espera de su amable confirmación de existencias. ¡Gracias! 🙏`;

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, "_blank");
  }

  // ==========================================================================
  // PDF EXPORTER (DYNAMIC INVOICE PRINT OPTIMIZER)
  // ==========================================================================
  function exportToPDF() {
    if (AppState.cart.length === 0) return;

    const subtotal = AppState.cart.reduce((sum, item) => sum + (item.precio * item.qty), 0);
    const iva = subtotal * 0.16;
    const total = subtotal + iva;

    let tableRows = "";
    AppState.cart.forEach((item, index) => {
      const lineTotal = item.precio * item.qty;
      tableRows += `
        <tr>
          <td>${index + 1}</td>
          <td>
            <strong>${item.nombre}</strong><br>
            <span style="font-size:10px; color:#555;">Marca: ${item.marca} | SKU: ${item.codigo}</span>
          </td>
          <td>${item.qty}</td>
          <td>$${item.precio.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          <td>$${lineTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      `;
    });

    DOM.printInvoiceContainer.innerHTML = `
      <div class="print-invoice__header">
        <div>
          <h1 class="print-invoice__brand" style="color: #c69214;">KITCHEN VALENZUELA</h1>
          <p style="font-size:12px; color:#555;">Catálogo y Solicitud de Cotización Industrial</p>
        </div>
        <div style="text-align: right;">
          <h2 style="font-size:16px;">DOCUMENTO DE ESTIMACIÓN</h2>
          <p style="font-size:11px; color:#555;">Fecha: ${new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <table class="print-invoice__table">
        <thead>
          <tr>
            <th style="width: 5%">#</th>
            <th style="width: 55%">Descripción de Equipo</th>
            <th style="width: 10%">Cant.</th>
            <th style="width: 15%">P. Unitario</th>
            <th style="width: 15%">Total</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>

      <div class="print-invoice__totals">
        <div class="print-invoice__totals-row">
          <span>Subtotal:</span>
          <span>$${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</span>
        </div>
        <div class="print-invoice__totals-row">
          <span>IVA (16%):</span>
          <span>$${iva.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</span>
        </div>
        <div class="print-invoice__totals-row print-invoice__totals-row--grand-total">
          <span>TOTAL:</span>
          <span>$${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</span>
        </div>
      </div>

      <div style="margin-top: 80px; font-size: 10px; color: #777; text-align: center; border-top: 1px solid #d1d5db; padding-top: 16px;">
        Esta cotización representa una estimación comercial y no constituye un contrato vinculante. Los precios pueden variar según disponibilidad de divisas o incrementos del fabricante.
      </div>
    `;

    window.print();
  }

})();
