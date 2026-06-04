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

function updateClientPanelStatus(status) {
  const clientPanel = document.querySelector(".stepper-client-panel");
  if (clientPanel) {
    clientPanel.setAttribute("data-status", status);
  }
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

  const quoteClientTrigger = document.getElementById("quoteClientTrigger");
  const quoteClientSelect = document.getElementById("quoteClientSelect");
  const quoteClientInput = document.getElementById("quoteClientInput");
  const quoteClientOptions = document.getElementById("quoteClientOptions");

  quoteClientTrigger?.addEventListener("click", (e) => {
    e.stopPropagation();
    const stepperView = document.getElementById("quote-stepper-view");
    if (stepperView && stepperView.getAttribute("data-readonly") === "true") return;
    quoteClientSelect?.classList.add("open");
    quoteClientInput?.focus();
  });

  quoteClientInput?.addEventListener("focus", () => {
    const stepperView = document.getElementById("quote-stepper-view");
    if (stepperView && stepperView.getAttribute("data-readonly") === "true") return;
    quoteClientSelect?.classList.add("open");
    quoteClientInput.value = "";
    quoteClientInput.dispatchEvent(new Event("input"));
  });

  quoteClientInput?.addEventListener("input", (e) => {
    const val = e.target.value.toLowerCase();
    quoteClientOptions?.querySelectorAll(".custom-select-option").forEach(opt => {
      opt.style.display = opt.textContent.toLowerCase().includes(val) ? "flex" : "none";
    });
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest("#quoteClientSelect") && quoteClientSelect?.classList.contains("open")) {
      quoteClientSelect.classList.remove("open");
      if (quoteClientInput) {
        quoteClientInput.value = getClientLabel(window.AppState.quoteClientId);
      }
      quoteClientOptions?.querySelectorAll(".custom-select-option").forEach(opt => {
        opt.style.display = "flex";
      });
    }
  });

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
    if (window.AppState.quoteItems.length === 0) {
      showToast("Agrega al menos un producto antes de guardar.", "warning");
      return;
    }
    saveDraftQuotation();
    showToast("Cotización guardada como borrador.", "success");
    window.location.hash = "#/quotation";
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
      quantity: item.quantity
    }));
    window.AppState.quoteClientId = quote.clientId || "";
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
      { id: "", label: "-- Cliente General / Público --" },
      ...window.AppState.clients.map(c => ({ id: c.id, label: `${c.nombre} (${c.empresa || 'Empresa'})` }))
    ].map(item => `
      <div class="custom-select-option ${item.id === currentVal ? "selected" : ""}" data-value="${item.id}" style="display: flex;">
        ${item.label}
      </div>
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
        document.getElementById("quoteClientSelect")?.classList.remove("open");
        
        renderClientPreview();
        updateClientPanelStatus(val ? "client-selected" : "no-client");
        saveDraftQuotation();
      });
    });
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
  const iva   = subtotal * 0.16;
  const total = subtotal + iva;
  const fmt   = (v) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;

  const sub = document.getElementById("q-subtotal");
  const tax = document.getElementById("q-iva");
  const tot = document.getElementById("q-total");

  if (sub) sub.textContent = fmt(subtotal);
  if (tax) tax.textContent = fmt(iva);
  if (tot) tot.textContent = fmt(total);
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

  const countEl = document.getElementById("overview-item-count");
  if (countEl) countEl.textContent = quote.items.length;

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

  const fmt    = (v) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;
  const ovSub  = document.getElementById("ov-subtotal");
  const ovIva  = document.getElementById("ov-iva");
  const ovTot  = document.getElementById("ov-total");
  if (ovSub) ovSub.textContent = fmt(quote.subtotal);
  if (ovIva) ovIva.textContent = fmt(quote.tax);
  if (ovTot) ovTot.textContent = fmt(quote.total);

  const exportActions = document.getElementById("overview-export-actions");
  const existingQuote = window.AppState.currentQuoteId
    ? window.AppState.quotations.find(q => q.id === window.AppState.currentQuoteId)
    : null;
  if (exportActions) {
    const isConfirmed = existingQuote && existingQuote.status !== 'draft';
    exportActions.setAttribute("data-visible", isConfirmed ? "true" : "false");
  }

  document.getElementById("quote-btn-whatsapp")?.addEventListener("click", exportQuoteToWhatsApp);
  document.getElementById("quote-btn-pdf")?.addEventListener("click", exportQuoteToPDF);

  createLucideIcons();
}

function buildCurrentQuoteObject() {
  const existingQuote = window.AppState.currentQuoteId
    ? window.AppState.quotations.find(q => q.id === window.AppState.currentQuoteId)
    : null;

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

  const tax   = subtotal * 0.16;
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
    const sub = item.unitPrice * item.quantity;
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
        </td>
        <td class="center">${item.quantity.toFixed(2)} ${item.product.unitCode || 'Pz'}</td>
        <td class="right">$${item.unitPrice.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
        <td class="right">$${itemTax.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
        <td class="right">$0.00</td>
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
        <th style="width: 90px;" class="right">Descuento</th>
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