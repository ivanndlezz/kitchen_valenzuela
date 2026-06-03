/**
 * DateTimePicker Component — Love Shack v3
 * Full calendar + time wheel picker for Step 2 Schedule
 */
class DateTimePicker {
  constructor(container, options = {}) {
    this.container = container;
    this.onChange = options.onChange || (() => {});
    this.duration = options.duration || 3;

    // Calendar state
    this.today = new Date();
    this.today.setHours(0, 0, 0, 0);
    this.currentMonth = new Date(
      this.today.getFullYear(),
      this.today.getMonth(),
      1,
    );
    this.selectedDate = null;
    this.viewMode = "day";
    this.currentYear = this.today.getFullYear();
    this.yearRange = {
      start: Math.floor(this.currentYear / 12) * 12,
      end: Math.floor(this.currentYear / 12) * 12 + 11,
    };

    // Time state
    this.slots = {
      from: { h: 0, m: 0, ampm: "AM", confirmed: false },
      to: { h: 5, m: 0, ampm: "PM", confirmed: false },
    };
    this.activeSlot = null;
    this.STEP = 48;
    this.hours = [0, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6];
    this.minutes = Array.from({ length: 60 }, (_, i) => i);

    this.MONTHS_ES = [
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
      "Diciembre",
    ];
    this.MONTHS_SHORT = [
      "ENE",
      "FEB",
      "MAR",
      "ABR",
      "MAY",
      "JUN",
      "JUL",
      "AGO",
      "SEP",
      "OCT",
      "NOV",
      "DIC",
    ];
    this.DAYS_ES = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

    this.DISABLED_RULES = {
      allow_past_days: true,
      allow_past_months: true,
      allow_past_years: true,
      allow_weekends: true,
      allow_same_day: true,
      allow_future_limit: null,
    };

    // Hydrate from saved data
    if (options.initialDate) {
      const parts = options.initialDate.split("-");
      if (parts.length === 3) {
        this.selectedDate = new Date(+parts[0], +parts[1] - 1, +parts[2]);
        this.currentMonth = new Date(
          this.selectedDate.getFullYear(),
          this.selectedDate.getMonth(),
          1,
        );
      }
    }
    if (options.initialFrom)
      this._parseTime(options.initialFrom, this.slots.from);
    if (options.initialTo) this._parseTime(options.initialTo, this.slots.to);

    this._uid = "dtp-" + Math.random().toString(36).substr(2, 6);
    this.render();
    this._bindEvents();
    this._initWheels();
    this._renderCalendarView();
    this._syncSummary();
  }

  _parseTime(timeStr, slot) {
    const [h, m] = timeStr.split(":").map(Number);
    if (isNaN(h)) return;
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    slot.ampm = h >= 12 ? "PM" : "AM";
    slot.h = h12 === 12 ? (h >= 12 ? 12 : 0) : h12;
    // Remap: in our hours array 0=12AM, 12=12PM
    if (h === 0) slot.h = 0;
    else if (h === 12) slot.h = 12;
    else if (h > 12) slot.h = h - 12;
    else slot.h = h;
    slot.m = m || 0;
    slot.confirmed = true;
  }

  _id(suffix) {
    return this._uid + "-" + suffix;
  }
  _el(suffix) {
    return document.getElementById(this._id(suffix));
  }

