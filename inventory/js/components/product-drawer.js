/**
 * product-drawer.js
 * Product detail slider drawer, glider tabs switcher, product form editor.
 */

function openProductDrawer(p) {
  window.DOM.detailDrawer.dataset.activeId = p.id;

  // Update URL hash for the opened product
  if (typeof window.setProductSheetHash === "function") {
    window.setProductSheetHash("product", p, "general");
  }

  if (!window.SheetManager || !window.ProductDetailSheet) return;

  window.SheetManager.open({
    id: "product-detail",
    title: "Ficha Técnica",
    variant: "side",
    size: "md",
    mode: "view",
    hideIsland: true,
    meta: {
      eyebrow: p.codigo || "Producto",
      activeId: p.id,
      mode: "view"
    },
    data: { product: p },
    slots: {
      topControls: window.ProductDetailSheet.renderTopControls,
      main: () => window.ProductDetailSheet.render(p)
    },
    onOpen(root) {
      window.ProductDetailSheet.hydrate(root, p);
    },
    onClose() {
      cleanProductSheetHash();
    }
  });
}

function closeProductDrawer() {
  window.SheetManager?.close("product-detail");
  cleanProductSheetHash();
}

function cleanProductSheetHash() {
  // Clean the URL when the detail drawer closes
  if (window.history && typeof window.history.replaceState === "function") {
    const path = `${window.location.pathname}${window.location.search}`;
    if (window.location.hash.startsWith("#/draft") || window.location.hash.startsWith("#/product")) {
      window.history.replaceState({}, document.title, path);
    }
  }
}

function setDrawerTab(tab) {
  window.AppState.activeDrawerTab = tab;

  // Toggle tab active styles
  window.DOM.drawerTabProduct.classList.toggle("drawer__tab--active", tab === "product");
  window.DOM.drawerTabForm.classList.toggle("drawer__tab--active", tab === "form");

  // Toggle view elements visibility
  window.DOM.drawerViewProduct.classList.toggle("drawer__view--active", tab === "product");
  window.DOM.drawerViewForm.classList.toggle("drawer__view--active", tab === "form");
}

