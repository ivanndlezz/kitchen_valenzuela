/**
 * submitHandler.js — Intercepts form submit, maps inputs to Airtable schema,
 * and calls the SHUM API proxy endpoint.
 *
 * SRP: Dedicated entirely to gathering, mapping, and sending the product form data.
 */

import { CATEGORIES, UNITS } from "./config.js";

export function initSubmitHandler() {
  const form = document.getElementById("pf");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Prevent submitting multiple times
    const submitBtn = document.getElementById("bb-upload") || document.getElementById("btn-submit");
    let originalHtml = "";
    if (submitBtn) {
      submitBtn.disabled = true;
      originalHtml = submitBtn.innerHTML;
      submitBtn.dataset.loading = "true";
    }

    try {
      // Gather mapped data
      const data = gatherFormData();
      const draftId = form.dataset.draftId;
      const existingDraft = draftId && window.AppState?.products
        ? window.AppState.products.find(p => p.id === draftId)
        : null;
      const isExistingProduct = Boolean(existingDraft && !String(existingDraft.id || "").startsWith("draft-"));

      // Dual Save Step 1: Immediate local persistence
      const newLocalProduct = {
        id: existingDraft?.id || data["Código"] || ("manual-" + Date.now()),
        nombre: data["Nombre"] || "Producto sin nombre",
        codigo: data["Código"] || "",
        barcodeType: data["Clase de Código de barras"] || "code128",
        marca: data["Marca"] || "Generales",
        categoriaCodigo: String(data["Código de categoría"] || "other"),
        unitCode: data["unit code"] || "Pieza",
        saleUnitCode: data["Venta unit code"] || data["unit code"] || "Pieza",
        purchaseUnitCode: data["Comprar unit code"] || data["unit code"] || "Pieza",
        costo: Number(data["Costo"]) || 0,
        precio: Number(data["Precio"]) || 0,
        alertaCantidad: Number(data["Cantidad de alerta"]) || 0,
        tasaImpuesto: data["Tasa de impuestos"] || "IVA",
        metodoImpuesto: data["Método de impuestos"] || "Exclusivo",
        imagen: data["Imagen"] || "no_image.png",
        weight: Number(data.weight) || 0,
        length: Number(data.length) || 0,
        width: Number(data.width) || 0,
        height: Number(data.height) || 0,
        descripcion: data["Producto de campo personalizado 1"] || "",
        especificaciones: data["Producto Campo Personalizadoo 2"] || "",
        especial3: data["Producto Campo Personalizadoo 3"] || "",
        especial4: data["cf1_data"] || "",
        especial5: data["cf2_data"] || "",
        especial6: data["cf3_data"] || "",
        customFields: getCustomFieldsFromData(data),
        cf1_name: data["cf1_name"] || "",
        cf1_data: data["cf1_data"] || "",
        cf2_name: data["cf2_name"] || "",
        cf2_data: data["cf2_data"] || "",
        cf3_name: data["cf3_name"] || "",
        cf3_data: data["cf3_data"] || "",
        cf4_name: data["cf4_name"] || "",
        cf4_data: data["cf4_data"] || "",
        cf5_name: data["cf5_name"] || "",
        cf5_data: data["cf5_data"] || "",
        cf6_name: data["cf6_name"] || "",
        cf6_data: data["cf6_data"] || "",
        stock: Number(data["Cantidad"]) || 0,
        warehouseStock: getWarehouseStockMap(),
        airtable_id: existingDraft?.airtable_id || null,
        status: isExistingProduct ? (existingDraft?.status || "published") : "draft",
        sync_status: isExistingProduct ? "dirty" : "draft",
        createdAt: existingDraft?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (!window.AppState) window.AppState = {};
      if (!window.AppState.products) window.AppState.products = [];

      const existingIdx = window.AppState.products.findIndex(p => {
        if (draftId) return p.id === draftId;
        return newLocalProduct.codigo && p.codigo === newLocalProduct.codigo;
      });
      if (existingIdx !== -1) {
        window.AppState.products[existingIdx] = newLocalProduct;
      } else {
        window.AppState.products.push(newLocalProduct);
      }

      if (typeof window.saveProductsToStorage === "function") {
        window.saveProductsToStorage();
      } else {
        localStorage.setItem("kv-catalog-products", JSON.stringify(window.AppState.products));
      }

      // Show success toast for local save
      if (typeof window.showToast === "function") {
        window.showToast(isExistingProduct ? "Cambios guardados localmente" : "Borrador guardado localmente", "info");
      }

      // Dual Save Step 2: create or patch Airtable
      if (!window.SyncManager?.syncProduct) {
        throw new Error("SyncManager no está disponible para guardar productos");
      }
      await window.SyncManager.syncProduct(newLocalProduct);

      // Update sync status on success
      const p = window.AppState.products.find(x => x.id === newLocalProduct.id || (newLocalProduct.codigo && x.codigo === newLocalProduct.codigo));
      if (p) {
        if (newLocalProduct.airtable_id) {
          p.airtable_id = newLocalProduct.airtable_id;
        }
        p.status = isExistingProduct ? (p.status || "published") : "published";
        p.sync_status = "synced";
        p.updatedAt = new Date().toISOString();
        if (typeof window.saveProductsToStorage === "function") {
          window.saveProductsToStorage();
        } else {
          localStorage.setItem("kv-catalog-products", JSON.stringify(window.AppState.products));
        }
      }

      // Show success toast for cloud upload
      if (typeof window.showToast === "function") {
        window.showToast(isExistingProduct ? "Producto actualizado exitosamente" : "Producto guardado exitosamente 🎉", "success");
      } else {
        alert(isExistingProduct ? "Producto actualizado exitosamente." : "Producto guardado exitosamente.");
      }

      if (isExistingProduct) {
        window.ProductFormUpdateState?.captureBaseline?.(p || newLocalProduct);
      } else {
        // Reset form inputs
        form.reset();
        window.ProductFormCustomFields?.reset();
        delete form.dataset.draftId;
      }
      
      // Reset steps and UI
      const { clearAllDone } = await import("./state.js");
      const { syncPills } = await import("./stepPills.js");
      const { goToStep } = await import("./accordion.js");
      const { exitReviewMode } = await import("./review.js");
      
      clearAllDone();
      syncPills();
      
      // If we are in review mode (step 9), exit it
      const { isInReview } = await import("./state.js");
      if (isInReview()) {
        exitReviewMode();
      }
      
      if (!isExistingProduct) {
        goToStep(1);
      }

      // Close the side sheet
      if (typeof window.closeProductFormSheet === "function") {
        window.closeProductFormSheet();
      } else {
        const sheet = document.getElementById("product-form-sheet");
        if (sheet) sheet.classList.remove("drawer__sheet--active");
        const scrim = document.getElementById("scrim") || window.DOM?.scrim;
        if (scrim) scrim.classList.remove("drawer__scrim--active");
      }

    } catch (error) {
      console.error("Error submitting form:", error);
      if (typeof window.showToast === "function") {
        window.showToast("Error al guardar en la nube (se mantiene local): " + error.message, "danger");
      } else {
        alert("Error al guardar en la nube (se mantiene local): " + error.message);
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        delete submitBtn.dataset.loading;
        submitBtn.innerHTML = originalHtml || "Cargar producto";
      }
    }
  });
}

