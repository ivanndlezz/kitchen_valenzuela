/**
 * Kitchen Valenzuela Catalog & Inventory Engine
 * Handles dynamic JSON data, reactive search/filtering, quotation building, and exports.
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

  // DOM Elements
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
    
    // Print placeholder
    DOM.printInvoiceContainer = document.getElementById("print-quote-invoice");
  }

  // ==========================================================================
  // THEME ENGINE
  // ==========================================================================
  function setupTheme() {
    const savedTheme = localStorage.getItem("kv-catalog-theme") || "dark"; // Default to premium dark
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
      DOM.themeBtn.innerHTML = '<i class="ti ti-sun"></i>';
    } else {
      document.documentElement.classList.remove("theme-dark");
      document.body.classList.remove("theme-dark");
      DOM.themeBtn.innerHTML = '<i class="ti ti-moon"></i>';
    }
    localStorage.setItem("kv-catalog-theme", theme);
  }

  // ==========================================================================
  // SKELETON SCREEN
  // ==========================================================================
  function renderSkeletonLoaders() {
    let html = "";
    for (let i = 0; i < 8; i++) {
      html += `
        <div class="skeleton-card">
          <div class="skeleton-element skeleton-img"></div>
          <div class="skeleton-element skeleton-title-1"></div>
          <div class="skeleton-element skeleton-title-2"></div>
          <div class="skeleton-element skeleton-title-2" style="width:70%;"></div>
          <div class="skeleton-element skeleton-price-row"></div>
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
      // Relative path: catalog is at home/index.html, JSON is in root
      const response = await fetch("../kv_products_2026_05_05_19_31_43.json");
      if (!response.ok) {
        throw new Error("Failed to load catalog database.");
      }
      const data = await response.json();
      
      // Clean and map data
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

      // Setup brand dropdown
      populateBrandSelect();
      
      // Calculate dashboard metrics
      calculateMetrics();

      // Apply initial filters & render
      applyFilters();

    } catch (error) {
      console.error(error);
      DOM.productsContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px 16px;">
          <i class="ti ti-database-off" style="font-size: 48px; color: var(--color-danger); margin-bottom: 16px; display:block;"></i>
          <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">Error al Cargar la Base de Datos</h3>
          <p style="color: var(--text-secondary); max-width: 400px; margin: 0 auto 24px;">No pudimos conectar con el archivo de inventario local. Verifica que el archivo JSON esté en el directorio correcto.</p>
          <button onclick="location.reload()" class="primary-drawer-btn" style="width: auto; display:inline-flex; padding: 0 24px; height: 40px;">Reintentar Carga</button>
        </div>
      `;
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
      // Stock calculations
      if (typeof p.stock === "number") {
        totalStockVal += p.stock;
        
        // Low Stock triggers: stock is positive but below or equal to alert limit
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
  // MOTOR DE BUSQUEDA Y FILTRADO (Indexado Reactivo)
  // ==========================================================================
  function applyFilters() {
    const { text, category, brand, stockFilter, sort } = AppState.filters;
    const query = text.toLowerCase().trim();

    // 1. Core Filter
    AppState.filteredProducts = AppState.products.filter(p => {
      // Text match (Search in Name, Brand, SKU/Code, Custom Field 1)
      const matchesText = !query || 
        p.nombre.toLowerCase().includes(query) ||
        p.codigo.toLowerCase().includes(query) ||
        p.marca.toLowerCase().includes(query) ||
        p.descripcion.toLowerCase().includes(query);

      // Category match
      let matchesCategory = true;
      if (category !== "all") {
        if (category === "other") {
          // Empty, or doesn't match '01', '02', '03'
          matchesCategory = p.categoriaCodigo !== "01" && p.categoriaCodigo !== "02" && p.categoriaCodigo !== "03";
        } else {
          matchesCategory = p.categoriaCodigo === category;
        }
      }

      // Brand match
      const matchesBrand = brand === "all" || p.marca === brand;

      // Stock condition
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

    // Render results
    renderProducts();
    updateCategoryBadgesCount();
  }

  function updateCategoryBadgesCount() {
    // Count items matching the text, brand and stock constraints but distributed across categories
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

    // Write counts in DOM badges
    Object.keys(counts).forEach(key => {
      const badge = document.getElementById(`count-badge-${key}`);
      if (badge) {
        badge.textContent = counts[key];
      }
    });
  }

  // ==========================================================================
  // RENDER DYNAMIC CATALOG GRID
  // ==========================================================================
  function renderProducts() {
    if (AppState.filteredProducts.length === 0) {
      DOM.productsContainer.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 64px 16px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-lg);">
          <i class="ti ti-search-off" style="font-size: 44px; color: var(--text-tertiary); margin-bottom: 12px; display:block;"></i>
          <h3 style="font-size: 18px; font-weight: 600; margin-bottom: 4px;">No se encontraron resultados</h3>
          <p style="color: var(--text-secondary); font-size:14px;">Intenta ajustar los filtros de marca, stock o términos de búsqueda.</p>
        </div>
      `;
      return;
    }

    if (AppState.filters.view === "list") {
      DOM.productsContainer.className = "products-grid list-view";
    } else {
      DOM.productsContainer.className = "products-grid";
    }

    let html = "";
    AppState.filteredProducts.forEach(p => {
      // Stock element markup
      let stockHtml = "";
      if (p.stock === "" || isNaN(p.stock)) {
        stockHtml = `<span class="product-stock-badge in-stock"><i class="ti ti-circle-check"></i> Bajo Pedido</span>`;
      } else if (p.stock <= 0) {
        stockHtml = `<span class="product-stock-badge out-stock"><i class="ti ti-alert-triangle"></i> Agotado</span>`;
      } else if (p.stock <= p.alertaCantidad) {
        stockHtml = `<span class="product-stock-badge low-stock"><i class="ti ti-clock-bolt"></i> Alerta: ${p.stock} pz</span>`;
      } else {
        stockHtml = `<span class="product-stock-badge in-stock"><i class="ti ti-circle-filled" style="font-size:8px;"></i> ${p.stock} pzs</span>`;
      }

      // Dynamic placeholder color schemes
      let catClass = "category-other";
      let catGradient = "var(--cat-otros-bg)";
      let catIcon = "ti-box-seam";
      let catName = "Accesorios";

      if (p.categoriaCodigo === "01") {
        catClass = "category-01";
        catGradient = "var(--cat-coccion-bg)";
        catIcon = "ti-flame";
        catName = "Cocción";
      } else if (p.categoriaCodigo === "02") {
        catClass = "category-02";
        catGradient = "var(--cat-refacciones-bg)";
        catIcon = "ti-settings-2";
        catName = "Refacciones";
      } else if (p.categoriaCodigo === "03") {
        catClass = "category-03";
        catGradient = "var(--cat-limpieza-bg)";
        catIcon = "ti-droplet-half-2";
        catName = "Limpieza";
      }

      // Check if product is already in cart
      const cartItem = AppState.cart.find(c => c.id === p.id);
      const inCartClass = cartItem ? "in-cart" : "";
      const inCartIcon = cartItem ? "ti-check" : "ti-plus";

      if (AppState.filters.view === "list") {
        // LIST LAYOUT
        html += `
          <div class="product-card" data-id="${p.id}">
            <div class="product-image-container">
              <div class="dynamic-gradient-img" style="background: ${catGradient}">
                <i class="ti ${catIcon}"></i>
              </div>
            </div>
            <div class="product-info-block">
              <span class="product-brand">${p.marca}</span>
              <h4 class="product-name" title="${p.nombre}">${p.nombre}</h4>
              <div style="font-size: 11px; color: var(--text-secondary); margin-top:2px;">Cód: <strong>${p.codigo}</strong></div>
            </div>
            <div class="product-meta-row">
              ${stockHtml}
              <div class="product-price-info">
                <span class="price-val">$${p.precio.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <button class="add-quote-btn-card ${inCartClass}" data-action="toggle-cart" data-id="${p.id}" title="Añadir a Cotización">
                <i class="ti ${inCartIcon}"></i>
              </button>
            </div>
          </div>
        `;
      } else {
        // GRID LAYOUT
        html += `
          <div class="product-card" data-id="${p.id}">
            <div class="card-badges">
              <span class="badge ${catClass}">${catName}</span>
            </div>
            
            <div class="product-image-container">
              <div class="dynamic-gradient-img" style="background: ${catGradient}">
                <i class="ti ${catIcon}"></i>
                <div class="brand-badge-overlay">${p.marca}</div>
              </div>
            </div>

            <div class="product-brand">${p.marca}</div>
            <h4 class="product-name" title="${p.nombre}">${p.nombre}</h4>
            <div style="font-size: 11.5px; color: var(--text-secondary); margin-bottom: 12px;">Código: <strong>${p.codigo}</strong></div>
            
            <div class="product-meta-row">
              <div class="product-price-info">
                <span class="price-label">Precio Unitario</span>
                <span class="price-val">$${p.precio.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              ${stockHtml}
            </div>

            <button class="add-quote-btn-card ${inCartClass}" data-action="toggle-cart" data-id="${p.id}" title="Añadir a Cotización">
              <i class="ti ${inCartIcon}"></i>
            </button>
          </div>
        `;
      }
    });

    DOM.productsContainer.innerHTML = html;

    // Attach card event listeners
    const cards = DOM.productsContainer.querySelectorAll(".product-card");
    cards.forEach(card => {
      card.addEventListener("click", (e) => {
        // If clicking on toggle cart button, do not open details drawer
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
  // SEARCH & FILTERS EVENT HANDLERS
  // ==========================================================================
  function setupEventListeners() {
    // 1. Instant fuzzy search with debounce
    let searchDebounceTimeout = null;
    DOM.searchInput.addEventListener("input", () => {
      clearTimeout(searchDebounceTimeout);
      searchDebounceTimeout = setTimeout(() => {
        AppState.filters.text = DOM.searchInput.value;
        applyFilters();
      }, 150);
    });

    // 2. Category Tab switcher
    DOM.categoryTabsContainer.addEventListener("click", (e) => {
      const btn = e.target.closest(".tab-btn");
      if (!btn) return;
      
      const categoryId = btn.dataset.category;
      
      // Update UI tabs state
      DOM.categoryTabsContainer.querySelectorAll(".tab-btn").forEach(t => {
        t.classList.remove("active");
      });
      btn.classList.add("active");

      // Update State & Re-filter
      AppState.filters.category = categoryId;
      applyFilters();
    });

    // 3. Dropdowns selectors
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

    // 4. Grid / List Layout Switchers
    DOM.viewGridBtn.addEventListener("click", () => {
      DOM.viewListBtn.classList.remove("active");
      DOM.viewGridBtn.classList.add("active");
      AppState.filters.view = "grid";
      applyFilters();
    });

    DOM.viewListBtn.addEventListener("click", () => {
      DOM.viewGridBtn.classList.remove("active");
      DOM.viewListBtn.classList.add("active");
      AppState.filters.view = "list";
      applyFilters();
    });

    // 5. Drawer click handlers
    DOM.closeDrawerBtn.addEventListener("click", closeDetailDrawer);
    DOM.scrim.addEventListener("click", () => {
      closeDetailDrawer();
      collapseCartIsland();
    });

    // Keyboard accessibility for Drawer ESC key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeDetailDrawer();
        collapseCartIsland();
      }
    });

    // 6. Bottom Island controls
    DOM.islandHandleBar.addEventListener("click", toggleCartIsland);
    DOM.islandActionTrigger.addEventListener("click", (e) => {
      e.stopPropagation(); // prevent collapsing/expanding triggers
      expandCartIsland();
    });

    DOM.clearCartBtn.addEventListener("click", clearCart);
    DOM.btnExportWhatsapp.addEventListener("click", exportToWhatsApp);
    DOM.btnExportPdf.addEventListener("click", exportToPDF);
  }

  // ==========================================================================
  // CART / QUOTATION STATE MANAGEMENT
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
      // Remove from cart
      AppState.cart.splice(index, 1);
      showToast(`Removido: ${p.nombre.substring(0, 24)}...`);
    } else {
      // Add to cart with quantity 1
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

    // Re-render the grid so button UI is kept in absolute sync
    renderProducts();

    // If currently rendering detail drawer, update its button as well
    if (DOM.detailDrawer.classList.contains("active")) {
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
      // Remove entirely if quantity hits zero
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
    // 1. Floating badges updates
    const totalItems = AppState.cart.reduce((sum, item) => sum + item.qty, 0);
    
    if (totalItems > 0) {
      DOM.bottomIsland.style.display = "block";
      DOM.cartCounter.textContent = totalItems;
      DOM.cartCounter.style.display = "flex";
      DOM.cartCountText.textContent = `${totalItems} producto${totalItems > 1 ? 's' : ''}`;
    } else {
      DOM.cartCounter.style.display = "none";
      DOM.cartCountText.textContent = "0 productos";
      
      // If island is open, keep it open but collapse eventually
      if (!DOM.bottomIsland.classList.contains("expanded")) {
        DOM.bottomIsland.style.display = "none";
      }
    }

    // Math Calculations (Public prices)
    const subtotal = AppState.cart.reduce((sum, item) => sum + (item.precio * item.qty), 0);
    const iva = subtotal * 0.16;
    const total = subtotal + iva;

    // Margin cost calculations (Savings simulation)
    const costSubtotal = AppState.cart.reduce((sum, item) => {
      const unitCosto = item.costo > 0 ? item.costo : item.precio * 0.8;
      return sum + (unitCosto * item.qty);
    }, 0);
    
    // Update pricing DOM
    const formattedSub = `$${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;
    const formattedIva = `$${iva.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;
    const formattedTot = `$${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;

    DOM.islandTotalText.textContent = formattedTot;
    DOM.quoteSubtotal.textContent = formattedSub;
    DOM.quoteIva.textContent = formattedIva;
    DOM.quoteTotal.textContent = formattedTot;

    // Render cart items lists
    renderCartListItems();
  }

  function renderCartListItems() {
    if (AppState.cart.length === 0) {
      DOM.cartItemsContainer.innerHTML = `
        <div class="cart-empty-state">
          <i class="ti ti-shopping-cart-x"></i>
          <p>Tu cotización está vacía</p>
          <span style="font-size:11px; opacity:0.6;">Añade equipos usando el botón (+) en el catálogo</span>
        </div>
      `;
      return;
    }

    let html = "";
    AppState.cart.forEach(item => {
      const lineTotal = item.precio * item.qty;
      html += `
        <div class="cart-item-row">
          <div style="flex:1; min-width:0;">
            <div class="cart-item-name" title="${item.nombre}">${item.nombre}</div>
            <div class="cart-item-brand">${item.marca} • SKU: ${item.codigo}</div>
          </div>
          
          <div class="cart-qty-selectors">
            <button class="qty-adjust-btn" onclick="window.adjustQty('${item.id}', -1)" title="Restar 1">-</button>
            <span class="qty-number">${item.qty}</span>
            <button class="qty-adjust-btn" onclick="window.adjustQty('${item.id}', 1)" title="Sumar 1">+</button>
          </div>

          <div class="cart-item-price-col">
            <span class="cart-item-total-price">$${lineTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>

          <button class="remove-cart-item-btn" onclick="window.removeCartItem('${item.id}')" title="Eliminar del Carrito">
            <i class="ti ti-trash"></i>
          </button>
        </div>
      `;
    });

    DOM.cartItemsContainer.innerHTML = html;
  }

  // Export functions to window context so inline onclick functions work safely
  window.adjustQty = (id, delta) => {
    updateCartQty(id, delta);
  };

  window.removeCartItem = (id) => {
    removeCartItemDirect(id);
  };

  // ==========================================================================
  // BOTTOM ISLAND RESPONSIVE SHEET CONTROLLER
  // ==========================================================================
  function toggleCartIsland() {
    if (DOM.bottomIsland.classList.contains("expanded")) {
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
    DOM.bottomIsland.classList.add("expanded");
    DOM.scrim.classList.add("active");
    // Change handle accessibility
    DOM.islandHandleBar.setAttribute("title", "Deslizar para cerrar");
  }

  function collapseCartIsland() {
    DOM.bottomIsland.classList.remove("expanded");
    DOM.scrim.classList.remove("active");
    DOM.islandHandleBar.setAttribute("title", "Ver Cotización");
  }

  // ==========================================================================
  // DETAIL DRAWER ORCHESTRATOR
  // ==========================================================================
  function openDetailDrawer(p) {
    DOM.detailDrawer.dataset.activeId = p.id;
    
    // Gradient visuals fallback matching catalog categories
    let catGradient = "var(--cat-otros-bg)";
    let catIcon = "ti-box-seam";
    let catLabel = "Refacción / General";

    if (p.categoriaCodigo === "01") {
      catGradient = "var(--cat-coccion-bg)";
      catIcon = "ti-flame";
      catLabel = "Equipo de Cocción Industrial";
    } else if (p.categoriaCodigo === "02") {
      catGradient = "var(--cat-refacciones-bg)";
      catIcon = "ti-settings-2";
      catLabel = "Refacción y Componente Original";
    } else if (p.categoriaCodigo === "03") {
      catGradient = "var(--cat-limpieza-bg)";
      catIcon = "ti-droplet-half-2";
      catLabel = "Químico y Limpieza Profesional";
    }

    // Dynamic Barcode Simulation HTML
    const barcodeVisualSvg = generateBarcodeSVG(p.codigo);

    // Custom Fields lists
    let specsHtml = "";
    if (p.descripcion) specsHtml += `<div class="spec-item"><span class="spec-label">Descripción</span><span class="spec-value custom-field">${p.descripcion}</span></div>`;
    if (p.especificaciones) specsHtml += `<div class="spec-item"><span class="spec-label">Especificaciones</span><span class="spec-value custom-field">${p.especificaciones}</span></div>`;
    if (p.especial3) specsHtml += `<div class="spec-item"><span class="spec-label">Ubicación / Notas</span><span class="spec-value custom-field">${p.especial3}</span></div>`;
    if (p.especial4) specsHtml += `<div class="spec-item"><span class="spec-label">Dimensiones / Datos</span><span class="spec-value custom-field">${p.especial4}</span></div>`;
    if (p.especial5) specsHtml += `<div class="spec-item"><span class="spec-label">Campo Adicional 5</span><span class="spec-value custom-field">${p.especial5}</span></div>`;
    if (p.especial6) specsHtml += `<div class="spec-item"><span class="spec-label">Campo Adicional 6</span><span class="spec-value custom-field">${p.especial6}</span></div>`;

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
      <div class="drawer-visual">
        <div class="dynamic-gradient-img" style="background: ${catGradient}">
          <i class="ti ${catIcon}"></i>
        </div>
      </div>

      <div class="drawer-product-brand">${p.marca}</div>
      <h3 class="drawer-product-name">${p.nombre}</h3>

      <div class="drawer-price-card">
        <div class="drawer-price-info">
          <span class="price-label">Precio al Público</span>
          <span class="drawer-price-amount">$${p.precio.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span class="drawer-cost-amount">Precio Neto + IVA (Sujeto a cambios)</span>
        </div>
        <div style="text-align: right;">
          <span class="badge category-other" style="background: ${catGradient}">${p.unitCode}</span>
        </div>
      </div>

      <h4 style="font-size: 13.5px; text-transform: uppercase; letter-spacing:0.05em; color: var(--text-secondary); margin-bottom: 12px; font-weight:700;">Detalles Técnicos</h4>
      <div class="specs-list">
        <div class="spec-item">
          <span class="spec-label">SKU / Código</span>
          <span class="spec-value" style="font-family: var(--font-mono, monospace); font-weight:700;">${p.codigo}</span>
        </div>
        <div class="spec-item">
          <span class="spec-label">Categoría</span>
          <span class="spec-value">${catLabel}</span>
        </div>
        <div class="spec-item">
          <span class="spec-label">Estado de Inventario</span>
          <span class="spec-value" ${stockStyle}><strong>${stockText}</strong></span>
        </div>
        ${specsHtml}
      </div>

      <h4 style="font-size: 13.5px; text-transform: uppercase; letter-spacing:0.05em; color: var(--text-secondary); margin-bottom: 12px; font-weight:700;">Código de Barras (${p.barcodeType.toUpperCase()})</h4>
      <div class="barcode-section">
        <div class="barcode-svg-container">
          ${barcodeVisualSvg}
        </div>
        <span class="barcode-label">${p.codigo}</span>
      </div>
    `;

    // Dynamic Action Button
    updateDrawerActionButton(p);

    DOM.detailDrawer.classList.add("active");
    DOM.scrim.classList.add("active");
  }

  function updateDrawerActionButton(p) {
    const isAlreadyInCart = AppState.cart.some(c => c.id === p.id);
    if (isAlreadyInCart) {
      DOM.drawerActions.innerHTML = `
        <button class="primary-drawer-btn remove-mode" id="btn-drawer-action">
          <i class="ti ti-shopping-cart-x"></i> Quitar de Cotización
        </button>
      `;
    } else {
      DOM.drawerActions.innerHTML = `
        <button class="primary-drawer-btn" id="btn-drawer-action">
          <i class="ti ti-shopping-cart-plus"></i> Añadir a Cotización
        </button>
      `;
    }

    // Attach click action
    document.getElementById("btn-drawer-action").addEventListener("click", () => {
      toggleCartItem(p.id);
    });
  }

  function closeDetailDrawer() {
    DOM.detailDrawer.classList.remove("active");
    // Only remove scrim if bottom island is also collapsed
    if (!DOM.bottomIsland.classList.contains("expanded")) {
      DOM.scrim.classList.remove("active");
    }
  }

  // ==========================================================================
  // BARCODE SVG SIMULATOR (Code 128 dynamic generator)
  // ==========================================================================
  function generateBarcodeSVG(code) {
    // Generate pseudorandom black/white bar widths based on SKU characters to render unique realistic barcodes
    let str = String(code);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    let barcodePatterns = [];
    // Always start with dark line
    barcodePatterns.push(2); // start guard
    barcodePatterns.push(1); // space

    for (let i = 0; i < 15; i++) {
      // Alternate width pattern using hash
      const val = Math.abs((hash >> i) & 3) + 1; // 1 to 4 units width
      barcodePatterns.push(val);
    }
    
    barcodePatterns.push(2); // stop guard

    // Draw SVG
    let svgHtml = '<svg viewBox="0 0 100 20" preserveAspectRatio="none">';
    let xOffset = 2;
    const totalUnitWidth = barcodePatterns.reduce((sum, w) => sum + w, 0) + 4;
    const multiplier = 96 / totalUnitWidth;

    barcodePatterns.forEach((width, index) => {
      const isBlackBar = index % 2 === 0;
      const pixelWidth = width * multiplier;
      
      if (isBlackBar) {
        svgHtml += `<rect x="${xOffset}" y="1" width="${pixelWidth}" height="18" fill="#111827" />`;
      }
      xOffset += pixelWidth;
    });

    svgHtml += "</svg>";
    return svgHtml;
  }

  // ==========================================================================
  // TOAST NOTIFICATIONS SYSTEM
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

    toast.innerHTML = `<i class="ti ti-bell-filled" style="color: var(--color-gold);"></i> ${message}`;
    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => {
      toast.style.transform = "translateY(0)";
      toast.style.opacity = "1";
    }, 10);

    // Auto dismiss after 2.5s
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

    // Populate Print Invoice Node
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
      <div class="print-header">
        <div>
          <h1 class="print-brand" style="color: #c69214;">KITCHEN VALENZUELA</h1>
          <p style="font-size:12px; color:#555;">Catálogo y Solicitud de Cotización Industrial</p>
        </div>
        <div style="text-align: right;">
          <h2 style="font-size:16px;">DOCUMENTO DE ESTIMACIÓN</h2>
          <p style="font-size:11px; color:#555;">Fecha: ${new Date().toLocaleDateString()}</p>
        </div>
      </div>

      <table class="print-table">
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

      <div class="print-totals">
        <div class="print-totals-row">
          <span>Subtotal:</span>
          <span>$${subtotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</span>
        </div>
        <div class="print-totals-row">
          <span>IVA (16%):</span>
          <span>$${iva.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</span>
        </div>
        <div class="print-totals-row grand-total">
          <span>TOTAL:</span>
          <span>$${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN</span>
        </div>
      </div>

      <div style="margin-top: 80px; font-size: 10px; color: #777; text-align: center; border-top: 1px solid #d1d5db; padding-top: 16px;">
        Esta cotización representa una estimación comercial y no constituye un contrato vinculante. Los precios pueden variar según disponibilidad de divisas o incrementos del fabricante.
      </div>
    `;

    // Trigger Print Action
    window.print();
  }

})();
