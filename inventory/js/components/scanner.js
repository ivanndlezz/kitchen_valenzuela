/**
 * scanner.js
 * HTML5 Barcode/QR camera scanner and image file upload processing.
 */

let html5QrcodeScanner = null;
const QR_READER_ID = "reader";

function setupScannerLogic() {
  // Close modal triggers
  window.DOM.scannerCloseBtn.addEventListener("click", closeScanner);

  // Tab Switches
  window.DOM.scannerTabsContainer.querySelectorAll(".scanner__tab").forEach(tab => {
    tab.addEventListener("click", () => {
      window.DOM.scannerTabsContainer.querySelectorAll(".scanner__tab").forEach(t => {
        t.classList.remove("scanner__tab--active");
      });
      tab.classList.add("scanner__tab--active");
      const activeTab = tab.dataset.scannerTab;
      window.AppState.activeScannerTab = activeTab;

      // Toggle panels
      window.DOM.scannerModal.querySelectorAll("[data-scanner-panel]").forEach(panel => {
        panel.classList.toggle("scanner__panel--active", panel.dataset.scannerPanel === activeTab);
      });

      // Stop video if switching to photo tab
      if (activeTab === "photo") {
        stopVideoCapture();
      }
    });
  });

  // Trigger Upload Button (System Photo Mode)
  window.DOM.triggerPhotoBtn.addEventListener("click", () => {
    window.DOM.cameraInput.click();
  });

  window.DOM.cameraInput.addEventListener("change", handlePhotoUpload);

  // Video Streaming camera controllers
  window.DOM.startVideoBtn.addEventListener("click", startVideoCapture);
  window.DOM.stopVideoBtn.addEventListener("click", stopVideoCapture);
}

function openScanner() {
  window.DOM.scannerModal.classList.add("scanner-modal--active");
  window.DOM.scrim.classList.add("drawer__scrim--active");
  
  // Default to photo tab on open
  window.DOM.scannerTabsContainer.querySelector('[data-scanner-tab="photo"]').click();
}

function closeScanner() {
  stopVideoCapture();
  window.DOM.scannerModal.classList.remove("scanner-modal--active");
  if (!window.DOM.detailDrawer.classList.contains("drawer__sheet--active")) {
    window.DOM.scrim.classList.remove("drawer__scrim--active");
  }
}

// Photo Scan Processing
async function handlePhotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  window.DOM.triggerPhotoBtn.disabled = true;
  window.DOM.triggerPhotoBtn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> Procesando...';
  createLucideIcons();

  try {
    const code = await scanImageFile(file);
    showToast(`Código detectado: ${code}`, "success");
    registerOrOpenScannedCode(code);
  } catch (err) {
    console.warn("Scan failed:", err);
    showToast(err.message || "No se detectó ningún código QR o de barras.", "warning");
  } finally {
    window.DOM.triggerPhotoBtn.disabled = false;
    window.DOM.triggerPhotoBtn.innerHTML = '<i data-lucide="camera"></i> Tomar Foto';
    createLucideIcons();
    event.target.value = ""; // clean file input
  }
}

function scanImageFile(file) {
  return new Promise(async (resolve, reject) => {
    // 1. Try html5-qrcode scanFile strategy (primary)
    if (window.Html5Qrcode) {
      const qrInstance = new window.Html5Qrcode(QR_READER_ID);
      try {
        const text = await qrInstance.scanFile(file, false);
        resolve(text);
        return;
      } catch (e) {
        console.warn("Primary strategy (HTML5Qrcode scanFile) failed:", e);
      }
    }

    // 2. Fallback to native BarcodeDetector if available
    if ("BarcodeDetector" in window) {
      try {
        const img = new Image();
        img.onload = async () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);

          const formats = ["qr_code", "ean_13", "code_128", "ean_8", "upc_a", "code_39", "code_93", "codabar", "itf"];
          const detector = new window.BarcodeDetector({ formats });
          const barcodes = await detector.detect(canvas);
          
          if (barcodes.length > 0) {
            resolve(barcodes[0].rawValue);
          } else {
            reject(new Error("No se detectó ningún código en la foto. Prueba con mejor iluminación o de más cerca."));
          }
        };
        img.onerror = () => reject(new Error("Error al procesar la imagen seleccionada."));
        img.src = URL.createObjectURL(file);
        return;
      } catch (detectorErr) {
        console.error("BarcodeDetector strategy failed:", detectorErr);
      }
    }

    reject(new Error("No se pudo detectar código de barras. Intenta con una imagen más nítida o en el modo Video."));
  });
}