function gatherFormData() {
  const getVal = (selector) => {
    const el = document.querySelector(selector);
    return el ? el.value.trim() : "";
  };

  const getNum = (selector) => {
    const val = getVal(selector);
    return val ? Number(val) : 0;
  };

  const getBool = (selector) => {
    const el = document.querySelector(selector);
    return el ? el.checked : false;
  };

  const getSelectText = (selector) => {
    const el = document.querySelector(selector);
    if (!el || el.selectedIndex === -1) return "";
    const opt = el.options[el.selectedIndex];
    return opt.value ? opt.textContent.trim() : "";
  };

  const getProductType = () => {
    const checked = document.querySelector('input[name="type"]:checked') || document.querySelector('input[name="qf_type"]:checked');
    return checked ? checked.value : "standard";
  };

  // Category mapping
  const categoryValue = getVal('select[name="category"]') || getVal('#qf-cat');
  const categoryName = categoryValue ? (CATEGORIES[categoryValue]?.name || "") : "";
  
  // Unit mapping
  const unitValue = getVal('select[name="unit"]') || getVal('#qf-unit');
  const unitName = unitValue ? (UNITS[unitValue] || "") : "";
  const saleUnitName = getSelectText("#u-sale") || unitName;
  const purchaseUnitName = getSelectText("#u-purch") || unitName;

  // Stock quantities sum
  const stockSum = getWarehouseStockTotal();

  // File main image filename
  const imgInput = document.querySelector('input[name="product_image"]');
  const imgFilename = imgInput?.files?.[0]?.name || "no_image.png";

  const transferCost = getNum('input[name="CostoEnvio"]');

  return {
    "Nombre": getVal('input[name="name"]') || getVal('#qf-name'),
    "Nombre secundario": getVal('input[name="second_name"]'),
    "Código": getVal('input[name="code"]') || getVal('#qf-code'),
    "Clase de Código de barras": getVal('select[name="barcode_symbology"]') || "code128",
    "Marca": getVal('select[name="brand"]') || "Generales",
    
    "Código de categoría": categoryValue ? Number(categoryValue) : 0,
    "Categoria": categoryName,
    
    "Costo": getNum('input[name="cost"]') || getNum('#qf-cost'),
    "Precio": getNum('input[name="price"]') || getNum('#qf-price'),
    "Tasa de impuestos": getVal('select[name="tax_rate"]') === "5" ? "IVA" : null,
    "Método de impuestos": getVal('select[name="tax_method"]') === "0" ? "Inclusivo" : "Exclusivo",
    
    "Precio de promocion": getBool("#sw-promo"),
    "precio_promo": getNum('input[name="promo_price"]'),
    "promo_desde": getVal('input[name="start_date"]') || null,
    "promo_hasta": getVal('input[name="end_date"]') || null,
    
    "unit code": unitName,
    "Venta unit code": saleUnitName,
    "Comprar unit code": purchaseUnitName,
    
    "Cantidad": stockSum,
    "Cantidad de alerta": getNum('input[name="alert_quantity"]'),
    weight: getNum('input[name="weight"]'),
    length: getNum('input[name="length"]'),
    width: getNum('input[name="width"]'),
    height: getNum('input[name="height"]'),
    
    "traslado": transferCost || null,
    
    "Producto Campo Personalizadoo 2": getVal('textarea[name="details"]'),
    "Producto Campo Personalizadoo 3": getVal('textarea[name="history"]'),
    
    "Imagen": imgFilename,
    
    "Tipo de producto": getProductType(),
    "Clave Unidad": getVal('input[name="claveUnidad"]'),
    "Clave Prod": getVal('input[name="claveProdServ"]'),
    
    "Producto Campo Personalizadoo 4": getVal('input[name="cf1_data"]'),
    "Producto Campo Personalizadoo 5": getVal('input[name="cf2_data"]'),
    "Producto Campo Personalizadoo 6": getVal('input[name="cf3_data"]'),
    "cf1_name": getVal('input[name="cf1_name"]'), "cf1_data": getVal('input[name="cf1_data"]'),
    "cf2_name": getVal('input[name="cf2_name"]'), "cf2_data": getVal('input[name="cf2_data"]'),
    "cf3_name": getVal('input[name="cf3_name"]'), "cf3_data": getVal('input[name="cf3_data"]'),
    "cf4_name": getVal('input[name="cf4_name"]'), "cf4_data": getVal('input[name="cf4_data"]'),
    "cf5_name": getVal('input[name="cf5_name"]'), "cf5_data": getVal('input[name="cf5_data"]'),
    "cf6_name": getVal('input[name="cf6_name"]'), "cf6_data": getVal('input[name="cf6_data"]'),
  };
}

function getWarehouseStockTotal() {
  return Array.from(document.querySelectorAll('#pf input[name^="wh_qty_"]'))
    .reduce((sum, input) => sum + (Number(input.value) || 0), 0);
}

function getWarehouseStockMap() {
  return Object.fromEntries(
    Array.from(document.querySelectorAll('#pf input[name^="wh_qty_"]')).map((input) => [
      input.name.replace(/^wh_qty_/, ""),
      Number(input.value) || 0,
    ])
  );
}

function getCustomFieldsFromData(data) {
  return [1, 2, 3, 4, 5, 6]
    .map((n) => ({
      name: data[`cf${n}_name`] || "",
      value: data[`cf${n}_data`] || "",
    }))
    .filter((field) => field.name || field.value);
}
