/**
 * Step 3 — Adjustments & Booking Screen — Love Shack v3
 * Source, discounts, extras, full breakdown, confirm booking
 */

const Step3Screen = {
  container: null,
  reservationId: null,
  calculator: null,

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

    const s1 = reservation.data.step1_pricing;
    const s2 = reservation.data.step2_details;
    const s3 = reservation.data.step3_adjustments || {};

    let source = s1?.source || s3.bookingSource || "direct";

    if (s1 && !s1.source && s3.bookingSource) {
      s1.source = s3.bookingSource;
      window.Storage.updateReservation(this.reservationId, "step1_pricing", s1);
    }

    const isBooked = reservation.status !== "draft";
    const sources = window.PRICING_RULES?.sources || [
      { id: "direct", name: "📞 Direct - Call" },
      { id: "get-my-boat", name: "🐬 Get My Boat" },
      { id: "viator", name: "✈️ Viator" },
    ];

    const foodOptions = window.PRICING_RULES?.foodOptions || [
      { name: "MEXICAN BUFFET & NATIONAL OPEN BAR" },
      { name: "CHICKEN & VEGETARIAN MENU WITH NATIONAL OPEN BAR" },
      { name: "TACOS & NATIONAL OPEN BAR" },
      { name: "SNACKS & NATIONAL OPEN BAR" },
    ];

    const repriceTypes = [
      { code: "", label: "None" },
      { code: "%", label: "% Percentage" },
      { code: "#", label: "$ Fixed Discount" },
      { code: "$", label: "$ Fixed Price" },
      { code: "coupon", label: "Coupon" },
    ];

    const isFishing = s2.tourType === "Fishing";
    const fishingLicenses = s3.fishingLicenses || 0;
    const extrasAmount = s3.extrasAmount || 0;

    container.innerHTML = `
      <div class="step-content stagger-children">
        <!-- Reservation Summary Accordion -->
        <div class="summary-accordion" id="summaryAccordion">
          <div class="summary-accordion-trigger" id="accordionTrigger">
            <svg class="summary-accordion-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
            <div id="summaryHeader">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-2);">
                <span style="font-size: var(--font-lg); font-weight: var(--weight-bold); color: var(--color-gold);">
                  ${this.escapeHtml(s2.customerName || "Unnamed Quote")}
                </span>
                <span class="badge badge-${reservation.status}">${reservation.status}</span>
              </div>
              <div style="font-size: var(--font-sm); color: var(--color-text-secondary); display: flex; flex-wrap: wrap; gap: var(--space-3);">
                <span>${s2.tourType || "No tour"}</span>
                <span>·</span>
                <span>${s1.durationHours}h · ${s1.passengers} pax</span>
                ${s2.tripDate ? `<span>·</span><span>${new Date(s2.tripDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>` : ""}
              </div>
            </div>
          </div>
          <div class="summary-accordion-content">
            <div class="input-group">
              <div class="input-group-row">
                <span class="input-group-label" style="display: flex; align-items: center; gap: 8px;">
                  <div class="s2-avatar" id="editAvatarBox" style="background-color: ${s2.customerName ? this.createRandomColor(s2.customerName) : "var(--color-border)"}">
                    <svg id="editDefaultIcon" class="s2-avatar-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="display: ${s2.customerName ? "none" : "block"}; width: 14px; height: 14px;">
                      <path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="white"/>
                    </svg>
                    <span id="editInitialsText" class="s2-avatar-initials" style="display: ${s2.customerName ? "block" : "none"}">${this.getNameInitials(s2.customerName || "")}</span>
                  </div>
                  Customer
                </span>
                <div class="input-group-value">
                  <input type="text" id="editCustomerName" value="${this.escapeHtml(s2.customerName || "")}" placeholder="Name">
                </div>
              </div>
              <div class="input-group-row">
                <span class="input-group-label">Tour Type</span>
                <div class="input-group-value" id="triggerTourType" style="cursor: pointer;">
                  <div class="input-display-box" id="displayTourType" style="text-align: left; display: flex; align-items: center; gap: 10px;">
                    <span id="tourTypeEmoji">${this.getTourEmoji(s2.tourType)}</span>
                    <span id="tourTypeLabel">${s2.tourType || "Select tour"}</span>
                  </div>
                </div>
              </div>
              <div class="input-group-row">
                <span class="input-group-label">Trip Date</span>
                <div class="input-group-value" id="triggerDate" style="cursor: pointer;">
                  <div class="input-display-box" id="displayTripDate" style="text-align: left; display: flex; align-items: center; justify-content: space-between;">
                    <span>${s2.tripDate ? new Date(s2.tripDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Select date"}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </div>
                </div>
              </div>
              <div class="input-group-row">
                <span class="input-group-label">Times</span>
                <div class="input-group-value" id="triggerTimes" style="cursor: pointer; display: flex; gap: 8px;">
                  <div class="input-display-box" id="displayStartTime">${s2.startTime || "--:--"}</div>
                  <span style="align-self: center; opacity: 0.5;">to</span>
                  <div class="input-display-box" id="displayEndTime">${s2.endTime || "--:--"}</div>
                </div>
              </div>
              <div class="input-group-row">
                <span class="input-group-label">Duration / Pax</span>
                <div class="input-group-value" id="triggerDurPax" style="cursor: pointer; display: flex; gap: 8px;">
                  <div class="input-display-box" style="flex:1">
                    <span id="displayDurationForm">${s1.durationHours}</span>
                    <span style="font-size: 10px; opacity: 0.5;">h</span>
                  </div>
                  <div class="input-display-box" style="flex:1">
                    <span id="displayPassengersForm">${s1.passengers}</span>
                    <span style="font-size: 10px; opacity: 0.5;">pax</span>
                  </div>
                </div>
              </div>
              <div id="tourSuggestionContainer" style="padding: 0 var(--space-4) var(--space-4);"></div>
            </div>
            <div class="summary-form-footer">
              <button class="btn btn-secondary" onclick="window.App.navigate('#/new/${this.reservationId}/details')" style="font-size: 11px; padding: 6px 12px; height: auto;">
                 Edit full details in Step 2 →
              </button>
            </div>
          </div>
        </div>

         <!-- Booking Source -->
         <div class="step-section">
           <div class="step-section-title">Booking Source</div>
           <div class="custom-select-wrapper" id="sourceSelect">
             <div class="custom-select-trigger" id="sourceTrigger">
               <input type="text" class="custom-select-input" id="sourceInput"
                      placeholder="Search sources..."
                      value="${this.getSourceName(source, sources)}"
                      autocomplete="off">
               <svg class="custom-select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <polyline points="6 9 12 15 18 9"/>
               </svg>
             </div>
             <div class="custom-select-dropdown" id="sourceDropdown">
               ${sources
                 .map(
                   (s) => `
                 <div class="custom-select-option ${s.id === source ? "selected" : ""}"
                      data-value="${s.id}">
                   ${s.name}
                 </div>
               `,
                 )
                 .join("")}
             </div>
           </div>
         </div>

         <!-- Food Option -->
         <div class="step-section">
           <div class="step-section-title">Food Option</div>
           <div class="custom-select-wrapper" id="foodSelect">
             <div class="custom-select-trigger" id="foodTrigger">
               <input type="text" class="custom-select-input" id="foodInput"
                      placeholder="Search food menus..."
                      value="${s2.foodType || "No food selected"}"
                      autocomplete="off">
               <svg class="custom-select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <polyline points="6 9 12 15 18 9"/>
               </svg>
             </div>
             <div class="custom-select-dropdown" id="foodDropdown">
               ${foodOptions
                 .map(
                   (f) => `
                 <div class="custom-select-option ${f.name === s2.foodType ? "selected" : ""}"
                      data-value="${this.escapeHtml(f.name)}">
                   ${f.name}
                 </div>
               `,
                 )
                 .join("")}
             </div>
           </div>
         </div>

        <!-- Price Adjustments -->
        <div class="step-section">
          <div class="step-section-title">Discounts</div>
          <div class="input-group">
            <div class="input-group-row">
              <span class="input-group-label">Type</span>
              <div class="input-group-value">
                <select id="repriceType" data-field="repriceType">
                  ${repriceTypes
                    .map(
                      (rt) =>
                        `<option value="${rt.code}" ${s3.repriceType === rt.code ? "selected" : ""}>${rt.label}</option>`,
                    )
                    .join("")}
                </select>
              </div>
            </div>
            <div class="input-group-row" id="repriceValueRow" style="display: ${s3.repriceType ? "" : "none"}">
              <span class="input-group-label">Value</span>
              <div class="input-group-value">
                <input type="number" id="repriceDiscount" placeholder="0"
                       value="${s3.repriceDiscount || ""}" data-field="repriceDiscount" min="0">
              </div>
            </div>
          </div>
        </div>


        <!-- Deposit -->
        <div class="step-section">
          <div class="input-group" id="depositAddContainer" style="display: ${s3.deposit ? "none" : "block"}">
            <div class="s2-action-row" id="depositRevealBtn">
              <svg class="s2-icon-add" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="11" fill="var(--color-success, #34c759)"/>
                <path d="M12 6v12m-6-6h12" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <span class="s2-text-add">agregar un depósito</span>
            </div>
          </div>
          <div class="input-group" id="depositInputContainer" style="display: ${s3.deposit ? "block" : "none"}">
            <div class="input-group-row">
              <span class="input-group-label">💵 Deposit</span>
              <div class="input-group-value">
                <input type="number" id="deposit" placeholder="0"
                       value="${s3.deposit || ""}" data-field="deposit" min="0">
              </div>
            </div>
          </div>
        </div>

        <!-- Extras -->
        <div class="step-section">
          <div class="input-group" id="extrasAddContainer" style="display: ${s3.extrasAmount || fishingLicenses ? "none" : "block"}">
            <div class="s2-action-row" id="extrasRevealBtn">
              <svg class="s2-icon-add" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="11" fill="var(--color-success, #34c759)"/>
                <path d="M12 6v12m-6-6h12" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <span class="s2-text-add">agregar extras</span>
            </div>
          </div>
          <div class="input-group" id="extrasInputContainer" style="display: ${s3.extrasAmount || fishingLicenses ? "block" : "none"}">
            <div class="input-group-row">
              <span class="input-group-label">Extras $</span>
              <div class="input-group-value">
                <input type="number" id="extrasAmount" placeholder="0"
                       value="${s3.extrasAmount || ""}" data-field="extrasAmount" min="0">
              </div>
            </div>
            ${
              isFishing
                ? `
            <div class="input-group-row">
              <span class="input-group-label">🎣 Licenses</span>
              <div class="input-group-value">
                <input type="number" id="fishingLicenses" placeholder="0"
                       value="${s3.fishingLicenses || ""}" data-field="fishingLicenses" min="0">
              </div>
            </div>
            `
                : ""
            }
          </div>
        </div>

        <!-- Full Pricing Breakdown -->
        <div class="step-section">
          <div class="step-section-title">Price Breakdown</div>
          <div class="breakdown" id="fullBreakdown">
            <!-- Populated by recalculate() -->
          </div>
        </div>

        <!-- Manual Rates Override -->
        <div class="step-section" style="--gap: 10px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div class="step-section-title" style="margin: 0;">Manual Rate Overrides</div>
            <label class="switch">
              <input type="checkbox" id="overridesToggle" ${s3.manualHourlyRate || s3.manualExtraPaxRate ? "checked" : ""}>
              <span class="slider"></span>
            </label>
          </div>
          <div class="input-group" id="overridesInputContainer" style="display: ${s3.manualHourlyRate || s3.manualExtraPaxRate ? "block" : "none"}">
            <div class="input-group-row" style="gap: var(--gap)">
              <span class="input-group-label" style="">Hourly Rate <small>Override</small></span>
              <div class="input-group-value" style="display: flex; align-items: center; gap: 8px;">
                <span style="opacity: 0.5;">$</span>
                <input type="number" id="manualHourlyRate" placeholder="${window.PRICING_RULES?.pricingTypes.find((t) => t.id === (s1.pricingType || "regular"))?.hourlyRate || 600}"
                       value="${s3.manualHourlyRate || ""}" min="0" style="font-size: 12px; text-align: right;">
              </div>
            </div>
            <div class="input-group-row" style="gap: var(--gap)">
              <span class="input-group-label" style="">Extra Pax <small>Override</small></span>
              <div class="input-group-value" style="display: flex; align-items: center; gap: 8px;">
                <span style="opacity: 0.5;">$</span>
                <input type="number" id="manualExtraPaxRate" placeholder="${window.PRICING_RULES?.pricingTypes.find((t) => t.id === (s1.pricingType || "regular"))?.extraPassengerRate || 100}"
                       value="${s3.manualExtraPaxRate || ""}" min="0" style="font-size: 12px; text-align: right;">
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; flex-direction: column; gap: var(--space-3); margin-top: var(--space-4);">
          <button class="btn btn-secondary btn-full" onclick="window.App.navigate('#/voucher/${this.reservationId}')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            Print Voucher
          </button>

          ${
            isBooked
              ? `
            <button class="btn btn-danger btn-full" id="deleteBtn">
              <i class="ti ti-trash"></i> Delete Reservation
            </button>
          `
              : ""
          }
        </div>
      </div>
    `;

    this.bindEvents();
    this.recalculate();
    this.updateTourSuggestion();
  },

  revealField(field) {
    const addContainer = document.getElementById(`${field}AddContainer`);
    const inputContainer = document.getElementById(`${field}InputContainer`);
    if (addContainer && inputContainer) {
      addContainer.style.display = "none";
      inputContainer.style.display = "block";
      const input = inputContainer.querySelector("input");
      if (input) input.focus();
    }
  },

  bindEvents() {
    const self = this;

    // Accordion Toggle
    const accordion = document.getElementById("summaryAccordion");
    const trigger = document.getElementById("accordionTrigger");
    trigger?.addEventListener("click", () => {
      accordion.classList.toggle("open");
    });

    // Edit Form Inputs
    document
      .getElementById("editCustomerName")
      ?.addEventListener("input", () => this.updateTripDetails());

    // Trigger Pickers
    document
      .getElementById("triggerTourType")
      ?.addEventListener("click", () => this.openTourTypeSheet());
    document
      .getElementById("triggerDate")
      ?.addEventListener("click", () => this.openTimePicker("date"));
    document.getElementById("triggerTimes")?.addEventListener("click", (e) => {
      const isEnd = e.target.closest("#displayEndTime");
      this.openTimePicker(isEnd ? "to" : "from");
    });
    document
      .getElementById("triggerDurPax")
      ?.addEventListener("click", () => this.openDurPaxPicker());

    // Reveal buttons
    document
      .getElementById("extrasRevealBtn")
      ?.addEventListener("click", () => self.revealField("extras"));
    document
      .getElementById("depositRevealBtn")
      ?.addEventListener("click", () => self.revealField("deposit"));

    // Overrides Toggle
    const overridesToggle = document.getElementById("overridesToggle");
    const overridesContainer = document.getElementById("overridesInputContainer");
    overridesToggle?.addEventListener("change", () => {
      if (overridesToggle.checked) {
        overridesContainer.style.display = "block";
        const input = overridesContainer.querySelector("input");
        if (input) input.focus();
      } else {
        overridesContainer.style.display = "none";
        const inputs = overridesContainer.querySelectorAll("input");
        inputs.forEach(inp => inp.value = "");
        this.recalculate();
      }
    });
    // Source select
    const srcWrapper = document.getElementById("sourceSelect");
    const srcInput = document.getElementById("sourceInput");
    const srcDropdown = document.getElementById("sourceDropdown");

    this.setupSelect(srcWrapper, srcInput, srcDropdown, (val) => {
      const sources = window.PRICING_RULES?.sources || [];
      srcInput.value = this.getSourceName(val, sources);
      this.recalculate();
    });

    // Food select
    const foodWrapper = document.getElementById("foodSelect");
    const foodInput = document.getElementById("foodInput");
    const foodDropdown = document.getElementById("foodDropdown");

    this.setupSelect(foodWrapper, foodInput, foodDropdown, (val) => {
      foodInput.value = val;
      // Update s2.foodType immediately in storage
      const reservation = window.Storage.getReservation(this.reservationId);
      if (reservation) {
        const s2 = { ...reservation.data.step2_details, foodType: val };
        window.Storage.updateReservation(
          this.reservationId,
          "step2_details",
          s2,
        );
      }
      this.recalculate();
    });

    const repriceType = document.getElementById("repriceType");
    repriceType?.addEventListener("change", () => {
      const row = document.getElementById("repriceValueRow");
      if (row) row.style.display = repriceType.value ? "" : "none";
      this.recalculate();
    });

    this.container
      .querySelectorAll('input[type="number"], select')
      .forEach((el) => {
        el.addEventListener("input", () => this.recalculate());
        el.addEventListener("change", () => this.recalculate());
      });

    document.getElementById("deleteBtn")?.addEventListener("click", () => {
      if (confirm("Are you sure you want to delete this reservation?")) {
        window.Storage.deleteReservation(this.reservationId);
        window.Toast.success("Reservation deleted");
        window.App.navigate("#/dashboard");
      }
    });
  },

  setupSelect(wrapper, input, dropdown, onSelect) {
    if (!wrapper || !input || !dropdown) return;

    input.addEventListener("focus", () => {
      wrapper.classList.add("open");
      input.value = "";
      this.filterOptions(dropdown, "");
    });

    input.addEventListener("input", () => {
      this.filterOptions(dropdown, input.value);
    });

    dropdown.addEventListener("click", (e) => {
      const option = e.target.closest(".custom-select-option");
      if (!option) return;
      const value = option.dataset.value;
      dropdown
        .querySelectorAll(".custom-select-option")
        .forEach((o) => o.classList.remove("selected"));
      option.classList.add("selected");
      wrapper.classList.remove("open");
      onSelect(value);
    });

    document.addEventListener("click", (e) => {
      if (!wrapper.contains(e.target)) {
        wrapper.classList.remove("open");
        const selected = dropdown.querySelector(".selected");
        if (selected && !input.value) {
          input.value = selected.textContent.trim();
        }
      }
    });
  },

  filterOptions(dropdown, query) {
    const q = query.toLowerCase();
    dropdown.querySelectorAll(".custom-select-option").forEach((opt) => {
      const text = opt.textContent.toLowerCase();
      opt.style.display = text.includes(q) ? "" : "none";
    });
  },

  recalculate() {
    const reservation = window.Storage.getReservation(this.reservationId);
    if (!reservation) return;

    const s1 = reservation.data.step1_pricing;
    const s2 = reservation.data.step2_details;

    const selectedSource = this.container.querySelector(
      "#sourceSelect .custom-select-option.selected",
    );
    const sourceId = selectedSource?.dataset.value || "direct";
    const repriceType = document.getElementById("repriceType")?.value || "";
    const repriceDiscount =
      parseFloat(document.getElementById("repriceDiscount")?.value) || 0;
    const extrasAmount =
      parseFloat(document.getElementById("extrasAmount")?.value) || 0;
    const fishingLicenses =
      parseInt(document.getElementById("fishingLicenses")?.value) || 0;
    const deposit = parseFloat(document.getElementById("deposit")?.value) || 0;
    const manualHourlyRate =
      parseFloat(document.getElementById("manualHourlyRate")?.value) || null;
    const manualExtraPaxRate =
      parseFloat(document.getElementById("manualExtraPaxRate")?.value) || null;

    let result;
    if (this.calculator) {
      result = this.calculator.calculate({
        trip: {
          tourType: s2.tourType || "",
          duration: s1.durationHours,
          adults: s1.passengers,
        },
        pricingType: s1.pricingType || "regular",
        source: sourceId,
        manualHourlyRate,
        manualExtraPaxRate,
        extras: {
          fishingLicenses: fishingLicenses,
          amount: extrasAmount,
        },
        reprice: {
          type: repriceType,
          discount: repriceDiscount,
        },
      });
    } else {
      result = {
        summary: {
          basePrice: s1.estimatedSubtotal || 0,
          extras: extrasAmount,
          subtotal: (s1.estimatedSubtotal || 0) + extrasAmount,
          discount: 0,
          businessPrice: (s1.estimatedSubtotal || 0) + extrasAmount,
          fee: 0,
          customerPrice: (s1.estimatedSubtotal || 0) + extrasAmount,
        },
        basePricing: s1,
        fee: { hasFee: false, sourceName: "Direct", feeNote: "" },
      };
    }

    const s = result.summary;
    const balance = s.customerPrice - deposit;

    const breakdown = document.getElementById("fullBreakdown");
    if (!breakdown) return;
    let html = "";

    html += this.breakdownRow(
      "Base trip",
      `${s1.durationHours}h × $${s1.hourlyRate}`,
      this.fmt(s.basePrice),
    );
    if (s1.extraPassengers > 0)
      html += this.breakdownRow(
        "Extra passengers",
        `${s1.extraPassengers} pax`,
        this.fmt(s1.extraPassengerCharge),
      );
    if (s.extras > 0)
      html += this.breakdownRow("Extra services", "", this.fmt(s.extras));
    html += this.breakdownRow("Subtotal", "", this.fmt(s.subtotal), "subtotal");
    if (s.discount > 0)
      html += this.breakdownRow(
        `Discount (${repriceType})`,
        "",
        "-" + this.fmt(s.discount),
        "discount",
      );
    html += this.breakdownRow(
      "Business receives",
      "",
      this.fmt(s.businessPrice),
    );
    if (result.fee?.hasFee)
      html += this.breakdownRow(
        `Fee (${result.fee.feeNote || ""})`,
        "",
        this.fmt(s.fee),
        "fee",
      );
    html += `<div class="breakdown-row total"><span class="breakdown-label">Customer Pays</span><span class="breakdown-value">${this.fmt(s.customerPrice)}</span></div>`;
    if (deposit > 0) {
      html += this.breakdownRow(
        "Deposit paid",
        "",
        "-" + this.fmt(deposit),
        "discount",
      );
      html += `<div class="breakdown-row total"><span class="breakdown-label">Balance Due</span><span class="breakdown-value" style="color: ${balance > 0 ? "var(--color-warning)" : "var(--color-success)"}">${this.fmt(balance)}</span></div>`;
    }

    breakdown.innerHTML = html;

    // Save adjustments & source immediately to LocalStorage for both drafts and confirmed bookings
    const s3Data = {
      bookingSource: sourceId,
      repriceType,
      repriceDiscount,
      extrasAmount,
      fishingLicenses,
      finalBusinessPrice: s.businessPrice,
      finalCustomerPrice: s.customerPrice,
      feeAmount: s.fee,
      deposit,
      balance,
      paymentMethod:
        document.getElementById("paymentMethod")?.value || "cash",
      manualHourlyRate,
      manualExtraPaxRate,
    };

    window.Storage.updateReservation(
      this.reservationId,
      "step3_adjustments",
      s3Data,
    );

    const s1Data = { ...s1, source: sourceId };
    window.Storage.updateReservation(
      this.reservationId,
      "step1_pricing",
      s1Data,
    );

    if (reservation.status === "draft") {
      window.Storage.updateCurrentStep(this.reservationId, 3);
    }
  },

  autoSave() {
    this.recalculate();
  },

  updateTripDetails() {
    const reservation = window.Storage.getReservation(this.reservationId);
    if (!reservation) return;

    const s1 = { ...reservation.data.step1_pricing };
    const s2 = { ...reservation.data.step2_details };

    // Read from fields (some are updated by pickers)
    s2.customerName = document.getElementById("editCustomerName")?.value || "";

    // Sync back to storage
    window.Storage.updateReservation(this.reservationId, "step1_pricing", s1);
    window.Storage.updateReservation(this.reservationId, "step2_details", s2);

    // Update Avatar in Form
    const avatarBox = document.getElementById("editAvatarBox");
    const defaultIcon = document.getElementById("editDefaultIcon");
    const initialsText = document.getElementById("editInitialsText");
    if (avatarBox) {
      avatarBox.style.backgroundColor = s2.customerName
        ? this.createRandomColor(s2.customerName)
        : "var(--color-border)";
      if (s2.customerName) {
        defaultIcon.style.display = "none";
        initialsText.style.display = "block";
        initialsText.textContent = this.getNameInitials(s2.customerName);
      } else {
        defaultIcon.style.display = "block";
        initialsText.style.display = "none";
      }
    }

    // Update Header HTML in real-time
    const header = document.getElementById("summaryHeader");
    if (header) {
      const dateStr = s2.tripDate
        ? new Date(s2.tripDate + "T00:00:00").toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })
        : "";

      header.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-2);">
          <span style="font-size: var(--font-lg); font-weight: var(--weight-bold); color: var(--color-gold);">
            ${this.escapeHtml(s2.customerName || "Unnamed Quote")}
          </span>
          <span class="badge badge-${reservation.status}">${reservation.status}</span>
        </div>
        <div style="font-size: var(--font-sm); color: var(--color-text-secondary); display: flex; flex-wrap: wrap; gap: var(--space-3);">
          <span>${s2.tourType || "No tour"}</span>
          <span>·</span>
          <span>${s1.durationHours}h · ${s1.passengers} pax</span>
          ${dateStr ? `<span>·</span><span>${dateStr}</span>` : ""}
        </div>
      `;
    }

    // Recalculate full breakdown
    this.recalculate();
    this.updateTourSuggestion();
  },

  updateTourSuggestion() {
    const reservation = window.Storage.getReservation(this.reservationId);
    if (!reservation) return;

    const s1 = reservation.data.step1_pricing;
    const s2 = reservation.data.step2_details;
    const container = document.getElementById("tourSuggestionContainer");
    if (!container) return;

    if (!window.TourSuggestions) {
      container.innerHTML = "";
      return;
    }

    const suggestion = window.TourSuggestions.getSuggestion(
      s1.durationHours,
      s2.startTime,
    );
    const isSelected = suggestion && suggestion.id === s2.tourType;

    container.innerHTML = window.TourSuggestions.renderPill(
      suggestion,
      isSelected,
    );

    // Bind click
    const pill = container.querySelector(".tour-suggestion-pill.active");
    if (pill) {
      pill.onclick = () => {
        const newTour = pill.dataset.suggestedTour;
        const res = window.Storage.getReservation(this.reservationId);
        const updatedS2 = { ...res.data.step2_details, tourType: newTour };
        window.Storage.updateReservation(
          this.reservationId,
          "step2_details",
          updatedS2,
        );

        // Feedback
        pill.classList.remove("active");
        pill.classList.add("selected");
        pill.innerHTML = `
          <span class="suggestion-icon">✓</span>
          <span class="suggestion-text">Excellent choice</span>
        `;

        this.updateTripDetails();
      };
    }
  },

  openTimePicker(mode = "date") {
    const reservation = window.Storage.getReservation(this.reservationId);
    const s2 = reservation.data.step2_details;
    const s1 = reservation.data.step1_pricing;

    // Create sheet wrapper if it doesn't exist
    let wrapper = document.getElementById("s3-time-sheet-wrapper");
    if (!wrapper) {
      wrapper = document.createElement("div");
      wrapper.id = "s3-time-sheet-wrapper";
      wrapper.innerHTML = `
        <div class="dtp-backdrop" id="s3-time-backdrop"></div>
        <div class="dtp-sheet" id="s3-time-sheet" style="padding: 0; background: var(--color-surface-alt);">
          <div class="dtp-sheet-handle-row"><div class="dtp-handle"></div></div>
          <div id="s3-datetime-picker-mount" style="padding: 16px;"></div>
          <div style="padding: 0 24px 24px;">
            <button class="btn btn-primary btn-full" id="s3-time-ok">Confirm Schedule</button>
          </div>
        </div>
      `;
      document.body.appendChild(wrapper);
    }

    const backdrop = document.getElementById("s3-time-backdrop");
    const sheet = document.getElementById("s3-time-sheet");
    const mount = document.getElementById("s3-datetime-picker-mount");

    // Show sheet
    backdrop.setAttribute("data-state", "open");
    sheet.setAttribute("data-state", "open");

    // Initialize Picker
    const picker = new window.DateTimePicker(mount, {
      initialDate: s2.tripDate,
      initialFrom: s2.startTime,
      initialTo: s2.endTime,
      duration: s1.durationHours,
      onChange: (values) => {
        // We handle the actual update on "Confirm" button
      },
    });

    // Jump to mode
    if (mode === "from" || mode === "to") {
      setTimeout(() => {
        picker._openSheet(mode);
      }, 50);
    }

    document.getElementById("s3-time-ok").onclick = () => {
      const res = window.Storage.getReservation(this.reservationId);

      let tripDate = res.data.step2_details.tripDate;
      if (picker.selectedDate) {
        const y = picker.selectedDate.getFullYear();
        const m = String(picker.selectedDate.getMonth() + 1).padStart(2, "0");
        const d = String(picker.selectedDate.getDate()).padStart(2, "0");
        tripDate = `${y}-${m}-${d}`;
      }

      const values = {
        tripDate: tripDate,
        startTime: picker.slots.from.confirmed
          ? picker._fmtSlot(picker.slots.from)
          : res.data.step2_details.startTime,
        endTime: picker.slots.to.confirmed
          ? picker._fmtSlot(picker.slots.to)
          : res.data.step2_details.endTime,
      };

      const updatedS2 = {
        ...res.data.step2_details,
        tripDate: values.tripDate,
        startTime: values.startTime,
        endTime: values.endTime,
      };
      window.Storage.updateReservation(
        this.reservationId,
        "step2_details",
        updatedS2,
      );

      // Update UI triggers
      const dateEl = document.getElementById("displayTripDate");
      if (dateEl) {
        dateEl.querySelector("span").textContent = values.tripDate
          ? new Date(values.tripDate + "T00:00:00").toLocaleDateString(
              "en-US",
              { month: "short", day: "numeric", year: "numeric" },
            )
          : "Select date";
      }
      document.getElementById("displayStartTime").textContent =
        values.startTime || "--:--";
      document.getElementById("displayEndTime").textContent =
        values.endTime || "--:--";

      this.updateTripDetails();

      // Hide sheet
      backdrop.removeAttribute("data-state");
      sheet.removeAttribute("data-state");
    };

    backdrop.onclick = () => {
      backdrop.removeAttribute("data-state");
      sheet.removeAttribute("data-state");
    };
  },

  openDurPaxPicker() {
    const reservation = window.Storage.getReservation(this.reservationId);
    const s1 = reservation.data.step1_pricing;

    // We reuse the DualWheelSheet concept from Step 1
    if (!this.durPaxPicker) {
      this.renderDurPaxSheet();
    }

    this.showDurPaxSheet(s1.durationHours, s1.passengers);
  },

  renderDurPaxSheet() {
    this.durPaxContainer = document.createElement("div");
    this.durPaxContainer.innerHTML = `
      <div class="dtp-backdrop" id="s3-durpax-backdrop"></div>
      <div class="dtp-sheet" id="s3-durpax-sheet">
        <div class="dtp-sheet-handle-row"><div class="dtp-handle"></div></div>
        <div class="dtp-sheet-header">
          <div style="width:34px"></div>
          <span class="dtp-sheet-title">Duration & Pax</span>
          <button class="dtp-btn-cancel" id="s3-durpax-cancel">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div class="dtp-wheels-row">
          <div class="dtp-wheel-col">
            <div class="dtp-wheel-heading">horas</div>
            <div class="dtp-wheel-wrap">
              <div class="dtp-wheel-track" id="s3-trk-duration">
                ${Array.from({ length: 7 }, (_, i) => `<div class="dtp-wheel-item">${2 + i}</div>`).join("")}
              </div>
              <div class="dtp-wheel-cursor"></div>
            </div>
          </div>
          <div class="dtp-wheel-col">
            <div class="dtp-wheel-heading">pax</div>
            <div class="dtp-wheel-wrap">
              <div class="dtp-wheel-track" id="s3-trk-passengers">
                ${Array.from({ length: 55 }, (_, i) => `<div class="dtp-wheel-item">${1 + i}</div>`).join("")}
              </div>
              <div class="dtp-wheel-cursor"></div>
            </div>
          </div>
        </div>
        <button class="dtp-btn-confirm" id="s3-durpax-ok">confirmar</button>
      </div>
    `;
    document.body.appendChild(this.durPaxContainer);

    // Bind local wheel events
    const trkDur = document.getElementById("s3-trk-duration");
    const trkPax = document.getElementById("s3-trk-passengers");
    const STEP = 48;

    const handleScroll = (track) => {
      const idx = Math.round(track.scrollTop / STEP);
      track.querySelectorAll(".dtp-wheel-item").forEach((it, i) => {
        it.classList.toggle("active", i === idx);
      });
    };

    trkDur.addEventListener("scroll", () => handleScroll(trkDur));
    trkPax.addEventListener("scroll", () => handleScroll(trkPax));

    document.getElementById("s3-durpax-cancel").onclick = () =>
      this.hideDurPaxSheet();
    document.getElementById("s3-durpax-backdrop").onclick = () =>
      this.hideDurPaxSheet();
    document.getElementById("s3-durpax-ok").onclick = () => {
      const durIdx = Math.round(trkDur.scrollTop / STEP);
      const paxIdx = Math.round(trkPax.scrollTop / STEP);
      const duration = 2 + durIdx;
      const passengers = 1 + paxIdx;

      const res = window.Storage.getReservation(this.reservationId);
      const updatedS1 = {
        ...res.data.step1_pricing,
        durationHours: duration,
        passengers: passengers,
      };
      window.Storage.updateReservation(
        this.reservationId,
        "step1_pricing",
        updatedS1,
      );

      // Update UI
      document.getElementById("displayDurationForm").textContent = duration;
      document.getElementById("displayPassengersForm").textContent = passengers;

      this.updateTripDetails();
      this.hideDurPaxSheet();
    };

    this.durPaxPicker = true;
  },

  showDurPaxSheet(curDur, curPax) {
    document
      .getElementById("s3-durpax-backdrop")
      .setAttribute("data-state", "open");
    document
      .getElementById("s3-durpax-sheet")
      .setAttribute("data-state", "open");

    const trkDur = document.getElementById("s3-trk-duration");
    const trkPax = document.getElementById("s3-trk-passengers");
    const STEP = 48;

    setTimeout(() => {
      trkDur.scrollTo({ top: (curDur - 2) * STEP });
      trkPax.scrollTo({ top: (curPax - 1) * STEP });
    }, 50);
  },

  hideDurPaxSheet() {
    document.getElementById("s3-durpax-backdrop").removeAttribute("data-state");
    document.getElementById("s3-durpax-sheet").removeAttribute("data-state");
  },

  breakdownRow(label, detail, value, cls = "") {
    return `<div class="breakdown-row ${cls}"><span class="breakdown-label">${label} ${detail ? `<span style="font-size: var(--font-xs); opacity: 0.6;">${detail}</span>` : ""}</span><span class="breakdown-value">${value}</span></div>`;
  },

  async confirmBooking() {
    const reservation = window.Storage.getReservation(this.reservationId);
    if (!reservation) return;
    const s2 = reservation.data.step2_details;
    if (!s2.customerName) {
      window.Toast.warning("Please add a customer name in Step 2");
      return;
    }

    window.Toast.success("Confirming booking...");
    window.Storage.promoteToBooking(this.reservationId);

    if (window.SyncManager) {
      try {
        await window.SyncManager.syncReservation(this.reservationId);
        window.Toast.success("Booking confirmed & synced! 🎉");
      } catch (e) {
        console.error("Sync error during confirm", e);
        window.Toast.warning("Booking confirmed, but sync failed.");
      }
    } else {
      window.Toast.success("Booking confirmed! 🎉");
    }

    window.App.navigate("#/dashboard");
  },

  getSourceName(sourceId, sources) {
    const source = sources.find((s) => s.id === sourceId);
    return source ? source.name : sourceId;
  },

  fmt(amount) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount || 0);
  },

  openTourTypeSheet() {
    const reservation = window.Storage.getReservation(this.reservationId);
    const s2 = reservation.data.step2_details;

    const tours = [
      { id: "Bay Trip", emoji: "🌊", label: "Bay Trip" },
      { id: "Whale Watching", emoji: "🐋", label: "Whale Watch" },
      { id: "Snorkeling Tour", emoji: "🤿", label: "Snorkel" },
      { id: "Sunset Cruise", emoji: "🌅", label: "Sunset" },
      { id: "Fishing", emoji: "🎣", label: "Fishing" },
    ];

    let wrapper = document.getElementById("s3-tour-sheet-wrapper");
    if (!wrapper) {
      wrapper = document.createElement("div");
      wrapper.id = "s3-tour-sheet-wrapper";
      wrapper.innerHTML = `
        <div class="dtp-backdrop" id="s3-tour-backdrop"></div>
        <div class="dtp-sheet" id="s3-tour-sheet">
          <div class="dtp-sheet-handle-row"><div class="dtp-handle"></div></div>
          <div class="dtp-sheet-header">
            <div style="width:34px"></div>
            <span class="dtp-sheet-title">SELECT TOUR TYPE</span>
            <button class="dtp-btn-cancel" id="s3-tour-cancel">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div class="dtp-tour-options" style="padding: 0 20px 20px; display: flex; flex-direction: column; gap: 8px;">
            <!-- Options injected here -->
          </div>
        </div>
      `;
      document.body.appendChild(wrapper);
    }

    const backdrop = document.getElementById("s3-tour-backdrop");
    const sheet = document.getElementById("s3-tour-sheet");
    const optionsContainer = wrapper.querySelector(".dtp-tour-options");

    // Show sheet
    backdrop.setAttribute("data-state", "open");
    sheet.setAttribute("data-state", "open");

    // Render options
    optionsContainer.innerHTML = tours
      .map(
        (t) => `
      <div class="tour-option-item ${s2.tourType === t.id ? "selected" : ""}" data-tour="${t.id}" style="display: flex; align-items: center; padding: 16px; background: var(--color-surface-alt); border: 1px solid ${s2.tourType === t.id ? "var(--color-accent, #1a6ef5)" : "var(--color-border)"}; border-radius: 14px; cursor: pointer; transition: all 0.2s;">
        <span style="font-size: 24px; margin-right: 12px; filter: ${s2.tourType === t.id ? "none" : "grayscale(1) opacity(0.8)"}">${t.emoji}</span>
        <span style="font-size: 16px; font-weight: ${s2.tourType === t.id ? "600" : "500"}; color: ${s2.tourType === t.id ? "var(--color-text)" : "var(--color-text-secondary)"}; flex: 1;">${t.label}</span>
        ${s2.tourType === t.id ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent, #1a6ef5)" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>` : ""}
      </div>
    `,
      )
      .join("");

    optionsContainer.querySelectorAll(".tour-option-item").forEach((item) => {
      item.onclick = () => {
        const newTour = item.dataset.tour;
        const res = window.Storage.getReservation(this.reservationId);
        const updatedS2 = { ...res.data.step2_details, tourType: newTour };
        window.Storage.updateReservation(
          this.reservationId,
          "step2_details",
          updatedS2,
        );

        // Update UI Trigger
        document.getElementById("tourTypeEmoji").textContent =
          this.getTourEmoji(newTour);
        document.getElementById("tourTypeLabel").textContent = newTour;

        this.updateTripDetails();

        // Hide sheet
        backdrop.removeAttribute("data-state");
        sheet.removeAttribute("data-state");
      };
    });

    backdrop.onclick = () => {
      backdrop.removeAttribute("data-state");
      sheet.removeAttribute("data-state");
    };
    document.getElementById("s3-tour-cancel").onclick = () => {
      backdrop.removeAttribute("data-state");
      sheet.removeAttribute("data-state");
    };
  },

  getTourEmoji(type) {
    const tours = {
      "Bay Trip": "🌊",
      "Whale Watching": "🐋",
      "Snorkeling Tour": "🤿",
      "Sunset Cruise": "🌅",
      Fishing: "🎣",
    };
    return tours[type] || "📍";
  },

  escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  },

  getNameInitials(name) {
    if (!name) return "";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (
      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  },

  createRandomColor(name) {
    if (!name) return "var(--color-border)";
    const colors = [
      "#FF3B30",
      "#FF9500",
      "#FFCC00",
      "#34C759",
      "#007AFF",
      "#5856D6",
      "#AF52DE",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  },

  destroy() {
    this.container = null;
    this.reservationId = null;
  },
};

window.Step3Screen = Step3Screen;
