/**
 * quotation-screen.js
 * 3-step Stepper quotation engine, PDF print layout exporter, WhatsApp text composer, list card CRUD, and inline client creations.
 */

function getDefaultValidityDate() {
  const date = new Date();
  date.setDate(date.getDate() + 15);
  return date.toISOString().slice(0, 10);
}

function getDefaultQuoteConditions() {
  return "Vigencia de cotización: 15 días.\nTiempo de entrega sujeto a disponibilidad.";
}

function createNewQuotation() {
  const quoteId = generateQuoteFolio();
  window.AppState.currentQuoteId = null;
  window.AppState.quoteItems = [];
  window.AppState.quoteStep = 1;
  window.AppState.quoteClientId = "";
  window.AppState.quoteConditions = getDefaultQuoteConditions();
  window.AppState.quoteDiscountType = "percent";
  window.AppState.quoteDiscountValue = 0;
  
  const sellerId = window.AppState.activeUserId || "";
  const validityDate = getDefaultValidityDate();
  
  window.AppState.quoteSellerId = sellerId;
  window.AppState.quoteValidityDate = validityDate;
  
  const newQuote = {
    id: quoteId,
    status: 'draft',
    currentStep: 1,
    clientId: "",
    sellerId: sellerId,
    validityDate: validityDate,
    conditions: window.AppState.quoteConditions,
    discountType: window.AppState.quoteDiscountType,
    discountValue: window.AppState.quoteDiscountValue,
    items: [],
    subtotal: 0,
    tax: 0,
    total: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sentAt: null,
    reservedAt: null
  };
  window.AppState.quotations.push(newQuote);
  saveQuotationsToStorage();
  
  window.location.hash = `#/quotation/${quoteId}/step1`;
}
window.createNewQuotation = createNewQuotation;

function updateClientPanelStatus(status) {
  const clientPanel = document.querySelector(".stepper-client-panel");
  if (clientPanel) {
    clientPanel.setAttribute("data-status", status);
  }
}

function escapeQuoteHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeQuoteSearchText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isQuoteStepperReadonly() {
  const stepperView = document.getElementById("quote-stepper-view");
  return stepperView && stepperView.getAttribute("data-readonly") === "true";
}

let quoteProductSearchContext = { mode: "add", replaceIndex: null };
let quoteInlineReplaceIndex = null;

function getQuoteLineSearchQuery(item) {
  const product = item?.product || {};
  return [product.nombre || item?.description, product.codigo || item?.productId, product.marca]
    .map(value => String(value || "").trim())
    .filter(Boolean)
    .join(" ");
}

function setQuoteProductSearchContext(context = {}) {
  quoteProductSearchContext = {
    mode: context.mode === "replace" ? "replace" : "add",
    replaceIndex: Number.isInteger(context.replaceIndex) ? context.replaceIndex : null
  };
}

function resetQuoteProductSearchContext() {
  setQuoteProductSearchContext();
}

function setQuoteClientSelectOpen(isOpen) {
  const quoteClientSelect = document.getElementById("quoteClientSelect");
  const quoteClientTrigger = document.getElementById("quoteClientTrigger");
  if (!quoteClientSelect) return;

  quoteClientSelect.classList.toggle("open", isOpen);
  quoteClientSelect.classList.toggle("is-open", isOpen);
  quoteClientSelect.dataset.disabled = String(isQuoteStepperReadonly());
  if (isOpen) {
    quoteClientSelect.dataset.previousValue = window.AppState?.quoteClientId || "";
  } else {
    delete quoteClientSelect.dataset.previousValue;
  }
  quoteClientTrigger?.setAttribute("aria-expanded", String(isOpen));
}

function filterQuoteClientOptions(query = "") {
  const optionsContainer = document.getElementById("quoteClientOptions");
  if (!optionsContainer) return;

  const normalizedQuery = normalizeQuoteSearchText(query.trim());
  let visibleCount = 0;

  optionsContainer.querySelectorAll(".custom-select-option").forEach(opt => {
    const searchText = normalizeQuoteSearchText(opt.dataset.search || opt.textContent || "");
    const shouldShow = !normalizedQuery || searchText.includes(normalizedQuery);
    opt.hidden = !shouldShow;
    opt.style.display = shouldShow ? "flex" : "none";
    if (shouldShow) visibleCount += 1;
  });

  let emptyState = optionsContainer.querySelector("[data-quote-client-empty]");
  if (!emptyState) {
    emptyState = document.createElement("div");
    emptyState.className = "custom-select-empty";
    emptyState.dataset.quoteClientEmpty = "true";
    emptyState.textContent = "No se encontraron clientes.";
    optionsContainer.appendChild(emptyState);
  }
  emptyState.hidden = visibleCount > 0;
}

function openQuoteClientSelect() {
  const quoteClientInput = document.getElementById("quoteClientInput");
  if (isQuoteStepperReadonly()) return;

  setQuoteClientSelectOpen(true);
  if (quoteClientInput) {
    quoteClientInput.value = "";
    quoteClientInput.placeholder = "Buscar por nombre, empresa o RFC...";
    quoteClientInput.focus();
  }
  filterQuoteClientOptions("");
}

function closeQuoteClientSelect() {
  const quoteClientInput = document.getElementById("quoteClientInput");
  setQuoteClientSelectOpen(false);
  if (quoteClientInput) {
    quoteClientInput.value = getClientLabel(window.AppState.quoteClientId);
    quoteClientInput.placeholder = "Buscar cliente...";
  }
  filterQuoteClientOptions("");
}

function isQuoteSellerSelectReadonly() {
  return isQuoteStepperReadonly();
}

function setQuoteSellerSelectOpen(isOpen) {
  const selectWrapper = document.getElementById("quoteSellerSelect");
  const trigger = document.getElementById("quoteSellerTrigger");
  if (!selectWrapper) return;

  selectWrapper.classList.toggle("open", isOpen);
  selectWrapper.classList.toggle("is-open", isOpen);
  selectWrapper.dataset.disabled = String(isQuoteSellerSelectReadonly());
  if (isOpen) {
    selectWrapper.dataset.previousValue = window.AppState?.quoteSellerId || "";
  } else {
    delete selectWrapper.dataset.previousValue;
  }
  trigger?.setAttribute("aria-expanded", String(isOpen));
}

function filterQuoteSellerOptions(query = "") {
  const optionsContainer = document.getElementById("quoteSellerOptions");
  if (!optionsContainer) return;

  const normalizedQuery = normalizeQuoteSearchText(query.trim());
  let visibleCount = 0;

  optionsContainer.querySelectorAll(".custom-select-option").forEach(opt => {
    const searchText = normalizeQuoteSearchText(opt.dataset.search || opt.textContent || "");
    const shouldShow = !normalizedQuery || searchText.includes(normalizedQuery);
    opt.hidden = !shouldShow;
    opt.style.display = shouldShow ? "flex" : "none";
    if (shouldShow) visibleCount += 1;
  });

  let emptyState = optionsContainer.querySelector("[data-quote-seller-empty]");
  if (!emptyState) {
    emptyState = document.createElement("div");
    emptyState.className = "custom-select-empty";
    emptyState.dataset.quoteSellerEmpty = "true";
    emptyState.textContent = "No se encontraron vendedores.";
    optionsContainer.appendChild(emptyState);
  }
  emptyState.hidden = visibleCount > 0;
}

function openQuoteSellerSelect() {
  const quoteSellerInput = document.getElementById("quoteSellerInput");
  if (isQuoteSellerSelectReadonly()) return;

  populateQuoteSellers();
  setQuoteSellerSelectOpen(true);
  if (quoteSellerInput) {
    quoteSellerInput.value = "";
    quoteSellerInput.placeholder = "Buscar por nombre o correo...";
    quoteSellerInput.focus();
  }
  syncQuoteSellerAvatar("");
  filterQuoteSellerOptions("");
}

function closeQuoteSellerSelect() {
  const quoteSellerInput = document.getElementById("quoteSellerInput");
  setQuoteSellerSelectOpen(false);
  if (quoteSellerInput) {
    quoteSellerInput.value = getSellerLabel(window.AppState.quoteSellerId);
    quoteSellerInput.placeholder = "Buscar vendedor...";
  }
  syncQuoteSellerAvatar(window.AppState.quoteSellerId);
  filterQuoteSellerOptions("");
}

function getQuoteSellerById(sellerId) {
  if (!sellerId) return null;
  const users = typeof window.UserScope?.getUsers === "function" ? window.UserScope.getUsers() : [];
  return users.find(u => u.id === sellerId) || null;
}