function renderDrawerViewProduct(p) {
  let catGradient = "var(--cat-otros-bg)";
  let catIcon = "box";
  let catLabel = "Refacción / General";

  if (p.categoriaCodigo === "01") {
    catGradient = "var(--cat-coccion-bg)";
    catIcon = "flame";
    catLabel = "Equipo de Cocción Industrial";
  } else if (p.categoriaCodigo === "02") {
    catGradient = "var(--cat-refacciones-bg)";
    catIcon = "settings";
    catLabel = "Refacción y Componente Original";
  } else if (p.categoriaCodigo === "03") {
    catGradient = "var(--cat-limpieza-bg)";
    catIcon = "droplets";
    catLabel = "Químico y Limpieza Profesional";
  }

  const barcodeSvg = typeof generateBarcodeSVG === "function" ? generateBarcodeSVG(p.codigo) : "";

  // Additional technical specs list items
  let specsHtml = "";
  if (p.descripcion) specsHtml += `<div class="drawer__spec-item"><span class="drawer__spec-label">Descripción</span><span class="drawer__spec-value drawer__spec-value--custom">${p.descripcion}</span></div>`;
  if (p.especificaciones) specsHtml += `<div class="drawer__spec-item"><span class="drawer__spec-label">Especificaciones</span><span class="drawer__spec-value drawer__spec-value--custom">${p.especificaciones}</span></div>`;
  if (p.especial3) specsHtml += `<div class="drawer__spec-item"><span class="drawer__spec-label">Ubicación / Notas</span><span class="drawer__spec-value drawer__spec-value--custom">${p.especial3}</span></div>`;
  if (p.especial4) specsHtml += `<div class="drawer__spec-item"><span class="drawer__spec-label">Dimensiones / Datos</span><span class="drawer__spec-value drawer__spec-value--custom">${p.especial4}</span></div>`;
  if (p.especial5) specsHtml += `<div class="drawer__spec-item"><span class="drawer__spec-label">Campo Adicional 5</span><span class="drawer__spec-value drawer__spec-value--custom">${p.especial5}</span></div>`;
  if (p.especial6) specsHtml += `<div class="drawer__spec-item"><span class="drawer__spec-label">Campo Adicional 6</span><span class="drawer__spec-value drawer__spec-value--custom">${p.especial6}</span></div>`;

  let stockText = "Agotado / Sin Existencias";
  let stockStyle = 'style="color: var(--color-danger);"';
  const stockVal = parseFloat(p.stock) || 0;
  const alertVal = parseFloat(p.alertaCantidad) || 0;

  if (stockVal > alertVal) {
    stockText = `${stockVal} unidades en existencia`;
    stockStyle = 'style="color: var(--color-success);"';
  } else if (stockVal > 0) {
    stockText = `Bajo Stock (${stockVal} restantes)`;
    stockStyle = 'style="color: var(--color-warning);"';
  }

  const drawerImgUrl = window.Config.resolveImageUrl(p.imagen);

  window.DOM.drawerViewProduct.innerHTML = `
    <div class="drawer__visual">
      <div class="product-card__image-fallback" style="background: var(--cat-refacciones-bg)">
        ${drawerImgUrl ? `<img src="${drawerImgUrl}" alt="${p.nombre}" loading="lazy" onload="this.classList.add('loaded')" onerror="this.remove()" />` : `<i data-lucide="${catIcon}" style="width: 56px; height: 56px;"></i>`}
      </div>
    </div>

    <div class="drawer__brand">${p.marca}</div>
    <h3 class="drawer__name">${p.nombre}</h3>

    <div class="drawer__price-card">
      <div class="drawer__price-info">
        <span class="product-card__price-label">Precio al Público</span>
        <span class="drawer__price-amount">$${(p.precio || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        <span class="drawer__cost-amount">Costo Unitario: $${(p.costo || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>
      <div style="text-align: right;">
        <span class="product-card__badge" style="background: ${catGradient}">${p.unitCode}</span>
      </div>
    </div>

    <h4 style="font-size: 12.5px; text-transform: uppercase; letter-spacing:0.05em; color: var(--text-secondary); margin-bottom: 12px; font-weight:700;">Detalles Técnicos</h4>
    <div class="drawer__specs-list">
      <div class="drawer__spec-item">
        <span class="drawer__spec-label">SKU / Código</span>
        <span class="drawer__spec-value" style="font-family: monospace; font-weight:700;">${p.codigo}</span>
      </div>
      <div class="drawer__spec-item">
        <span class="drawer__spec-label">Categoría</span>
        <span class="drawer__spec-value">${catLabel}</span>
      </div>
      <div class="drawer__spec-item">
        <span class="drawer__spec-label">Estado de Inventario</span>
        <span class="drawer__spec-value" ${stockStyle}><strong>${stockText}</strong></span>
      </div>
      ${specsHtml}
    </div>

    <h4 style="font-size: 12.5px; text-transform: uppercase; letter-spacing:0.05em; color: var(--text-secondary); margin-bottom: 12px; font-weight:700;">Código de Barras (${p.barcodeType.toUpperCase()})</h4>
    <div class="drawer__barcode-section">
      <div class="drawer__barcode-container">
        ${barcodeSvg}
      </div>
    </div>
`;

   const headerActions = window.DOM.detailDrawer.querySelector('.drawer__header-actions');
   if (headerActions) {
     headerActions.innerHTML = `
       <button class="drawer__edit-btn" id="btn-edit-product" title="Editar producto">
         <i data-lucide="edit"></i>
       </button>
       <button class="drawer__delete-btn" id="btn-delete-product" title="Eliminar de Inventario">
         <i data-lucide="trash-2"></i>
       </button>
       <button class="drawer__close-btn" id="close-drawer-btn" aria-label="Cerrar cajón">
         <i data-lucide="x"></i>
       </button>
     `;
     document.getElementById("btn-delete-product").addEventListener("click", () => {
       deleteProduct(p.id);
     });
     document.getElementById("btn-edit-product").addEventListener("click", () => {
       window.__openingProductSheetRoute = true;
       try {
         window.__currentProductId = p.id;
         const form = document.getElementById("pf");
         if (form) form.dataset.draftId = p.id;
         openProductFormSheet();
         if (typeof window.populateProductFormFromProduct === "function") {
           window.populateProductFormFromProduct(p);
         }
         if (typeof window.setProductSheetHash === "function") {
           window.setProductSheetHash("product", p, "edit");
         }
       } finally {
         window.__openingProductSheetRoute = false;
       }
     });
     document.getElementById("close-drawer-btn").addEventListener("click", closeProductDrawer);
   }

   createLucideIcons();
 }

function deleteProduct(id) {
  if (confirm("¿Estás seguro de que deseas eliminar permanentemente este producto del inventario? Esta acción no se puede deshacer.")) {
    window.AppState.products = window.AppState.products.filter(p => p.id !== id);
    saveProductsToStorage();
    showToast("Producto eliminado correctamente", "danger");
    closeProductDrawer();
  }
}

