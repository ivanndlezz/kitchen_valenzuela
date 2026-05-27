/**
 * Yacht Pricing Comparator Screen — Love Shack v3
 *
 * Full port of pricing-comparison.html (simulator + CRUD catalog + import flows)
 * - Scoped under .yacht-pricing-app (see dedicated CSS)
 * - Preserves FORM_CONFIG, recent commission number-input + slider sync
 * - Uses window.Toast instead of internal toast
 * - Inline SVGs for all icons (no Lucide dependency)
 * - Data persisted under original 'yacht_pricing_db_apple' localStorage key (isolated)
 * - Hides main bottom nav via router (showBottomNav=false)
 *
 * Route: #/yacht-pricing
 * Menu: "Comparador Yates" in bottom-island
 */

const YachtPricingScreen = {
  container: null,

  // State (mirrors original globals)
  pricingData: {},
  activeCohortKey: "4",
  editingSourceKey: null,
  _staticListenersWired: false,

  // Cached DOM refs (populated in render after HTML injection)
  els: {},

  // Internal timers for cleanup
  _toastTimer: null,

  render(container, params = {}) {
    // Phase 2 mounted guard (Thorough): avoid full re-mount + heavy innerHTML thrash on router re-entrancy
    const existingRoot = container && container.querySelector('#yacht-pricing-root');
    if (this.container === container && existingRoot) {
      this.els.root = existingRoot;
      this._cacheElements();
      this._wireStaticListeners(); // idempotent (has guards)
      // Light refresh of volatile parts only; do not re-inject template or re-init full data
      this.updateComparisonSelectors();
      this.calculateAll();
      // If rates list empty (e.g. tab not yet visited), populate without full re-render
      const ratesCont = existingRoot.querySelector('#rates-list-container');
      if (ratesCont && !ratesCont.querySelector('.rate-card')) {
        this.renderRatesList();
      }
      return;
    }

    this.container = container;
    this.destroy(); // ensure clean slate if re-render

    // Inject the full self-contained UI (header + tabs + sheets + scoped wrapper)
    // Note: we use .yacht-app inside for minimal diff with original CSS rules
    this.container.innerHTML = `
      <div class="yacht-pricing-app" id="yacht-pricing-root">
        <div class="yacht-app">
          <!-- Header (we add a back button for v3 navigation) -->
          <header class="yacht-header">
            <div class="yacht-header__brand">
               <button type="button" id="yacht-back-btn" class="sheet__close" style="margin-right:0.5rem;" aria-label="Volver al Dashboard">
                 <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
               </button>
              <div class="yacht-header__status"></div>
              <h1 class="yacht-header__title">Yacht Prices</h1>
            </div>

            <div class="yacht-header__actions">
              <nav class="tab-bar">
                 <button type="button" onclick="window.YachtPricingScreen.switchTab('tab-simulator')" id="nav-simulator" class="tab-bar__item" style="color: var(--color-accent-blue);">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 21v-7m4 7v-4m4 4v-10m4 10v-6m4 6V3"/></svg>
                  <span class="text-[10px] font-bold">Simular</span>
                </button>
                 <button type="button" onclick="window.YachtPricingScreen.switchTab('tab-rates')" id="nav-rates" class="tab-bar__item" style="color: var(--color-text-secondary);">
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/></svg>
                  <span class="text-[10px] font-bold">Tarifas</span>
                </button>
              </nav>
              <div class="yacht-header__location">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="yacht-header__location-icon"><path d="M12 21s-8-4.5-8-10a8 8 0 0 1 16 0c0 5.5-8 10-8 10z"/><circle cx="12" cy="11" r="3"/></svg>
              <span class="yacht-header__location-text" id="current-date">Cabo San Lucas</span>
            </div>
            </div>
          </header>

          <main class="yacht-main">
            <!-- TAB 1: SIMULADOR -->
            <section id="tab-simulator" class="tab-content active">
              <div class="simulator-grid">
                <div class="simulator-grid__left">
                  <div class="section-header">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="section-header__icon" style="color: var(--color-accent-blue);"><path d="M4 21v-7m4 7v-4m4 4v-10m4 10v-6m4 6V3"/></svg>
                    <h2 class="section-header__title">Centro de Control</h2>
                  </div>

                  <!-- Segmented Cohort -->
                  <div>
                    <label class="control-card__label" style="display:block; margin-bottom:0.5rem; padding-left:0.25rem;">Duración del Charter</label>
                    <div class="segmented-control segmented-scroll">
                       <button type="button" onclick="window.YachtPricingScreen.setCohort(2)" id="btn-cohort-2" class="segmented-btn">2 hrs</button>
                       <button type="button" onclick="window.YachtPricingScreen.setCohort(3)" id="btn-cohort-3" class="segmented-btn">3 hrs</button>
                       <button type="button" onclick="window.YachtPricingScreen.setCohort(4)" id="btn-cohort-4" class="segmented-btn segmented-btn--active">4 hrs</button>
                       <button type="button" onclick="window.YachtPricingScreen.setCohort(5)" id="btn-cohort-5" class="segmented-btn">5 hrs</button>
                       <button type="button" onclick="window.YachtPricingScreen.setCohort(6)" id="btn-cohort-6" class="segmented-btn">6 hrs</button>
                       <button type="button" onclick="window.YachtPricingScreen.setCohort(7)" id="btn-cohort-7" class="segmented-btn">7 hrs</button>
                       <button type="button" onclick="window.YachtPricingScreen.setCohort(8)" id="btn-cohort-8" class="segmented-btn">8 hrs</button>
                    </div>
                  </div>

                  <!-- Steppers -->
                  <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
                    <div class="control-card">
                      <span class="control-card__label">Pasajeros</span>
                      <div class="stepper">
                         <button type="button" onclick="window.YachtPricingScreen.stepInput('sim-passengers', -1)" class="stepper__btn">
                           <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 12H4"/></svg>
                         </button>
                        <input type="number" id="sim-passengers" min="1" value="12" class="stepper__value" readonly>
                        <button type="button" onclick="window.YachtPricingScreen.stepInput('sim-passengers', 1)" class="stepper__btn">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 5v14M5 12h14"/></svg>
                        </button>
                      </div>
                    </div>
                    <div class="control-card">
                      <span class="control-card__label">Horas Extras</span>
                      <div class="stepper">
                         <button type="button" onclick="window.YachtPricingScreen.stepInput('sim-extra-hours', -1)" class="stepper__btn">
                           <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 12H4"/></svg>
                         </button>
                        <input type="number" id="sim-extra-hours" min="0" value="0" class="stepper__value" readonly>
                        <button type="button" onclick="window.YachtPricingScreen.stepInput('sim-extra-hours', 1)" class="stepper__btn">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 5v14M5 12h14"/></svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- A/B Selectors -->
                  <div class="selector-card">
                    <span class="selector-card__label">Yates a Comparar</span>
                    <div class="selector-pair">
                      <div class="selector-wrapper">
                        <div class="selector-label">Origen A</div>
                        <select id="sim-source-a" class="selector focus-ring-blue"></select>
                        <div class="selector-chevron">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>
                        </div>
                      </div>
                      <div class="selector-vs hidden sm:block">vs</div>
                      <div class="selector-wrapper">
                        <div class="selector-label">Origen B</div>
                        <select id="sim-source-b" class="selector focus-ring-blue"></select>
                        <div class="selector-chevron">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Right: Results -->
                <div class="simulator-grid__right">
                  <div class="results-header">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="section-header__icon" style="color: var(--color-accent-green);"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
                    <h2 class="section-header__title">Resultados de Comparación</h2>
                  </div>

                  <div id="diff-banner" class="diff-banner"></div>

                  <div class="comparison-grid">
                    <div id="card-panel-a" class="comparison-card"></div>
                    <div id="card-panel-b" class="comparison-card"></div>
                  </div>

                   <button type="button" id="btn-copy-report" class="action-btn">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    <span>Copiar Reporte Comparativo</span>
                  </button>
                </div>
              </div>
            </section>

            <!-- TAB 2: TARIFAS CRUD -->
            <section id="tab-rates" class="tab-content">
              <div style="display:flex; flex-direction:column; gap:0.75rem; border-bottom:var(--border-subtle); padding-bottom:1rem; margin-bottom:1.25rem;">
                <div class="flex flex-col">
                  <span class="control-card__label">Ajustes Generales</span>
                  <h2 style="font-size:1.25rem; font-weight:700; color:#000;">Catálogo de Tarifas</h2>
                </div>
                <div style="display:flex; align-items:center; gap:0.5rem; align-self:flex-start;">
                   <button type="button" onclick="window.YachtPricingScreen.openImportModal()" class="sheet-form__btn sheet-form__btn--cancel" style="display:flex; align-items:center; gap:0.375rem; height:2.75rem; font-size:0.75rem; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    <span>Importar Convenio</span>
                  </button>
                   <button type="button" onclick="window.YachtPricingScreen.openFormModal(null)" class="sheet-form__btn sheet-form__btn--submit" style="display:flex; align-items:center; gap:0.375rem; height:2.75rem; font-size:0.75rem;">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 5v14M5 12h14"/></svg>
                    <span>Nuevo Origen</span>
                  </button>
                </div>
              </div>

              <div id="rates-list-container" class="rates-grid"></div>
            </section>
          </main>          

          <!-- Bottom Sheet for Edit/Create Form (scoped) -->
          <div id="bottom-sheet" class="sheet invisible pointer-events-none">
            <div id="sheet-backdrop" class="sheet__backdrop" onclick="window.YachtPricingScreen.closeFormModal()"></div>
            <div id="sheet-panel" class="responsive-sheet sheet__panel">
              <div class="sheet__handle md:hidden"></div>
              <div class="sheet__header">
                <h3 id="form-title" class="sheet__title">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--color-accent-blue);"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                  <span>Añadir Nueva Tarifa</span>
                </h3>
                 <button type="button" onclick="window.YachtPricingScreen.closeFormModal()" class="sheet__close">
                   <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                 </button>
              </div>

              <form id="source-form" onsubmit="window.YachtPricingScreen.handleFormSubmit(event)" class="sheet-form" novalidate>
                <div class="sheet-form__field">
                  <label class="sheet-form__label" for="form-source-key">ID del Origen (Único, sin espacios)</label>
                  <input type="text" id="form-source-key" required class="sheet-form__input" placeholder="ej: hotel_premium">
                </div>
                <div class="sheet-form__field">
                  <label class="sheet-form__label" for="form-source-label">Nombre Comercial</label>
                  <input type="text" id="form-source-label" required class="sheet-form__input" placeholder="ej: Hotel Pedregal VIP">
                </div>
                <div class="sheet-form__field">
                  <label class="sheet-form__label" for="form-source-type">Categoría</label>
                  <select id="form-source-type" class="sheet-form__select">
                    <option value="direct">Operador Directo</option>
                    <option value="hotel">Conserjería de Hotel</option>
                    <option value="agency">Agencia / Broker</option>
                  </select>
                </div>
                <div id="form-hourly-slots-container" class="sheet-form__slots"></div>

                <!-- Commission with number input (recent feature) -->
                <div class="sheet-form__commission">
                  <div class="flex justify-between items-center">
                    <label class="sheet-form__label" for="form-commission">Comisión de Intermediario</label>
                    <div style="display:flex; align-items:center; gap:1px;">
                      <input type="number" id="form-commission-input" min="0" max="100" step="1"
                             style="width:38px; text-align:right; font-size:0.75rem; font-weight:700; color:#007AFF; background:transparent; border:none; outline:none; padding:0;"
                             oninput="window.YachtPricingScreen.syncCommissionFromInput('form-commission', 'form-commission-input')">
                      <span style="font-size:0.75rem; font-weight:700; color:#007AFF;">%</span>
                    </div>
                  </div>
                  <input type="range" id="form-commission" min="0" max="100" step="5" value="0" style="width:100%; accent-color:var(--color-accent-blue); cursor:pointer;" oninput="window.YachtPricingScreen.syncCommissionFromSlider('form-commission', 'form-commission-input')">
                </div>

                <div class="sheet-form__actions">
                  <button type="button" onclick="window.YachtPricingScreen.closeFormModal()" class="sheet-form__btn sheet-form__btn--cancel">Cancelar</button>
                  <button type="submit" class="sheet-form__btn sheet-form__btn--submit">Guardar</button>
                </div>
              </form>
            </div>
          </div>

          <!-- Import Sheet -->
          <div id="import-sheet" class="sheet invisible pointer-events-none">
            <div id="import-sheet-backdrop" class="sheet__backdrop" onclick="window.YachtPricingScreen.closeImportModal()"></div>
            <div id="import-sheet-panel" class="responsive-sheet sheet__panel">
              <div class="sheet__handle md:hidden"></div>
              <div class="sheet__header">
                <h3 class="sheet__title">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--color-accent-blue);"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  <span>Importar Convenio por Plantilla</span>
                </h3>
                 <button type="button" onclick="window.YachtPricingScreen.closeImportModal()" class="sheet__close">
                   <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                 </button>
              </div>

              <form id="import-form" onsubmit="window.YachtPricingScreen.handleImportSubmit(event)" class="sheet-form" novalidate>
                <div class="import-grid">
                  <div class="sheet-form__field">
                    <label class="sheet-form__label" for="import-source-key">ID del Convenio (Único)</label>
                    <input type="text" id="import-source-key" required class="sheet-form__input" placeholder="ej: hacienda_vip">
                  </div>
                  <div class="sheet-form__field">
                    <label class="sheet-form__label" for="import-source-label">Nombre Comercial</label>
                    <input type="text" id="import-source-label" required class="sheet-form__input" placeholder="ej: Hacienda Encantada Premium">
                  </div>
                </div>
                <div class="import-grid">
                  <div class="sheet-form__field">
                    <label class="sheet-form__label" for="import-source-type">Categoría</label>
                    <select id="import-source-type" class="sheet-form__select">
                      <option value="hotel">Conserjería de Hotel</option>
                      <option value="direct">Operador Directo</option>
                      <option value="agency">Agencia / Broker</option>
                    </select>
                  </div>
                  <div class="sheet-form__field">
                    <label class="sheet-form__label" for="import-preset-selector">Plantilla Base</label>
                    <select id="import-preset-selector" onchange="window.YachtPricingScreen.updateImportPresetView()" class="sheet-form__select">
                      <option value="hacienda_real">Hacienda Encantada (Real)</option>
                      <option value="direct_base">Directo Base Estándar</option>
                      <option value="json_custom">Importar desde JSON</option>
                    </select>
                  </div>
                </div>

                <div id="import-json-container" class="sheet-form__field hidden">
                  <label class="sheet-form__label" for="import-json-data">Pegar JSON de Convenio</label>
                  <textarea id="import-json-data" oninput="window.YachtPricingScreen.updateImportPreview()" class="sheet-form__textarea" placeholder='Pega un JSON con las horas como claves...'></textarea>
                  <span class="text-[9px] text-[#8E8E93] block">Debe tener un formato similar a: {"2": {"charter-price": 1850, ...}}</span>
                </div>

                <div class="import-grid" style="border-top:var(--border-subtle); padding-top:1rem;">
                  <div class="sheet-form__field">
                    <label class="sheet-form__label" for="import-price-modifier">Modificador de Precio</label>
                    <select id="import-price-modifier" onchange="window.YachtPricingScreen.updateImportPreview()" class="sheet-form__select">
                      <option value="0">Precio Original (100%)</option>
                      <option value="0.05">Incrementar +5%</option>
                      <option value="0.10">Incrementar +10%</option>
                      <option value="0.15">Incrementar +15%</option>
                      <option value="-0.05">Descontar -5%</option>
                      <option value="-0.10">Descontar -10%</option>
                    </select>
                  </div>
                  <div class="sheet-form__field">
                    <div class="flex justify-between items-center">
                      <label class="sheet-form__label" for="import-commission">Comisión</label>
                      <div style="display:flex; align-items:center; gap:1px;">
                        <input type="number" id="import-commission-input" min="0" max="100" step="1"
                               style="width:38px; text-align:right; font-size:0.75rem; font-weight:700; color:#007AFF; background:transparent; border:none; outline:none; padding:0;"
                               oninput="window.YachtPricingScreen.syncCommissionFromInput('import-commission', 'import-commission-input', true)">
                        <span style="font-size:0.75rem; font-weight:700; color:#007AFF;">%</span>
                      </div>
                    </div>
                    <input type="range" id="import-commission" min="0" max="100" step="5" value="35" style="width:100%; accent-color:var(--color-accent-blue); cursor:pointer;" oninput="window.YachtPricingScreen.syncCommissionFromSlider('import-commission', 'import-commission-input', true)">
                  </div>
                </div>

                <div class="sheet-form__field">
                  <label class="sheet-form__label">Vista Previa de Precios Resultantes</label>
                  <div class="import-preview">
                    <table>
                      <thead>
                        <tr>
                          <th>Duración</th>
                          <th style="text-align:right;">Precio Base</th>
                          <th style="text-align:center;">Pax Base</th>
                          <th style="text-align:right;">Pax Extra</th>
                          <th style="text-align:right;">Comisión</th>
                        </tr>
                      </thead>
                      <tbody id="import-preview-tbody"></tbody>
                    </table>
                  </div>
                </div>

                <div class="sheet-form__actions">
                  <button type="button" onclick="window.YachtPricingScreen.closeImportModal()" class="sheet-form__btn sheet-form__btn--cancel">Cancelar</button>
                  <button type="submit" class="sheet-form__btn sheet-form__btn--submit">Importar Convenio</button>
                </div>
              </form>
            </div>
          </div>

          <!-- Internal toast container (present for structure; JS delegates to global Toast) -->
          <div id="toast" class="toast" style="display:none;">
            <div id="toast-icon-box" class="toast__icon"></div>
            <p id="toast-message" class="toast__message"></p>
          </div>
        </div>
      </div>
    `;

    // Cache elements
    this._cacheElements();

    // Wire static listeners (scoped)
    this._wireStaticListeners();

    // Load data + initial render
    this.initApp();

    // Ensure first paint of simulator
    // (initApp already calls setCohort which triggers calculate)
  },

  _cacheElements() {
    const root = this.container.querySelector('#yacht-pricing-root') || this.container;
    this.els = {
      root,
      backBtn: root.querySelector('#yacht-back-btn'),
      simPassengers: root.querySelector('#sim-passengers'),
      simExtraHours: root.querySelector('#sim-extra-hours'),
      simSourceA: root.querySelector('#sim-source-a'),
      simSourceB: root.querySelector('#sim-source-b'),
      cardPanelA: root.querySelector('#card-panel-a'),
      cardPanelB: root.querySelector('#card-panel-b'),
      diffBanner: root.querySelector('#diff-banner'),
      ratesContainer: root.querySelector('#rates-list-container'),
      btnCopy: root.querySelector('#btn-copy-report'),
      // sheets
      bottomSheet: root.querySelector('#bottom-sheet'),
      importSheet: root.querySelector('#import-sheet'),
    };
  },

  _wireStaticListeners() {
    if (this._staticListenersWired) return;
    this._staticListenersWired = true;

    const { backBtn, btnCopy, simSourceA, simSourceB } = this.els;

    if (backBtn) {
      backBtn.addEventListener('click', () => {
        window.App.navigate('#/dashboard');
      });
    }

    if (btnCopy) {
      btnCopy.addEventListener('click', () => this.handleCopyReport());
    }

    if (simSourceA) simSourceA.addEventListener('change', () => this.calculateAll());
    if (simSourceB) simSourceB.addEventListener('change', () => this.calculateAll());

    // Commission blur handlers (will be set up after init too)
    this.setupCommissionInput('form-commission-input', 'form-commission');
    this.setupCommissionInput('import-commission-input', 'import-commission', true);

    // Phase 1: Block Enter from submitting forms inside number inputs etc. (prevents page reload)
    this._setupFormEnterBlock();
  },

  _setupFormEnterBlock() {
    const root = this.els.root || this.container;
    if (!root || root._formEnterBlocked) return;
    root._formEnterBlocked = true;

    const blockEnter = (e) => {
      if (e.key !== 'Enter') return;
      const t = e.target;
      // Only care about inputs/textareas inside our pricing forms
      const form = t && t.closest('form');
      if (!form || (form.id !== 'source-form' && form.id !== 'import-form')) return;

      // Allow if the focused element is explicitly a submit button
      const isExplicitSubmit = t.tagName === 'BUTTON' && t.getAttribute('type') === 'submit';
      if (isExplicitSubmit) return;

      // Swallow Enter to prevent implicit form submit (root cause of reloads)
      e.preventDefault();
      e.stopImmediatePropagation();
      // Do not blur; user may want to stay in field (common for numeric steppers)
    };

    // Capture phase so we intercept before form's onsubmit
    root.addEventListener('keydown', blockEnter, true);

    // Also attach directly to forms for extra safety (re-applied on open if needed)
    const f1 = root.querySelector('#source-form');
    const f2 = root.querySelector('#import-form');
    if (f1) f1.addEventListener('keydown', blockEnter, true);
    if (f2) f2.addEventListener('keydown', blockEnter, true);
  },

  destroy() {
    // Cleanup timers
    if (this._toastTimer) {
      clearTimeout(this._toastTimer);
      this._toastTimer = null;
    }
    // Phase 3: harden destroy - clear delegated handlers + flags to avoid leaks/dupes on re-mount
    if (this.container) {
      const root = this.container.querySelector('#yacht-pricing-root') || this.container;
      if (root) {
        root._formEnterBlocked = false;
        // note: anonymous keydown capture can't be removed without ref, but innerHTML wipe + flag reset is sufficient
      }
      const rates = this.els.ratesContainer || (root && root.querySelector('#rates-list-container'));
      if (rates) {
        rates.onclick = null;
        rates._ratesDelegateWired = false;
      }
      // reset commission wired flags if inputs still around before wipe
      ['form-commission-input', 'import-commission-input'].forEach(id => {
        const i = root.querySelector('#' + id);
        if (i) i._commissionWired = false;
      });
      this.container.innerHTML = '';
    }
    this.els = {};
    this._mounted = false;
    this._staticListenersWired = false;
    // State reset optional (keep data in memory for quick re-open, or reload from LS in render)
  },

  // === Core methods (port of original functions) ===

  initApp() {
    const stored = localStorage.getItem('yacht_pricing_db_apple');
    if (stored) {
      try {
        this.pricingData = JSON.parse(stored);
      } catch (e) {
        this.pricingData = JSON.parse(JSON.stringify(DEFAULT_PRICING_DATA)); // will be in scope via closure below
      }
    } else {
      this.pricingData = JSON.parse(JSON.stringify(DEFAULT_PRICING_DATA));
    }
    this.setCohort(this.activeCohortKey);
  },

  saveStorage() {
    localStorage.setItem('yacht_pricing_db_apple', JSON.stringify(this.pricingData));
  },

  // ... (other methods will be added in subsequent edits for Phase 2)

  // Placeholder for now so skeleton is valid
  setCohort(key) {
    this.activeCohortKey = String(key);
    const root = this.els.root || this.container;
    root.querySelectorAll('.segmented-btn').forEach(pill => pill.classList.remove('segmented-btn--active'));
    const active = root.querySelector(`#btn-cohort-${key}`);
    if (active) active.classList.add('segmented-btn--active');

    this.updateComparisonSelectors();
    this.calculateAll();
  },

  stepInput(inputId, direction) {
    const root = this.els.root || this.container;
    const input = root.querySelector('#' + inputId);
    if (!input) return;
    let val = parseInt(input.value) || 0;
    val = Math.max(parseInt(input.min) || 0, val + direction);
    input.value = val;
    this.calculateAll();
  },

  switchTab(tabId) {
    const root = this.els.root || this.container;
    root.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    root.querySelector('#' + tabId).classList.add('active');

    const isSim = tabId === 'tab-simulator';
    const navSim = root.querySelector('#nav-simulator');
    const navRates = root.querySelector('#nav-rates');
    if (navSim) {
      navSim.className = 'tab-bar__item';
      navSim.style.color = isSim ? 'var(--color-accent-blue)' : 'var(--color-text-secondary)';
    }
    if (navRates) {
      navRates.className = 'tab-bar__item';
      navRates.style.color = !isSim ? 'var(--color-accent-blue)' : 'var(--color-text-secondary)';
    }

    if (!isSim) {
      this.renderRatesList();
    } else {
      this.updateComparisonSelectors();
      this.calculateAll();
    }
  },

  updateComparisonSelectors() {
    const root = this.els.root || this.container;
    const sources = (this.pricingData[this.activeCohortKey] && this.pricingData[this.activeCohortKey].sources) || {};
    const selA = this.els.simSourceA;
    const selB = this.els.simSourceB;
    if (!selA || !selB) return;

    const prevA = selA.value;
    const prevB = selB.value;

    selA.innerHTML = '';
    selB.innerHTML = '';

    Object.keys(sources).forEach(key => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = sources[key].label;
      selA.appendChild(opt.cloneNode(true));
      selB.appendChild(opt);
    });

    const keys = Object.keys(sources);
    if (keys.includes(prevA)) selA.value = prevA;
    else if (keys[0]) selA.value = keys[0];

    if (keys.includes(prevB)) selB.value = prevB;
    else if (keys[1]) selB.value = keys[1];
    else if (keys[0]) selB.value = keys[0];
  },

  computeRates(sourceKey, cohortKey, passengers, extraHours) {
    const cohort = this.pricingData[cohortKey];
    if (!cohort || !cohort.sources || !cohort.sources[sourceKey]) return null;
    const src = cohort.sources[sourceKey];
    const charterPrice = parseFloat(src["charter-price"]) || 0;
    const extraHourRate = parseFloat(src["extra-hour"]) || 0;
    const extraPassengerRate = parseFloat(src["extra-passenger"]) || 0;
    const basePassengers = parseInt(src["base-passengers"]) || 10;
    const commissionRate = parseFloat(src["commission"]) || 0;

    const extraHoursTotal = extraHours * extraHourRate;
    const extraPassengersCount = Math.max(0, passengers - basePassengers);
    const extraPassengersTotal = extraPassengersCount * extraPassengerRate;

    const subtotalNet = charterPrice + extraHoursTotal + extraPassengersTotal;
    const commissionAmount = subtotalNet * commissionRate;

    return {
      key: sourceKey,
      label: src.label,
      type: src.type || 'direct',
      charterPrice,
      basePassengers,
      extraHoursCount: extraHours,
      extraHourRate,
      extraHoursTotal,
      extraPassengersCount,
      extraPassengerRate,
      extraPassengersTotal,
      subtotalNet,
      commissionRate,
      commissionAmount,
      total: subtotalNet
    };
  },

  renderComparisonCard(data, container, isWinner) {
    if (!container) return;
    if (!data) {
      container.innerHTML = `
        <div style="padding:2rem; text-align:center; color:#8E8E93; margin:auto;">
          <svg viewBox="0 0 24 24" width="32" height="32" style="margin:0 auto 0.5rem; color:#d1d5db;" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
          <p class="text-xs font-bold uppercase tracking-wider">No configurado</p>
        </div>`;
      return;
    }

    let badgeClass = "comparison-card__badge comparison-card__badge--direct";
    let categoryText = "Proveedor Directo";
    if (data.type === 'hotel') { badgeClass = "comparison-card__badge comparison-card__badge--hotel"; categoryText = "Hotel"; }
    else if (data.type === 'agency') { badgeClass = "comparison-card__badge comparison-card__badge--agency"; categoryText = "Agencia / Broker"; }

    const headerClass = isWinner ? 'comparison-card__header comparison-card__header--winner' : 'comparison-card__header comparison-card__header--default';

    container.innerHTML = `
      <div class="${headerClass}">
        <div class="flex justify-between items-center">
          <span class="${badgeClass}">${categoryText}</span>
          ${isWinner ? `<span class="comparison-card__winner"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"/></svg><span>Mejor Opción</span></span>` : ''}
        </div>
        <div class="flex items-end justify-between mt-3">
          <h3 class="comparison-card__name">${data.label}</h3>
          <span class="comparison-card__total">$${data.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>
      <div class="comparison-card__body">
        <div>
          <div class="comparison-card__row"><span class="comparison-card__row-label">Charter Base (${this.activeCohortKey}h):</span><span class="comparison-card__row-value">$${data.charterPrice.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
          <div class="comparison-card__row"><span class="comparison-card__row-label">Horas Extras (${data.extraHoursCount}h):</span><span class="comparison-card__row-value">+$${data.extraHoursTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
          <div class="comparison-card__row"><span class="comparison-card__row-label">Pax Extra (${data.extraPassengersCount}pax):</span><span class="comparison-card__row-value">+$${data.extraPassengersTotal.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span></div>
        </div>
        ${data.commissionAmount > 0 ? `
          <div class="comparison-card__commission">
            <div class="comparison-card__commission-row">
              <span>Comisión de Retención (${data.commissionRate * 100}%):</span>
              <span>-$${data.commissionAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="comparison-card__net">
              <span>Liquidación Operador:</span>
              <span>$${(data.total - data.commissionAmount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>` : `
          <div class="comparison-card__footer">
            <svg viewBox="0 0 24 24" width="14" height="14" style="color:#30D158;" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
            <span>Liquidación libre de comisión</span>
          </div>`}
      </div>`;
  },

  // Phase 2 Thorough: dedicated partial updater for comparison cards + diff (targeted only)
  updateComparison(resA, resB) {
    const hasA = !!resA;
    const hasB = !!resB;
    const winA = hasA && hasB && resA.total < resB.total;
    const winB = hasA && hasB && resB.total < resA.total;

    this.renderComparisonCard(resA, this.els.cardPanelA, winA);
    this.renderComparisonCard(resB, this.els.cardPanelB, winB);
    this.updateDiffBanner(resA, resB);
  },

  // dedicated partial updater for diff banner (targeted, no larger container thrash)
  updateDiffBanner(resA, resB) {
    const diffEl = this.els.diffBanner;
    if (!diffEl) return;
    const hasA = !!resA;
    const hasB = !!resB;
    if (hasA && hasB) {
      const diff = Math.abs(resA.total - resB.total);
      const diffPct = resA.total > 0 ? ((diff / resA.total) * 100).toFixed(1) : 0;
      if (resA.total === resB.total) {
        diffEl.innerHTML = `<div class="diff-banner__equal"><span class="diff-banner__equal-label">Diferencial</span><p class="diff-banner__equal-text">Los precios son exactamente iguales</p></div>`;
      } else {
        const winnerName = resA.total < resB.total ? resA.label : resB.label;
        diffEl.innerHTML = `<div class="diff-banner__diff"><div class="diff-banner__diff-left"><span class="diff-banner__diff-label">Diferencia de Precio</span><p class="diff-banner__diff-value">$${diff.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p></div><div class="diff-banner__diff-right"><span class="diff-banner__winner">${winnerName}</span><span class="diff-banner__savings">Ahorras un ~${diffPct}%</span></div></div>`;
      }
    } else {
      diffEl.innerHTML = '';
    }
  },

  calculateAll() {
    const root = this.els.root || this.container;
    const passEl = this.els.simPassengers || root.querySelector('#sim-passengers');
    const extraEl = this.els.simExtraHours || root.querySelector('#sim-extra-hours');
    const pass = parseInt(passEl ? passEl.value : 0) || 0;
    const extraH = parseInt(extraEl ? extraEl.value : 0) || 0;
    const srcA = this.els.simSourceA ? this.els.simSourceA.value : '';
    const srcB = this.els.simSourceB ? this.els.simSourceB.value : '';

    const resA = this.computeRates(srcA, this.activeCohortKey, pass, extraH);
    const resB = this.computeRates(srcB, this.activeCohortKey, pass, extraH);

    // Use dedicated partial updater (cards + diff) — no full container rebuilds
    this.updateComparison(resA, resB);
  },

  renderRatesList() {
    const container = this.els.ratesContainer;
    if (!container) return;

    // Phase 2 thorough partial: preserve header (avoid re-stringify + re-insert on every CRUD/cohort action)
    let header = container.querySelector('.catalog-header');
    const hadHeader = !!header;

    // Remove only previous cards/empty states (keep header if present)
    Array.from(container.children).forEach(ch => {
      if (!ch.classList.contains('catalog-header')) ch.remove();
    });

    if (!hadHeader) {
      const headerHTML = `
        <div class="catalog-header">
          <span class="text-xs font-bold text-black uppercase tracking-wider">Ver Tarifas para:</span>
          <div class="catalog-header__select-wrapper">
            <select id="catalogue-cohort" onchange="window.YachtPricingScreen.renderRatesList()" class="catalog-header__select">
              ${Object.keys(this.pricingData).map(k => `<option value="${k}" ${k === this.activeCohortKey ? 'selected' : ''}>${this.pricingData[k].label}</option>`).join('')}
            </select>
            <div class="catalog-header__chevron"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg></div>
          </div>
        </div>`;
      container.insertAdjacentHTML('afterbegin', headerHTML);
      header = container.querySelector('.catalog-header');
    } else {
      // header preserved: optionally sync the select's visual selected without full rebuild
      const sel = header.querySelector('#catalogue-cohort');
      if (sel && sel.value !== this.activeCohortKey && !sel._userChanged) {
        // only auto-sync if user hasn't explicitly chosen different cohort in rates view
        // (we leave it; the select controls its own catalogueKey)
      }
    }

    const catalogueKey = (container.querySelector('#catalogue-cohort') && container.querySelector('#catalogue-cohort').value) || this.activeCohortKey;
    const sources = (this.pricingData[catalogueKey] && this.pricingData[catalogueKey].sources) || {};
    const keys = Object.keys(sources);

    if (keys.length === 0) {
      container.insertAdjacentHTML('beforeend', `
        <div style="background:white; padding:2rem; border-radius:1rem; text-align:center; color:#8E8E93; border:var(--border-subtle); grid-column:1/-1;">
          <svg viewBox="0 0 24 24" width="40" height="40" style="margin:0 auto 0.5rem; display:block; color:#d1d5db;" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          <p class="text-xs font-bold">No hay tarifas cargadas en esta duración</p>
        </div>`);
      return;
    }

    // Build cards via fragment for reduced thrash (batched DOM write)
    const frag = document.createDocumentFragment();
    keys.forEach(key => {
      const src = sources[key];
      const commPct = Math.round((src.commission || 0) * 100);
      let badgeClass = "comparison-card__badge comparison-card__badge--direct";
      if (src.type === 'hotel') badgeClass = "comparison-card__badge comparison-card__badge--hotel";
      if (src.type === 'agency') badgeClass = "comparison-card__badge comparison-card__badge--agency";

      const cardHTML = `
        <div class="rate-card">
          <div>
            <div class="rate-card__top">
              <div>
                <div class="flex items-center gap-2">
                  <h4 class="rate-card__title">${src.label}</h4>
                  <span class="${badgeClass}" style="font-size:0.5rem; padding:0.125rem 0.375rem;">${src.type || 'Directo'}</span>
                </div>
                <span class="rate-card__id">ID: ${key}</span>
              </div>
              <div class="rate-card__actions">
                <button type="button" data-action="copy" data-key="${key}" data-cohort="${catalogueKey}" class="rate-card__action-btn" title="Copiar a todas las horas">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9"/></svg>
                </button>
                <button type="button" data-action="edit" data-key="${key}" class="rate-card__action-btn" title="Editar">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
                </button>
                <button type="button" data-action="delete" data-key="${key}" data-cohort="${catalogueKey}" class="rate-card__action-btn rate-card__action-btn--danger" title="Eliminar">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4"/></svg>
                </button>
              </div>
            </div>
            <div class="rate-card__metrics">
              <div><span class="rate-card__metric-label">Base</span><span class="rate-card__metric-value">$${src["charter-price"]}</span></div>
              <div><span class="rate-card__metric-label">Pax Lim</span><span class="rate-card__metric-value">${src["base-passengers"] || 10}</span></div>
              <div><span class="rate-card__metric-label">H. Ext</span><span class="rate-card__metric-value">$${src["extra-hour"]}</span></div>
              <div><span class="rate-card__metric-label">Com.</span><span class="rate-card__metric-value rate-card__metric-value--accent">${commPct}%</span></div>
            </div>
          </div>
          <div id="confirm-del-${key}" class="delete-confirm hidden">
            <span class="delete-confirm__text">¿Eliminar?</span>
            <div class="delete-confirm__actions">
               <button type="button" data-action="cancel-del" data-key="${key}" class="delete-confirm__btn">No</button>
               <button type="button" data-action="confirm-del" data-key="${key}" data-cohort="${catalogueKey}" class="delete-confirm__btn delete-confirm__btn--danger">Sí</button>
            </div>
          </div>
        </div>`;
      // parse to node via temp container (safe for this size)
      const tmp = document.createElement('div');
      tmp.innerHTML = cardHTML.trim();
      frag.appendChild(tmp.firstElementChild);
    });
    container.appendChild(frag);

    // Delegate clicks (set only once to avoid accumulating; guarded by prop)
    if (!container._ratesDelegateWired) {
      container._ratesDelegateWired = true;
      container.onclick = (ev) => {
        const btn = ev.target.closest('button[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        const key = btn.dataset.key;
        const cohort = btn.dataset.cohort;
        if (action === 'copy') this.copySourceToAll(key, cohort);
        else if (action === 'edit') this.openFormModal(key);
        else if (action === 'delete') this.deleteSourceConfirm(key);
        else if (action === 'cancel-del') this.cancelDelete(key);
        else if (action === 'confirm-del') this.executeDelete(key, cohort);
      };
    }
  },

  openFormModal(sourceKey = null) {
    this.editingSourceKey = sourceKey;
    const root = this.els.root || this.container;
    const form = root.querySelector('#source-form');
    if (form) form.reset();

    const container = root.querySelector('#form-hourly-slots-container');
    if (container) container.innerHTML = `<label class="sheet-form__label" style="margin-bottom:0.5rem;">Tarifas por Slot de Hora</label>`;

    const titleSpan = root.querySelector('#form-title span');
    const keyInput = root.querySelector('#form-source-key');

    if (sourceKey) {
      if (titleSpan) titleSpan.innerText = "Editar Convenio de Precios";
      if (keyInput) { keyInput.value = sourceKey; keyInput.disabled = true; }

      let firstSrc = null;
      Object.keys(this.pricingData).forEach(c => {
        if (this.pricingData[c]?.sources?.[sourceKey]) firstSrc = this.pricingData[c].sources[sourceKey];
      });
      if (firstSrc) {
        if (root.querySelector('#form-source-label')) root.querySelector('#form-source-label').value = firstSrc.label || '';
        if (root.querySelector('#form-source-type')) root.querySelector('#form-source-type').value = firstSrc.type || 'direct';
        if (root.querySelector('#form-commission')) {
          root.querySelector('#form-commission').value = Math.round((firstSrc.commission || 0) * 100);
          this.syncCommissionFromSlider('form-commission', 'form-commission-input');
        }
      }
    } else {
      if (titleSpan) titleSpan.innerText = "Crear Nuevo Convenio";
      if (keyInput) { keyInput.value = ''; keyInput.disabled = false; }
      if (root.querySelector('#form-source-label')) root.querySelector('#form-source-label').value = '';
      if (root.querySelector('#form-source-type')) root.querySelector('#form-source-type').value = 'hotel';
      if (root.querySelector('#form-commission')) {
        root.querySelector('#form-commission').value = 35;
        this.syncCommissionFromSlider('form-commission', 'form-commission-input');
      }
    }

    // Dynamic slots
    const cohortKeys = Object.keys(this.pricingData);
    cohortKeys.forEach(cohort => {
      let charterPrice = '', extraPassenger = '', basePassengers = '14';
      if (sourceKey && this.pricingData[cohort]?.sources?.[sourceKey]) {
        const s = this.pricingData[cohort].sources[sourceKey];
        charterPrice = s["charter-price"] || '';
        extraPassenger = s["extra-passenger"] || '';
        basePassengers = s["base-passengers"] || '14';
      } else {
        const defaults = { "2": { price: 1600, extra: 75 }, "3": { price: 2200, extra: 75 }, "4": { price: 2800, extra: 75 }, "5": { price: 3400, extra: 75 }, "6": { price: 4000, extra: 75 }, "7": { price: 4500, extra: 75 }, "8": { price: 5000, extra: 75 } };
        charterPrice = (defaults[cohort] && defaults[cohort].price) || '';
        extraPassenger = (defaults[cohort] && defaults[cohort].extra) || '';
      }
      const slotHTML = `
        <div class="slot-row">
          <div class="slot-row__header"><span class="text-xs font-bold text-black flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span>Slot: ${cohort} Horas</span></span></div>
          <div class="slot-grid">
            <div class="slot-input"><span class="slot-input__label">Base ($)</span><input type="number" required min="0" step="any" data-cohort="${cohort}" data-field="charter-price" value="${charterPrice}" class="slot-input__field"></div>
            <div class="slot-input"><span class="slot-input__label">Pax Lim</span><input type="number" required min="1" data-cohort="${cohort}" data-field="base-passengers" value="${basePassengers}" class="slot-input__field"></div>
            <div class="slot-input"><span class="slot-input__label">Pax Ext ($)</span><input type="number" required min="0" step="any" data-cohort="${cohort}" data-field="extra-passenger" value="${extraPassenger}" class="slot-input__field"></div>
          </div>
        </div>`;
      if (container) container.insertAdjacentHTML('beforeend', slotHTML);
    });

    this.syncCommissionFromSlider('form-commission', 'form-commission-input');

    const sheet = root.querySelector('#bottom-sheet');
    if (sheet) {
      sheet.classList.remove('invisible', 'pointer-events-none');
      // Phase 2: gate forced reflow behind rAF (defers sync layout work, reduces main-thread jank/blip)
      requestAnimationFrame(() => {
        void sheet.offsetWidth;
        const bd = root.querySelector('#sheet-backdrop');
        const pn = root.querySelector('#sheet-panel');
        if (bd) bd.classList.add('opacity-100');
        if (pn) pn.classList.add('open');
      });
    }
    // Re-ensure Enter block in case of late DOM (dynamic slots)
    this._setupFormEnterBlock();
  },

  closeFormModal() {
    const root = this.els.root || this.container;
    const bd = root.querySelector('#sheet-backdrop');
    const pn = root.querySelector('#sheet-panel');
    if (bd) bd.classList.remove('opacity-100');
    if (pn) pn.classList.remove('open');
    setTimeout(() => {
      const sheet = root.querySelector('#bottom-sheet');
      if (sheet) sheet.classList.add('invisible', 'pointer-events-none');
    }, 380);
  },

  handleFormSubmit(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    // Defensive: ignore if somehow triggered outside intended submit path
    if (event.target && event.target.id && event.target.id !== 'source-form') return;
    const root = this.els.root || this.container;
    const keyInput = root.querySelector('#form-source-key');
    const key = keyInput ? keyInput.value.trim().toLowerCase().replace(/\s+/g, '_') : '';
    if (!key) { this.showToast("ID inválido", "error"); return; }

    const label = (root.querySelector('#form-source-label') || {}).value || '';
    const type = (root.querySelector('#form-source-type') || {}).value || 'direct';
    const commission = (parseInt((root.querySelector('#form-commission-input') || {}).value) || 0) / 100;

    if (this.editingSourceKey === null) {
      let exists = false;
      Object.keys(this.pricingData).forEach(c => { if (this.pricingData[c]?.sources?.[key]) exists = true; });
      if (exists) { this.showToast("Ya existe un origen con este ID", "error"); return; }
    }

    const container = root.querySelector('#form-hourly-slots-container');
    const baseInputs = container ? container.querySelectorAll('input[data-field="charter-price"]') : [];
    baseInputs.forEach(input => {
      const cohort = input.getAttribute('data-cohort');
      const charterPrice = parseFloat(input.value) || 0;
      const passengersInput = container.querySelector(`input[data-cohort="${cohort}"][data-field="base-passengers"]`);
      const basePass = parseInt(passengersInput ? passengersInput.value : 14) || 14;
      const extraInput = container.querySelector(`input[data-cohort="${cohort}"][data-field="extra-passenger"]`);
      const extraP = parseFloat(extraInput ? extraInput.value : 0) || 0;

      let extraH = 500;
      if (this.pricingData[cohort]?.sources?.[key] && this.pricingData[cohort].sources[key]["extra-hour"]) extraH = this.pricingData[cohort].sources[key]["extra-hour"];

      if (!this.pricingData[cohort].sources) this.pricingData[cohort].sources = {};
      this.pricingData[cohort].sources[key] = { label, type, "charter-price": charterPrice, "extra-hour": extraH, "extra-passenger": extraP, "base-passengers": basePass, commission };
    });

    this.saveStorage();
    this.renderRatesList();
    this.closeFormModal();
    this.showToast("Convenio guardado");
    this.updateComparisonSelectors();
    this.calculateAll();
  },

  syncCommissionFromSlider(sliderId, inputId, updatePreview = false) {
    const root = this.els.root || this.container;
    const slider = root.querySelector('#' + sliderId);
    const input = root.querySelector('#' + inputId);
    if (!slider || !input) return;
    let val = parseInt(slider.value) || 0;
    const cfg = FORM_CONFIG.commission;
    val = Math.max(cfg.min, Math.min(cfg.max, val));
    input.value = val;
    if (updatePreview && this.updateImportPreview) this.updateImportPreview();
  },

  syncCommissionFromInput(sliderId, inputId, updatePreview = false) {
    const root = this.els.root || this.container;
    const slider = root.querySelector('#' + sliderId);
    const input = root.querySelector('#' + inputId);
    if (!slider || !input) return;
    let val = parseInt(input.value) || 0;
    const cfg = FORM_CONFIG.commission;
    val = Math.max(cfg.min, Math.min(cfg.max, val));
    const step = cfg.step || 5;
    const snapped = Math.round(val / step) * step;
    slider.value = Math.max(cfg.min, Math.min(cfg.max, snapped));
    input.value = val;
    if (updatePreview && this.updateImportPreview) this.updateImportPreview();
  },

  setupCommissionInput(inputId, sliderId, updatePreview = false) {
    const root = this.els.root || this.container;
    const input = root.querySelector('#' + inputId);
    if (!input || input._commissionWired) return;
    input._commissionWired = true;
    input.addEventListener('blur', () => {
      const cfg = FORM_CONFIG.commission;
      let v = parseInt(input.value) || 0;
      v = Math.max(cfg.min, Math.min(cfg.max, v));
      input.value = v;
      const slider = root.querySelector('#' + sliderId);
      if (slider) {
        const step = cfg.step || 5;
        slider.value = Math.round(v / step) * step;
      }
      if (updatePreview && this.updateImportPreview) this.updateImportPreview();
    });
  },

  deleteSourceConfirm(key) {
    const root = this.els.root || this.container;
    const el = root.querySelector('#confirm-del-' + key);
    if (el) el.classList.remove('hidden');
  },

  cancelDelete(key) {
    const root = this.els.root || this.container;
    const el = root.querySelector('#confirm-del-' + key);
    if (el) el.classList.add('hidden');
  },

  executeDelete(key, cohort) {
    if (this.pricingData[cohort] && this.pricingData[cohort].sources) delete this.pricingData[cohort].sources[key];
    this.saveStorage();
    this.renderRatesList();
    this.showToast("Origen eliminado correctamente");
  },

  copySourceToAll(sourceKey, currentCohort) {
    const sourceToCopy = this.pricingData[currentCohort] && this.pricingData[currentCohort].sources[sourceKey];
    if (!sourceToCopy) return;
    Object.keys(this.pricingData).forEach(cohort => {
      if (!this.pricingData[cohort].sources) this.pricingData[cohort].sources = {};
      this.pricingData[cohort].sources[sourceKey] = JSON.parse(JSON.stringify(sourceToCopy));
    });
    this.saveStorage();
    this.showToast(`Tarifa "${sourceToCopy.label}" copiada a todas las duraciones.`);
    this.renderRatesList();
  },

  openImportModal() {
    const root = this.els.root || this.container;
    const form = root.querySelector('#import-form');
    if (form) form.reset();

    const setVal = (id, v) => { const el = root.querySelector('#' + id); if (el) el.value = v; };
    setVal('import-source-key', '');
    setVal('import-source-label', '');
    setVal('import-preset-selector', 'hacienda_real');
    setVal('import-price-modifier', '0');
    setVal('import-commission', '35');
    setVal('import-source-type', 'hotel');

    this.updateImportPresetView();
    this.syncCommissionFromSlider('import-commission', 'import-commission-input', true);
    this.updateImportPreview();

    const sheet = root.querySelector('#import-sheet');
    if (sheet) {
      sheet.classList.remove('invisible', 'pointer-events-none');
      // Phase 2: gate forced reflow behind rAF
      requestAnimationFrame(() => {
        void sheet.offsetWidth;
        const bd = root.querySelector('#import-sheet-backdrop');
        const pn = root.querySelector('#import-sheet-panel');
        if (bd) bd.classList.add('opacity-100');
        if (pn) pn.classList.add('open');
      });
    }
    this._setupFormEnterBlock();
  },

  closeImportModal() {
    const root = this.els.root || this.container;
    const bd = root.querySelector('#import-sheet-backdrop');
    const pn = root.querySelector('#import-sheet-panel');
    if (bd) bd.classList.remove('opacity-100');
    if (pn) pn.classList.remove('open');
    setTimeout(() => {
      const s = root.querySelector('#import-sheet');
      if (s) s.classList.add('invisible', 'pointer-events-none');
    }, 380);
  },

  updateImportPresetView() {
    const root = this.els.root || this.container;
    const preset = (root.querySelector('#import-preset-selector') || {}).value;
    const jsonC = root.querySelector('#import-json-container');
    const setVal = (id, v) => { const el = root.querySelector('#' + id); if (el) el.value = v; };

    if (preset === 'json_custom') {
      if (jsonC) jsonC.classList.remove('hidden');
      const jsonEl = root.querySelector('#import-json-data');
      if (jsonEl) jsonEl.value = JSON.stringify(IMPORT_PRESETS.hacienda_real, null, 2);
    } else {
      if (jsonC) jsonC.classList.add('hidden');
      if (preset === 'hacienda_real') {
        setVal('import-source-key', 'hacienda_vip');
        setVal('import-source-label', 'Hacienda Encantada VIP');
        setVal('import-source-type', 'hotel');
        setVal('import-commission', '35');
      } else if (preset === 'direct_base') {
        setVal('import-source-key', 'directo_premium');
        setVal('import-source-label', 'Directo Premium');
        setVal('import-source-type', 'direct');
        setVal('import-commission', '0');
      }
    }
    this.syncCommissionFromSlider('import-commission', 'import-commission-input', true);
    this.updateImportPreview();
  },

  getPresetData() {
    const root = this.els.root || this.container;
    const preset = (root.querySelector('#import-preset-selector') || {}).value;
    if (preset === 'json_custom') {
      try {
        const raw = (root.querySelector('#import-json-data') || {}).value || '';
        return JSON.parse(raw.trim());
      } catch (e) { return null; }
    }
    return IMPORT_PRESETS[preset] || null;
  },

  updateImportPreview() {
    const root = this.els.root || this.container;
    const tbody = root.querySelector('#import-preview-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const presetData = this.getPresetData();
    if (!presetData) {
      tbody.innerHTML = `<tr><td colspan="5" style="padding:1rem; text-align:center; color:#ef4444; font-weight:700;">Formato JSON inválido.</td></tr>`;
      return;
    }

    const modifier = parseFloat((root.querySelector('#import-price-modifier') || {}).value) || 0;
    const commissionVal = parseInt((root.querySelector('#import-commission-input') || {}).value) || 0;

    // Build rows with fragment to avoid repeated innerHTML+= thrash (Phase 2)
    const frag = document.createDocumentFragment();
    Object.keys(presetData).forEach(hour => {
      const item = presetData[hour];
      if (!item) return;
      const basePrice = parseFloat(item['charter-price']) || 0;
      const extraP = parseFloat(item['extra-passenger']) || 0;
      const bp = parseInt(item['base-passengers']) || 14;
      const finalBase = Math.round(basePrice * (1 + modifier));
      const finalExtra = Math.round(extraP * (1 + modifier));
      const tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid rgba(0,0,0,0.02)';
      tr.innerHTML = `<td style="padding:0.625rem; font-weight:600;">${hour} Horas</td><td style="padding:0.625rem; text-align:right; color:#059669; font-weight:700;">$${finalBase} USD</td><td style="padding:0.625rem; text-align:center; font-weight:500;">${bp} Pax</td><td style="padding:0.625rem; text-align:right; font-weight:500;">$${finalExtra} USD</td><td style="padding:0.625rem; text-align:right; color:var(--color-accent-blue); font-weight:700;">${commissionVal}%</td>`;
      frag.appendChild(tr);
    });
    tbody.appendChild(frag);
  },

  handleImportSubmit(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.target && event.target.id && event.target.id !== 'import-form') return;
    const root = this.els.root || this.container;
    const keyInput = root.querySelector('#import-source-key');
    const key = keyInput ? keyInput.value.trim().toLowerCase().replace(/\s+/g, '_') : '';
    if (!key) { this.showToast("ID inválido", "error"); return; }

    const label = (root.querySelector('#import-source-label') || {}).value || '';
    const type = (root.querySelector('#import-source-type') || {}).value || 'hotel';
    const modifier = parseFloat((root.querySelector('#import-price-modifier') || {}).value) || 0;
    const commission = (parseInt((root.querySelector('#import-commission-input') || {}).value) || 0) / 100;

    const presetData = this.getPresetData();
    if (!presetData) { this.showToast("No se pudo leer la plantilla", "error"); return; }

    let already = false;
    Object.keys(this.pricingData).forEach(c => { if (this.pricingData[c]?.sources && this.pricingData[c].sources[key]) already = true; });
    if (already) { this.showToast("Ya existe un origen con este ID", "error"); return; }

    Object.keys(presetData).forEach(cohort => {
      if (!this.pricingData[cohort]) this.pricingData[cohort] = { label: `${cohort} horas`, "label-short": `${cohort}hrs`, sources: {} };
      const baseItem = presetData[cohort];
      const bp = Math.round((parseFloat(baseItem['charter-price']) || 0) * (1 + modifier));
      const ep = Math.round((parseFloat(baseItem['extra-passenger']) || 0) * (1 + modifier));
      const eh = parseFloat(baseItem['extra-hour']) || 500;
      const bpass = parseInt(baseItem['base-passengers']) || 14;
      this.pricingData[cohort].sources[key] = { label, type, "charter-price": bp, "extra-hour": eh, "extra-passenger": ep, "base-passengers": bpass, commission };
    });

    this.saveStorage();
    this.renderRatesList();
    this.closeImportModal();
    this.showToast(`Convenio "${label}" importado.`);
    this.updateComparisonSelectors();
    this.calculateAll();
  },

  handleCopyReport() {
    const root = this.els.root || this.container;
    const passEl = root.querySelector('#sim-passengers');
    const extraEl = root.querySelector('#sim-extra-hours');
    const pass = passEl ? passEl.value : '0';
    const extra = extraEl ? extraEl.value : '0';
    const srcA = this.els.simSourceA ? (this.els.simSourceA.options[this.els.simSourceA.selectedIndex] || {}).text || this.els.simSourceA.value : '';
    const srcB = this.els.simSourceB ? (this.els.simSourceB.options[this.els.simSourceB.selectedIndex] || {}).text || this.els.simSourceB.value : '';
    const cardA = this.els.cardPanelA ? this.els.cardPanelA.innerText.trim().replace(/\s+/g, ' ') : '';
    const cardB = this.els.cardPanelB ? this.els.cardPanelB.innerText.trim().replace(/\s+/g, ' ') : '';
    const diff = this.els.diffBanner ? this.els.diffBanner.innerText.trim().replace(/\s+/g, ' ') : '';

    const text = `REPORTE COMPARATIVO YATES\nCohorte: ${this.activeCohortKey}h | Pax: ${pass} | Hrs Extra: ${extra}\n\nA: ${srcA}\n${cardA}\n\nB: ${srcB}\n${cardB}\n\n${diff}\n\nGenerado: ${new Date().toLocaleString('es-MX')}`;

    const doToast = (msg, t = 'success') => this.showToast(msg, t);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => doToast('Reporte copiado al portapapeles')).catch(() => this._fallbackCopy(text, doToast));
    } else {
      this._fallbackCopy(text, doToast);
    }
  },

  _fallbackCopy(text, toastFn) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      toastFn(ok ? 'Reporte copiado' : 'No se pudo copiar', ok ? 'success' : 'error');
    } catch (e) {
      toastFn('Clipboard no disponible', 'error');
    }
  },

  // Toast delegation (replaces original showToast)
  showToast(message, type = 'success') {
    if (window.Toast && window.Toast[type]) {
      window.Toast[type](message);
    } else if (window.Toast && window.Toast.success) {
      window.Toast.success(message);
    } else {
      // Fallback
      console[type === 'error' ? 'error' : 'log']('[YachtPricing]', message);
    }
  }
};

// Expose for inline onclick="window.YachtPricingScreen.xxx()" handlers in templates
window.YachtPricingScreen = YachtPricingScreen;

// Data constants (exact from source for parity)
const DEFAULT_PRICING_DATA = {
  "2": { "label": "2 horas", "label-short": "2hrs", "sources": { "direct": { "label": "Directo", "type": "direct", "charter-price": 1600, "extra-hour": 500, "extra-passenger": 75, "base-passengers": 10, "commission": 0 }, "hacienda_encantada": { "label": "Hacienda Encantada", "type": "hotel", "charter-price": 1850, "extra-hour": 500, "extra-passenger": 87, "base-passengers": 14, "commission": 0.35 } } },
  "3": { "label": "3 horas", "label-short": "3hrs", "sources": { "direct": { "label": "Directo", "type": "direct", "charter-price": 2200, "extra-hour": 500, "extra-passenger": 75, "base-passengers": 10, "commission": 0 }, "hacienda_encantada": { "label": "Hacienda Encantada", "type": "hotel", "charter-price": 2770, "extra-hour": 500, "extra-passenger": 97, "base-passengers": 14, "commission": 0.35 } } },
  "4": { "label": "4 horas", "label-short": "4hrs", "sources": { "direct": { "label": "Directo", "type": "direct", "charter-price": 2800, "extra-hour": 500, "extra-passenger": 75, "base-passengers": 10, "commission": 0 }, "hacienda_encantada": { "label": "Hacienda Encantada", "type": "hotel", "charter-price": 3693, "extra-hour": 500, "extra-passenger": 110, "base-passengers": 14, "commission": 0.35 } } },
  "5": { "label": "5 horas", "label-short": "5hrs", "sources": { "direct": { "label": "Directo", "type": "direct", "charter-price": 3400, "extra-hour": 500, "extra-passenger": 75, "base-passengers": 10, "commission": 0 }, "hacienda_encantada": { "label": "Hacienda Encantada", "type": "hotel", "charter-price": 4616, "extra-hour": 500, "extra-passenger": 148, "base-passengers": 14, "commission": 0.35 } } },
  "6": { "label": "6 horas", "label-short": "6hrs", "sources": { "direct": { "label": "Directo", "type": "direct", "charter-price": 4000, "extra-hour": 500, "extra-passenger": 75, "base-passengers": 10, "commission": 0 }, "hacienda_encantada": { "label": "Hacienda Encantada", "type": "hotel", "charter-price": 5010, "extra-hour": 500, "extra-passenger": 169, "base-passengers": 14, "commission": 0.35 } } },
  "7": { "label": "7 horas", "label-short": "7hrs", "sources": { "direct": { "label": "Directo", "type": "direct", "charter-price": 4500, "extra-hour": 500, "extra-passenger": 75, "base-passengers": 10, "commission": 0 }, "hacienda_encantada": { "label": "Hacienda Encantada", "type": "hotel", "charter-price": 5405, "extra-hour": 500, "extra-passenger": 189, "base-passengers": 14, "commission": 0.35 } } },
  "8": { "label": "8 horas", "label-short": "8hrs", "sources": { "direct": { "label": "Directo", "type": "direct", "charter-price": 5000, "extra-hour": 500, "extra-passenger": 75, "base-passengers": 10, "commission": 0 }, "hacienda_encantada": { "label": "Hacienda Encantada", "type": "hotel", "charter-price": 5800, "extra-hour": 500, "extra-passenger": 210, "base-passengers": 14, "commission": 0.35 } } }
};

const FORM_CONFIG = { commission: { min: 0, max: 100, step: 5, default: 35 } };

const IMPORT_PRESETS = {
  "hacienda_real": { "2": { "charter-price": 1850, "extra-hour": 500, "extra-passenger": 87, "base-passengers": 14 }, "3": { "charter-price": 2770, "extra-hour": 500, "extra-passenger": 97, "base-passengers": 14 }, "4": { "charter-price": 3693, "extra-hour": 500, "extra-passenger": 110, "base-passengers": 14 }, "5": { "charter-price": 4616, "extra-hour": 500, "extra-passenger": 148, "base-passengers": 14 }, "6": { "charter-price": 5010, "extra-hour": 500, "extra-passenger": 169, "base-passengers": 14 }, "7": { "charter-price": 5405, "extra-hour": 500, "extra-passenger": 189, "base-passengers": 14 }, "8": { "charter-price": 5800, "extra-hour": 500, "extra-passenger": 210, "base-passengers": 14 } },
  "direct_base": { "2": { "charter-price": 1600, "extra-hour": 500, "extra-passenger": 75, "base-passengers": 10 }, "3": { "charter-price": 2200, "extra-hour": 500, "extra-passenger": 75, "base-passengers": 10 }, "4": { "charter-price": 2800, "extra-hour": 500, "extra-passenger": 75, "base-passengers": 10 }, "5": { "charter-price": 3400, "extra-hour": 500, "extra-passenger": 75, "base-passengers": 10 }, "6": { "charter-price": 4000, "extra-hour": 500, "extra-passenger": 75, "base-passengers": 10 }, "7": { "charter-price": 4500, "extra-hour": 500, "extra-passenger": 75, "base-passengers": 10 }, "8": { "charter-price": 5000, "extra-hour": 500, "extra-passenger": 75, "base-passengers": 10 } }
};
