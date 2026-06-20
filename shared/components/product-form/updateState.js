/**
 * updateState.js — Product form create/update state helpers.
 *
 * Keeps the edit-mode labels and dirty indicator in sync without coupling the
 * bottom bar to inventory storage internals.
 */

const EDIT_LABEL = "Actualizar producto";
const CREATE_LABEL = "Cargar producto";

let baseline = "";

const FIELD_TRACKERS = [
  { key: "nombre", selector: 'input[name="name"]', step: 1 },
  { key: "codigo", selector: 'input[name="code"]', step: 1 },
  { key: "barcodeType", selector: 'select[name="barcode_symbology"]', step: 1 },
  { key: "categoriaCodigo", selector: 'select[name="category"]', step: 2 },
  { key: "marca", selector: 'select[name="brand"]', step: 2 },
  { key: "costo", selector: 'input[name="cost"]', step: 3 },
  { key: "precio", selector: 'input[name="price"]', step: 3 },
  { key: "tasaImpuesto", selector: 'select[name="tax_rate"]', step: 3 },
  { key: "metodoImpuesto", selector: 'select[name="tax_method"]', step: 3 },
  { key: "unitCode", selector: 'select[name="unit"]', step: 4 },
  { key: "alertaCantidad", selector: 'input[name="alert_quantity"]', step: 4 },
  { key: "weight", selector: 'input[name="weight"]', step: 5 },
  { key: "length", selector: 'input[name="length"]', step: 5 },
  { key: "width", selector: 'input[name="width"]', step: 5 },
  { key: "height", selector: 'input[name="height"]', step: 5 },
  { key: "supplier", selector: 'select[name="supplier"]', step: 5 },
  { key: "supplier_part_no", selector: 'input[name="supplier_part_no"]', step: 5 },
  { key: "supplier_price", selector: 'input[name="supplier_price"]', step: 5 },
  { key: "descripcion", selector: 'textarea[name="product_details"]', step: 6 },
  { key: "especificaciones", selector: 'textarea[name="details"]', step: 6 },
  { key: "especial3", selector: 'textarea[name="history"]', step: 6 },
];

export function initUpdateState() {
  const form = document.getElementById("pf");
  if (!form || form.dataset.updateStateReady === "true") return;

  form.dataset.updateStateReady = "true";
  form.addEventListener("input", syncProductUpdateState);
  form.addEventListener("change", syncProductUpdateState);
  document.addEventListener("stepChange", syncProductUpdateState);
  syncProductUpdateState();
}

export function isExistingProductContext(form = document.getElementById("pf")) {
  const id = form?.dataset.draftId || window.__currentProductId || "";
  return Boolean(id && !String(id).startsWith("draft-"));
}

export function captureProductBaseline(product = null) {
  baseline = JSON.stringify(normalizeProduct(product));
  syncProductUpdateState();
}

export function syncProductUpdateState() {
  const form = document.getElementById("pf");
  const isExisting = isExistingProductContext(form);
  const uploadBtn = document.getElementById("bb-upload");

  if (uploadBtn) {
    uploadBtn.textContent = isExisting ? EDIT_LABEL : CREATE_LABEL;
  }

  document.querySelectorAll(".btn-done").forEach((button) => {
    button.textContent = isExisting ? "Actualizar" : "Marcar como completo";
    button.dataset.productAction = isExisting ? "update" : "complete";
  });

  if (!isExisting) {
    clearDirtyMarkers();
    return;
  }

  renderDirtyMarkers(form);
}

export function hasUnsavedChanges(form = document.getElementById("pf")) {
  if (!isExistingProductContext(form)) return false;
  return JSON.stringify(readFormSnapshot(form)) !== baseline;
}

function readFormSnapshot(form) {
  if (!form) return {};
  const get = (selector) => form.querySelector(selector)?.value?.trim() || "";
  const getChecked = (selector) => Boolean(form.querySelector(selector)?.checked);

  return normalizeProduct({
    nombre: get('input[name="name"]'),
    codigo: get('input[name="code"]'),
    barcodeType: get('select[name="barcode_symbology"]') || "code128",
    marca: get('select[name="brand"]'),
    categoriaCodigo: get('select[name="category"]'),
    unitCode: get('select[name="unit"]'),
    costo: get('input[name="cost"]'),
    precio: get('input[name="price"]'),
    alertaCantidad: get('input[name="alert_quantity"]'),
    tasaImpuesto: get('select[name="tax_rate"]'),
    metodoImpuesto: get('select[name="tax_method"]'),
    descripcion: get('textarea[name="product_details"]'),
    weight: get('input[name="weight"]'),
    length: get('input[name="length"]'),
    width: get('input[name="width"]'),
    height: get('input[name="height"]'),
    especificaciones: get('textarea[name="details"]'),
    especial3: get('textarea[name="history"]'),
    customFields: window.ProductFormCustomFields?.getFields?.() || [],
    supplier: get('select[name="supplier"]'),
    supplier_part_no: get('input[name="supplier_part_no"]'),
    supplier_price: get('input[name="supplier_price"]'),
    stock: getWarehouseStockTotal(form),
    tipoProducto: form.querySelector('input[name="type"]:checked')?.value || "standard",
    trackStock: getChecked('input[name="track_stock"]'),
  });
}

