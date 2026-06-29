/**
 * print-label-sheet.js
 * Barcode label printing presets and sheet UI.
 */

(function () {
  const FIELD_NAME = "print_labels";
  const DEFAULT_PRESET = {
    id: "ribtec-rt-420-be",
    name: "Ribtec RT-420 BE",
    widthMm: 50,
    heightMm: 30,
    copies: 1,
    showName: true,
    showPrice: false,
    barHeight: 70,
    fontSize: 8,
  };

  let activeProduct = null;
  let labelConfig = normalizeConfig(null);
  let configRecord = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function parseJsonField(value, fallback) {
    if (!value) return fallback;
    if (typeof value === "object") return value;
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn("PrintLabelSheet: no se pudo parsear print_labels", error);
      return fallback;
    }
  }

  function slugify(value) {
    return String(value || "preset")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 48) || `preset-${Date.now()}`;
  }

  function toPositiveNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
  }

  function normalizePreset(raw, fallback = DEFAULT_PRESET) {
    const base = raw && typeof raw === "object" ? raw : {};
    const name = String(base.name || base.label || fallback.name).trim() || fallback.name;
    return {
      id: String(base.id || slugify(name)).trim(),
      name,
      widthMm: toPositiveNumber(base.widthMm ?? base.width ?? base.ancho, fallback.widthMm),
      heightMm: toPositiveNumber(base.heightMm ?? base.height ?? base.alto, fallback.heightMm),
      copies: Math.max(1, Math.round(toPositiveNumber(base.copies ?? base.copias, fallback.copies))),
      showName: base.showName == null ? fallback.showName : Boolean(base.showName),
      showPrice: base.showPrice == null ? fallback.showPrice : Boolean(base.showPrice),
      barHeight: toPositiveNumber(base.barHeight ?? base.bar_height ?? base.altura_barra, fallback.barHeight),
      fontSize: toPositiveNumber(base.fontSize ?? base.font_size ?? base.tamano_fuente, fallback.fontSize),
    };
  }

  function normalizeConfig(raw) {
    if (!raw) {
      // First-time initialization
      return {
        version: 1,
        activePresetId: DEFAULT_PRESET.id,
        presets: [{ ...DEFAULT_PRESET }],
        updatedAt: "",
      };
    }

    const source = raw && typeof raw === "object" ? raw : {};
    const rawPresets = Array.isArray(source.presets)
      ? source.presets
      : source && typeof source === "object" && Object.keys(source).length > 0 && !Object.prototype.hasOwnProperty.call(source, "")
        ? Object.values(source)
        : [];

    const presets = rawPresets
      .map((item) => normalizePreset(item))
      .filter((item) => item.id && item.name);

    const activePresetId = presets.some((item) => item.id === source.activePresetId)
      ? source.activePresetId
      : (presets[0]?.id || "");

    return {
      version: 1,
      activePresetId,
      presets,
      updatedAt: source.updatedAt || "",
    };
  }

  function getActivePreset() {
    return labelConfig.presets.find((preset) => preset.id === labelConfig.activePresetId)
      || labelConfig.presets[0]
      || {
        id: "",
        name: "",
        widthMm: 50,
        heightMm: 30,
        copies: 1,
        showName: true,
        showPrice: false,
        barHeight: 70,
        fontSize: 8,
      };
  }

  async function loadConfig() {
    if (window.ProductFormTaxonomy?.load) {
      const taxonomy = await window.ProductFormTaxonomy.load();
      configRecord = taxonomy?.record || null;
      const fields = configRecord?.fields || {};
      labelConfig = normalizeConfig(parseJsonField(
        fields.print_labels || fields.PrintLabels || fields.printLabels || fields["Print Labels"],
        null
      ));
      return labelConfig;
    }

    if (!window.SyncManager?.shumRequest) {
      throw new Error("SyncManager no cargado");
    }

    const result = await window.SyncManager.shumRequest("list", {
      baseId: window.SyncManager.config.baseId,
      table: "configs",
    });
    configRecord = result?.records?.[0] || null;
    const fields = configRecord?.fields || {};
    labelConfig = normalizeConfig(parseJsonField(
      fields.print_labels || fields.PrintLabels || fields.printLabels || fields["Print Labels"],
      null
    ));
    return labelConfig;
  }

  async function saveConfig(nextConfig) {
    if (!window.SyncManager?.shumRequest) {
      throw new Error("SyncManager no cargado");
    }

    const recordId = configRecord?.id;
    if (!recordId) {
      await loadConfig();
    }
    const resolvedRecordId = configRecord?.id;
    if (!resolvedRecordId) throw new Error("No se encontro el registro configs");

    labelConfig = normalizeConfig({
      ...nextConfig,
      updatedAt: new Date().toISOString(),
    });

    const configFields = configRecord?.fields || {};
    const printLabelsFieldName = Object.prototype.hasOwnProperty.call(configFields, "print_labels")
      ? "print_labels"
      : Object.prototype.hasOwnProperty.call(configFields, "PrintLabels")
        ? "PrintLabels"
        : Object.prototype.hasOwnProperty.call(configFields, "printLabels")
          ? "printLabels"
          : Object.prototype.hasOwnProperty.call(configFields, "Print Labels")
            ? "Print Labels"
            : "print_labels";

    await window.SyncManager.shumRequest("update", {
      baseId: window.SyncManager.config.baseId,
      table: "configs",
      recordId: resolvedRecordId,
      data: {
        [printLabelsFieldName]: JSON.stringify(labelConfig),
      },
    });

    await window.ProductFormTaxonomy?.refresh?.();
    return labelConfig;
  }

  function renderChevron() {
    return `
      <svg class="custom-select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    `;
  }

  function renderNativePresetOptions(activeId) {
    return labelConfig.presets.map((preset) => `
      <option value="${escapeHtml(preset.id)}" ${preset.id === activeId ? "selected" : ""}>
        ${escapeHtml(preset.name)}
      </option>
    `).join("");
  }

  function renderPresetOptions(activeId) {
    return labelConfig.presets.map((preset) => `
      <button
        type="button"
        class="custom-select-option ${preset.id === activeId ? "selected" : ""}"
        data-print-label-preset-option="${escapeHtml(preset.id)}"
        data-print-label-preset-name="${escapeHtml(preset.name)}"
      >
        <span>${escapeHtml(preset.name)}</span>
        <small>${escapeHtml(preset.widthMm)} x ${escapeHtml(preset.heightMm)} mm</small>
      </button>
    `).join("") + `
      <div class="custom-select-empty print-label-select__empty" data-print-label-empty hidden>
        Sin coincidencias. Usa + para crear el preset.
      </div>
    `;
  }

  function render(product) {
    const preset = getActivePreset();
    const barcodeSvg = typeof generateBarcodeSVG === "function" ? generateBarcodeSVG(product.codigo || "", preset.barHeight) : "";
    return `
      <form class="print-label-sheet" data-print-label-form>
        <section class="print-label-preview" aria-label="Vista previa de etiqueta">
          <div
            class="print-label-preview__label"
            data-print-label-preview
            style="--label-width-mm:${preset.widthMm};--label-height-mm:${preset.heightMm};"
          >
            <div class="print-label-preview__barcode" data-preview-barcode>${barcodeSvg}</div>
            <strong data-preview-name style="font-size:${preset.fontSize}pt">${escapeHtml(product.nombre || "")}</strong>
            <span data-preview-price class="label-price" style="font-size:${Math.max(preset.fontSize - 1, 5)}pt" ${!preset.showPrice ? "hidden" : ""}>$${Number(product.precio || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </section>

        <div class="field">
          <label>Nombre del preset</label>
          <div class="input-row input-row--action print-label-preset-row">
            <div class="custom-select-wrapper print-label-select" data-print-label-select style="flex: 1; min-width: 0; position: relative;">
              <input type="hidden" name="preset_id" value="${escapeHtml(preset.id)}" />
              <div
                class="custom-select-trigger has-taxonomy-guard-chip"
                role="combobox"
                aria-expanded="false"
                tabindex="0"
                data-print-label-select-trigger
              >
                <input
                  type="text"
                  class="custom-select-input"
                  name="preset_name"
                  value="${escapeHtml(preset.name)}"
                  placeholder="Buscar o crear preset..."
                  autocomplete="off"
                  aria-label="Nombre del preset de etiqueta"
                  data-print-label-preset-search
                />
                ${renderChevron()}
              </div>
              <div class="custom-select-dropdown">
                <div class="custom-select-options">
                  ${renderPresetOptions(preset.id)}
                </div>
              </div>
            </div>
            <button
              class="icon-input-action suffix"
              type="button"
              data-print-label-create
              aria-label="Crear preset"
              title="Crear preset"
            >
              +
            </button>
          </div>
        </div>

        <div class="print-label-section-header">
          <span>Dimensiones</span>
          <div class="print-label-section-divider"></div>
        </div>

        <div class="print-label-grid">
          <label class="field">
            <span>Ancho</span>
            <div class="input-row">
              <input name="width_mm" type="number" min="10" max="110" step="0.1" value="${escapeHtml(preset.widthMm)}" />
              <span class="suffix">mm</span>
            </div>
          </label>
          <label class="field">
            <span>Alto</span>
            <div class="input-row">
              <input name="height_mm" type="number" min="10" max="80" step="0.1" value="${escapeHtml(preset.heightMm)}" />
              <span class="suffix">mm</span>
            </div>
          </label>
        </div>

        <div class="print-label-section-header">
          <span>Código de barras</span>
          <div class="print-label-section-divider"></div>
        </div>

        <div class="print-label-grid">
          <label class="field">
            <span>Altura barras</span>
            <div class="input-row">
              <input name="bar_height" type="number" min="10" max="200" step="1" value="${escapeHtml(preset.barHeight)}" />
              <span class="suffix">px</span>
            </div>
          </label>
        </div>

        <div class="print-label-section-header">
          <span>Texto</span>
          <div class="print-label-section-divider"></div>
        </div>

        <div class="print-label-grid">
          <label class="field">
            <span>Tamaño fuente</span>
            <div class="input-row">
              <input name="font_size" type="number" min="4" max="24" step="0.5" value="${escapeHtml(preset.fontSize)}" />
              <span class="suffix">pt</span>
            </div>
          </label>
          <div class="field print-label-toggles-wrapper">
            <span>Contenido texto</span>
            <div class="print-label-toggles" style="display: flex; gap: 12px; margin-top: 8px;">
              <label style="display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer;">
                <input name="show_name" type="checkbox" ${preset.showName ? "checked" : ""} style="cursor: pointer;" />
                Nombre
              </label>
              <label style="display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer;">
                <input name="show_price" type="checkbox" ${preset.showPrice ? "checked" : ""} style="cursor: pointer;" />
                Precio
              </label>
            </div>
          </div>
        </div>

        <div class="print-label-actions">
          <button type="button" class="btn btn-primary" data-print-label-print>
            <i data-lucide="printer"></i>
            Imprimir
          </button>
        </div>
      </form>
    `;
  }

  function readForm(root) {
    const form = root.querySelector("[data-print-label-form]");
    const currentPreset = getActivePreset();
    const name = form?.querySelector('[name="preset_name"]')?.value.trim() || currentPreset.name;
    const explicitId = form?.querySelector('[name="preset_id"]')?.value.trim() || "";
    return normalizePreset({
      ...currentPreset,
      name,
      id: explicitId || slugify(name),
      widthMm: form?.querySelector('[name="width_mm"]')?.value,
      heightMm: form?.querySelector('[name="height_mm"]')?.value,
      barHeight: form?.querySelector('[name="bar_height"]')?.value,
      fontSize: form?.querySelector('[name="font_size"]')?.value,
      showName: form?.querySelector('[name="show_name"]')?.checked,
      showPrice: form?.querySelector('[name="show_price"]')?.checked,
    });
  }

  function updatePreview(root) {
    const preset = readForm(root);
    const preview = root.querySelector("[data-print-label-preview]");
    if (!preview) return;
    preview.style.setProperty("--label-width-mm", preset.widthMm);
    preview.style.setProperty("--label-height-mm", preset.heightMm);

    const nameEl = preview.querySelector("[data-preview-name]");
    const priceEl = preview.querySelector("[data-preview-price]");
    if (nameEl) {
      nameEl.hidden = !preset.showName;
      nameEl.style.fontSize = preset.fontSize + "pt";
    }
    if (priceEl) {
      priceEl.hidden = !preset.showPrice;
      priceEl.style.fontSize = Math.max(preset.fontSize - 1, 5) + "pt";
    }

    // Regenerate barcode SVG with updated bar height
    if (activeProduct && typeof generateBarcodeSVG === "function") {
      const barcodeContainer = preview.querySelector("[data-preview-barcode]");
      if (barcodeContainer) {
        barcodeContainer.innerHTML = generateBarcodeSVG(activeProduct.codigo || "", preset.barHeight);
      }
    }
  }

  function selectPreset(root, presetId) {
    const preset = labelConfig.presets.find((item) => item.id === presetId);
    if (!preset) return;
    labelConfig.activePresetId = preset.id;
    root.querySelector('[name="preset_id"]').value = preset.id;
    root.querySelector('[name="preset_name"]').value = preset.name;
    root.querySelector('[name="width_mm"]').value = preset.widthMm;
    root.querySelector('[name="height_mm"]').value = preset.heightMm;
    root.querySelector('[name="show_name"]').checked = preset.showName;
    root.querySelector('[name="show_price"]').checked = preset.showPrice;
    root.querySelector('[name="bar_height"]').value = preset.barHeight;
    root.querySelector('[name="font_size"]').value = preset.fontSize;
    const input = root.querySelector(".print-label-select .custom-select-input");
    if (input) input.value = preset.name;
    root.querySelector("[data-print-label-select-trigger]")?.setAttribute("aria-expanded", "false");
    root.querySelectorAll("[data-print-label-preset-option]").forEach((button) => {
      button.classList.toggle("selected", button.dataset.printLabelPresetOption === preset.id);
      button.hidden = false;
    });
    const empty = root.querySelector("[data-print-label-empty]");
    if (empty) empty.hidden = true;
    root.querySelector("[data-print-label-select]")?.classList.remove("is-open");
    updatePreview(root);
  }



  function filterPresetOptions(root) {
    const input = root.querySelector("[data-print-label-preset-search]");
    const query = String(input?.value || "").trim().toLowerCase();
    const options = Array.from(root.querySelectorAll("[data-print-label-preset-option]"));
    let visibleCount = 0;

    options.forEach((button) => {
      const name = String(button.dataset.printLabelPresetName || "").toLowerCase();
      const match = !query || name.includes(query);
      button.hidden = !match;
      if (match) visibleCount += 1;
    });

    const exactMatch = labelConfig.presets.find((preset) => preset.name.toLowerCase() === query);
    const hiddenId = root.querySelector('[name="preset_id"]');
    if (hiddenId) hiddenId.value = exactMatch?.id || "";

    root.querySelectorAll("[data-print-label-preset-option]").forEach((button) => {
      button.classList.toggle("selected", Boolean(exactMatch && button.dataset.printLabelPresetOption === exactMatch.id));
    });

    const empty = root.querySelector("[data-print-label-empty]");
    if (empty) empty.hidden = visibleCount > 0;
  }



  function buildPrintHtml(product, preset) {
    const barcodeSvg = typeof generateBarcodeSVG === "function" ? generateBarcodeSVG(product.codigo || "", preset.barHeight) : "";
    const price = Number(product.precio) || 0;
    const priceHtml = preset.showPrice
      ? `<div class="label-price">$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>`
      : "";
    const labelHtml = `
      <section class="label">
        <div class="barcode">${barcodeSvg}</div>
        ${preset.showName ? `<strong>${escapeHtml(product.nombre || "")}</strong>` : ""}
        ${priceHtml}
      </section>
    `;

    return `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Etiqueta ${escapeHtml(product.codigo || "")}</title>
          <style>
            @page { size: ${preset.widthMm}mm ${preset.heightMm}mm; margin: 0; }
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; background: #fff; }
            body { font-family: Arial, sans-serif; color: #111; }
            .label {
              width: ${preset.widthMm}mm;
              height: ${preset.heightMm}mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              gap: 1mm;
              padding: 2mm;
              page-break-after: always;
              overflow: hidden;
            }
            .barcode { width: 100%; min-height: 0; }
            .barcode svg { width: 100%; height: auto; display: block; box-shadow: none; border-radius: 0; }
            strong {
              max-width: 100%;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              font-size: ${preset.fontSize}pt;
              line-height: 1.1;
            }
            span, .label-price {
              font-size: ${Math.max(preset.fontSize - 1, 5)}pt;
              font-weight: 700;
              line-height: 1;
            }
          </style>
        </head>
        <body>${labelHtml}</body>
      </html>
    `;
  }

  function printCurrentLabel(root) {
    const preset = readForm(root);
    const iframe = document.createElement("iframe");
    iframe.className = "print-label-frame";
    iframe.setAttribute("aria-hidden", "true");
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      iframe.remove();
      throw new Error("No se pudo crear el documento de impresion");
    }

    doc.open();
    doc.write(buildPrintHtml(activeProduct, preset));
    doc.close();

    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      window.setTimeout(() => iframe.remove(), 1000);
    };

    window.setTimeout(() => {
      if (document.body.contains(iframe)) {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        window.setTimeout(() => iframe.remove(), 1000);
      }
    }, 150);
  }

  function hydrateMain(root) {
    const sheet = root._sheetInstance;
    sheet?.hydrateMain(render(activeProduct));
    sheet?.createIcons();
    hydrate(root);
  }

  function hydrate(root) {
    const select = root.querySelector("[data-print-label-select]");
    const trigger = root.querySelector("[data-print-label-select-trigger]");
    const searchInput = root.querySelector("[data-print-label-preset-search]");

    trigger?.addEventListener("click", () => {
      select?.classList.toggle("is-open");
      trigger.setAttribute("aria-expanded", select?.classList.contains("is-open") ? "true" : "false");
      searchInput?.focus();
    });

    trigger?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        trigger.click();
      }
    });

    searchInput?.addEventListener("input", () => {
      select?.classList.add("is-open");
      trigger?.setAttribute("aria-expanded", "true");
      filterPresetOptions(root);
      updatePreview(root);
    });

    searchInput?.addEventListener("focus", () => {
      select?.classList.add("is-open");
      trigger?.setAttribute("aria-expanded", "true");
      filterPresetOptions(root);
    });

    root.querySelectorAll("[data-print-label-preset-option]").forEach((button) => {
      button.addEventListener("click", () => selectPreset(root, button.dataset.printLabelPresetOption));
    });

    root.querySelector("[data-print-label-form]")?.addEventListener("input", () => updatePreview(root));
    root.querySelector("[data-print-label-form]")?.addEventListener("change", () => updatePreview(root));



    root.querySelector("[data-print-label-create]")?.addEventListener("click", () => {
      if (window.ProductFormTaxonomy && typeof window.ProductFormTaxonomy.open === "function") {
        window.ProductFormTaxonomy.open("print-label");
      }
    });

    root.querySelector("[data-print-label-print]")?.addEventListener("click", () => {
      try {
        printCurrentLabel(root);
      } catch (error) {
        console.error("PrintLabelSheet: print failed", error);
        window.showToast?.("No se pudo preparar la impresion.", "danger");
      }
    });

    updatePreview(root);
  }

  function open(product) {
    activeProduct = product;

    const sheet = new window.AppSideSheet({
      id: "print-label-sheet",
      title: "Imprimir etiqueta",
      variant: "side",
      size: "sm",
      hideIsland: true,
      meta: {
        eyebrow: product?.codigo || "Codigo de barras",
        mode: "print-label",
      },
      slots: {
        main: '<div class="print-label-loading">Cargando presets...</div>',
      },
      async onOpen(root, instance) {
        try {
          await loadConfig();
          instance.hydrateMain(render(product));
          instance.createIcons();
          hydrate(root);
        } catch (error) {
          console.error("PrintLabelSheet: load failed", error);
          instance.hydrateMain(`
            <div class="print-label-error">
              No se pudieron cargar los presets de impresion.
              <button type="button" class="btn btn-secondary" data-print-label-retry>Reintentar</button>
            </div>
          `);
          root.querySelector("[data-print-label-retry]")?.addEventListener("click", () => open(product));
          window.showToast?.("No se pudieron cargar presets de etiquetas.", "danger");
        }
      },
    });

    sheet.open();
  }

  window.addEventListener("taxonomy:updated", async (event) => {
    if (event.detail?.type === "print-label" || event.detail?.type === "printer" || event.detail?.type === "print_labels") {
      const root = document.getElementById("print-label-sheet");
      if (!root || root.dataset.sheetState !== "open") return;

      try {
        await loadConfig();
        if (event.detail.selectedKey) {
          const matching = labelConfig.presets.find(p => p.id === event.detail.selectedKey);
          if (matching) {
            labelConfig.activePresetId = matching.id;
          }
        }
        hydrateMain(root);
      } catch (err) {
        console.error("PrintLabelSheet: taxonomy update failed", err);
      }
    }
  });

  window.PrintLabelSheet = {
    open,
    loadConfig,
    saveConfig,
    normalizeConfig,
  };
})();
