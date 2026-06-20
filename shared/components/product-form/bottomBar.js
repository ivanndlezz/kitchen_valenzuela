/**
 * bottomBar.js — Controls the bottom action bar visibility and button state.
 *
 * SRP: Only responsible for reflecting the current application state
 *      (quickMode / inReview / currentStep) onto the bottom bar buttons.
 *
 * This module exports `syncBottomBar` so that state changes in other modules
 * can trigger a re-sync without creating circular dependencies.
 */

import { STEPS, TOTAL_STEPS } from "./config.js";
import { getCurrentStep, isQuickMode, isReviewEnabled, isInReview, isLastStep } from "./state.js";
import { readFieldValue } from "./dom.js";
import { isExistingProductContext } from "./updateState.js";

// ── Public ────────────────────────────────────────────

/**
 * Re-renders the bottom bar to match the current state.
 * Call after any state change that affects navigation.
 */
export function syncBottomBar() {
  const backBtn     = document.getElementById("bb-back");
  const continueBtn = document.getElementById("bb-continue");
  const uploadBtn   = document.getElementById("bb-upload");
  if (!backBtn || !continueBtn || !uploadBtn) return;

  const state = {
    inReview:      isInReview(),
    quickMode:     isQuickMode(),
    currentStep:   getCurrentStep(),
    reviewEnabled: isReviewEnabled(),
    lastStep:      isLastStep(),
  };

  _applyBarState(backBtn, continueBtn, uploadBtn, state);
}

// ── Private ───────────────────────────────────────────

function _isFormValid() {
  if (isQuickMode()) {
    const qfFields = [
      "qf-name",
      "qf-code",
      "qf-cat",
      "qf-cost",
      "qf-price",
      "qf-unit"
    ];
    for (const id of qfFields) {
      const val = document.getElementById(id)?.value?.trim();
      if (!val) return false;
    }
    return true;
  } else {
    for (const step of STEPS) {
      for (const field of step.reviewFields) {
        if (field.required) {
          const val = readFieldValue(field.selector);
          if (!val) return false;
        }
      }
    }
    return true;
  }
}

function _show(el, flex = false) {
  el.style.display = flex ? "" : "";
  if (flex) el.style.flex = "1";
}

function _hide(el) {
  el.style.display = "none";
}

function _setContinueMode(button, mode = "default") {
  const isGlider = mode === "form" || mode === "review";
  button.classList.toggle("bb-continue--review-glider", isGlider);
  button.innerHTML = isGlider
    ? `
      <span class="bb-review-glider" aria-hidden="true">
        <span class="bb-review-glider__item ${mode === "form" ? "is-active" : ""}">Form</span>
        <span class="bb-review-glider__item ${mode === "review" ? "is-active" : ""}">Revisar</span>
      </span>
      <span class="bb-review-action">Actualizar</span>
    `
    : "Continuar";
}

function _applyBarState(backBtn, continueBtn, uploadBtn, s) {
  uploadBtn.disabled = !_isFormValid();
  const isExisting = isExistingProductContext();
  _setContinueMode(continueBtn, isExisting && s.reviewEnabled ? (s.inReview ? "review" : "form") : "default");

  if (s.inReview) {
    backBtn.disabled    = false;
    if (isExisting && s.reviewEnabled) {
      _show(continueBtn);
      _hide(uploadBtn);
    } else {
      _hide(continueBtn);
      _show(uploadBtn, true);
    }
    return;
  }

  if (s.quickMode) {
    backBtn.disabled = true;
    if (s.reviewEnabled) {
      _show(continueBtn);
      _hide(uploadBtn);
    } else {
      _hide(continueBtn);
      _show(uploadBtn, true);
    }
    return;
  }

  // Full accordion mode (8 steps)
  backBtn.disabled = s.currentStep <= 1;

  if (s.lastStep && !s.reviewEnabled) {
    _hide(continueBtn);
    _show(uploadBtn, true);
  } else {
    _show(continueBtn);
    _hide(uploadBtn);
  }
}
