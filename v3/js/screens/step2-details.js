/**
 * Step 2 — Trip Details Screen — Love Shack v3
 * Tour type, date/time (via DateTimePicker), customer info
 */

const Step2Screen = {
  container: null,
  reservationId: null,
  picker: null,

  render(container, params) {
    this.container = container;
    this.reservationId = params.id;

    const reservation = window.Storage.getReservation(this.reservationId);
    if (!reservation) {
      window.App.navigate("#/dashboard");
      return;
    }

    const s1 = reservation.data.step1_pricing;
    const s2 = reservation.data.step2_details;
    const duration = s1.durationHours || 3;

    container.innerHTML = `
      <div class="step-content stagger-children">

        <!-- Date & Time — DateTimePicker -->
        <div class="step-section">
          <div class="step-section-title">Schedule</div>
          <div id="datetime-picker-mount"></div>
        </div>

        <!-- Tour Type -->
        <div class="step-section">
          <div class="step-section-title">Tour Type</div>
          <div id="tourTypeToggleContainer">
            ${this.renderTourToggle(s2.tourType)}
          </div>
          <div id="tourSuggestionContainer"></div>
        </div>

        <!-- Customer Info — Contact Card -->
        <label class="step-section">
          <div class="step-section-title">Customer</div>
          <div class="input-group">
            <div class="s2-profile-header">
              <div class="s2-avatar" id="avatarBox" style="background-color: ${s2.customerName ? this.createRandomColor(s2.customerName) : "var(--color-border)"}">
                <svg id="defaultIcon" class="s2-avatar-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="display: ${s2.customerName ? "none" : "block"}">
                  <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="white"/>
                </svg>
                <span id="initialsText" class="s2-avatar-initials" style="display: ${s2.customerName ? "block" : "none"}">${this.getNameInitials(s2.customerName || "")}</span>
              </div>
              <div class="s2-profile-name ${s2.customerName ? "" : "empty"}" id="displayName">${s2.customerName || "Customer"}</div>
            </div>
            <label class="input-group-row">
              <div class="s2-row-label">Nombre</div>
              <div class="s2-row-input-wrapper">
                <input type="text" id="customerName" placeholder="Juan Pérez" autocomplete="name"
                       value="${this.escapeAttr(s2.customerName || "")}" data-field="customerName">
              </div>
            </label>
          </div>
        </label>

        <!-- Phone (Optional) -->
        <div class="step-section">
          <div class="input-group" id="phoneAddContainer" style="display: ${s2.customerPhone ? "none" : "block"}">
            <div class="s2-action-row" id="phoneRevealBtn">
              <svg class="s2-icon-add" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="11" fill="var(--color-success, #34c759)"/>
                <path d="M12 6v12m-6-6h12" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <span class="s2-text-add">agregar teléfono</span>
            </div>
          </div>
          <div class="input-group" id="phoneInputContainer" style="display: ${s2.customerPhone ? "block" : "none"}">
            <label class="input-group-row">
              <div class="s2-row-label">Teléfono</div>
              <div class="s2-row-input-wrapper">
                <input type="tel" id="customerPhone" placeholder="(555) 555-1234" autocomplete="tel"
                       value="${this.escapeAttr(s2.customerPhone || "")}" data-field="customerPhone">
              </div>
            </label>
          </div>
        </div>

        <!-- Email (Optional) -->
        <div class="step-section">
          <div class="input-group" id="emailAddContainer" style="display: ${s2.customerEmail ? "none" : "block"}">
            <div class="s2-action-row" id="emailRevealBtn">
              <svg class="s2-icon-add" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="11" fill="var(--color-success, #34c759)"/>
                <path d="M12 6v12m-6-6h12" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <span class="s2-text-add">agregar correo</span>
            </div>
          </div>
          <div class="input-group" id="emailInputContainer" style="display: ${s2.customerEmail ? "block" : "none"}">
            <label class="input-group-row">
              <div class="s2-row-label">Correo</div>
              <div class="s2-row-input-wrapper">
                <input type="email" id="customerEmail" placeholder="correo@ejemplo.com" autocomplete="email" autocapitalize="none"
                       value="${this.escapeAttr(s2.customerEmail || "")}" data-field="customerEmail">
              </div>
            </label>
          </div>
        </div>

        <!-- Notes (Optional) -->
        <div class="step-section">
          <div class="input-group" id="notesAddContainer" style="display: ${s2.notes ? "none" : "block"}">
            <div class="s2-action-row" id="notesRevealBtn">
              <svg class="s2-icon-add" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="11" fill="var(--color-success, #34c759)"/>
                <path d="M12 6v12m-6-6h12" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <span class="s2-text-add">Notas</span>
            </div>
          </div>
          <div class="input-group" id="notesInputContainer" style="display: ${s2.notes ? "block" : "none"}">
            <div style="padding: 16px;">
              <div class="step-section-title" style="margin-left: 0; margin-bottom: 8px;">Notas</div>
              <textarea id="notes" class="form-input" placeholder="Special requests, notes..."
                        data-field="notes"
                        style="height: 80px; width: 100%; padding: var(--space-3) var(--space-4); resize: vertical; border-radius: var(--radius-lg);"
              >${s2.notes || ""}</textarea>
            </div>
          </div>
        </div>
      </div>
    `;

    this.buildTourSheet();
    this.bindEvents(s2, duration);
    this.updateSuggestions(duration, s2.startTime, s2.tourType);
  },

  renderTourToggle(selectedType) {
    const tours = [
      { id: "Bay Trip", emoji: "🌊", label: "Bay Trip" },
      { id: "Whale Watching", emoji: "🐋", label: "Whale Watch" },
      { id: "Snorkeling Tour", emoji: "🤿", label: "Snorkel" },
      { id: "Sunset Cruise", emoji: "🌅", label: "Sunset" },
      { id: "Fishing", emoji: "🎣", label: "Fishing" },
    ];

    const selected = tours.find((t) => t.id === selectedType);

    const icon = selected ? selected.emoji : "📍";
    const title = selected ? selected.label : "Elige un tour";
    const note = selected
      ? "Tour Type"
      : "Toca para seleccionar el tipo de paseo";
    const color = selected ? "var(--color-text)" : "var(--color-text-tertiary)";
    const titleStyle = selected
      ? "font-style: normal; font-weight: 500;"
      : "font-style: italic; font-weight: 400;";

    return `
      <div class="gmb-toggle" style="cursor: pointer; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 16px; padding: 16px; display: flex; align-items: center; gap: 12px; transition: background 0.2s;">
        <div style="width: 50px; height: 50px; background: var(--color-surface); border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid var(--color-border);">
          <span style="font-size: 24px; filter: ${selected ? "none" : "grayscale(1) opacity(0.5)"}">${icon}</span>
        </div>
        <div style="flex: 1; min-width: 0;">
          <div style="font-size: 16px; color: ${color}; ${titleStyle} white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${title}</div>
          <div style="font-size: 12px; color: var(--color-text-tertiary); margin-top: 4px;">${note}</div>
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </div>
    `;
  },

  bindEvents(s2, duration) {
    const self = this;

    // Tour type toggle
    const toggleContainer = document.getElementById("tourTypeToggleContainer");
    if (toggleContainer) {
      toggleContainer.addEventListener("click", () => this.openTourSheet());
    }

    // Initialize DateTimePicker
    const mountEl = document.getElementById("datetime-picker-mount");
    if (mountEl && window.DateTimePicker) {
      this.picker = new DateTimePicker(mountEl, {
        initialDate: s2.tripDate || "",
        initialFrom: s2.startTime || "",
        initialTo: s2.endTime || "",
        duration: duration,
        onChange: () => this.autoSave(),
      });
    }

    // Name input → live avatar update
    const nameInput = document.getElementById("customerName");
    nameInput?.addEventListener("input", (e) => {
      self.handleNameChange(e.target.value);
      self.autoSave();
    });

    // Reveal phone / email
    document
      .getElementById("phoneRevealBtn")
      ?.addEventListener("click", () => self.revealField("phone"));
    document
      .getElementById("emailRevealBtn")
      ?.addEventListener("click", () => self.revealField("email"));
    document
      .getElementById("notesRevealBtn")
      ?.addEventListener("click", () => self.revealField("notes"));

    // Auto-save on all input changes (customer info + notes)
    this.container.querySelectorAll("input, textarea").forEach((input) => {
      if (input.id === "customerName") return; // already bound above
      input.addEventListener("input", () => this.autoSave());
      input.addEventListener("change", () => this.autoSave());
    });
  },

  autoSave() {
    const reservation = window.Storage.getReservation(this.reservationId);
    const existingS2 = reservation?.data?.step2_details || {};

    const pickerValues = this.picker ? this.picker.getValue() : {};

    const data = {
      tourType: existingS2.tourType || "",
      tripDate: pickerValues.tripDate || "",
      startTime: pickerValues.startTime || "",
      endTime: pickerValues.endTime || "",
      customerName: document.getElementById("customerName")?.value || "",
      customerPhone: document.getElementById("customerPhone")?.value || "",
      customerEmail: document.getElementById("customerEmail")?.value || "",
      notes: document.getElementById("notes")?.value || "",
    };

    window.Storage.updateReservation(this.reservationId, "step2_details", data);
    window.Storage.updateCurrentStep(this.reservationId, 2);

    // Refresh suggestions
    const s1 = reservation.data.step1_pricing;
    this.updateSuggestions(
      s1.durationHours || 3,
      data.startTime,
      data.tourType,
    );
  },

  escapeAttr(str) {
    return str.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  },

  // --- Contact Card helpers ---
  createRandomColor(seedString) {
    if (!seedString) return "var(--color-border)";
    let hash = 0;
    for (let i = 0; i < seedString.length; i++) {
      hash = seedString.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 55%, 50%)`;
  },

  getNameInitials(name) {
    const clean = name.trim();
    if (!clean) return "";
    const parts = clean.split(/\s+/);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  },

  handleNameChange(nameValue) {
    const initials = this.getNameInitials(nameValue);
    const avatarBox = document.getElementById("avatarBox");
    const defaultIcon = document.getElementById("defaultIcon");
    const initialsText = document.getElementById("initialsText");
    const displayName = document.getElementById("displayName");

    if (initials) {
      const bgColor = this.createRandomColor(nameValue);
      avatarBox.style.backgroundColor = bgColor;
      defaultIcon.style.display = "none";
      initialsText.style.display = "block";
      initialsText.textContent = initials;
      displayName.textContent = nameValue;
      displayName.classList.remove("empty");
    } else {
      avatarBox.style.backgroundColor = "var(--color-border)";
      defaultIcon.style.display = "block";
      initialsText.style.display = "none";
      initialsText.textContent = "";
      displayName.textContent = "Nuevo Contacto";
      displayName.classList.add("empty");
    }
  },

  updateSuggestions(duration, startTime, currentTourId) {
    const container = document.getElementById("tourSuggestionContainer");
    if (!container || !window.TourSuggestions) return;

    const suggestion = window.TourSuggestions.getSuggestion(
      duration,
      startTime,
    );
    const isSelected = suggestion && suggestion.id === currentTourId;

    container.innerHTML = window.TourSuggestions.renderPill(
      suggestion,
      isSelected,
    );

    const pill = container.querySelector(".tour-suggestion-pill.active");
    if (pill) {
      pill.onclick = () => {
        const tourId = pill.getAttribute("data-suggested-tour");
        if (tourId) this.selectTour(tourId);
      };
    }
  },

  revealField(fieldType) {
    document.getElementById(fieldType + "AddContainer").style.display = "none";
    const inputContainer = document.getElementById(
      fieldType + "InputContainer",
    );
    inputContainer.style.display = "block";
    setTimeout(() => {
      const input = inputContainer.querySelector("input, textarea");
      if (input) input.focus();
    }, 50);
  },

  buildTourSheet() {
    this.sheetContainer = document.createElement("div");
    this.sheetContainer.innerHTML = `
      <div class="dtp-backdrop" id="s2-tour-backdrop"></div>
      <div class="dtp-sheet" id="s2-tour-sheet">
        <div class="dtp-sheet-handle-row"><div class="dtp-handle"></div></div>
        <div class="dtp-sheet-header">
          <div style="width:34px"></div>
          <span class="dtp-sheet-title">Select Tour Type</span>
          <button class="dtp-btn-cancel" id="s2-tour-cancel">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div class="dtp-tour-options" style="padding: 0 20px 20px; display: flex; flex-direction: column; gap: 8px;">
          <!-- Options injected here -->
        </div>
      </div>
    `;
    document.body.appendChild(this.sheetContainer);

    const backdrop = document.getElementById("s2-tour-backdrop");
    const cancelBtn = document.getElementById("s2-tour-cancel");

    backdrop?.addEventListener("click", () => this.closeTourSheet());
    cancelBtn?.addEventListener("click", () => this.closeTourSheet());
  },

  openTourSheet() {
    const optionsContainer =
      this.sheetContainer.querySelector(".dtp-tour-options");
    const tours = [
      { id: "Bay Trip", emoji: "🌊", label: "Bay Trip" },
      { id: "Whale Watching", emoji: "🐋", label: "Whale Watch" },
      { id: "Snorkeling Tour", emoji: "🤿", label: "Snorkel" },
      { id: "Sunset Cruise", emoji: "🌅", label: "Sunset" },
      { id: "Fishing", emoji: "🎣", label: "Fishing" },
    ];

    const reservation = window.Storage.getReservation(this.reservationId);
    const selectedType = reservation?.data?.step2_details?.tourType;

    optionsContainer.innerHTML = tours
      .map(
        (t) => `
      <div class="tour-option-item ${selectedType === t.id ? "selected" : ""}" data-tour="${t.id}" style="display: flex; align-items: center; padding: 16px; background: var(--color-surface-alt); border: 1px solid ${selectedType === t.id ? "var(--color-accent, #1a6ef5)" : "var(--color-border)"}; border-radius: 14px; cursor: pointer; transition: all 0.2s;">
        <span style="font-size: 24px; margin-right: 12px; filter: ${selectedType === t.id ? "none" : "grayscale(1) opacity(0.8)"}">${t.emoji}</span>
        <span style="font-size: 16px; font-weight: ${selectedType === t.id ? "600" : "500"}; color: ${selectedType === t.id ? "var(--color-text)" : "var(--color-text-secondary)"}; flex: 1;">${t.label}</span>
        ${selectedType === t.id ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent, #1a6ef5)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>` : ""}
      </div>
    `,
      )
      .join("");

    optionsContainer.querySelectorAll(".tour-option-item").forEach((item) => {
      item.addEventListener("click", () => {
        this.selectTour(item.dataset.tour);
      });
    });

    document
      .getElementById("s2-tour-backdrop")
      .setAttribute("data-state", "open");
    document.getElementById("s2-tour-sheet").setAttribute("data-state", "open");
  },

  closeTourSheet() {
    document.getElementById("s2-tour-backdrop")?.removeAttribute("data-state");
    document.getElementById("s2-tour-sheet")?.removeAttribute("data-state");
  },

  selectTour(tourId) {
    this.closeTourSheet();

    const reservation = window.Storage.getReservation(this.reservationId);
    const s2 = reservation.data.step2_details || {};
    s2.tourType = tourId;
    window.Storage.updateReservation(this.reservationId, "step2_details", s2);

    // Re-render toggle
    const toggleContainer = document.getElementById("tourTypeToggleContainer");
    if (toggleContainer) {
      toggleContainer.innerHTML = this.renderTourToggle(tourId);
    }

    this.autoSave();
  },

  destroy() {
    if (this.picker) {
      this.picker.destroy();
      this.picker = null;
    }
    if (this.sheetContainer && this.sheetContainer.parentNode) {
      this.sheetContainer.parentNode.removeChild(this.sheetContainer);
    }
    this.sheetContainer = null;
    this.container = null;
    this.reservationId = null;
  },
};

window.Step2Screen = Step2Screen;