  render() {
    const selDate = this.selectedDate;
    const monthText = selDate ? this.MONTHS_SHORT[selDate.getMonth()] : "";
    const dayText = selDate ? selDate.getDate() : "";
    const titleText = selDate
      ? `${selDate.getDate()} de ${this.MONTHS_ES[selDate.getMonth()]}`
      : "";
    const fromLabel = this.slots.from.confirmed
      ? this._fmtSlot(this.slots.from)
      : "";
    const toLabel = this.slots.to.confirmed ? this._fmtSlot(this.slots.to) : "";

    this.container.innerHTML = `
      <div class="dtp-root">
        <!-- Date Block -->
        <div class="dtp-block" id="${this._id("block-date")}">
          <button class="dtp-selected-wrapper" id="${this._id("sel-wrapper")}">
            <div class="dtp-calendar-badge">
              <div class="dtp-cal-month" id="${this._id("s-month")}">${monthText}</div>
              <div class="dtp-cal-day" id="${this._id("s-day")}">${dayText}</div>
            </div>
            <div class="dtp-selected-info">
              <h3 id="${this._id("s-title")}">${titleText}</h3>
              <p id="${this._id("s-sub")}"></p>
            </div>
            <svg class="dtp-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="dtp-accordion-body" id="${this._id("accordion")}">
            <div class="dtp-calendar-wrap">
              <div class="dtp-cal-nav">
                <button class="dtp-cal-nav-btn" id="${this._id("cal-prev")}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>
                <span class="dtp-cal-month-label" id="${this._id("cal-label")}"></span>
                <button class="dtp-cal-nav-btn" id="${this._id("cal-next")}"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>
              </div>
              <div id="${this._id("cal-content")}"></div>
            </div>
          </div>
        </div>

        <!-- Time Block -->
        <div class="dtp-block" id="${this._id("block-time")}">
          <div class="dtp-time-cols">
            <button class="dtp-time-col-btn" id="${this._id("t-from")}">
              <span class="dtp-time-col-label">desde</span>
              <span class="dtp-time-col-value ${fromLabel ? "" : "placeholder"}" id="${this._id("from-val")}">${fromLabel || "—"}</span>
            </button>
            <div class="dtp-time-col-divider"></div>
            <button class="dtp-time-col-btn" id="${this._id("t-to")}">
              <span class="dtp-time-col-label">hasta</span>
              <span class="dtp-time-col-value ${toLabel ? "" : "placeholder"}" id="${this._id("to-val")}">${toLabel || "—"}</span>
            </button>
          </div>
          <div class="dtp-duration-row" id="${this._id("dur-row")}" style="display:none">
            <span class="dtp-duration-dot"></span>
            <span id="${this._id("dur-text")}"></span>
          </div>
        </div>
      </div>`;

    // Render sheet to document body to avoid stacking context issues
    this.sheetContainer = document.createElement("div");
    this.sheetContainer.innerHTML = `
        <!-- Backdrop -->
        <div class="dtp-backdrop" id="${this._id("backdrop")}"></div>

        <!-- Sheet -->
        <div class="dtp-sheet" id="${this._id("sheet")}">
          <div class="dtp-sheet-handle-row"><div class="dtp-handle"></div></div>
          <div class="dtp-sheet-header">
            <div style="width:34px"></div>
            <span class="dtp-sheet-title" id="${this._id("sh-title")}">desde</span>
            <button class="dtp-btn-cancel" id="${this._id("btn-cancel")}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="dtp-wheels-row">
            <div class="dtp-manual-input-container">
              <div class="dtp-manual-field-wrapper"><input type="number" id="${this._id("inp-h")}" class="dtp-manual-input-ghost" min="0" max="12" placeholder="0"/></div>
              <div style="font-size:22px;font-weight:600;padding-bottom:2px">:</div>
              <div class="dtp-manual-field-wrapper"><input type="number" id="${this._id("inp-m")}" class="dtp-manual-input-ghost" min="0" max="59" placeholder="0"/></div>
            </div>
            <div class="dtp-wheel-col">
              <span class="dtp-wheel-heading">horas</span>
              <div class="dtp-wheel-wrap"><div class="dtp-wheel-track" id="${this._id("trk-h")}"></div><div class="dtp-wheel-cursor"></div></div>
            </div>
            <div class="dtp-colon-spacer">:</div>
            <div class="dtp-wheel-col">
              <span class="dtp-wheel-heading">minutos</span>
              <div class="dtp-wheel-wrap"><div class="dtp-wheel-track" id="${this._id("trk-m")}"></div><div class="dtp-wheel-cursor"></div></div>
            </div>
          </div>
          <div class="dtp-ampm-row">
            <div class="dtp-ampm-track">
              <div class="dtp-ampm-glider" id="${this._id("glider")}"></div>
              <div class="dtp-ampm-option" id="${this._id("opt-am")}">AM</div>
              <div class="dtp-ampm-option" id="${this._id("opt-pm")}">PM</div>
            </div>
          </div>
          <button class="dtp-btn-confirm" id="${this._id("btn-ok")}">confirmar</button>
        </div>
    `;
    document.body.appendChild(this.sheetContainer);
  }