function normalizeProduct(product = {}) {
  const fields = Array.isArray(product.customFields)
    ? product.customFields
    : [1, 2, 3, 4, 5, 6].map((n) => ({
        name: product[`cf${n}_name`] || "",
        value: product[`cf${n}_data`] || "",
      }));

  return {
    nombre: String(product.nombre || "").trim(),
    codigo: String(product.codigo || "").trim(),
    barcodeType: String(product.barcodeType || "code128").trim(),
    marca: String(product.marca || "").trim(),
    categoriaCodigo: normalizeCategoryValue(product.categoriaCodigo),
    unitCode: normalizeUnitValue(product.unitCode),
    costo: Number(product.costo) || 0,
    precio: Number(product.precio) || 0,
    alertaCantidad: Number(product.alertaCantidad) || 0,
    tasaImpuesto: String(product.tasaImpuesto || "").trim(),
    metodoImpuesto: String(product.metodoImpuesto || "").trim(),
    descripcion: String(product.descripcion || "").trim(),
    weight: Number(product.weight) || 0,
    length: Number(product.length) || 0,
    width: Number(product.width) || 0,
    height: Number(product.height) || 0,
    especificaciones: String(product.especificaciones || "").trim(),
    especial3: String(product.especial3 || "").trim(),
    customFields: fields
      .map((field) => ({
        name: String(field.name || field.label || "").trim(),
        value: String(field.value || field.data || "").trim(),
      }))
      .filter((field) => field.name || field.value),
    supplier: String(product.supplier || "").trim(),
    supplier_part_no: String(product.supplier_part_no || "").trim(),
    supplier_price: Number(product.supplier_price) || 0,
    stock: Number(product.stock) || 0,
    tipoProducto: String(product.tipoProducto || "standard").trim(),
    trackStock: Boolean(product.trackStock),
  };
}

function renderDirtyMarkers(form) {
  const baselineProduct = parseBaseline();
  const currentProduct = readFormSnapshot(form);
  const dirtySteps = new Set();

  clearDirtyMarkers();

  FIELD_TRACKERS.forEach((tracker) => {
    if (isSameValue(currentProduct[tracker.key], baselineProduct[tracker.key])) return;
    dirtySteps.add(tracker.step);
    markField(form, tracker.selector);
  });

  if (!isSameValue(currentProduct.stock, baselineProduct.stock)) {
    dirtySteps.add(4);
    form.querySelectorAll('input[name^="wh_qty_"]').forEach((input) => {
      markControl(input);
    });
  }

  if (!isSameValue(currentProduct.customFields, baselineProduct.customFields)) {
    dirtySteps.add(8);
    document.querySelector("[data-custom-fields-root]")?.classList.add("has-unsaved-changes");
  }

  dirtySteps.forEach(markStep);
}

function clearDirtyMarkers() {
  document.querySelectorAll("[data-product-save-status]").forEach((status) => status.remove());
  document.querySelectorAll(".step.has-unsaved-changes").forEach((step) => {
    step.classList.remove("has-unsaved-changes");
    step.querySelector("[data-step-save-status]")?.remove();
  });
  document.querySelectorAll(".field.has-unsaved-changes, .custom-fields.has-unsaved-changes").forEach((field) => {
    field.classList.remove("has-unsaved-changes");
  });
  document.querySelectorAll(".has-unsaved-control").forEach((control) => {
    control.classList.remove("has-unsaved-control");
  });
}

function markStep(stepNumber) {
  const step = document.querySelector(`.step-header[data-step="${stepNumber}"]`)?.closest(".step");
  const title = step?.querySelector(".step-title");
  if (!step || !title) return;

  step.classList.add("has-unsaved-changes");
  if (title.querySelector("[data-step-save-status]")) return;

  const status = document.createElement("span");
  status.className = "step-save-status";
  status.dataset.stepSaveStatus = "";
  status.textContent = "Cambios sin guardar";
  title.append(status);
}

function markField(form, selector) {
  const control = form?.querySelector(selector);
  if (!control) return;

  markControl(control);
}

function markControl(control) {
  control.closest(".field")?.classList.add("has-unsaved-changes");
  getVisualControl(control).classList.add("has-unsaved-control");
}

function getWarehouseStockTotal(form) {
  return Array.from(form?.querySelectorAll('input[name^="wh_qty_"]') || [])
    .reduce((sum, input) => sum + (Number(input.value) || 0), 0);
}

function getVisualControl(control) {
  return (
    control.closest(".input-row--action") ||
    control.closest(".input-row") ||
    control.closest(".custom-select-wrapper")?.querySelector(".custom-select-trigger") ||
    control
  );
}

function parseBaseline() {
  try {
    return JSON.parse(baseline || "{}");
  } catch {
    return {};
  }
}

function isSameValue(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

function normalizeCategoryValue(value) {
  const raw = String(value || "").trim();
  const alias = window.TaxonomyReconciliation?.resolveAlias?.("categories", raw);
  if (alias) return alias;
  if ((window.ProductFormConfig || {}).CATEGORIES?.[raw]) return raw;
  return raw;
}

function normalizeUnitValue(value) {
  const original = String(value || "").trim();
  const alias = window.TaxonomyReconciliation?.resolveAlias?.("units", original);
  if (alias) return alias;
  if (Object.prototype.hasOwnProperty.call((window.ProductFormConfig || {}).UNITS || {}, original)) return original;
  return original;
}

window.ProductFormUpdateState = Object.assign(window.ProductFormUpdateState || {}, {
  captureBaseline: captureProductBaseline,
  hasUnsavedChanges,
  isExistingProductContext,
  sync: syncProductUpdateState,
});
