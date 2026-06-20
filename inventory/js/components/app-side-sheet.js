/**
 * app-side-sheet.js
 * Base class for all side sheets, bottom sheets, and full sheets.
 */

class AppSideSheet {
  static activeSheets = [];

  constructor(options = {}) {
    this.id = options.id || "";
    this.title = options.title || "";
    this.variant = options.variant || "side";
    this.size = options.size || "md";
    this.mode = options.mode || "";
    this.dirty = options.dirty || false;
    this.data = options.data || null;
    this.meta = options.meta || {};
    this.slots = options.slots || {};
    this.hideIsland = options.hideIsland || false;

    // Hooks
    this.onBeforeOpen = options.onBeforeOpen || null;
    this.onOpen = options.onOpen || null;
    this.onBeforeClose = options.onBeforeClose || null;
    this.onClose = options.onClose || null;

    // Root element selection or generation
    if (options.root) {
      this.root = options.root;
    } else {
      this.root = this.ensureRoot();
    }
  }

  ensureRoot() {
    let el = document.getElementById(this.id);
    if (el) return el;

    el = document.createElement("div");
    el.id = this.id;
    el.className = "app-sheet-root";
    el.dataset.sheetState = "closed";
    el.dataset.sheetId = this.id;
    el.dataset.sheetVariant = this.variant;
    el.dataset.sheetSize = this.size;
    el.dataset.activeId = "";
    el.dataset.mode = this.mode;
    el.dataset.dirty = String(this.dirty);

    const titleId = `${this.id}-title`;

    el.innerHTML = `
      <div class="app-sheet__scrim" data-sheet-close aria-hidden="true"></div>
      <aside class="app-sheet" role="dialog" aria-modal="true" aria-labelledby="${titleId}">
        <header class="app-sheet__top">
          <div class="app-sheet__title-box">
            <span class="app-sheet__eyebrow" data-bind-text="meta.eyebrow"></span>
            <h2 class="app-sheet__title" id="${titleId}" data-bind-text="title"></h2>
          </div>
          <div class="app-sheet__controls" data-sheet-slot="topControls" hidden></div>
          <button class="app-sheet__close" type="button" data-sheet-close data-sheet-close-button aria-label="Cerrar">
            <i data-lucide="x"></i>
          </button>
        </header>
        <nav class="app-sheet__sticky-nav" data-sheet-slot="stickyNav" hidden></nav>
        <main class="app-sheet__main" data-sheet-slot="main" hidden></main>
        <footer class="app-sheet__sticky-bottom" data-sheet-slot="stickyBottom" hidden></footer>
        <div class="app-sheet__fixed-controls" data-sheet-slot="fixedControls" hidden></div>
      </aside>
    `;

    document.body.appendChild(el);

    // Bind basic close event to scrim and close button
    el.addEventListener("click", (event) => {
      if (event.target.closest("[data-sheet-close]")) {
        this.close();
      }
    });

    return el;
  }

  setDataset() {
    this.root.dataset.sheetState = "open";
    this.root.dataset.sheetId = this.id || "";
    this.root.dataset.sheetVariant = this.variant || "side";
    this.root.dataset.sheetSize = this.size || "md";
    this.root.dataset.activeId = this.meta?.activeId || "";
    this.root.dataset.mode = this.mode || this.meta?.mode || "";
    this.root.dataset.dirty = String(Boolean(this.dirty));
  }

  getPathValue(path) {
    return path.split(".").reduce((value, key) => {
      if (value == null) return undefined;
      return value[key];
    }, this);
  }

  bindText() {
    this.root.querySelectorAll("[data-bind-text]").forEach((el) => {
      const path = el.dataset.bindText;
      const value = this.getPathValue(path);
      el.textContent = value == null ? "" : String(value);
    });
  }

  bindAttributes() {
    this.root.querySelectorAll("*").forEach((el) => {
      Array.from(el.attributes).forEach((attribute) => {
        if (!attribute.name.startsWith("data-bind-attr-")) return;

        const boundName = attribute.name.replace("data-bind-attr-", "");
        const value = this.getPathValue(attribute.value);
        if (value == null || value === "") {
          el.removeAttribute(boundName);
          return;
        }

        el.setAttribute(boundName, String(value));
      });
    });
  }

  getSlot(name) {
    return this.root.querySelector(`[data-sheet-slot="${name}"]`);
  }