function getQuoteSellerInitials(user) {
  const source = user?.name || user?.email || "";
  const parts = source
    .replace(/@.*/, "")
    .split(/\s+|[._-]+/)
    .map(part => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return "";
  return parts.slice(0, 2).map(part => part[0].toUpperCase()).join("");
}

function getQuoteSellerAvatarColor(user) {
  const source = user?.id || user?.email || user?.name || "seller";
  let hash = 0;
  for (let i = 0; i < source.length; i += 1) {
    hash = source.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 72% 38%)`;
}

function syncQuoteSellerAvatar(sellerId) {
  const avatar = document.getElementById("quoteSellerAvatar");
  if (!avatar) return;

  const initialsEl = avatar.querySelector(".quote-seller-avatar__initials");
  const seller = getQuoteSellerById(sellerId);
  const initials = getQuoteSellerInitials(seller);

  avatar.classList.toggle("has-initials", Boolean(initials));
  avatar.style.backgroundColor = initials ? getQuoteSellerAvatarColor(seller) : "var(--color-accent)";
  if (initialsEl) initialsEl.textContent = initials;
  createLucideIcons();
}

function getSellerLabel(sellerId) {
  if (!sellerId) return "Seleccionar vendedor...";
  const seller = getQuoteSellerById(sellerId);
  return seller ? `${seller.name} (${seller.roles?.join(", ") || 'Vendedor'})` : "Seleccionar vendedor...";
}

function setupQuotesUI() {
  document.getElementById("btn-new-quote")?.addEventListener("click", () => {
    window.location.hash = "#/quotation/new";
  });

  const btnSyncQuotes = document.getElementById("btn-sync-quotes");
  if (btnSyncQuotes) {
    btnSyncQuotes.addEventListener("click", async () => {
      btnSyncQuotes.disabled = true;
      btnSyncQuotes.innerHTML = `<i data-lucide="loader" class="spinning"></i> Sincronizando...`;
      createLucideIcons();
      try {
        await syncAllQuotesFromCloud();
        showToast("Cotizaciones sincronizadas con Airtable exitosamente.", "success");
      } catch (err) {
        showToast("Error al sincronizar cotizaciones: " + err.message, "danger");
      } finally {
        btnSyncQuotes.disabled = false;
        btnSyncQuotes.innerHTML = `<i data-lucide="refresh-cw"></i> Sincronizar Nube`;
        createLucideIcons();
      }
    });
  }

  const searchInput = document.getElementById("quote-product-search");
  const clearBtn = document.getElementById("quote-product-clear-btn");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      renderQuoteProducts();
      if (clearBtn) {
        clearBtn.style.display = e.target.value ? "flex" : "none";
      }
    });
  }

  if (clearBtn && searchInput) {
    clearBtn.addEventListener("click", () => {
      searchInput.value = "";
      renderQuoteProducts();
      clearBtn.style.display = "none";
      searchInput.focus();
    });
  }

  document.getElementById("btn-add-row")?.addEventListener("click", showQuoteAddCaptureRow);

  document.getElementById("q-discount-type")?.addEventListener("change", (event) => {
    window.AppState.quoteDiscountType = event.target.value;
    recalculateQuote();
    saveDraftQuotation();
  });

  document.getElementById("q-discount-val")?.addEventListener("input", (event) => {
    window.AppState.quoteDiscountValue = parseFloat(event.target.value) || 0;
    recalculateQuote();
    saveDraftQuotation();
  });

  document.getElementById("quote-conditions-text")?.addEventListener("input", (event) => {
    window.AppState.quoteConditions = event.target.value;
    saveDraftQuotation();
  });

  if (!document.body.dataset.quotePopoverCloseBound) {
    document.addEventListener("click", (event) => {
      if (event.target.closest(".quote-row-popover") || event.target.closest(".quote-row-settings")) return;
      closeQuoteLinePopovers();
    });
    document.body.dataset.quotePopoverCloseBound = "true";
  }

  const quoteClientTrigger = document.getElementById("quoteClientTrigger");
  const quoteClientSelect = document.getElementById("quoteClientSelect");
  const quoteClientInput = document.getElementById("quoteClientInput");
  const quoteClientOptions = document.getElementById("quoteClientOptions");

  quoteClientTrigger?.addEventListener("click", (e) => {
    e.stopPropagation();
    openQuoteClientSelect();
  });

  quoteClientInput?.addEventListener("focus", () => {
    openQuoteClientSelect();
  });

  quoteClientInput?.addEventListener("input", (e) => {
    if (isQuoteStepperReadonly()) return;
    setQuoteClientSelectOpen(true);
    filterQuoteClientOptions(e.target.value);
  });

  quoteClientInput?.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeQuoteClientSelect();
      quoteClientInput.blur();
      return;
    }

    if (e.key === "Enter" && quoteClientSelect?.classList.contains("open")) {
      const firstVisibleOption = Array.from(quoteClientOptions?.querySelectorAll(".custom-select-option") || [])
        .find(opt => !opt.hidden);
      if (firstVisibleOption) {
        e.preventDefault();
        firstVisibleOption.click();
      }
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#quoteClientSelect") && quoteClientSelect?.classList.contains("open")) {
      closeQuoteClientSelect();
    }
  });

  const quoteSellerTrigger = document.getElementById("quoteSellerTrigger");
  const quoteSellerSelect = document.getElementById("quoteSellerSelect");
  const quoteSellerInput = document.getElementById("quoteSellerInput");
  const quoteSellerOptions = document.getElementById("quoteSellerOptions");

  quoteSellerTrigger?.addEventListener("click", (e) => {
    e.stopPropagation();
    openQuoteSellerSelect();
  });

  quoteSellerInput?.addEventListener("focus", () => {
    openQuoteSellerSelect();
  });

  quoteSellerInput?.addEventListener("input", (e) => {
    if (isQuoteSellerSelectReadonly()) return;
    setQuoteSellerSelectOpen(true);
    filterQuoteSellerOptions(e.target.value);
  });

  quoteSellerInput?.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeQuoteSellerSelect();
      quoteSellerInput.blur();
      return;
    }

    if (e.key === "Enter" && quoteSellerSelect?.classList.contains("open")) {
      const firstVisibleOption = Array.from(quoteSellerOptions?.querySelectorAll(".custom-select-option") || [])
        .find(opt => !opt.hidden);
      if (firstVisibleOption) {
        e.preventDefault();
        firstVisibleOption.click();
      }
    }
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#quoteSellerSelect") && quoteSellerSelect?.classList.contains("open")) {
      closeQuoteSellerSelect();
    }
  });

  if (!document.body.dataset.quoteSellerScopeBound) {
    window.addEventListener("user:scope-changed", () => {
      populateQuoteSellers();
      syncQuoteSellerSelect(window.AppState.quoteSellerId);
    });
    window.addEventListener("taxonomy:updated", (event) => {
      if (!["role", "user", "seller"].includes(event.detail?.type)) return;
      populateQuoteSellers();
      syncQuoteSellerSelect(window.AppState.quoteSellerId);
    });
    document.body.dataset.quoteSellerScopeBound = "true";
  }

  const gliderTabs = document.querySelectorAll(".client-glider-tab");
  const viewExistente = document.getElementById("client-view-existente");
  const viewNuevo = document.getElementById("client-view-nuevo");

  gliderTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      gliderTabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      
      const isExistente = tab.getAttribute("data-tab") === "existente";
      if (isExistente) {
        if (viewExistente) viewExistente.style.display = "block";
        if (viewNuevo) viewNuevo.style.display = "none";
        updateClientPanelStatus(window.AppState.quoteClientId ? "client-selected" : "no-client");
      } else {
        if (viewExistente) viewExistente.style.display = "none";
        if (viewNuevo) viewNuevo.style.display = "block";
        ["sq-client-nombre", "sq-client-empresa", "sq-client-rfc", "sq-client-telefono", "sq-client-correo", "sq-client-direccion"].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = "";
        });
        updateClientPanelStatus("new-client");
      }
      createLucideIcons();
    });
  });

  document.getElementById("sq-btn-save-new-client")?.addEventListener("click", () => {
    const nombre = document.getElementById("sq-client-nombre")?.value.trim();
    const empresa = document.getElementById("sq-client-empresa")?.value.trim();
    if (!nombre || !empresa) {
      showToast("Nombre y Empresa son requeridos.", "warning");
      return;
    }
    const newId = "C" + Date.now();
    const newClient = {
      id: newId,
      nombre,
      empresa,
      rfc: document.getElementById("sq-client-rfc")?.value.trim() || "",
      telefono: document.getElementById("sq-client-telefono")?.value.trim() || "",
      correo: document.getElementById("sq-client-correo")?.value.trim() || "",
      direccion: document.getElementById("sq-client-direccion")?.value.trim() || "",
      airtable_id: null,
      sync_status: "pending"
    };
    window.AppState.clients.push(newClient);
    saveClientsToStorage();

    if (window.SyncManager && typeof window.SyncManager.syncClient === "function") {
      window.SyncManager.syncClient(newClient).then(() => {
        saveClientsToStorage();
        if (typeof renderClientsList === "function") renderClientsList();
      }).catch(err => {
        console.error("Failed to sync inline client:", err);
      });
    }
    window.AppState.quoteClientId = newId;
    populateQuoteClients();
    syncQuoteClientSelect(newId);
    renderClientPreview();
    
    const tabExistente = document.querySelector('.client-glider-tab[data-tab="existente"]');
    if (tabExistente) tabExistente.click();
    
    ["sq-client-nombre", "sq-client-empresa", "sq-client-rfc", "sq-client-telefono", "sq-client-correo", "sq-client-direccion"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    showToast(`Cliente "${nombre}" registrado y seleccionado.`, "success");
  });

  document.getElementById("quote-list-filters")?.addEventListener("click", (e) => {
    const tab = e.target.closest("[data-ql-filter]");
    if (!tab) return;
    document.querySelectorAll(".ql-filter-tab").forEach(t => t.classList.remove("ql-filter-tab--active"));
    tab.classList.add("ql-filter-tab--active");
    window.AppState.qlFilter = tab.getAttribute("data-ql-filter");
    renderQuotationsList();
  });

  document.getElementById("quote-list-search")?.addEventListener("input", renderQuotationsList);

  document.querySelectorAll("[data-step-dot]").forEach(dot => {
    dot.addEventListener("click", () => {
      const step = parseInt(dot.getAttribute("data-step-dot"));
      window.goToStep(step);
    });
  });

  document.getElementById("btn-save-quote-stepper")?.addEventListener("click", () => {
    showListView();
  });
}

function showListView() {
  console.log("[QuotationDebug] showListView called");
  if (window.location.hash.startsWith('#/quotation/')) {
    window.location.hash = '#/quotation';
  }
  const quotesSection = document.getElementById("section-quotes");
  if (quotesSection) {
    quotesSection.setAttribute("data-view", "list");
  }
  removeStepFooter();
  renderQuotationsList();
  checkActiveDraft();
}

function showStepperView() {
  console.log("[QuotationDebug] showStepperView called");
  const quotesSection = document.getElementById("section-quotes");
  if (quotesSection) {
    quotesSection.setAttribute("data-view", "stepper");
  }
}

window.renderQuotesView = function() {
  console.log("[QuotationDebug] renderQuotesView called, hash:", window.location.hash);
  loadQuotationsFromStorage();
  const hash = window.location.hash || '';
  
  if (hash === '#/quotation/new') {
    console.log("[QuotationDebug] renderQuotesView: creating new quotation");
    window.createNewQuotation();
    return;
  }
  
  const hasQuotationHash = hash.match(/^#\/quotation\/([^/]+)\/step(\d)$/);
  if (!hasQuotationHash) {
    console.log("[QuotationDebug] renderQuotesView: no quotation detail hash, calling showListView");
    showListView();
  } else {
    const quoteId = hasQuotationHash[1];
    const step = parseInt(hasQuotationHash[2], 10);
    console.log(`[QuotationDebug] renderQuotesView: matching quotation hash found. ID: ${quoteId}, step: ${step}`);
    window.initStepperFromHash(quoteId, step);
  }
  createLucideIcons();
};

function initStepContent(step) {
  console.log(`[QuotationDebug] initStepContent called with step: ${step}`);
  for (let i = 1; i <= 3; i++) {
    const panel = document.getElementById(`stepper-step-${i}`);
    if (panel) {
      panel.classList.toggle("stepper-step-content--active", i === step);
    }
  }

  document.querySelectorAll("[data-step-dot]").forEach(dot => {
    const s = parseInt(dot.getAttribute("data-step-dot"));
    dot.classList.remove("active", "completed");
    if (s === step) dot.classList.add("active");
    else if (s < step) dot.classList.add("completed");
  });

  document.querySelectorAll("[data-step-line]").forEach(line => {
    const s = parseInt(line.getAttribute("data-step-line"));
    line.classList.toggle("filled", s < step);
  });

  document.querySelectorAll("[data-step-label]").forEach(label => {
    const s = parseInt(label.getAttribute("data-step-label"));
    label.classList.remove("active", "completed");
    if (s === step) label.classList.add("active");
    else if (s < step) label.classList.add("completed");
  });

  if (step === 2) {
    populateQuoteClients();
    syncQuoteClientSelect(window.AppState.quoteClientId);
    renderClientPreview();
    updateClientPanelStatus(window.AppState.quoteClientId ? "client-selected" : "no-client");
    populateQuoteSellers();
    syncQuoteSellerSelect(window.AppState.quoteSellerId);
    initQuoteValidityDate();
  } else if (step === 3) {
    renderOverview();
  }

  console.log(`[QuotationDebug] initStepContent: calling renderStepFooter for step ${step}`);
  renderStepFooter(step);
}

window.initStepperFromHash = function(quoteId, step) {
  console.log(`[QuotationDebug] initStepperFromHash called with quoteId: ${quoteId}, step: ${step}`);
  const quote = window.AppState.quotations.find(q => q.id === quoteId);
  if (quote) {
    console.log("[QuotationDebug] initStepperFromHash: quote found, mapping items");
    window.AppState.currentQuoteId = quoteId;
    window.AppState.quoteItems = quote.items.map(item => ({
      product: item.product,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      baseCost: item.baseCost,
      transferCost: item.transferCost,
      clientShippingCost: item.clientShippingCost,
      deliveryNote: item.deliveryNote,
      utilityType: item.utilityType,
      utilityValue: item.utilityValue
    }));
    window.AppState.quoteClientId = quote.clientId || "";
    window.AppState.quoteSellerId = quote.sellerId || "";
    window.AppState.quoteValidityDate = quote.validityDate || "";
    window.AppState.quoteConditions = quote.conditions || getDefaultQuoteConditions();
    window.AppState.quoteDiscountType = quote.discountType || "percent";
    window.AppState.quoteDiscountValue = Number(quote.discountValue) || 0;
    window.AppState.quoteStep = step;
    
    showStepperView();
    syncReadOnlyState();
    
    renderQuoteProducts();
    renderQuoteTable();
    populateQuoteClients();
    syncQuoteClientSelect(window.AppState.quoteClientId);
    renderClientPreview();
    
    console.log("[QuotationDebug] initStepperFromHash: calling initStepContent");
    initStepContent(step);
  } else {
    console.warn(`[QuotationDebug] initStepperFromHash: quote with ID ${quoteId} not found!`);
    showToast("Cotización no encontrada.", "warning");
    window.location.hash = "#/quotation";
  }
};

function initStepper(existingQuote, targetStep) {
  if (existingQuote) {
    window.AppState.currentQuoteId = existingQuote.id;
    window.AppState.quoteItems = existingQuote.items.map(item => ({
      product: item.product,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      baseCost: item.baseCost,
      transferCost: item.transferCost,
      clientShippingCost: item.clientShippingCost,
      deliveryNote: item.deliveryNote,
      utilityType: item.utilityType,
      utilityValue: item.utilityValue
    }));
    window.AppState.quoteClientId = existingQuote.clientId || "";
    window.AppState.quoteSellerId = existingQuote.sellerId || "";
    window.AppState.quoteValidityDate = existingQuote.validityDate || "";
    window.AppState.quoteConditions = existingQuote.conditions || getDefaultQuoteConditions();
    window.AppState.quoteDiscountType = existingQuote.discountType || "percent";
    window.AppState.quoteDiscountValue = Number(existingQuote.discountValue) || 0;
  } else {
    window.AppState.currentQuoteId = null;
    window.AppState.quoteItems = [];
    window.AppState.quoteClientId = "";
    window.AppState.quoteSellerId = "";
    window.AppState.quoteValidityDate = "";
    window.AppState.quoteConditions = getDefaultQuoteConditions();
    window.AppState.quoteDiscountType = "percent";
    window.AppState.quoteDiscountValue = 0;
  }
  window.AppState.quoteStep = targetStep || 1;
  showStepperView();
  renderQuoteProducts();
  renderQuoteTable();
  populateQuoteClients();
  syncQuoteClientSelect(window.AppState.quoteClientId);
  renderClientPreview();
  createLucideIcons();
  initStepContent(window.AppState.quoteStep);
}

function isCurrentQuoteConfirmed() {
  const existingQuote = window.AppState.currentQuoteId
    ? window.AppState.quotations.find(q => q.id === window.AppState.currentQuoteId)
    : null;
  return existingQuote && existingQuote.status !== 'draft';
}

function syncReadOnlyState() {
  const isConfirmed = isCurrentQuoteConfirmed();
  const stepperView = document.getElementById("quote-stepper-view");
  if (stepperView) {
    if (isConfirmed) {
      stepperView.setAttribute("data-readonly", "true");
    } else {
      stepperView.removeAttribute("data-readonly");
    }
  }
}

function checkActiveDraft() {
  const alertContainer = document.getElementById("quote-draft-alert");
  if (!alertContainer) return;

  const drafts = window.AppState.quotations.filter(q => q.status === 'draft');
  drafts.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  
  const draft = drafts[0];
  if (draft && draft.items && draft.items.length > 0) {
    const folioEl = document.getElementById("draft-alert-folio");
    if (folioEl) folioEl.textContent = draft.id;
    alertContainer.setAttribute("data-visible", "true");
    
    const resumeBtn = document.getElementById("btn-resume-draft");
    if (resumeBtn) {
      resumeBtn.onclick = () => {
        const targetStep = draft.currentStep || 1;
        window.location.hash = `#/quotation/${draft.id}/step${targetStep}`;
      };
    }
    
    const discardBtn = document.getElementById("btn-discard-draft");
    if (discardBtn) {
      discardBtn.onclick = () => {
        if (confirm(`¿Descartar el borrador de cotización ${draft.id}?`)) {
          window.AppState.quotations = window.AppState.quotations.filter(q => q.id !== draft.id);
          saveQuotationsToStorage();
          alertContainer.setAttribute("data-visible", "false");
          renderQuotationsList();
        }
      };
    }
  } else {
    alertContainer.setAttribute("data-visible", "false");
  }
}

function goToStep(step) {
  if (step > window.AppState.quoteStep) {
    if (window.AppState.quoteStep === 1 && window.AppState.quoteItems.length === 0) {
      showToast("Agrega al menos un producto antes de continuar.", "warning");
      return;
    }
  }

  window.AppState.quoteStep = step;

  for (let i = 1; i <= 3; i++) {
    const panel = document.getElementById(`stepper-step-${i}`);
    if (panel) {
      panel.classList.toggle("stepper-step-content--active", i === step);
    }
  }

  document.querySelectorAll("[data-step-dot]").forEach(dot => {
    const s = parseInt(dot.getAttribute("data-step-dot"));
    dot.classList.remove("active", "completed");
    if (s === step) dot.classList.add("active");
    else if (s < step) dot.classList.add("completed");
  });

  document.querySelectorAll("[data-step-line]").forEach(line => {
    const s = parseInt(line.getAttribute("data-step-line"));
    line.classList.toggle("filled", s < step);
  });

  document.querySelectorAll("[data-step-label]").forEach(label => {
    const s = parseInt(label.getAttribute("data-step-label"));
    label.classList.remove("active", "completed");
    if (s === step) label.classList.add("active");
    else if (s < step) label.classList.add("completed");
  });

  if (step === 2) {
    populateQuoteClients();
    syncQuoteClientSelect(window.AppState.quoteClientId);
    renderClientPreview();
    updateClientPanelStatus(window.AppState.quoteClientId ? "client-selected" : "no-client");
    populateQuoteSellers();
    syncQuoteSellerSelect(window.AppState.quoteSellerId);
    initQuoteValidityDate();
  } else if (step === 3) {
    renderOverview();
  }

  renderStepFooter(step);
  syncReadOnlyState();
  createLucideIcons();
  
  if (window.AppState.currentQuoteId) {
    window.navigateToQuotation(window.AppState.currentQuoteId, step);
    saveDraftQuotation();
  }
}

