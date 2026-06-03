/**
 * quotation-screen.js
 * 3-step Stepper quotation engine, PDF print layout exporter, WhatsApp text composer, list card CRUD, and inline client creations.
 */

function createNewQuotation() {
  const quoteId = generateQuoteFolio();
  window.AppState.currentQuoteId = null;
  window.AppState.quoteItems = [];
  window.AppState.quoteStep = 1;
  window.AppState.quoteClientId = "";
  
  // Create and save the new draft in quotations list
  const newQuote = {
    id: quoteId,
    status: 'draft',
    currentStep: 1,
    clientId: "",
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

// Client panel status update helper
function updateClientPanelStatus(status) {
  const clientPanel = document.querySelector(".stepper-client-panel");
  if (clientPanel) {
    clientPanel.setAttribute("data-status", status);
  }
}

function setupQuotesUI() {
  // "New Quote" button - sets hash to new quote route
  document.getElementById("btn-new-quote")?.addEventListener("click", () => {
    window.location.hash = "#/quotation/new";
  });

  // Product search in step 1
  const searchInput = document.getElementById("quote-product-search");
  if (searchInput) {
    searchInput.addEventListener("input", renderQuoteProducts);
  }

  // Client select in step 2
  const selectClient = document.getElementById("quote-client-select");
  
  if (selectClient) {
    selectClient.addEventListener("change", () => {
      window.AppState.quoteClientId = selectClient.value;
      renderClientPreview();
      updateClientPanelStatus(selectClient.value ? "client-selected" : "no-client");
    });
  }

  // Dual Tab Glider logic for step 2
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
        // Clear new client form inputs
        ["sq-client-nombre", "sq-client-empresa", "sq-client-rfc", "sq-client-telefono", "sq-client-correo", "sq-client-direccion"].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = "";
        });
        updateClientPanelStatus("new-client");
      }
      createLucideIcons();
    });
  });

  // Save new client inline (step 2)
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

    // Trigger async sync to cloud
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
    const select = document.getElementById("quote-client-select");
    if (select) select.value = newId;
    renderClientPreview();
    
    // Switch tab back to "Cliente Existente"
    const tabExistente = document.querySelector('.client-glider-tab[data-tab="existente"]');
    if (tabExistente) {
      tabExistente.click();
    }
    
    // Clear inline form
    ["sq-client-nombre", "sq-client-empresa", "sq-client-rfc", "sq-client-telefono", "sq-client-correo", "sq-client-direccion"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    showToast(`Cliente "${nombre}" registrado y seleccionado.`, "success");
  });

  // Quotation list filters
  document.getElementById("quote-list-filters")?.addEventListener("click", (e) => {
    const tab = e.target.closest("[data-ql-filter]");
    if (!tab) return;
    document.querySelectorAll(".ql-filter-tab").forEach(t => t.classList.remove("ql-filter-tab--active"));
    tab.classList.add("ql-filter-tab--active");
    window.AppState.qlFilter = tab.getAttribute("data-ql-filter");
    renderQuotationsList();
  });

  // Quotation list search
  document.getElementById("quote-list-search")?.addEventListener("input", renderQuotationsList);

  // Stepper dot clicks (handled by window.goToStep wrapper for hash persistence)
  document.querySelectorAll("[data-step-dot]").forEach(dot => {
    dot.addEventListener("click", () => {
      const step = parseInt(dot.getAttribute("data-step-dot"));
      window.goToStep(step);
    });
  });
}

