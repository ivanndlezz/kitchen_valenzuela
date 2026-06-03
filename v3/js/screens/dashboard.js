/**
 * Dashboard Screen — Love Shack v3
 * Main reservation list with filters
 */

const DashboardScreen = {
  container: null,
  showPast: false,
  searchTerm: "",
  searchActive: false,

  render(container) {
    this.container = container;
    const counts = window.Storage.getCounts();
    const reservations = window.Storage.getAllReservations();

    // Determine active filter from URL
    const params = new URLSearchParams(
      window.location.hash.split("?")[1] || "",
    );
    const activeFilter = params.get("filter") || "all";

    container.innerHTML = `
      <div class="step-content stagger-children">
        <!-- Summary Stats -->
        <div class="dashboard-summary">
          <div class="summary-stat">
            <div class="summary-stat-value">${counts.total}</div>
            <div class="summary-stat-label">Total</div>
          </div>
          <div class="summary-stat">
            <div class="summary-stat-value text-accent">${counts.reservado + counts.tentativo}</div>
            <div class="summary-stat-label">Active</div>
          </div>
          <div class="summary-stat">
            <div class="summary-stat-value text-warning">${counts.draft}</div>
            <div class="summary-stat-label">Drafts</div>
          </div>
        </div>

        <!-- Sticky Header with Filter Tabs & Search -->
        <div class="dashboard-sticky-header">
          <div class="filter-tabs ${this.searchActive ? 'searching' : ''}" id="filterTabs">
            <button class="filter-tab-back" id="filterBackBtn" aria-label="Back to Filters">
              <svg class="icon"><use href="#icon-arrow-left" /></svg>
            </button>

            <button class="filter-tab ${activeFilter === "all" ? "active" : ""}" data-filter="all">
              All <span class="count">${counts.total}</span>
            </button>
            <button class="filter-tab ${activeFilter === "draft" ? "active" : ""}" data-filter="draft">
              Drafts <span class="count">${counts.draft}</span>
            </button>
            <button class="filter-tab ${activeFilter === "reservado" ? "active" : ""}" data-filter="reservado">
              Reserved <span class="count">${counts.reservado}</span>
            </button>
            <button class="filter-tab ${activeFilter === "completado" ? "active" : ""}" data-filter="completado">
              Done <span class="count">${counts.completado}</span>
            </button>
            <button class="filter-tab toggle-past ${this.showPast ? "active" : ""}" id="togglePastBtn">
              ${this.showPast ? "Hide Past" : "Show Past"}
            </button>

            <!-- Inline Search -->
            <div class="search-tab-wrapper ${this.searchActive ? 'active' : ''}" id="searchTabWrapper">
              <button class="search-toggle-btn" id="searchToggleBtn" aria-label="Toggle Search">
                <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </button>
              <div class="search-input-container">
                <input 
                  type="text" 
                  id="resSearchInput" 
                  placeholder="Search..." 
                  value="${this.searchTerm}"
                  autocomplete="off"
                >
                ${this.searchTerm ? `<button id="clearSearch" class="clear-search-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>` : ""}
              </div>
            </div>
          </div>
        </div>

        <!-- Reservation List with active filter reflected -->
        <div id="reservationList" data-active-filter="${activeFilter}">
          ${this.renderList(reservations, activeFilter)}
        </div>
      </div>
    `;

    this.bindEvents();
  },

  renderList(reservations, filter) {
    const now = new Date();
    const search = this.searchTerm.toLowerCase().trim();

    // Filter
    let filtered = reservations.filter((r) => {
      // 1. Status filter
      if (filter && filter !== "all" && r.status !== filter) return false;

      // 2. Past filter
      const tripDate = r.data?.step2_details?.tripDate;
      if (tripDate) {
        const isPast = new Date(tripDate + "T23:59:59") < now;
        if (isPast && !this.showPast) return false;
      }

      // 3. Search filter
      if (search) {
        const s2 = r.data?.step2_details || {};
        const s3 = r.data?.step3_adjustments || {};
        const customer = (s2.customerName || "").toLowerCase();
        const date = (s2.tripDate || "").toLowerCase();
        const code = (r.id || "").toLowerCase();
        const sourceId = (s3.bookingSource || "").toLowerCase();
        const sourceLabel = this.getSourceLabel(s3.bookingSource || "direct").toLowerCase();
        const legacySource = (r.reservationSource || "").toLowerCase();

        const matches = 
          customer.includes(search) || 
          date.includes(search) || 
          code.includes(search) || 
          sourceId.includes(search) || 
          sourceLabel.includes(search) ||
          legacySource.includes(search);

        if (!matches) return false;
      }

      return true;
    });

    if (filtered.length === 0) {
      return `
        <div class="empty-state">
          <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
            <line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
          <div class="empty-state-title">No reservations yet</div>
          <div class="empty-state-text">Tap the + button to create your first quote</div>
        </div>
      `;
    }

    // Sort by trip date (nearest first), then by updatedAt
    filtered.sort((a, b) => {
      const dateA = a.data.step2_details?.tripDate || "";
      const dateB = b.data.step2_details?.tripDate || "";
      if (dateA && dateB) return dateA.localeCompare(dateB);
      if (dateA) return -1;
      if (dateB) return 1;
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    // Group by month
    const groups = {};
    const draftsGroup = []; // Renamed from noDate for clarity

    filtered.forEach((r) => {
      const tripDate = r.data.step2_details?.tripDate;
      const isDraft = r.status === 'draft';

      // Always put drafts in the drafts group, regardless of date
      if (isDraft || !tripDate) {
        draftsGroup.push(r);
      } else {
        const d = new Date(tripDate + "T00:00:00");
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
        if (!groups[key]) groups[key] = { label, items: [] };
        groups[key].items.push(r);
      }
    });

    let html = "";

    // Drafts group first
    if (draftsGroup.length > 0) {
      html += `<div class="month-header">Drafts</div>`;
      draftsGroup.forEach((r) => {
        html += this.renderCard(r);
      });
    }

    // Dated groups
    Object.keys(groups)
      .sort()
      .forEach((key) => {
        const group = groups[key];
        html += `<div class="month-header">${group.label}</div>`;
        group.items.forEach((r) => {
          html += this.renderCard(r);
        });
      });

    return html;
  },

  renderCard(r) {
    const s1 = r.data.step1_pricing || {};
    const s2 = r.data.step2_details || {};
    const s3 = r.data.step3_adjustments || {};

    const isDraft = r.status === "draft";
    const tourType = s2.tourType || "No tour selected";
    const customerName = s2.customerName || "Unnamed Quote";
    const tourIcon = this.getTourEmoji(s2.tourType);

    // Date display
    let dateDisplay = "";
    if (s2.tripDate) {
      const d = new Date(s2.tripDate + "T00:00:00");
      dateDisplay = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      if (s2.startTime) dateDisplay += ` · ${this.formatTime(s2.startTime)}`;
      if (s2.endTime) dateDisplay += ` → ${this.formatTime(s2.endTime)}`;
    } else {
      dateDisplay = "No date set";
    }

    // Price
    const price = s3.finalCustomerPrice || s1.estimatedSubtotal || 0;
    const priceFormatted = this.formatCurrency(price);

    // Source: prefer legacy reservationSource for display, otherwise use bookingSource
    let sourceName;
    if (r.reservationSource) {
      sourceName = r.reservationSource; // legacy field
    } else {
      sourceName = this.getSourceLabel(s3.bookingSource || "direct");
    }

    // Is past?
    const isPast =
      s2.tripDate && new Date(s2.tripDate + "T23:59:59") < new Date();

    // Status badge
    const badgeClass = `badge badge-${r.status}`;
    const statusLabel = isDraft ? `Draft` : r.status;

    // Sync Alert Icon (if not backed up)
    let syncAlertHtml = "";
    const syncStatus = window.AppState?.syncStatus;
    if (syncStatus && syncStatus.onlyInLocal) {
      const isUnsynced = syncStatus.onlyInLocal.some(item => item.id === r.id);
      if (isUnsynced) {
        syncAlertHtml = `
          <div class="card-sync-alert" title="Not backed up to JSON file" style="color: var(--color-warning); display: flex; align-items: center;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
        `;
      }
    }

    // Step progress for drafts
    let progressHtml = "";
    if (isDraft) {
      progressHtml = `
        <div class="step-progress">
          <div class="step-progress-dot ${r.currentStep >= 1 ? "filled" : ""}"></div>
          <div class="step-progress-dot ${r.currentStep >= 2 ? "filled" : ""}"></div>
          <div class="step-progress-dot ${r.currentStep >= 3 ? "filled" : ""}"></div>
          <span class="step-progress-label">Step ${r.currentStep}/3</span>
        </div>
      `;
    }

    // Action label
    const actionLabel = isDraft ? "Continue" : "View";

    return `
      <div class="reservation-card"
           data-id="${r.id}" 
           data-status="${r.status}"
           data-is-past="${isPast}"
           data-is-draft="${isDraft}"
           style="position: relative; overflow: visible;">

        <!-- Menu Overlay -->
        <div class="res-menu-wrapper" style="position: absolute; top: var(--space-3); right: var(--space-3); z-index: 10;" onclick="event.stopPropagation()">
          <button class="icon-btn res-menu-toggle" data-id="${r.id}" style="width: 36px; height: 36px; border-radius: 50%; background: var(--color-surface); border: 1px solid var(--color-border); box-shadow: 0 2px 8px rgba(0,0,0,0.08); cursor: pointer; color: inherit; display: flex; align-items: center; justify-content: center; transition: all 0.2s;" onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.15)'" onmouseout="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)'">
            <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" stroke-width="2" fill="none"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
          </button>
          <div class="res-menu-dropdown hidden" id="menu-${r.id}" style="position: absolute; right: 0; top: 100%; margin-top: 8px; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 20; min-width: max-content; padding: 4px; display: none;">
            <button class="res-menu-item" data-action="print-voucher" data-id="${r.id}" style="display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 12px; background: transparent; border: none; cursor: pointer; color: var(--color-text); font-size: 14px; text-align: left; border-radius: 4px;" onmouseover="this.style.background='var(--color-surface-alt)'" onmouseout="this.style.background='transparent'">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
              Print Voucher
            </button>
            <button class="res-menu-item text-danger" data-action="delete-res" data-id="${r.id}" style="display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 12px; background: transparent; border: none; cursor: pointer; color: #ef4444; font-size: 14px; text-align: left; border-radius: 4px;" onmouseover="this.style.background='rgba(239,68,68,0.1)'" onmouseout="this.style.background='transparent'">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              Delete Quote
            </button>
          </div>
        </div>

        <!-- Inner Box for Click Area -->
        <div class="reservation-card-inner" data-action="open-reservation" data-id="${r.id}">
          <div class="res-card-header" style="margin-right: 48px;">
            <div class="res-card-tour">
              <span class="res-card-tour-icon">${tourIcon}</span>
              <span>${tourType}</span>
            </div>
            <div style="display: flex; align-items: center; gap: var(--space-2);">
              ${syncAlertHtml}
              <span class="${badgeClass}">${statusLabel}</span>
            </div>
          </div>

          <div class="res-card-customer">${this.escapeHtml(customerName)}</div>

          <div class="res-card-meta">
            <span class="res-card-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              ${dateDisplay}
            </span>
            <span class="res-card-meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" /><path d="M7 2v20" /><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" /></svg>
              ${this.truncate(s2.foodType || "No food", 18)}
            </span>
            <span class="res-card-meta-item">${sourceName}</span>
          </div>

          <div class="res-card-footer">
            <span class="res-card-price">${priceFormatted}</span>
            ${
              isDraft
                ? progressHtml
                : `
              <span class="res-card-action">
                ${actionLabel}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              </span>
            `
            }
          </div>
        </div>
      </div>
    `;
  },

  bindEvents() {
    // Filter tabs
    const tabs = this.container.querySelectorAll(".filter-tab");
    tabs.forEach((tab) => {
      tab.addEventListener("click", (e) => {
        const filter = e.currentTarget.dataset.filter;
        if (!filter) return; // Skip the toggle button which doesn't have data-filter

        // Update active state
        tabs.forEach((t) => {
          if (t.hasAttribute("data-filter")) t.classList.remove("active");
        });
        e.currentTarget.classList.add("active");

        // Auto-toggle showPast based on filter
        if (filter === "completado") {
          this.showPast = true;
        } else if (filter === "all") {
          this.showPast = false;
        }

        // Update toggle button text to reflect showPast state
        const toggleBtn = this.container.querySelector("#togglePastBtn");
        if (toggleBtn) {
          toggleBtn.textContent = this.showPast ? "Hide Past" : "Show Past";
          toggleBtn.classList.toggle("active", this.showPast);
        }

        // Re-render list and update data-active-filter
        const reservations = window.Storage.getAllReservations();
        const listEl = document.getElementById("reservationList");
        listEl.setAttribute("data-active-filter", filter);
        listEl.innerHTML = this.renderList(reservations, filter);
        // Re-bind card events
        this.bindCardEvents();
      });
    });

    // Toggle past button
    const togglePastBtn = this.container.querySelector("#togglePastBtn");
    if (togglePastBtn) {
      togglePastBtn.addEventListener("click", () => {
        this.showPast = !this.showPast;
        togglePastBtn.textContent = this.showPast ? "Hide Past" : "Show Past";
        togglePastBtn.classList.toggle("active", this.showPast);

        // Re-render list
        const reservations = window.Storage.getAllReservations();
        const listEl = document.getElementById("reservationList");
        const currentFilter =
          listEl.getAttribute("data-active-filter") || "all";
        listEl.innerHTML = this.renderList(reservations, currentFilter);
        this.bindCardEvents();
      });
    }

    this.bindCardEvents();

    // Search events
    const searchToggleBtn = this.container.querySelector("#searchToggleBtn");
    const searchTabWrapper = this.container.querySelector("#searchTabWrapper");
    const searchInput = this.container.querySelector("#resSearchInput");
    const filterTabs = this.container.querySelector("#filterTabs");
    const filterBackBtn = this.container.querySelector("#filterBackBtn");

    if (searchToggleBtn && searchTabWrapper && searchInput && filterTabs) {
      const toggleSearch = (active) => {
        this.searchActive = active;
        searchTabWrapper.classList.toggle("active", active);
        filterTabs.classList.toggle("searching", active);
        if (active) {
          searchInput.focus();
        }
      };

      searchToggleBtn.addEventListener("click", () => {
        toggleSearch(!this.searchActive);
      });

      if (filterBackBtn) {
        filterBackBtn.addEventListener("click", () => {
          toggleSearch(false);
        });
      }

      searchInput.addEventListener("input", (e) => {
        this.searchTerm = e.target.value;
        const reservations = window.Storage.getAllReservations();
        const listEl = document.getElementById("reservationList");
        const currentFilter = listEl.getAttribute("data-active-filter") || "all";
        listEl.innerHTML = this.renderList(reservations, currentFilter);
        this.bindCardEvents();

        // Toggle clear button
        const clearBtn = this.container.querySelector("#clearSearch");
        if (this.searchTerm && !clearBtn) {
          const inputContainer = this.container.querySelector(".search-input-container");
          inputContainer.insertAdjacentHTML('beforeend', `<button id="clearSearch" class="clear-search-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>`);
          this.bindSearchClear();
        } else if (!this.searchTerm && clearBtn) {
          clearBtn.remove();
        }
      });
    }

    this.bindSearchClear();
  },

  bindSearchClear() {
    const clearBtn = this.container.querySelector("#clearSearch");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        this.searchTerm = "";
        const searchInput = this.container.querySelector("#resSearchInput");
        if (searchInput) {
          searchInput.value = "";
          searchInput.focus();
        }
        clearBtn.remove();

        const reservations = window.Storage.getAllReservations();
        const listEl = document.getElementById("reservationList");
        const currentFilter = listEl.getAttribute("data-active-filter") || "all";
        listEl.innerHTML = this.renderList(reservations, currentFilter);
        this.bindCardEvents();
      });
    }
  },

  bindCardEvents() {
    const cards = this.container.querySelectorAll(
      '[data-action="open-reservation"]',
    );
    cards.forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest(".res-menu-wrapper")) return;

        const id = card.dataset.id;
        const reservation = window.Storage.getReservation(id);
        if (!reservation) return;

        if (reservation.status === "draft") {
          // Resume at current step
          const step = reservation.currentStep || 1;
          const isNewRes = reservation.flowMode === "new-reservation";
          if (isNewRes) {
            if (step === 1) window.App.navigate(`#/new-reservation/${id}`);
            else window.App.navigate(`#/new-reservation/${id}/pricing`);
          } else {
            if (step === 1) window.App.navigate(`#/new/${id}`);
            else if (step === 2) window.App.navigate(`#/new/${id}/details`);
            else window.App.navigate(`#/new/${id}/adjustments`);
          }
        } else {
          // For booked reservations, open step 3 as a view
          // If it was created via new-reservation, let's open Step3 adjustments anyway so they can see all adjustments and details
          window.App.navigate(`#/new/${id}/adjustments`);
        }
      });
    });

    const toggles = this.container.querySelectorAll(".res-menu-toggle");
    toggles.forEach((toggle) => {
      toggle.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = toggle.dataset.id;
        const menu = this.container.querySelector(`#menu-${id}`);

        this.container.querySelectorAll(".res-menu-dropdown").forEach((m) => {
          if (m !== menu) m.style.display = "none";
        });

        menu.style.display =
          menu.style.display === "none" || !menu.style.display
            ? "block"
            : "none";
      });
    });

    const deleteBtns = this.container.querySelectorAll(
      '[data-action="delete-res"]',
    );
    deleteBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;

        if (confirm("¿Estás seguro de que deseas eliminar esta reserva?")) {
          if (
            confirm(
              "Esta acción es permanente y no se puede deshacer. ¿Confirmas la eliminación?",
            )
          ) {
            window.Storage.deleteReservation(id);

            const listEl = document.getElementById("reservationList");
            const currentFilter =
              listEl.getAttribute("data-active-filter") || "all";
            const reservations = window.Storage.getAllReservations();
            listEl.innerHTML = this.renderList(reservations, currentFilter);
            this.bindCardEvents();
          }
        }
      });
    });

    const printBtns = this.container.querySelectorAll(
      '[data-action="print-voucher"]',
    );
    printBtns.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        window.App.navigate(`#/voucher/${id}`);
      });
    });

    if (!this._menuCloseBound) {
      document.addEventListener("click", (e) => {
        if (!e.target.closest(".res-menu-wrapper") && this.container) {
          this.container.querySelectorAll(".res-menu-dropdown").forEach((m) => {
            m.style.display = "none";
          });
        }
      });
      this._menuCloseBound = true;
    }
  },

  // ---- Helpers ----

  getTourEmoji(tourType) {
    const map = {
      "Bay Trip": "🌊",
      "Whale Watching": "🐋",
      "Snorkeling Tour": "🤿",
      "Sunset Cruise": "🌅",
      Fishing: "🎣",
    };
    return map[tourType] || "⛵";
  },

  getSourceLabel(sourceId) {
    const map = {
      direct: "📞 Direct",
      "get-my-boat": "🐬 GMB",
      viator: "✈️ Viator",
      fareharbor: "🚦 FH",
      "travel-cabo-tours": "🌴 TCT",
      "anchor-rides": "⚓ Anchor",
    };
    return map[sourceId] || sourceId;
  },

  formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  },

  formatTime(time24) {
    if (!time24) return "";
    const [h, m] = time24.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
  },

  escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  },

  truncate(str, n) {
    return str.length > n ? str.substr(0, n - 1) + "..." : str;
  },

  destroy() {
    this.container = null;
  },
};

window.DashboardScreen = DashboardScreen;