// Live video capture using Html5Qrcode
async function startVideoCapture() {
  window.DOM.startVideoBtn.style.display = "none";
  window.DOM.stopVideoBtn.style.display = "block";
  window.DOM.stopVideoBtn.innerHTML = '<i data-lucide="loader" class="animate-spin"></i> Iniciando cámara...';
  createLucideIcons();

  if (!html5QrcodeScanner && window.Html5Qrcode) {
    html5QrcodeScanner = new window.Html5Qrcode(QR_READER_ID);
  }

  try {
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    await html5QrcodeScanner.start(
      { facingMode: "environment" },
      config,
      (decodedText) => {
        // Success Callback
        showToast(`Escaneado: ${decodedText}`, "success");
        stopVideoCapture();
        registerOrOpenScannedCode(decodedText);
      },
      (errorMessage) => {
        // Silent scan error polling
      }
    );
    window.DOM.stopVideoBtn.innerHTML = '<i data-lucide="video-off"></i> Detener Cámara';
    createLucideIcons();
  } catch (err) {
    console.error("Camera startup failed:", err);
    showToast(`Error de cámara: ${err}`, "danger");
    stopVideoCapture();
  }
}

async function stopVideoCapture() {
  window.DOM.startVideoBtn.style.display = "block";
  window.DOM.stopVideoBtn.style.display = "none";
  
  if (html5QrcodeScanner && html5QrcodeScanner.isScanning) {
    try {
      await html5QrcodeScanner.stop();
    } catch (err) {
      console.error("Failed to stop scanner:", err);
    }
  }
}

// Main flow router for detected barcodes
function registerOrOpenScannedCode(code) {
  closeScanner();
  
  const cleanCode = String(code).trim();
  const activeSection = document.querySelector(".main-nav-btn.active")?.getAttribute("data-section") || "inventory";

  if (activeSection === "product") {
    const searchInput = document.getElementById("single-product-search");
    if (searchInput) {
      searchInput.value = cleanCode;
      if (typeof loadSingleProduct === "function") loadSingleProduct(cleanCode);
      showToast(`SKU "${cleanCode}" cargado en ficha técnica.`, "success");
    }
    return;
  }

  if (activeSection === "quotes") {
    const prod = window.AppState.products.find(p => p.codigo === cleanCode);
    if (prod) {
      if (typeof addToQuote === "function") addToQuote(prod);
    } else {
      showToast(`El código "${cleanCode}" no está registrado en el inventario.`, "warning");
    }
    return;
  }

  let product = window.AppState.products.find(p => p.codigo === cleanCode);

  if (product) {
    showToast(`El código "${cleanCode}" ya está registrado. Abriendo...`, "info");
    if (typeof openProductDrawer === "function") openProductDrawer(product);
    if (typeof setDrawerTab === "function") setDrawerTab("product");
  } else {
    // Create brand new product
    product = {
      id: cleanCode,
      nombre: `Equipo Nuevo (${cleanCode})`,
      codigo: cleanCode,
      barcodeType: "code128",
      marca: "Generales",
      categoriaCodigo: "other",
      unitCode: "Pieza",
      costo: 0,
      precio: 0,
      alertaCantidad: 1,
      tasaImpuesto: "IVA",
      metodoImpuesto: "Exclusivo",
      imagen: "no_image.png",
      subCategoria: "",
      descripcion: "Registrado por escaneo.",
      especificaciones: "",
      especial3: "", // Location
      especial4: "", // Dimensions
      especial5: "", // Custom field 5
      especial6: "", // Custom field 6
      stock: 1,
      sync_status: "pending",
      updatedAt: new Date().toISOString()
    };

    window.AppState.products.push(product);
    saveProductsToStorage();
    showToast(`Nuevo código detectado. Registrado base.`, "success");
    
    // Open drawer directly into edit mode
    if (typeof openProductDrawer === "function") openProductDrawer(product);
    if (typeof setDrawerTab === "function") setDrawerTab("form");
  }
}
