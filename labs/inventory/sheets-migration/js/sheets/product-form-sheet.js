/**
 * product-form-sheet.js
 * Adopts the initialized multi-step product form into the unified sheet shell.
 */

(function () {
  function getSource() {
    return document.getElementById("product-form-sheet");
  }

  function getStepPills() {
    return document.getElementById("step-pills");
  }

  function getBody() {
    return document.querySelector("#product-form-sheet .pf-sheet__body") ||
      document.querySelector(".app-sheet__main .pf-sheet__body");
  }

  function getProductContext() {
    const form = document.getElementById("pf");
    const draftId = form?.dataset.draftId;
    const currentId = window.__currentProductId;
    const productId = draftId || currentId || "";
    const product = productId && window.AppState?.products
      ? window.AppState.products.find(p => p.id === productId)
      : null;

    return { productId, product };
  }

  function getTitle() {
    const { product } = getProductContext();
    if (product?.nombre) return `Editar ${product.nombre}`;
    if (window.__currentProductId) return "Editar Producto";
    return "Nuevo Producto";
  }

  function renderTopControls() {
    return `
      <button class="drawer__back-btn" type="button" data-product-form-back aria-label="Volver al detalle">
        <i data-lucide="chevron-left"></i>
      </button>
    `;
  }

  function hydrate(root) {
    root.querySelector("[data-product-form-back]")?.addEventListener("click", () => {
      window.closeProductFormSheet?.();
      if (window.__currentProductId) {
        const product = window.AppState?.products?.find(p => p.id === window.__currentProductId);
        if (product && typeof window.openProductDrawer === "function") {
          window.openProductDrawer(product);
        }
      }
    });
  }

  function detach() {
    const source = getSource();
    const stepPills = getStepPills();
    const body = getBody();
    if (!source) return;

    if (stepPills && stepPills.parentElement !== source) {
      source.appendChild(stepPills);
    }
    if (body && body.parentElement !== source) {
      source.appendChild(body);
    }
  }

  window.ProductFormSheet = {
    getTitle,
    renderTopControls,
    getStepPills,
    getBody,
    hydrate,
    detach,
  };
})();
