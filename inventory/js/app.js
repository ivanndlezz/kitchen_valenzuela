/**
 * app.js
 * Main application orchestrator: lifecycle manager, global event binder, and theme engine.
 */

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheElements();
  setupTheme();
  setupToastContainer();
  trackReload();
  await loadProductsFromStorage();
  setupEventListeners();
  setupScannerLogic();
  calculateMetrics();
  applyFilters();
  setupSyncUI();

  // Custom screens/subsystems initialization
  loadClientsFromStorage();
  loadQuotationsFromStorage();
  setupQuotesUI();
  setupClientsUI();
  setupSingleProductUI();

  // Trigger background client sync on load
  if (typeof syncAllClientsFromCloud === "function") {
    syncAllClientsFromCloud().catch(err => {
      console.error("Background client sync failed:", err);
    });
  }

  // Trigger initial hash route check now that render methods are registered
  if (window.handleHashChange) {
    window.handleHashChange();
  }
}

function trackReload() {
  const now = new Date();
  const timestamp = now.toISOString();
  const date = now.toISOString().slice(0, 10);
  const time = now.toISOString().slice(11, 19); // HH:MM:SS
  
  const stored = JSON.parse(localStorage.getItem("kv-reload-tracker") || "{}");
  
  // Initialize structure
  if (!stored.timestamps) stored.timestamps = [];
  if (!stored.bursts) stored.bursts = [];
  
  // Add current timestamp
  stored.timestamps.push(timestamp);
  stored.date = date;
  stored.time = time;
  stored.count = stored.timestamps.length;
  
  // Detect burst: more than 3 reloads within same second or within 1 second intervals
  const recent = stored.timestamps.slice(-5); // Last 5 reloads
  const burstDetected = detectBurst(recent);
  if (burstDetected) {
    const burstEntry = {
      time: timestamp,
      count: recent.length,
      reason: burstDetected,
      timestamps: recent
    };
    stored.bursts.push(burstEntry);
    
    // Write to persistent burst log
    const burstLog = JSON.parse(localStorage.getItem("kv-burst-log") || "[]");
    burstLog.push(burstEntry);
    localStorage.setItem("kv-burst-log", JSON.stringify(burstLog));
    
    console.warn(`BURST DETECTED: ${recent.length} reloads in rapid succession at ${time}`);
  }
  
  stored.lastTimestamp = timestamp;
  localStorage.setItem("kv-reload-tracker", JSON.stringify(stored));
  
  console.log(`KV Reload #${stored.count} at ${date} ${time}`);
}

function detectBurst(timestamps) {
  if (timestamps.length < 3) return null;
  
  const times = timestamps.map(t => new Date(t).getTime());
  const now = times[times.length - 1];
  
  // Check if all within same second
  const sameSecond = times.every(t => Math.floor(t / 1000) === Math.floor(now / 1000));
  if (sameSecond) return "same_second";
  
  // Check if consecutive within 1 second
  let rapidCount = 0;
  for (let i = 1; i < times.length; i++) {
    if ((now - times[i]) / 1000 <= 1) rapidCount++;
  }
  if (rapidCount >= 2) return "rapid_sequence";
  
  return null;
}

function cacheElements() {
  window.DOM.themeBtn = document.getElementById("theme-toggle-btn");
  window.DOM.scanBtn = document.getElementById("scan-btn");
  window.DOM.productsContainer = document.getElementById("products-container");
  window.DOM.searchInput = document.getElementById("search-input");
  window.DOM.categoryTabsContainer = document.getElementById("category-tabs");
  window.DOM.brandSelect = document.getElementById("brand-filter");
  window.DOM.stockFilterSelect = document.getElementById("stock-filter");
  window.DOM.sortSelect = document.getElementById("sort-filter");
  window.DOM.viewGridBtn = document.getElementById("view-grid");
  window.DOM.viewListBtn = document.getElementById("view-list");

  window.DOM.metricTotalProducts = document.getElementById("metric-total-products");
  window.DOM.metricTotalStock = document.getElementById("metric-total-stock");
  window.DOM.metricLowStock = document.getElementById("metric-low-stock");
  window.DOM.metricTotalBrands = document.getElementById("metric-total-brands");

  window.DOM.scrim = document.getElementById("app-scrim");
  window.DOM.detailDrawer = document.getElementById("detail-drawer");
  window.DOM.closeDrawerBtn = document.getElementById("close-drawer-btn");
  window.DOM.drawerBody = document.getElementById("drawer-body");
  window.DOM.drawerActions = document.getElementById("drawer-actions");
  window.DOM.drawerTabsContainer = window.DOM.detailDrawer.querySelector(".drawer__tabs");
  window.DOM.drawerTabProduct = window.DOM.detailDrawer.querySelector('[data-drawer-tab="product"]');
  window.DOM.drawerTabForm = window.DOM.detailDrawer.querySelector('[data-drawer-tab="form"]');
  window.DOM.drawerViewProduct = document.getElementById("drawer-view-product");
  window.DOM.drawerViewForm = document.getElementById("drawer-view-form");

  // Scanner
  window.DOM.scannerModal = document.getElementById("scanner-modal");
  window.DOM.scannerCloseBtn = document.getElementById("scanner-close-btn");
  window.DOM.scannerTabsContainer = window.DOM.scannerModal.querySelector(".scanner__tabs");
  window.DOM.cameraInput = document.getElementById("camera-input");
  window.DOM.triggerPhotoBtn = document.getElementById("trigger-photo-btn");
  window.DOM.startVideoBtn = document.getElementById("start-video-btn");
  window.DOM.stopVideoBtn = document.getElementById("stop-video-btn");
}

