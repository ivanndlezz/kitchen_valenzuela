/**
 * product-screen.js
 * Technical sheet detailed layout presentation for standalone single product lookups.
 */

function setupSingleProductUI() {
  const searchInput = document.getElementById("single-product-search");
  const clearBtn = document.getElementById("single-product-clear-btn");

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const sku = searchInput.value.trim();
      loadSingleProduct(sku);
      if (clearBtn) {
        clearBtn.style.display = sku ? "flex" : "none";
      }
    });
  }

  if (clearBtn && searchInput) {
    clearBtn.addEventListener("click", () => {
      searchInput.value = "";
      loadSingleProduct("");
      clearBtn.style.display = "none";
      searchInput.focus();
    });
  }
}

window.renderSingleProductView = function() {
  const searchInput = document.getElementById("single-product-search");
  if (searchInput) {
    loadSingleProduct(searchInput.value.trim());
  }
};

window.loadSingleProduct = function(sku) {
  const container = document.getElementById("single-product-content");
  if (!container) return;

  const clearBtn = document.getElementById("single-product-clear-btn");
  if (clearBtn) {
    clearBtn.style.display = sku ? "flex" : "none";
  }

  if (!sku) {
    container.innerHTML = `
      <div class="single-product-empty">
        <i data-lucide="info" style="width: 48px; height: 48px; color: var(--text-tertiary); margin-bottom: 16px;"></i>
        <p>Ningún producto seleccionado.</p>
        <p class="small">Usa el buscador superior para cargar sus detalles.</p>
      </div>
    `;
    createLucideIcons();
    return;
  }

  const p = window.AppState.products.find(x => x.codigo.toLowerCase() === sku.toLowerCase() || x.id.toLowerCase() === sku.toLowerCase());
  if (!p) {
    container.innerHTML = `
      <div class="single-product-empty">
        <i data-lucide="alert-circle" style="width: 48px; height: 48px; color: var(--color-warning); margin-bottom: 16px;"></i>
        <p>Producto no encontrado</p>
        <p class="small">El SKU "${sku}" no coincide con ningún artículo en el inventario.</p>
      </div>
    `;
    createLucideIcons();
    return;
  }

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

  container.innerHTML = `
    <div class="single-product-view-layout">
      <!-- Panel Izquierdo: Visual & Barcode -->
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div class="drawer__visual" style="border-radius:var(--radius-lg); overflow:hidden;">
          <div class="product-card__image-fallback" style="background: ${catGradient}; padding: 40px; display:flex; justify-content:center; align-items:center;">
            <i data-lucide="${catIcon}" style="width: 72px; height: 72px; color: white;"></i>
          </div>
        </div>
        <div class="drawer__barcode-section" style="padding: 16px; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: white;">
          <div class="drawer__barcode-header">
            <h4>Código de Barras (${(p.barcodeType || "code128").toUpperCase()})</h4>
            <button
              class="drawer__barcode-print-btn"
              type="button"
              data-product-action="print-label"
              title="Imprimir código de barras"
              aria-label="Imprimir código de barras"
            >
              <i data-lucide="printer"></i>
            </button>
          </div>
          <div class="drawer__barcode-container">
            ${barcodeSvg}
          </div>
        </div>
      </div>

      <!-- Panel Derecho: Datos Técnicos -->
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div>
          <div class="drawer__brand" style="font-size:14px; font-weight:700; color:var(--color-accent); text-transform:uppercase;">${p.marca}</div>
          <h3 class="drawer__name" style="font-size:22px; font-weight:800; margin-top:4px;">${p.nombre}</h3>
        </div>

        <div class="drawer__price-card" style="padding: 16px; border-radius: var(--radius-md);">
          <div class="drawer__price-info">
            <span class="product-card__price-label" style="font-size:11px;">Precio al Público</span>
            <span class="drawer__price-amount" style="font-size:24px; font-weight:800;">$${(p.precio || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span class="drawer__cost-amount">Costo Unitario: $${(p.costo || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div>
            <span class="product-card__badge" style="background: ${catGradient}">${p.unitCode}</span>
          </div>
        </div>

        <h4 style="font-size: 12.5px; text-transform: uppercase; letter-spacing:0.05em; color: var(--text-secondary); margin-bottom: 4px; font-weight:700;">Detalles Técnicos</h4>
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

        <div style="display:flex; gap:12px; margin-top:8px;">
          <button class="btn btn-primary" id="btn-single-edit" style="font-size: 12.5px; padding: 8px 16px;">
            <i data-lucide="edit"></i> Editar en Cajón
          </button>
          <button class="btn btn-secondary" id="btn-single-add-quote" style="font-size: 12.5px; padding: 8px 16px;">
            <i data-lucide="file-plus"></i> Cotizar
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById("btn-single-edit").addEventListener("click", () => {
    if (typeof openProductDrawer === "function") openProductDrawer(p);
  });

  document.getElementById("btn-single-add-quote").addEventListener("click", () => {
    if (typeof addToQuote === "function") addToQuote(p);
  });

  container
    .querySelector('[data-product-action="print-label"]')
    ?.addEventListener("click", () => {
      if (!window.PrintLabelSheet?.open) {
        window.showToast?.("Impresión de etiquetas no disponible.", "danger");
        return;
      }
      window.PrintLabelSheet.open(p);
    });

  createLucideIcons();
};
