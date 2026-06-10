/**
 * formHandlers.js — Reactive handlers for user input events inside the form.
 *
 * SRP: Each handler reacts to exactly one input event and produces one outcome.
 * No state mutations beyond what is required for the form's own dynamic fields.
 * No accordion logic. No pill/progress logic.
 *
 * The `expandBody` helper from accordion.js is used when a newly revealed
 * section requires the step panel to grow.
 */

import { CATEGORIES } from "./config.js";
import { expandBody } from "./accordion.js";

// ── Exported handlers ─────────────────────────────────

/**
 * Populates (or clears) the subcategory select when the category changes.
 * @param {string|number} categoryKey
 */
export function handleCategoryChange(categoryKey) {
  const subcatSelect = document.getElementById("f-subcat");
  if (!subcatSelect) return;

  subcatSelect.innerHTML = '<option value="">Sin subcategoría</option>';

  const category = CATEGORIES[categoryKey];
  const subs     = category?.subcategories ?? [];

  if (subs.length) {
    subs.forEach((sub) => {
      const opt       = document.createElement("option");
      opt.value       = sub.toLowerCase().replace(/\s/g, "_");
      opt.textContent = sub;
      subcatSelect.appendChild(opt);
    });
    subcatSelect.disabled = false;
  } else {
    subcatSelect.disabled = true;
  }
}

/**
 * Mirrors the main unit select options into the sale-unit and purchase-unit selects.
 * @param {HTMLSelectElement} unitSelect  The primary unit <select> element
 */
export function handleUnitChange(unitSelect) {
  ["u-sale", "u-purch"].forEach((id) => {
    const dependent = document.getElementById(id);
    if (!dependent) return;

    dependent.innerHTML = '<option value="">Igual a unidad principal</option>';
    Array.from(unitSelect.options).forEach((opt) => {
      if (!opt.value) return;
      const newOpt       = document.createElement("option");
      newOpt.value       = opt.value;
      newOpt.textContent = opt.textContent;
      dependent.appendChild(newOpt);
    });
    dependent.disabled = false;
  });
}

/**
 * Shows/hides the promotional pricing block.
 * @param {boolean}     checked    Whether the promo switch is on
 * @param {HTMLElement} sourceEl   The checkbox/toggle element (used to find step body)
 */
export function handlePromoChange(checked, sourceEl) {
  document.getElementById("promo-body")?.classList.toggle("open", checked);
  if (checked) _expandParentBody(sourceEl, 300);
}

/**
 * Shows/hides the shipping-cost input based on shipping type selection.
 * @param {string}      value      Selected shipping type value
 * @param {HTMLElement} sourceEl   The <select> element (used to find step body)
 */
export function handleShippingChange(value, sourceEl) {
  const costField = document.getElementById("ship-cost");
  if (costField) costField.style.display = value === "2" ? "block" : "none";
  if (value === "2") _expandParentBody(sourceEl, 200);
}

// ── Private ───────────────────────────────────────────

/**
 * Expands the nearest ancestor `.step-body` of `el` by `delta` px.
 * Delegates to accordion.js's expandBody using the step number encoded
 * in the nearest `.step` wrapper's id attribute.
 *
 * @param {HTMLElement} el
 * @param {number}      delta
 */
function _expandParentBody(el, delta) {
  const stepWrapper = el.closest("[id^='s']");
  if (!stepWrapper) return;
  const n = parseInt(stepWrapper.id.replace("s", ""), 10);
  if (n) expandBody(n, delta);
}
