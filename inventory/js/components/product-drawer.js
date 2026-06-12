/**
 * product-drawer.js
 * Product detail slider drawer, glider tabs switcher, product form editor.
 */

function openProductDrawer(p) {
  window.DOM.detailDrawer.dataset.activeId = p.id;

  // Update URL hash for the opened product
  if (typeof window.setProductSheetHash === "function") {
    window.setProductSheetHash("product", p);
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
           window.setProductSheetHash("product", p);
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
      window.setProductSheetHash("product", product);
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

  const setValue = (selector, value) => {
    const el = form.querySelector(selector);
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
  setValue('select[name="brand"]', p.marca || "Generales");
  setValue('select[name="category"]', p.categoriaCodigo || "");
  setValue('input[name="cost"]', p.costo || "");
  setValue('input[name="price"]', p.precio || "");
  setValue('select[name="tax_rate"]', p.tasaImpuesto === "IVA" ? "5" : "");
  setValue('select[name="tax_method"]', p.metodoImpuesto === "Inclusivo" ? "0" : "1");
  setValue('select[name="unit"]', p.unitCode || "");
  setValue('input[name="wh_qty_3"]', p.stock || "");
  setValue('input[name="alert_quantity"]', p.alertaCantidad || "");
  setValue('textarea[name="product_details"]', p.descripcion || "");
  setValue('textarea[name="details"]', p.especificaciones || "");
  setValue('textarea[name="history"]', p.especial3 || "");
  setValue('input[name="cf1"]', p.especial4 || "");
  setValue('input[name="cf2"]', p.especial5 || "");
  setValue('input[name="cf3"]', p.especial6 || "");

  if (p.tipoProducto && window.CSS && CSS.escape) {
    setChecked(`input[name="type"][value="${CSS.escape(p.tipoProducto)}"]`, true);
  }
}

function closeProductFormSheet() {
  window.SheetManager?.close("product-form");
  cleanProductSheetHash();
}