function renderDrawerViewForm(p) {
  window.DOM.drawerViewForm.innerHTML = `
    <form id="edit-product-form">
      
      <div class="form-group">
        <label class="form-group__label">Código SKU (Escaneado)</label>
        <input type="text" class="form-group__input" value="${p.codigo}" readonly style="opacity: 0.65; cursor: not-allowed; font-family: monospace;" />
      </div>

      <div class="form-group">
        <label class="form-group__label">Nombre del Producto</label>
        <input type="text" id="form-nombre" class="form-group__input" value="${p.nombre}" required placeholder="Ej. Horno de Convección RATIONAL" />
      </div>

      <div class="form-group__row">
        <div class="form-group">
          <label class="form-group__label">Marca</label>
          <input type="text" id="form-marca" class="form-group__input" value="${p.marca}" placeholder="Ej. RATIONAL" list="brands-datalist" />
          <datalist id="brands-datalist">
            ${window.AppState.brands.map(b => `<option value="${b}"></option>`).join("")}
          </datalist>
        </div>
        <div class="form-group">
          <label class="form-group__label">Unidad de Medida</label>
          <input type="text" id="form-unit" class="form-group__input" value="${p.unitCode}" placeholder="Ej. Pieza, Caja" />
        </div>
      </div>

      <div class="form-group">
        <label class="form-group__label">Categoría de Cocina</label>
        <select id="form-category" class="form-group__select">
          <option value="01" ${p.categoriaCodigo === "01" ? "selected" : ""}>Cocción (Equipos Calientes)</option>
          <option value="02" ${p.categoriaCodigo === "02" ? "selected" : ""}>Refacciones & Componentes</option>
          <option value="03" ${p.categoriaCodigo === "03" ? "selected" : ""}>Limpieza & Químicos</option>
          <option value="other" ${p.categoriaCodigo === "other" ? "selected" : ""}>Otros / Generales</option>
        </select>
      </div>

      <div class="form-group__row">
        <div class="form-group">
          <label class="form-group__label">Precio de Venta ($)</label>
          <input type="number" step="0.01" id="form-precio" class="form-group__input" value="${p.precio}" required />
        </div>
        <div class="form-group">
          <label class="form-group__label">Costo Neto ($)</label>
          <input type="number" step="0.01" id="form-costo" class="form-group__input" value="${p.costo}" />
        </div>
      </div>

      <div class="form-group__row">
        <div class="form-group">
          <label class="form-group__label">Cantidad en Stock</label>
          <input type="number" step="0.1" id="form-stock" class="form-group__input" value="${p.stock}" required />
        </div>
        <div class="form-group">
          <label class="form-group__label">Alerta Stock Mínimo</label>
          <input type="number" step="1" id="form-alerta" class="form-group__input" value="${p.alertaCantidad}" required />
        </div>
      </div>

      <div class="form-group">
        <label class="form-group__label">Descripción</label>
        <textarea id="form-desc" class="form-group__textarea" placeholder="Breve descripción del equipo industrial...">${p.descripcion || ""}</textarea>
      </div>

      <div class="form-group">
        <label class="form-group__label">Especificaciones Técnicas</label>
        <textarea id="form-specs" class="form-group__textarea" placeholder="Ej. Voltaje, potencia, conexiones de gas...">${p.especificaciones || ""}</textarea>
      </div>

      <div class="form-group__row">
        <div class="form-group">
          <label class="form-group__label">Ubicación física / Notas</label>
          <input type="text" id="form-ubicacion" class="form-group__input" value="${p.especial3 || ""}" placeholder="Estante A, Pasillo 3" />
        </div>
        <div class="form-group">
          <label class="form-group__label">Dimensiones (An x Al x Pr)</label>
          <input type="text" id="form-dimensiones" class="form-group__input" value="${p.especial4 || ""}" placeholder="80x90x60 cm" />
        </div>
      </div>

      <div class="form-group__row">
        <div class="form-group">
          <label class="form-group__label">Campo Personalizado 5</label>
          <input type="text" id="form-custom5" class="form-group__input" value="${p.especial5 || ""}" />
        </div>
        <div class="form-group">
          <label class="form-group__label">Campo Personalizado 6</label>
          <input type="text" id="form-custom6" class="form-group__input" value="${p.especial6 || ""}" />
        </div>
      </div>

      <div style="margin-top: 24px; display: flex; gap: 12px;">
        <button type="submit" class="drawer__primary-btn">
          <i data-lucide="save"></i> Guardar Cambios
        </button>
      </div>
    </form>
  `;

  document.getElementById("edit-product-form").addEventListener("submit", (event) => {
    event.preventDefault();
    saveProductForm(p.id);
  });

  createLucideIcons();
}

