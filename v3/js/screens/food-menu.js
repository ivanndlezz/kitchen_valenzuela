/**
 * Food Menu Screen — Love Shack v3
 * Displays list of food and bar menu options with detailed breakdowns
 */

const FoodMenuScreen = {
  container: null,
  allMenus: [],

  async render(container) {
    this.container = container;

    container.innerHTML = `
      <div class="menu-screen">
        <div class="menu-top-bar">
          <h1>Food menu</h1>
          <span class="item-count" id="item-count">Loading...</span>
        </div>

        <div class="menu-list" id="menu-list-container">
          <div style="padding: 2rem; text-align: center; color: var(--color-text-tertiary);">
            Loading menu options...
          </div>
        </div>
      </div>

      <!-- Detail Sheet Overlay -->
      <div class="menu-overlay" id="menu-overlay"></div>

      <!-- Detail Bottom Sheet -->
      <div class="menu-sheet" id="menu-sheet" role="dialog" aria-modal="true">
        <div class="sheet-handle"></div>
        <div class="sheet-header">
          <div class="sh-title-wrap">
            <div class="sh-icon" id="sh-icon"></div>
            <div class="sh-name" id="sh-name"></div>
          </div>
          <i class="ti ti-x sh-close" id="menu-sheet-close-btn" aria-label="Close"></i>
        </div>
        <div class="menu-sheet-body" id="sh-body">
          <!-- Content populated dynamically -->
        </div>
      </div>
    `;

    try {
      const response = await fetch('../v3/data/menu-options.json');
      const data = await response.json();
      this.allMenus = this.enrichMenus(data.foodOptions);
      this.renderList();
    } catch (error) {
      console.error('Error loading menus:', error);
      this.container.querySelector('#menu-list-container').innerHTML = `
        <div style="padding: 2rem; text-align: center; color: var(--color-danger);">
          Failed to load menu options.
        </div>`;
    }

    this.bindEvents();
  },

  enrichMenus(raw) {
    const metadata = {
      "MEXICAN BUFFET & NATIONAL OPEN BAR": {
        displayName: "Mexican buffet & open bar",
        type: "buffet",
        food: ["Chicken & beef skewers","Guacamole","Chips & tortillas","Quesadillas","Salsas"],
        bar: ["Tequila","Rum","Vodka","Beer (lata)","Soft drinks","Water"],
        icon: "ti-salad", bg: "#E1F5EE", fg: "#085041"
      },
      "CHICKEN & VEGETARIAN MENU WITH NATIONAL OPEN BAR": {
        displayName: "Chicken & vegetarian + open bar",
        type: "buffet",
        food: ["Chicken & vegetarian skewers","Guacamole","Chips & tortillas","Quesadillas","Salsas"],
        bar: ["Tequila","Rum","Vodka","Beer (lata)","Soft drinks","Water"],
        icon: "ti-leaf", bg: "#EAF3DE", fg: "#27500A"
      },
      "TACOS & NATIONAL OPEN BAR": {
        displayName: "Tacos & open bar",
        type: "buffet",
        food: ["Beef & chicken tacos","Guacamole","Chips & tortillas","Quesadillas","Salsas"],
        bar: ["Tequila","Rum","Vodka","Beer (lata)","Soft drinks","Water"],
        icon: "ti-tools-kitchen-2", bg: "#FAECE7", fg: "#712B13"
      },
      "FISHING HALF DAY MENU": {
        displayName: "Fishing half day",
        type: "fishing",
        food: ["Bagels","Croissants","Toast bread","Quesadillas","Cold cuts, cheese & fruit board","Salsas, guacamole & chips"],
        bar: [],
        icon: "ti-fish", bg: "#E6F1FB", fg: "#0C447C"
      },
      "FISHING FULL DAY MENU": {
        displayName: "Fishing full day",
        type: "fishing",
        food: ["Bagels","Croissants","Toast bread","Quesadillas","Cold cuts, cheese & fruit board","Salsas, guacamole & chips","Charcoal-grilled beef & chicken tacos"],
        bar: [],
        icon: "ti-fish", bg: "#EEEDFE", fg: "#3C3489"
      },
      "SNACKS & NATIONAL OPEN BAR": {
        displayName: "Snacks & open bar",
        type: "snack",
        food: ["Chips & guacamole","Mexican salsas","Tapas, cheese & crackers","Nuts & fresh fruit","Muffins"],
        bar: ["Tequila","Rum","Vodka","Beer (lata)","Soft drinks","Water"],
        icon: "ti-cheese", bg: "#FAEEDA", fg: "#633806"
      }
    };

    return raw.map(m => {
      const meta = metadata[m.name] || {
        displayName: m.name,
        type: "food",
        food: [m.description],
        bar: [],
        icon: "ti-soup", bg: "#F2F2F7", fg: "#3A3A3C"
      };
      return { ...m, ...meta };
    });
  },

  renderList() {
    const listContainer = this.container.querySelector('#menu-list-container');
    const countEl = this.container.querySelector('#item-count');

    countEl.textContent = `${this.allMenus.length} options`;

    listContainer.innerHTML = this.allMenus.map((m, i) => {
      const preview = m.food.slice(0, 2).join(', ') + (m.food.length > 2 ? '…' : '');
      const tag = this.getTagHtml(m.type);

      return `
        <div class="menu-row" data-index="${i}" role="button" tabindex="0">
          <div class="menu-icon" style="background:${m.bg}; color:${m.fg};">
            <i class="ti ${m.icon}" aria-hidden="true"></i>
          </div>
          <div class="menu-info">
            <div class="menu-name">${this.escapeHtml(m.displayName)}</div>
            <div class="menu-preview">${this.escapeHtml(preview)}</div>
          </div>
          <div class="menu-right">
            ${tag}
            <i class="ti ti-chevron-right row-chevron" aria-hidden="true"></i>
          </div>
        </div>
      `;
    }).join('');

    // Bind row clicks
    listContainer.querySelectorAll('.menu-row').forEach(row => {
      row.addEventListener('click', () => this.openSheet(parseInt(row.dataset.index)));
    });
  },

  openSheet(idx) {
    const m = this.allMenus[idx];
    if (!m) return;

    const iconEl = document.getElementById('sh-icon');
    iconEl.innerHTML = `<i class="ti ${m.icon}" aria-hidden="true"></i>`;
    iconEl.style.background = m.bg;
    iconEl.style.color = m.fg;

    document.getElementById('sh-name').textContent = m.displayName;

    let html = `<div class="section-label">Includes</div><div class="items-block">`;
    m.food.forEach(f => {
      html += `<div class="item-pill"><i class="ti ti-circle-check" aria-hidden="true"></i>${this.escapeHtml(f)}</div>`;
    });
    html += `</div>`;

    if (m.bar && m.bar.length > 0) {
      html += `
        <div class="bar-section">
          <div class="section-label">Open bar</div>
          <div class="bar-items">
            ${m.bar.map(b => `<span class="bar-chip">${this.escapeHtml(b)}</span>`).join('')}
          </div>
        </div>`;
    }

    document.getElementById('sh-body').innerHTML = html;
    document.getElementById('menu-sheet').classList.add('open');
    document.getElementById('menu-overlay').classList.add('visible');
  },

  closeSheet() {
    document.getElementById('menu-sheet').classList.remove('open');
    document.getElementById('menu-overlay').classList.remove('visible');
  },

  bindEvents() {
    // Sheet closing
    const closeBtn = document.getElementById('menu-sheet-close-btn');
    const overlay = document.getElementById('menu-overlay');

    closeBtn?.addEventListener('click', () => this.closeSheet());
    overlay?.addEventListener('click', () => this.closeSheet());
  },

  getTagHtml(type) {
    if (type === 'fishing') return `<span class="menu-tag tag-food">Pesca</span>`;
    if (type === 'snack') return `<span class="menu-tag tag-snack">Snacks</span>`;
    return `<span class="menu-tag tag-bar">Open bar</span>`;
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

window.FoodMenuScreen = FoodMenuScreen;