// =============================================================================
// Arquitectura: Escáner de Inyección Dinámica
// =============================================================================

const TABS = Object.freeze({ SYSTEM: 'system', APPLE: 'apple' });
const SELECTORS = Object.freeze({
  TAB_SYSTEM:    '#tab-system',
  TAB_APPLE:     '#tab-apple',
  CONTENT_SYSTEM:'#content-system',
  CONTENT_APPLE: '#content-apple',
  TRIGGER_BTN:   '#triggerBtn',
  CAMERA_INPUT:  '#cameraInput',
  START_BTN:     '#startBtn',
  QR_READER:     'reader',
  SCANNER_MODAL: '#scanner-modal',
  CLOSE_MODAL:   '#close-modal-btn',
  TARGET_NAME:   '#target-name'
});

const CSS = Object.freeze({ HIDDEN: 'hidden', SKELETON: 'skeleton', TAB_ACTIVE: 'flex-1 py-3 rounded-xl font-bold bg-white shadow-sm text-slate-900', TAB_INACTIVE: 'flex-1 py-3 rounded-xl font-bold text-slate-500' });
const CANVAS_MAX_WIDTH  = 1280;

const $ = (selector) => document.querySelector(selector);
const toggleHidden = (el, condition) => el.classList.toggle(CSS.HIDDEN, condition);

// --- Utilities ---
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function drawImageToCanvas(img, maxWidth = CANVAS_MAX_WIDTH) {
  const canvas = document.createElement('canvas');
  const ctx    = canvas.getContext('2d');
  let { width, height } = img;
  if (width > maxWidth) { height = Math.round((height * maxWidth) / width); width  = maxWidth; }
  canvas.width  = width; canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

// --- Target Manager (Maneja la lógica dinámica de los inputs) ---
class TargetManager {
  constructor() {
    this.activeInput = null;
    this.modal = $(SELECTORS.SCANNER_MODAL);
    this.indicatorText = $(SELECTORS.TARGET_NAME);
    this.closeBtn = $(SELECTORS.CLOSE_MODAL);

    this._bindEvents();
  }

  _bindEvents() {
    // Ya NO forzamos el escáner al hacer focus en el input para permitir escritura manual libre.

    // Escuchar clics ÚNICAMENTE en los botones de ícono de código de barras
    const triggers = document.querySelectorAll('.scan-trigger');
    triggers.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = btn.getAttribute('data-target');
            const targetInput = document.getElementById(targetId);
            if(targetInput) this.setTarget(targetInput);
        });
    });

    // Cerrar Modal manualmente
    if(this.closeBtn) {
        this.closeBtn.addEventListener('click', () => this.closeModal());
    }
  }

  setTarget(inputEl) {
    // Limpiar resaltado del anterior
    if (this.activeInput) {
        this.activeInput.classList.remove('ring-4', 'ring-blue-400', 'border-blue-500');
    }

    this.activeInput = inputEl;
    
    // Resaltar nuevo input
    this.activeInput.classList.add('ring-4', 'ring-blue-400', 'border-blue-500');
    
    // Actualizar UI Modal
    const label = document.querySelector(`label[for="${inputEl.id}"]`);
    const fieldName = label ? label.textContent : inputEl.placeholder;
    this.indicatorText.textContent = `Apuntando a: ${fieldName}`;

    // Mostrar Modal
    this.modal.classList.remove(CSS.HIDDEN);
    this.modal.classList.add('flex');
    
    // Ocultar el teclado en dispositivos móviles inmediatamente
    inputEl.blur(); 
  }

  closeModal() {
    // Ocultar Modal
    this.modal.classList.add(CSS.HIDDEN);
    this.modal.classList.remove('flex');
    
    // Quitar resaltado
    if (this.activeInput) {
        this.activeInput.classList.remove('ring-4', 'ring-blue-400', 'border-blue-500');
        this.activeInput = null;
    }

    // Emitir evento para detener video y ahorrar recursos
    document.dispatchEvent(new CustomEvent('scanner-closed'));
  }

  fillTarget(code) {
    if (!this.activeInput) {
        alert("Por favor selecciona un campo de texto primero.");
        return false;
    }

    // Guardar referencia temporal
    const inputToFill = this.activeInput;

    // Inyectar el valor
    inputToFill.value = code;
    
    // Efecto visual de éxito
    inputToFill.classList.remove('ring-4', 'ring-blue-400', 'border-blue-500');
    inputToFill.classList.add('input-success');
    setTimeout(() => {
        inputToFill.classList.remove('input-success');
    }, 1000);

    // Disparar evento de input por si hay otros scripts escuchando cambios
    inputToFill.dispatchEvent(new Event('input', { bubbles: true }));
    inputToFill.dispatchEvent(new Event('change', { bubbles: true }));

    // Cerrar el modal exitosamente
    this.closeModal();

    return true;
  }
}

// --- TabController ---
class TabController {
  constructor(tabMap) { this._tabMap = tabMap; }
  switchTo(activeKey) {
    Object.entries(this._tabMap).forEach(([key, { tab, content }]) => {
      const isActive = key === activeKey;
      toggleHidden(content, !isActive);
      tab.className = isActive ? CSS.TAB_ACTIVE : CSS.TAB_INACTIVE;
    });
  }
}