  // ─── EVENTS ───
  _bindEvents() {
    this._el("sel-wrapper").onclick = () => this._toggleAccordion();
    this._el("cal-prev").onclick = () =>
      this.viewMode === "year"
        ? this._changeYearRange(-1)
        : this._changeMonth(-1);
    this._el("cal-next").onclick = () =>
      this.viewMode === "year"
        ? this._changeYearRange(1)
        : this._changeMonth(1);
    this._el("cal-label").onclick = () => this._toggleViewMode();
    this._el("t-from").onclick = () => this._openSheet("from");
    this._el("t-to").onclick = () => this._openSheet("to");
    this._el("btn-cancel").onclick = () => this._closeSheet();
    this._el("backdrop").onclick = () => this._closeSheet();
    this._el("btn-ok").onclick = () => {
      this._confirmTime();
      this._closeSheet();
    };
    this._el("opt-am").onclick = () => this._setAMPM("AM");
    this._el("opt-pm").onclick = () => this._setAMPM("PM");

    const inpH = this._el("inp-h"),
      inpM = this._el("inp-m");
    inpH.oninput = (e) => this._syncFromInputs(e);
    inpM.oninput = (e) => this._syncFromInputs(e);
    inpH.onkeydown = (e) => this._handleKeyDown(e);
    inpM.onkeydown = (e) => this._handleKeyDown(e);
  }

  // ─── CALENDAR ───
  _toggleAccordion() {
    const acc = this._el("accordion");
    const isOpen = acc.hasAttribute("data-state");
    if (!isOpen) {
      acc.setAttribute("data-state", "open");
      this._el("block-date").setAttribute("data-state", "active");
      this._el("block-time").removeAttribute("data-state");
      this._closeSheet();
      this.viewMode = "day";
      this._renderCalendarView();
    } else {
      acc.removeAttribute("data-state");
      this._el("block-date").removeAttribute("data-state");
    }
  }

  _renderCalendarView() {
    const wrap = this._el("accordion").querySelector(".dtp-calendar-wrap");
    wrap.style.opacity = "0.6";
    setTimeout(() => {
      const content = this._el("cal-content");
      if (this.viewMode === "year") content.innerHTML = this._renderYearView();
      else if (this.viewMode === "month")
        content.innerHTML = this._renderMonthView();
      else content.innerHTML = this._renderDayView();
      this._attachCalendarListeners();
      wrap.style.opacity = "1";
    }, 50);
  }

  _renderDayView() {
    const y = this.currentMonth.getFullYear(),
      mo = this.currentMonth.getMonth();
    this._el("cal-label").textContent = `${this.MONTHS_ES[mo]} ${y}`;
    const first = new Date(y, mo, 1),
      last = new Date(y, mo + 1, 0),
      prevLast = new Date(y, mo, 0);
    const dim = last.getDate(),
      dprev = prevLast.getDate();
    const fdow = (first.getDay() + 6) % 7; // Adjust Sunday (0) to 6, Monday (1) to 0, etc.
    let days = [];
    for (let i = fdow - 1; i >= 0; i--) {
      days.push({
        day: dprev - i,
        cur: false,
        date: new Date(y, mo - 1, dprev - i),
      });
    }
    for (let i = 1; i <= dim; i++)
      days.push({ day: i, cur: true, date: new Date(y, mo, i) });
    const rem = 42 - days.length;
    for (let i = 1; i <= rem; i++)
      days.push({ day: i, cur: false, date: new Date(y, mo + 1, i) });

    return `<div class="dtp-cal-grid">${this.DAYS_ES.map((d) => `<div class="dtp-cal-dow">${d}</div>`).join("")}${days
      .map(({ day, cur, date }) => {
        const isToday = date.getTime() === this.today.getTime();
        const isSel =
          this.selectedDate && date.getTime() === this.selectedDate.getTime();
        const isPast = date < this.today;
        const ok =
          (this.DISABLED_RULES.allow_past_days || date >= this.today) && cur;
        const dis = !ok;
        return `<div class="dtp-cal-cell ${!cur ? "other-month" : ""} ${dis ? "disabled" : ""} ${isToday ? "today" : ""} ${isSel ? "selected" : ""} ${isPast && !dis ? "past-day" : ""}" data-ts="${!dis ? date.getTime() : ""}">${day}</div>`;
      })
      .join("")}</div>`;
  }