window.goToStep = goToStep;

function updateQuotationHash(quoteId, step) {
  window.location.hash = `#/quotation/${quoteId}/step${step}`;
}

function renderStepFooter(step) {
  console.log(`[QuotationDebug] renderStepFooter called for step: ${step}`);
  removeStepFooter();

  const iconPricing = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`;
  const iconClient  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
  const iconResume  = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;

  let continueText = 'Continuar';
  let continueIcon = '<polyline points="9 18 15 12 9 6"></polyline>';

  const existingQuote = window.AppState.currentQuoteId
    ? window.AppState.quotations.find(q => q.id === window.AppState.currentQuoteId)
    : null;
  const isConfirmed = existingQuote && existingQuote.status !== 'draft';

  if (step === 3) {
    if (isConfirmed) {
      continueText = 'Listo';
      continueIcon = '<polyline points="20 6 9 17 4 12"></polyline>';
    } else {
      continueText = 'Confirmar';
      continueIcon = '<polyline points="20 6 9 17 4 12"></polyline>';
    }
  }

  const footerHtml = `
    <div class="step-footer" id="step-footer">
      <div class="step-footer-inner">

        <button class="footer-nav-btn back" id="sf-back" aria-label="Regresar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:20px;height:20px">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>

        <div class="footer-tabs">
          <button class="footer-tab ${step === 1 ? 'active' : ''}" id="sf-tab-1">
            ${iconPricing}
            <span>Precios</span>
          </button>
          <button class="footer-tab ${step === 2 ? 'active' : ''}" id="sf-tab-2">
            ${iconClient}
            <span>Cliente</span>
          </button>
          <button class="footer-tab ${step === 3 ? 'active' : ''}" id="sf-tab-3">
            ${iconResume}
            <span>Resumen</span>
          </button>
        </div>

        <button class="footer-nav-btn continue" id="sf-continue">
          <span>${continueText}</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:18px;height:18px">
            ${continueIcon}
          </svg>
        </button>

      </div>
    </div>
  `;

  console.log("[QuotationDebug] renderStepFooter: inserting step-footer to document.body");
  document.body.insertAdjacentHTML('beforeend', footerHtml);

  document.getElementById("sf-back")?.addEventListener("click", () => {
    if (window.AppState.quoteStep === 1) {
      showListView();
    } else {
      goToStep(window.AppState.quoteStep - 1);
    }
  });

  document.getElementById("sf-tab-1")?.addEventListener("click", () => goToStep(1));
  document.getElementById("sf-tab-2")?.addEventListener("click", () => goToStep(2));
  document.getElementById("sf-tab-3")?.addEventListener("click", () => goToStep(3));

  document.getElementById("sf-continue")?.addEventListener("click", () => {
    if (window.AppState.quoteStep < 3) {
      goToStep(window.AppState.quoteStep + 1);
    } else {
      if (isConfirmed) {
        showListView();
      } else {
        confirmQuotation();
      }
    }
  });
}

function removeStepFooter() {
  const existing = document.getElementById("step-footer");
  if (existing) {
    console.log("[QuotationDebug] removeStepFooter: removing step-footer");
    existing.remove();
  }
}

function getClientLabel(clientId) {
  if (!clientId) return "-- Cliente General / Público --";
  const client = window.AppState.clients.find(c => c.id === clientId);
  return client ? `${client.nombre} (${client.empresa || 'Empresa'})` : "-- Cliente General / Público --";
}

function syncQuoteClientSelect(clientId) {
  const select = document.getElementById("quote-client-select");
  if (select) select.value = clientId;
  
  const displayInput = document.getElementById("quoteClientInput");
  if (displayInput) displayInput.value = getClientLabel(clientId);
  
  const optionsContainer = document.getElementById("quoteClientOptions");
  if (optionsContainer) {
    optionsContainer.querySelectorAll(".custom-select-option").forEach(opt => {
      opt.classList.toggle("selected", opt.getAttribute("data-value") === clientId);
    });
  }
}

function populateQuoteClients() {
  const select = document.getElementById("quote-client-select");
  const optionsContainer = document.getElementById("quoteClientOptions");
  const displayInput = document.getElementById("quoteClientInput");
  if (!select) return;

  const currentVal = window.AppState.quoteClientId || "";
  select.value = currentVal;
  if (displayInput) {
    displayInput.value = getClientLabel(currentVal);
  }

  if (optionsContainer) {
    const clientsOptionsHtml = [
      { id: "", label: "-- Cliente General / Público --", search: "cliente general publico publico mostrador" },
      ...window.AppState.clients.map(c => ({
        id: c.id,
        label: `${c.nombre || ""} (${c.empresa || "Empresa"})`,
        search: [
          c.id,
          c.nombre,
          c.empresa,
          c.rfc,
          c.telefono,
          c.correo,
          c.direccion
        ].filter(Boolean).join(" ")
      }))
    ].map(item => `
      <button
        class="custom-select-option ${item.id === currentVal ? "selected" : ""}"
        type="button"
        data-value="${escapeQuoteHtml(item.id)}"
        data-search="${escapeQuoteHtml(item.search)}"
        style="display: flex;"
      >
        ${escapeQuoteHtml(item.label)}
      </button>
    `).join("");
    optionsContainer.innerHTML = clientsOptionsHtml;
    
    optionsContainer.querySelectorAll(".custom-select-option").forEach(opt => {
      opt.addEventListener("click", () => {
        const val = opt.getAttribute("data-value");
        window.AppState.quoteClientId = val;
        select.value = val;
        if (displayInput) displayInput.value = opt.textContent.trim();

        optionsContainer.querySelectorAll(".custom-select-option").forEach(o => {
          o.classList.remove("selected");
          o.style.display = "flex";
        });
        opt.classList.add("selected");
        closeQuoteClientSelect();
        
        renderClientPreview();
        updateClientPanelStatus(val ? "client-selected" : "no-client");
        saveDraftQuotation();
      });
    });
    filterQuoteClientOptions("");
  }
}

function syncQuoteSellerSelect(sellerId) {
  const select = document.getElementById("quote-seller-select");
  if (select) select.value = sellerId;
  
  const displayInput = document.getElementById("quoteSellerInput");
  if (displayInput) displayInput.value = getSellerLabel(sellerId);
  syncQuoteSellerAvatar(sellerId);
  
  const optionsContainer = document.getElementById("quoteSellerOptions");
  if (optionsContainer) {
    optionsContainer.querySelectorAll(".custom-select-option").forEach(opt => {
      opt.classList.toggle("selected", opt.getAttribute("data-value") === sellerId);
    });
  }
}

function populateQuoteSellers() {
  const select = document.getElementById("quote-seller-select");
  const optionsContainer = document.getElementById("quoteSellerOptions");
  const displayInput = document.getElementById("quoteSellerInput");
  if (!select) return;

  const currentVal = window.AppState.quoteSellerId || "";
  select.value = currentVal;
  if (displayInput) {
    displayInput.value = getSellerLabel(currentVal);
  }
  syncQuoteSellerAvatar(currentVal);

  if (optionsContainer) {
    const users = typeof window.UserScope?.getUsers === "function" ? window.UserScope.getUsers() : [];
    
    const sellersOptionsHtml = [
      { id: "", label: "-- Seleccionar Vendedor --", search: "seleccionar vendedor sin asignar ninguno" },
      ...users.map(u => ({
        id: u.id,
        label: `${u.name || ""} (${u.roles?.join(", ") || "Vendedor"})`,
        search: [
          u.id,
          u.name,
          u.email,
          u.tel,
          ...(u.roles || [])
        ].filter(Boolean).join(" ")
      }))
    ].map(item => `
      <button
        class="custom-select-option ${item.id === currentVal ? "selected" : ""}"
        type="button"
        data-value="${escapeQuoteHtml(item.id)}"
        data-search="${escapeQuoteHtml(item.search)}"
        style="display: flex;"
      >
        ${escapeQuoteHtml(item.label)}
      </button>
    `).join("");
    
    optionsContainer.innerHTML = sellersOptionsHtml;
    
    optionsContainer.querySelectorAll(".custom-select-option").forEach(opt => {
      opt.addEventListener("click", () => {
        const val = opt.getAttribute("data-value");
        window.AppState.quoteSellerId = val;
        select.value = val;
        if (displayInput) displayInput.value = opt.textContent.trim();
        syncQuoteSellerAvatar(val);

        optionsContainer.querySelectorAll(".custom-select-option").forEach(o => {
          o.classList.remove("selected");
          o.style.display = "flex";
        });
        opt.classList.add("selected");
        closeQuoteSellerSelect();
        
        saveDraftQuotation();
      });
    });
    filterQuoteSellerOptions("");
  }
}

const quoteValidityCalendarState = {
  viewDate: null,
  viewMode: "day",
  yearRangeStart: null
};

const quoteCalendarMonths = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre"
];

function parseQuoteIsoDate(value) {
  const [year, month, day] = String(value || "").split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatQuoteIsoDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatQuoteDisplayDate(value) {
  const date = parseQuoteIsoDate(value);
  if (!date) return "Seleccionar fecha";
  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function isSameQuoteDate(a, b) {
  return a instanceof Date && b instanceof Date &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function addQuoteMonths(date, amount) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
}

function getQuoteYearRangeStart(year) {
  return year - 5;
}

function closeQuoteValidityCalendar() {
  const popover = document.getElementById("quote-validity-popover");
  const trigger = document.getElementById("quote-validity-trigger");
  if (popover) popover.hidden = true;
  trigger?.setAttribute("aria-expanded", "false");
}

function openQuoteValidityCalendar() {
  if (isQuoteStepperReadonly()) return;
  const popover = document.getElementById("quote-validity-popover");
  const trigger = document.getElementById("quote-validity-trigger");
  if (!popover) return;
  quoteValidityCalendarState.viewDate = parseQuoteIsoDate(window.AppState.quoteValidityDate) || new Date();
  quoteValidityCalendarState.viewMode = "day";
  quoteValidityCalendarState.yearRangeStart = getQuoteYearRangeStart(quoteValidityCalendarState.viewDate.getFullYear());
  renderQuoteValidityCalendar();
  popover.hidden = false;
  trigger?.setAttribute("aria-expanded", "true");
}

function setQuoteValidityDate(value) {
  window.AppState.quoteValidityDate = value;
  const input = document.getElementById("quote-validity-date");
  const label = document.getElementById("quote-validity-label");
  if (input) input.value = value;
  if (label) label.textContent = formatQuoteDisplayDate(value);
  saveDraftQuotation();
}

function renderQuoteValidityCalendar() {
  const calendar = document.getElementById("quote-validity-calendar");
  if (!calendar) return;

  const selectedDate = parseQuoteIsoDate(window.AppState.quoteValidityDate);
  const viewDate = quoteValidityCalendarState.viewDate || selectedDate || new Date();
  const viewMode = quoteValidityCalendarState.viewMode || "day";
  const yearRangeStart = quoteValidityCalendarState.yearRangeStart || getQuoteYearRangeStart(viewDate.getFullYear());
  quoteValidityCalendarState.yearRangeStart = yearRangeStart;
  const today = new Date();

  if (viewMode === "month") {
    calendar.setAttribute("data-screen", "months");
    const selectedMonth = selectedDate?.getMonth();
    const selectedYear = selectedDate?.getFullYear();
    const months = quoteCalendarMonths.map((month, index) => {
      const isCurrent = today.getFullYear() === viewDate.getFullYear() && today.getMonth() === index;
      const isSelected = selectedYear === viewDate.getFullYear() && selectedMonth === index;
      const classes = [
        "quote-calendar-choice",
        isCurrent ? "is-current" : "",
        isSelected ? "is-selected" : ""
      ].filter(Boolean).join(" ");
      return `<button type="button" class="${classes}" data-quote-calendar-month="${index}">${month}</button>`;
    }).join("");

    calendar.innerHTML = `
      <div class="quote-calendar-header">
        <button type="button" class="quote-calendar-nav" data-quote-calendar-year-nav="-1" aria-label="Año anterior">
          <i data-lucide="chevron-left"></i>
        </button>
        <button type="button" class="quote-calendar-title" data-quote-calendar-title>
          ${viewDate.getFullYear()}
        </button>
        <button type="button" class="quote-calendar-nav" data-quote-calendar-year-nav="1" aria-label="Año siguiente">
          <i data-lucide="chevron-right"></i>
        </button>
      </div>
      <div class="quote-calendar-choice-grid">${months}</div>
    `;

    calendar.querySelector("[data-quote-calendar-title]")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      quoteValidityCalendarState.viewMode = "year";
      quoteValidityCalendarState.yearRangeStart = getQuoteYearRangeStart(viewDate.getFullYear());
      renderQuoteValidityCalendar();
    });

    calendar.querySelectorAll("[data-quote-calendar-year-nav]").forEach(btn => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const amount = Number(btn.getAttribute("data-quote-calendar-year-nav")) || 0;
        quoteValidityCalendarState.viewDate = new Date(viewDate.getFullYear() + amount, viewDate.getMonth(), 1);
        renderQuoteValidityCalendar();
      });
    });

    calendar.querySelectorAll("[data-quote-calendar-month]").forEach(btn => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const month = Number(btn.getAttribute("data-quote-calendar-month")) || 0;
        quoteValidityCalendarState.viewDate = new Date(viewDate.getFullYear(), month, 1);
        quoteValidityCalendarState.viewMode = "day";
        renderQuoteValidityCalendar();
      });
    });

    createLucideIcons();
    return;
  }

  if (viewMode === "year") {
    calendar.setAttribute("data-screen", "years");
    const selectedYear = selectedDate?.getFullYear();
    const years = Array.from({ length: 12 }, (_, index) => yearRangeStart + index).map(year => {
      const classes = [
        "quote-calendar-choice",
        year === today.getFullYear() ? "is-current" : "",
        year === selectedYear ? "is-selected" : ""
      ].filter(Boolean).join(" ");
      return `<button type="button" class="${classes}" data-quote-calendar-year="${year}">${year}</button>`;
    }).join("");

    calendar.innerHTML = `
      <div class="quote-calendar-header">
        <button type="button" class="quote-calendar-nav" data-quote-calendar-range-nav="-1" aria-label="Años anteriores">
          <i data-lucide="chevron-left"></i>
        </button>
        <button type="button" class="quote-calendar-title" data-quote-calendar-title>
          ${yearRangeStart} - ${yearRangeStart + 11}
        </button>
        <button type="button" class="quote-calendar-nav" data-quote-calendar-range-nav="1" aria-label="Años siguientes">
          <i data-lucide="chevron-right"></i>
        </button>
      </div>
      <div class="quote-calendar-choice-grid">${years}</div>
    `;

    calendar.querySelector("[data-quote-calendar-title]")?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      quoteValidityCalendarState.viewMode = "day";
      renderQuoteValidityCalendar();
    });

    calendar.querySelectorAll("[data-quote-calendar-range-nav]").forEach(btn => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const amount = Number(btn.getAttribute("data-quote-calendar-range-nav")) || 0;
        quoteValidityCalendarState.yearRangeStart = yearRangeStart + (amount * 12);
        renderQuoteValidityCalendar();
      });
    });

    calendar.querySelectorAll("[data-quote-calendar-year]").forEach(btn => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const year = Number(btn.getAttribute("data-quote-calendar-year")) || viewDate.getFullYear();
        quoteValidityCalendarState.viewDate = new Date(year, viewDate.getMonth(), 1);
        quoteValidityCalendarState.viewMode = "month";
        renderQuoteValidityCalendar();
      });
    });

    createLucideIcons();
    return;
  }

  calendar.setAttribute("data-screen", "days");
  const firstOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(firstOfMonth.getDate() - firstOfMonth.getDay());
  const weekdays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const days = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    const iso = formatQuoteIsoDate(day);
    const classes = [
      "quote-calendar-day",
      day.getMonth() !== viewDate.getMonth() ? "is-other-month" : "",
      isSameQuoteDate(day, today) ? "is-today" : "",
      selectedDate && isSameQuoteDate(day, selectedDate) ? "is-selected" : ""
    ].filter(Boolean).join(" ");
    return `<button type="button" class="${classes}" data-quote-calendar-date="${iso}">${day.getDate()}</button>`;
  }).join("");

  calendar.innerHTML = `
    <div class="quote-calendar-header">
      <button type="button" class="quote-calendar-nav" data-quote-calendar-nav="-1" aria-label="Mes anterior">
        <i data-lucide="chevron-left"></i>
      </button>
      <button type="button" class="quote-calendar-title" data-quote-calendar-title>
        ${viewDate.toLocaleDateString("es-MX", { month: "long", year: "numeric" })}
      </button>
      <button type="button" class="quote-calendar-nav" data-quote-calendar-nav="1" aria-label="Mes siguiente">
        <i data-lucide="chevron-right"></i>
      </button>
    </div>
    <div class="quote-calendar-weekdays">
      ${weekdays.map(day => `<div class="quote-calendar-weekday">${day}</div>`).join("")}
    </div>
    <div class="quote-calendar-grid">${days}</div>
    <div class="quote-calendar-footer">
      <button type="button" class="quote-calendar-quick" data-quote-calendar-today>Hoy</button>
      <button type="button" class="quote-calendar-quick" data-quote-calendar-default>+15 días</button>
    </div>
  `;

  calendar.querySelectorAll("[data-quote-calendar-nav]").forEach(btn => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const amount = Number(btn.getAttribute("data-quote-calendar-nav")) || 0;
      quoteValidityCalendarState.viewDate = addQuoteMonths(viewDate, amount);
      renderQuoteValidityCalendar();
    });
  });

  calendar.querySelector("[data-quote-calendar-title]")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    quoteValidityCalendarState.viewMode = "month";
    renderQuoteValidityCalendar();
  });

  calendar.querySelectorAll("[data-quote-calendar-date]").forEach(btn => {
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setQuoteValidityDate(btn.getAttribute("data-quote-calendar-date"));
      closeQuoteValidityCalendar();
    });
  });

  calendar.querySelector("[data-quote-calendar-today]")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setQuoteValidityDate(formatQuoteIsoDate(new Date()));
    closeQuoteValidityCalendar();
  });

  calendar.querySelector("[data-quote-calendar-default]")?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setQuoteValidityDate(getDefaultValidityDate());
    closeQuoteValidityCalendar();
  });

  createLucideIcons();
}

function initQuoteValidityDate() {
  const validityInput = document.getElementById("quote-validity-date");
  const trigger = document.getElementById("quote-validity-trigger");
  const label = document.getElementById("quote-validity-label");
  if (!validityInput) return;

  if (!window.AppState.quoteValidityDate) {
    window.AppState.quoteValidityDate = getDefaultValidityDate();
  }
  validityInput.value = window.AppState.quoteValidityDate;
  if (label) label.textContent = formatQuoteDisplayDate(window.AppState.quoteValidityDate);

  if (!validityInput.dataset.bound) {
    const picker = document.getElementById("quote-validity-picker");
    picker?.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    picker?.addEventListener("mousedown", (event) => {
      event.stopPropagation();
    });
    trigger?.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const popover = document.getElementById("quote-validity-popover");
      if (popover && !popover.hidden) closeQuoteValidityCalendar();
      else openQuoteValidityCalendar();
    });
    document.addEventListener("click", (event) => {
      const picker = document.getElementById("quote-validity-picker");
      const popover = document.getElementById("quote-validity-popover");
      if (!picker || !popover || popover.hidden) return;
      if (!picker.contains(event.target)) closeQuoteValidityCalendar();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeQuoteValidityCalendar();
    });
    validityInput.dataset.bound = "true";
  }
}

function renderClientPreview() {
  const preview = document.getElementById("stepper-client-preview");
  if (!preview) return;

  if (!window.AppState.quoteClientId) {
    preview.setAttribute("data-visible", "false");
    return;
  }

  const client = window.AppState.clients.find(c => c.id === window.AppState.quoteClientId);
  if (!client) {
    preview.setAttribute("data-visible", "false");
    return;
  }

  preview.setAttribute("data-visible", "true");
  preview.innerHTML = `
    <div class="client-card-name">${client.nombre}</div>
    <div class="client-card-empresa">${client.empresa || '—'}</div>
    <div class="client-card-detail"><i data-lucide="hash" style="width:12px;height:12px;"></i> RFC: ${client.rfc || '—'}</div>
    <div class="client-card-detail"><i data-lucide="phone" style="width:12px;height:12px;"></i> Tel: ${client.telefono || '—'}</div>
    <div class="client-card-detail"><i data-lucide="mail" style="width:12px;height:12px;"></i> ${client.correo || '—'}</div>
    <div class="client-card-detail"><i data-lucide="map-pin" style="width:12px;height:12px;"></i> ${client.direccion || '—'}</div>
    <button type="button" class="btn-clear-client" id="sq-btn-clear-client" title="Quitar cliente">
      <i data-lucide="x" style="width:16px;height:16px;"></i>
    </button>
  `;
  createLucideIcons();

  document.getElementById("sq-btn-clear-client")?.addEventListener("click", () => {
    window.AppState.quoteClientId = "";
    syncQuoteClientSelect("");
    renderClientPreview();
    updateClientPanelStatus("no-client");
    saveDraftQuotation();
  });
}

function renderQuoteProducts() {
  const query = (document.getElementById("quote-product-search")?.value || "").trim().toLowerCase();
  const container = document.getElementById("quote-products-list");
  if (!container) return;
  const isReplacing = quoteProductSearchContext.mode === "replace"
    && Number.isInteger(quoteProductSearchContext.replaceIndex);

  const clearBtn = document.getElementById("quote-product-clear-btn");
  if (clearBtn) {
    clearBtn.style.display = query ? "flex" : "none";
  }

  let filtered = window.AppState.products;
  if (query) {
    filtered = window.AppState.products.filter(p =>
      (p.nombre || "").toLowerCase().includes(query) ||
      (p.codigo || "").toLowerCase().includes(query) ||
      (p.marca || "").toLowerCase().includes(query)
    );
  }

  filtered = filtered.slice(0, 25);

  if (filtered.length === 0) {
    container.innerHTML = `<div class="quote-empty-state">No se encontraron productos.</div>`;
    return;
  }

  container.innerHTML = filtered.map(p => `
    <div class="quote-prod-card">
      <div class="quote-prod-info">
        <div class="quote-prod-name">${p.nombre}</div>
        <div class="quote-prod-meta">SKU: <strong>${p.codigo}</strong> | Marca: ${p.marca} | Stock: ${p.stock}</div>
      </div>
      <button class="quote-prod-add" data-add-sku="${p.codigo}" aria-label="${isReplacing ? "Reemplazar por" : "Agregar"} ${escapeQuoteHtml(p.nombre)}">
        <i data-lucide="${isReplacing ? "refresh-cw" : "plus"}"></i>
      </button>
    </div>
  `).join("");

  container.querySelectorAll(".quote-prod-add").forEach(btn => {
    btn.addEventListener("click", () => {
      const sku = btn.getAttribute("data-add-sku");
      const prod = window.AppState.products.find(p => p.codigo === sku);
      if (prod) addToQuote(prod);
    });
  });
  createLucideIcons();
}

function openQuoteProductsSheet(initialQuery = "", context = {}) {
  if (isQuoteStepperReadonly()) return;
  setQuoteProductSearchContext(context);
  const overlay = ensureQuoteProductSearchOverlay();
  overlay.classList.add("active");
  document.body.classList.add("quote-search-overlay-open");
  overlay.dataset.mode = quoteProductSearchContext.mode;

  const searchInput = overlay.querySelector("#quote-product-search");
  const clearBtn = overlay.querySelector("#quote-product-clear-btn");
  const title = overlay.querySelector("#quote-product-search-title");
  const hint = overlay.querySelector(".quote-search-hint");

  if (searchInput) searchInput.value = initialQuery;
  if (clearBtn) clearBtn.style.display = initialQuery ? "flex" : "none";
  if (title) title.textContent = quoteProductSearchContext.mode === "replace"
    ? "Reemplazar producto"
    : "Agregar productos";
  if (hint) hint.textContent = quoteProductSearchContext.mode === "replace"
    ? "Selecciona un producto para reemplazar esta línea sin perder cantidad, envío ni notas."
    : "Selecciona productos del inventario. Puedes seguir agregando sin cerrar este buscador.";

  renderQuoteProducts();
  createLucideIcons();
  window.setTimeout(() => searchInput?.focus({ preventScroll: true }), 0);
}

function closeQuoteProductsOverlay() {
  const overlay = document.getElementById("quote-product-search-overlay");
  if (!overlay) return;
  overlay.classList.remove("active");
  document.body.classList.remove("quote-search-overlay-open");
  resetQuoteProductSearchContext();
}

function ensureQuoteProductSearchOverlay() {
  let overlay = document.getElementById("quote-product-search-overlay");
  if (overlay) return overlay;

  overlay = document.createElement("div");
  overlay.id = "quote-product-search-overlay";
  overlay.className = "quote-search-overlay";
  overlay.innerHTML = `
    <div class="quote-search-panel" role="dialog" aria-modal="true" aria-labelledby="quote-product-search-title">
      <button class="quote-search-close" type="button" data-quote-search-close aria-label="Cerrar buscador">
        <i data-lucide="x"></i>
      </button>
      <div class="quote-product-sheet">
        <div class="quote-search-kicker">Cotización</div>
        <h2 class="quote-search-title" id="quote-product-search-title">Agregar productos</h2>
        <div class="quote-product-sheet__search">
          <i data-lucide="search" class="quote-search-icon"></i>
          <input
            type="text"
            id="quote-product-search"
            class="quote-search-input"
            placeholder="Buscar por SKU, nombre o marca..."
            autocomplete="off"
          />
          <button
            type="button"
            class="quote-search-clear"
            id="quote-product-clear-btn"
            aria-label="Limpiar búsqueda"
            style="display: none"
          >
            <i data-lucide="x"></i>
          </button>
        </div>
        <div class="quote-search-hint">Selecciona productos del inventario. Puedes seguir agregando sin cerrar este buscador.</div>
        <div id="quote-products-list" class="quote-products-list"></div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const searchInput = overlay.querySelector("#quote-product-search");
  const clearBtn = overlay.querySelector("#quote-product-clear-btn");

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay || event.target.closest("[data-quote-search-close]")) {
      closeQuoteProductsOverlay();
    }
  });

  searchInput?.addEventListener("input", (event) => {
    renderQuoteProducts();
    if (clearBtn) clearBtn.style.display = event.target.value ? "flex" : "none";
  });

  searchInput?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeQuoteProductsOverlay();
    }
  });

  clearBtn?.addEventListener("click", () => {
    if (!searchInput) return;
    searchInput.value = "";
    renderQuoteProducts();
    clearBtn.style.display = "none";
    searchInput.focus();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && overlay.classList.contains("active")) {
      closeQuoteProductsOverlay();
    }
  });

  return overlay;
}

