/**
 * Clients List Screen — Love Shack v3
 * Displays list of unique clients with loyalty stats and reservation history
 */

const ClientsListScreen = {
  container: null,
  allClients: [],
  filteredClients: [],
  colors: ['av-0', 'av-1', 'av-2', 'av-3', 'av-4'],

  async render(container) {
    this.container = container;

    // Fetch real data from Storage
    const reservations = window.Storage.getAllReservations();
    this.allClients = this.buildClients(reservations);
    this.filteredClients = this.allClients;

    container.innerHTML = `
      <div class="clients-screen">
        <div class="clients-top-bar">
          <h1>Clients</h1>
          <span class="count-badge" id="clients-count-badge">${this.allClients.length} clients</span>
        </div>

        <div class="clients-search-bar">
          <i class="ti ti-search" aria-hidden="true"></i>
          <input type="text" id="clients-search-input" placeholder="Search clients..." autocomplete="off">
        </div>

        <div class="client-list" id="client-list-container">
          <!-- List will be rendered here -->
        </div>
      </div>

      <!-- Detail Sheet Overlay -->
      <div class="client-overlay" id="client-overlay"></div>

      <!-- Detail Bottom Sheet -->
      <div class="client-sheet" id="client-sheet" role="dialog" aria-modal="true">
        <div class="sheet-handle"></div>
        <div class="sheet-header">
          <div class="sheet-avatar" id="sheet-avatar"></div>
          <div>
            <div class="sheet-name" id="sheet-name"></div>
            <div class="sheet-meta" id="sheet-meta"></div>
            <div id="sheet-id" style="font-size: 10px; color: var(--color-text-tertiary); margin-top: 2px; font-family: monospace;"></div>
          </div>
        </div>
        <div class="client-sheet-body">
          <div class="sheet-section-label">Overview</div>
          <div class="stat-row">
            <div class="stat-card">
              <div class="stat-label">Reservations</div>
              <div class="stat-value" id="stat-count">0</div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Latest</div>
              <div class="stat-value" id="stat-latest" style="font-size:14px; margin-top:4px;">N/A</div>
            </div>
          </div>
          
          <div class="sheet-section-label">History</div>
          <div class="client-reservations-list" id="sheet-res-list">
            <!-- Reservation history rendered here -->
          </div>
          
          <button class="sheet-close-btn" id="client-sheet-close-btn">
            <i class="ti ti-x" aria-hidden="true"></i> Close
          </button>
        </div>
      </div>
    `;

    this.renderList();
    this.bindEvents();
  },

  buildClients(reservations) {
    const map = {};
    reservations.forEach(r => {
      const clientId = r.clientId || 'CLI-UNKNOWN';
      const name = r.data?.step2_details?.customerName || r.guestName || 'Unknown';
      
      if (!map[clientId]) {
        map[clientId] = {
          id: clientId,
          name: name,
          reservations: []
        };
      }
      map[clientId].reservations.push(r);
    });

    return Object.values(map)
      .map(client => ({
        ...client,
        // Sort individual reservations by date desc
        sortedRes: [...client.reservations].sort((a, b) => {
          const dateA = a.data?.step2_details?.tripDate || a.reservationDate || '';
          const dateB = b.data?.step2_details?.tripDate || b.reservationDate || '';
          return dateB.localeCompare(dateA);
        })
      }))
      .sort((a, b) => b.reservations.length - a.reservations.length); // Loyalty sort
  },

  renderList() {
    const listContainer = this.container.querySelector('#client-list-container');
    if (!listContainer) return;

    if (this.filteredClients.length === 0) {
      listContainer.innerHTML = `
        <div class="client-empty-state">
          <i class="ti ti-users-off" style="font-size: 32px; opacity: 0.5; display: block; margin-bottom: 12px;"></i>
          No clients found.
        </div>`;
      return;
    }

    listContainer.innerHTML = this.filteredClients.map(client => {
      const initials = this.getInitials(client.name);
      const colorClass = this.getColorClass(client.name);
      const count = client.reservations.length;

      return `
        <div class="client-row" data-id="${client.id}" role="button" tabindex="0">
          <div class="client-avatar avatar ${colorClass}">${initials}</div>
          <div class="client-info">
            <div class="client-name">${this.escapeHtml(client.name)}</div>
            <div class="client-sub">Loyal Guest · ${count} reservation${count > 1 ? 's' : ''}</div>
          </div>
          <div class="client-right">
            <span class="client-res-badge">${count}</span>
            <i class="ti ti-chevron-right client-chevron" aria-hidden="true"></i>
          </div>
        </div>
      `;
    }).join('');

    // Bind row clicks
    listContainer.querySelectorAll('.client-row').forEach(row => {
      row.addEventListener('click', () => this.openSheet(row.dataset.id));
    });
  },

  openSheet(clientId) {
    const client = this.allClients.find(c => c.id === clientId);
    if (!client) return;

    // 1. Header
    const avatarEl = document.getElementById('sheet-avatar');
    if (avatarEl) {
      avatarEl.textContent = this.getInitials(client.name);
      avatarEl.className = `sheet-avatar avatar ${this.getColorClass(client.name)}`;
    }

    const nameEl = document.getElementById('sheet-name');
    if (nameEl) nameEl.textContent = client.name;
    
    const idEl = document.getElementById('sheet-id');
    if (idEl) idEl.textContent = client.id;
    
    const metaEl = document.getElementById('sheet-meta');
    if (metaEl) metaEl.textContent = `${client.reservations.length} total reservation${client.reservations.length > 1 ? 's' : ''}`;
    
    const countEl = document.getElementById('stat-count');
    if (countEl) countEl.textContent = client.reservations.length;

    // 2. Statistics
    const sortedRes = [...client.reservations].sort((a, b) => {
      const dateA = a.data?.step2_details?.tripDate || a.reservationDate || '';
      const dateB = b.data?.step2_details?.tripDate || b.reservationDate || '';
      return dateB.localeCompare(dateA);
    });

    const latestEl = document.getElementById('stat-latest');
    if (latestEl) {
      const latestRes = sortedRes[0];
      const latestDate = latestRes?.data?.step2_details?.tripDate || latestRes?.reservationDate;
      if (latestDate) {
        try {
          const d = new Date(latestDate + 'T00:00:00');
          latestEl.textContent = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch(e) {
          latestEl.textContent = latestDate;
        }
      } else {
        latestEl.textContent = 'No date';
      }
    }

    // 3. History
    const historyList = document.getElementById('sheet-res-list');
    if (historyList) {
      historyList.innerHTML = sortedRes.map(r => {
        const rDate = r.data?.step2_details?.tripDate || r.reservationDate || 'No date';
        let displayDate = 'Pending Date';
        
        if (rDate !== 'No date') {
          try {
            displayDate = new Date(rDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          } catch(e) {
            displayDate = rDate;
          }
        }
        
        const statusClass = r.status || 'draft';
        const statusLabel = r.status === 'reservado' ? 'confirmed' : (r.status || 'draft');
        const resId = typeof r.id === 'string' ? r.id.substring(0, 8) : 'RES';

        return `
          <div class="res-item" data-id="${r.id}" style="cursor: pointer;">
            <div>
              <div class="res-id">${resId}...</div>
              <div class="res-date">${displayDate}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="res-status-badge ${statusClass}">${statusLabel}</span>
              <i class="ti ti-chevron-right" style="font-size: 12px; color: var(--color-text-tertiary);"></i>
            </div>
          </div>
        `;
      }).join('');

      // Bind reservation clicks
      historyList.querySelectorAll('.res-item').forEach(item => {
        item.addEventListener('click', (e) => {
          const resId = item.dataset.id;
          const res = window.Storage.getReservation(resId);
          if (!res) return;

          this.closeSheet();

          if (res.status === 'draft') {
            const step = res.currentStep || 1;
            const isNewRes = res.flowMode === 'new-reservation';
            if (isNewRes) {
              if (step === 1) window.App.navigate(`#/new-reservation/${resId}`);
              else window.App.navigate(`#/new-reservation/${resId}/pricing`);
            } else {
              if (step === 1) window.App.navigate(`#/new/${resId}`);
              else if (step === 2) window.App.navigate(`#/new/${resId}/details`);
              else window.App.navigate(`#/new/${resId}/adjustments`);
            }
          } else {
            window.App.navigate(`#/new/${resId}/adjustments`);
          }
        });
      });
    }

    // 4. Show Sheet
    const sheet = document.getElementById('client-sheet');
    const overlay = document.getElementById('client-overlay');
    if (sheet) sheet.classList.add('open');
    if (overlay) overlay.classList.add('visible');
  },

  closeSheet() {
    const sheet = document.getElementById('client-sheet');
    const overlay = document.getElementById('client-overlay');
    if (sheet) sheet.classList.remove('open');
    if (overlay) overlay.classList.remove('visible');
  },

  bindEvents() {
    if (!this.container) return;

    // Search
    const searchInput = this.container.querySelector('#clients-search-input');
    const countBadge = this.container.querySelector('#clients-count-badge');

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        this.filteredClients = query 
          ? this.allClients.filter(c => c.name.toLowerCase().includes(query) || c.id.toLowerCase().includes(query))
          : this.allClients;
        
        this.renderList();
        if (countBadge) {
          countBadge.textContent = `${this.filteredClients.length} client${this.filteredClients.length !== 1 ? 's' : ''}`;
        }
      });
    }

    // Sheet close
    const closeBtn = document.getElementById('client-sheet-close-btn');
    const overlay = document.getElementById('client-overlay');

    if (closeBtn) closeBtn.addEventListener('click', () => this.closeSheet());
    if (overlay) overlay.addEventListener('click', () => this.closeSheet());
  },

  // ---- Helpers ----
  
  getInitials(name) {
    if (!name) return '??';
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  },

  getColorClass(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash * 31 + name.charCodeAt(i)) & 0xFFFFFFFF;
    }
    const idx = Math.abs(hash) % this.colors.length;
    return this.colors[idx];
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  },

  destroy() {
    this.container = null;
  }
};

window.ClientsListScreen = ClientsListScreen;