  setSlotContent(name, content) {
    const slot = this.getSlot(name);
    if (!slot) return null;

    slot.replaceChildren();

    const resolved = typeof content === "function" ? content(this.data, this) : content;
    if (resolved == null || resolved === false) {
      slot.hidden = true;
      return slot;
    }

    if (resolved instanceof Node) {
      slot.appendChild(resolved);
      slot.hidden = false;
      return slot;
    }

    if (Array.isArray(resolved)) {
      resolved.filter(Boolean).forEach((item) => {
        if (item instanceof Node) slot.appendChild(item);
      });
      slot.hidden = slot.childNodes.length === 0;
      return slot;
    }

    const html = String(resolved || "").trim();
    slot.hidden = html.length === 0;
    if (html) slot.innerHTML = html;
    return slot;
  }

  hydrateTop(eyebrow, title, controlsByID) {
    if (eyebrow !== undefined) this.meta.eyebrow = eyebrow;
    if (title !== undefined) this.title = title;
    if (controlsByID !== undefined) this.slots.topControls = controlsByID;
    this.bindText();
    this.bindAttributes();
    this.setSlotContent("topControls", this.slots?.topControls);
  }

  hydrateNav(component) {
    if (component !== undefined) this.slots.stickyNav = component;
    this.setSlotContent("stickyNav", this.slots?.stickyNav);
  }

  hydrateMain(html) {
    if (html !== undefined) this.slots.main = html;
    this.setSlotContent("main", this.slots?.main);
  }

  hydrateBottomControls(template, custom) {
    if (template !== undefined) this.slots.stickyBottom = template;
    if (custom !== undefined) this.slots.fixedControls = custom;
    this.setSlotContent("stickyBottom", this.slots?.stickyBottom);
  }

  hydrateFixedControls(custom) {
    if (custom !== undefined) this.slots.fixedControls = custom;
    this.setSlotContent("fixedControls", this.slots?.fixedControls);
  }

  createIcons() {
    if (window.lucide) {
      window.lucide.createIcons({
        attrs: {
          class: ["lucide"]
        },
        node: this.root
      });
    } else if (typeof window.createLucideIcons === "function") {
      window.createLucideIcons();
    }
  }

  hydrate() {
    this.bindText();
    this.bindAttributes();
    this.hydrateTop();
    this.hydrateNav();
    this.hydrateMain();
    this.hydrateBottomControls();
    this.hydrateFixedControls();
    this.createIcons();
  }

  open() {
    if (!this.root) return null;

    this.root._sheetInstance = this;
    this.root._sheetData = this.data || null;

    this.onBeforeOpen?.(this.root, this);
    this.setDataset();
    this.hydrate();

    if (this.hideIsland && window.Island?.hide) {
      window.Island.hide();
    }

    this.onOpen?.(this.root, this);

    const closeButton = this.root.querySelector("[data-sheet-close-button]");
    closeButton?.focus({ preventScroll: true });

    // Track active sheets for stacked esc key handling
    if (!AppSideSheet.activeSheets.includes(this)) {
      AppSideSheet.activeSheets.push(this);
    }

    return this.root;
  }

  close() {
    if (!this.root) return;

    this.onBeforeClose?.(this.root, this);

    this.root.dataset.sheetState = "closed";
    this.root.dataset.sheetId = "";
    this.root.dataset.activeId = "";
    this.root.dataset.mode = "";
    this.root.dataset.dirty = "false";
    this.root._sheetData = null;
    this.root._sheetInstance = null;

    // Reset bindings
    this.root.querySelectorAll("[data-bind-text]").forEach((el) => {
      el.textContent = "";
    });

    this.root.querySelectorAll("*").forEach((el) => {
      Array.from(el.attributes).forEach((attribute) => {
        if (attribute.name.startsWith("data-bind-attr-")) {
          const boundName = attribute.name.replace("data-bind-attr-", "");
          el.removeAttribute(boundName);
        }
      });
    });

    this.root.querySelectorAll("[data-sheet-slot]").forEach((slot) => {
      slot.replaceChildren();
      slot.hidden = true;
    });

    if (this.hideIsland && window.Island?.show) {
      window.Island.show();
    }

    this.onClose?.(this.root, this);

    // Untrack active sheet
    AppSideSheetsUntrack(this);
  }
}

function AppSideSheetsUntrack(sheet) {
  AppSideSheet.activeSheets = AppSideSheet.activeSheets.filter(s => s !== sheet);
}

// Global stacked esc key handler
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && AppSideSheet.activeSheets.length > 0) {
    const topSheet = AppSideSheet.activeSheets[AppSideSheet.activeSheets.length - 1];
    topSheet.close();
  }
});

window.AppSideSheet = AppSideSheet;