function saveProductForm(id) {
  const p = window.AppState.products.find(x => x.id === id);
  if (!p) return;

  // Grab values
  p.nombre = document.getElementById("form-nombre").value.trim() || "Producto sin nombre";
  p.marca = document.getElementById("form-marca").value.trim() || "Generales";
  p.unitCode = document.getElementById("form-unit").value.trim() || "Pieza";
  p.categoriaCodigo = document.getElementById("form-category").value;
  p.precio = parseFloat(document.getElementById("form-precio").value) || 0;
  p.costo = parseFloat(document.getElementById("form-costo").value) || 0;
  p.stock = parseFloat(document.getElementById("form-stock").value) || 0;
  p.alertaCantidad = parseFloat(document.getElementById("form-alerta").value) || 0;
  p.descripcion = document.getElementById("form-desc").value.trim();
  p.especificaciones = document.getElementById("form-specs").value.trim();
  p.especial3 = document.getElementById("form-ubicacion").value.trim();
  p.especial4 = document.getElementById("form-dimensiones").value.trim();
  p.especial5 = document.getElementById("form-custom5").value.trim();
  p.especial6 = document.getElementById("form-custom6").value.trim();

  p.sync_status = "pending";
  p.updatedAt = new Date().toISOString();
  saveProductsToStorage();
  showToast("¡Producto guardado exitosamente!", "success");

  // Switch back to detail product view
  openProductDrawer(p);
}

// ── New Form Side Sheet Helpers ───────────────────────

function openProductFormSheet() {
  if (!window.SheetManager || !window.ProductFormSheet) return;

  if (window.setProductSheetHash && !window.__openingProductSheetRoute) {
    const form = document.getElementById("pf");
    const draftId = form?.dataset.draftId;
    const currentId = window.__currentProductId;
    const product = draftId && window.AppState?.products
      ? window.AppState.products.find(p => p.id === draftId)
      : currentId && window.AppState?.products
        ? window.AppState.products.find(p => p.id === currentId)
      : null;
    if (product) {
      window.setProductSheetHash("product", product, "edit");
    }
  }

  window.SheetManager.open({
    id: "product-form",
    title: window.ProductFormSheet.getTitle(),
    variant: "side",
    size: "xl",
    mode: window.__currentProductId ? "edit" : "create",
    hideIsland: true,
    meta: window.ProductFormSheet.getMeta(),
    slots: {
      topControls: window.ProductFormSheet.renderTopControls,
      stickyNav: window.ProductFormSheet.getStepPills,
      main: window.ProductFormSheet.getBody,
      fixedControls: window.ProductFormSheet.getBottomBar
    },
    onOpen(root) {
      window.ProductFormSheet.hydrate(root);
      window.ProductFormUpdateState?.sync?.();
    },
    onBeforeClose() {
      window.ProductFormSheet.detach();
    },
    onClose() {
      cleanProductSheetHash();
    }
  });
}

function populateProductFormFromProduct(p) {
  const form = document.getElementById("pf");
  if (!form || !p) return;
  clearTaxonomyGuardAlerts(form);

  const setValue = (selector, value) => {
    const el = form.querySelector(selector) || document.querySelector(selector);
    if (!el || value === undefined || value === null) return;
    const nextValue = String(value);
    if (el.tagName === "SELECT" && nextValue) {
      const matchingOption = Array.from(el.options).find(option => {
        return option.value === nextValue || option.textContent.trim() === nextValue;
      });
      if (!matchingOption) return;
      el.value = matchingOption.value;
    } else {
      el.value = nextValue;
    }
    el.dispatchEvent(new Event("change", { bubbles: true }));
    el.dispatchEvent(new Event("input", { bubbles: true }));
  };

  const setChecked = (selector, checked) => {
    const el = form.querySelector(selector);
    if (!el) return;
    el.checked = Boolean(checked);
    el.dispatchEvent(new Event("change", { bubbles: true }));
  };

  setValue('input[name="name"]', p.nombre || "");
  setValue('input[name="code"]', p.codigo || "");
  setValue('select[name="barcode_symbology"]', p.barcodeType || "code128");
  setImportedSelectValue('select[name="brand"]', p.marca, "brands", "Marca importada");
  setImportedSelectValue('select[name="category"]', p.categoriaCodigo, "categories", "Categoría importada");
  setImportedSelectValue('select[name="subcategory"]', p.subCategoria, "subcategories", "Subcategoría importada");
  setValue('input[name="cost"]', p.costo || "");
  setValue('input[name="price"]', p.precio || "");
  setValue('select[name="currency"]', p.currency || "MXN");
  setValue('input[name="exchange_rate"]', p.exchangeRate || 1);
  setValue('select[name="qf_currency"]', p.quoteCurrency || p.currency || "MXN");
  setValue('input[name="qf_exchange_rate"]', p.quoteExchangeRate || p.exchangeRate || 1);
  setValue('select[name="tax_rate"]', p.tasaImpuesto === "IVA" ? "5" : "");
  setValue('select[name="tax_method"]', p.metodoImpuesto === "Inclusivo" ? "0" : "1");
  setImportedSelectValue('select[name="unit"]', getProductUnitValue(p, "unitCode"), "units", "Unidad importada");
  setImportedSelectValue('#u-sale', getProductUnitValue(p, "saleUnitCode"), "units", "Unidad importada");
  setImportedSelectValue('#u-purch', getProductUnitValue(p, "purchaseUnitCode"), "units", "Unidad importada");
  setWarehouseStockValues(form, p);
  setValue('input[name="alert_quantity"]', p.alertaCantidad || "");
  setValue('input[name="weight"]', p.weight || "");
  setValue('input[name="length"]', p.length || "");
  setValue('input[name="width"]', p.width || "");
  setValue('input[name="height"]', p.height || "");
  setValue('textarea[name="details"]', p.especificaciones || "");
  setValue('textarea[name="history"]', p.especial3 || "");
  window.ProductFormCustomFields?.setFields?.(
    p.customFields?.length
      ? p.customFields
      : [
          { name: p.cf1_name || "", value: p.cf1_data || p.especial4 || "" },
          { name: p.cf2_name || "", value: p.cf2_data || p.especial5 || "" },
          { name: p.cf3_name || "", value: p.cf3_data || p.especial6 || "" },
          { name: p.cf4_name || "", value: p.cf4_data || "" },
          { name: p.cf5_name || "", value: p.cf5_data || "" },
          { name: p.cf6_name || "", value: p.cf6_data || "" },
        ]
  );
  window.ProductFormUpdateState?.captureBaseline?.(p);
  setValue('select[name="supplier"]', p.supplier || "");
  setValue('input[name="supplier_part_no"]', p.supplier_part_no || "");
  setValue('input[name="supplier_price"]', p.supplier_price || "");

  if (p.tipoProducto && window.CSS && CSS.escape) {
    setChecked(`input[name="type"][value="${CSS.escape(p.tipoProducto)}"]`, true);
  }
}