// --- BarcodeReaderStrategies ---
class Html5QrcodeStrategy {
  constructor(instance) { this._qr = instance; }
  async decode(file) { return await this._qr.scanFile(file, false); }
}

class BarcodeDetectorStrategy {
  isSupported() { return 'BarcodeDetector' in window; }
  async decode(file) {
    const img      = await loadImage(file);
    const canvas   = drawImageToCanvas(img);
    URL.revokeObjectURL(img.src);
    const detector = new BarcodeDetector({ formats: ['qr_code','ean_13','code_128','ean_8','upc_a','code_39'] });
    const barcodes = await detector.detect(canvas);
    if (!barcodes.length) throw new Error("No se detectó código.");
    return barcodes[0].rawValue;
  }
}

class ImageScanService {
  constructor(primary, fallback) { this._primary = primary; this._fallback = fallback; }
  async scan(file) {
    try { return await this._primary.decode(file); } 
    catch (e) {
      if (!this._fallback.isSupported()) throw new Error("Tu navegador no soporta detección por foto.");
      try { return await this._fallback.decode(file); } 
      catch (err) { throw new Error(err.message === "No se detectó código." ? err.message : "Error en detector nativo."); }
    }
  }
}

// --- ButtonStateManager ---
class ButtonStateManager {
  constructor(btn) { this._btn = btn; this._originalHTML = btn.innerHTML; }
  setLoading(html) { this._btn.disabled = true; this._btn.innerHTML = html; lucide.createIcons(); }
  setText(text) { this._btn.textContent = text; }
  reset() { this._btn.disabled = false; this._btn.innerHTML = this._originalHTML; lucide.createIcons(); }
}

// --- Scan Controllers (Inyectando datos al TargetManager) ---
class PhotoScanController {
  constructor(triggerBtn, fileInput, feedbackBox, scanService, targetManager) {
    this._btnManager    = new ButtonStateManager(triggerBtn);
    this._fileInput     = fileInput;
    this._feedbackBox   = feedbackBox;
    this._scanService   = scanService;
    this._targetManager = targetManager;

    triggerBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => this._onFileChange(e));
  }

  async _onFileChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    this._btnManager.setLoading(`<i data-lucide="loader" class="animate-spin"></i> Leyendo Código...`);
    this._feedbackBox.classList.add(CSS.SKELETON);

    try {
      const code = await this._scanService.scan(file);
      // Inyectar en el input activo
      this._targetManager.fillTarget(code);
    } catch (err) {
      alert(err.message);
    } finally {
      this._btnManager.reset();
      this._feedbackBox.classList.remove(CSS.SKELETON);
      event.target.value = '';
    }
  }
}

class VideoScanController {
  constructor(startBtn, qrInstance, targetManager) {
    this._btnManager    = new ButtonStateManager(startBtn);
    this._qr            = qrInstance;
    this._targetManager = targetManager;
    this._isScanning    = false;

    startBtn.addEventListener('click', () => this._onToggle());
    
    // Escuchar cierre de modal para detener la cámara automáticamente
    document.addEventListener('scanner-closed', () => {
      if (this._isScanning) {
          this._qr.stop();
          this._isScanning = false;
          this._btnManager.reset();
      }
    });
  }

  async _onToggle() {
    if (this._isScanning) {
        this._qr.stop();
        this._isScanning = false;
        this._btnManager.reset();
        return;
    }

    this._btnManager.setLoading('Iniciando...');
    try {
      await this._qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        (text) => this._onCodeDetected(text)
      );
      this._isScanning = true;
      this._btnManager.setText('Lector Activo... (Cierra video al terminar)');
    } catch (err) {
      alert(`Error: ${err}`);
      this._btnManager.reset();
    }
  }

  _onCodeDetected(text) {
    // Intentar inyectar en el input activo
    const success = this._targetManager.fillTarget(text);
    
    // Si se inyectó con éxito, detenemos el video automáticamente para seguir llenando el formulario
    if(success) {
        this._qr.stop();
        this._isScanning = false;
        this._btnManager.reset();
    }
  }
}

// --- Init ---
function init() {
  lucide.createIcons();

  // Instanciar Gestor Dinámico
  const targetManager = new TargetManager();

  const qrInstance = new Html5Qrcode(SELECTORS.QR_READER);
  
  const tabController = new TabController({
    [TABS.SYSTEM]: { tab: $(SELECTORS.TAB_SYSTEM), content: $(SELECTORS.CONTENT_SYSTEM) },
    [TABS.APPLE]:  { tab: $(SELECTORS.TAB_APPLE), content: $(SELECTORS.CONTENT_APPLE) },
  });
  window.switchTab = (tab) => tabController.switchTo(tab);

  const scanService = new ImageScanService(new Html5QrcodeStrategy(qrInstance), new BarcodeDetectorStrategy());

  new PhotoScanController(
    $(SELECTORS.TRIGGER_BTN),
    $(SELECTORS.CAMERA_INPUT),
    $('#system-box'),
    scanService,
    targetManager
  );

  new VideoScanController(
    $(SELECTORS.START_BTN),
    qrInstance,
    targetManager
  );
}

document.addEventListener('DOMContentLoaded', init);