function showListView() {
  console.log("[QuotationDebug] showListView called");
  // Clear hash when showing list view
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

// Internal helper - updates UI only (no hash update)
function initStepContent(step) {
  console.log(`[QuotationDebug] initStepContent called with step: ${step}`);
  // Toggle step content visibility
  for (let i = 1; i <= 3; i++) {
    const panel = document.getElementById(`stepper-step-${i}`);
    if (panel) {
      panel.classList.toggle("stepper-step-content--active", i === step);
    }
  }

  // Update dots
  document.querySelectorAll("[data-step-dot]").forEach(dot => {
    const s = parseInt(dot.getAttribute("data-step-dot"));
    dot.classList.remove("active", "completed");
    if (s === step) dot.classList.add("active");
    else if (s < step) dot.classList.add("completed");
  });

  // Update lines
  document.querySelectorAll("[data-step-line]").forEach(line => {
    const s = parseInt(line.getAttribute("data-step-line"));
    line.classList.toggle("filled", s < step);
  });

  // Update labels
  document.querySelectorAll("[data-step-label]").forEach(label => {
    const s = parseInt(label.getAttribute("data-step-label"));
    label.classList.remove("active", "completed");
    if (s === step) label.classList.add("active");
    else if (s < step) label.classList.add("completed");
  });

  // Render step-specific content
  if (step === 2) {
    populateQuoteClients();
    const select = document.getElementById("quote-client-select");
    if (select) select.value = window.AppState.quoteClientId;
    renderClientPreview();
    updateClientPanelStatus(window.AppState.quoteClientId ? "client-selected" : "no-client");
  } else if (step === 3) {
    renderOverview();
  }

  console.log(`[QuotationDebug] initStepContent: calling renderStepFooter for step ${step}`);
  renderStepFooter(step);
}

// Initialize stepper from URL hash (for persistence after reload)
window.initStepperFromHash = function(quoteId, step) {
  console.log(`[QuotationDebug] initStepperFromHash called with quoteId: ${quoteId}, step: ${step}`);
  const quote = window.AppState.quotations.find(q => q.id === quoteId);
  if (quote) {
    console.log("[QuotationDebug] initStepperFromHash: quote found, mapping items");
    window.AppState.currentQuoteId = quoteId;
    window.AppState.quoteItems = quote.items.map(item => ({
      product: item.product,
      quantity: item.quantity
    }));
    window.AppState.quoteClientId = quote.clientId || "";
    window.AppState.quoteStep = step;
    
    showStepperView();
    syncReadOnlyState();
    
    // Always render sub-components to prevent empty tables on reload
    renderQuoteProducts();
    renderQuoteTable();
    populateQuoteClients();
    const select = document.getElementById("quote-client-select");
    if (select) select.value = window.AppState.quoteClientId;
    renderClientPreview();
    
    // Render without hash update (hash is already set)
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
      quantity: item.quantity
    }));
    window.AppState.quoteClientId = existingQuote.clientId || "";
  } else {
    window.AppState.currentQuoteId = null;
    window.AppState.quoteItems = [];
    window.AppState.quoteClientId = "";
  }
  window.AppState.quoteStep = targetStep || 1;
  showStepperView();
  renderQuoteProducts();
  renderQuoteTable();
  populateQuoteClients();
  const select = document.getElementById("quote-client-select");
  if (select) select.value = window.AppState.quoteClientId;
  renderClientPreview();
  createLucideIcons();
  initStepContent(window.AppState.quoteStep);
}