function normalizeCategoryForProductForm(value) {
  const raw = String(value || "").trim();
  const alias = window.TaxonomyReconciliation?.resolveAlias?.("categories", raw);
  if (alias) return alias;
  const optionValue = findSelectOptionValue('select[name="category"]', raw);
  if (optionValue) return optionValue;
  return raw;
}

function setWarehouseStockValues(form, product) {
  const qtyInputs = Array.from(form.querySelectorAll('input[name^="wh_qty_"]'));
  if (!qtyInputs.length) return;

  qtyInputs.forEach((input) => {
    input.value = "";
  });

  if (product?.warehouseStock && typeof product.warehouseStock === "object") {
    qtyInputs.forEach((input) => {
      const warehouseId = input.name.replace(/^wh_qty_/, "");
      input.value = product.warehouseStock[warehouseId] ?? "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    return;
  }

  qtyInputs[0].value = product?.stock || "";
  qtyInputs[0].dispatchEvent(new Event("input", { bubbles: true }));
  qtyInputs[0].dispatchEvent(new Event("change", { bubbles: true }));
}

function normalizeUnitForProductForm(value) {
  const original = String(value || "").trim();
  const alias = window.TaxonomyReconciliation?.resolveAlias?.("units", original);
  if (alias) return alias;
  const optionValue = findSelectOptionValue('select[name="unit"]', original);
  if (optionValue) return optionValue;
  return original;
}

function getProductUnitValue(product, key) {
  if (!product) return "";
  if (product[key]) return product[key];
  if (key === "saleUnitCode") return product["Venta unit code"] || product.unitCode || product["unit code"] || "";
  if (key === "purchaseUnitCode") return product["Comprar unit code"] || product.unitCode || product["unit code"] || "";
  return product.unitCode || product["unit code"] || "";
}

function formOptionExists(selector, value) {
  return Boolean(findSelectOptionValue(selector, value));
}

function findSelectOptionValue(selector, value) {
  const form = document.getElementById("pf");
  const select = form?.querySelector(selector);
  const raw = String(value || "").trim();
  if (!select || !raw) return "";
  const rawComparable = normalizeTaxonomyComparableValue(raw);
  const matchingOption = Array.from(select.options).find((option) => {
    const optionValue = String(option.value || "").trim();
    const optionLabel = String(option.textContent || "").trim();
    return (
      optionValue === raw ||
      optionLabel === raw ||
      normalizeTaxonomyComparableValue(optionLabel) === rawComparable
    );
  });
  return matchingOption?.value || "";
}

function normalizeTaxonomyComparableValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s*\([^)]*\)\s*/g, "")
    .replace(/\s+/g, " ");
}

