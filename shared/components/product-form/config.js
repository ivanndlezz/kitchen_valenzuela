/**
 * config.js — Single Source of Truth for all static application data.
 * No logic, no side-effects. Import and read; never mutate at runtime.
 */

export const PRODUCT_TYPES = {
  standard: "Estándar",
  combo:    "Combo",
  // digital: "Digital",
  service:  "Servicio",
};

export const CATEGORIES = {
  38: { name: "Consumibles",          subcategories: ["Detergentes", "Desinfectantes", "Químicos especiales", "Aceites"] },
  29: { name: "Equipos",              subcategories: ["Hornos", "Refrigeración", "Cocción", "Lavado industrial"] },
  39: { name: "Refacciones",          subcategories: ["Quemadores", "Válvulas", "Empaques", "Motores", "Termostatos"] },
  42: { name: "Servicios",            subcategories: ["Instalación", "Mantenimiento", "Reparación", "Capacitación"] },
  41: { name: "Utensilios y accesorios", subcategories: ["Utensilios", "Acero inoxidable", "Moldes", "Herramientas"] },
  43: { name: "Inoxidables",          subcategories: [] },
};

export const BARCODE_SYMBOLOGIES = {
  code128: "Code128 — recomendado",
  ean13:   "EAN13",
  ean8:    "EAN8",
  upca:    "UPC-A",
  code39:  "Code39",
};

export const BRANDS = [
  "Generales", "robertshaw", "RATIONAL", "VULCAN", "TRUE",
  "UNOX", "Fast Clean", "HOBART", "DORMONT", "ASBER",
  "MANITOWOC", "HOSHIZAKI",
];

export const TAX_RATES = {
  "":  "Sin impuesto",
  "5": "IVA 16%",
};

export const TAX_METHODS = {
  "1": "Exclusivo",
  "0": "Inclusivo",
};

export const UNITS = {
  3: "Metro (Mt)",
  4: "Pieza (Pz)",
  5: "Centímetro (Cm)",
  6: "Litro (Lt)",
  7: "Galón (Gal)",
};

export const SHIPPING_TYPES = {
  "":  "Seleccionar",
  "1": "Gratis",
  "2": "Con costo",
  "3": "Acordado",
};

export const SUPPLIERS = {
  "": "Sin proveedor",
};

/** Ordered step definitions — single source for titles, ids, and review spec. */
export const STEPS = [
  {
    num: 1,
    title: "Producto",
    reviewFields: [
      { label: "Tipo de producto", selector: null, key: "productType" },
      { label: "Nombre",           selector: "#f-name",                    required: true },
      { label: "Código",           selector: "#f-code",                    required: true },
      { label: "Simbología",       selector: 'select[name="barcode_symbology"]' },
    ],
  },
  {
    num: 2,
    title: "Clasificación",
    reviewFields: [
      { label: "Categoría",    selector: "#f-cat",               required: true },
      { label: "Subcategoría", selector: "#f-subcat" },
      { label: "Marca",        selector: 'select[name="brand"]' },
    ],
  },
  {
    num: 3,
    title: "Precios",
    reviewFields: [
      { label: "Costo",            selector: 'input[name="cost"]',      required: true, prefix: "$" },
      { label: "Precio de venta",  selector: "#f-price",                required: true, prefix: "$" },
      { label: "Impuesto",         selector: 'select[name="tax_rate"]' },
      { label: "Método",           selector: 'select[name="tax_method"]' },
    ],
  },
  {
    num: 4,
    title: "Inventario",
    reviewFields: [
      { label: "Unidad principal", selector: 'select[name="unit"]', required: true },
      { label: "Unidad de venta",  selector: "#u-sale" },
      { label: "Unidad de compra", selector: "#u-purch" },
      { label: "Controlar stock",  selector: 'input[name="track_stock"]', type: "checkbox" },
      { label: "Alerta stock mín.", selector: 'input[name="alert_min"]' },
    ],
  },
  {
    num: 5,
    title: "Logística",
    reviewFields: [
      { label: "Peso",          selector: 'input[name="weight"]' },
      { label: "Dimensiones",   selector: null, key: "dimensions" },
      { label: "Tipo de envío", selector: 'select[name="tipoEnvio"]' },
      { label: "Costo de envío", selector: 'input[name="shipping_cost"]', prefix: "$" },
    ],
  },
  {
    num: 6,
    title: "Contenido",
    reviewFields: [
      { label: "Resumen",     selector: 'textarea[name="excerpt"]' },
      { label: "Descripción", selector: 'textarea[name="description"]' },
    ],
  },
  {
    num: 7,
    title: "Medios y Visibilidad",
    reviewFields: [
      { label: "Imagen principal", selector: null, key: "mainImage" },
      { label: "Galería",          selector: null, key: "gallery" },
      { label: "Mostrar en inicio", selector: 'input[name="featured"]', type: "checkbox" },
      { label: "Ocultar en POS",    selector: 'input[name="hide_pos"]', type: "checkbox" },
      { label: "Ocultar en tienda", selector: 'input[name="hide"]',     type: "checkbox" },
    ],
  },
  {
    num: 8,
    title: "Campos personalizados",
    reviewFields: [1, 2, 3, 4, 5, 6].map(n => ({
      label:    `Campo ${n} (cf${n})`,
      selector: `input[name="cf${n}"]`,
    })),
  },
];

export const TOTAL_STEPS = STEPS.length;

/** Quick-form ↔ main-form field mapping (DRY: one definition used by both sync directions). */
export const QF_FIELD_MAP = [
  { qfId: "qf-name",  mainSelector: "#f-name" },
  { qfId: "qf-code",  mainSelector: "#f-code" },
  { qfId: "qf-cat",   mainSelector: "#f-cat" },
  { qfId: "qf-cost",  mainSelector: 'input[name="cost"]' },
  { qfId: "qf-price", mainSelector: "#f-price" },
  { qfId: "qf-unit",  mainSelector: 'select[name="unit"]' },
];