function isCurrentQuoteConfirmed() {
  const existingQuote = window.AppState.currentQuoteId ? window.AppState.quotations.find(q => q.id === window.AppState.currentQuoteId) : null;
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
  
  // Sort drafts by updatedAt descending, so we get the most recently updated one
  drafts.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  
  const draft = drafts[0];
  if (draft && draft.items && draft.items.length > 0) {
    const folioEl = document.getElementById("draft-alert-folio");
    if (folioEl) folioEl.textContent = draft.id;
    alertContainer.setAttribute("data-visible", "true");
    
    // Bind buttons
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
  // Validation before advancing
  if (step > window.AppState.quoteStep) {
    if (window.AppState.quoteStep === 1 && window.AppState.quoteItems.length === 0) {
      showToast("Agrega al menos un producto antes de continuar.", "warning");
      return;
    }
  }

  window.AppState.quoteStep = step;

  // Toggle step content visibility
  for (let i = 1; i <= 3; i++) {
    const panel = document.getElementById(`stepper-step-${i}`);
    if (panel) {
      panel.classList.toggle("stepper-step-content--active", i === step);
    }
  }

  // Update dots
  document.querySelectorAll("[data-step-dot]").forEach(dot => {
    const s = parseInt(dot.getAttribute("data-step-dot"));
    dot.classList.remove("active", "completed");
    if (s === step) dot.classList.add("active");
    else if (s < step) dot.classList.add("completed");
  });

  // Update lines
  document.querySelectorAll("[data-step-line]").forEach(line => {
    const s = parseInt(line.getAttribute("data-step-line"));
    line.classList.toggle("filled", s < step);
  });

  // Update labels
  document.querySelectorAll("[data-step-label]").forEach(label => {
    const s = parseInt(label.getAttribute("data-step-label"));
    label.classList.remove("active", "completed");
    if (s === step) label.classList.add("active");
    else if (s < step) label.classList.add("completed");
  });

  // Render step-specific content
  if (step === 2) {
    populateQuoteClients();
    const select = document.getElementById("quote-client-select");
    if (select) select.value = window.AppState.quoteClientId;
    renderClientPreview();
    updateClientPanelStatus(window.AppState.quoteClientId ? "client-selected" : "no-client");
  } else if (step === 3) {
    renderOverview();
  }

  // Render the footer bar
  renderStepFooter(step);
  syncReadOnlyState();
  createLucideIcons();
  
  // Update URL hash for persistence
  if (window.AppState.currentQuoteId) {
    window.navigateToQuotation(window.AppState.currentQuoteId, step);
    // Save draft before navigation
    saveDraftQuotation();
  }
}

// Expose for hash routing and stepper dots
window.goToStep = goToStep;

// Hash persistence helper
function updateQuotationHash(quoteId, step) {
  window.location.hash = `#/quotation/${quoteId}/step${step}`;
}

function renderStepFooter(step) {
  console.log(`[QuotationDebug] renderStepFooter called for step: ${step}`);
  removeStepFooter();

  const iconPricing = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`;
  const iconClient = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
  const iconResume = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;

  // Determine continue button text/icon
  let continueText = 'Continuar';
  let continueIcon = '<polyline points="9 18 15 12 9 6"></polyline>';

  // Check if this is a confirmed/sent quote being viewed
  const existingQuote = window.AppState.currentQuoteId ? window.AppState.quotations.find(q => q.id === window.AppState.currentQuoteId) : null;
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

        <!-- Back Button -->
        <button class="footer-nav-btn back" id="sf-back" aria-label="Regresar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:20px;height:20px">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
        </button>

        <!-- Middle Tabs Group -->
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

        <!-- Continue/Confirm Button -->
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

  // Bind footer events
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
      // Step 3: Confirm or Done
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

function populateQuoteClients() {
  const select = document.getElementById("quote-client-select");
  if (!select) return;
  const currentVal = select.value;
  select.innerHTML = `<option value="">-- Cliente General / Público --</option>` +
    window.AppState.clients.map(c => `<option value="${c.id}">${c.nombre} (${c.empresa || 'Empresa'})</option>`).join("");
  select.value = currentVal;
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
    const select = document.getElementById("quote-client-select");
    if (select) select.value = "";
    renderClientPreview();
    updateClientPanelStatus("no-client");
    saveDraftQuotation();
  });
}

function renderQuoteProducts() {
  const query = (document.getElementById("quote-product-search")?.value || "").trim().toLowerCase();
  const container = document.getElementById("quote-products-list");
  if (!container) return;

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
      <button class="quote-prod-add" data-add-sku="${p.codigo}">+</button>
    </div>
  `).join("");

  container.querySelectorAll(".quote-prod-add").forEach(btn => {
    btn.addEventListener("click", () => {
      const sku = btn.getAttribute("data-add-sku");
      const prod = window.AppState.products.find(p => p.codigo === sku);
      if (prod) addToQuote(prod);
    });
  });
}

function addToQuote(product) {
  const existing = window.AppState.quoteItems.find(item => item.product.codigo === product.codigo);
  if (existing) {
    existing.quantity += 1;
  } else {
    window.AppState.quoteItems.push({ product, quantity: 1 });
  }
  showToast(`Agregado: ${product.nombre}`, "success");
  renderQuoteTable();
}

function renderQuoteTable() {
  const tbody = document.getElementById("quote-items-tbody");
  const container = document.querySelector(".quote-items-container");
  if (!tbody) return;

  const isEmpty = window.AppState.quoteItems.length === 0;
  if (container) {
    container.setAttribute("data-empty", isEmpty ? "true" : "false");
  }

  if (isEmpty) {
    updateQuoteTotals(0);
    return;
  }

  tbody.innerHTML = window.AppState.quoteItems.map((item, idx) => {
    const p = item.product;
    const subtotal = p.precio * item.quantity;
    return `
      <tr>
        <td>
          <strong>${p.nombre}</strong><br/>
          <small style="color: var(--text-secondary);">SKU: ${p.codigo}</small>
        </td>
        <td class="center">$${p.precio.toFixed(2)}</td>
        <td class="center">
          <input type="number" min="0.1" step="0.1" value="${item.quantity}" class="quote-qty-input" data-idx="${idx}" />
        </td>
        <td class="right"><strong>$${subtotal.toFixed(2)}</strong></td>
        <td class="center">
          <button class="quote-item-delete" data-idx="${idx}"><i data-lucide="trash-2" style="width:16px;height:16px;"></i></button>
        </td>
      </tr>
    `;
  }).join("");

  tbody.querySelectorAll(".quote-qty-input").forEach(input => {
    input.addEventListener("input", () => {
      const idx = parseInt(input.getAttribute("data-idx"));
      const val = parseFloat(input.value) || 0;
      if (val > 0) {
        window.AppState.quoteItems[idx].quantity = val;
        recalculateQuote();
      }
    });
  });

  tbody.querySelectorAll(".quote-item-delete").forEach(btn => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.getAttribute("data-idx"));
      window.AppState.quoteItems.splice(idx, 1);
      renderQuoteTable();
    });
  });

  recalculateQuote();
  createLucideIcons();
}

