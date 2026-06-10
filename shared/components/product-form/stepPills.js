/**
 * stepPills.js — Step pill navigation and progress bar rendering.
 *
 * SRP: Only responsible for syncing the pill strip and the progress fill
 *      to whatever state is currently true.
 * Reads state; never writes it.
 * Reacts to the custom "stepChange" event fired by accordion.js.
 */

import { STEPS, TOTAL_STEPS } from "./config.js";
import { getCurrentStep, isDone, getDoneSteps } from "./state.js";
import { scrollToCenter } from "./dom.js";
import { goToStep } from "./accordion.js";

// ── Public ────────────────────────────────────────────

/**
 * Builds the pill strip on first load and binds all events.
 * Call once during DOMContentLoaded.
 */
export function initStepPills() {
  const container = document.getElementById("step-pills");
  if (!container) return;

  container.innerHTML = "";

  STEPS.forEach((s) => {
    const pill = document.createElement("button");
    pill.type      = "button";
    pill.className = "pill";
    pill.innerHTML = `
      <span class="pill-check-icon" style="display:none; align-items:center; justify-content:center; width:12px; height:12px; margin-right:4px;">
        <svg viewBox="0 0 12 10" style="width:10px; height:8px; stroke:currentColor; stroke-width:2.5; fill:none;">
          <polyline points="1,5 4,8 11,1"/>
        </svg>
      </span>
      <span class="pill-text">${s.title}</span>
    `;
    pill.addEventListener("click", () => goToStep(s.num));
    container.appendChild(pill);
  });

  // Restore scroll without animation on first load
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const firstPill = container.querySelector(".pill");
      if (firstPill) {
        container.style.scrollBehavior = "auto";
        container.scrollLeft = firstPill.offsetLeft - 16;
        container.style.scrollBehavior = "";
      }
    });
  });

  syncPills();

  // React to accordion changes
  document.addEventListener("stepChange", syncPills);
}

/**
 * Refreshes active/done classes on every pill and re-centres the active one.
 * Also triggers the progress bar update.
 * Safe to call any time state changes.
 */
export function syncPills() {
  const container = document.getElementById("step-pills");
  if (!container) return;

  const pills     = container.querySelectorAll(".pill");
  const current   = getCurrentStep();
  const doneSteps = getDoneSteps();

  pills.forEach((pill, idx) => {
    const n = idx + 1;
    pill.classList.toggle("on",   n === current);
    pill.classList.toggle("done", doneSteps.has(n));
  });

  const activePill = container.querySelectorAll(".pill")[current - 1];
  scrollToCenter(container, activePill);

  updateProgressBar();
}

// ── Private ───────────────────────────────────────────

function updateProgressBar() {
  const fill = document.getElementById("progress-fill");
  if (!fill) return;
  const pct = (getDoneSteps().size / TOTAL_STEPS) * 100;
  fill.style.width = pct + "%";
}
