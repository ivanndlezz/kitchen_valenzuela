/**
 * dom.js — Pure DOM utility helpers.
 *
 * SRP: Only knows how to build/query DOM nodes.
 * No state reads/writes. No business logic.
 */

/**
 * Populates a <select> element from an array or key→value object.
 *
 * @param {HTMLSelectElement|null} selectEl
 * @param {string[]|Record<string,string|{name:string}>} data
 * @param {{ emptyOption?: { value?: string; text: string } }} [opts]
 */
export function populateSelect(selectEl, data, opts = {}) {
  if (!selectEl) return;
  selectEl.innerHTML = "";

  if (opts.emptyOption) {
    const opt = document.createElement("option");
    opt.value       = opts.emptyOption.value ?? "";
    opt.textContent = opts.emptyOption.text;
    selectEl.appendChild(opt);
  }

  if (Array.isArray(data)) {
    data.forEach(item => {
      const opt = document.createElement("option");
      opt.value = opt.textContent = item;
      selectEl.appendChild(opt);
    });
  } else {
    Object.entries(data).forEach(([key, val]) => {
      const opt = document.createElement("option");
      opt.value       = key;
      opt.textContent = typeof val === "object" ? val.name : val;
      selectEl.appendChild(opt);
    });
  }
}

/**
 * Builds a radio-pill group inside `container` from a key→label map.
 *
 * @param {HTMLElement}              container
 * @param {Record<string,string>}    types      e.g. PRODUCT_TYPES
 * @param {string}                   radioName  unique name attr for the radio group
 * @returns {void}
 */
export function buildPillGroup(container, types, radioName) {
  if (!container) return;
  container.innerHTML = "";

  Object.entries(types).forEach(([val, labelText], idx) => {
    const label = document.createElement("label");
    label.className = "pill";
    if (idx === 0) label.classList.add("on");

    const input     = document.createElement("input");
    input.type      = "radio";
    input.name      = radioName;
    input.value     = val;
    input.checked   = idx === 0;

    label.append(input, " " + labelText);
    container.appendChild(label);
  });
}

/**
 * Binds click-delegation to toggle the `.on` class on pill labels
 * and check the underlying radio inside the clicked pill.
 *
 * @param {HTMLElement} container
 */
export function bindPillGroupClicks(container) {
  if (!container) return;
  container.addEventListener("click", (e) => {
    const pill = e.target.closest(".pill");
    if (!pill) return;
    container.querySelectorAll(".pill").forEach(p => p.classList.remove("on"));
    pill.classList.add("on");
    const radio = pill.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
  });
}

/**
 * Returns the trimmed text content of the currently selected pill,
 * or `fallback` if none is found.
 *
 * @param {HTMLElement} container
 * @param {string}      [fallback]
 * @returns {string}
 */
export function getActivePillText(container, fallback = "") {
  if (!container) return fallback;
  return container.querySelector(".pill.on")?.textContent?.trim() ?? fallback;
}

/**
 * Reads a field value from a DOM element for review/summary purposes.
 * Handles input, select, checkbox, and textarea.
 *
 * @param {string} selector  CSS selector
 * @returns {string}
 */
export function readFieldValue(selector) {
  if (!selector) return "";
  const el = document.querySelector(selector);
  if (!el) return "";

  if (el.tagName === "SELECT") {
    const opt = el.options[el.selectedIndex];
    return el.value !== "" ? (opt?.textContent?.trim() ?? "") : "";
  }
  if (el.type === "checkbox") return el.checked ? "Sí" : "No";
  return el.value?.trim() ?? "";
}

/**
 * Scrolls `container` so that `targetEl` is horizontally centered.
 *
 * @param {HTMLElement} container
 * @param {HTMLElement} targetEl
 */
export function scrollToCenter(container, targetEl) {
  if (!container || !targetEl) return;
  const scrollLeft =
    targetEl.offsetLeft - container.offsetWidth / 2 + targetEl.offsetWidth / 2;
  container.scrollTo({ left: scrollLeft, behavior: "smooth" });
}

/** Returns the step wrapper element by 1-based step number. */
export function getStepEl(n)  { return document.getElementById("s" + n); }

/** Returns the step body (collapsible) element by 1-based step number. */
export function getBodyEl(n)  { return document.getElementById("b" + n); }
