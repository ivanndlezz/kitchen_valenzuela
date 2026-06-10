/**
 * summary.js — Renders the inline chip summary for a completed step.
 *
 * SRP: Only reads DOM inputs from a step body and renders a chip strip.
 * No state mutations. No accordion logic.
 */

import { getBodyEl } from "./dom.js";

/**
 * Reads the fields inside step `n`'s body and renders summary chips
 * into the `#sum{n}` element.
 *
 * @param {number} n  1-based step number
 */
export function showSummary(n) {
  const sumEl = document.getElementById("sum" + n);
  const body  = getBodyEl(n);
  if (!sumEl || !body) return;

  const chips = [];

  // Checked radio pills
  body.querySelectorAll("input[type=radio]:checked").forEach((r) => {
    const text = r.closest("label")?.textContent?.trim();
    if (text) chips.push(text);
  });

  // Text inputs, selects, textareas
  const fields = body.querySelectorAll(
    "input:not([type=hidden]):not([type=radio]):not([type=checkbox]):not([type=file]), select, textarea"
  );
  fields.forEach((inp) => {
    const v = inp.value?.trim();
    if (!v) return;
    const labelText = inp
      .closest(".field")
      ?.querySelector("label")
      ?.textContent?.replace(/[*]/g, "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .join(" ");
    if (labelText) {
      chips.push(labelText + ": " + (v.length > 16 ? v.slice(0, 16) + "…" : v));
    }
  });

  if (chips.length) {
    sumEl.innerHTML = chips
      .slice(0, 5)
      .map((c) => `<span class="chip">${c}</span>`)
      .join("");
    sumEl.classList.add("has-chips");
  } else {
    sumEl.innerHTML = "";
    sumEl.classList.remove("has-chips");
  }
}

/**
 * Clears the summary chip strip for step `n`.
 * @param {number} n
 */
export function clearSummary(n) {
  const sumEl = document.getElementById("sum" + n);
  if (!sumEl) return;
  sumEl.innerHTML = "";
  sumEl.classList.remove("has-chips");
}
