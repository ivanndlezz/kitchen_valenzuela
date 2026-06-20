/**
 * sheet-manager.js
 * Reusable shell for app side sheets, bottom sheets, and full sheets.
 * Refactored to delegate to the unified AppSideSheet component class.
 */

(function () {
  let activeInstance = null;
  let previousFocus = null;

  function getRoot() {
    return document.getElementById("sheet-root");
  }

  function open(config) {
    const root = getRoot();
    if (!root) return null;

    if (activeInstance) {
      // Preserve focus is handled internally when switching sheets
      activeInstance.close();
    }

    previousFocus = document.activeElement;

    // Create an AppSideSheet wrapping the sheet-root
    activeInstance = new window.AppSideSheet({
      root: root,
      ...config
    });

    activeInstance.open();
    return root;
  }

  function close(sheetId, options = {}) {
    if (!activeInstance) return;
    if (sheetId && activeInstance.id !== sheetId) return;

    activeInstance.close();
    activeInstance = null;

    if (!options.preserveFocus && previousFocus && typeof previousFocus.focus === "function") {
      previousFocus.focus({ preventScroll: true });
    }
    previousFocus = null;
  }

  function init() {
    const root = getRoot();
    if (!root || root.dataset.sheetReady === "true") return;
    root.dataset.sheetReady = "true";

    // Setup global escape and close delegation if not already handled
    root.addEventListener("click", (event) => {
      if (event.target.closest("[data-sheet-close]")) {
        close();
      }
    });
  }

  window.SheetManager = {
    init,
    open,
    close,
    getSlot(name) {
      return activeInstance ? activeInstance.getSlot(name) : null;
    },
    setDirty(isDirty) {
      if (activeInstance) {
        activeInstance.dirty = isDirty;
        activeInstance.setDataset();
      }
    },
    updateMeta(meta = {}) {
      if (activeInstance) {
        activeInstance.meta = { ...activeInstance.meta, ...meta };
        if (meta.activeId !== undefined) activeInstance.root.dataset.activeId = meta.activeId || "";
        if (meta.mode !== undefined) activeInstance.root.dataset.mode = meta.mode || "";
        activeInstance.setDataset();
      }
    },
    get active() {
      return activeInstance;
    },
  };

  document.addEventListener("DOMContentLoaded", init);
})();