// ==========================================================================
// THEME ENGINE
// ==========================================================================
function setupTheme() {
  const savedTheme = localStorage.getItem("kv-catalog-theme") || "dark";
  setTheme(savedTheme);

  const toggleThemeEvent = () => {
    const currentTheme = document.documentElement.classList.contains("theme-dark") ? "dark" : "light";
    setTheme(currentTheme === "dark" ? "light" : "dark");
  };

  window.DOM.themeBtn?.addEventListener("click", toggleThemeEvent);
  document.getElementById("theme-toggle")?.addEventListener("click", toggleThemeEvent);
}

function setTheme(theme) {
  window.AppState.theme = theme;
  const isDark = theme === "dark";

  if (isDark) {
    document.documentElement.classList.add("theme-dark");
    document.body.classList.add("theme-dark");
    if (window.DOM.themeBtn) window.DOM.themeBtn.innerHTML = '<i data-lucide="sun"></i>';
  } else {
    document.documentElement.classList.remove("theme-dark");
    document.body.classList.remove("theme-dark");
    if (window.DOM.themeBtn) window.DOM.themeBtn.innerHTML = '<i data-lucide="moon"></i>';
  }

  // Keep the bottom island toggle switch in sync
  const islandToggle = document.getElementById("theme-toggle");
  if (islandToggle) {
    const iconUse = islandToggle.querySelector("#theme-icon-use");
    if (iconUse) {
      iconUse.setAttribute("href", isDark ? "#icon-moon" : "#icon-sun");
    }
    islandToggle.setAttribute("aria-checked", isDark.toString());
    islandToggle.setAttribute("aria-label", isDark ? "Activate light mode" : "Activate dark mode");
    const label = islandToggle.querySelector("#theme-label");
    if (label) {
      label.textContent = isDark ? "Dark Mode" : "Light Mode";
    }
  }

  localStorage.setItem("kv-catalog-theme", theme);
  createLucideIcons();
}

// ==========================================================================
// EVENT LISTENERS CONTROL
// ==========================================================================
function setupEventListeners() {
  // Open Scanner
  window.DOM.scanBtn.addEventListener("click", openScanner);

  // Product card click delegation (removes hardcoded inline onclick)
  window.DOM.productsContainer.addEventListener("click", (e) => {
    const card = e.target.closest("[data-open-id]");
    if (card) {
      const encodedId = card.getAttribute("data-open-id");
      const decodedId = typeof decodeId === "function" ? decodeId(encodedId) : encodedId;
      const p = window.AppState.products.find(x => x.id === decodedId);
      if (p && typeof openProductDrawer === "function") openProductDrawer(p);
    }
  });

  // Search Input Reactivity
  const searchClearBtn = document.getElementById("search-clear-btn");
  if (searchClearBtn) {
    searchClearBtn.addEventListener("click", () => {
      window.DOM.searchInput.value = "";
      window.AppState.filters.text = "";
      applyFilters();
      searchClearBtn.style.display = "none";
      window.DOM.searchInput.focus();
    });
  }

  window.DOM.searchInput.addEventListener("input", (e) => {
    window.AppState.filters.text = e.target.value;
    applyFilters();
    if (searchClearBtn) {
      searchClearBtn.style.display = e.target.value ? "flex" : "none";
    }
  });

  // Category Selector Tabs
  window.DOM.categoryTabsContainer.querySelectorAll(".filters__tab").forEach(tab => {
    tab.addEventListener("click", () => {
      window.DOM.categoryTabsContainer.querySelectorAll(".filters__tab").forEach(t => {
        t.classList.remove("filters__tab--active");
      });
      tab.classList.add("filters__tab--active");
      window.AppState.filters.category = tab.dataset.category;
      applyFilters();
    });
  });

  // Select Dropdowns
  window.DOM.brandSelect.addEventListener("change", (e) => {
    window.AppState.filters.brand = e.target.value;
    applyFilters();
  });

  window.DOM.stockFilterSelect.addEventListener("change", (e) => {
    window.AppState.filters.stockFilter = e.target.value;
    applyFilters();
  });

  window.DOM.sortSelect.addEventListener("change", (e) => {
    window.AppState.filters.sort = e.target.value;
    applyFilters();
  });

  // Layout Switchers
  window.DOM.viewGridBtn.addEventListener("click", () => {
    window.DOM.viewGridBtn.classList.add("filters__view-btn--active");
    window.DOM.viewListBtn.classList.remove("filters__view-btn--active");
    window.DOM.productsContainer.classList.remove("catalog__grid--list-view");
    window.AppState.filters.view = "grid";
    renderProducts();
  });

  window.DOM.viewListBtn.addEventListener("click", () => {
    window.DOM.viewListBtn.classList.add("filters__view-btn--active");
    window.DOM.viewGridBtn.classList.remove("filters__view-btn--active");
    window.DOM.productsContainer.classList.add("catalog__grid--list-view");
    window.AppState.filters.view = "list";
    renderProducts();
  });

  // Close Drawer Click (top right button)
  if (window.DOM.closeDrawerBtn) {
    window.DOM.closeDrawerBtn.addEventListener("click", closeProductDrawer);
  }

  // Scrim Close Click
  window.DOM.scrim.addEventListener("click", () => {
    if (typeof closeProductDrawer === "function") closeProductDrawer();
    if (typeof closeScanner === "function") closeScanner();
    if (typeof closeClientDrawer === "function") closeClientDrawer();
    if (typeof closeProductFormSheet === "function") closeProductFormSheet();
  });
}

// QUOTATION ROUTING - Hash-based URL persistence (v3 pattern)
// (Routing logic is fully managed in quotation-screen.js)

function updateQuotationHash(quoteId, step) {
  window.location.hash = `#/quotation/${quoteId}/step${step}`;
}

// Expose navigate helper
window.navigateToQuotation = updateQuotationHash;
