/**
 * main.js — Application bootstrap / composition root.
 *
 * SRP:    Only wires together modules; contains no business logic itself.
 * SoC:    Each concern (config population, accordion, pills, review, etc.)
 *         lives in its own module; this file is the only place they meet.
 * SSOT:   All static data comes from config.js.
 *         All mutable state flows through state.js.
 *
 * Load order matters only for the DOMContentLoaded guard — modules themselves
 * are statically imported and will load before this callback fires.
 */

// ── Static data ───────────────────────────────────────
import {
  PRODUCT_TYPES,
  CATEGORIES,
  BARCODE_SYMBOLOGIES,
  BRANDS,
  TAX_RATES,
  TAX_METHODS,
  UNITS,
  SHIPPING_TYPES,
  SUPPLIERS,
  TOTAL_STEPS,
} from "./config.js";

// ── State ─────────────────────────────────────────────
import {
  initStateFromStorage,
  markStepDone,
  clearAllDone,
  setReviewEnabled,
  isReviewEnabled,
  isInReview,
  getCurrentStep,
  isQuickMode,
} from "./state.js";

// ── DOM helpers ───────────────────────────────────────
import { populateSelect, buildPillGroup, bindPillGroupClicks } from "./dom.js";

// ── Accordion ─────────────────────────────────────────
import { openStep, closeAllExcept, goToStep } from "./accordion.js";

// ── UI modules ────────────────────────────────────────
import { initStepPills, syncPills }        from "./stepPills.js";
import { showSummary, clearSummary }       from "./summary.js";
import { syncBottomBar }                   from "./bottomBar.js";
import { enterReviewMode, exitReviewMode } from "./review.js";
import { initQuickForm, toggleQuickMode, syncFromQuickForm } from "./quickForm.js";
import { initSubmitHandler } from "./submitHandler.js";

// ── Form handlers ─────────────────────────────────────
import {
  handleCategoryChange,
  handleUnitChange,
  handlePromoChange,
  handleShippingChange,
} from "./formHandlers.js";

// ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {

  // 1. Restore persisted settings
  initStateFromStorage();

  // 2. Populate all CONFIG-driven selects
  populateSelect(document.getElementById("f-cat"),                    CATEGORIES,          { emptyOption: { text: "Seleccionar" } });
  populateSelect(document.querySelector('select[name="barcode_symbology"]'), BARCODE_SYMBOLOGIES);
  populateSelect(document.querySelector('select[name="brand"]'),      BRANDS,              { emptyOption: { text: "Sin marca" } });
  populateSelect(document.querySelector('select[name="tax_rate"]'),   TAX_RATES);
  populateSelect(document.querySelector('select[name="tax_method"]'), TAX_METHODS);
  populateSelect(document.querySelector('select[name="unit"]'),       UNITS,               { emptyOption: { text: "Seleccionar" } });
  populateSelect(document.querySelector('select[name="tipoEnvio"]'),  SHIPPING_TYPES);
  populateSelect(document.querySelector('select[name="supplier"]'),   SUPPLIERS);

  // 3. Build product-type pill group in main form
  const typesContainer = document.getElementById("f-product-types");
  buildPillGroup(typesContainer, PRODUCT_TYPES, "type");
  bindPillGroupClicks(typesContainer);

  // 4. Initialise accordion click bindings
  document.querySelectorAll(".step-header").forEach((header) => {
    header.addEventListener("click", () => {
      const n = parseInt(header.getAttribute("data-step"), 10);
      import("./accordion.js").then(({ toggleStep }) => toggleStep(n));
    });
  });

  // 5. Initialise "Mark done" buttons
  document.querySelectorAll(".btn-done").forEach((btn) => {
    btn.addEventListener("click", () => {
      const n = parseInt(btn.getAttribute("data-step"), 10);
      _completStep(n);
    });
  });

  // 6. Bind dynamic form inputs
  document.getElementById("f-cat")
    ?.addEventListener("change", (e) => handleCategoryChange(e.target.value));

  document.querySelector('select[name="unit"]')
    ?.addEventListener("change", (e) => handleUnitChange(e.target));

  document.getElementById("sw-promo")
    ?.addEventListener("change", (e) => handlePromoChange(e.target.checked, e.target));

  document.querySelector('select[name="tipoEnvio"]')
    ?.addEventListener("change", (e) => handleShippingChange(e.target.value, e.target));

  // 7. Quick-mode toggle
  document.getElementById("req-toggle")
    ?.addEventListener("click", toggleQuickMode);

  // 8. Bottom bar — Review toggle
  const reviewToggle = document.getElementById("bb-toggle-review");
  if (reviewToggle) {
    reviewToggle.checked = isReviewEnabled();
    reviewToggle.addEventListener("change", function () {
      setReviewEnabled(this.checked);
      if (!this.checked && isInReview()) exitReviewMode();
      syncBottomBar();
    });
  }

  // 9. Bottom bar — Back button
  document.getElementById("bb-back")?.addEventListener("click", () => {
    if (isInReview()) {
      exitReviewMode();
    } else if (!isQuickMode() && getCurrentStep() > 1) {
      goToStep(getCurrentStep() - 1);
    }
  });

  // 10. Bottom bar — Continue button
  document.getElementById("bb-continue")?.addEventListener("click", () => {
    if (isQuickMode()) {
      syncFromQuickForm();
      isReviewEnabled() ? enterReviewMode() : document.getElementById("pf")?.requestSubmit();
      return;
    }
    const step = getCurrentStep();
    if (step === TOTAL_STEPS) {
      _completStep(TOTAL_STEPS);
      isReviewEnabled() ? enterReviewMode() : document.getElementById("btn-submit")?.click();
    } else {
      _completStep(step);
    }
  });

  // 11. Bottom bar — Upload/Submit button
  document.getElementById("bb-upload")?.addEventListener("click", () => {
    if (isQuickMode()) syncFromQuickForm();
    document.getElementById("pf")?.requestSubmit();
  });

  // 12. Bottom bar — More menu
  const moreBtn = document.getElementById("bb-more");
  const menuEl  = document.getElementById("bb-menu");
  if (moreBtn && menuEl) {
    moreBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      menuEl.classList.toggle("show");
    });
    document.addEventListener("click", () => menuEl.classList.remove("show"));
    menuEl.addEventListener("click", (e) => e.stopPropagation());
  }

  // 13. Clear form button
  document.getElementById("bb-menu-clear")?.addEventListener("click", () => {
    if (!confirm("¿Estás seguro de que deseas limpiar todo el formulario?")) return;
    document.getElementById("pf")?.reset();
    clearAllDone();
    for (let i = 1; i <= TOTAL_STEPS; i++) clearSummary(i);
    syncPills();
    goToStep(1);
    menuEl?.classList.remove("show");
  });

  // 14. Initialise sub-systems
  initQuickForm();
  initStepPills();
  initSubmitHandler();
  openStep(1);
  syncBottomBar();

  // 15. Listen to stepChange and form inputs to keep bottom bar updated in real-time
  document.addEventListener("stepChange", () => syncBottomBar());

  const handleFormChange = () => syncBottomBar();
  const pf = document.getElementById("pf");
  const qf = document.getElementById("quick-form");
  if (pf) {
    pf.addEventListener("input", handleFormChange);
    pf.addEventListener("change", handleFormChange);
  }
  if (qf) {
    qf.addEventListener("input", handleFormChange);
    qf.addEventListener("change", handleFormChange);
  }
});

// ── Private helpers ───────────────────────────────────

/**
 * Marks a step as done, renders its summary, updates pills, and advances.
 * @param {number} n
 */
function _completStep(n) {
  markStepDone(n);
  showSummary(n);
  syncPills();

  if (n < TOTAL_STEPS) {
    closeAllExcept(undefined);
    setTimeout(() => {
      openStep(n + 1);
      import("./accordion.js").then(() => {
        document.getElementById("s" + (n + 1))
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }, 60);
  } else {
    import("./accordion.js").then(({ closeStep }) => closeStep(n));
  }
}
