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

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheElements();
    setupTheme();
    setupToastContainer();
    loadProductsFromStorage();
    setupEventListeners();
    setupScannerLogic();
    calculateMetrics();
    applyFilters();
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
  function loadProductsFromStorage() {
    const saved = localStorage.getItem("kv-catalog-products");
    if (saved) {
      try {
        AppState.products = JSON.parse(saved);
      } catch (err) {
        console.error("Failed to parse local catalog database:", err);
        AppState.products = [];
      }
    } else {
      AppState.products = [];
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

      if (isList) {
        html += `
          <div class="product-card" onclick="window.viewProduct('${p.id}')">
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
          <div class="product-card" onclick="window.viewProduct('${p.id}')">
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

  window.viewProduct = (id) => {
    const p = AppState.products.find(x => x.id === id);
    if (p) openProductDrawer(p);
  };

  // ==========================================================================
  // EVENT LISTENERS CONTROL
  // ==========================================================================
  function setupEventListeners() {
    // Open Scanner
    DOM.scanBtn.addEventListener("click", openScanner);

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
        stock: 1
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

  DOM.closeDrawerBtn.addEventListener("click", closeProductDrawer);

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
      <button class="drawer__primary-btn" onclick="window.closeProductDrawer()">
        Cerrar Detalle
      </button>
      <button class="drawer__primary-btn drawer__primary-btn--danger" onclick="window.deleteProduct('${p.id}')">
        <i data-lucide="trash-2"></i> Eliminar de Inventario
      </button>
    `;
    createLucideIcons();
  }

  window.closeProductDrawer = () => {
    closeProductDrawer();
  };

  window.deleteProduct = (id) => {
    if (confirm("¿Estás seguro de que deseas eliminar permanentemente este producto del inventario? Esta acción no se puede deshacer.")) {
      AppState.products = AppState.products.filter(p => p.id !== id);
      saveProductsToStorage();
      showToast("Producto eliminado correctamente", "danger");
      closeProductDrawer();
    }
  };

  function renderDrawerViewForm(p) {
    DOM.drawerViewForm.innerHTML = `
      <form id="edit-product-form" onsubmit="event.preventDefault(); window.saveProductForm('${p.id}');">
        
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
    createLucideIcons();
  }

  window.saveProductForm = (id) => {
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

    saveProductsToStorage();
    showToast("¡Producto guardado exitosamente!", "success");

    // Switch back to detail product view
    openProductDrawer(p);
  };

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

})();