  _renderMonthView() {
    this._el("cal-label").textContent = `${this.currentYear}`;
    return `<div class="dtp-month-view">${this.MONTHS_ES.map((n, i) => {
      const isCur =
        i === new Date().getMonth() &&
        this.currentYear === new Date().getFullYear();
      const ok =
        this.DISABLED_RULES.allow_past_months ||
        this.currentYear > new Date().getFullYear() ||
        (this.currentYear === new Date().getFullYear() &&
          i >= new Date().getMonth());
      return `<button class="dtp-month-button ${isCur ? "current-month" : ""} ${!ok ? "disabled" : ""}" ${!ok ? "disabled" : ""}>${n}</button>`;
    }).join("")}</div>`;
  }

  _renderYearView() {
    this._el("cal-label").textContent =
      `${this.yearRange.start} – ${this.yearRange.end}`;
    return `<div class="dtp-year-view">${Array.from(
      { length: this.yearRange.end - this.yearRange.start + 1 },
      (_, i) => this.yearRange.start + i,
    )
      .map((yr) => {
        const isCur = yr === new Date().getFullYear();
        const ok =
          this.DISABLED_RULES.allow_past_years ||
          yr >= new Date().getFullYear();
        return `<button class="dtp-year-button ${isCur ? "current-year" : ""} ${!ok ? "disabled" : ""}" ${!ok ? "disabled" : ""}>${yr}</button>`;
      })
      .join("")}</div>`;
  }

  _attachCalendarListeners() {
    this._el("cal-content")
      .querySelectorAll(".dtp-cal-cell[data-ts]")
      .forEach((c) => {
        if (!c.getAttribute("data-ts")) return;
        c.addEventListener("click", () => {
          this.selectedDate = new Date(parseInt(c.getAttribute("data-ts")));
          this._onDateSelected();
        });
      });
    this._el("cal-content")
      .querySelectorAll(".dtp-month-button:not(.disabled)")
      .forEach((b, i) => {
        b.addEventListener("click", () => {
          this.currentMonth = new Date(this.currentYear, i, 1);
          this.viewMode = "day";
          this._renderCalendarView();
        });
      });
    this._el("cal-content")
      .querySelectorAll(".dtp-year-button:not(.disabled)")
      .forEach((b) => {
        b.addEventListener("click", () => {
          this.currentYear = parseInt(b.textContent);
          this.viewMode = "month";
          this._renderCalendarView();
        });
      });
  }

  _onDateSelected() {
    this._renderCalendarView();
    const m = this.selectedDate.getMonth(),
      d = this.selectedDate.getDate();
    this._el("accordion").removeAttribute("data-state");
    this._el("block-date").setAttribute("data-state", "done");
    this._el("block-time").setAttribute("data-state", "active");
    this._el("s-month").textContent = this.MONTHS_SHORT[m];
    this._el("s-day").textContent = d;
    this._el("s-title").textContent = `${d} de ${this.MONTHS_ES[m]}`;
    this._syncSummary();
    this.onChange();
  }

  _changeMonth(delta) {
    if (this.viewMode === "day")
      this.currentMonth = new Date(
        this.currentMonth.getFullYear(),
        this.currentMonth.getMonth() + delta,
        1,
      );
    else if (this.viewMode === "month") this.currentYear += delta;
    this._renderCalendarView();
  }
  _changeYearRange(delta) {
    this.yearRange.start += delta * 12;
    this.yearRange.end += delta * 12;
    this._renderCalendarView();
  }
  _toggleViewMode() {
    this.viewMode =
      this.viewMode === "day"
        ? "month"
        : this.viewMode === "month"
          ? "year"
          : "day";
    this._renderCalendarView();
  }

  // ─── TIME WHEELS ───
  _initWheels() {
    const tH = this._el("trk-h"),
      tM = this._el("trk-m");
    tH.innerHTML = this.hours
      .map(
        (h) =>
          `<div class="dtp-wheel-item" ${h < 10 ? 'data-dtp-number="left-zero"' : ""}>${h}</div>`,
      )
      .join("");
    tM.innerHTML = this.minutes
      .map(
        (m) =>
          `<div class="dtp-wheel-item" ${m < 10 ? 'data-dtp-number="left-zero"' : ""}>${m}</div>`,
      )
      .join("");
    tH.addEventListener("scroll", () =>
      this._handleScroll("h", tH, this.hours),
    );
    tM.addEventListener("scroll", () =>
      this._handleScroll("m", tM, this.minutes),
    );
  }

