/**
 * sheet-manager.js
 * Reusable shell for app side sheets, bottom sheets, and full sheets.
 */

(function () {
  const SLOT_SELECTOR = "[data-sheet-slot]";
  const EMPTY_CONFIG = {
    id: "",
    title: "",
    variant: "side",
    size: "md",
    mode: "",
    dirty: false,
    data: null,
    meta: {},
    slots: {},
    hideIsland: false,
  };

  let activeConfig = null;
  let previousFocus = null;

  function getRoot() {
    return document.getElementById("sheet-root");
  }

  function getSlot(root, name) {
    return root.querySelector(`[data-sheet-slot="${name}"]`);
  }

  function setDataset(root, config) {
    root.dataset.sheetState = "open";
    root.dataset.sheetId = config.id || "";
    root.dataset.sheetVariant = config.variant || "side";
    root.dataset.sheetSize = config.size || "md";
    root.dataset.activeId = config.meta?.activeId || "";
    root.dataset.mode = config.mode || config.meta?.mode || "";
    root.dataset.dirty = String(Boolean(config.dirty));
  }

  function bindText(root, config) {
    root.querySelectorAll("[data-bind-text]").forEach((el) => {
      const path = el.dataset.bindText;
      const value = getPathValue(config, path);
      el.textContent = value == null ? "" : String(value);
    });
  }

  function getPathValue(source, path) {
    return path.split(".").reduce((value, key) => {
      if (value == null) return undefined;
      return value[key];
    }, source);
  }

  function normalizeContent(content, data, config) {
    const resolved = typeof content === "function" ? content(data, config) : content;
    if (resolved == null || resolved === false) return "";
    return resolved;
  }

  function renderSlot(root, name, content, data, config) {
    const slot = getSlot(root, name);
    if (!slot) return;

    const resolved = normalizeContent(content, data, config);
    slot.replaceChildren();

    if (resolved instanceof Node) {
      slot.appendChild(resolved);
      slot.hidden = false;
      return;
    }

    if (Array.isArray(resolved)) {
      resolved.filter(Boolean).forEach((item) => {
        if (item instanceof Node) slot.appendChild(item);
      });
      slot.hidden = slot.childNodes.length === 0;
      return;
    }

    const html = String(resolved || "").trim();
    slot.hidden = html.length === 0;
    if (html) slot.innerHTML = html;
  }

  function hydrate(root, config) {
    bindText(root, config);

    root.querySelectorAll(SLOT_SELECTOR).forEach((slot) => {
      const slotName = slot.dataset.sheetSlot;
      renderSlot(root, slotName, config.slots?.[slotName], config.data, config);
    });

    if (window.lucide) {
      window.lucide.createIcons();
    } else if (typeof window.createLucideIcons === "function") {
      window.createLucideIcons();
    }
  }

  function open(config) {
    const root = getRoot();
    if (!root) return null;

    activeConfig = { ...EMPTY_CONFIG, ...config };
    previousFocus = document.activeElement;
    root._sheetData = activeConfig.data || null;

    setDataset(root, activeConfig);
    hydrate(root, activeConfig);

    if (activeConfig.hideIsland && window.Island?.hide) {
      window.Island.hide();
    }

    const closeButton = root.querySelector("[data-sheet-close-button]");
    closeButton?.focus({ preventScroll: true });

    return root;
  }

  function close(sheetId) {
    const root = getRoot();
    if (!root) return;
    if (sheetId && root.dataset.sheetId !== sheetId) return;

    root.dataset.sheetState = "closed";
    root.dataset.sheetId = "";
    root.dataset.activeId = "";
    root.dataset.mode = "";
    root.dataset.dirty = "false";
    root._sheetData = null;

    root.querySelectorAll(SLOT_SELECTOR).forEach((slot) => {
      slot.replaceChildren();
      slot.hidden = true;
    });

    if (activeConfig?.hideIsland && window.Island?.show) {
      window.Island.show();
    }

    activeConfig = null;

    if (previousFocus && typeof previousFocus.focus === "function") {
      previousFocus.focus({ preventScroll: true });
    }
    previousFocus = null;
  }

  function init() {
    const root = getRoot();
    if (!root || root.dataset.sheetReady === "true") return;

    root.dataset.sheetReady = "true";
    root.addEventListener("click", (event) => {
      if (event.target.closest("[data-sheet-close]")) {
        close();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && root.dataset.sheetState === "open") {
        close();
      }
    });
  }

  window.SheetManager = {
    init,
    open,
    close,
    get active() {
      return activeConfig;
    },
  };

  document.addEventListener("DOMContentLoaded", init);
})();
