/**
 * Step 1 — Quick Pricing Screen — Love Shack v3
 * Inspired by the Pricing Calculator interface.
 */

const Step1Screen = {
  container: null,
  reservationId: null,
  calculator: null,

  // Picker state
  picker: {
    isSyncing: false,
    STEP: 48,
    config: {
      duration: { min: 2, max: 8 },
      passengers: { min: 1, max: 55 },
    },
  },
  sheetContainer: null,

  render(container, params) {
    this.container = container;
    this.reservationId = params.id;

    if (!this.calculator && window.PricingCalculator && window.PRICING_RULES) {
      this.calculator = new window.PricingCalculator(window.PRICING_RULES);
    }

    const reservation = window.Storage.getReservation(this.reservationId);
    if (!reservation) {
      window.App.navigate("#/dashboard");
      return;
    }

    const s1 = reservation.data.step1_pricing || {};
    const duration = s1.durationHours || 3;
    const passengers = s1.passengers || 14;
    const pricingType = s1.pricingType || "regular";
    const source = s1.source || "direct";

    const price = this.calculatePrice(
      duration,
      passengers,
      pricingType,
      source,
    );

    container.innerHTML = `
      <div class="step-content stagger-children" style="padding-bottom: 300px;">
        
        <!-- Trip Summary & Breakdown (NOW AT TOP) -->
        <div class="trip-summary" data-duration="${duration}" data-passengers="${passengers}" style="position: relative; margin-top: 10px; margin-bottom: 20px;">
          <input type="checkbox" role="status" id="pricingDisplay" hide style="display: none;" checked>
          <label for="pricingDisplay" class="pricing-display">
            <div class="breakdown">
              
              <div class="breakdown-row">
                <span class="breakdown-label">Base trip <span id="baseTripFormula" style="font-size: var(--font-xs); opacity: 0.6;">${duration}h × $${price.hourlyRate}</span></span>
                <span class="breakdown-value" id="baseTripCost">${this.formatCurrency(price.baseTripCost)}</span>
              </div>

              <div class="breakdown-row state-managed" id="extraPassengersRow" data-state="${price.extraPassengers > 0 ? "visible" : "hidden"}">
                <span class="breakdown-label">Extra pax (<span id="extraCount">${price.extraPassengers}</span>)</span>
                <span class="breakdown-value" id="extraPassengerCost">+$${price.extraPassengerCharge}</span>
              </div>

              <div class="breakdown-row subtotal">
                <span class="breakdown-label">Subtotal</span>
                <span class="breakdown-value" id="subtotalVal">${this.formatCurrency(price.subtotal)}</span>
              </div>

              <div class="breakdown-row">
                <span class="breakdown-label">Business receives</span>
                <span class="breakdown-value" id="businessTotal">${this.formatCurrency(price.businessPrice)}</span>
              </div>

              <div class="breakdown-row fee state-managed" id="feeRow" data-state="${price.feeAmount > 0 ? "visible" : "hidden"}">
                <span class="breakdown-label">Fee (<span id="feeLabel">${price.feeNote}</span>)</span>
                <span class="breakdown-value" id="feeCost">${this.formatCurrency(price.feeAmount)}</span>
              </div>

              <div class="breakdown-row total">
                <span class="breakdown-label">Customer Pays</span>
                <span class="breakdown-value" id="customerTotal">${this.formatCurrency(price.customerPrice)}</span>
              </div>

            </div>
          </label>
        </div>
        <!-- Source Selector -->
          <div class="custom-select-wrapper" id="sourceSelect" style="margin-bottom: 12px;">
            <input type="hidden" id="source" data-field="source" value="${source}">
            <div class="custom-select-trigger" id="sourceTrigger">
              <input type="text" class="custom-select-input" id="sourceInput" placeholder="Select Source" value="${this.getSourceLabel(source)}" autocomplete="off" autocapitalize="none">
              <svg class="custom-select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
            <div class="custom-select-dropdown">
              <div class="custom-select-options" id="sourceOptions">
                ${this.renderSourceOptions(source)}
              </div>
            </div>
          </div>
<!-- -->
      </div>
      

      <!-- Thumb Zone: Pinned controls (Source, Pricing Type, Duration/Pax) -->
      <div class="thumb-zone">
        <div class="thumb-zone-controls">
          

          <!-- Pricing Type Toggle -->
          <div class="pricing-type-toggle-container" style="margin-bottom: 12px;">
            <button class="pricing-type-tab ${pricingType === "regular" ? "active" : ""}" data-value="regular">Regular Price</button>
            <button class="pricing-type-tab ${pricingType === "snack" ? "active" : ""}" data-value="snack">Snack Price</button>
          </div>

          <div class="summary-details">
            <div class="summary-item" data-trigger="duration">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <div class="summary-value">
                <span id="summaryDuration">${duration}</span>
                <span class="summary-label">HRS</span>
              </div>
            </div>
            <div class="summary-item" data-trigger="passengers">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              <div class="summary-value">
                <span id="summaryPassengers">${passengers}</span>
                <span class="summary-label">PAX</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      </div>
    `;

    // Render dual-wheel sheet directly to document.body
    this.sheetContainer = document.createElement("div");
    this.sheetContainer.innerHTML = `
      <div class="dtp-backdrop" id="s1-backdrop"></div>
      <div class="dtp-sheet" id="s1-sheet">
        <div class="dtp-sheet-handle-row"><div class="dtp-handle"></div></div>
        <div class="dtp-sheet-header">
          <div style="width:34px"></div>
          <span class="dtp-sheet-title">Trip Details</span>
          <button class="dtp-btn-cancel" id="s1-btn-cancel">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div class="dtp-wheels-row">
          <div class="dtp-manual-input-container">
            <div class="dtp-manual-field-wrapper"><input type="number" id="s1-inp-duration" class="dtp-manual-input-ghost" min="2" max="8" placeholder="3"></div>
            <div style="font-size:22px;font-weight:600;padding-bottom:2px; opacity:0">:</div>
            <div class="dtp-manual-field-wrapper"><input type="number" id="s1-inp-passengers" class="dtp-manual-input-ghost" min="1" max="55" placeholder="14"></div>
          </div>
          <div class="dtp-wheel-col">
            <div class="dtp-wheel-heading" style="display:flex; align-items:center; gap:4px;">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              <span>horas</span>
            </div>
            <div class="dtp-wheel-wrap">
              <div class="dtp-wheel-track" id="s1-trk-duration">
                ${Array.from({ length: 8 - 2 + 1 }, (_, i) => `<div class="dtp-wheel-item">${2 + i}</div>`).join("")}
              </div>
              <div class="dtp-wheel-cursor"></div>
            </div>
          </div>
          <div class="dtp-colon-spacer" style="opacity:0">:</div>
          <div class="dtp-wheel-col">
            <div class="dtp-wheel-heading" style="display:flex; align-items:center; gap:4px;">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
              <span>pax</span>
            </div>
            <div class="dtp-wheel-wrap">
              <div class="dtp-wheel-track" id="s1-trk-passengers">
                ${Array.from({ length: 55 - 1 + 1 }, (_, i) => `<div class="dtp-wheel-item">${1 + i}</div>`).join("")}
              </div>
              <div class="dtp-wheel-cursor"></div>
            </div>
          </div>
        </div>
        <div style="height: 16px;"></div>
        <button class="dtp-btn-confirm" id="s1-btn-ok">confirmar</button>
      </div>
    `;
    document.body.appendChild(this.sheetContainer);

    this.bindEvents();
    this.recalculate();
  },

  bindEvents() {
    const self = this; // Capture component instance

    // Expose manualInput globally for inline onclick (matches pricing-calculator pattern)
    window.manualInput = document.getElementById("manualInput");
    console.log("[Step1] window.manualInput set:", !!window.manualInput);

    // Pricing Type
    this.container.querySelectorAll(".pricing-type-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        self.container
          .querySelectorAll(".pricing-type-tab")
          .forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        self.recalculate();
      });
    });

    const sourceTrigger = document.getElementById("sourceTrigger");
    const sourceSelect = document.getElementById("sourceSelect");
    const sourceInput = document.getElementById("sourceInput");

    sourceTrigger?.addEventListener("click", (e) => {
      e.stopPropagation();
      sourceSelect.classList.add("open");
      sourceInput.focus();
    });

    sourceInput?.addEventListener("focus", () => {
      sourceSelect.classList.add("open");
      sourceInput.value = "";
      sourceInput.dispatchEvent(new Event("input"));
    });

    sourceInput?.addEventListener("input", (e) => {
      const val = e.target.value.toLowerCase();
      self.container
        .querySelectorAll(".custom-select-option")
        .forEach((opt) => {
          const text = opt.textContent.toLowerCase();
          if (text.includes(val)) {
            opt.style.display = "flex";
          } else {
            opt.style.display = "none";
          }
        });
    });

    document.addEventListener("click", (e) => {
      if (
        !e.target.closest("#sourceSelect") &&
        sourceSelect?.classList.contains("open")
      ) {
        sourceSelect.classList.remove("open");
        const currentVal = document.getElementById("source").value;
        sourceInput.value = self.getSourceLabel(currentVal);
        self.container
          .querySelectorAll(".custom-select-option")
          .forEach((opt) => (opt.style.display = "flex"));
      }
    });

    self.container.querySelectorAll(".custom-select-option").forEach((opt) => {
      opt.addEventListener("click", () => {
        const val = opt.dataset.value;
        const text = opt.textContent.trim();
        document.getElementById("source").value = val;
        sourceInput.value = text;

        self.container
          .querySelectorAll(".custom-select-option")
          .forEach((o) => {
            o.classList.remove("selected");
            opt.style.display = "flex";
          });
        opt.classList.add("selected");
        sourceSelect.classList.remove("open");
        self.recalculate();
      });
    });

    // Picker Triggers
    self.container
      .querySelector('[data-trigger="duration"]')
      ?.addEventListener("click", () => self.openPicker());
    self.container
      .querySelector('[data-trigger="passengers"]')
      ?.addEventListener("click", () => self.openPicker());

    // Sheet events
    document
      .getElementById("s1-backdrop")
      ?.addEventListener("click", () => self.closePicker());
    document
      .getElementById("s1-btn-cancel")
      ?.addEventListener("click", () => self.closePicker());
    document
      .getElementById("s1-btn-ok")
      ?.addEventListener("click", () => self.closePicker());

    // Scroll Syncing
    const trkDur = document.getElementById("s1-trk-duration");
    const trkPax = document.getElementById("s1-trk-passengers");

    const syncScroll = (track, key, conf) => {
      if (self.picker.isSyncing) return;
      const idx = Math.round(track.scrollTop / self.picker.STEP);
      const val = conf.min + idx;
      if (val >= conf.min && val <= conf.max) {
        self.setWheelActive(track, idx);
        document.getElementById(`summary${self.capitalize(key)}`).textContent =
          val;
        document.getElementById(`s1-inp-${key}`).value = val;
        self.recalculate();
      }
    };

    trkDur?.addEventListener("scroll", () =>
      syncScroll(trkDur, "duration", self.picker.config.duration),
    );
    trkPax?.addEventListener("scroll", () =>
      syncScroll(trkPax, "passengers", self.picker.config.passengers),
    );

    // Manual Input Syncing
    const inpDur = document.getElementById("s1-inp-duration");
    const inpPax = document.getElementById("s1-inp-passengers");

    const syncInput = (input, track, key, conf) => {
      let val = parseInt(input.value);
      if (!isNaN(val)) {
        val = Math.max(conf.min, Math.min(conf.max, val));
        self.picker.isSyncing = true;
        track.scrollTo({
          top: (val - conf.min) * self.picker.STEP,
          behavior: "smooth",
        });
        self.setWheelActive(track, val - conf.min);
        document.getElementById(`summary${self.capitalize(key)}`).textContent =
          val;
        self.recalculate();
        setTimeout(() => {
          self.picker.isSyncing = false;
        }, 300);
      }
    };

    inpDur?.addEventListener("input", () =>
      syncInput(inpDur, trkDur, "duration", self.picker.config.duration),
    );
    inpPax?.addEventListener("input", () =>
      syncInput(inpPax, trkPax, "passengers", self.picker.config.passengers),
    );

    // Keyboard Enter
    const handleKeyDown = (e, input, nextInput) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (nextInput) nextInput.focus();
        else {
          input.blur();
          self.closePicker();
        }
      }
    };
    inpDur?.addEventListener("keydown", (e) =>
      handleKeyDown(e, inpDur, inpPax),
    );
    inpPax?.addEventListener("keydown", (e) => handleKeyDown(e, inpPax, null));
  },

  openPicker() {
    document.getElementById("s1-backdrop").setAttribute("data-state", "open");
    document.getElementById("s1-sheet").setAttribute("data-state", "open");

    const curDur =
      parseInt(document.getElementById("summaryDuration").textContent) || 3;
    const curPax =
      parseInt(document.getElementById("summaryPassengers").textContent) || 14;

    setTimeout(() => {
      this.picker.isSyncing = true;
      const trkDur = document.getElementById("s1-trk-duration");
      const trkPax = document.getElementById("s1-trk-passengers");

      const durIdx = curDur - this.picker.config.duration.min;
      const paxIdx = curPax - this.picker.config.passengers.min;

      trkDur.scrollTo({ top: durIdx * this.picker.STEP });
      trkPax.scrollTo({ top: paxIdx * this.picker.STEP });

      this.setWheelActive(trkDur, durIdx);
      this.setWheelActive(trkPax, paxIdx);

      document.getElementById("s1-inp-duration").value = curDur;
      document.getElementById("s1-inp-passengers").value = curPax;

      setTimeout(() => {
        this.picker.isSyncing = false;
      }, 50);
    }, 50);
  },

  closePicker() {
    document.getElementById("s1-backdrop")?.removeAttribute("data-state");
    document.getElementById("s1-sheet")?.removeAttribute("data-state");
  },

  setWheelActive(track, index) {
    if (!track) return;
    track.querySelectorAll(".dtp-wheel-item").forEach((it, i) => {
      it.classList.toggle("active", i === index);
    });
  },

  recalculate() {
    const duration =
      parseInt(document.getElementById("summaryDuration")?.textContent) || 3;
    const passengers =
      parseInt(document.getElementById("summaryPassengers")?.textContent) || 14;
    const activeType = this.container.querySelector(".pricing-type-tab.active");
    const pricingType = activeType?.dataset.value || "regular";
    const source = document.getElementById("source")?.value || "direct";

    const price = this.calculatePrice(
      duration,
      passengers,
      pricingType,
      source,
    );

    // Update breakdown formula and base cost
    const formulaEl = document.getElementById("baseTripFormula");
    if (formulaEl) formulaEl.textContent = `${duration}h × $${price.hourlyRate}`;

    const baseCostEl = document.getElementById("baseTripCost");
    if (baseCostEl)
      baseCostEl.textContent = this.formatCurrency(price.baseTripCost);

    // Extra pax row
    const extraRow = document.getElementById("extraPassengersRow");
    if (price.extraPassengers > 0) {
      extraRow.setAttribute("data-state", "visible");
      document.getElementById("extraCount").textContent = price.extraPassengers;
      document.getElementById("extraPassengerCost").textContent =
        `+$${price.extraPassengerCharge}`;
    } else {
      extraRow.setAttribute("data-state", "hidden");
    }

    // Subtotal
    const subtotalEl = document.getElementById("subtotalVal");
    if (subtotalEl)
      subtotalEl.textContent = this.formatCurrency(price.subtotal);

    // Business Total
    const businessEl = document.getElementById("businessTotal");
    if (businessEl)
      businessEl.textContent = this.formatCurrency(price.businessPrice);

    // Fee Row
    const feeRow = document.getElementById("feeRow");
    if (price.feeAmount > 0) {
      feeRow.setAttribute("data-state", "visible");
      document.getElementById("feeLabel").textContent = price.feeNote;
      document.getElementById("feeCost").textContent = this.formatCurrency(
        price.feeAmount,
      );
    } else {
      feeRow.setAttribute("data-state", "hidden");
    }

    // Customer Total (Final)
    const customerEl = document.getElementById("customerTotal");
    if (customerEl)
      customerEl.textContent = this.formatCurrency(price.customerPrice);

    this.autoSave();
  },

  autoSave() {
    const duration =
      parseInt(document.getElementById("summaryDuration")?.textContent) || 3;
    const passengers =
      parseInt(document.getElementById("summaryPassengers")?.textContent) || 14;
    const activeType = this.container.querySelector(".pricing-type-tab.active");
    const pricingType = activeType?.dataset.value || "regular";
    const source = document.getElementById("source")?.value || "direct";

    const price = this.calculatePrice(
      duration,
      passengers,
      pricingType,
      source,
    );

    this.saveStep(duration, passengers, pricingType, source, price);
    window.Storage.updateCurrentStep(this.reservationId, 1);
  },

  calculatePrice(duration, passengers, pricingType, source) {
    if (this.calculator) {
      const result = this.calculator.calculate({
        trip: { duration, adults: passengers },
        pricingType,
        source,
      });
      // Return a merged object compatible with the existing code but richer
      return {
        ...result.basePricing,
        feeAmount: result.fee.feeAmount,
        feeNote: result.fee.feeNote,
        businessPrice: result.summary.businessPrice,
        customerPrice: result.summary.customerPrice,
        subtotal: result.summary.subtotal,
      };
    }
    // Fallback
    const rate = pricingType === "snack" ? 450 : 600;
    const extraRate = pricingType === "snack" ? 75 : 100;
    const extraPax = Math.max(0, passengers - 14);
    const base = duration * rate;
    const extra = extraPax * extraRate;
    const subtotal = base + extra;
    return {
      baseTripCost: base,
      hourlyRate: rate,
      duration,
      passengers,
      extraPassengers: extraPax,
      extraPassengerCharge: extra,
      subtotal: subtotal,
      feeAmount: 0,
      feeNote: "0% fee",
      businessPrice: subtotal,
      customerPrice: subtotal,
    };
  },

  saveStep(duration, passengers, pricingType, source, price) {
    const s1Data = {
      pricingType,
      source,
      durationHours: duration,
      passengers,
      extraPassengers: price.extraPassengers,
      hourlyRate: price.hourlyRate,
      baseTripCost: price.baseTripCost,
      extraPassengerCharge: price.extraPassengerCharge,
      estimatedSubtotal: price.subtotal,
    };
    window.Storage.updateReservation(
      this.reservationId,
      "step1_pricing",
      s1Data,
    );

    // Mirror source to step3_adjustments for cross-step sync
    const reservation = window.Storage.getReservation(this.reservationId);
    if (reservation && reservation.data.step3_adjustments) {
      window.Storage.updateReservation(
        this.reservationId,
        "step3_adjustments",
        {
          ...reservation.data.step3_adjustments,
          bookingSource: source,
        },
      );
    }

    // Sync endTime in Step 2 if startTime already exists
    if (
      reservation &&
      reservation.data.step2_details &&
      reservation.data.step2_details.startTime
    ) {
      const s2 = reservation.data.step2_details;
      const newEndTime = window.Storage.addHours(s2.startTime, duration);

      window.Storage.updateReservation(this.reservationId, "step2_details", {
        ...s2,
        endTime: newEndTime,
      });
    }
  },

  getSourceLabel(val) {
    const sources = {
      direct: "📞 Direct - Call",
      "get-my-boat": "🐬 Get My Boat",
      viator: "✈️ Viator",
      fareharbor: "🚦 Fareharbor",
      "travel-cabo-tours": "🌴 Travel Cabo Tours",
      "anchor-rides": "⚓ Anchor Rides",
      "andres-lopez": "👤 Andres Lopez",
      "mauricio-bojorquez": "👤 Mauricio Bojorquez",
      "jose-ferron": "👤 Jose Ferron",
      "ramiro-munguia": "👤 Ramiro Munguia",
      "adriana-transcabo": "👩 Adriana Transcabo",
      "grand-solmar": "🏨 Grand Solmar",
      "eduardo-araujo": "👤 Eduardo Araujo",
    };
    return sources[val] || sources["direct"];
  },

  renderSourceOptions(current) {
    const sources = [
      { id: "direct", label: "📞 Direct - Call" },
      { id: "get-my-boat", label: "🐬 Get My Boat" },
      { id: "viator", label: "✈️ Viator" },
      { id: "fareharbor", label: "🚦 Fareharbor" },
      { id: "travel-cabo-tours", label: "🌴 Travel Cabo Tours" },
      { id: "anchor-rides", label: "⚓ Anchor Rides" },
      { id: "andres-lopez", label: "👤 Andres Lopez" },
      { id: "mauricio-bojorquez", label: "👤 Mauricio Bojorquez" },
      { id: "jose-ferron", label: "👤 Jose Ferron" },
      { id: "ramiro-munguia", label: "👤 Ramiro Munguia" },
      { id: "adriana-transcabo", label: "👩 Adriana Transcabo" },
      { id: "grand-solmar", label: "🏨 Grand Solmar" },
      { id: "eduardo-araujo", label: "👤 Eduardo Araujo" },
    ];
    return sources
      .map(
        (s) => `
      <div class="custom-select-option ${s.id === current ? "selected" : ""}" data-value="${s.id}">
        ${s.label}
      </div>
    `,
      )
      .join("");
  },

  formatCurrency(amount) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  },

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  destroy() {
    this.container = null;
    this.reservationId = null;
    if (this.sheetContainer && this.sheetContainer.parentNode) {
      this.sheetContainer.parentNode.removeChild(this.sheetContainer);
    }
    this.sheetContainer = null;
  },
};

window.Step1Screen = Step1Screen;
