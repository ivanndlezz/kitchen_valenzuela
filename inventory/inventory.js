/**
 * Kitchen Valenzuela — Persistent Scanned Inventory Engine
 * 100% Client-Side database backed by Local Storage.
 * Features dual-mode barcode scanning (camera video stream and photo uploads).
 * Form editing and detail viewing via drawer glider tabs.
 */

(function () {
  // Global Application State
  const AppState = {
    products: [],
    filteredProducts: [],
    brands: [],
    filters: {
      text: "",
      category: "all", // "all", "01", "02", "03", "other"
      brand: "all",
      stockFilter: "all", // "all", "in-stock", "low-stock"
      sort: "name-asc", // "name-asc", "price-asc", "price-desc", "stock-desc"
      view: "grid", // "grid" or "list"
    },
    theme: "dark",
    activeScannerTab: "photo", // "photo" or "video"
    activeDrawerTab: "product", // "product" or "form"
  };

  // DOM Elements cache
  const DOM = {
    themeBtn: null,
    scanBtn: null,
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

    // Scrim & Drawer
    scrim: null,
    detailDrawer: null,
    closeDrawerBtn: null,
    drawerBody: null,
    drawerActions: null,
    drawerTabsContainer: null,
    drawerTabProduct: null,
    drawerTabForm: null,
    drawerViewProduct: null,
    drawerViewForm: null,

    // Scanner Modal
    scannerModal: null,
    scannerCloseBtn: null,
    scannerTabsContainer: null,
    cameraInput: null,
    triggerPhotoBtn: null,
    startVideoBtn: null,
    stopVideoBtn: null,

    // Toast Container
    toastContainer: null,
  };

  // HTML5 QRCode scanner instances
  let html5QrcodeScanner = null;
  const QR_READER_ID = "reader";

  // Utility to encode product IDs (making special characters like '-( ' attribute and URL safe)
  function encodeId(id) {
    return encodeURIComponent(String(id)).replace(/-/g, '%2D').replace(/\(/g, '%28').replace(/\)/g, '%29');
  }

  // Utility to decode product IDs back to their original state
  function decodeId(encoded) {
    return decodeURIComponent(encoded);
  }

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    cacheElements();
    setupTheme();
    setupToastContainer();
    await loadProductsFromStorage();
    setupEventListeners();
    setupScannerLogic();
    calculateMetrics();
    applyFilters();
    setupSyncUI();
  }

  function cacheElements() {
    DOM.themeBtn = document.getElementById("theme-toggle-btn");
    DOM.scanBtn = document.getElementById("scan-btn");
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
    DOM.drawerTabsContainer = DOM.detailDrawer.querySelector(".drawer__tabs");
    DOM.drawerTabProduct = DOM.detailDrawer.querySelector('[data-drawer-tab="product"]');
    DOM.drawerTabForm = DOM.detailDrawer.querySelector('[data-drawer-tab="form"]');
    DOM.drawerViewProduct = document.getElementById("drawer-view-product");
    DOM.drawerViewForm = document.getElementById("drawer-view-form");

    // Scanner
    DOM.scannerModal = document.getElementById("scanner-modal");
    DOM.scannerCloseBtn = document.getElementById("scanner-close-btn");
    DOM.scannerTabsContainer = DOM.scannerModal.querySelector(".scanner__tabs");
    DOM.cameraInput = document.getElementById("camera-input");
    DOM.triggerPhotoBtn = document.getElementById("trigger-photo-btn");
    DOM.startVideoBtn = document.getElementById("start-video-btn");
    DOM.stopVideoBtn = document.getElementById("stop-video-btn");
  }

  // ==========================================================================
  // THEME ENGINE
  // ==========================================================================
  function setupTheme() {
    const savedTheme = localStorage.getItem("kv-catalog-theme") || "dark";
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
  // TOAST NOTIFICATIONS SYSTEM
  // ==========================================================================
  function setupToastContainer() {
    DOM.toastContainer = document.createElement("div");
    DOM.toastContainer.className = "toast-container";
    document.body.appendChild(DOM.toastContainer);
  }

  function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;
    
    let icon = "check-circle";
    if (type === "warning") icon = "alert-triangle";
    if (type === "danger") icon = "alert-octagon";
    if (type === "info") icon = "info";

    toast.innerHTML = `
      <i data-lucide="${icon}"></i>
      <span>${message}</span>
    `;
    
    DOM.toastContainer.appendChild(toast);
    createLucideIcons();

    setTimeout(() => {
      toast.style.animation = "toast-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Helper to re-render Lucide SVG Icons
  function createLucideIcons() {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  }

  // ==========================================================================
  // LOCAL STORAGE PRODUCTS CONTROLLER
  // ==========================================================================
  async function loadProductsFromStorage() {
    const saved = localStorage.getItem("kv-catalog-products");
    if (saved) {
      try {
        AppState.products = JSON.parse(saved);
      } catch (err) {
        console.error("Failed to parse local catalog database:", err);
        AppState.products = [];
      }
    } else {
      // Intentar auto-importar desde el archivo JSON de respaldo si LocalStorage está vacío
      try {
        const raw = await SyncManager.loadFromLocalJSON();
        if (raw && raw.length > 0) {
          AppState.products = raw.map(normalizeJsonProduct);
          localStorage.setItem("kv-catalog-products", JSON.stringify(AppState.products));
          console.log(`SyncManager: Auto-imported ${AppState.products.length} products from backup JSON.`);
        } else {
          AppState.products = [];
        }
      } catch (err) {
        console.warn("Failed to load initial backup JSON:", err);
        AppState.products = [];
      }
    }
  }

  function saveProductsToStorage() {
    localStorage.setItem("kv-catalog-products", JSON.stringify(AppState.products));
    calculateMetrics();
    populateBrandFilter();
    applyFilters();
  }

  // ==========================================================================
  // METRICS & FILTERS ORCHESTRATOR
  // ==========================================================================
  function calculateMetrics() {
    const totalProducts = AppState.products.length;
    const totalStock = AppState.products.reduce((sum, p) => sum + (parseFloat(p.stock) || 0), 0);
    const lowStock = AppState.products.filter(p => (parseFloat(p.stock) || 0) <= (parseFloat(p.alertaCantidad) || 0)).length;
    
    const brandsSet = new Set();
    AppState.products.forEach(p => {
      if (p.marca && p.marca.trim() !== "") {
        brandsSet.add(p.marca.trim().toUpperCase());
      }
    });
    const totalBrands = brandsSet.size;

    DOM.metricTotalProducts.textContent = totalProducts;
    DOM.metricTotalStock.textContent = totalStock;
    DOM.metricLowStock.textContent = lowStock;
    DOM.metricTotalBrands.textContent = totalBrands;

    // Badges inside tabs
    updateCategoryCountBadges();
  }

  function updateCategoryCountBadges() {
    const counts = { all: 0, "01": 0, "02": 0, "03": 0, other: 0 };
    counts.all = AppState.products.length;

    AppState.products.forEach(p => {
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
    AppState.products.forEach(p => {
      if (p.marca && p.marca.trim() !== "") {
        brandsSet.add(p.marca.trim());
      }
    });
    AppState.brands = Array.from(brandsSet).sort();

    const previousValue = DOM.brandSelect.value;
    let html = '<option value="all">Todas las Marcas</option>';
    AppState.brands.forEach(brand => {
      html += `<option value="${brand}">${brand}</option>`;
    });
    DOM.brandSelect.innerHTML = html;
    
    if (AppState.brands.includes(previousValue)) {
      DOM.brandSelect.value = previousValue;
    } else {
      DOM.brandSelect.value = "all";
      AppState.filters.brand = "all";
    }
  }

  function applyFilters() {
    const query = AppState.filters.text.toLowerCase().trim();
    const cat = AppState.filters.category;
    const brand = AppState.filters.brand;
    const stock = AppState.filters.stockFilter;

    AppState.filteredProducts = AppState.products.filter(p => {
      // Search text matches SKU, name, brand, description
      const matchText = !query || 
        String(p.codigo).toLowerCase().includes(query) ||
        String(p.nombre).toLowerCase().includes(query) ||
        String(p.marca).toLowerCase().includes(query) ||
        String(p.descripcion).toLowerCase().includes(query) ||
        String(p.especificaciones).toLowerCase().includes(query);

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
    const sort = AppState.filters.sort;
    AppState.filteredProducts.sort((a, b) => {
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

  // ==========================================================================
  // RENDER PRODUCT CATALOG
  // ==========================================================================
  function renderProducts() {
    if (AppState.filteredProducts.length === 0) {
      if (AppState.products.length === 0) {
        // Absolute empty state
        DOM.productsContainer.innerHTML = `
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
        DOM.productsContainer.innerHTML = `
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
    const isList = AppState.filters.view === "list";

    AppState.filteredProducts.forEach(p => {
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

      const encodedId = encodeId(p.id);
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

    DOM.productsContainer.innerHTML = html;
    createLucideIcons();
  }

  // ==========================================================================
  // EVENT LISTENERS CONTROL
  // ==========================================================================
  function setupEventListeners() {
    // Open Scanner
    DOM.scanBtn.addEventListener("click", openScanner);

    // Product card click delegation (removes hardcoded inline onclick)
    DOM.productsContainer.addEventListener("click", (e) => {
      const card = e.target.closest("[data-open-id]");
      if (card) {
        const encodedId = card.getAttribute("data-open-id");
        const decodedId = decodeId(encodedId);
        const p = AppState.products.find(x => x.id === decodedId);
        if (p) openProductDrawer(p);
      }
    });

    // Search Input Reactivity
    DOM.searchInput.addEventListener("input", (e) => {
      AppState.filters.text = e.target.value;
      applyFilters();
    });

    // Category Selector Tabs
    DOM.categoryTabsContainer.querySelectorAll(".filters__tab").forEach(tab => {
      tab.addEventListener("click", () => {
        DOM.categoryTabsContainer.querySelectorAll(".filters__tab").forEach(t => {
          t.classList.remove("filters__tab--active");
        });
        tab.classList.add("filters__tab--active");
        AppState.filters.category = tab.dataset.category;
        applyFilters();
      });
    });

    // Select Dropdowns
    DOM.brandSelect.addEventListener("change", (e) => {
      AppState.filters.brand = e.target.value;
      applyFilters();
    });

    DOM.stockFilterSelect.addEventListener("change", (e) => {
      AppState.filters.stockFilter = e.target.value;
      applyFilters();
    });

    DOM.sortSelect.addEventListener("change", (e) => {
      AppState.filters.sort = e.target.value;
      applyFilters();
    });

    // Layout Switchers
    DOM.viewGridBtn.addEventListener("click", () => {
      DOM.viewGridBtn.classList.add("filters__view-btn--active");
      DOM.viewListBtn.classList.remove("filters__view-btn--active");
      DOM.productsContainer.classList.remove("catalog__grid--list-view");
      AppState.filters.view = "grid";
      renderProducts();
    });

    DOM.viewListBtn.addEventListener("click", () => {
      DOM.viewListBtn.classList.add("filters__view-btn--active");
      DOM.viewGridBtn.classList.remove("filters__view-btn--active");
      DOM.productsContainer.classList.add("catalog__grid--list-view");
      AppState.filters.view = "list";
      renderProducts();
    });

    // Scrim Close Click
    DOM.scrim.addEventListener("click", () => {
      closeProductDrawer();
      closeScanner();
    });
  }

  // ==========================================================================
  // BARCODE SCANNER LOGIC & STRATEGY (Dual-tab Modal)
  // ==========================================================================
  function setupScannerLogic() {
    // Close modal triggers
    DOM.scannerCloseBtn.addEventListener("click", closeScanner);

    // Tab Switches
    DOM.scannerTabsContainer.querySelectorAll(".scanner__tab").forEach(tab => {
      tab.addEventListener("click", () => {
        DOM.scannerTabsContainer.querySelectorAll(".scanner__tab").forEach(t => {
          t.classList.remove("scanner__tab--active");
        });
        tab.classList.add("scanner__tab--active");
        const activeTab = tab.dataset.scannerTab;
        AppState.activeScannerTab = activeTab;

        // Toggle panels
        DOM.scannerModal.querySelectorAll("[data-scanner-panel]").forEach(panel => {
          panel.classList.toggle("scanner__panel--active", panel.dataset.scannerPanel === activeTab);
        });

        // Stop video if switching to photo tab
        if (activeTab === "photo") {
          stopVideoCapture();
        }
      });
    });

    // Trigger Upload Button (System Photo Mode)
    DOM.triggerPhotoBtn.addEventListener("click", () => {
      DOM.cameraInput.click();
    });

    DOM.cameraInput.addEventListener("change", handlePhotoUpload);

    // Video Streaming camera controllers (Apple Mode)
    DOM.startVideoBtn.addEventListener("click", startVideoCapture);
    DOM.stopVideoBtn.addEventListener("click", stopVideoCapture);
  }

  function openScanner() {
    DOM.scannerModal.classList.add("scanner-modal--active");
    DOM.scrim.classList.add("drawer__scrim--active");
    
    // Default to photo tab on open
    DOM.scannerTabsContainer.querySelector('[data-scanner-tab="photo"]').click();
  }

  function closeScanner() {
    stopVideoCapture();
    DOM.scannerModal.classList.remove("scanner-modal--active");
    if (!DOM.detailDrawer.classList.contains("drawer__sheet--active")) {
      DOM.scrim.classList.remove("drawer__scrim--active");
    }
  }

  // Photo Scan Processing Strategies
  async function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    DOM.triggerPhotoBtn.disabled = true;
    DOM.triggerPhotoBtn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> Procesando...';
    createLucideIcons();

    try {
      const code = await scanImageFile(file);
      showToast(`Código detectado: ${code}`, "success");
      registerOrOpenScannedCode(code);
    } catch (err) {
      console.warn("Scan failed:", err);
      showToast(err.message || "No se detectó ningún código QR o de barras.", "warning");
    } finally {
      DOM.triggerPhotoBtn.disabled = false;
      DOM.triggerPhotoBtn.innerHTML = '<i data-lucide="camera"></i> Tomar Foto';
      createLucideIcons();
      event.target.value = ""; // clean file input
    }
  }

  function scanImageFile(file) {
    return new Promise(async (resolve, reject) => {
      // 1. Try html5-qrcode scanFile strategy (primary)
      const qrInstance = new Html5Qrcode(QR_READER_ID);
      try {
        const text = await qrInstance.scanFile(file, false);
        resolve(text);
        return;
      } catch (e) {
        console.warn("Primary strategy (HTML5Qrcode scanFile) failed:", e);
      }

      // 2. Fallback to native BarcodeDetector if available
      if ("BarcodeDetector" in window) {
        try {
          const img = new Image();
          img.onload = async () => {
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const formats = ["qr_code", "ean_13", "code_128", "ean_8", "upc_a", "code_39", "code_93", "codabar", "itf"];
            const detector = new BarcodeDetector({ formats });
            const barcodes = await detector.detect(canvas);
            
            if (barcodes.length > 0) {
              resolve(barcodes[0].rawValue);
            } else {
              reject(new Error("No se detectó ningún código en la foto. Prueba con mejor iluminación o de más cerca."));
            }
          };
          img.onerror = () => reject(new Error("Error al procesar la imagen seleccionada."));
          img.src = URL.createObjectURL(file);
          return;
        } catch (detectorErr) {
          console.error("BarcodeDetector strategy failed:", detectorErr);
        }
      }

      reject(new Error("No se pudo detectar código de barras. Intenta con una imagen más nítida o en el modo Video."));
    });
  }

  // Live video capture using Html5Qrcode
  async function startVideoCapture() {
    DOM.startVideoBtn.style.display = "none";
    DOM.stopVideoBtn.style.display = "block";
    DOM.stopVideoBtn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> Iniciando cámara...';
    createLucideIcons();

    if (!html5QrcodeScanner) {
      html5QrcodeScanner = new Html5Qrcode(QR_READER_ID);
    }

    try {
      const config = { fps: 10, qrbox: { width: 250, height: 250 } };
      await html5QrcodeScanner.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          // Success Callback
          showToast(`Escaneado: ${decodedText}`, "success");
          stopVideoCapture();
          registerOrOpenScannedCode(decodedText);
        },
        (errorMessage) => {
          // Silent scan error polling
        }
      );
      DOM.stopVideoBtn.innerHTML = '<i data-lucide="video-off"></i> Detener Cámara';
      createLucideIcons();
    } catch (err) {
      console.error("Camera startup failed:", err);
      showToast(`Error de cámara: ${err}`, "danger");
      stopVideoCapture();
    }
  }

  async function stopVideoCapture() {
    DOM.startVideoBtn.style.display = "block";
    DOM.stopVideoBtn.style.display = "none";
    
    if (html5QrcodeScanner && html5QrcodeScanner.isScanning) {
      try {
        await html5QrcodeScanner.stop();
      } catch (err) {
        console.error("Failed to stop scanner:", err);
      }
    }
  }

  // Main flow router for detected barcodes
  function registerOrOpenScannedCode(code) {
    closeScanner();
    
    const cleanCode = String(code).trim();
    let product = AppState.products.find(p => p.codigo === cleanCode);

    if (product) {
      showToast(`El código "${cleanCode}" ya está registrado. Abriendo...`, "info");
      openProductDrawer(product);
      setDrawerTab("product");
    } else {
      // Create brand new product
      product = {
        id: cleanCode,
        nombre: `Equipo Nuevo (${cleanCode})`,
        codigo: cleanCode,
        barcodeType: "code128",
        marca: "Generales",
        categoriaCodigo: "other",
        unitCode: "Pieza",
        costo: 0,
        precio: 0,
        alertaCantidad: 1,
        tasaImpuesto: "IVA",
        metodoImpuesto: "Exclusivo",
        imagen: "no_image.png",
        subCategoria: "",
        descripcion: "Registrado por escaneo.",
        especificaciones: "",
        especial3: "", // Location
        especial4: "", // Dimensions
        especial5: "", // Custom field 5
        especial6: "", // Custom field 6
        stock: 1,
        sync_status: "pending",
        updatedAt: new Date().toISOString()
      };

      AppState.products.push(product);
      saveProductsToStorage();
      showToast(`Nuevo código detectado. Registrado base.`, "success");
      
      // Open drawer directly into edit mode
      openProductDrawer(product);
      setDrawerTab("form");
    }
  }

  // ==========================================================================
  // DETAIL DRAWER WITH GLIDER TABS
  // ==========================================================================
  function openProductDrawer(p) {
    DOM.detailDrawer.dataset.activeId = p.id;
    
    // Setup tabs listeners
    DOM.drawerTabProduct.onclick = () => setDrawerTab("product");
    DOM.drawerTabForm.onclick = () => setDrawerTab("form");

    // Render both views
    renderDrawerViewProduct(p);
    renderDrawerViewForm(p);

    // Default to product tab
    setDrawerTab("product");

    DOM.detailDrawer.classList.add("drawer__sheet--active");
    DOM.scrim.classList.add("drawer__scrim--active");
  }

  function closeProductDrawer() {
    DOM.detailDrawer.classList.remove("drawer__sheet--active");
    if (!DOM.scannerModal.classList.contains("scanner-modal--active")) {
      DOM.scrim.classList.remove("drawer__scrim--active");
    }
  }



  function setDrawerTab(tab) {
    AppState.activeDrawerTab = tab;

    // Toggle tab active styles
    DOM.drawerTabProduct.classList.toggle("drawer__tab--active", tab === "product");
    DOM.drawerTabForm.classList.toggle("drawer__tab--active", tab === "form");

    // Toggle view elements visibility
    DOM.drawerViewProduct.classList.toggle("drawer__view--active", tab === "product");
    DOM.drawerViewForm.classList.toggle("drawer__view--active", tab === "form");
  }

  function renderDrawerViewProduct(p) {
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

    const barcodeSvg = generateBarcodeSVG(p.codigo);

    // Additional technical specs list items
    let specsHtml = "";
    if (p.descripcion) specsHtml += `<div class="drawer__spec-item"><span class="drawer__spec-label">Descripción</span><span class="drawer__spec-value drawer__spec-value--custom">${p.descripcion}</span></div>`;
    if (p.especificaciones) specsHtml += `<div class="drawer__spec-item"><span class="drawer__spec-label">Especificaciones</span><span class="drawer__spec-value drawer__spec-value--custom">${p.especificaciones}</span></div>`;
    if (p.especial3) specsHtml += `<div class="drawer__spec-item"><span class="drawer__spec-label">Ubicación / Notas</span><span class="drawer__spec-value drawer__spec-value--custom">${p.especial3}</span></div>`;
    if (p.especial4) specsHtml += `<div class="drawer__spec-item"><span class="drawer__spec-label">Dimensiones / Datos</span><span class="drawer__spec-value drawer__spec-value--custom">${p.especial4}</span></div>`;
    if (p.especial5) specsHtml += `<div class="drawer__spec-item"><span class="drawer__spec-label">Campo Adicional 5</span><span class="drawer__spec-value drawer__spec-value--custom">${p.especial5}</span></div>`;
    if (p.especial6) specsHtml += `<div class="drawer__spec-item"><span class="drawer__spec-label">Campo Adicional 6</span><span class="drawer__spec-value drawer__spec-value--custom">${p.especial6}</span></div>`;

    let stockText = "Agotado / Sin Existencias";
    let stockStyle = 'style="color: var(--color-danger);"';
    const stockVal = parseFloat(p.stock) || 0;
    const alertVal = parseFloat(p.alertaCantidad) || 0;

    if (stockVal > alertVal) {
      stockText = `${stockVal} unidades en existencia`;
      stockStyle = 'style="color: var(--color-success);"';
    } else if (stockVal > 0) {
      stockText = `Bajo Stock (${stockVal} restantes)`;
      stockStyle = 'style="color: var(--color-warning);"';
    }

    DOM.drawerViewProduct.innerHTML = `
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
          <span class="drawer__price-amount">$${(p.precio || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span class="drawer__cost-amount">Costo Unitario: $${(p.costo || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div style="text-align: right;">
          <span class="product-card__badge" style="background: ${catGradient}">${p.unitCode}</span>
        </div>
      </div>

      <h4 style="font-size: 12.5px; text-transform: uppercase; letter-spacing:0.05em; color: var(--text-secondary); margin-bottom: 12px; font-weight:700;">Detalles Técnicos</h4>
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

      <h4 style="font-size: 12.5px; text-transform: uppercase; letter-spacing:0.05em; color: var(--text-secondary); margin-bottom: 12px; font-weight:700;">Código de Barras (${p.barcodeType.toUpperCase()})</h4>
      <div class="drawer__barcode-section">
        <div class="drawer__barcode-container">
          ${barcodeSvg}
        </div>
      </div>
    `;

    // Render delete CTA button inside actions
    DOM.drawerActions.innerHTML = `
      <button class="drawer__primary-btn" id="btn-close-drawer">
        Cerrar Detalle
      </button>
      <button class="drawer__primary-btn drawer__primary-btn--danger" id="btn-delete-product">
        <i data-lucide="trash-2"></i> Eliminar de Inventario
      </button>
    `;

    document.getElementById("btn-close-drawer").addEventListener("click", closeProductDrawer);
    document.getElementById("btn-delete-product").addEventListener("click", () => {
      deleteProduct(p.id);
    });

    createLucideIcons();
  }

  function deleteProduct(id) {
    if (confirm("¿Estás seguro de que deseas eliminar permanentemente este producto del inventario? Esta acción no se puede deshacer.")) {
      AppState.products = AppState.products.filter(p => p.id !== id);
      saveProductsToStorage();
      showToast("Producto eliminado correctamente", "danger");
      closeProductDrawer();
    }
  }

  function renderDrawerViewForm(p) {
    DOM.drawerViewForm.innerHTML = `
      <form id="edit-product-form">
        
        <div class="form-group">
          <label class="form-group__label">Código SKU (Escaneado)</label>
          <input type="text" class="form-group__input" value="${p.codigo}" readonly style="opacity: 0.65; cursor: not-allowed; font-family: monospace;" />
        </div>

        <div class="form-group">
          <label class="form-group__label">Nombre del Producto</label>
          <input type="text" id="form-nombre" class="form-group__input" value="${p.nombre}" required placeholder="Ej. Horno de Convección RATIONAL" />
        </div>

        <div class="form-group__row">
          <div class="form-group">
            <label class="form-group__label">Marca</label>
            <input type="text" id="form-marca" class="form-group__input" value="${p.marca}" placeholder="Ej. RATIONAL" list="brands-datalist" />
            <datalist id="brands-datalist">
              ${AppState.brands.map(b => `<option value="${b}"></option>`).join("")}
            </datalist>
          </div>
          <div class="form-group">
            <label class="form-group__label">Unidad de Medida</label>
            <input type="text" id="form-unit" class="form-group__input" value="${p.unitCode}" placeholder="Ej. Pieza, Caja" />
          </div>
        </div>

        <div class="form-group">
          <label class="form-group__label">Categoría de Cocina</label>
          <select id="form-category" class="form-group__select">
            <option value="01" ${p.categoriaCodigo === "01" ? "selected" : ""}>Cocción (Equipos Calientes)</option>
            <option value="02" ${p.categoriaCodigo === "02" ? "selected" : ""}>Refacciones & Componentes</option>
            <option value="03" ${p.categoriaCodigo === "03" ? "selected" : ""}>Limpieza & Químicos</option>
            <option value="other" ${p.categoriaCodigo === "other" ? "selected" : ""}>Otros / Generales</option>
          </select>
        </div>

        <div class="form-group__row">
          <div class="form-group">
            <label class="form-group__label">Precio de Venta ($)</label>
            <input type="number" step="0.01" id="form-precio" class="form-group__input" value="${p.precio}" required />
          </div>
          <div class="form-group">
            <label class="form-group__label">Costo Neto ($)</label>
            <input type="number" step="0.01" id="form-costo" class="form-group__input" value="${p.costo}" />
          </div>
        </div>

        <div class="form-group__row">
          <div class="form-group">
            <label class="form-group__label">Cantidad en Stock</label>
            <input type="number" step="0.1" id="form-stock" class="form-group__input" value="${p.stock}" required />
          </div>
          <div class="form-group">
            <label class="form-group__label">Alerta Stock Mínimo</label>
            <input type="number" step="1" id="form-alerta" class="form-group__input" value="${p.alertaCantidad}" required />
          </div>
        </div>

        <div class="form-group">
          <label class="form-group__label">Descripción</label>
          <textarea id="form-desc" class="form-group__textarea" placeholder="Breve descripción del equipo industrial...">${p.descripcion}</textarea>
        </div>

        <div class="form-group">
          <label class="form-group__label">Especificaciones Técnicas</label>
          <textarea id="form-specs" class="form-group__textarea" placeholder="Ej. Voltaje, potencia, conexiones de gas...">${p.especificaciones}</textarea>
        </div>

        <div class="form-group__row">
          <div class="form-group">
            <label class="form-group__label">Ubicación física / Notas</label>
            <input type="text" id="form-ubicacion" class="form-group__input" value="${p.especial3}" placeholder="Estante A, Pasillo 3" />
          </div>
          <div class="form-group">
            <label class="form-group__label">Dimensiones (An x Al x Pr)</label>
            <input type="text" id="form-dimensiones" class="form-group__input" value="${p.especial4}" placeholder="80x90x60 cm" />
          </div>
        </div>

        <div class="form-group__row">
          <div class="form-group">
            <label class="form-group__label">Campo Personalizado 5</label>
            <input type="text" id="form-custom5" class="form-group__input" value="${p.especial5}" />
          </div>
          <div class="form-group">
            <label class="form-group__label">Campo Personalizado 6</label>
            <input type="text" id="form-custom6" class="form-group__input" value="${p.especial6}" />
          </div>
        </div>

        <div style="margin-top: 24px; display: flex; gap: 12px;">
          <button type="submit" class="drawer__primary-btn">
            <i data-lucide="save"></i> Guardar Cambios
          </button>
        </div>
      </form>
    `;

    document.getElementById("edit-product-form").addEventListener("submit", (event) => {
      event.preventDefault();
      saveProductForm(p.id);
    });

    createLucideIcons();
  }

  function saveProductForm(id) {
    const p = AppState.products.find(x => x.id === id);
    if (!p) return;

    // Grab values
    p.nombre = document.getElementById("form-nombre").value.trim() || "Producto sin nombre";
    p.marca = document.getElementById("form-marca").value.trim() || "Generales";
    p.unitCode = document.getElementById("form-unit").value.trim() || "Pieza";
    p.categoriaCodigo = document.getElementById("form-category").value;
    p.precio = parseFloat(document.getElementById("form-precio").value) || 0;
    p.costo = parseFloat(document.getElementById("form-costo").value) || 0;
    p.stock = parseFloat(document.getElementById("form-stock").value) || 0;
    p.alertaCantidad = parseFloat(document.getElementById("form-alerta").value) || 0;
    p.descripcion = document.getElementById("form-desc").value.trim();
    p.especificaciones = document.getElementById("form-specs").value.trim();
    p.especial3 = document.getElementById("form-ubicacion").value.trim();
    p.especial4 = document.getElementById("form-dimensiones").value.trim();
    p.especial5 = document.getElementById("form-custom5").value.trim();
    p.especial6 = document.getElementById("form-custom6").value.trim();

    p.sync_status = "pending";
    p.updatedAt = new Date().toISOString();
    saveProductsToStorage();
    showToast("¡Producto guardado exitosamente!", "success");

    // Switch back to detail product view
    openProductDrawer(p);
  }

  // ==========================================================================
  // BARCODE SVG SIMULATOR (Code 128 dynamic generator)
  // ==========================================================================
  function generateBarcodeSVG(code) {
    const str = String(code);

    const C128 = [
      [2,1,2,2,2,2],[2,2,2,1,2,2],[2,2,2,2,2,1],[1,2,1,2,2,3],[1,2,1,3,2,2],
      [1,3,1,2,2,2],[1,2,2,2,1,3],[1,2,2,3,1,2],[1,3,2,2,1,2],[2,2,1,2,1,3],
      [2,2,1,3,1,2],[2,3,1,2,1,2],[1,1,2,2,3,2],[1,2,2,1,3,2],[1,2,2,2,3,1],
      [1,1,3,2,2,2],[1,2,3,1,2,2],[1,2,3,2,2,1],[2,2,3,2,1,1],[2,2,1,1,3,2],
      [2,2,1,2,3,1],[2,1,3,2,1,2],[2,2,3,1,1,2],[3,1,2,1,3,1],[3,1,1,2,2,2],
      [3,2,1,1,2,2],[3,2,1,2,2,1],[3,1,2,2,1,2],[3,2,2,1,1,2],[3,2,2,2,1,1],
      [2,1,2,1,2,3],[2,1,2,3,2,1],[2,3,2,1,2,1],[1,1,1,3,2,3],[1,3,1,1,2,3],
      [1,3,1,3,2,1],[1,1,2,3,1,3],[1,3,2,1,1,3],[1,3,2,3,1,1],[2,1,1,3,1,3],
      [2,3,1,1,1,3],[2,3,1,3,1,1],[1,1,2,1,3,3],[1,1,2,3,3,1],[1,3,2,1,3,1],
      [1,1,3,1,2,3],[1,1,3,3,2,1],[1,3,3,1,2,1],[3,1,3,1,2,1],[2,1,1,3,3,1],
      [2,3,1,1,3,1],[2,1,3,1,1,3],[2,1,3,3,1,1],[2,1,3,1,3,1],[3,1,1,1,2,3],
      [3,1,1,3,2,1],[3,3,1,1,2,1],[3,1,2,1,1,3],[3,1,2,3,1,1],[3,3,2,1,1,1],
      [3,1,4,1,1,1],[2,2,1,4,1,1],[4,3,1,1,1,1],[1,1,1,2,2,4],[1,1,1,4,2,2],
      [1,2,1,1,2,4],[1,2,1,4,2,1],[1,4,1,1,2,2],[1,4,1,2,2,1],[1,1,2,2,1,4],
      [1,1,2,4,1,2],[1,2,2,1,1,4],[1,2,2,4,1,1],[1,4,2,1,1,2],[1,4,2,2,1,1],
      [2,4,1,2,1,1],[2,2,1,1,1,4],[4,1,3,1,1,1],[2,1,1,2,1,4],[2,1,1,4,1,2],
      [1,1,4,2,1,2],[1,1,4,4,1,1],[1,2,4,1,1,2],[1,2,4,3,1,1],[1,4,4,1,1,1],
      [1,1,1,4,4,1],[3,1,1,1,4,1],[1,1,3,4,1,1],[1,1,4,1,3,1],[4,1,1,1,1,3],
      [4,1,1,3,1,1],[1,1,3,1,4,1],[1,1,4,1,1,3],[3,1,1,1,1,4],[4,1,1,1,3,1],
      [2,1,1,1,4,2],[1,3,1,1,4,1],[1,1,1,1,4,3],[1,1,1,3,1,4],[1,1,4,1,1,3],
      [4,1,1,1,1,3],[4,1,1,3,1,1],[1,3,4,1,1,1],[2,1,4,1,2,1],[3,3,1,1,3,1],
      [3,1,1,3,3,1],[3,3,3,1,1,1]
    ];

    const START_B = [2,1,1,4,1,2];
    const STOP = [2,3,3,1,1,1,2];

    const symbols = [];
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      if (ch >= 32 && ch <= 126) {
        symbols.push(ch - 32);
      } else {
        symbols.push(0);
      }
    }

    let checksum = 104;
    for (let i = 0; i < symbols.length; i++) {
      checksum += symbols[i] * (i + 1);
    }
    checksum = checksum % 103;

    const mods = [];
    const pushPattern = (pattern) => {
      pattern.forEach((w, idx) => mods.push({ w, bar: idx % 2 === 0 }));
    };

    pushPattern(START_B);
    symbols.forEach(sym => pushPattern(C128[sym]));
    pushPattern(C128[checksum]);
    STOP.forEach((w, idx) => mods.push({ w, bar: idx % 2 === 0 }));

    const QUIET = 10;
    const BAR_H = 56;
    const TEXT_H = 16;
    const TOTAL_H = BAR_H + TEXT_H;

    const dataW = mods.reduce((s, m) => s + m.w, 0);
    const totalW = QUIET * 2 + dataW;

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
  // SYNC MANAGER FOR INVENTORY (Airtable / Local Storage / Backup JSON)
  // ==========================================================================
  const SyncManager = {
    config: {
      endpoint: "https://klef.newfacecards.com/shum-api/api.php",
      baseId: "apppjeEy9lY65U4On",
      table: "products",
      jsonUrl: "./data/kv_products_2026_05_05_19_31_43.json",
      saveServerUrl: "http://localhost:8765/save_inventory"
    },

    async shumRequest(action, params) {
      try {
        const response = await fetch(this.config.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...params })
        });
        const result = await response.json();
        if (!result.success) {
          throw new Error(result.message || "API request failed");
        }
        return result.data;
      } catch (error) {
        console.error("SHUM API Error:", error);
        throw error;
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
        "Venta unit code": p.unitCode || "Pieza",
        "Comprar unit code": p.unitCode || "Pieza",
        "Costo": Number(p.costo) || 0,
        "Precio": Number(p.precio) || 0,
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

      return {
        id: code || id,
        nombre: f["Nombre"] || "",
        codigo: code,
        barcodeType: f["Clase de Código de barras"] || "code128",
        marca: f["Marca"] || "Generales",
        categoriaCodigo: cat,
        unitCode: f["unit code"] || "Pieza",
        costo: Number(f["Costo"]) || 0,
        precio: Number(f["Precio"]) || 0,
        alertaCantidad: Number(f["Cantidad de alerta"]) || 0,
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
        stock: Number(f["Cantidad"]) || 0,
        airtable_id: id,
        sync_status: "synced",
        updatedAt: rec.createdTime || new Date().toISOString()
      };
    },

    async fetchAllFromAirtable() {
      let allRecords = [];
      let offset = null;
      let pages = 0;
      const maxPages = 20;

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
        allRecords = allRecords.concat(records);
        offset = result && result.offset ? result.offset : null;
        pages++;
      } while (offset && pages < maxPages);

      return allRecords;
    },

    async syncProduct(p) {
      const mapped = this.mapLocalToAirtable(p);
      let result;

      // Auto-reconcile check: si no tiene airtable_id, buscar por SKU (Código)
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

      p.sync_status = "synced";
      p.updatedAt = new Date().toISOString();
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
    }
  };

  function normalizeJsonProduct(p) {
    if (!p) return null;
    if (p.hasOwnProperty('barcodeType')) return p;

    let cat = p["Código de categoría"] || p.categoriaCodigo || "other";
    if (cat === 1 || cat === "1") cat = "01";
    if (cat === 2 || cat === "2") cat = "02";
    if (cat === 3 || cat === "3") cat = "03";

    return {
      id: String(p["Código"] || p.codigo || p.id),
      nombre: p["Nombre"] || p.nombre || "",
      codigo: String(p["Código"] || p.codigo || ""),
      barcodeType: p["Clase de Código de barras"] || p.barcodeType || "code128",
      marca: p["Marca"] || p.marca || "Generales",
      categoriaCodigo: cat,
      unitCode: p["unit code"] || p.unitCode || "Pieza",
      costo: parseFloat(p["Costo"] || p.costo) || 0,
      precio: parseFloat(p["Precio"] || p.precio) || 0,
      alertaCantidad: parseFloat(p["Cantidad de alerta"] || p.alertaCantidad) || 0,
      tasaImpuesto: p["Tasa de impuestos"] || p.tasaImpuesto || "IVA",
      metodoImpuesto: p["Método de impuestos"] || p.metodoImpuesto || "Exclusivo",
      imagen: p["Imagen"] || p.imagen || "no_image.png",
      subCategoria: p["Código de la Sub categoría"] || p.subCategoria || "",
      descripcion: p["Producto de campo personalizado 1"] || p.descripcion || "",
      specifications: p["Producto Campo Personalizadoo 2"] || p.especificaciones || "",
      especial3: p["Producto Campo Personalizadoo 3"] || p.especial3 || "",
      especial4: p["Producto Campo Personalizadoo 4"] || p.especial4 || "",
      especial5: p["Producto Campo Personalizadoo 5"] || p.especial5 || "",
      especial6: p["Producto Campo Personalizadoo 6"] || p.especial6 || "",
      stock: parseFloat(p["Cantidad"] || p.stock) || 0,
      airtable_id: p.airtable_id || null,
      sync_status: p.sync_status || "pending",
      updatedAt: p.updatedAt || new Date().toISOString()
    };
  }

  // ==========================================================================
  // SYNC COMPARATIVE INTERFACE (LocalStorage vs backup JSON vs Airtable)
  // ==========================================================================
  let localSyncData = [];
  let jsonSyncData = [];
  let cloudSyncData = [];
  let syncActiveFilter = 'all';

  function setupSyncUI() {
    const syncBtn = document.getElementById("sync-btn");
    const syncCloseBtn = document.getElementById("sync-close-btn");
    const syncModal = document.getElementById("sync-modal");
    const bulkCloudBtn = document.getElementById("bulk-cloud-btn");
    const bulkSyncBtn = document.getElementById("bulk-sync-btn");
    const syncFilterTabs = document.getElementById("sync-filter-tabs");
    const compareSheetOverlay = document.getElementById("compare-sheet-overlay");
    const compareSheetCloseBtn = document.getElementById("compare-sheet-close-btn");
    const compareSheetScrim = document.getElementById("compare-sheet-scrim");

    if (!syncBtn) return;

    syncBtn.addEventListener("click", openSyncModal);
    syncCloseBtn.addEventListener("click", closeSyncModal);
    bulkCloudBtn.addEventListener("click", handleBulkCloudToJSON);
    bulkSyncBtn.addEventListener("click", handleBulkSyncToCloud);
    
    compareSheetCloseBtn.addEventListener("click", closeCompareSheet);
    compareSheetScrim.addEventListener("click", closeCompareSheet);

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
    DOM.scrim.classList.add("drawer__scrim--active");
    
    // Iniciar carga de datos
    loadAllSyncSources();
  }

  function closeSyncModal() {
    const syncModal = document.getElementById("sync-modal");
    syncModal.classList.remove("sync-modal--active");
    DOM.scrim.classList.remove("drawer__scrim--active");
    
    // Recargar vista principal para reflejar cambios
    calculateMetrics();
    populateBrandFilter();
    applyFilters();
  }

  async function loadAllSyncSources() {
    const loader = document.getElementById("sync-loading");
    const wrapper = document.getElementById("sync-table-wrapper");
    
    loader.style.display = "flex";
    wrapper.style.display = "none";

    try {
      // 1. Local
      localSyncData = AppState.products;

      // 2. JSON Backup
      const rawJson = await SyncManager.loadFromLocalJSON();
      jsonSyncData = rawJson.map(normalizeJsonProduct);

      // 3. Nube Airtable
      const rawCloud = await SyncManager.fetchAllFromAirtable();
      cloudSyncData = rawCloud.map(rec => SyncManager.mapAirtableToLocal(rec));

      renderSyncTable();
    } catch (err) {
      console.error(err);
      showToast("Error al conectar con la Nube / JSON local.", "danger");
      
      // Fallback a renderizar lo que tengamos
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
      // Verificar si hay discrepancias de valores
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
    
    // Calcular conteos globales
    const total = master.length;
    const synced = master.filter(r => getSyncStatus(r).type === 'synced').length;
    const pending = master.filter(r => getSyncStatus(r).type === 'pending' || getSyncStatus(r).type === 'local-only' || getSyncStatus(r).type === 'no-json').length;
    const conflicts = master.filter(r => getSyncStatus(r).type === 'conflicts').length;
    const localOnly = master.filter(r => getSyncStatus(r).type === 'local-only').length;

    // Actualizar badges
    document.getElementById("sync-badge-all").textContent = total;
    document.getElementById("sync-badge-synced").textContent = synced;
    document.getElementById("sync-badge-pending").textContent = pending;
    document.getElementById("sync-badge-conflicts").textContent = conflicts;
    document.getElementById("sync-badge-local-only").textContent = localOnly;

    // Actualizar Banners y Tarjetas
    document.getElementById("sync-count-local").textContent = localSyncData.length;
    document.getElementById("sync-count-json").textContent = jsonSyncData.length;
    document.getElementById("sync-count-cloud").textContent = cloudSyncData.length;

    const summaryCards = document.getElementById("sync-summary");
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

    // Filtrado
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

    // Event delegation para abrir detalle de fila
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

    const overlay = document.getElementById("compare-sheet-overlay");
    const body = document.getElementById("compare-sheet-body");
    
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
    // 1. Subir a Airtable
    if (row.local) {
      actionsHTML += `
        <button class="sheet-action-btn action-airtable" id="action-sync-cloud">
          <i data-lucide="cloud-lightning"></i> ${row.airtable ? 'Re-subir a Nube' : 'Subir a Airtable'}
        </button>
      `;
    }

    // 2. Guardar a JSON Local
    if (row.local) {
      actionsHTML += `
        <button class="sheet-action-btn action-json" id="action-sync-json">
          <i data-lucide="file-check"></i> Respaldo JSON Local
        </button>
      `;
    }

    // 3. Sobrescribir Local con Nube
    if (row.airtable) {
      actionsHTML += `
        <button class="sheet-action-btn highlight-warning" id="action-overwrite-from-cloud">
          <i data-lucide="cloud-download"></i> Nube a Local
        </button>
      `;
    }

    // 4. Sobrescribir Local con JSON
    if (row.json) {
      actionsHTML += `
        <button class="sheet-action-btn highlight-warning" id="action-overwrite-from-json">
          <i data-lucide="download"></i> JSON a Local
        </button>
      `;
    }

    // 5. Eliminar producto de todos lados
    actionsHTML += `
      <button class="sheet-action-btn action-delete-product" id="action-delete-everywhere">
        <i data-lucide="trash-2"></i> Eliminar Registro
      </button>
    `;

    body.innerHTML = `
      <div class="sheet-detail-header">
        <div class="sheet-detail-name">${name}</div>
        <div class="sheet-detail-uuid">SKU / ID: ${sku}</div>
        <div style="margin-top: 10px;">
          <span class="sync-badge sync-badge--${status.type}">${status.label}</span>
        </div>
      </div>

      <div class="compare-sheet-table-wrapper">
        <table class="compare-detail-table">
          <thead>
            <tr>
              <th>Campo</th>
              <th>Local</th>
              <th>JSON</th>
              <th>Nube</th>
            </tr>
          </thead>
          <tbody>
            ${fieldsHTML}
          </tbody>
        </table>
      </div>

      <div class="sheet-actions-section">
        <h4 class="sheet-actions-title">Acciones de Resolución</h4>
        <div class="sheet-actions-grid">
          ${actionsHTML}
        </div>
      </div>
    `;

    overlay.classList.add("active");
    createLucideIcons();

    // Bindings de botones de acción
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
    const overlay = document.getElementById("compare-sheet-overlay");
    overlay.classList.remove("active");
  }

  // ==========================================================================
  // OPERACIONES DE RESOLUCION INDIVIDUALES Y MASIVAS
  // ==========================================================================
  async function handleSingleSyncToCloud(p) {
    if (!p) return;
    const btn = document.getElementById("action-sync-cloud");
    if (btn) btn.disabled = true;

    try {
      showToast("Sincronizando con Airtable...", "info");
      await SyncManager.syncProduct(p);
      localStorage.setItem("kv-catalog-products", JSON.stringify(AppState.products));
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
      
      // Combinar local actual con json cargado
      const newJsonList = [...jsonSyncData];
      const idx = newJsonList.findIndex(x => x.codigo === p.codigo);
      if (idx !== -1) {
        newJsonList[idx] = p;
      } else {
        newJsonList.push(p);
      }

      // Convertir al formato plano original de Airtable/JSON para preservar compatibilidad
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
          "Producto Campo Personalizadoo 2": item.specifications,
          "Producto Campo Personalizadoo 3": item.especial3,
          "Producto Campo Personalizadoo 4": item.especial4,
          "Producto Campo Personalizadoo 5": item.especial5,
          "Producto Campo Personalizadoo 6": item.especial6,
          "Cantidad": item.stock
        };
      });

      const saved = await SyncManager.saveToLocalJSON(mappedList);
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
      const idx = AppState.products.findIndex(x => x.codigo === sourceRecord.codigo);
      
      const normalized = normalizeJsonProduct(sourceRecord);
      if (idx !== -1) {
        AppState.products[idx] = normalized;
      } else {
        AppState.products.push(normalized);
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
        
        // 1. Eliminar local
        AppState.products = AppState.products.filter(x => x.codigo !== sku);
        saveProductsToStorage();

        // 2. Eliminar Airtable
        const airtableId = row.airtable?.airtable_id || row.local?.airtable_id;
        if (airtableId) {
          await SyncManager.deleteFromAirtable(airtableId);
        }

        // 3. Eliminar JSON
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
            "Producto Campo Personalizadoo 2": item.specifications,
            "Producto Campo Personalizadoo 3": item.especial3,
            "Producto Campo Personalizadoo 4": item.especial4,
            "Producto Campo Personalizadoo 5": item.especial5,
            "Producto Campo Personalizadoo 6": item.especial6,
            "Cantidad": item.stock
          };
        });

        await SyncManager.saveToLocalJSON(mappedList);

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

  // Masivo: Sincronizar Todo a la Nube (Airtable)
  async function handleBulkSyncToCloud() {
    const unsynced = localSyncData.filter(p => p.sync_status !== 'synced' || !p.airtable_id);
    if (unsynced.length === 0) {
      showToast("Todos los productos locales están sincronizados con la Nube.", "info");
      return;
    }

    const btn = document.getElementById("bulk-sync-btn");
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader" class="spinning"></i> Sincronizando...`;
    createLucideIcons();

    let successCount = 0;
    try {
      showToast(`Sincronizando ${unsynced.length} productos con Airtable...`, "info");
      
      const promises = unsynced.map(async p => {
        try {
          await SyncManager.syncProduct(p);
          successCount++;
        } catch (err) {
          console.error(`Failed to sync product ${p.codigo}:`, err);
        }
      });

      await Promise.all(promises);
      
      // Guardar localStorage final
      localStorage.setItem("kv-catalog-products", JSON.stringify(AppState.products));
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

  // Masivo: Importar Nube a JSON Local (Re-escribir Respaldo JSON desde Airtable)
  async function handleBulkCloudToJSON() {
    const btn = document.getElementById("bulk-cloud-btn");
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader" class="spinning"></i> Importando...`;
    createLucideIcons();

    try {
      showToast("Descargando catálogo completo de Airtable...", "info");
      const records = await SyncManager.fetchAllFromAirtable();
      
      if (!records || records.length === 0) {
        showToast("No se encontraron registros en Airtable para importar.", "warning");
        return;
      }

      // Convertir a formato plano de respaldo JSON
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
          "Cantidad": Number(f["Cantidad"]) || 0
        };
      });

      const saved = await SyncManager.saveToLocalJSON(flatList);
      
      // Actualizar también LocalStorage para emparejar
      AppState.products = flatList.map(normalizeJsonProduct);
      localStorage.setItem("kv-catalog-products", JSON.stringify(AppState.products));

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

})();
