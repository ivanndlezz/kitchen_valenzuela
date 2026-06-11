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
    onBeforeOpen: null,
    onOpen: null,
    onBeforeClose: null,
    onClose: null,
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

  function bindAttributes(root, config) {
    root.querySelectorAll("*").forEach((el) => {
      Array.from(el.attributes).forEach((attribute) => {
        if (!attribute.name.startsWith("data-bind-attr-")) return;

        const boundName = attribute.name.replace("data-bind-attr-", "");
        const value = getPathValue(config, attribute.value);
        if (value == null || value === "") {
          el.removeAttribute(boundName);
          return;
        }

        el.setAttribute(boundName, String(value));
      });
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
    bindAttributes(root, config);

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

    if (activeConfig) {
      close(activeConfig.id, { preserveFocus: true });
    }

    activeConfig = { ...EMPTY_CONFIG, ...config };
    previousFocus = document.activeElement;
    root._sheetData = activeConfig.data || null;

    activeConfig.onBeforeOpen?.(root, activeConfig);
    setDataset(root, activeConfig);
    hydrate(root, activeConfig);

    if (activeConfig.hideIsland && window.Island?.hide) {
      window.Island.hide();
    }

    activeConfig.onOpen?.(root, activeConfig);

    const closeButton = root.querySelector("[data-sheet-close-button]");
    closeButton?.focus({ preventScroll: true });

    return root;
  }

  function close(sheetId, options = {}) {
    const root = getRoot();
    if (!root) return;
    if (sheetId && root.dataset.sheetId !== sheetId) return;

    const closingConfig = activeConfig;
    closingConfig?.onBeforeClose?.(root, closingConfig);

    root.dataset.sheetState = "closed";
    root.dataset.sheetId = "";
    root.dataset.activeId = "";
    root.dataset.mode = "";
    root.dataset.dirty = "false";
    root._sheetData = null;
    bindAttributes(root, EMPTY_CONFIG);

    root.querySelectorAll(SLOT_SELECTOR).forEach((slot) => {
      slot.replaceChildren();
      slot.hidden = true;
    });

    if (activeConfig?.hideIsland && window.Island?.show) {
      window.Island.show();
    }

    closingConfig?.onClose?.(root, closingConfig);
    activeConfig = null;

    if (!options.preserveFocus && previousFocus && typeof previousFocus.focus === "function") {
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
    getSlot(name) {
      const root = getRoot();
      return root ? getSlot(root, name) : null;
    },
    setDirty(isDirty) {
      const root = getRoot();
      if (root) root.dataset.dirty = String(Boolean(isDirty));
    },
    updateMeta(meta = {}) {
      const root = getRoot();
      if (!root) return;
      if (meta.activeId !== undefined) root.dataset.activeId = meta.activeId || "";
      if (meta.mode !== undefined) root.dataset.mode = meta.mode || "";
    },
    get active() {
      return activeConfig;
    },
  };

  document.addEventListener("DOMContentLoaded", init);
})();
