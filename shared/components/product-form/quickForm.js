/**
 * quickForm.js — Quick (required-only) overlay: toggle, populate, and sync.
 *
 * SRP: Owns everything related to the quick-form overlay panel.
 *
 * Sync direction is determined by a single QF_FIELD_MAP (defined in config.js)
 * so adding/removing a field is a one-line config change (DRY / SSOT).
 */

import { PRODUCT_TYPES, CATEGORIES, UNITS, QF_FIELD_MAP } from "./config.js";
import { setQuickMode, isQuickMode } from "./state.js";
import { populateSelect, buildPillGroup, bindPillGroupClicks } from "./dom.js";
import { handleCategoryChange } from "./formHandlers.js";
import { syncBottomBar } from "./bottomBar.js";

// ── Public ────────────────────────────────────────────

/** Initialises the quick-form selects and pill group on first load. */
export function initQuickForm() {
  populateSelect(document.getElementById("qf-cat"),  CATEGORIES, { emptyOption: { text: "Seleccionar" } });
  populateSelect(document.getElementById("qf-unit"), UNITS,      { emptyOption: { text: "Seleccionar" } });

  const typesContainer = document.getElementById("qf-product-types");
  buildPillGroup(typesContainer, PRODUCT_TYPES, "qf_type");
  bindPillGroupClicks(typesContainer);

  const qfSubmit = document.getElementById("qf-submit");
  if (qfSubmit) {
    qfSubmit.addEventListener("click", () => {
      syncFromQuickForm();
      document.getElementById("pf")?.requestSubmit();
    });
  }
}

/** Toggles quick-mode on/off, syncing values in the appropriate direction. */
export function toggleQuickMode() {
  const entering = !isQuickMode();
  setQuickMode(entering);

  const toggleBtn = document.getElementById("req-toggle");
  if (toggleBtn) toggleBtn.classList.toggle("active", entering);

  if (entering) {
    syncToQuickForm();
    document.body.classList.add("quick-mode");
    document.getElementById("quick-form")?.classList.add("visible");
  } else {
    syncFromQuickForm();
    document.body.classList.remove("quick-mode");
    document.getElementById("quick-form")?.classList.remove("visible");
  }

  syncBottomBar();
}

/**
 * Copies main-form values into the quick-form fields.
 * Called when entering quick mode.
 */
export function syncToQuickForm() {
  QF_FIELD_MAP.forEach(({ qfId, mainSelector }) => {
    const qf   = document.getElementById(qfId);
    const main = document.querySelector(mainSelector);
    if (qf && main) qf.value = main.value;
  });
  _syncProductTypeToQuick();
}

/**
 * Copies quick-form values back into the main form fields.
 * Called when leaving quick mode or on final submit.
 */
export function syncFromQuickForm() {
  QF_FIELD_MAP.forEach(({ qfId, mainSelector }) => {
    const qf   = document.getElementById(qfId);
    const main = document.querySelector(mainSelector);
    if (qf && main) main.value = qf.value;
  });
  _syncProductTypeFromQuick();

  // Trigger category-dependent subcategory population
  const catVal = document.getElementById("qf-cat")?.value;
  if (catVal) handleCategoryChange(catVal);
}

// ── Private ───────────────────────────────────────────

function _syncProductTypeToQuick() {
  const mainChecked = document.querySelector("#f-product-types input[type=radio]:checked");
  if (!mainChecked) return;

  const qfRadio = document.querySelector(
    `#qf-product-types input[value="${mainChecked.value}"]`
  );
  if (qfRadio) {
    qfRadio.checked = true;
    document.querySelectorAll("#qf-product-types .pill").forEach(p => p.classList.remove("on"));
    qfRadio.closest(".pill")?.classList.add("on");
  }
}

function _syncProductTypeFromQuick() {
  const qfChecked = document.querySelector("#qf-product-types input[type=radio]:checked");
  if (!qfChecked) return;

  const mainRadio = document.querySelector(
    `#f-product-types input[value="${qfChecked.value}"]`
  );
  if (mainRadio) {
    mainRadio.checked = true;
    document.querySelectorAll("#f-product-types .pill").forEach(p => p.classList.remove("on"));
    mainRadio.closest(".pill")?.classList.add("on");
  }
}
