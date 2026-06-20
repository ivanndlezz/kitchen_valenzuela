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
    const customFields = Array.isArray(product.customFields)
      ? product.customFields
      : [1, 2, 3, 4, 5, 6].map((n) => ({
          name: product[`cf${n}_name`] || "",
          value: product[`cf${n}_data`] || "",
        }));

    const fields = [
      ["Descripcion tienda", product.descripcion],
      ["Especificaciones", product.especificaciones],
      ["Ubicacion / Notas", product.especial3],
      ...customFields.map((field, index) => [
        field.name || `Campo personalizado ${index + 1}`,
        field.value || "",
      ]),
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

  function renderTopControls(data, config = {}) {
    const selectedView = config.mode === "web" ? "web" : "general";

    return `
      <div class="view-switch view-switch--single sheet-mode-switch" data-sheet-mode-switch="product-detail">
        <button class="view-switch__toggle" type="button" aria-label="Cambiar a editar producto">
          <span class="view-switch__toggle-inner">
            <span class="view-switch__btn" data-view="general" data-selected="${selectedView === "general"}" data-product-action="view">
              Resumen
            </span>
            <span class="view-switch__btn" data-view="advanced" data-selected="false" data-product-action="edit">
              Editar
            </span>
            <span class="view-switch__btn" data-view="web" data-selected="${selectedView === "web"}" data-product-action="web">
              Web
            </span>
          </span>
        </button>
      </div>
      <button class="drawer__delete-btn" type="button" data-product-action="delete" title="Eliminar de Inventario">
        <i data-lucide="trash-2"></i>
      </button>
    `;
  }

  function renderWeb(product) {
    const ecommerceShipping = product.envioWeb == null ? "" : product.envioWeb;
    const webCurrency = String(product.webCurrency || "MXN").toUpperCase() === "USD" ? "USD" : "MXN";
    const webExchangeRate = Number(product.webExchangeRate) || 1;

    return `
      <form class="drawer__web-form" data-product-web-form>
        <div class="field" style="margin-top: 4px;">
          <label>Descripción — tienda</label>
          <textarea name="web_description" placeholder="Lo que verá el cliente en la tienda en línea...">${product.descripcion || ""}</textarea>
        </div>

        <div class="field">
          <label>Envío en tienda</label>
          <div class="input-row">
            <span class="prefix">$</span>
            <input type="number" name="envio_web" value="${ecommerceShipping}" placeholder="0.00" step="0.01" min="0">
          </div>
        </div>

        <div class="grid-2">
          <div class="field">
            <label>Divisa web</label>
            <select name="web_currency" data-web-currency>
              <option value="MXN" ${webCurrency === "MXN" ? "selected" : ""}>MXN</option>
              <option value="USD" ${webCurrency === "USD" ? "selected" : ""}>USD</option>
            </select>
          </div>
          <div class="field" data-web-exchange-rate ${webCurrency === "USD" ? "" : "hidden"}>
            <label>Tipo de cambio web</label>
            <div class="input-row">
              <span class="prefix">MXN</span>
              <input type="number" name="web_exchange_rate" value="${webExchangeRate}" placeholder="17.00" step="0.0001" min="0">
            </div>
          </div>
        </div>

        <div class="divider">Publicación</div>

        <div class="toggle-row">
          <div class="toggle-info">
            <strong>Mostrar en página de inicio</strong>
            <small>Aparece en sección destacados</small>
          </div>
          <label class="switch"><input type="checkbox" name="featured" value="1" ${product.featured ? "checked" : ""}><div class="track"><div class="thumb"></div></div></label>
        </div>

        <div class="toggle-row">
          <div class="toggle-info">
            <strong>Ocultar en POS</strong>
            <small>No aparece en ventas de mostrador</small>
          </div>
          <label class="switch"><input type="checkbox" name="hide_pos" value="1" ${product.hidePos ? "checked" : ""}><div class="track"><div class="thumb"></div></div></label>
        </div>

        <div class="toggle-row">
          <div class="toggle-info">
            <strong>Ocultar en tienda</strong>
            <small>Producto privado, no visible al público</small>
          </div>
          <label class="switch"><input type="checkbox" name="hide" value="1" ${product.hideStore ? "checked" : ""}><div class="track"><div class="thumb"></div></div></label>
        </div>

        <div style="margin-top: 24px; display: flex; gap: 12px;">
          <button type="submit" class="drawer__primary-btn">
            <i data-lucide="save"></i> Guardar Web
          </button>
        </div>
      </form>
    `;
  }

  function openWeb(product) {
    window.setProductSheetHash?.("product", product, "web");
    window.SheetManager?.open({
      id: "product-detail",
      title: "Ficha Técnica",
      variant: "side",
      size: "md",
      mode: "web",
      hideIsland: true,
      meta: {
        eyebrow: product.codigo || "Producto",
        activeId: product.id,
        mode: "web"
      },
      data: { product },
      slots: {
        topControls: renderTopControls,
        main: () => renderWeb(product)
      },
      onOpen(root) {
        hydrate(root, product);
      },
      onClose() {
        window.cleanProductSheetHash?.();
      }
    });
  }

  async function saveWebConfig(product, form) {
    const webCurrency = String(form.querySelector('select[name="web_currency"]')?.value || "MXN").toUpperCase() === "USD" ? "USD" : "MXN";
    const nextValues = {
      descripcion: form.querySelector('textarea[name="web_description"]')?.value.trim() || "",
      envioWeb: Number(form.querySelector('input[name="envio_web"]')?.value) || 0,
      webCurrency,
      webExchangeRate: Number(form.querySelector('input[name="web_exchange_rate"]')?.value) || 1,
      featured: Boolean(form.querySelector('input[name="featured"]')?.checked),
      hidePos: Boolean(form.querySelector('input[name="hide_pos"]')?.checked),
      hideStore: Boolean(form.querySelector('input[name="hide"]')?.checked),
    };

    Object.assign(product, nextValues, {
      sync_status: "pending",
      updatedAt: new Date().toISOString(),
    });

    if (typeof window.saveProductsToStorage === "function") {
      window.saveProductsToStorage();
    }

    if (product.airtable_id && window.SyncManager?.shumRequest) {
      await window.SyncManager.shumRequest("update", {
        baseId: window.SyncManager.config.baseId,
        table: window.SyncManager.config.table,
        recordId: product.airtable_id,
        data: {
          "Producto de campo personalizado 1": product.descripcion,
          "envio_web": product.envioWeb,
          "web_currency": product.webCurrency,
          "web_exchange_rate": product.webExchangeRate,
          "Mostrar en página de inicio": product.featured,
          "Ocultar en POS": product.hidePos,
          "Ocultar en tienda": product.hideStore,
        },
      });
      product.sync_status = "synced";
      if (typeof window.saveProductsToStorage === "function") {
        window.saveProductsToStorage();
      }
    }

    window.showToast?.("Configuración web guardada.", "success");
    openWeb(product);
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
    root.querySelector('[data-product-action="view"]')?.addEventListener("click", () => {
      window.setProductSheetHash?.("product", product, "general");
      window.openProductDrawer?.(product);
    });

    root.querySelector('[data-product-action="web"]')?.addEventListener("click", () => {
      openWeb(product);
    });

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
        window.setProductSheetHash?.("product", product, "edit");
      } finally {
        window.__openingProductSheetRoute = false;
      }
    });

    root.querySelector("[data-product-web-form]")?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const submitButton = event.currentTarget.querySelector('button[type="submit"]');
      try {
        if (submitButton) submitButton.disabled = true;
        await saveWebConfig(product, event.currentTarget);
      } catch (error) {
        console.error("ProductDetailSheet: web save failed", error);
        window.showToast?.("No se pudo guardar la configuración web.", "danger");
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });

    const webCurrency = root.querySelector("[data-web-currency]");
    const webExchangeField = root.querySelector("[data-web-exchange-rate]");
    webCurrency?.addEventListener("change", () => {
      const isUsd = String(webCurrency.value || "MXN").toUpperCase() === "USD";
      if (webExchangeField) webExchangeField.hidden = !isUsd;
      const input = webExchangeField?.querySelector("input");
      if (isUsd && input && !input.value) input.value = "1";
    });
  }

  window.ProductDetailSheet = {
    render,
    renderWeb,
    renderTopControls,
    hydrate,
    openWeb,
  };
})();
