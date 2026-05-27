/**
 * Unified Settings & Data Control Screen — Love Shack v3
 * Consolidates #/settings, #/data, and #/compare into a single screen with navigation tabs
 */

const SettingsScreen = {
  container: null,
  activeTab: 'config', // 'compare' | 'sync' | 'config'

  render(container, params) {
    this.container = container;
    this.activeTab = params?.tab || 'config';

    this.container.innerHTML = `
      <div class="settings-unified-screen stagger-children">
        <!-- Segments / Tab Bar -->
        <div class="settings-tabs-container">
          <div class="settings-tabs-bar">
            <button class="settings-tab-btn ${this.activeTab === 'compare' ? 'active' : ''}" data-tab="compare">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="tab-icon">
                <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18"/>
              </svg>
              <span>Comparador</span>
            </button>
            <button class="settings-tab-btn ${this.activeTab === 'sync' ? 'active' : ''}" data-tab="sync">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="tab-icon">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
              </svg>
              <span>Sincronizar</span>
            </button>
            <button class="settings-tab-btn ${this.activeTab === 'config' ? 'active' : ''}" data-tab="config">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="tab-icon">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              <span>Preferencias</span>
            </button>
          </div>
        </div>

        <!-- Tab Content Area -->
        <div id="settings-tab-content" class="settings-tab-content"></div>
      </div>
    `;

    this.bindTabEvents();
    this.renderActiveTab();
  },

  bindTabEvents() {
    this.container.querySelectorAll('.settings-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        let route = '#/settings';
        if (tab === 'compare') route = '#/compare';
        if (tab === 'sync') route = '#/data';

        window.App.navigate(route);
      });
    });
  },

  renderActiveTab() {
    // Teardown compare sub-screen if leaving it
    if (window.DataCompareScreen && window.DataCompareScreen.container) {
      window.DataCompareScreen.destroy();
    }

    const tabContent = document.getElementById('settings-tab-content');
    if (!tabContent) return;

    // Toggle compare-active layout modifier
    const wrapper = this.container.querySelector('.settings-unified-screen');
    if (wrapper) {
      wrapper.classList.toggle('compare-active', this.activeTab === 'compare');
    }

    if (this.activeTab === 'compare') {
      window.DataCompareScreen.render(tabContent);
    } else if (this.activeTab === 'sync') {
      this.renderSyncTab(tabContent);
    } else {
      this.renderConfigTab(tabContent);
    }
  },

  renderConfigTab(container) {
    container.innerHTML = `
      <div class="step-content stagger-children">
        <div class="step-section">
          <div class="step-section-title">Preferencias de App</div>
          <div class="input-group">
            <div class="input-group-row">
              <span class="input-group-label">Versión</span>
              <div class="input-group-value">v3.1.0-beta</div>
            </div>
            <div class="input-group-row">
              <span class="input-group-label">Desarrollado por</span>
              <div class="input-group-value">Ivan Gonzalez | Klef Agency</div>
            </div>
          </div>
        </div>

        <div class="step-section">
          <div class="step-section-title">Acciones de Sistema</div>
          <button class="btn btn-secondary btn-full" id="factoryResetBtn" style="color: var(--color-danger); border-color: var(--color-danger-muted); background: var(--color-danger-muted);">
            Borrar Todo (Reset Fábrica)
          </button>
          <p style="font-size: 11px; color: var(--color-text-tertiary); margin-top: 8px; text-align: center;">
            ¡Cuidado! Esta acción borrará todas las reservas locales permanentemente.
          </p>
        </div>
      </div>
    `;

    document.getElementById('factoryResetBtn')?.addEventListener('click', () => {
      if (confirm('¿Estás seguro de restablecer de fábrica? Esto borrará permanentemente todas las reservaciones locales en tu navegador.')) {
        localStorage.clear();
        location.reload();
      }
    });
  },

  renderSyncTab(container) {
    const counts = window.Storage.getCounts();

    container.innerHTML = `
      <div class="step-content stagger-children">
        <div class="step-section">
          <div class="step-section-title">Resumen de Datos</div>
          <div class="input-group">
            <div class="input-group-row">
              <span class="input-group-label">Total Reservaciones</span>
              <div class="input-group-value">
                <span style="font-weight: var(--weight-bold); color: var(--color-accent);">${counts.total}</span>
              </div>
            </div>
            <div class="input-group-row">
              <span class="input-group-label">Borradores</span>
              <div class="input-group-value"><span>${counts.draft}</span></div>
            </div>
            <div class="input-group-row">
              <span class="input-group-label">Confirmados (Reservado)</span>
              <div class="input-group-value"><span>${counts.reservado}</span></div>
            </div>
          </div>
        </div>

        <div class="step-section">
          <div class="step-section-title">Nube Sync (Airtable)</div>
          <div style="display: flex; flex-direction: column; gap: var(--space-3);">
            <p style="font-size: 12px; color: var(--color-text-secondary); margin-bottom: 8px;">
              Sincroniza todas tus reservaciones locales con la Nube (Airtable) de forma masiva en un solo paso.
            </p>
            <button class="btn btn-primary btn-full" id="syncAllNubeBtn" style="background: var(--color-accent); border-color: var(--color-accent);">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:18px;height:18px">
                <path d="M16 16l-4-4-4 4M12 12v9"/>
                <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
              </svg>
              Sincronizar Todo con la Nube
            </button>
            <button class="btn btn-secondary btn-full" id="importAirtableToJSONBtn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Generar reservations.json desde Airtable
            </button>
          </div>
        </div>

        <div class="step-section">
          <div class="step-section-title">Manual Backup (File Download)</div>
          <div style="display: flex; flex-direction: column; gap: var(--space-3);">
            <p style="font-size: 12px; color: var(--color-text-secondary); margin-bottom: 8px;">
              Manually download or upload a .json file to your device.
            </p>
            <button class="btn btn-secondary btn-full" id="exportBtn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download .json Backup
            </button>
            <button class="btn btn-secondary btn-full" id="importBtn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Upload .json Backup
            </button>
            <input type="file" id="importFile" accept=".json" style="display: none;">

            <div class="divider"></div>

            <button class="btn btn-danger btn-full" id="clearDraftsBtn">
              Clear All Drafts
            </button>
          </div>
        </div>

        <div class="step-section">
          <div class="step-section-title">Local Server Sync (localhost:8765)</div>
          <div style="display: flex; flex-direction: column; gap: var(--space-3);">
            <p style="font-size: 12px; color: var(--color-text-secondary); margin-bottom: 8px;">
              Sync all records with your local Node.js server. (Requires server to be running).
            </p>
            <button class="btn btn-primary btn-full" id="pushSyncBtn">
              Push All Data to Local Server
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </button>
            <button class="btn btn-secondary btn-full" id="pullSyncBtn">
              Pull Data from Local Server
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;

    // Bind event handlers
    
    // Export button
    document.getElementById('exportBtn')?.addEventListener('click', () => {
      const json = window.Storage.exportJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `loveshack_v3_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      window.Toast.success('Exported successfully');
    });

    // Import button
    document.getElementById('importBtn')?.addEventListener('click', () => {
      document.getElementById('importFile')?.click();
    });

    document.getElementById('importFile')?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = window.Storage.importJSON(ev.target.result);
        window.Toast.success(`Imported ${result.imported} records (${result.duplicates} duplicates)`);
        this.renderSyncTab(container); // Refresh
      };
      reader.readAsText(file);
    });

    // Push Sync
    document.getElementById('pushSyncBtn')?.addEventListener('click', async () => {
      const reservations = window.Storage.getAllReservations();
      const success = await window.Storage.saveToJSON(reservations);
      if (success) {
        window.Toast.success('Successfully backed up to JSON file');
      } else {
        window.Toast.error('Save server not running (localhost:8765)');
      }
    });

    // Pull Sync
    document.getElementById('pullSyncBtn')?.addEventListener('click', async () => {
      const jsonItems = await window.Storage.loadFromJSON();
      if (jsonItems.length > 0) {
        const result = window.Storage.importJSON(JSON.stringify(jsonItems));
        window.Toast.success(`Synced ${result.imported} new items from file.`);
        this.renderSyncTab(container); // Refresh
      } else {
        window.Toast.error('Could not load or file is empty');
      }
    });

    // Sync All to Nube
    document.getElementById('syncAllNubeBtn')?.addEventListener('click', async () => {
      if (window.SyncManager) {
        await window.SyncManager.syncAllReservations();
        this.renderSyncTab(container); // Refresh counts
      } else {
        window.Toast.error('SyncManager not loaded');
      }
    });

    // Generate reservations.json from Airtable
    document.getElementById('importAirtableToJSONBtn')?.addEventListener('click', async () => {
      if (window.SyncManager) {
        await window.SyncManager.importAirtableToJSON();
        this.renderSyncTab(container); // Refresh counts
      } else {
        window.Toast.error('SyncManager not loaded');
      }
    });

    // Clear drafts
    document.getElementById('clearDraftsBtn')?.addEventListener('click', () => {
      if (!confirm('Delete all draft reservations?')) return;
      const all = window.Storage.getAllReservations();
      const filtered = all.filter((r) => r.status !== 'draft');
      localStorage.setItem('loveshack_v3_reservations', JSON.stringify(filtered));
      window.Toast.success('Drafts cleared');
      this.renderSyncTab(container); // Refresh
    });
  },

  destroy() {
    // Tear down nested compare screen if it was active
    if (this.activeTab === 'compare' && window.DataCompareScreen) {
      window.DataCompareScreen.destroy();
    }
    this.container = null;
  },
};

window.SettingsScreen = SettingsScreen;