function getQuoteAddCaptureRow() {
  return document.getElementById("quote-add-capture-row");
}

function showQuoteAddCaptureRow() {
  if (isQuoteStepperReadonly()) return;
  quoteInlineReplaceIndex = null;

  const existing = getQuoteAddCaptureRow();
  if (existing) {
    existing.querySelector(".quote-capture-name")?.focus();
    return;
  }

  const tbody = document.getElementById("quote-items-tbody");
  const container = document.querySelector(".quote-items-container");
  if (!tbody) return;

  if (container) container.setAttribute("data-empty", "false");

  const row = document.createElement("tr");
  row.id = "quote-add-capture-row";
  row.className = "quote-doc-row quote-add-capture-row";
  row.innerHTML = `
    <td class="quote-doc-handle" aria-hidden="true"></td>
    <td class="quote-doc-concept">
      <textarea class="quote-capture-name quote-capture-input" placeholder="Descripción del concepto" rows="1"></textarea>
      <div class="quote-capture-meta">
        <input type="text" class="quote-capture-sku quote-capture-input" placeholder="SKU / Cód." />
        <span></span>
        <input type="text" class="quote-capture-brand quote-capture-input" placeholder="Marca/Ref" />
      </div>
    </td>
    <td class="quote-doc-qty">
      <div class="quote-capture-qty" aria-hidden="true">
        <span>&minus;</span>
        <strong>1</strong>
        <span>+</span>
      </div>
    </td>
    <td class="quote-doc-price">
      <div class="quote-capture-price" aria-hidden="true">
        <span>$</span>
        <strong>0,00</strong>
      </div>
    </td>
    <td class="quote-doc-subtotal">
      <span class="quote-doc-mobile-label">Subtotal</span>
      <strong>$0.00</strong>
    </td>
    <td class="quote-doc-actions">
      <div class="quote-doc-action-bar">
        <button class="quote-capture-cancel" type="button" aria-label="Cancelar captura">
          <i data-lucide="x"></i>
        </button>
      </div>
    </td>
  `;

  tbody.appendChild(row);
  bindQuoteCaptureRow(row, { mode: "add" });
  createLucideIcons();
  row.querySelector(".quote-capture-name")?.focus();
}