function ensureSelectOption(selector, value, label) {
  const cleanValue = String(value || "").trim();
  if (!cleanValue) return false;
  const cleanLabel = String(label || cleanValue).trim();

  const form = document.getElementById("pf");
  const select = form?.querySelector(selector);
  if (!select) return false;
  if (select.disabled) select.disabled = false;
  if (formOptionExists(selector, cleanValue)) return false;

  const option = document.createElement("option");
  option.value = cleanValue;
  option.textContent = cleanLabel;
  select.appendChild(option);
  return true;
}

function setImportedSelectValue(selector, rawValue, scope, message) {
  const raw = String(rawValue || "").trim();
  if (!raw) return;

  const normalizedValue = scope === "categories"
    ? normalizeCategoryForProductForm(raw)
    : scope === "units"
      ? normalizeUnitForProductForm(raw)
      : window.TaxonomyReconciliation?.resolveAlias?.(scope, raw) || raw;
  const inserted = ensureSelectOption(selector, normalizedValue);
  setValueWithEvents(selector, normalizedValue);

  const rawIsDefined = isTaxonomyValueDefined(scope, raw);
  const normalizedIsDefined = isTaxonomyValueDefined(scope, normalizedValue);
  if (inserted || (!rawIsDefined && !normalizedIsDefined)) {
    markTaxonomyGuardAlert(selector, {
      scope,
      rawValue: raw,
      currentValue: normalizedValue,
      message: normalizedValue !== raw ? `${message}: ${raw}` : message,
    });
  }
}

function isTaxonomyValueDefined(scope, value) {
  const raw = String(value || "").trim();
  const config = window.ProductFormConfig || {};
  if (!raw) return true;

  if (scope === "brands") {
    const comparableRaw = normalizeTaxonomyComparableValue(raw);
    return (config.BRANDS || []).some((brand) => {
      const cleanBrand = String(brand || "").trim();
      return cleanBrand === raw || normalizeTaxonomyComparableValue(cleanBrand) === comparableRaw;
    });
  }
  if (scope === "categories") {
    const comparableRaw = normalizeTaxonomyComparableValue(raw);
    return Boolean((config.CATEGORIES || {})[raw]) || Object.values(config.CATEGORIES || {}).some((category) => {
      const label = typeof category === "object" ? category.name : category;
      const cleanLabel = String(label || "").trim();
      return cleanLabel === raw || normalizeTaxonomyComparableValue(cleanLabel) === comparableRaw;
    });
  }
  if (scope === "subcategories") {
    const categoryKey = document.getElementById("f-cat")?.value || "";
    const comparableRaw = normalizeTaxonomyComparableValue(raw);
    return (config.CATEGORIES?.[categoryKey]?.subcategories || []).some((sub) => {
      const cleanSub = String(sub || "").trim();
      return cleanSub === raw || normalizeTaxonomyComparableValue(cleanSub) === comparableRaw;
    });
  }
  if (scope === "units") {
    const units = config.UNITS || {};
    const comparableRaw = normalizeTaxonomyComparableValue(raw);
    return Boolean(units[raw]) || Object.values(units).some((label) => {
      const cleanLabel = String(label || "").trim();
      return cleanLabel === raw || normalizeTaxonomyComparableValue(cleanLabel) === comparableRaw;
    });
  }
  return true;
}

function setValueWithEvents(selector, value) {
  const form = document.getElementById("pf");
  const el = form?.querySelector(selector);
  if (!el || value === undefined || value === null) return;
  el.value = String(value);
  el.dispatchEvent(new Event("change", { bubbles: true }));
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function clearTaxonomyGuardAlerts(form) {
  form.querySelectorAll(".has-taxonomy-guard").forEach((field) => {
    field.classList.remove("has-taxonomy-guard");
  });
  form.querySelectorAll(".has-taxonomy-guard-control").forEach((control) => {
    control.classList.remove("has-taxonomy-guard-control");
  });
  form.querySelectorAll("[data-taxonomy-guard-chip]").forEach((chip) => {
    chip.remove();
  });
  form.querySelectorAll(".has-taxonomy-guard-chip").forEach((control) => {
    control.classList.remove("has-taxonomy-guard-chip");
  });
}

function markTaxonomyGuardAlert(selector, message) {
  const form = document.getElementById("pf");
  const control = form?.querySelector(selector);
  if (!control) return;

  const field = control.closest(".field");
  field?.classList.add("has-taxonomy-guard");
  getTaxonomyGuardVisualControl(control).classList.add("has-taxonomy-guard-control");

  const chipHost = getTaxonomyGuardChipHost(control);
  if (!chipHost || chipHost.querySelector("[data-taxonomy-guard-chip]")) return;
  chipHost.classList.add("has-taxonomy-guard-chip");

  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "taxonomy-guard-chip";
  chip.dataset.taxonomyGuardChip = "";
  chip.dataset.taxonomyScope = message.scope || "";
  chip.dataset.taxonomyRawValue = message.rawValue || "";
  chip.dataset.taxonomyCurrentValue = message.currentValue || "";
  chip.dataset.taxonomySelector = selector;
  chip.innerHTML = `
    <span>${escapeTaxonomyHtml(message.rawValue || "Dato importado")}</span>
    <small>importado</small>
  `;
  chip.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openTaxonomyReconciliationModal({
      scope: chip.dataset.taxonomyScope,
      rawValue: chip.dataset.taxonomyRawValue,
      currentValue: chip.dataset.taxonomyCurrentValue,
      selector: chip.dataset.taxonomySelector,
      label: field?.querySelector("label")?.childNodes?.[0]?.textContent?.trim() || "Dato",
    });
  });
  chipHost.append(chip);
}

