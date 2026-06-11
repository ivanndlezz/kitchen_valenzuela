/**
 * product-detail-sheet.js
 * Product detail content for the unified sheet shell.
 */

(function () {
  function getCategoryMeta(product) {
    if (product.categoriaCodigo === "01") {
      return {
        gradient: "var(--cat-coccion-bg)",
        icon: "flame",
        label: "Equipo de Coccion Industrial",
      };
    }
    if (product.categoriaCodigo === "02") {
      return {
        gradient: "var(--cat-refacciones-bg)",
        icon: "settings",
        label: "Refaccion y Componente Original",
      };
    }
    if (product.categoriaCodigo === "03") {
      return {
        gradient: "var(--cat-limpieza-bg)",
        icon: "droplets",
        label: "Quimico y Limpieza Profesional",
      };
    }
    return {
      gradient: "var(--cat-otros-bg)",
      icon: "box",
      label: "Refaccion / General",
    };
  }

  function getStockMeta(product) {
    const stockVal = parseFloat(product.stock) || 0;
    const alertVal = parseFloat(product.alertaCantidad) || 0;

    if (stockVal > alertVal) {
      return {
        text: `${stockVal} unidades en existencia`,
        style: 'style="color: var(--color-success);"',
      };
    }
    if (stockVal > 0) {
      return {
        text: `Bajo Stock (${stockVal} restantes)`,
        style: 'style="color: var(--color-warning);"',
      };
    }
    return {
      text: "Agotado / Sin Existencias",
      style: 'style="color: var(--color-danger);"',
    };
  }

  function renderSpecs(product) {
    const fields = [
      ["Descripcion", product.descripcion],
      ["Especificaciones", product.especificaciones],
      ["Ubicacion / Notas", product.especial3],
      ["Dimensiones / Datos", product.especial4],
      ["Campo Adicional 5", product.especial5],
      ["Campo Adicional 6", product.especial6],
    ];

    return fields
      .filter(([, value]) => value)
      .map(([label, value]) => `
        <div class="drawer__spec-item">
          <span class="drawer__spec-label">${label}</span>
          <span class="drawer__spec-value drawer__spec-value--custom">${value}</span>
        </div>
      `)
      .join("");
  }

  function renderTopControls() {
    return `
      <div class="view-switch view-switch--single sheet-mode-switch" data-sheet-mode-switch="product-detail">
        <button class="view-switch__toggle" type="button" aria-label="Cambiar a editar producto">
          <span class="view-switch__toggle-inner">
            <span class="view-switch__btn" data-view="general" data-selected="true">
              Resumen
            </span>
            <span class="view-switch__btn" data-view="advanced" data-selected="false" data-product-action="edit">
              Editar
            </span>
          </span>
        </button>
      </div>
      <button class="drawer__delete-btn" type="button" data-product-action="delete" title="Eliminar de Inventario">
        <i data-lucide="trash-2"></i>
      </button>
    `;
  }

  function render(product) {
    const category = getCategoryMeta(product);
    const stock = getStockMeta(product);
    const barcodeSvg = typeof generateBarcodeSVG === "function" ? generateBarcodeSVG(product.codigo) : "";
    const imageUrl = window.Config.resolveImageUrl(product.imagen);

    return `
      <div class="drawer__visual">
        <div class="product-card__image-fallback" style="background: var(--cat-refacciones-bg)">
          ${imageUrl ? `<img src="${imageUrl}" alt="${product.nombre}" loading="lazy" onload="this.classList.add('loaded')" onerror="this.remove()" />` : `<i data-lucide="${category.icon}" style="width: 56px; height: 56px;"></i>`}
        </div>
      </div>

      <div class="drawer__brand">${product.marca}</div>
      <h3 class="drawer__name">${product.nombre}</h3>

      <div class="drawer__price-card">
        <div class="drawer__price-info">
          <span class="product-card__price-label">Precio al Publico</span>
          <span class="drawer__price-amount">$${(product.precio || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span class="drawer__cost-amount">Costo Unitario: $${(product.costo || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div style="text-align: right;">
          <span class="product-card__badge" style="background: ${category.gradient}">${product.unitCode}</span>
        </div>
      </div>

      <h4 style="font-size: 12.5px; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 12px; font-weight:700;">Detalles Tecnicos</h4>
      <div class="drawer__specs-list">
        <div class="drawer__spec-item">
          <span class="drawer__spec-label">SKU / Codigo</span>
          <span class="drawer__spec-value" style="font-family: monospace; font-weight:700;">${product.codigo}</span>
        </div>
        <div class="drawer__spec-item">
          <span class="drawer__spec-label">Categoria</span>
          <span class="drawer__spec-value">${category.label}</span>
        </div>
        <div class="drawer__spec-item">
          <span class="drawer__spec-label">Estado de Inventario</span>
          <span class="drawer__spec-value" ${stock.style}><strong>${stock.text}</strong></span>
        </div>
        ${renderSpecs(product)}
      </div>

      <h4 style="font-size: 12.5px; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 12px; font-weight:700;">Codigo de Barras (${(product.barcodeType || "code128").toUpperCase()})</h4>
      <div class="drawer__barcode-section">
        <div class="drawer__barcode-container">
          ${barcodeSvg}
        </div>
      </div>
    `;
  }

  function hydrate(root, product) {
    root.querySelector('[data-product-action="delete"]')?.addEventListener("click", () => {
      window.deleteProduct?.(product.id);
    });

    root.querySelector('[data-product-action="edit"]')?.addEventListener("click", () => {
      window.__openingProductSheetRoute = true;
      try {
        window.__currentProductId = product.id;
        const form = document.getElementById("pf");
        if (form) form.dataset.draftId = product.id;
        window.openProductFormSheet?.();
        window.populateProductFormFromProduct?.(product);
        window.setProductSheetHash?.("product", product);
      } finally {
        window.__openingProductSheetRoute = false;
      }
    });
  }

  window.ProductDetailSheet = {
    render,
    renderTopControls,
    hydrate,
  };
})();