  _handleScroll(type, track, list) {
    const idx = Math.round(track.scrollTop / this.STEP);
    const val = list[idx];
    if (val !== undefined && this.slots[this.activeSlot][type] !== val) {
      this.slots[this.activeSlot][type] = val;
      if (type === "h") this._setAMPM(this._getAmpm(val));
      this._updateInputs(false);
      this._highlightActive(track, idx);
    }
  }

  _highlightActive(track, idx) {
    track
      .querySelectorAll(".dtp-wheel-item")
      .forEach((it, i) => it.classList.toggle("active", i === idx));
  }

  _getAmpm(h) {
    return (h >= 1 && h <= 6) || h === 12 ? "PM" : "AM";
  }

  _updateInputs(pad) {
    const s = this.slots[this.activeSlot];
    this._el("inp-h").value = pad ? s.h.toString().padStart(2, "0") : s.h;
    this._el("inp-m").value = pad ? s.m.toString().padStart(2, "0") : s.m;
  }

  _syncFromInputs(e) {
    let raw = e.target.value;
    if (raw.length > 1 && raw.startsWith("0")) {
      raw = parseInt(raw, 10).toString();
      e.target.value = raw;
    }
    let vH = parseInt(this._el("inp-h").value),
      vM = parseInt(this._el("inp-m").value);
    if (e.target === this._el("inp-h") && this._el("inp-h").value.length >= 2)
      this._el("inp-m").focus();
    if (!isNaN(vH)) {
      this.slots[this.activeSlot].h = Math.max(0, Math.min(12, vH));
      this._scrollToValue("h", this.slots[this.activeSlot].h);
    }
    if (!isNaN(vM)) {
      this.slots[this.activeSlot].m = Math.max(0, Math.min(59, vM));
      this._scrollToValue("m", this.slots[this.activeSlot].m);
    }
  }

  _handleKeyDown(e) {
    if (e.key.toLowerCase() === "a") {
      e.preventDefault();
      this._setAMPM("AM");
      return;
    }
    if (e.key.toLowerCase() === "p") {
      e.preventDefault();
      this._setAMPM("PM");
      return;
    }
    if (e.key === "Enter") {
      if (e.target === this._el("inp-h")) this._el("inp-m").focus();
      else {
        this._confirmTime();
        this._closeSheet();
      }
    }
  }

  _scrollToValue(type, value) {
    const track = type === "h" ? this._el("trk-h") : this._el("trk-m");
    const list = type === "h" ? this.hours : this.minutes;
    const idx = list.indexOf(value);
    if (idx !== -1)
      track.scrollTo({ top: idx * this.STEP, behavior: "smooth" });
  }

  _setAMPM(val) {
    this.slots[this.activeSlot].ampm = val;
    this._el("glider").classList.toggle("pm", val === "PM");
    this._el("opt-am").classList.toggle("active", val === "AM");
    this._el("opt-pm").classList.toggle("active", val === "PM");
  }

  _fmtSlot(slot) {
    const dh = slot.h === 0 ? 12 : slot.h;
    return `${dh.toString().padStart(2, "0")}:${slot.m.toString().padStart(2, "0")} ${slot.ampm}`;
  }

  _confirmTime() {
    this.slots[this.activeSlot].confirmed = true;

    // Auto-calculate "to" time if we just confirmed "from"
    if (this.activeSlot === "from" && this.duration) {
      const fromMins = this._to24(this.slots.from) * 60 + this.slots.from.m;
      const toMins = (fromMins + this.duration * 60) % 1440;

      const h24 = Math.floor(toMins / 60);
      const m = toMins % 60;

      const ampm = h24 >= 12 ? "PM" : "AM";
      const h12 = h24 % 12;
      const h_final = h12 === 0 ? (h24 >= 12 ? 12 : 0) : h12;

      this.slots.to.h = h_final;
      this.slots.to.m = m;
      this.slots.to.ampm = ampm;
      this.slots.to.confirmed = true;

      // Update the "to" label in the UI immediately
      const toValEl = this._el("to-val");
      if (toValEl) {
        toValEl.textContent = this._fmtSlot(this.slots.to);
        toValEl.classList.remove("placeholder");
      }
    }

    const label = this._fmtSlot(this.slots[this.activeSlot]);
    if (this.activeSlot === "from") {
      this._el("from-val").textContent = label;
      this._el("from-val").classList.remove("placeholder");
    } else {
      this._el("to-val").textContent = label;
      this._el("to-val").classList.remove("placeholder");
    }
    if (this.slots.from.confirmed && this.slots.to.confirmed) {
      this._el("block-time").setAttribute("data-state", "done");
    }
    this._syncSummary();
    this._updateDuration();
    this.onChange();
  }