function getTaxonomyGuardVisualControl(control) {
  return (
    control.closest(".input-row--action") ||
    control.closest(".input-row") ||
    control.closest(".custom-select-wrapper")?.querySelector(".custom-select-trigger") ||
    control
  );
}

function getTaxonomyGuardChipHost(control) {
  return (
    control.closest(".custom-select-wrapper")?.querySelector(".custom-select-trigger") ||
    getTaxonomyGuardVisualControl(control)
  );
}

function getTaxonomyOptions(scope) {
  const config = window.ProductFormConfig || {};
  if (scope === "brands") {
    return (config.BRANDS || []).map((brand) => ({ value: brand, label: brand }));
  }
  if (scope === "categories") {
    return Object.entries(config.CATEGORIES || {}).map(([key, value]) => ({
      value: key,
      label: typeof value === "object" ? value.name : String(value || key),
    }));
  }
  if (scope === "units") {
    return Object.entries(config.UNITS || {}).map(([key, label]) => ({
      value: key,
      label,
    }));
  }
  if (scope === "subcategories") {
    const categoryKey = document.getElementById("f-cat")?.value || "";
    const subcategories = config.CATEGORIES?.[categoryKey]?.subcategories || [];
    return subcategories.map((label) => ({ value: label, label }));
  }
  return [];
}

function getTaxonomyScopeLabel(scope) {
  const labels = {
    brands: "Marcas",
    categories: "Categorías",
    subcategories: "Subcategorías",
    units: "Unidades",
  };
  return labels[scope] || "Catálogo";
}

function canAddImportedTaxonomy(scope) {
  return ["brands", "categories", "subcategories"].includes(scope);
}