function recalculateQuote() {
  let subtotal = 0;
  window.AppState.quoteItems.forEach(item => {
    subtotal += item.product.precio * item.quantity;
  });
  updateQuoteTotals(subtotal);
}

function updateQuoteTotals(subtotal) {
  const iva = subtotal * 0.16;
  const total = subtotal + iva;
  const fmt = (v) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;

  const sub = document.getElementById("q-subtotal");
  const tax = document.getElementById("q-iva");
  const tot = document.getElementById("q-total");

  if (sub) sub.textContent = fmt(subtotal);
  if (tax) tax.textContent = fmt(iva);
  if (tot) tot.textContent = fmt(total);
}

function renderOverview() {
  const quote = buildCurrentQuoteObject();

  // Folio
  const folioEl = document.getElementById("overview-folio");
  if (folioEl) folioEl.textContent = quote.id;

  // Date
  const dateEl = document.getElementById("overview-date");
  if (dateEl) dateEl.textContent = `Fecha: ${new Date(quote.createdAt).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}`;

  // Status badge
  const statusEl = document.getElementById("overview-status-badge");
  if (statusEl) {
    const statusLabels = { draft: 'Borrador', sent: 'Enviada', reserved: 'Reservada' };
    statusEl.innerHTML = `<span class="ql-status-badge ql-status-badge--${quote.status}">${statusLabels[quote.status] || 'Borrador'}</span>`;
  }

  // Client info
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

  // Items count
  const countEl = document.getElementById("overview-item-count");
  if (countEl) countEl.textContent = quote.items.length;

  // Items table
  const tbody = document.getElementById("overview-items-tbody");
  if (tbody) {
    tbody.innerHTML = quote.items.map(item => {
      const sub = item.unitPrice * item.quantity;
      return `
        <tr>
          <td>
            <strong>${item.product.nombre}</strong><br/>
            <small style="color:var(--text-secondary);">SKU: ${item.product.codigo} | ${item.product.marca}</small>
          </td>
          <td class="center">$${item.unitPrice.toFixed(2)}</td>
          <td class="center">${item.quantity}</td>
          <td class="right"><strong>$${sub.toFixed(2)}</strong></td>
        </tr>
      `;
    }).join("");
  }

  // Totals
  const fmt = (v) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;
  const ovSub = document.getElementById("ov-subtotal");
  const ovIva = document.getElementById("ov-iva");
  const ovTot = document.getElementById("ov-total");
  if (ovSub) ovSub.textContent = fmt(quote.subtotal);
  if (ovIva) ovIva.textContent = fmt(quote.tax);
  if (ovTot) ovTot.textContent = fmt(quote.total);

  // Show export actions only if confirmed
  const exportActions = document.getElementById("overview-export-actions");
  const existingQuote = window.AppState.currentQuoteId ? window.AppState.quotations.find(q => q.id === window.AppState.currentQuoteId) : null;
  if (exportActions) {
    const isConfirmed = existingQuote && existingQuote.status !== 'draft';
    exportActions.setAttribute("data-visible", isConfirmed ? "true" : "false");
  }

  // Bind export buttons
  document.getElementById("quote-btn-whatsapp")?.addEventListener("click", exportQuoteToWhatsApp);
  document.getElementById("quote-btn-pdf")?.addEventListener("click", exportQuoteToPDF);

  createLucideIcons();
}