function removeQuoteAddCaptureRow() {
  const row = getQuoteAddCaptureRow();
  row?.remove();

  if (window.AppState.quoteItems.length === 0) {
    const container = document.querySelector(".quote-items-container");
    const tbody = document.getElementById("quote-items-tbody");
    if (container) container.setAttribute("data-empty", "true");
    if (tbody) tbody.innerHTML = "";
  }
}

function getQuoteCaptureQuery(row, sourceInput = null) {
  if (sourceInput?.classList?.contains("quote-capture-input")) {
    return sourceInput.value.trim();
  }

  const name = row.querySelector(".quote-capture-name")?.value || "";
  const sku = row.querySelector(".quote-capture-sku")?.value || "";
  const brand = row.querySelector(".quote-capture-brand")?.value || "";
  return [name, sku, brand].map(value => value.trim()).filter(Boolean).join(" ");
}

function bindQuoteCaptureRow(row, options = {}) {
  let typingTimer = null;
  let overlayTimer = null;
  const inputs = row.querySelectorAll(".quote-capture-input");
  const searchContext = {
    mode: options.mode === "replace" ? "replace" : "add",
    replaceIndex: Number.isInteger(options.replaceIndex) ? options.replaceIndex : null
  };

  const clearTimers = () => {
    window.clearTimeout(typingTimer);
    window.clearTimeout(overlayTimer);
  };

  const removeShimmer = () => row.classList.remove("shimmer-active");

  const triggerOverlay = (sourceInput) => {
    const query = getQuoteCaptureQuery(row, sourceInput);
    if (!query) return;
    removeShimmer();
    openQuoteProductsSheet(query, searchContext);
  };

  inputs.forEach(input => {
    input.addEventListener("input", () => {
      clearTimers();
      removeShimmer();
      const query = getQuoteCaptureQuery(row, input);
      if (!query) return;
      triggerOverlay(input);
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        clearTimers();
        removeShimmer();
        const query = getQuoteCaptureQuery(row, input);
        if (query) openQuoteProductsSheet(query, searchContext);
      }
      if (event.key === "Escape") {
        clearTimers();
        if (searchContext.mode === "replace") {
          quoteInlineReplaceIndex = null;
          renderQuoteTable();
        } else {
          removeQuoteAddCaptureRow();
        }
      }
    });
  });

  row.querySelector(".quote-capture-cancel")?.addEventListener("click", () => {
    clearTimers();
    if (searchContext.mode === "replace") {
      quoteInlineReplaceIndex = null;
      renderQuoteTable();
    } else {
      removeQuoteAddCaptureRow();
    }
  });
}

function createQuoteLine(product) {
  const baseCost = Number(product.costo) || 0;
  const transferCost = Number(product.CostoEnvio ?? product.costoEnvio ?? product.costoTraslado ?? 0) || 0;
  const currency = String(product.quoteCurrency || product.currency || "MXN").toUpperCase() === "USD" ? "USD" : "MXN";
  const exchangeRate = Number(product.quoteExchangeRate || product.exchangeRate) || 1;
  return {
    product,
    quantity: 1,
    unitPrice: Number(product.precio) || 0,
    baseCost,
    transferCost,
    currency,
    exchangeRate,
    clientShippingCost: 0,
    deliveryNote: product.deliveryNote || "",
    utilityType: "percent",
    utilityValue: 0
  };
}

function normalizeQuoteLine(item) {
  const product = item.product || {};
  const normalized = {
    product,
    quantity: Number(item.quantity) || 1,
    unitPrice: Number(item.unitPrice ?? product.precio) || 0,
    baseCost: Number(item.baseCost ?? product.costo) || 0,
    transferCost: Number(item.transferCost ?? product.CostoEnvio ?? product.costoEnvio ?? product.costoTraslado) || 0,
    currency: String(item.currency || product.quoteCurrency || product.currency || "MXN").toUpperCase() === "USD" ? "USD" : "MXN",
    exchangeRate: Number(item.exchangeRate || product.quoteExchangeRate || product.exchangeRate) || 1,
    clientShippingCost: Number(item.clientShippingCost) || 0,
    deliveryNote: item.deliveryNote || "",
    utilityType: item.utilityType || "percent",
    utilityValue: Number(item.utilityValue) || 0
  };
  return normalized;
}

function getQuoteLineExchangeRate(item) {
  const line = normalizeQuoteLine(item);
  return line.currency === "USD" ? Math.max(Number(line.exchangeRate) || 1, 0) : 1;
}

function getQuoteLineCostRaw(item) {
  const line = normalizeQuoteLine(item);
  return line.baseCost + line.transferCost;
}

function getQuoteLineCost(item) {
  return getQuoteLineCostRaw(item) * getQuoteLineExchangeRate(item);
}

function getQuoteLineSubtotal(item) {
  const line = normalizeQuoteLine(item);
  return ((line.unitPrice * line.quantity) + line.clientShippingCost) * getQuoteLineExchangeRate(line);
}

function getQuoteLineMargin(item) {
  const line = normalizeQuoteLine(item);
  const rate = getQuoteLineExchangeRate(line);
  const price = line.unitPrice * rate;
  const cost = getQuoteLineCost(line);
  const margin = price - cost;
  if (price <= 0) return 0;
  return (margin / price) * 100;
}

function getQuoteLineUtilityAmount(item) {
  const line = normalizeQuoteLine(item);
  const cost = getQuoteLineCostRaw(line);
  if (line.utilityType === "amount") return line.utilityValue;
  return cost * (line.utilityValue / 100);
}

function updateQuoteLinePriceFromUtility(item) {
  const line = normalizeQuoteLine(item);
  const cost = getQuoteLineCostRaw(line);
  line.unitPrice = cost + getQuoteLineUtilityAmount(line);
  return line;
}

function updateQuoteLineUtilityFromPrice(item) {
  const line = normalizeQuoteLine(item);
  const cost = getQuoteLineCostRaw(line);
  const utilityAmount = Math.max(line.unitPrice - cost, 0);
  line.utilityValue = line.utilityType === "amount"
    ? utilityAmount
    : cost > 0 ? (utilityAmount / cost) * 100 : 0;
  return line;
}

function replaceQuoteLineProduct(idx, product) {
  const previous = normalizeQuoteLine(window.AppState.quoteItems[idx]);
  const next = createQuoteLine(product);
  next.quantity = previous.quantity;
  next.clientShippingCost = previous.clientShippingCost;
  next.deliveryNote = previous.deliveryNote || next.deliveryNote;
  next.utilityType = previous.utilityType;
  next.utilityValue = previous.utilityValue;

  window.AppState.quoteItems[idx] = next.utilityValue > 0
    ? updateQuoteLinePriceFromUtility(next)
    : updateQuoteLineUtilityFromPrice(next);

  quoteInlineReplaceIndex = null;
  closeQuoteProductsOverlay();
  showToast(`Reemplazado por: ${product.nombre}`, "success");
  renderQuoteTable();
  saveDraftQuotation();
}

function confirmRemoveQuoteLine(idx) {
  const item = window.AppState.quoteItems[idx];
  if (!item) return false;

  const productName = item.product?.nombre || item.description || "esta partida";
  const shouldRemove = window.confirm(`La cantidad quedaría debajo de 1. ¿Deseas eliminar "${productName}" de la cotización?`);
  if (!shouldRemove) return false;

  window.AppState.quoteItems.splice(idx, 1);
  quoteInlineReplaceIndex = null;
  renderQuoteTable();
  saveDraftQuotation();
  showToast("Partida eliminada.", "danger");
  return true;
}

function addToQuote(product) {
  if (isQuoteStepperReadonly()) return;

  if (quoteProductSearchContext.mode === "replace" && Number.isInteger(quoteProductSearchContext.replaceIndex)) {
    replaceQuoteLineProduct(quoteProductSearchContext.replaceIndex, product);
    return;
  }

  removeQuoteAddCaptureRow();
  const existing = window.AppState.quoteItems.find(item => item.product.codigo === product.codigo);
  if (existing) {
    existing.quantity += 1;
  } else {
    window.AppState.quoteItems.push(createQuoteLine(product));
  }
  showToast(`Agregado: ${product.nombre}`, "success");
  renderQuoteTable();
  saveDraftQuotation();
}