function openTaxonomyReconciliationModal(detail) {
  const options = getTaxonomyOptions(detail.scope);
  let modal = document.getElementById("taxonomy-reconcile-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "taxonomy-reconcile-modal";
    modal.className = "taxonomy-reconcile-modal";
    modal.innerHTML = `
      <div class="taxonomy-reconcile-modal__scrim" data-taxonomy-reconcile-close></div>
      <section class="taxonomy-reconcile-modal__panel" role="dialog" aria-modal="true" aria-labelledby="taxonomy-reconcile-title">
        <header class="taxonomy-reconcile-modal__header">
          <div>
            <span class="taxonomy-reconcile-modal__eyebrow">Conciliación</span>
            <h3 id="taxonomy-reconcile-title">Dato importado</h3>
          </div>
          <button type="button" class="taxonomy-reconcile-modal__close" data-taxonomy-reconcile-close aria-label="Cerrar">×</button>
        </header>
        <div class="taxonomy-reconcile-modal__body"></div>
      </section>
    `;
    document.body.append(modal);
    modal.addEventListener("click", (event) => {
      if (event.target.closest("[data-taxonomy-reconcile-close]")) {
        closeTaxonomyReconciliationModal();
      }
    });
  }

  modal.dataset.state = "open";
  modal.dataset.selector = detail.selector || "";
  modal.dataset.scope = detail.scope || "";
  modal.dataset.rawValue = detail.rawValue || "";
  const scopeLabel = getTaxonomyScopeLabel(detail.scope);
  const canAddImported = canAddImportedTaxonomy(detail.scope);
  modal.querySelector("#taxonomy-reconcile-title").textContent = `Conciliar ${detail.label || "dato"}`;
  modal.querySelector(".taxonomy-reconcile-modal__body").innerHTML = `
    <div class="taxonomy-reconcile-modal__value">
      <span>Valor importado</span>
      <strong>${escapeTaxonomyHtml(detail.rawValue || "")}</strong>
    </div>
    <label class="taxonomy-reconcile-modal__label">
      Mapear a existente
      <select data-taxonomy-reconcile-target>
        ${options.map((option) => `
          <option value="${escapeTaxonomyHtml(option.value)}" ${option.value === detail.currentValue ? "selected" : ""}>
            ${escapeTaxonomyHtml(option.label)}
          </option>
        `).join("")}
      </select>
    </label>
    ${canAddImported ? `
      <div class="taxonomy-reconcile-modal__imported-option">
        <span>Opción en estado importada</span>
        <strong>${escapeTaxonomyHtml(detail.rawValue || "")}</strong>
        <button type="button" class="taxonomy-reconcile-modal__import" data-taxonomy-reconcile-import>
          Agregar a ${escapeTaxonomyHtml(scopeLabel)}
        </button>
      </div>
    ` : ""}
    <div class="taxonomy-reconcile-modal__actions">
      <button type="button" class="taxonomy-reconcile-modal__secondary" data-taxonomy-reconcile-close>Después</button>
      <button type="button" class="taxonomy-reconcile-modal__primary" data-taxonomy-reconcile-save>Guardar alias</button>
    </div>
  `;

  modal.querySelector("[data-taxonomy-reconcile-save]")?.addEventListener("click", async () => {
    const button = modal.querySelector("[data-taxonomy-reconcile-save]");
    const target = modal.querySelector("[data-taxonomy-reconcile-target]")?.value || "";
    if (!target) return;

    button.disabled = true;
    button.dataset.loading = "true";
    try {
      await window.TaxonomyReconciliation?.saveAlias?.(detail.scope, detail.rawValue, target);
      setValueWithEvents(detail.selector, target);
      clearSingleTaxonomyGuard(detail.selector);
      window.ProductFormUpdateState?.sync?.();
      window.showToast?.("Alias guardado en configs", "success");
      closeTaxonomyReconciliationModal();
    } catch (error) {
      console.error("Taxonomy reconciliation failed:", error);
      window.showToast?.(error.message || "No se pudo guardar el alias", "danger");
    } finally {
      button.disabled = false;
      delete button.dataset.loading;
    }
  }, { once: true });

  modal.querySelector("[data-taxonomy-reconcile-import]")?.addEventListener("click", async () => {
    const button = modal.querySelector("[data-taxonomy-reconcile-import]");
    button.disabled = true;
    button.dataset.loading = "true";
    try {
      if (typeof window.TaxonomyReconciliation?.saveImportedValue !== "function") {
        throw new Error("Conciliación de taxonomía no disponible");
      }
      const saved = await window.TaxonomyReconciliation.saveImportedValue(detail.scope, detail.rawValue, {
        categoryKey: document.getElementById("f-cat")?.value || "",
      });
      await refreshTaxonomyAfterImport(saved);
      const nextValue = getImportedAssignmentValue(detail.scope, detail.rawValue);
      ensureSelectOption(detail.selector, nextValue, detail.rawValue);
      setValueWithEvents(detail.selector, nextValue);
      clearSingleTaxonomyGuard(detail.selector);
      window.ProductFormUpdateState?.sync?.();
      window.showToast?.(`Agregado a ${scopeLabel}`, "success");
      closeTaxonomyReconciliationModal();
    } catch (error) {
      console.error("Imported taxonomy save failed:", error);
      window.showToast?.(error.message || "No se pudo agregar el dato importado", "danger");
    } finally {
      button.disabled = false;
      delete button.dataset.loading;
    }
  }, { once: true });
}

async function refreshTaxonomyAfterImport(saved) {
  if (window.ProductFormSheet?.applyTaxonomyToFormConfig && saved) {
    window.ProductFormSheet.applyTaxonomyToFormConfig({
      categories: saved.categories,
      brands: saved.brands,
    });
  }
  window.ProductFormSheet?.updateTaxonomySelects?.();
}

function getImportedAssignmentValue(scope, value) {
  if (scope === "subcategories") {
    return slugifyTaxonomyValue(value);
  }
  return String(value || "").trim();
}

function slugifyTaxonomyValue(value) {
  return String(value || "").trim().toLowerCase().replace(/\s/g, "_");
}

function closeTaxonomyReconciliationModal() {
  const modal = document.getElementById("taxonomy-reconcile-modal");
  if (modal) modal.dataset.state = "closed";
}

function clearSingleTaxonomyGuard(selector) {
  const form = document.getElementById("pf");
  const control = form?.querySelector(selector);
  if (!control) return;
  const field = control.closest(".field");
  field?.classList.remove("has-taxonomy-guard");
  getTaxonomyGuardVisualControl(control).classList.remove("has-taxonomy-guard-control");
  getTaxonomyGuardChipHost(control)?.classList.remove("has-taxonomy-guard-chip");
  getTaxonomyGuardChipHost(control)?.querySelector("[data-taxonomy-guard-chip]")?.remove();
}

function escapeTaxonomyHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function closeProductFormSheet() {
  window.SheetManager?.close("product-form");
  cleanProductSheetHash();
}
