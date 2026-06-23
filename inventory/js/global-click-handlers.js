/**
 * global-click-handlers.js
 * Centralized delegated click handlers for app-wide data attributes.
 */

const clickGlobal = {
  product: {
    data_open_id: {
      selector: "[data-open-id]",
      action: openProductSheetFromClick
    }
  },
  debug: {
    data_console: {
      selector: "[data-console]",
      action(event, element) {
        console.log(element.dataset.console || element);
      }
    }
  }
};

function getGlobalClickEntries(queries) {
  const scopes = queries || clickGlobal;
  return Object.values(scopes).flatMap(scope => Object.values(scope));
}

function clickHandler(queries) {
  const entries = getGlobalClickEntries(queries);

  return function handleGlobalClick(event) {
    for (const entry of entries) {
      const element = event.target.closest(entry.selector);
      if (!element) continue;

      entry.action(event, element);
      if (event.defaultPrevented || event.cancelBubble) break;
    }
  };
}

function openProductSheetFromClick(event, element) {
  if (element.tagName === "A") {
    event.preventDefault();
  }

  const product = findProductByOpenId(element.getAttribute("data-open-id"));
  if (!product) return;

  const isDraft = product.status === "draft" || product.sync_status === "draft";
  if (isDraft && typeof window.openProductFormSheet === "function") {
    openProductEditSheet(product);
  } else if (typeof openProductDrawer === "function") {
    openProductDrawer(product);
  }
}

function findProductByOpenId(encodedId) {
  const decodedId = typeof decodeId === "function" ? decodeId(encodedId) : encodedId;
  const openId = String(decodedId || "");
  return window.AppState?.products?.find(product => {
    return String(product.id || "") === openId ||
      String(product.codigo || "") === openId ||
      String(product.productId || "") === openId;
  });
}

function openProductEditSheet(product) {
  window.__openingProductSheetRoute = true;
  try {
    window.__currentProductId = product.id;
    const form = document.getElementById("pf");
    if (form) form.dataset.draftId = product.id;
    window.openProductFormSheet();
    if (typeof window.populateProductFormFromProduct === "function") {
      window.populateProductFormFromProduct(product);
    }
    if (typeof window.setProductSheetHash === "function") {
      window.setProductSheetHash("product", product, "edit");
    }
  } finally {
    window.__openingProductSheetRoute = false;
  }
}

function setupGlobalClickHandlers(queries) {
  if (window.__globalClickHandler) {
    document.removeEventListener("click", window.__globalClickHandler);
  }
  window.__globalClickHandler = clickHandler(queries);
  document.addEventListener("click", window.__globalClickHandler);
}

window.clickGlobal = clickGlobal;
window.clickHandler = clickHandler;
window.setupGlobalClickHandlers = setupGlobalClickHandlers;