function renderQuoteTable() {
  const tbody = document.getElementById("quote-items-tbody");
  const container = document.querySelector(".quote-items-container");
  if (!tbody) return;

  syncQuoteFooterInputs();

  const isEmpty = window.AppState.quoteItems.length === 0;
  if (container) {
    container.setAttribute("data-empty", isEmpty ? "true" : "false");
  }

  if (isEmpty) {
    tbody.innerHTML = "";
    updateQuoteTotals(0);
    return;
  }

  window.AppState.quoteItems = window.AppState.quoteItems.map(normalizeQuoteLine);

  tbody.innerHTML = window.AppState.quoteItems.map((item, idx) => {
    const p = item.product;
    const lineName = escapeQuoteHtml(p.nombre || item.description || "Concepto sin nombre");
    const lineSku = escapeQuoteHtml(p.codigo || item.productId || "Sin SKU");
    const lineBrand = escapeQuoteHtml(p.marca || "Sin marca");
    const isReplacingLine = quoteInlineReplaceIndex === idx;
    const baseCost = Number(item.baseCost) || 0;
    const transferCost = Number(item.transferCost) || 0;
    const lineCurrency = item.currency || "MXN";
    const lineExchangeRate = Number(item.exchangeRate) || 1;
    const totalCost = getQuoteLineCost(item);
    const subtotal = getQuoteLineSubtotal(item);
    const margin = getQuoteLineMargin(item);
    return `
      <tr class="quote-doc-row ${isReplacingLine ? "quote-replace-capture-row" : ""}" data-idx="${idx}">
        <td class="quote-doc-handle" aria-hidden="true">
          <i data-lucide="grip-vertical"></i>
        </td>
        ${isReplacingLine ? `
          <td class="quote-doc-concept quote-doc-concept--capture">
            <textarea class="quote-capture-name quote-capture-input" placeholder="Descripción del concepto" rows="1">${lineName}</textarea>
            <div class="quote-capture-meta">
              <input type="text" class="quote-capture-sku quote-capture-input" placeholder="SKU / Cód." value="${lineSku}" />
              <span></span>
              <input type="text" class="quote-capture-brand quote-capture-input" placeholder="Marca/Ref" value="${lineBrand}" />
            </div>
          </td>
        ` : `
          <td class="quote-doc-concept quote-doc-concept--searchable" data-quote-replace-index="${idx}" role="button" tabindex="0" aria-label="Buscar y reemplazar ${lineName}">
            <div class="quote-doc-name">${lineName}</div>
            <div class="quote-doc-meta">SKU ${lineSku}<span></span>${lineBrand}</div>
            <div class="quote-doc-delivery-note" data-quote-line-display="delivery" ${item.deliveryNote ? "" : "hidden"}>${escapeQuoteHtml(item.deliveryNote)}</div>
          </td>
        `}
        <td class="quote-doc-qty">
          <div class="quote-qty-control">
            <button type="button" class="quote-qty-step" data-idx="${idx}" data-qty-step="-1" aria-label="Restar cantidad">&minus;</button>
            <input type="number" min="1" step="1" value="${item.quantity}" class="quote-line-input quote-qty-input" data-idx="${idx}" data-field="quantity" aria-label="Cantidad" />
            <button type="button" class="quote-qty-step" data-idx="${idx}" data-qty-step="1" aria-label="Sumar cantidad">+</button>
          </div>
        </td>
        <td class="quote-doc-price">
          <label class="quote-money-ghost">
            <span>$</span>
            <input type="number" min="0" step="0.01" value="${item.unitPrice.toFixed(2)}" class="quote-line-input" data-idx="${idx}" data-field="unitPrice" aria-label="Precio unitario al cliente" />
          </label>
        </td>
        <td class="quote-doc-subtotal">
          <span class="quote-doc-mobile-label">Subtotal</span>
          <strong data-quote-line-display="subtotal">$${subtotal.toFixed(2)}</strong>
        </td>
        <td class="quote-doc-actions">
          ${isReplacingLine ? `
            <div class="quote-doc-action-bar quote-doc-action-bar--visible">
              <button class="quote-capture-cancel" type="button" data-quote-replace-cancel="${idx}" aria-label="Cancelar reemplazo">
                <i data-lucide="x"></i>
              </button>
            </div>
          ` : `
          <div class="quote-doc-action-bar">
            <button class="quote-row-settings" type="button" data-idx="${idx}" aria-label="Configurar partida">
              <i data-lucide="sliders-horizontal"></i>
            </button>
            <button class="quote-item-delete" type="button" data-idx="${idx}" aria-label="Eliminar producto">
              <i data-lucide="x"></i>
            </button>
          </div>
          <div class="quote-row-popover" data-quote-popover>
            <div class="quote-popover-header">
              <h4>Configuración financiera</h4>
              <span>Margen: <strong data-quote-line-display="margin">${margin.toFixed(1)}%</strong></span>
            </div>
            <div class="quote-popover-grid">
              <label class="quote-popover-field">
                <span>Costo base</span>
                <div class="quote-popover-money">
                  <span>$</span>
                  <input type="number" min="0" step="0.01" value="${baseCost.toFixed(2)}" class="quote-line-input" data-idx="${idx}" data-field="baseCost" />
                </div>
              </label>
              <label class="quote-popover-field">
                <span>Costo traslado</span>
                <div class="quote-popover-money">
                  <span>$</span>
                  <input type="number" min="0" step="0.01" value="${transferCost.toFixed(2)}" class="quote-line-input" data-idx="${idx}" data-field="transferCost" />
                </div>
              </label>
            </div>
            <div class="quote-popover-grid">
              <label class="quote-popover-field">
                <span>Divisa de línea</span>
                <select class="quote-line-select" data-idx="${idx}" data-field="currency" aria-label="Divisa de línea">
                  <option value="MXN" ${lineCurrency === "MXN" ? "selected" : ""}>MXN</option>
                  <option value="USD" ${lineCurrency === "USD" ? "selected" : ""}>USD</option>
                </select>
              </label>
              <label class="quote-popover-field">
                <span>Tipo de cambio</span>
                <div class="quote-popover-money">
                  <span>MXN</span>
                  <input type="number" min="0" step="0.0001" value="${lineExchangeRate.toFixed(4)}" class="quote-line-input" data-idx="${idx}" data-field="exchangeRate" />
                </div>
              </label>
            </div>
            <div class="quote-popover-utility">
              <label>Utilidad esperada</label>
              <div class="quote-popover-utility-control">
                <select class="quote-line-select" data-idx="${idx}" data-field="utilityType" aria-label="Tipo de utilidad">
                  <option value="percent" ${item.utilityType === "percent" ? "selected" : ""}>%</option>
                  <option value="amount" ${item.utilityType === "amount" ? "selected" : ""}>$</option>
                </select>
                <input type="number" min="0" step="0.01" value="${item.utilityValue.toFixed(2)}" class="quote-line-input" data-idx="${idx}" data-field="utilityValue" aria-label="Utilidad aplicada" />
              </div>
            </div>
            <label class="quote-popover-field">
              <span>Envío al cliente</span>
              <div class="quote-popover-money">
                <span>$</span>
                <input type="number" min="0" step="0.01" value="${item.clientShippingCost.toFixed(2)}" class="quote-line-input" data-idx="${idx}" data-field="clientShippingCost" />
              </div>
            </label>
            <label class="quote-popover-field quote-popover-field--wide">
              <span>Leyenda de entrega</span>
              <input type="text" value="${escapeQuoteHtml(item.deliveryNote)}" class="quote-line-input quote-line-input--text" data-idx="${idx}" data-field="deliveryNote" placeholder="Ej. En stock, entrega inmediata" />
            </label>
            <div class="quote-popover-cost-note">
              Costo total interno: <strong data-quote-line-display="totalCost">$${totalCost.toFixed(2)}</strong>
            </div>
          </div>
          `}
        </td>
      </tr>
    `;
  }).join("");

  tbody.querySelectorAll(".quote-doc-concept--searchable").forEach(cell => {
    const startReplace = () => {
      if (isQuoteStepperReadonly()) return;
      const idx = parseInt(cell.getAttribute("data-quote-replace-index"));
      if (!Number.isInteger(idx)) return;
      removeQuoteAddCaptureRow();
      quoteInlineReplaceIndex = idx;
      renderQuoteTable();
      const replacementRow = document.querySelector(`.quote-doc-row[data-idx="${idx}"]`);
      const nameInput = replacementRow?.querySelector(".quote-capture-name");
      nameInput?.focus();
      nameInput?.select();
    };

    cell.addEventListener("click", startReplace);
    cell.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        startReplace();
      }
    });
  });

  tbody.querySelectorAll(".quote-replace-capture-row").forEach(row => {
    const idx = parseInt(row.getAttribute("data-idx"));
    bindQuoteCaptureRow(row, { mode: "replace", replaceIndex: idx });
  });

  tbody.querySelectorAll("[data-quote-replace-cancel]").forEach(btn => {
    btn.addEventListener("click", () => {
      quoteInlineReplaceIndex = null;
      renderQuoteTable();
    });
  });

  tbody.querySelectorAll(".quote-line-input, .quote-line-select").forEach(input => {
    input.addEventListener("input", () => {
      const idx = parseInt(input.getAttribute("data-idx"));
      const field = input.getAttribute("data-field");
      if (field === "quantity" && input.value === "") return;
      const isText = field === "deliveryNote" || field === "utilityType" || field === "currency";
      const val = isText ? input.value : parseFloat(input.value) || 0;
      if (field === "quantity" && val < 1) return;
      window.AppState.quoteItems[idx][field] = val;
      if (field === "utilityValue" || field === "utilityType" || field === "baseCost" || field === "transferCost") {
        window.AppState.quoteItems[idx] = updateQuoteLinePriceFromUtility(window.AppState.quoteItems[idx]);
      } else if (field === "unitPrice") {
        window.AppState.quoteItems[idx] = updateQuoteLineUtilityFromPrice(window.AppState.quoteItems[idx]);
      }
      recalculateQuote();
      syncQuoteLineDisplays(idx);
      saveDraftQuotation();
    });
    input.addEventListener("change", () => {
      const idx = parseInt(input.getAttribute("data-idx"));
      const field = input.getAttribute("data-field");
      const isText = field === "deliveryNote" || field === "utilityType" || field === "currency";
      const val = isText ? input.value : parseFloat(input.value) || 0;
      if (field === "quantity" && val < 1) {
        if (!confirmRemoveQuoteLine(idx)) {
          window.AppState.quoteItems[idx].quantity = 1;
          input.value = 1;
          recalculateQuote();
          syncQuoteLineDisplays(idx);
          saveDraftQuotation();
        }
        return;
      }
      window.AppState.quoteItems[idx][field] = val;
      if (field === "utilityValue" || field === "utilityType" || field === "baseCost" || field === "transferCost") {
        window.AppState.quoteItems[idx] = updateQuoteLinePriceFromUtility(window.AppState.quoteItems[idx]);
      } else if (field === "unitPrice") {
        window.AppState.quoteItems[idx] = updateQuoteLineUtilityFromPrice(window.AppState.quoteItems[idx]);
      }
      syncQuoteLineDisplays(idx);
      saveDraftQuotation();
    });
  });

  tbody.querySelectorAll(".quote-qty-step").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.getAttribute("data-idx"));
      const step = parseFloat(btn.getAttribute("data-qty-step")) || 0;
      const next = (Number(window.AppState.quoteItems[idx].quantity) || 1) + step;
      if (next < 1) {
        if (!confirmRemoveQuoteLine(idx)) {
          window.AppState.quoteItems[idx].quantity = 1;
          recalculateQuote();
          syncQuoteLineDisplays(idx);
          saveDraftQuotation();
        }
        return;
      }
      window.AppState.quoteItems[idx].quantity = next;
      recalculateQuote();
      syncQuoteLineDisplays(idx);
      saveDraftQuotation();
    });
  });

  tbody.querySelectorAll(".quote-row-settings").forEach(btn => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      const row = btn.closest(".quote-doc-row");
      const isOpen = row?.classList.contains("is-popover-open");
      closeQuoteLinePopovers(row);
      row?.classList.toggle("is-popover-open", !isOpen);
    });
  });

  tbody.querySelectorAll(".quote-row-popover").forEach(popover => {
    popover.addEventListener("click", (event) => event.stopPropagation());
  });

  tbody.querySelectorAll(".quote-item-delete").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.getAttribute("data-idx"));
      window.AppState.quoteItems.splice(idx, 1);
      renderQuoteTable();
      saveDraftQuotation();
    });
  });

  recalculateQuote();
  createLucideIcons();
}