  _openSheet(slot) {
    if (!this.selectedDate) {
      this._el("accordion").setAttribute("data-state", "open");
      this._el("block-date").setAttribute("data-state", "active");
      this.viewMode = "day";
      this._renderCalendarView();
      return;
    }
    this.activeSlot = slot;
    this._el("sh-title").textContent = slot === "from" ? "desde" : "hasta";
    this._el("t-from")[slot === "from" ? "setAttribute" : "removeAttribute"](
      "data-state",
      "active",
    );
    this._el("t-to")[slot === "to" ? "setAttribute" : "removeAttribute"](
      "data-state",
      "active",
    );
    this._el("sheet").setAttribute("data-state", "open");
    this._el("backdrop").setAttribute("data-state", "open");
    setTimeout(() => {
      const s = this.slots[slot];
      this._setAMPM(s.ampm);
      this._scrollToValue("h", s.h);
      this._scrollToValue("m", s.m);
      this._updateInputs(false);
    }, 50);
  }

  _closeSheet() {
    this._el("sheet").removeAttribute("data-state");
    this._el("backdrop").removeAttribute("data-state");
    this._el("t-from").removeAttribute("data-state");
    this._el("t-to").removeAttribute("data-state");
  }

  _syncSummary() {
    const sub = this._el("s-sub");
    if (!this.selectedDate) {
      sub.textContent = "";
      return;
    }
    if (!this.slots.from.confirmed)
      sub.textContent = "Elige la hora para completar";
    else if (!this.slots.to.confirmed)
      sub.textContent = `Desde ${this._fmtSlot(this.slots.from)} · elige hora fin`;
    else
      sub.textContent = `${this._fmtSlot(this.slots.from)} → ${this._fmtSlot(this.slots.to)}`;
  }

  _updateDuration() {
    const row = this._el("dur-row"),
      txt = this._el("dur-text");
    if (this.slots.from.confirmed && this.slots.to.confirmed) {
      const fM = this._to24(this.slots.from) * 60 + this.slots.from.m;
      const tM = this._to24(this.slots.to) * 60 + this.slots.to.m;
      const diff = tM - fM;
      if (diff > 0) {
        const hrs = Math.floor(diff / 60),
          mins = diff % 60;
        txt.textContent = `Duración: ${hrs}h${mins > 0 ? " " + mins + "min" : ""}`;
        row.style.display = "flex";
      } else {
        row.style.display = "none";
      }
    } else {
      row.style.display = "none";
    }
  }

  _to24(slot) {
    let h = slot.h;
    if (h === 0) h = 12; // 0 in wheel = 12
    if (slot.ampm === "AM" && h === 12) return 0;
    if (slot.ampm === "PM" && h !== 12) return h + 12;
    return h;
  }

  // ─── PUBLIC API ───
  getValue() {
    let tripDate = "";
    if (this.selectedDate) {
      const y = this.selectedDate.getFullYear();
      const m = String(this.selectedDate.getMonth() + 1).padStart(2, "0");
      const d = String(this.selectedDate.getDate()).padStart(2, "0");
      tripDate = `${y}-${m}-${d}`;
    }
    const fmt24 = (slot) => {
      if (!slot.confirmed) return "";
      const h24 = this._to24(slot);
      return `${String(h24).padStart(2, "0")}:${String(slot.m).padStart(2, "0")}`;
    };
    return {
      tripDate,
      startTime: fmt24(this.slots.from),
      endTime: fmt24(this.slots.to),
    };
  }

  destroy() {
    this.container.innerHTML = "";
    this.container = null;
    if (this.sheetContainer && this.sheetContainer.parentNode) {
      this.sheetContainer.parentNode.removeChild(this.sheetContainer);
    }
    this.sheetContainer = null;
  }
}

window.DateTimePicker = DateTimePicker;
