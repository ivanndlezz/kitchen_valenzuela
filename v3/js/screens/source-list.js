/**
 * Source List Screen — Love Shack v3
 * Displays list of booking sources with a pricing simulator
 */

const SourceListScreen = {
  container: null,
  allSources: [],
  currentSource: null,

  async render(container) {
    this.container = container;

    container.innerHTML = `
      <div class="sources-screen">
        <div class="sources-top-bar">
          <div>
            <h1>Sources</h1>
            <div class="sub">Toca para ver tarifas</div>
          </div>
        </div>

        <div class="source-list" id="source-list-container">
          <div style="padding: 2rem; text-align: center; color: var(--color-text-tertiary);">
            Loading sources...
          </div>
        </div>
      </div>

      <!-- Detail Sheet Overlay -->
      <div class="source-overlay" id="source-overlay"></div>

      <!-- Simulator Bottom Sheet -->
      <div class="source-sheet" id="source-sheet" role="dialog" aria-modal="true">
        <div class="sheet-handle"></div>
        <div class="sheet-header">
          <div class="sheet-title-row">
            <div class="sheet-icon" id="sh-icon"></div>
            <div>
              <div class="sheet-name" id="sh-name"></div>
              <div class="sheet-type" id="sh-type"></div>
            </div>
          </div>
          <i class="ti ti-x sheet-close" id="source-sheet-close-btn" aria-label="Close"></i>
        </div>
        <div class="source-sheet-body">
          <div class="stat-row">
            <div class="stat-card">
              <div class="stat-label">Tarifa por hora</div>
              <div class="stat-value" id="sh-rate">$0 <span class="stat-unit">/hr</span></div>
            </div>
            <div class="stat-card">
              <div class="stat-label">Fee extra pax</div>
              <div class="stat-value" id="sh-pax">$0 <span class="stat-unit">/pax</span></div>
            </div>
          </div>
          
          <div class="sim-label">Simulador</div>
          <div class="sim-row">
            <label>Horas</label>
            <input type="range" min="2" max="8" value="3" step="1" id="sh-hrs">
            <span class="val" id="sh-hrs-val">3</span>
          </div>
          <div class="sim-row">
            <label>Guests</label>
            <input type="range" min="14" max="55" value="14" step="1" id="sh-pax-r">
            <span class="val" id="sh-pax-val">14</span>
          </div>
          
          <div class="sim-result">
            <div>
              <div class="sim-result-label">Total estimado</div>
              <div class="sim-result-sub" id="sh-sub">3 hrs · 6 guests</div>
            </div>
            <div class="sim-result-value" id="sh-total">$0</div>
          </div>
        </div>
      </div>
    `;

    try {
      const response = await fetch('../reservations/data/menu-options.json');
      const data = await response.json();
      this.allSources = this.processSources(data.reservationSources);
      this.renderList();
    } catch (error) {
      console.error('Error loading sources:', error);
      this.container.querySelector('#source-list-container').innerHTML = `
        <div style="padding: 2rem; text-align: center; color: var(--color-danger);">
          Failed to load sources.
        </div>`;
    }

    this.bindEvents();
  },

  processSources(raw) {
    const iconMap = {
      'Contacto Directo': { icon: 'ti-user-check', bg: '#E1F5EE', fg: '#085041', type: 'Direct Booking' },
      'WhatsApp': { icon: 'ti-brand-whatsapp', bg: '#E1F5EE', fg: '#085041', type: 'Instant Message' },
      'Booking.com': { icon: 'ti-world', bg: '#E6F1FB', fg: '#0C447C', type: 'OTA Platform' },
      'TripAdvisor': { icon: 'ti-map-pin', bg: '#FAEEDA', fg: '#633806', type: 'Review Platform' },
      'Viator': { icon: 'ti-compass', bg: '#E6F1FB', fg: '#0C447C', type: 'OTA Platform' },
      'Airbnb': { icon: 'ti-home', bg: '#FAECE7', fg: '#712B13', type: 'OTA Platform' },
      'Referido': { icon: 'ti-users', bg: '#E1F5EE', fg: '#085041', type: 'Referral' },
      'Transcabo': { icon: 'ti-building-skyscraper', bg: '#EEEDFE', fg: '#3C3489', type: 'Partner referral' },
      'Get My Boat': { icon: 'ti-anchor', bg: '#E6F1FB', fg: '#0C447C', type: 'Boat Marketplace' },
    };

    return raw.map(s => {
      const meta = iconMap[s.name] || { icon: 'ti-briefcase', bg: '#F2F2F7', fg: '#3A3A3C', type: 'External Source' };
      return {
        ...s,
        ...meta,
        hourlyRate: parseFloat(s.hourlyRate),
        extraPassengerFee: parseFloat(s.extraPassengerFee)
      };
    });
  },

  renderList() {
    const listContainer = this.container.querySelector('#source-list-container');
    
    listContainer.innerHTML = this.allSources.map((s, i) => {
      const cc = this.commColor(s.percentage);
      return `
        <div class="source-row" data-index="${i}" role="button" tabindex="0">
          <div class="src-icon" style="background:${s.bg}; color:${s.fg};">
            <i class="ti ${s.icon}" aria-hidden="true"></i>
          </div>
          <div class="src-info">
            <div class="src-name">${this.escapeHtml(s.name)}</div>
            <div class="src-sub">$${s.hourlyRate}/hr · $${s.extraPassengerFee} extra pax</div>
          </div>
          <div class="src-right">
            <span class="comm-pill" style="background:${cc.bg}; color:${cc.text};">${s.percentage}</span>
            <i class="ti ti-chevron-right src-chevron" aria-hidden="true"></i>
          </div>
        </div>
      `;
    }).join('');

    // Bind row clicks
    listContainer.querySelectorAll('.source-row').forEach(row => {
      row.addEventListener('click', () => this.openSheet(parseInt(row.dataset.index)));
    });
  },

  openSheet(idx) {
    const s = this.allSources[idx];
    this.currentSource = s;

    const iconEl = document.getElementById('sh-icon');
    iconEl.innerHTML = `<i class="ti ${s.icon}" aria-hidden="true"></i>`;
    iconEl.style.background = s.bg;
    iconEl.style.color = s.fg;

    document.getElementById('sh-name').textContent = s.name;
    document.getElementById('sh-type').textContent = `${s.type} · ${s.percentage} comm`;
    document.getElementById('sh-rate').innerHTML = `$${s.hourlyRate} <span class="stat-unit">/hr</span>`;
    document.getElementById('sh-pax').innerHTML = `$${s.extraPassengerFee} <span class="stat-unit">/pax</span>`;
    
    document.getElementById('sh-hrs').value = 3;
    document.getElementById('sh-pax-r').value = 14;
    
    this.updateSim();

    document.getElementById('source-sheet').classList.add('open');
    document.getElementById('source-overlay').classList.add('visible');
  },

  closeSheet() {
    document.getElementById('source-sheet').classList.remove('open');
    document.getElementById('source-overlay').classList.remove('visible');
  },

  updateSim() {
    if (!this.currentSource) return;
    
    const hours = parseInt(document.getElementById('sh-hrs').value);
    const pax = parseInt(document.getElementById('sh-pax-r').value);
    
    document.getElementById('sh-hrs-val').textContent = hours;
    document.getElementById('sh-pax-val').textContent = pax;
    
    const extra = Math.max(0, pax - 14);
    const total = this.currentSource.hourlyRate * hours + extra * this.currentSource.extraPassengerFee;
    
    document.getElementById('sh-total').textContent = '$' + total.toLocaleString();
    document.getElementById('sh-sub').textContent = extra > 0
      ? `${hours} hrs · ${pax} guests · +${extra} extra pax`
      : `${hours} hrs · ${pax} guests`;
  },

  bindEvents() {
    // Sheet closing
    const closeBtn = document.getElementById('source-sheet-close-btn');
    const overlay = document.getElementById('source-overlay');
    
    closeBtn?.addEventListener('click', () => this.closeSheet());
    overlay?.addEventListener('click', () => this.closeSheet());

    // Simulator inputs
    const hrsInput = document.getElementById('sh-hrs');
    const paxInput = document.getElementById('sh-pax-r');

    hrsInput?.addEventListener('input', () => this.updateSim());
    paxInput?.addEventListener('input', () => this.updateSim());
  },

  commColor(pct) {
    const n = parseFloat(pct) || 0;
    if (n === 0) return { bg: '#E1F5EE', text: '#085041' };
    if (n <= 10) return { bg: '#EAF3DE', text: '#27500A' };
    if (n <= 15) return { bg: '#FAEEDA', text: '#633806' };
    return { bg: '#FAECE7', text: '#712B13' };
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  destroy() {
    this.container = null;
  }
};

window.SourceListScreen = SourceListScreen;