function buildCurrentQuoteObject() {
  const existingQuote = window.AppState.currentQuoteId ? window.AppState.quotations.find(q => q.id === window.AppState.currentQuoteId) : null;

  let subtotal = 0;
  const items = window.AppState.quoteItems.map(item => {
    const sub = item.product.precio * item.quantity;
    subtotal += sub;
    return {
      productId: item.product.codigo,
      product: item.product,
      quantity: item.quantity,
      unitPrice: item.product.precio
    };
  });

  const tax = subtotal * 0.16;
  const total = subtotal + tax;

  return {
    id: existingQuote ? existingQuote.id : generateQuoteFolio(),
    status: existingQuote ? existingQuote.status : 'draft',
    currentStep: window.AppState.quoteStep || 1,
    clientId: window.AppState.quoteClientId || "",
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

  // Upsert
  const idx = window.AppState.quotations.findIndex(q => q.id === quote.id);
  if (idx !== -1) {
    window.AppState.quotations[idx] = quote;
  } else {
    window.AppState.quotations.push(quote);
  }
  window.AppState.currentQuoteId = quote.id;

  saveQuotationsToStorage();
  showToast(`Cotización ${quote.id} confirmada 🎉`, "success");

  // Re-render overview with export buttons
  renderOverview();
  renderStepFooter(3);
}

function saveDraftQuotation() {
  if (window.AppState.quoteItems.length === 0) return;

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

  // Update badges
  const all = window.AppState.quotations.length;
  const drafts = window.AppState.quotations.filter(q => q.status === 'draft').length;
  const sent = window.AppState.quotations.filter(q => q.status === 'sent').length;
  const reserved = window.AppState.quotations.filter(q => q.status === 'reserved').length;
  
  const badgeAll = document.getElementById("ql-badge-all");
  const badgeDraft = document.getElementById("ql-badge-draft");
  const badgeSent = document.getElementById("ql-badge-sent");
  const badgeReserved = document.getElementById("ql-badge-reserved");
  
  if (badgeAll) badgeAll.textContent = all;
  if (badgeDraft) badgeDraft.textContent = drafts;
  if (badgeSent) badgeSent.textContent = sent;
  if (badgeReserved) badgeReserved.textContent = reserved;

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="quote-empty-state" style="grid-column: 1 / -1;">No hay cotizaciones que coincidan con los filtros.</div>`;
    return;
  }

  // Sort by most recent
  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const statusLabels = { draft: 'Borrador', sent: 'Enviada', reserved: 'Reservada' };
  const fmt = (v) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  grid.innerHTML = filtered.map(q => {
    const client = window.AppState.clients.find(c => c.id === q.clientId);
    const clientName = client ? client.nombre : "Público General";
    const clientEmpresa = client ? client.empresa : "";
    const date = new Date(q.createdAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });

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

  // Bind card actions - use hash-based navigation
  grid.querySelectorAll("[data-action='view']").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const qid = btn.getAttribute("data-qid");
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
      const qid = btn.getAttribute("data-qid");
      const original = window.AppState.quotations.find(q => q.id === qid);
      if (original) {
        const dup = JSON.parse(JSON.stringify(original));
        dup.id = generateQuoteFolio();
        dup.status = 'draft';
        dup.createdAt = new Date().toISOString();
        dup.updatedAt = new Date().toISOString();
        dup.sentAt = null;
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
        window.AppState.quotations = window.AppState.quotations.filter(q => q.id !== qid);
        saveQuotationsToStorage();
        showToast("Cotización eliminada.", "danger");
        renderQuotationsList();
      }
    });
  });

  // Clicking the card itself opens it (via hash route)
  grid.querySelectorAll(".quotation-card").forEach(card => {
    card.addEventListener("click", () => {
      const qid = card.getAttribute("data-quote-id");
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

  const client = window.AppState.clients.find(c => c.id === window.AppState.quoteClientId);
  const clientName = client ? `${client.nombre} (${client.empresa || ''})` : "Público General";
  const quote = buildCurrentQuoteObject();

  let text = `*COTIZACIÓN - KITCHEN VALENZUELA*\n`;
  text += `*Folio:* ${quote.id}\n`;
  text += `*Cliente:* ${clientName}\n`;
  text += `*Fecha:* ${new Date().toLocaleDateString()}\n`;
  text += `--------------------------------------\n\n`;

  quote.items.forEach(item => {
    const sub = item.unitPrice * item.quantity;
    text += `• *${item.product.nombre}*\n  Cant: ${item.quantity} ${item.product.unitCode} | P. Unit: $${item.unitPrice.toFixed(2)} | Subtotal: $${sub.toFixed(2)} MXN\n\n`;
  });

  text += `--------------------------------------\n`;
  text += `*Subtotal:* $${quote.subtotal.toFixed(2)} MXN\n`;
  text += `*IVA (16%):* $${quote.tax.toFixed(2)} MXN\n`;
  text += `*Total Estimado:* $${quote.total.toFixed(2)} MXN\n\n`;
  text += `_Precios sujetos a cambio sin previo aviso. Gracias por su preferencia._`;

  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");

  // Mark as sent
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
  const clientCompany = client ? client.empresa : "—";
  const clientRFC = client ? client.rfc : "—";
  const clientPhone = client ? client.telefono : "—";
  const clientEmail = client ? client.correo : "—";
  const clientAddr = client ? client.direccion : "—";
  const quote = buildCurrentQuoteObject();

  let itemsHtml = quote.items.map(item => {
    const sub = item.unitPrice * item.quantity;
    return `
      <tr>
        <td style="border-bottom:1px solid #ddd; padding:8px;">${item.product.nombre}<br/><small style="color:#666;">SKU: ${item.product.codigo} | Marca: ${item.product.marca}</small></td>
        <td style="border-bottom:1px solid #ddd; padding:8px; text-align:center;">$${item.unitPrice.toFixed(2)}</td>
        <td style="border-bottom:1px solid #ddd; padding:8px; text-align:center;">${item.quantity}</td>
        <td style="border-bottom:1px solid #ddd; padding:8px; text-align:right;">$${sub.toFixed(2)}</td>
      </tr>
    `;
  }).join("");

  const printWin = window.open("", "_blank");
  printWin.document.write(`
    <html>
      <head>
        <title>Cotización ${quote.id} - Kitchen Valenzuela</title>
        <style>
          body { font-family: sans-serif; padding: 40px; color: #333; }
          .header-table { width: 100%; margin-bottom: 30px; }
          .title { font-size: 24px; font-weight: bold; color: #007aff; }
          .meta-table { width: 100%; margin-bottom: 30px; font-size: 13px; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          .totals-table { width: 300px; margin-left: auto; border-collapse: collapse; }
          .footer { margin-top: 50px; font-size: 11px; text-align: center; color: #666; }
        </style>
      </head>
      <body>
        <table class="header-table">
          <tr>
            <td>
              <span class="title">KITCHEN VALENZUELA</span><br/>
              <small>Equipamiento de Cocina Industrial & Refacciones</small>
            </td>
            <td style="text-align:right;">
              <strong>PRESUPUESTO / COTIZACIÓN</strong><br/>
              Folio: ${quote.id}<br/>
              Fecha: ${new Date().toLocaleDateString()}
            </td>
          </tr>
        </table>

        <table class="meta-table">
          <tr>
            <td style="width:50%; vertical-align:top;">
              <strong>DATOS DEL EMISOR:</strong><br/>
              Kitchen Valenzuela S.A. de C.V.<br/>
              RFC: KVA150824XXX<br/>
              Tel: 55-9876-5432<br/>
              Email: ventas@kitchenvalenzuela.com
            </td>
            <td style="width:50%; vertical-align:top;">
              <strong>COTIZADO A:</strong><br/>
              Contacto: ${clientName}<br/>
              Empresa: ${clientCompany}<br/>
              RFC: ${clientRFC}<br/>
              Tel: ${clientPhone} | Email: ${clientEmail}<br/>
              Dirección: ${clientAddr}
            </td>
          </tr>
        </table>

        <table class="items-table">
          <thead>
            <tr style="background:#f5f5f5;">
              <th style="padding:10px; text-align:left;">Producto / Descripción</th>
              <th style="padding:10px; text-align:center;">Precio Unit.</th>
              <th style="padding:10px; text-align:center;">Cant.</th>
              <th style="padding:10px; text-align:right;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <table class="totals-table">
          <tr>
            <td style="padding:6px; text-align:left;">Subtotal Neto:</td>
            <td style="padding:6px; text-align:right;">$${quote.subtotal.toFixed(2)} MXN</td>
          </tr>
          <tr>
            <td style="padding:6px; text-align:left;">IVA (16%):</td>
            <td style="padding:6px; text-align:right;">$${quote.tax.toFixed(2)} MXN</td>
          </tr>
          <tr style="font-weight:bold; border-top:2px solid #333;">
            <td style="padding:6px; text-align:left; font-size:16px;">Total:</td>
            <td style="padding:6px; text-align:right; font-size:16px; color:#007aff;">$${quote.total.toFixed(2)} MXN</td>
          </tr>
        </table>

        <div class="footer">
          Precios vigentes durante 15 días naturales a partir de la fecha de expedición.<br/>
          ¡Gracias por depositar su confianza en Kitchen Valenzuela!
        </div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
    </html>
  `);
  printWin.document.close();
}
