/**
 * state.js — Single Source of Truth for all mutable application state.
 *
 * Rules:
 *  - Only this module owns the state object.
 *  - All reads go through getters; all writes through setters/mutators.
 *  - No DOM access here — pure data, no side-effects.
 */

import { TOTAL_STEPS } from "./config.js";

const _state = {
  /** 1-based index of the currently open accordion step. */
  currentStep: 1,

  /** Steps the user has explicitly marked as done. */
  doneSteps: new Set(),

  /** Whether the "quick / required-only" overlay is active. */
  isQuickMode: false,

  /** Whether the review step is enabled (persisted to localStorage). */
  reviewEnabled: true,

  /** Whether the virtual review panel is currently visible. */
  inReview: false,
};

// ── Getters ───────────────────────────────────────────

export const getState   = ()        => ({ ..._state, doneSteps: new Set(_state.doneSteps) });
export const getCurrentStep = ()    => _state.currentStep;
export const isQuickMode    = ()    => _state.isQuickMode;
export const isReviewEnabled= ()    => _state.reviewEnabled;
export const isInReview     = ()    => _state.inReview;
export const isDone         = (n)   => _state.doneSteps.has(n);
export const getDoneSteps   = ()    => new Set(_state.doneSteps);
export const isLastStep     = ()    => _state.currentStep === TOTAL_STEPS;

// ── Mutators ──────────────────────────────────────────

export function setCurrentStep(n) {
  _state.currentStep = n;
}

export function markStepDone(n) {
  _state.doneSteps.add(n);
}

export function clearAllDone() {
  _state.doneSteps.clear();
}

export function setQuickMode(active) {
  _state.isQuickMode = active;
}

export function setReviewEnabled(enabled) {
  _state.reviewEnabled = enabled;
  try { localStorage.setItem("reviewEnabled", enabled); } catch (_) { /* ignore */ }
}

export function setInReview(active) {
  _state.inReview = active;
}

// ── Bootstrap ─────────────────────────────────────────

export function initStateFromStorage() {
  try {
    const stored = localStorage.getItem("reviewEnabled");
    if (stored !== null) _state.reviewEnabled = stored !== "false";
  } catch (_) { /* ignore */ }
}
