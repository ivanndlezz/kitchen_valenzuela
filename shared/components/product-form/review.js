/**
 * review.js — Builds and controls the virtual review panel (step 9).
 *
 * SRP: Only responsible for building the review HTML from the current form state
 *      and toggling its visibility.
 *
 * The review field spec lives in config.STEPS (single source of truth).
 * Special fields (productType, dimensions, images) are resolved via dedicated
 * resolver functions — easy to extend without touching the render loop (OCP).
 */

import { STEPS } from "./config.js";
import { setInReview, isInReview, isQuickMode } from "./state.js";
import { readFieldValue, getActivePillText } from "./dom.js";
import { syncBottomBar } from "./bottomBar.js";
import { openStep } from "./accordion.js";
import { toggleQuickMode } from "./quickForm.js";

// ── Public API ────────────────────────────────────────

export function enterReviewMode() {
  setInReview(true);
  document.body.classList.add("in-review");
  window.setCurrentProductSheetTab?.("review");
  _buildReview();

  const s9 = document.getElementById("s9");
  if (s9) s9.style.display = "block";

  window.scrollTo({ top: 0, behavior: "smooth" });
  syncBottomBar();
}

export function exitReviewMode() {
  setInReview(false);
  document.body.classList.remove("in-review");
  window.setCurrentProductSheetTab?.("edit");

  const s9 = document.getElementById("s9");
  if (s9) s9.style.display = "none";

  openStep(8);
  syncBottomBar();
}

/**
 * Navigates from the review panel to a specific form step for editing.
 * Exposed globally so inline `onclick="editSection(n)"` in review HTML works.
 *
 * @param {number} sectionNum
 */
export function editSection(sectionNum) {
  if (isQuickMode()) {
    toggleQuickMode();
  }
  exitReviewMode();
  setTimeout(() => {
    import("./accordion.js").then(({ goToStep }) => goToStep(sectionNum));
  }, 50);
}

// Make available to review HTML's onclick attrs
window.editSection = editSection;
window.ProductFormReview = {
  enter: enterReviewMode,
  exit: exitReviewMode,
};

// ── Private ───────────────────────────────────────────

function _buildReview() {
  const container = document.getElementById("review-body");
  if (!container) return;

  container.innerHTML = STEPS.map(_renderSection).join("");
}

function _renderSection(step) {
  const fields = step.reviewFields.map(_renderField).join("");
  return `
    <div class="review-section">
      <div class="review-section-header">
        <span class="review-section-title">${step.title}</span>
        <button type="button" class="review-edit-btn"
          onclick="event.stopPropagation(); editSection(${step.num});">
          Editar
        </button>
      </div>
      <div class="review-grid">${fields}</div>
    </div>
  `;
}

function _renderField(fieldSpec) {
  const value = _resolveFieldValue(fieldSpec);
  return `
    <div class="review-field">
      <span class="review-field-label">${fieldSpec.label}</span>
      <span class="review-field-value">${value}</span>
    </div>
  `;
}

/**
 * Resolves the display value for a review field.
 * Special keys (productType, dimensions, mainImage, gallery) have their own
 * resolvers; everything else falls through to readFieldValue.
 *
 * Adding a new special field = adding one entry to SPECIAL_RESOLVERS (OCP).
 */
const SPECIAL_RESOLVERS = {
  productType: () => getActivePillText(document.getElementById("f-product-types"), "Estándar"),

  primaryUnit: () => readFieldValue('select[name="unit"]') || resolveCurrentProductUnit("unitCode"),

  dimensions: () => {
    const l = readFieldValue('input[name="length"]');
    const w = readFieldValue('input[name="width"]');
    const h = readFieldValue('input[name="height"]');
    const parts = [l, w, h].filter(Boolean);
    return parts.length ? parts.join(" x ") + " cm" : "";
  },

  saleUnit: () => readSelectedOptionText("#u-sale") || resolveCurrentProductUnit("saleUnitCode"),
  purchaseUnit: () => readSelectedOptionText("#u-purch") || resolveCurrentProductUnit("purchaseUnitCode"),

  mainImage: () => {
    const input = document.querySelector('input[name="product_image"]');
    const name  = input?.files?.[0]?.name ?? "";
    return name ? `<span class="review-badge">${name}</span>` : "";
  },

  gallery: () => {
    const input = document.querySelector('input[name="userfile[]"]');
    if (!input?.files?.length) return "";
    return Array.from(input.files)
      .map(f => `<span class="review-badge">${f.name}</span>`)
      .join(" ");
  },

  customFields: () => {
    const fields = window.ProductFormCustomFields?.getFields?.() || [];
    if (!fields.length) return "";
    return fields
      .map((field) => `<span class="review-badge">${escapeHtml(field.name)}: ${escapeHtml(field.value || "Sin valor")}</span>`)
      .join(" ");
  },
};

const MISSING_WARN_HTML = (label) => `
  <span class="review-warn">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         stroke-width="2.5" style="display:inline; vertical-align:middle; margin-right:2px;">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8"  x2="12"    y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
    Falta ${label}
  </span>`;

const EMPTY_HTML = `<span style="color:#bbb; font-style:italic;">No especificado</span>`;

function _resolveFieldValue(fieldSpec) {
  // Special computed fields
  if (fieldSpec.key && SPECIAL_RESOLVERS[fieldSpec.key]) {
    const val = SPECIAL_RESOLVERS[fieldSpec.key]();
    if (!val && fieldSpec.required) return MISSING_WARN_HTML(fieldSpec.label);
    return val || EMPTY_HTML;
  }

  // Normal selector-based fields
  let val = readFieldValue(fieldSpec.selector);

  if (!val && fieldSpec.required) return MISSING_WARN_HTML(fieldSpec.label);
  if (!val) return EMPTY_HTML;

  // Optional monetary prefix
  if (fieldSpec.prefix) val = fieldSpec.prefix + val;

  return val;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function readSelectedOptionText(selector) {
  const select = document.querySelector(selector);
  if (!select) return "";
  const option = select.options[select.selectedIndex];
  return option?.textContent?.trim() || "";
}

function resolveCurrentProductUnit(key) {
  const form = document.getElementById("pf");
  const productId = form?.dataset.draftId || window.__currentProductId || "";
  const product = window.AppState?.products?.find((item) => {
    if (!item) return false;
    return [item.id, item.airtable_id, item.codigo].filter(Boolean).map(String).includes(String(productId));
  });
  const value = product?.[key] || (key === "unitCode" ? product?.unitCode : "");
  return normalizeUnitLabel(value);
}

function normalizeUnitLabel(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const units = (window.ProductFormConfig || {}).UNITS || {};
  if (units[raw]) return units[raw];

  const exactLabel = Object.values(units).find(label => String(label).trim() === raw);
  if (exactLabel) return exactLabel;

  const alias = window.TaxonomyReconciliation?.resolveAlias?.("units", raw);
  if (alias) return units[alias] || alias;

  return raw;
}
