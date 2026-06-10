/**
 * accordion.js — Manages accordion open/close behaviour.
 *
 * SRP: Only responsible for expanding/collapsing step panels.
 * Reads step count from config; reads/writes current step via state.
 * Fires a custom "stepChange" event so other modules can react without coupling.
 */

import { TOTAL_STEPS } from "./config.js";
import { setCurrentStep } from "./state.js";
import { getStepEl, getBodyEl } from "./dom.js";

// ── Core open / close ─────────────────────────────────

/**
 * Opens a single step panel (does NOT close others).
 * @param {number} n  1-based step number
 */
export function openStep(n) {
  const body = getBodyEl(n);
  const step = getStepEl(n);
  if (!body || !step) return;

  step.classList.add("open", "active");
  // +800 gives room for dynamic content (promo, image previews, etc.)
  body.style.maxHeight = body.scrollHeight + 800 + "px";

  setCurrentStep(n);
  _dispatch(n);
}

/**
 * Closes a single step panel.
 * @param {number} n  1-based step number
 */
export function closeStep(n) {
  const body = getBodyEl(n);
  const step = getStepEl(n);
  if (!body || !step) return;

  body.style.maxHeight = "0";
  step.classList.remove("open", "active");
  _dispatch(n);
}

/**
 * Closes every step except `except` (pass undefined to close all).
 * @param {number|undefined} [except]
 */
export function closeAllExcept(except) {
  for (let i = 1; i <= TOTAL_STEPS; i++) {
    if (i !== except) closeStep(i);
  }
}

/**
 * Toggles a step: closes it if open, otherwise closes all others and opens it.
 * @param {number} n
 */
export function toggleStep(n) {
  const body = getBodyEl(n);
  if (!body) return;

  const isOpen = body.style.maxHeight !== "0px" && body.style.maxHeight !== "";
  if (isOpen) {
    closeStep(n);
    return;
  }

  closeAllExcept(n);
  openStep(n);
  _scrollToStep(n, 60);
}

/**
 * Navigates directly to step `n`:
 * closes all others, opens it, and scrolls to it.
 * @param {number} n
 */
export function goToStep(n) {
  if (n < 1 || n > TOTAL_STEPS) return;
  closeAllExcept(n);
  setTimeout(() => {
    openStep(n);
    _scrollToStep(n);
  }, 50);
}

/**
 * Expands the max-height of an open step body by `delta` pixels.
 * Used after injecting dynamic content (promo block, shipping cost field, etc.)
 * @param {number} n
 * @param {number} delta
 */
export function expandBody(n, delta) {
  const body = getBodyEl(n);
  if (!body) return;
  const current = parseInt(body.style.maxHeight) || 0;
  body.style.maxHeight = current + delta + "px";
}

// ── Private helpers ───────────────────────────────────

function _scrollToStep(n, delay = 0) {
  setTimeout(() => {
    getStepEl(n)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, delay);
}

function _dispatch(n) {
  document.dispatchEvent(
    new CustomEvent("stepChange", { detail: { step: n } })
  );
}
