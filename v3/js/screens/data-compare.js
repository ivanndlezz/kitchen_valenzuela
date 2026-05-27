/**
 * Data Compare Screen — Love Shack v3
 * Tabla comparativa: LocalStorage vs reservations.json vs Airtable
 */

const DataCompareScreen = {
  container: null,
  localData: [],
  jsonData: [],
  airtableData: [],
  isLoading: false,

  async render(container) {
    this.container = container;
    this.renderSkeleton();
    await this.loadAllSources();
    this.renderTable();
  },

  renderSkeleton() {
    this.container.innerHTML = `
      <div class="step-content stagger-children" id="compare-screen">
        <div class="compare-header">
          <div class="compare-title-row">
            <div>
              <h1 class="compare-title">Data Compare</h1>
              <p class="compare-subtitle">Comparativa de fuentes de datos</p>
            </div>
            <div class="compare-header-actions" style="display: flex; gap: 8px; align-items: center;">
              <button class="compare-refresh-btn" id="compare-airtable-btn" aria-label="Import Airtable to JSON">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Airtable a JSON
              </button>
              <button class="compare-refresh-btn" id="compare-refresh-btn" aria-label="Refresh data">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                  <path d="M21 2v6h-6"/>
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
                  <path d="M3 22v-6h6"/>
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
                </svg>
                Refresh
              </button>
            </div>
          </div>

          <!-- Source Legend -->
          <div class="compare-legend">
            <div class="legend-item">
              <span class="legend-dot local"></span>
              <span>LocalStorage</span>
            </div>
            <div class="legend-item">
              <span class="legend-dot json"></span>
              <span>reservations.json</span>
            </div>
            <div class="legend-item">
              <span class="legend-dot airtable"></span>
              <span>Airtable</span>
            </div>
          </div>
        </div>

        <!-- Summary Cards -->
        <div class="compare-summary-grid" id="compare-summary">
          ${[0,1,2].map(i => `
            <div class="compare-card skeleton-card">
              <div class="skeleton-line short"></div>
              <div class="skeleton-line"></div>
            </div>
          `).join('')}
        </div>

        <!-- Loading state -->
        <div class="compare-loading" id="compare-loading">
          <div class="compare-spinner"></div>
          <p>Cargando y comparando datos...</p>
        </div>

        <div id="compare-table-wrapper" style="display:none;"></div>
      </div>

      <!-- Detail Side/Bottom Sheet Overlay -->
      <div class="compare-sheet-overlay" id="compare-sheet-overlay">
        <div class="compare-sheet-scrim" id="compare-sheet-scrim"></div>
        <div class="compare-sheet" id="compare-detail-sheet">
          <div class="compare-sheet-header">
            <h2 class="compare-sheet-title">Detalles de la Reserva</h2>
            <button class="compare-sheet-close" id="compare-sheet-close" aria-label="Cerrar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="compare-sheet-body" id="compare-sheet-body"></div>
        </div>
      </div>
    `;

    document.getElementById('compare-airtable-btn')?.addEventListener('click', async () => {
      const btn = document.getElementById('compare-airtable-btn');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="spinning">
            <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
            <path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
          </svg>
          Cargando…
        `;
      }
      try {
        if (window.SyncManager) {
          await window.SyncManager.importAirtableToJSON();
        } else {
          window.Toast?.error("SyncManager no cargado");
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Airtable a JSON
          `;
        }
        await this.refresh();
      }
    });

    document.getElementById('compare-refresh-btn')?.addEventListener('click', async () => {
      await this.refresh();
    });

    document.getElementById('compare-sheet-close')?.addEventListener('click', () => {
      this.closeDetailSheet();
    });

    document.getElementById('compare-sheet-scrim')?.addEventListener('click', () => {
      this.closeDetailSheet();
    });
  },

  async loadAllSources() {
    // 1. LocalStorage
    this.localData = window.Storage.getAllReservations();

    // 2. reservations.json (relative path from /v3/)
    try {
      const resp = await fetch('./data/reservations.json?t=' + Date.now());
      if (resp.ok) {
        this.jsonData = await resp.json();
      } else {
        this.jsonData = [];
      }
    } catch (e) {
      console.warn('DataCompare: Could not load reservations.json', e);
      this.jsonData = [];
    }

    // 3. Airtable — read airtable_id presence from local data
    // We read from localStorage which ones are synced to Airtable
    this.airtableData = this.localData.filter(r => r.airtable_id && r.sync_status === 'synced');
  },

  buildMasterIndex() {
    const map = new Map();

    const addEntry = (id, source, record) => {
      if (!map.has(id)) {
        map.set(id, { id, local: null, json: null, airtable: null });
      }
      map.get(id)[source] = record;
    };

    this.localData.forEach(r => addEntry(r.id, 'local', r));
    this.jsonData.forEach(r => addEntry(r.id, 'json', r));
    this.airtableData.forEach(r => addEntry(r.id, 'airtable', r));

    return Array.from(map.values());
  },

  getStatus(row) {
    const hasLocal = !!row.local;
    const hasJson = !!row.json;
    const hasAirtable = !!row.airtable;

    if (hasLocal && hasJson && hasAirtable) return { label: 'Sincronizado', type: 'synced' };
    if (hasLocal && hasJson && !hasAirtable) return { label: 'Sin Nube', type: 'no-cloud' };
    if (hasLocal && !hasJson && hasAirtable) return { label: 'Sin JSON', type: 'no-json' };
    if (!hasLocal && hasJson && !hasAirtable) return { label: 'Solo JSON', type: 'json-only' };
    if (hasLocal && !hasJson && !hasAirtable) return { label: 'Solo Local', type: 'local-only' };
    if (!hasLocal && !hasJson && hasAirtable) return { label: 'Solo Nube', type: 'cloud-only' };
    return { label: 'Desconocido', type: 'unknown' };
  },

  formatDate(iso) {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('es-MX', { month: 'short', day: 'numeric', year: '2-digit' });
    } catch { return iso; }
  },

  getName(row) {
    const r = row.local || row.json || row.airtable;
    // v3 nested format
    if (r?.data?.step2_details?.customerName) return r.data.step2_details.customerName;
    // Legacy flat format
    return r?.guestName || r?.contactName || r?.name || '—';
  },

  getTripDate(row) {
    const r = row.local || row.json || row.airtable;
    if (r?.data?.step2_details?.tripDate) return r.data.step2_details.tripDate;
    return r?.reservationDate || r?.tripDate || '—';
  },

  getStatusLabel(row) {
    const r = row.local || row.json || row.airtable;
    return r?.status || '—';
  },

  getPrice(row) {
    const r = row.local || row.json || row.airtable;
    const price = r?.data?.step3_adjustments?.finalCustomerPrice || r?.totalPrice || 0;
    if (!price) return '—';
    return `$${Number(price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  },

  checkMark(hasIt) {
    if (hasIt) return `<span class="check-yes">✓</span>`;
    return `<span class="check-no">✗</span>`;
  },

  renderTable() {
    const loading = document.getElementById('compare-loading');
    const wrapper = document.getElementById('compare-table-wrapper');
    const summaryEl = document.getElementById('compare-summary');

    if (loading) loading.style.display = 'none';
    if (wrapper) wrapper.style.display = '';

    const master = this.buildMasterIndex();
    const total = master.length;
    const fullySynced = master.filter(r => r.local && r.json && r.airtable).length;
    const localOnly = master.filter(r => r.local && !r.json && !r.airtable).length;
    const conflicts = master.filter(r => {
      if (!r.local || !r.json) return false;
      const localUpdated = r.local.updatedAt;
      const jsonUpdated = r.json.updatedAt;
      return localUpdated && jsonUpdated && localUpdated !== jsonUpdated;
    }).length;
    const noCloud = master.filter(r => r.local && !r.airtable).length;

    // Summary cards
    if (summaryEl) {
      summaryEl.innerHTML = `
        <div class="compare-card">
          <div class="compare-card-value">${total}</div>
          <div class="compare-card-label">Total únicos</div>
        </div>
        <div class="compare-card">
          <div class="compare-card-value" style="color: var(--color-success);">${fullySynced}</div>
          <div class="compare-card-label">Sincronizados</div>
        </div>
        <div class="compare-card">
          <div class="compare-card-value" style="color: var(--color-warning);">${noCloud}</div>
          <div class="compare-card-label">Sin Nube</div>
        </div>
        <div class="compare-card">
          <div class="compare-card-value" style="color: var(--color-danger);">${conflicts}</div>
          <div class="compare-card-label">Conflictos</div>
        </div>
      `;
    }

    // Source count banners
    const sourceBanners = `
      <div class="compare-source-banners">
        <div class="source-banner local">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
          </svg>
          <div>
            <div class="source-banner-count">${this.localData.length}</div>
            <div class="source-banner-label">LocalStorage</div>
          </div>
        </div>
        <div class="source-banner json">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <div>
            <div class="source-banner-count">${this.jsonData.length}</div>
            <div class="source-banner-label">reservations.json</div>
          </div>
        </div>
        <div class="source-banner airtable">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
            <path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
          </svg>
          <div>
            <div class="source-banner-count">${this.airtableData.length}</div>
            <div class="source-banner-label">Airtable (Nube)</div>
          </div>
        </div>
      </div>
    `;

    // Filter tabs
    let activeFilter = 'all';
    const renderRows = (filter) => {
      let rows = master;
      if (filter === 'conflicts') rows = master.filter(r => {
        if (!r.local || !r.json) return false;
        return r.local.updatedAt && r.json.updatedAt && r.local.updatedAt !== r.json.updatedAt;
      });
      if (filter === 'missing-cloud') rows = master.filter(r => r.local && !r.airtable);
      if (filter === 'local-only') rows = master.filter(r => r.local && !r.json && !r.airtable);
      if (filter === 'synced') rows = master.filter(r => r.local && r.json && r.airtable);

      if (rows.length === 0) {
        return `<div class="compare-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:40px;height:40px;color:var(--color-text-tertiary);margin-bottom:12px;">
            <circle cx="12" cy="12" r="10"/><path d="M8 15s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
          </svg>
          <p>No hay registros en esta categoría</p>
        </div>`;
      }

      return rows.map(row => {
        const status = this.getStatus(row);
        const name = this.getName(row);
        const tripDate = this.getTripDate(row);
        const statusLabel = this.getStatusLabel(row);
        const price = this.getPrice(row);
        const updatedLocal = this.formatDate(row.local?.updatedAt);
        const updatedJson = this.formatDate(row.json?.updatedAt);

        const hasConflict = row.local && row.json
          && row.local.updatedAt && row.json.updatedAt
          && row.local.updatedAt !== row.json.updatedAt;

        return `
          <tr class="compare-row ${hasConflict ? 'has-conflict' : ''}" data-id="${row.id}">
            <td class="compare-cell name-cell">
              <div class="cell-name">${name}</div>
              <div class="cell-id">${row.id?.substring(0, 20)}…</div>
            </td>
            <td class="compare-cell">
              <span class="trip-date">${tripDate !== '—' ? tripDate : '—'}</span>
            </td>
            <td class="compare-cell center">
              ${this.checkMark(!!row.local)}
              ${updatedLocal !== '—' ? `<div class="cell-date-sub">${updatedLocal}</div>` : ''}
            </td>
            <td class="compare-cell center">
              ${this.checkMark(!!row.json)}
              ${updatedJson !== '—' ? `<div class="cell-date-sub">${updatedJson}</div>` : ''}
            </td>
            <td class="compare-cell center">
              ${this.checkMark(!!row.airtable)}
              ${row.airtable ? `<div class="cell-date-sub">linked</div>` : ''}
            </td>
            <td class="compare-cell">
              <span class="sync-badge sync-badge--${status.type}">${status.label}</span>
            </td>
            <td class="compare-cell price-cell">${price}</td>
          </tr>
        `;
      }).join('');
    };

    const tableHtml = `
      <div class="compare-filter-tabs" id="compare-filter-tabs">
        <button class="compare-tab active" data-filter="all">Todos <span class="tab-count">${total}</span></button>
        <button class="compare-tab" data-filter="synced">Sincronizados <span class="tab-count">${fullySynced}</span></button>
        <button class="compare-tab" data-filter="missing-cloud">Sin Nube <span class="tab-count">${noCloud}</span></button>
        <button class="compare-tab" data-filter="conflicts">Conflictos <span class="tab-count">${conflicts}</span></button>
        <button class="compare-tab" data-filter="local-only">Solo Local <span class="tab-count">${localOnly}</span></button>
      </div>

      <div class="compare-table-container">
        <table class="compare-table" id="compare-table">
          <thead>
            <tr>
              <th>Reservación</th>
              <th>Fecha Viaje</th>
              <th class="center source-col local-col">
                <span class="th-dot local"></span>Local
              </th>
              <th class="center source-col json-col">
                <span class="th-dot json"></span>JSON
              </th>
              <th class="center source-col airtable-col">
                <span class="th-dot airtable"></span>Nube
              </th>
              <th>Estado Sync</th>
              <th>Precio</th>
            </tr>
          </thead>
          <tbody id="compare-tbody">
            ${renderRows('all')}
          </tbody>
        </table>
      </div>
    `;

    wrapper.innerHTML = sourceBanners + tableHtml;

    // Bind row clicks for details comparison sheet
    wrapper.addEventListener('click', (e) => {
      const rowEl = e.target.closest('.compare-row');
      if (!rowEl) return;

      const rId = rowEl.dataset.id;
      if (rId) {
        this.openDetailSheet(rId);
      }
    });

    // Bind filter tabs
    document.getElementById('compare-filter-tabs')?.addEventListener('click', (e) => {
      const tab = e.target.closest('[data-filter]');
      if (!tab) return;
      document.querySelectorAll('.compare-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const filter = tab.dataset.filter;
      const tbody = document.getElementById('compare-tbody');
      if (tbody) tbody.innerHTML = renderRows(filter);
    });
  },

  async refresh() {
    const btn = document.getElementById('compare-refresh-btn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" class="spinning">
          <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
          <path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
        </svg>
        Cargando…
      `;
    }

    await this.loadAllSources();
    this.renderTable();

    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
          <path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
        </svg>
        Refresh
      `;
    }
  },

  getFieldVal(r, fieldKey) {
    if (!r) return null;
    switch (fieldKey) {
      case 'id': return r.id || r.UUID || null;
      case 'status': return r.status || null;
      case 'name': return r.data?.step2_details?.customerName || r.guestName || r.contactName || r.name || null;
      case 'email': return r.data?.step2_details?.customerEmail || r.guestEmail || r.email || null;
      case 'phone': return r.data?.step2_details?.customerPhone || r.guestPhone || r.phone || null;
      case 'tour': return r.data?.step2_details?.tourType || r.tourType || r.TOUR_type || null;
      case 'date': return r.data?.step2_details?.tripDate || r.reservationDate || r.tripDate || r.trip_DATE || null;
      case 'start': return r.data?.step2_details?.startTime || r.startTime || r.START_time || null;
      case 'end': return r.data?.step2_details?.endTime || r.endTime || r.END_time || null;
      case 'pax': return r.data?.step1_pricing?.passengers || r.passengers || r.pax || null;
      case 'source': return r.data?.step3_adjustments?.bookingSource || r.bookingSource || r.source || null;
      case 'price': return r.data?.step3_adjustments?.finalCustomerPrice || r.totalPrice || r.CUSTOMER_price || r.price || null;
      case 'businessPrice': return r.data?.step3_adjustments?.finalBusinessPrice || r.BUSINESS_price || null;
      case 'updated': return r.updatedAt || null;
      default: return null;
    }
  },

  hasDiscrepancy(row, fieldKey) {
    const vals = [];
    if (row.local) vals.push(this.getFieldVal(row.local, fieldKey));
    if (row.json) vals.push(this.getFieldVal(row.json, fieldKey));
    if (row.airtable) vals.push(this.getFieldVal(row.airtable, fieldKey));
    
    const presentVals = vals.filter(v => v !== null && v !== undefined);
    if (presentVals.length <= 1) return false;
    
    const first = String(presentVals[0]).trim().toLowerCase();
    return presentVals.some(v => String(v).trim().toLowerCase() !== first);
  },

  openDetailSheet(id) {
    const master = this.buildMasterIndex();
    const row = master.find(r => r.id === id);
    if (!row) return;

    const overlay = document.getElementById('compare-sheet-overlay');
    const body = document.getElementById('compare-sheet-body');
    if (!overlay || !body) return;

    const status = this.getStatus(row);
    const name = this.getName(row);
    
    let bodyHTML = `
      <div class="sheet-detail-header">
        <div class="sheet-detail-name">${name}</div>
        <div class="sheet-detail-uuid">${id}</div>
        <div style="margin-top: 10px;">
          <span class="sync-badge sync-badge--${status.type}">${status.label}</span>
        </div>
      </div>
      
      <div class="compare-sheet-table-wrapper">
        <table class="compare-detail-table">
          <thead>
            <tr>
              <th>Campo</th>
              <th><span class="legend-dot local"></span>Local</th>
              <th><span class="legend-dot json"></span>JSON</th>
              <th><span class="legend-dot airtable"></span>Nube</th>
            </tr>
          </thead>
          <tbody>
    `;

    const FIELDS_TO_COMPARE = [
      { key: 'id', label: 'UUID / ID' },
      { key: 'status', label: 'Estado' },
      { key: 'name', label: 'Cliente' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Teléfono' },
      { key: 'tour', label: 'Tour' },
      { key: 'date', label: 'Fecha viaje' },
      { key: 'time', label: 'Horario', format: (r) => {
          const start = this.getFieldVal(r, 'start');
          const end = this.getFieldVal(r, 'end');
          if (!start && !end) return '—';
          return `${start || '?'}-${end || '?'}`;
        }
      },
      { key: 'pax', label: 'Pasajeros (Pax)' },
      { key: 'source', label: 'Origen' },
      { key: 'price', label: 'Precio C.', format: (r) => {
          const p = this.getFieldVal(r, 'price');
          if (!p) return '—';
          return `$${Number(p).toLocaleString('en-US')}`;
        }
      },
      { key: 'businessPrice', label: 'Precio N.', format: (r) => {
          const p = this.getFieldVal(r, 'businessPrice');
          if (!p) return '—';
          return `$${Number(p).toLocaleString('en-US')}`;
        }
      },
      { key: 'updated', label: 'Actualizado', format: (r) => {
          const date = this.getFieldVal(r, 'updated');
          if (!date) return '—';
          return this.formatDate(date);
        }
      }
    ];

    FIELDS_TO_COMPARE.forEach(f => {
      const hasConflict = this.hasDiscrepancy(row, f.key);
      
      const getValStr = (r) => {
        if (!r) return `<span class="val-empty">No existe</span>`;
        if (f.format) return f.format(r);
        return this.getFieldVal(r, f.key) || '—';
      };

      bodyHTML += `
        <tr class="detail-field-row ${hasConflict ? 'field-conflict' : ''}">
          <td class="field-label-col">
            ${f.label}
            ${hasConflict ? `
              <span class="conflict-indicator" title="Discrepancia detectada">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </span>` : ''
            }
          </td>
          <td class="field-val-col">${getValStr(row.local)}</td>
          <td class="field-val-col">${getValStr(row.json)}</td>
          <td class="field-val-col">${getValStr(row.airtable)}</td>
        </tr>
      `;
    });

    // Render Actions Section
    let actionsHTML = `
      <div class="sheet-actions-section">
        <h3 class="sheet-actions-title">Acciones de Sincronización</h3>
        <div class="sheet-actions-grid">
    `;

    // 1. Local to Airtable (Nube)
    if (row.local) {
      const isSynced = row.airtable ? true : false;
      actionsHTML += `
        <button class="sheet-action-btn action-airtable" id="action-sync-airtable">
          <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 2v6h-6"></path><path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
            <path d="M3 22v-6h6"></path><path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
          </svg>
          ${isSynced ? 'Re-sincronizar a Airtable' : 'Subir a Airtable'}
        </button>
      `;
    }

    // 2. Local to JSON
    if (row.local) {
      actionsHTML += `
        <button class="sheet-action-btn action-json" id="action-sync-json">
          <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
          </svg>
          Guardar a reservations.json
        </button>
      `;
    }

    // 3. JSON to Local (Import/Overwrite)
    if (row.json) {
      const hasConflict = row.local && row.json && row.local.updatedAt !== row.json.updatedAt;
      actionsHTML += `
        <button class="sheet-action-btn action-import-json ${hasConflict ? 'highlight-warning' : ''}" id="action-import-json">
          <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Sobrescribir Local con JSON
        </button>
      `;
    }

    // 4. Airtable to Local (Import/Overwrite)
    if (row.airtable) {
      actionsHTML += `
        <button class="sheet-action-btn action-import-airtable" id="action-import-airtable">
          <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Sobrescribir Local con Airtable
        </button>
      `;
    }

    // 5. Borrar Reservación
    actionsHTML += `
      <button class="sheet-action-btn action-delete-reservation" id="action-delete-reservation" style="border-color: var(--color-danger); color: var(--color-danger); background: var(--color-danger-muted);">
        <svg class="action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
        Borrar Reservación
      </button>
    `;

    actionsHTML += `
        </div>
      </div>
    `;

    bodyHTML += `
          </tbody>
        </table>
      </div>
      
      ${actionsHTML}
      
      <!-- Sheet Help Accordion Section -->
      <div class="sheet-help-section">
        <div class="sheet-accordion">
          <div class="sheet-accordion-item">
            <button class="sheet-accordion-trigger">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;color:var(--color-text-secondary);flex-shrink:0;">
                <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span>¿Qué hace cada acción? Guía de botones</span>
              <svg class="sheet-accordion-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>
            <div class="sheet-accordion-panel">
              <div class="sheet-panel-content">
                <div class="sheet-help-item">
                  <span class="help-dot local"></span><strong>LocalStorage (Local):</strong> Almacenamiento en caché de tu navegador. Operación inmediata sin conexión.
                </div>
                <div class="sheet-help-item">
                  <span class="help-dot json"></span><strong>reservations.json (JSON):</strong> Archivo físico de base de datos de respaldo en disco local.
                </div>
                <div class="sheet-help-item">
                  <span class="help-dot airtable"></span><strong>Airtable (Nube):</strong> Base de datos global en la nube central de Love Shack.
                </div>
                
                <div class="sheet-help-divider"></div>
                
                <div class="sheet-help-btn-desc">
                  <strong>Subir / Re-sincronizar a Airtable:</strong> Sincroniza y parcha los datos de tu navegador actual hacia Airtable (o actualiza el registro existente en la nube). Además, normaliza automáticamente el tipo de tour (<code>TOUR_type</code>) al formato de tipo <em>Single Select</em> de Airtable, enviando campos vacíos como <code>null</code> en lugar de cadenas de texto vacías para evitar errores de la API.
                </div>
                <div class="sheet-help-btn-desc">
                  <strong>Guardar a reservations.json:</strong> Envía una petición local para guardar esta reserva en el archivo de disco físico. Si el servidor local está apagado, el sistema iniciará automáticamente la descarga del archivo actualizado de respaldo.
                </div>
                <div class="sheet-help-btn-desc">
                  <strong>Sobrescribir Local con JSON:</strong> Reemplaza tu copia de LocalStorage con la versión del archivo físico en disco. Si hay un conflicto de fechas de actualización, este botón parpadeará con un borde rojo pulsante para alertar visualmente al usuario.
                </div>
                <div class="sheet-help-btn-desc">
                  <strong>Sobrescribir Local con Airtable:</strong> Reemplaza tu copia local en el navegador con la versión actual almacenada en la nube de Airtable.
                </div>
                <div class="sheet-help-btn-desc">
                  <strong>Borrar Reservación:</strong> Abre un diálogo interactivo con opciones personalizables para eliminar esta reservación de LocalStorage (caché del navegador), Airtable (base de datos en la nube) y/o reservations.json (archivo físico de respaldo en disco).
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    body.innerHTML = bodyHTML;
    overlay.classList.add('active');

    // Bind sheet help accordion event
    const sheetTrigger = body.querySelector('.sheet-accordion-trigger');
    if (sheetTrigger) {
      sheetTrigger.addEventListener('click', () => {
        const item = sheetTrigger.closest('.sheet-accordion-item');
        item.classList.toggle('active');
        const panel = item.querySelector('.sheet-accordion-panel');
        if (panel) {
          if (item.classList.contains('active')) {
            panel.style.maxHeight = panel.scrollHeight + 'px';
          } else {
            panel.style.maxHeight = null;
          }
        }
      });
    }

    // Bind action events
    document.getElementById('action-sync-airtable')?.addEventListener('click', () => {
      this.syncToAirtable(id);
    });

    document.getElementById('action-sync-json')?.addEventListener('click', () => {
      this.saveLocalToJSON(id);
    });

    document.getElementById('action-import-json')?.addEventListener('click', () => {
      this.importToLocal(id, 'json');
    });

    document.getElementById('action-import-airtable')?.addEventListener('click', () => {
      this.importToLocal(id, 'airtable');
    });

    document.getElementById('action-delete-reservation')?.addEventListener('click', () => {
      this.handleDeleteReservation(id, row);
    });
  },
  async handleDeleteReservation(id, row) {
    if (!window.DeleteDialog) {
      window.Toast?.error("El diálogo de eliminación no está cargado.");
      return;
    }

    const clientName = this.getName(row) || 'Reservación sin nombre';

    window.DeleteDialog.show({
      id: id,
      clientName: clientName,
      hasLocal: row.local ? true : false,
      hasAirtable: (row.airtable || row.local?.airtable_id) ? true : false,
      hasJson: row.json ? true : false,
      onConfirm: async ({ deleteLocal, deleteAirtable, deleteJson }) => {
        const deletedSources = [];

        try {
          // 1. Delete from Airtable if requested
          if (deleteAirtable) {
            if (!window.SyncManager) {
              window.Toast?.error("SyncManager no cargado. No se pudo borrar de Airtable.");
            } else {
              window.Toast?.info("Eliminando de Airtable...");
              await window.SyncManager.deleteReservationFromAirtable(id);
              deletedSources.push("Airtable");
            }
          }

          // 2. Delete from LocalStorage if requested
          if (deleteLocal) {
            window.Storage.deleteReservation(id);
            deletedSources.push("LocalStorage");
          }

          // 3. Delete from reservations.json if requested
          if (deleteJson) {
            window.Toast?.info("Eliminando de reservations.json...");
            const currentJsonList = await window.Storage.loadFromJSON();
            const filtered = currentJsonList.filter(r => r.id !== id);
            const success = await window.Storage.saveToJSON(filtered);
            if (success) {
              deletedSources.push("reservations.json");
            } else {
              window.Toast?.warning("Servidor local no disponible. Descargando archivo JSON actualizado...");
              
              // Fallback manual download
              const jsonStr = JSON.stringify(filtered, null, 2);
              const blob = new Blob([jsonStr], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'reservations.json';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              window.URL.revokeObjectURL(url);
              deletedSources.push("reservations.json (descargado)");
            }
          }

          if (deletedSources.length > 0) {
            window.Toast?.success(`¡Reservación eliminada de ${deletedSources.join(", ")} exitosamente!`);
          }

          this.closeDetailSheet();
          await this.refresh();
        } catch (e) {
          console.error(e);
          window.Toast?.error("Error al eliminar la reservación: " + e.message);
          throw e; // Propagate to let DeleteDialog handle button state
        }
      }
    });
  },
  async syncToAirtable(id) {
    try {
      if (!window.SyncManager) {
        window.Toast?.error("SyncManager no cargado.");
        return;
      }
      window.Toast?.info("Sincronizando con Airtable...");
      
      const btn = document.getElementById('action-sync-airtable');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = 'Sincronizando...';
      }

      await window.SyncManager.syncReservation(id);
      window.Toast?.success("¡Sincronizado exitosamente con Airtable!");
      
      await this.refresh();
      this.openDetailSheet(id);
    } catch (e) {
      console.error(e);
      window.Toast?.error("Error al sincronizar con Airtable: " + e.message);
      
      const btn = document.getElementById('action-sync-airtable');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Sincronizar a Airtable';
      }
    }
  },

  async saveLocalToJSON(id) {
    const master = this.buildMasterIndex();
    const row = master.find(r => r.id === id);
    if (!row || !row.local) {
      window.Toast?.error("No hay datos locales para guardar en el archivo JSON.");
      return;
    }

    window.Toast?.info("Guardando en reservations.json...");
    
    const btn = document.getElementById('action-sync-json');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = 'Guardando...';
    }

    const updatedJsonList = [...this.jsonData];
    
    // Merge ALL local reservations to avoid dropping other unsaved ones
    if (this.localData && this.localData.length > 0) {
      this.localData.forEach(localRec => {
        const existingIdx = updatedJsonList.findIndex(r => r.id === localRec.id);
        if (existingIdx >= 0) {
          updatedJsonList[existingIdx] = localRec;
        } else {
          updatedJsonList.push(localRec);
        }
      });
    } else {
      const idx = updatedJsonList.findIndex(r => r.id === id);
      if (idx >= 0) {
        updatedJsonList[idx] = row.local;
      } else {
        updatedJsonList.push(row.local);
      }
    }

    const success = await window.Storage.saveToJSON(updatedJsonList);
    if (success) {
      window.Toast?.success("¡Guardado en reservations.json exitosamente!");
      await this.refresh();
      this.openDetailSheet(id);
    } else {
      window.Toast?.warning("Servidor local no disponible. Descargando archivo JSON...");
      
      // Fallback manual download - Now named 'reservations.json' to match the loaded file exactly
      const jsonStr = JSON.stringify(updatedJsonList, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'reservations.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = 'Guardar a reservations.json';
      }
    }
  },

  importToLocal(id, source) {
    const master = this.buildMasterIndex();
    const row = master.find(r => r.id === id);
    if (!row) return;

    const recordToImport = source === 'json' ? row.json : row.airtable;
    if (!recordToImport) {
      window.Toast?.error(`No hay datos en ${source} para importar.`);
      return;
    }

    if (!confirm(`¿Estás seguro de sobrescribir los datos locales con la versión de ${source}? Esto reemplazará tu localStorage para esta reservación.`)) {
      return;
    }

    const all = window.Storage.getAllReservations();
    const idx = all.findIndex(r => r.id === id);
    
    if (idx >= 0) {
      all[idx] = recordToImport;
    } else {
      all.push(recordToImport);
    }

    window.Storage.saveAll(all);
    window.Toast?.success(`¡Importado desde ${source} a LocalStorage con éxito!`);
    
    this.refresh().then(() => {
      this.openDetailSheet(id);
    });
  },

  closeDetailSheet() {
    const overlay = document.getElementById('compare-sheet-overlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
  },

  destroy() {
    this.container = null;
    this.localData = [];
    this.jsonData = [];
    this.airtableData = [];
  }
};

window.DataCompareScreen = DataCompareScreen;