function formatQuoteCurrency(value) {
  return `$${Number(value || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function closeQuoteLinePopovers(exceptRow = null) {
  document.querySelectorAll(".quote-doc-row.is-popover-open").forEach(row => {
    if (row !== exceptRow) row.classList.remove("is-popover-open");
  });
}

function updateQuoteInputValue(row, field, value) {
  const input = row?.querySelector(`[data-field="${field}"]`);
  if (!input || document.activeElement === input) return;
  input.value = value;
}

function syncQuoteLineDisplays(idx) {
  const row = document.querySelector(`.quote-doc-row[data-idx="${idx}"]`);
  const item = window.AppState.quoteItems[idx];
  if (!row || !item) return;

  const line = normalizeQuoteLine(item);
  window.AppState.quoteItems[idx] = line;

  const subtotalEl = row.querySelector('[data-quote-line-display="subtotal"]');
  const marginEl = row.querySelector('[data-quote-line-display="margin"]');
  const totalCostEl = row.querySelector('[data-quote-line-display="totalCost"]');
  const deliveryEl = row.querySelector('[data-quote-line-display="delivery"]');
  const subtotal = getQuoteLineSubtotal(line);
  const margin = getQuoteLineMargin(line);
  const totalCost = getQuoteLineCost(line);

  if (subtotalEl) subtotalEl.textContent = formatQuoteCurrency(subtotal);
  if (marginEl) marginEl.textContent = `${margin.toFixed(1)}%`;
  if (totalCostEl) totalCostEl.textContent = formatQuoteCurrency(totalCost);
  if (deliveryEl) {
    deliveryEl.textContent = line.deliveryNote;
    deliveryEl.hidden = !line.deliveryNote;
  }

  updateQuoteInputValue(row, "quantity", line.quantity);
  updateQuoteInputValue(row, "unitPrice", line.unitPrice.toFixed(2));
  updateQuoteInputValue(row, "baseCost", line.baseCost.toFixed(2));
  updateQuoteInputValue(row, "transferCost", line.transferCost.toFixed(2));
  updateQuoteInputValue(row, "exchangeRate", line.exchangeRate.toFixed(4));
  updateQuoteInputValue(row, "currency", line.currency);
  updateQuoteInputValue(row, "utilityValue", line.utilityValue.toFixed(2));
  updateQuoteInputValue(row, "clientShippingCost", line.clientShippingCost.toFixed(2));
}

function recalculateQuote() {
  let conceptsSubtotal = 0;
  let shippingTotal = 0;
  let totalCost = 0;

  window.AppState.quoteItems.forEach(item => {
    const line = normalizeQuoteLine(item);
    const rate = getQuoteLineExchangeRate(line);
    conceptsSubtotal += line.unitPrice * line.quantity * rate;
    shippingTotal += line.clientShippingCost * rate;
    totalCost += getQuoteLineCost(line) * line.quantity;
  });

  updateQuoteTotals(conceptsSubtotal, shippingTotal, totalCost);
}

function getQuoteDiscountAmount(conceptsSubtotal) {
  const discountValue = Number(window.AppState.quoteDiscountValue) || 0;
  const discountType = window.AppState.quoteDiscountType || "percent";
  if (discountType === "amount") {
    return Math.min(discountValue, conceptsSubtotal);
  }
  return Math.min(conceptsSubtotal * (discountValue / 100), conceptsSubtotal);
}

function updateQuoteTotals(conceptsSubtotal = 0, shippingTotal = 0, totalCost = 0) {
  const discountAmount = getQuoteDiscountAmount(conceptsSubtotal);
  const taxableAmount = Math.max(conceptsSubtotal - discountAmount, 0) + shippingTotal;
  const iva = taxableAmount * 0.16;
  const total = taxableAmount + iva;
  const revenue = Math.max(conceptsSubtotal - discountAmount, 0);
  const globalMargin = revenue > 0 ? ((revenue - totalCost) / revenue) * 100 : 0;
  const fmt   = (v) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;

  const sub = document.getElementById("q-subtotal");
  const ship = document.getElementById("q-shipping");
  const tax = document.getElementById("q-iva");
  const tot = document.getElementById("q-total");
  const margin = document.getElementById("q-global-margin");

  if (sub) sub.textContent = fmt(conceptsSubtotal);
  if (ship) ship.textContent = fmt(shippingTotal);
  if (tax) tax.textContent = fmt(iva);
  if (tot) tot.textContent = fmt(total);
  if (margin) {
    margin.textContent = `${globalMargin.toFixed(1)}%`;
    margin.classList.toggle("is-negative", globalMargin < 0);
  }
}

function syncQuoteFooterInputs() {
  const conditionsEl = document.getElementById("quote-conditions-text");
  const discountTypeEl = document.getElementById("q-discount-type");
  const discountValEl = document.getElementById("q-discount-val");

  if (conditionsEl && document.activeElement !== conditionsEl) {
    conditionsEl.value = window.AppState.quoteConditions || getDefaultQuoteConditions();
  }
  if (discountTypeEl && document.activeElement !== discountTypeEl) {
    discountTypeEl.value = window.AppState.quoteDiscountType || "percent";
  }
  if (discountValEl && document.activeElement !== discountValEl) {
    discountValEl.value = Number(window.AppState.quoteDiscountValue) || 0;
  }
}

function renderOverview() {
  const quote = buildCurrentQuoteObject();

  const folioEl = document.getElementById("overview-folio");
  if (folioEl) folioEl.textContent = quote.id;

  const dateEl = document.getElementById("overview-date");
  if (dateEl) dateEl.textContent = `Fecha: ${new Date(quote.createdAt).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}`;

  const statusEl = document.getElementById("overview-status-badge");
  if (statusEl) {
    const statusLabels = { draft: 'Borrador', sent: 'Enviada', reserved: 'Reservada' };
    statusEl.innerHTML = `<span class="ql-status-badge ql-status-badge--${quote.status}">${statusLabels[quote.status] || 'Borrador'}</span>`;
  }

  const clientEl = document.getElementById("overview-client-info");
  if (clientEl) {
    const client = window.AppState.clients.find(c => c.id === window.AppState.quoteClientId);
    if (client) {
      clientEl.innerHTML = `
        <div style="font-weight:700; color:var(--text-main);">${client.nombre}</div>
        <div style="font-size:12px; color:var(--color-accent); font-weight:600;">${client.empresa || '—'}</div>
        <div style="font-size:11px; color:var(--text-secondary); margin-top:4px;">RFC: ${client.rfc || '—'} | Tel: ${client.telefono || '—'}</div>
        <div style="font-size:11px; color:var(--text-secondary);">${client.correo || ''} ${client.direccion ? '| ' + client.direccion : ''}</div>
      `;
    } else {
      clientEl.innerHTML = `<span class="overview-no-client">Público General</span>`;
    }
  }

  const sellerEl = document.getElementById("overview-seller-name");
  const validityEl = document.getElementById("overview-validity-date");
  if (sellerEl) {
    sellerEl.textContent = getSellerLabel(quote.sellerId);
  }
  if (validityEl) {
    if (quote.validityDate) {
      const formattedDate = new Date(quote.validityDate + "T12:00:00").toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });
      validityEl.textContent = formattedDate;
    } else {
      validityEl.textContent = "Sin fecha de vencimiento";
    }
  }

  const countEl = document.getElementById("overview-item-count");
  if (countEl) countEl.textContent = quote.items.length;

  const tbody = document.getElementById("overview-items-tbody");
  if (tbody) {
    tbody.innerHTML = quote.items.map(item => {
      const sub = item.lineSubtotal ?? ((item.unitPrice * item.quantity) + (item.clientShippingCost || 0));
      return `
        <tr>
          <td>
            <strong>${item.product.nombre}</strong><br/>
            <small style="color:var(--text-secondary);">SKU: ${item.product.codigo} | ${item.product.marca}</small>
            ${item.deliveryNote ? `<br/><small style="color:var(--text-secondary);">Entrega: ${escapeQuoteHtml(item.deliveryNote)}</small>` : ""}
          </td>
          <td class="center">$${item.unitPrice.toFixed(2)}</td>
          <td class="center">${item.quantity}</td>
          <td class="right"><strong>$${sub.toFixed(2)}</strong></td>
        </tr>
      `;
    }).join("");
  }

  const fmt    = (v) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;
  const ovSub  = document.getElementById("ov-subtotal");
  const ovIva  = document.getElementById("ov-iva");
  const ovTot  = document.getElementById("ov-total");
  if (ovSub) ovSub.textContent = fmt(quote.subtotal);
  if (ovIva) ovIva.textContent = fmt(quote.tax);
  if (ovTot) ovTot.textContent = fmt(quote.total);

  const exportActions = document.getElementById("overview-export-actions");
  if (exportActions) {
    exportActions.setAttribute("data-visible", quote.items.length > 0 ? "true" : "false");
  }

  document.getElementById("quote-btn-whatsapp")?.addEventListener("click", exportQuoteToWhatsApp);
  document.getElementById("quote-btn-pdf")?.addEventListener("click", exportQuoteToPDF);

  createLucideIcons();
}

function buildCurrentQuoteObject() {
  const existingQuote = window.AppState.currentQuoteId
    ? window.AppState.quotations.find(q => q.id === window.AppState.currentQuoteId)
    : null;

  let conceptsSubtotal = 0;
  let shippingTotal = 0;
  let totalCost = 0;
  const items = window.AppState.quoteItems.map(item => {
    const line = normalizeQuoteLine(item);
    const sub = getQuoteLineSubtotal(line);
    conceptsSubtotal += line.unitPrice * line.quantity;
    shippingTotal += line.clientShippingCost;
    totalCost += getQuoteLineCost(line) * line.quantity;
    return {
      productId: line.product.codigo,
      product: line.product,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      baseCost: line.baseCost,
      transferCost: line.transferCost,
      clientShippingCost: line.clientShippingCost,
      deliveryNote: line.deliveryNote,
      utilityType: line.utilityType,
      utilityValue: line.utilityValue,
      lineMargin: getQuoteLineMargin(line),
      lineSubtotal: sub
    };
  });

  const discountType = window.AppState.quoteDiscountType || "percent";
  const discountValue = Number(window.AppState.quoteDiscountValue) || 0;
  const discountAmount = getQuoteDiscountAmount(conceptsSubtotal);
  const subtotal = Math.max(conceptsSubtotal - discountAmount, 0) + shippingTotal;
  const tax = subtotal * 0.16;
  const total = subtotal + tax;
  const globalMargin = conceptsSubtotal > 0
    ? ((Math.max(conceptsSubtotal - discountAmount, 0) - totalCost) / Math.max(conceptsSubtotal - discountAmount, 1)) * 100
    : 0;

  return {
    id: existingQuote ? existingQuote.id : generateQuoteFolio(),
    status: existingQuote ? existingQuote.status : 'draft',
    currentStep: window.AppState.quoteStep || 1,
    clientId: window.AppState.quoteClientId || "",
    sellerId: window.AppState.quoteSellerId || "",
    validityDate: window.AppState.quoteValidityDate || "",
    conditions: window.AppState.quoteConditions || getDefaultQuoteConditions(),
    discountType,
    discountValue,
    discountAmount,
    conceptsSubtotal,
    shippingTotal,
    globalMargin,
    items,
    subtotal,
    tax,
    total,
    createdAt: existingQuote ? existingQuote.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sentAt: existingQuote ? existingQuote.sentAt : null,
    reservedAt: existingQuote ? existingQuote.reservedAt : null
  };
}

function confirmQuotation() {
  if (window.AppState.quoteItems.length === 0) {
    showToast("No hay artículos en la cotización.", "warning");
    return;
  }

  const quote = buildCurrentQuoteObject();
  quote.status = 'reserved';
  quote.reservedAt = new Date().toISOString();

  const idx = window.AppState.quotations.findIndex(q => q.id === quote.id);
  if (idx !== -1) {
    window.AppState.quotations[idx] = quote;
  } else {
    window.AppState.quotations.push(quote);
  }
  window.AppState.currentQuoteId = quote.id;

  saveQuotationsToStorage();
  showToast(`Cotización ${quote.id} confirmada 🎉`, "success");

  renderOverview();
  renderStepFooter(3);

  if (window.SyncManager && typeof window.SyncManager.syncQuote === "function") {
    window.SyncManager.syncQuote(quote).then(() => {
      saveQuotationsToStorage();
    }).catch(err => {
      console.error("Failed to sync quotation:", err);
    });
  }
}

function saveDraftQuotation() {
  if (window.AppState.quoteItems.length === 0 && !window.AppState.currentQuoteId) return;

  const quote = buildCurrentQuoteObject();
  quote.status = 'draft';

  const idx = window.AppState.quotations.findIndex(q => q.id === quote.id);
  if (idx !== -1) {
    window.AppState.quotations[idx] = quote;
  } else {
    window.AppState.quotations.push(quote);
  }
  window.AppState.currentQuoteId = quote.id;
  saveQuotationsToStorage();

  if (window.SyncManager && typeof window.SyncManager.syncQuote === "function") {
    window.SyncManager.syncQuote(quote).then(() => {
      saveQuotationsToStorage();
    }).catch(err => {
      console.error("Failed to sync quotation:", err);
    });
  }
}

function renderQuotationsList() {
  const grid = document.getElementById("quote-list-grid");
  if (!grid) return;

  const searchQuery = (document.getElementById("quote-list-search")?.value || "").trim().toLowerCase();

  let filtered = window.AppState.quotations;
  if (window.AppState.qlFilter !== 'all') {
    filtered = filtered.filter(q => q.status === window.AppState.qlFilter);
  }
  if (searchQuery) {
    filtered = filtered.filter(q => {
      const client = window.AppState.clients.find(c => c.id === q.clientId);
      const clientName = client ? (client.nombre + " " + client.empresa).toLowerCase() : "público general";
      const matchesProduct = q.items && q.items.some(item =>
        (item.product && item.product.nombre || "").toLowerCase().includes(searchQuery) ||
        (item.product && item.product.codigo || "").toLowerCase().includes(searchQuery)
      );
      return q.id.toLowerCase().includes(searchQuery) || clientName.includes(searchQuery) || matchesProduct;
    });
  }

  const all      = window.AppState.quotations.length;
  const drafts   = window.AppState.quotations.filter(q => q.status === 'draft').length;
  const sent     = window.AppState.quotations.filter(q => q.status === 'sent').length;
  const reserved = window.AppState.quotations.filter(q => q.status === 'reserved').length;

  const badgeAll      = document.getElementById("ql-badge-all");
  const badgeDraft    = document.getElementById("ql-badge-draft");
  const badgeSent     = document.getElementById("ql-badge-sent");
  const badgeReserved = document.getElementById("ql-badge-reserved");

  if (badgeAll)      badgeAll.textContent      = all;
  if (badgeDraft)    badgeDraft.textContent    = drafts;
  if (badgeSent)     badgeSent.textContent     = sent;
  if (badgeReserved) badgeReserved.textContent = reserved;

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="quote-empty-state" style="grid-column: 1 / -1;">No hay cotizaciones que coincidan con los filtros.</div>`;
    return;
  }

  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const statusLabels = { draft: 'Borrador', sent: 'Enviada', reserved: 'Reservada' };
  const fmt = (v) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  grid.innerHTML = filtered.map(q => {
    const client        = window.AppState.clients.find(c => c.id === q.clientId);
    const clientName    = client ? client.nombre : "Público General";
    const clientEmpresa = client ? client.empresa : "";
    const date          = new Date(q.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });

    return `
      <div class="quotation-card" data-quote-id="${q.id}">
        <div class="quotation-card__header">
          <span class="quotation-card__folio">${q.id}</span>
          <span class="ql-status-badge ql-status-badge--${q.status}">${statusLabels[q.status]}</span>
        </div>
        <div class="quotation-card__client">${clientName}${clientEmpresa ? ' — ' + clientEmpresa : ''}</div>
        <div class="quotation-card__items-count">${q.items.length} artículo${q.items.length !== 1 ? 's' : ''}</div>
        <div class="quotation-card__footer">
          <span class="quotation-card__total">${fmt(q.total)} MXN</span>
          <span class="quotation-card__date">${date}</span>
        </div>
        <div class="quotation-card__actions" style="margin-top: 4px;">
          <button class="btn-action-small" data-action="view" data-qid="${q.id}" title="Ver / Editar">
            <i data-lucide="eye" style="width:15px;height:15px;"></i>
          </button>
          <button class="btn-action-small" data-action="duplicate" data-qid="${q.id}" title="Duplicar">
            <i data-lucide="copy" style="width:15px;height:15px;"></i>
          </button>
          <button class="btn-action-small btn-action-small--danger" data-action="delete" data-qid="${q.id}" title="Eliminar">
            <i data-lucide="trash-2" style="width:15px;height:15px;"></i>
          </button>
        </div>
      </div>
    `;
  }).join("");

  grid.querySelectorAll("[data-action='view']").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const qid   = btn.getAttribute("data-qid");
      const quote = window.AppState.quotations.find(q => q.id === qid);
      if (quote) {
        const targetStep = quote.status !== 'draft' ? 3 : quote.currentStep || 1;
        window.location.hash = `#/quotation/${qid}/step${targetStep}`;
      }
    });
  });

  grid.querySelectorAll("[data-action='duplicate']").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const qid      = btn.getAttribute("data-qid");
      const original = window.AppState.quotations.find(q => q.id === qid);
      if (original) {
        const dup      = JSON.parse(JSON.stringify(original));
        dup.id         = generateQuoteFolio();
        dup.status     = 'draft';
        dup.createdAt  = new Date().toISOString();
        dup.updatedAt  = new Date().toISOString();
        dup.sentAt     = null;
        dup.reservedAt = null;
        window.AppState.quotations.push(dup);
        saveQuotationsToStorage();
        showToast(`Cotización duplicada como ${dup.id}`, "success");
        renderQuotationsList();
      }
    });
  });

  grid.querySelectorAll("[data-action='delete']").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const qid = btn.getAttribute("data-qid");
      if (confirm(`¿Eliminar la cotización ${qid}?`)) {
        const quoteToDelete = window.AppState.quotations.find(q => q.id === qid);
        window.AppState.quotations = window.AppState.quotations.filter(q => q.id !== qid);
        saveQuotationsToStorage();
        showToast("Cotización eliminada.", "danger");
        renderQuotationsList();

        if (quoteToDelete && quoteToDelete.airtable_id && window.SyncManager && typeof window.SyncManager.deleteQuoteFromAirtable === "function") {
          window.SyncManager.deleteQuoteFromAirtable(quoteToDelete.airtable_id).catch(err => {
            console.error("Failed to delete quote from Airtable:", err);
          });
        }
      }
    });
  });

  grid.querySelectorAll(".quotation-card").forEach(card => {
    card.addEventListener("click", () => {
      const qid   = card.getAttribute("data-quote-id");
      const quote = window.AppState.quotations.find(q => q.id === qid);
      if (quote) {
        const targetStep = quote.status !== 'draft' ? 3 : quote.currentStep || 1;
        window.location.hash = `#/quotation/${qid}/step${targetStep}`;
      }
    });
  });

  createLucideIcons();
}

function exportQuoteToWhatsApp() {
  if (window.AppState.quoteItems.length === 0) {
    showToast("Agrega productos a la cotización primero.", "warning");
    return;
  }

  const client     = window.AppState.clients.find(c => c.id === window.AppState.quoteClientId);
  const clientName = client ? `${client.nombre} (${client.empresa || ''})` : "Público General";
  const quote      = buildCurrentQuoteObject();

  const users = typeof window.UserScope?.getUsers === "function" ? window.UserScope.getUsers() : [];
  const seller = users.find(u => u.id === quote.sellerId);
  const sellerName = seller ? seller.name : "Sin asignar";

  let text = `*COTIZACIÓN - KITCHEN VALENZUELA*\n`;
  text += `*Folio:* ${quote.id}\n`;
  text += `*Cliente:* ${clientName}\n`;
  text += `*Vendedor:* ${sellerName}\n`;
  if (quote.validityDate) {
    const validityStr = new Date(quote.validityDate + "T12:00:00").toLocaleDateString("es-MX", { day:"2-digit", month:"2-digit", year:"numeric" });
    text += `*Válida hasta:* ${validityStr}\n`;
  }
  text += `*Fecha:* ${new Date().toLocaleDateString()}\n`;
  text += `--------------------------------------\n\n`;

  quote.items.forEach(item => {
    const shipping = Number(item.clientShippingCost) || 0;
    const sub = item.lineSubtotal ?? ((item.unitPrice * item.quantity) + shipping);
    text += `• *${item.product.nombre}*\n  Cant: ${item.quantity} ${item.product.unitCode} | P. Unit: $${item.unitPrice.toFixed(2)}`;
    if (shipping > 0) text += ` | Envío: $${shipping.toFixed(2)}`;
    text += ` | Subtotal: $${sub.toFixed(2)} MXN\n`;
    if (item.deliveryNote) text += `  Entrega: ${item.deliveryNote}\n`;
    text += `\n`;
  });

  text += `--------------------------------------\n`;
  text += `*Subtotal:* $${quote.subtotal.toFixed(2)} MXN\n`;
  text += `*IVA (16%):* $${quote.tax.toFixed(2)} MXN\n`;
  text += `*Total Estimado:* $${quote.total.toFixed(2)} MXN\n\n`;
  text += `_Precios sujetos a cambio sin previo aviso. Gracias por su preferencia._`;

  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");

  if (window.AppState.currentQuoteId) {
    const q = window.AppState.quotations.find(x => x.id === window.AppState.currentQuoteId);
    if (q && q.status === 'draft') {
      q.status = 'sent';
      q.sentAt = new Date().toISOString();
      saveQuotationsToStorage();
    }
  }
}

