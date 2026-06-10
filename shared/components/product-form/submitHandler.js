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
      submitBtn.innerHTML = "Guardando...";
    }

    try {
      // Gather mapped data
      const data = gatherFormData();
      const draftId = form.dataset.draftId;
      const existingDraft = draftId && window.AppState?.products
        ? window.AppState.products.find(p => p.id === draftId)
        : null;

      // Dual Save Step 1: Immediate local persistence
      const newLocalProduct = {
        id: existingDraft?.id || data["Código"] || ("manual-" + Date.now()),
        nombre: data["Nombre"] || "Producto sin nombre",
        codigo: data["Código"] || "",
        barcodeType: data["Clase de Código de barras"] || "code128",
        marca: data["Marca"] || "Generales",
        categoriaCodigo: String(data["Código de categoría"] || "other"),
        unitCode: data["unit code"] || "Pieza",
        costo: Number(data["Costo"]) || 0,
        precio: Number(data["Precio"]) || 0,
        alertaCantidad: Number(data["Cantidad de alerta"]) || 0,
        tasaImpuesto: data["Tasa de impuestos"] || "IVA",
        metodoImpuesto: data["Método de impuestos"] || "Exclusivo",
        imagen: data["Imagen"] || "no_image.png",
        descripcion: data["Producto de campo personalizado 1"] || "",
        especificaciones: data["Producto Campo Personalizadoo 2"] || "",
        especial3: data["Producto Campo Personalizadoo 3"] || "",
        especial4: data["Producto Campo Personalizadoo 4"] || "",
        especial5: data["Producto Campo Personalizadoo 5"] || "",
        especial6: data["Producto Campo Personalizadoo 6"] || "",
        stock: Number(data["Cantidad"]) || 0,
        airtable_id: existingDraft?.airtable_id || null,
        status: "draft",
        sync_status: "draft",
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
        window.showToast("Borrador guardado localmente", "info");
      }

      // Dual Save Step 2: Upload to Airtable
      const response = await fetch("https://klef.newfacecards.com/shum-api/api.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          baseId: "apppjeEy9lY65U4On", // Products Base
          table: "products",         // Products Table
          data: data
        })
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "API request failed");
      }

      // Update sync status on success
      const createdRecord = result.data?.records?.[0];
      const p = window.AppState.products.find(x => x.id === newLocalProduct.id || (newLocalProduct.codigo && x.codigo === newLocalProduct.codigo));
      if (p) {
        if (createdRecord && createdRecord.id) {
          p.airtable_id = createdRecord.id;
        }
        p.status = "published";
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
        window.showToast("Producto guardado exitosamente en Airtable 🎉", "success");
      } else {
        alert("Producto guardado exitosamente en Airtable.");
      }

      // Reset form inputs
      form.reset();
      delete form.dataset.draftId;
      
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
      
      goToStep(1);

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
  const wh3Qty = getNum('input[name="wh_qty_3"]');
  const wh4Qty = getNum('input[name="wh_qty_4"]');
  const stockSum = wh3Qty + wh4Qty;

  // File main image filename
  const imgInput = document.querySelector('input[name="product_image"]');
  const imgFilename = imgInput?.files?.[0]?.name || "no_image.png";

  // Shipping mapping
  const shippingVal = getNum('select[name="tipoEnvio"]');

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
    
    "envio_recepcion": shippingVal ? shippingVal : null,
    
    "Producto de campo personalizado 1": getVal('textarea[name="product_details"]'),
    "Producto Campo Personalizadoo 2": getVal('textarea[name="details"]'),
    "Producto Campo Personalizadoo 3": getVal('textarea[name="history"]'),
    
    "Imagen": imgFilename,
    "Mostrar en página de inicio": getBool('input[name="featured"]'),
    "Ocultar en POS": getBool('input[name="hide_pos"]'),
    "Ocultar en tienda": getBool('input[name="hide"]'),
    
    "Tipo de producto": getProductType(),
    "Clave Unidad": getVal('input[name="claveUnidad"]'),
    "Clave Prod": getVal('input[name="claveProdServ"]'),
    
    // Custom fields mapping
    "Producto Campo Personalizadoo 4": getVal('input[name="cf1"]'),
    "Producto Campo Personalizadoo 5": getVal('input[name="cf2"]'),
    "Producto Campo Personalizadoo 6": getVal('input[name="cf3"]'),
    "cf1_name": "cf1", "cf1_data": getVal('input[name="cf1"]'),
    "cf2_name": "cf2", "cf2_data": getVal('input[name="cf2"]'),
    "cf3_name": "cf3", "cf3_data": getVal('input[name="cf3"]'),
    "cf4_name": "cf4", "cf4_data": getVal('input[name="cf4"]'),
    "cf5_name": "cf5", "cf5_data": getVal('input[name="cf5"]'),
    "cf6_name": "cf6", "cf6_data": getVal('input[name="cf6"]'),
  };
}