function exportQuoteToPDF() {
  if (window.AppState.quoteItems.length === 0) {
    showToast("Agrega productos a la cotización primero.", "warning");
    return;
  }

  const client = window.AppState.clients.find(c => c.id === window.AppState.quoteClientId);
  const clientName = client ? client.nombre : "Público General";
  const clientCompany = client ? (client.empresa || clientName) : "—";
  const clientPhone = client ? (client.telefono || "—") : "—";
  const clientEmail = client ? (client.correo || "") : "";
  const clientAddr = client ? (client.direccion || "—") : "—";
  const quote = buildCurrentQuoteObject();
  const dateNow = new Date();
  const dateStr = dateNow.toLocaleDateString("es-MX", { day:"2-digit", month:"2-digit", year:"numeric" }) + " " + dateNow.toLocaleTimeString("es-MX", { hour:"2-digit", minute:"2-digit" });

  function generateBarcodeSVG(text) {
    const str = String(text);
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
      [2,4,1,2,1,1],[2,2,1,1,1,4],[4,1,3,1,1,1],[2,4,1,1,1,2],[1,3,4,1,1,1],
      [1,1,1,2,4,2],[1,2,1,1,4,2],[1,2,1,2,4,1],[1,1,4,2,1,2],[1,2,4,1,1,2],
      [1,2,4,2,1,1],[4,1,1,2,1,2],[4,2,1,1,1,2],[4,2,1,2,1,1],[2,1,2,1,4,1],
      [2,1,4,1,2,1],[4,1,2,1,2,1],[1,1,1,1,4,3],[1,1,1,3,4,1],[1,3,1,1,4,1],
      [1,1,4,1,1,3],[1,1,4,3,1,1],[4,1,1,1,1,3],[4,1,1,3,1,1],[1,1,3,1,4,1],
      [1,1,4,1,3,1],[3,1,1,1,4,1],[4,1,1,1,3,1],[2,1,1,4,1,2],[2,1,1,2,1,4],
      [2,1,1,2,3,2],[2,3,3,1,1,1,2]
    ];

    const START_B = [2,1,1,2,1,4];
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
    const BAR_H = 42;
    const TEXT_H = 10;
    const TOTAL_H = BAR_H + TEXT_H;

    const dataW = mods.reduce((s, m) => s + m.w, 0);
    const totalW = QUIET * 2 + dataW;

    let rects = '';
    let x = QUIET;
    for (const { w, bar } of mods) {
      if (bar) {
        rects += '<rect x="' + x + '" y="0" width="' + w + '" height="' + BAR_H + '" fill="#0d0d0d"/>';
      }
      x += w;
    }

    const midX = (totalW / 2).toFixed(1);
    const escaped = str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    return '<svg viewBox="0 0 ' + totalW + ' ' + TOTAL_H + '" xmlns="http://www.w3.org/2000/svg" ' +
      'shape-rendering="crispEdges" style="width:' + Math.min(totalW * 1.5, 220) + 'px;height:52px;display:block;margin-top:8px">' +
      '<rect width="' + totalW + '" height="' + TOTAL_H + '" fill="#ffffff"/>' +
      rects +
      '<text x="' + midX + '" y="' + (BAR_H + 8) + '" text-anchor="middle" ' +
      'font-family="\'Courier New\',Courier,monospace" font-size="7" ' +
      'font-weight="700" letter-spacing="1.5" fill="#0d0d0d">' + escaped + '</text>' +
      '</svg>';
  }

  let itemsHtml = quote.items.map((item, idx) => {
    const shipping = Number(item.clientShippingCost) || 0;
    const sub = item.lineSubtotal ?? ((item.unitPrice * item.quantity) + shipping);
    const itemTax = sub * 0.16;
    
    // Resolve product image
    const imgUrl = window.Config && typeof window.Config.resolveImageUrl === "function"
      ? window.Config.resolveImageUrl(item.product.imagen)
      : null;

    let imgHtml = '';
    if (imgUrl) {
      imgHtml = `<img src="${imgUrl}" alt="${item.product.nombre}" style="width: 100%; height: 100%; object-fit: contain; display: block;" />`;
    } else {
      imgHtml = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="#999" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`;
    }

    return `
      <tr>
        <td class="center">${idx + 1}</td>
        <td class="center"><div class="item-img">${imgHtml}</div></td>
        <td>
          <div class="item-name">${item.product.nombre}</div>
          <div class="item-sku">SKU: ${item.product.codigo} &nbsp;|&nbsp; Marca: ${item.product.marca || '—'}</div>
          ${item.deliveryNote ? `<div class="item-sku">Entrega: ${escapeQuoteHtml(item.deliveryNote)}</div>` : ""}
        </td>
        <td class="center">${item.quantity.toFixed(2)} ${item.product.unitCode || 'Pz'}</td>
        <td class="right">$${item.unitPrice.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
        <td class="right">$${itemTax.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
        <td class="right">$${shipping.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
        <td class="right">$${sub.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
      </tr>
    `;
  }).join("");

  const barcodeSVG = generateBarcodeSVG(quote.id);
  const printWin = window.open("", "_blank");
  printWin.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Cotización ${quote.id} – Kitchen Valenzuela</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #f0ece8;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 12px;
    color: #1a1a1a;
    display: flex;
    justify-content: center;
    padding: 40px 16px;
  }
  .page {
    background: #ffffff;
    width: 794px;
    min-height: 1123px;
    padding: 48px 52px;
    box-shadow: 0 2px 24px rgba(0,0,0,0.10);
    display: flex;
    flex-direction: column;
  }
  .logo-wrap { display: flex; justify-content: center; margin-bottom: 30px; }
  .logo-wrap img { height: 70px; width: auto; display: block; }
  .header-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
  .col-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; margin-bottom: 4px; }
  .party-name { font-size: 14px; font-weight: 700; margin-bottom: 6px; color: #111; }
  .party-details { line-height: 1.5; color: #333; font-size: 12px; }
  .quote-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 30px; }
  .quote-table thead tr { background: #f4f4f4; border-top: 1px solid #e0e0e0; border-bottom: 1px solid #e0e0e0; }
  .quote-table thead th { padding: 10px 12px; font-weight: 600; font-size: 11px; text-transform: uppercase; color: #444; text-align: left; }
  .quote-table tbody tr { border-bottom: 1px solid #eeeeee; }
  .quote-table tbody td { padding: 10px 12px; vertical-align: middle; color: #333; }
  .right  { text-align: right; }
  .center { text-align: center; }
  .item-img { width: 32px; height: 32px; background: #f9f9f9; border: 1px solid #eee; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 14px; margin: 0 auto; }
  .item-name { font-size: 12px; font-weight: 600; color: #222; }
  .item-sku  { font-size: 11px; color: #777; margin-top: 2px; }
  .quote-table tfoot tr td { padding: 8px 12px; font-size: 12px; }
  .tfoot-border { border-top: 1px solid #e0e0e0; }
  .tfoot-label { text-align: right; color: #555; }
  .tfoot-value { font-weight: 600; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 50px; margin-top: auto; padding-top: 40px; }
  .sig-block { display: flex; flex-direction: column; }
  .sig-name { font-weight: 600; font-size: 12px; color: #333; margin-bottom: 55px; }
  .sig-line-wrap { width: 100%; max-width: 250px; }
  .sig-line { border-top: 1px solid #aaa; margin-bottom: 4px; }
  .sig-label { font-size: 11px; color: #777; }
  @media print {
    body { background: none; padding: 0; }
    .page { box-shadow: none; width: 100%; min-height: auto; padding: 20px; }
  }
</style>
</head>
<body>
<div class="page">
  <!-- LOGO / QR HEADER -->
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 1px solid #f0ece8; padding-bottom: 15px;">
    <div style="display: flex; align-items: center;">
      <img src="https://my.newfacecards.com/wp-content/uploads/2026/06/Valenzuela-Logo.png" alt="Kitchen Valenzuela" style="height: 65px; width: auto; display: block;">
    </div>
    <div style="display: flex; align-items: center; gap: 10px;">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=55x55&data=${quote.id}" 
           alt="QR" style="width: 55px; height: 55px; border: 1px solid #ddd; padding: 2px; background: #fff;" />
      <div style="text-align: left;">
        <strong style="font-size: 9px; display: block; color: #111; text-transform: uppercase; letter-spacing: 0.5px;">Folio Cotización</strong>
        <span style="font-size: 8px; color: #666; display: block; line-height: 1.2;">Escanea para consultar<br>referencia rápida</span>
      </div>
    </div>
  </div>

  <div class="header-grid">
    <div>
      <div class="col-label">Para:</div>
      <div class="party-name">${clientCompany}</div>
      <div class="party-details">
        ${clientAddr}<br>
        Tel: ${clientPhone}<br>
        ${clientEmail ? 'Email: ' + clientEmail : ''}
      </div>
      <div style="margin-top: 30px;">
        <div class="party-name" style="font-size: 13px; margin-bottom: 4px;">Kitchen Clean Valenzuela</div>
        <div class="party-details" style="font-size: 11.5px; color: #555;">
          Tienda Kitchen Clean<br>
          Av. Leona Vicario s/n, entre Adolfo Ruiz<br>
          Cortines y Adolfo Lopez Mateos. Colonia<br>
          Ejidal Chamizal, CP 23470, Cabo San Lucas,<br>
          B.C.S.<br>
          Tel: 6241643396<br>
          Email: ventas@kitchencleanvalenzuela.com
        </div>
      </div>
    </div>
    <div style="display: flex; flex-direction: column; align-items: flex-end;">
      <div style="width: 100%; max-width: 280px; text-align: left;">
        <div class="col-label">De:</div>
        <div class="party-name">Kitchen Clean Valenzuela</div>
        <div class="party-details">
          Av. Leona Vicario s/n, entre Adolfo Ruiz<br>
          Cortines y Adolfo López Mateos. Colonia<br>
          Ejidal Chamizal<br>
          Cabos San Lucas 23470 Baja California Sur<br>
          México<br>
          Tel: 6242250029<br>
          Email: ventas@kitchencleanvalenzuela.com<br>
          Fecha: ${dateStr}<br>
          Referencia: ${quote.id}
        </div>
        <div class="barcode-wrap">
          ${barcodeSVG}
        </div>
      </div>
    </div>
  </div>
  <table class="quote-table">
    <thead>
      <tr>
        <th style="width: 30px;" class="center">No.</th>
        <th style="width: 50px;" class="center">Imagen</th>
        <th>Descripción</th>
        <th style="width: 80px;" class="center">Cantidad</th>
        <th style="width: 110px;" class="right">Precio Unitario</th>
        <th style="width: 110px;" class="right">Impuestos</th>
        <th style="width: 90px;" class="right">Envío</th>
        <th style="width: 110px;" class="right">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="4"></td>
        <td class="tfoot-label tfoot-border" colspan="2">Total (MXN)</td>
        <td class="right tfoot-border">$0.00</td>
        <td class="right tfoot-border tfoot-value">$${quote.subtotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr>
        <td colspan="6"></td>
        <td class="tfoot-label">Impuesto (MXN)</td>
        <td class="right tfoot-value">$${quote.tax.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr style="font-size: 13px; font-weight: 700;">
        <td colspan="6"></td>
        <td class="tfoot-label" style="color: #000;">Cantidad Total (MXN)</td>
        <td class="right" style="color: #000;">$${quote.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
      </tr>
    </tfoot>
  </table>
  <div class="signatures">
    <div class="sig-block">
      <div class="sig-name">Vendedor: Kitchen Clean Valenzuela</div>
      <div class="sig-line-wrap">
        <div class="sig-line"></div>
        <div class="sig-label">Firma</div>
      </div>
    </div>
    <div class="sig-block" style="align-items: flex-end;">
      <div style="width: 100%; max-width: 250px;">
        <div class="sig-name">Cliente: ${clientCompany}</div>
        <div class="sig-line-wrap">
          <div class="sig-line"></div>
          <div class="sig-label">Firma</div>
        </div>
      </div>
    </div>
  </div>
</div>
<script>
  window.onload = function() { window.print(); };
</script>
</body>
</html>`);
  printWin.document.close();
}

async function syncAllQuotesFromCloud() {
  if (!window.SyncManager || typeof window.SyncManager.fetchAllQuotesFromAirtable !== "function") {
    console.warn("SyncManager or quote methods not available.");
    return;
  }

  const rawCloud    = await window.SyncManager.fetchAllQuotesFromAirtable();
  const cloudQuotes = rawCloud.map(rec => window.SyncManager.mapAirtableToLocalQuote(rec));

  const localQuotes = window.AppState.quotations || [];

  const unsyncedLocal = localQuotes.filter(q => q.sync_status !== "synced" || !q.airtable_id);
  for (const localQuote of unsyncedLocal) {
    try {
      await window.SyncManager.syncQuote(localQuote);
      console.log("Uploaded local quote:", localQuote.id);
    } catch (e) {
      console.warn("Failed to upload local quote during bulk sync:", localQuote.id, e);
    }
  }

  let finalCloudQuotes = cloudQuotes;
  if (unsyncedLocal.length > 0) {
    const reRawCloud = await window.SyncManager.fetchAllQuotesFromAirtable();
    finalCloudQuotes = reRawCloud.map(rec => window.SyncManager.mapAirtableToLocalQuote(rec));
  }

  const mergedQuotes = [...finalCloudQuotes];
  localQuotes.forEach(lq => {
    if (!lq.airtable_id || lq.sync_status !== "synced") {
      if (!mergedQuotes.some(mq => mq.id === lq.id)) {
        mergedQuotes.push(lq);
      }
    }
  });

  window.AppState.quotations = mergedQuotes;
  saveQuotationsToStorage();
  renderQuotationsList();
}
window.syncAllQuotesFromCloud = syncAllQuotesFromCloud;
