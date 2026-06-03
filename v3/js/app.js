/**
 * App Orchestrator — Love Shack v3
 * Hash-based router + screen lifecycle management
 */

(function () {
  'use strict';



  const App = {
    currentScreen: null,
    currentScreenName: null,

    /**
     * Initialize the app
     */
    init() {
      // Initialize components
      window.FAB.init();

      // Listen for hash changes
      window.addEventListener('hashchange', () => this.route());

      // Initial route
      if (!window.location.hash || window.location.hash === '#') {
        window.location.hash = '#/dashboard';
      } else {
        this.route();
      }
    },

    /**
     * Navigate to a hash route
     * @param {string} hash - e.g. '#/dashboard', '#/new/uuid'
     */
    navigate(hash) {
      window.location.hash = hash;
    },

    /**
     * Main router — matches hash to screens
     */
    route() {
      const hash = window.location.hash || '#/dashboard';
      console.log('%c[ROUTE] Navigating from:', 'color:#0af', this.currentScreenName || 'none', 'to:', hash);
      const container = document.getElementById('app');
      const mainEl = document.querySelector('.app-main');

      // Destroy current screen
      if (this.currentScreen && this.currentScreen.destroy) {
        this.currentScreen.destroy();
      }

      // Parse route
      let screen = null;
      let params = {};
      let headerHTML = '';
      let showFab = false;
      let showBottomNav = true;
      let stepNumber = 0;
      let inStepper = false;
      let flowMode = 'default';

      if (hash.match(/^#\/new-reservation\/([^/]+)\/pricing/)) {
        // Step 2: #/new-reservation/:id/pricing -> Pricing (Step1Screen)
        const id = hash.match(/^#\/new-reservation\/([^/]+)\/pricing/)[1];
        screen = window.Step1Screen;
        params = { id };
        stepNumber = 2;
        inStepper = true;
        showBottomNav = false;
        flowMode = 'new-reservation';
        headerHTML = this.renderStepperHeader(2, id, false, flowMode);
      } else if (hash.match(/^#\/new-reservation\/([^/]+)/)) {
        // Step 1: #/new-reservation/:id -> Trip/Details (Step2Screen)
        const id = hash.match(/^#\/new-reservation\/([^/]+)/)[1];
        screen = window.Step2Screen;
        params = { id };
        stepNumber = 1;
        inStepper = true;
        showBottomNav = false;
        flowMode = 'new-reservation';
        headerHTML = this.renderStepperHeader(1, id, false, flowMode);
      } else if (hash.match(/^#\/new\/([^/]+)\/adjustments/)) {
        // Step 3: #/new/:id/adjustments
        const id = hash.match(/^#\/new\/([^/]+)\/adjustments/)[1];
        screen = window.Step3Screen;
        params = { id };
        stepNumber = 3;
        inStepper = true;
        showBottomNav = false;

        const reservation = window.Storage.getReservation(id);
        const isBooked = reservation && reservation.status !== 'draft';

        headerHTML = this.renderStepperHeader(3, id, isBooked);
      } else if (hash.match(/^#\/new\/([^/]+)\/details/)) {
        // Step 2: #/new/:id/details
        const id = hash.match(/^#\/new\/([^/]+)\/details/)[1];
        screen = window.Step2Screen;
        params = { id };
        stepNumber = 2;
        inStepper = true;
        showBottomNav = false;
        headerHTML = this.renderStepperHeader(2, id);
      } else if (hash.match(/^#\/new\/([^/]+)/)) {
        // Step 1: #/new/:id
        const id = hash.match(/^#\/new\/([^/]+)/)[1];
        screen = window.Step1Screen;
        params = { id };
        stepNumber = 1;
        inStepper = true;
        showBottomNav = false;
        headerHTML = this.renderStepperHeader(1, id);
      } else if (hash === '#/compare') {
        screen = window.SettingsScreen;
        params = { tab: 'compare' };
        showFab = false;
        showBottomNav = true;
        headerHTML = this.renderDefaultHeader();
      } else if (hash === '#/yacht-pricing') {
        screen = window.YachtPricingScreen;
        showFab = false;
        showBottomNav = false; // hide main bottom island (internal tab bar used instead)
        headerHTML = ''; // screen renders its own header with back button
      } else if (hash.match(/^#\/data/)) {
        // Redirected to unified Settings screen — Sync tab
        screen = window.SettingsScreen;
        params = { tab: 'sync' };
        showFab = false;
        showBottomNav = true;
        headerHTML = this.renderDefaultHeader();
      } else if (hash === '#/source-list') {
        screen = window.SourceListScreen;
        showFab = false;
        showBottomNav = true;
        headerHTML = this.renderDefaultHeader();
      } else if (hash === '#/clients-list') {
        screen = window.ClientsListScreen;
        showFab = false;
        showBottomNav = true;
        headerHTML = this.renderDefaultHeader();
      } else if (hash === '#/food-menu') {
        screen = window.FoodMenuScreen;
        showFab = false;
        showBottomNav = true;
        headerHTML = this.renderDefaultHeader();
      } else if (hash === '#/filter') {
        screen = window.FilterScreen;
        showFab = false;
        showBottomNav = true;
        headerHTML = this.renderDefaultHeader();
      } else if (hash.match(/^#\/voucher\/([^/]+)/)) {
        const id = hash.match(/^#\/voucher\/([^/]+)/)[1];
        screen = window.VoucherScreen;
        params = { id };
        showFab = false;
        showBottomNav = false;
        headerHTML = ''; // Custom header inside screen
      } else if (hash === '#/settings') {
        screen = window.SettingsScreen;
        showFab = false;
        showBottomNav = true;
        headerHTML = this.renderDefaultHeader();
      } else if (hash === '#/dashboard' || hash === '#/' || hash === '#' || hash === '') {
         // Dashboard
         screen = window.DashboardScreen;
         showFab = true;
         showBottomNav = true;
         headerHTML = this.renderDefaultHeader();

         // Auto-import legacy reservations if localStorage is empty
         const existingCount = window.Storage.getAllReservations().length;
         if (existingCount === 0) {
           window.Storage.autoImportLegacy().then(result => {
             if (result.imported > 0) {
               window.Toast.success(`Imported ${result.imported} historical reservations`);
               // Refresh only the list in-place (avoid full route() re-cycle)
               const listEl = document.getElementById('reservationList');
               if (listEl && window.DashboardScreen) {
                 const currentFilter = listEl.getAttribute('data-active-filter') || 'all';
                 const reservations = window.Storage.getAllReservations();
                 listEl.innerHTML = window.DashboardScreen.renderList(reservations, currentFilter);
                 window.DashboardScreen.bindCardEvents();
               }
             }
           });
         }
      } else {
        // Unknown route — do nothing (avoids ghost dashboard render that causes hash reset loop)
        console.warn('[ROUTE] Unknown route, ignoring:', hash);
        return;
      }

      // Update header
      document.getElementById('app-header').innerHTML = headerHTML;

      // Check sync status on dashboard load (after header render)
      if (hash === '#/dashboard' || hash === '' || hash === '#/') {
        window.Storage.checkSyncStatus().then(status => {
          window.AppState = window.AppState || {};
          window.AppState.syncStatus = status;
          if (status.hasWarnings) {
            this.showSyncWarning(status);
            // Only re-render card list when there are warnings (to show sync alert icons)
            const listEl = document.getElementById('reservationList');
            if (listEl && window.DashboardScreen) {
              const currentFilter = listEl.getAttribute('data-active-filter') || 'all';
              const reservations = window.Storage.getAllReservations();
              listEl.innerHTML = window.DashboardScreen.renderList(reservations, currentFilter);
              window.DashboardScreen.bindCardEvents();
            }
          }
        });
      }

      // Attach theme toggle
      const initThemeToggle = () => {
        const toggles = document.querySelectorAll("#theme-toggle, #header-theme-toggle");
        if (toggles.length === 0) return;

        const updateUI = (isDark) => {
          document.body.classList.toggle("theme-dark", isDark);
          document.documentElement.classList.toggle("theme-dark", isDark);
          
          toggles.forEach(toggle => {
            const iconUse = toggle.querySelector("use");
            if (iconUse) {
              iconUse.setAttribute("href", isDark ? "#icon-moon" : "#icon-sun");
            }
            toggle.setAttribute("aria-checked", isDark.toString());
            toggle.setAttribute("aria-label", isDark ? "Activate light mode" : "Activate dark mode");
            
            // If it's the island toggle, update the label text
            const label = toggle.querySelector("#theme-label");
            if (label) {
              label.textContent = isDark ? "Dark Mode" : "Light Mode";
            }
          });
          
          // Persistence
          localStorage.setItem("theme", isDark ? "dark" : "light");
        };

        const isDark = document.body.classList.contains("theme-dark") || localStorage.getItem("theme") === "dark";
        updateUI(isDark);

        toggles.forEach(toggle => {
          toggle.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            const currentlyDark = document.body.classList.contains("theme-dark");
            updateUI(!currentlyDark);
          });
        });
      };
      
      initThemeToggle();

      // Update FAB
      if (showFab) {
        window.FAB.show();
      } else {
        window.FAB.hide();
      }

      // Update main padding
      if (inStepper) {
        mainEl.classList.add('in-stepper');
      } else {
        mainEl.classList.remove('in-stepper');
      }

      // Render screen
      if (screen) {
        // Set data-step attribute for hydration/debugging (e.g., "step1", "step2", "step3")
        container.dataset.step = `step${stepNumber}`;
        screen.render(container, params);
        this.currentScreen = screen;
        this.currentScreenName = hash; // track for [ROUTE] log
        console.log('%c[ROUTE] Successfully rendered:', 'color:#2e7d32', hash);
      } else {
        container.dataset.step = 'dashboard';
      }

      // Render step footer for stepper mode
      this.renderStepFooter(stepNumber, params.id, flowMode);
    },

    /**
     * Show a sync warning on the dashboard
     */
    showSyncWarning(status) {
      const existing = document.getElementById('sync-warning');
      if (existing) existing.remove();

      if (!status.hasWarnings) return;

      const msg = status.onlyInLocal.length > 0 
        ? `${status.onlyInLocal.length} unbacked-up items`
        : 'Data out of sync';

      const warningHtml = `
        <button id="sync-warning" class="header-action-btn sync-warning-icon animate-jump-in" 
                onclick="window.App.navigate('#/data')" 
                title="${msg}"
                style="color: var(--color-warning); background: var(--color-warning-muted); border-radius: 50%; padding: 4px;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:18px;height:18px">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
        </button>
      `;

      // Insert into header-actions
      const headerActions = document.querySelector('.header-actions');
      if (headerActions) {
        headerActions.insertAdjacentHTML('afterbegin', warningHtml);
      }
    },

    /**
     * Render default header (Dashboard)
     */
    renderDefaultHeader() {
      return `
        <span class="header-title"><img src="https://www.loveshackcruises.com/wp-content/uploads/2025/06/newLogo.png" alt="Love Shack Cruises"></span>
        <div class="header-right">
          <div class="header-actions">
            <button class="header-theme-toggle" id="header-theme-toggle" aria-label="Activate dark mode" role="switch" aria-checked="false">
              <div class="toggle-theme-left">
                <svg class="icon" aria-hidden="true">
                  <use id="theme-icon-use" href="#icon-sun"></use>
                </svg>
              </div>
            </button>
            <button class="header-action-btn" onclick="window.App.navigate('#/data')" title="Manage Data">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:22px;height:22px">
                <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
          </div>
        </div>
      `;
    },

    /**
     * Render stepper header with back button + progress bar
     */
    renderStepperHeader(step, id, isViewOnly = false, flowMode = 'default') {
      const isNewRes = flowMode === 'new-reservation';
      const backHash = '#/dashboard';
      const saveExitAction = isNewRes
        ? (step === 1 ? 'window.Step2Screen.autoSave()' : 'window.Step1Screen.autoSave()')
        : (step === 1 ? 'window.Step1Screen.autoSave()' : step === 2 ? 'window.Step2Screen.autoSave()' : 'window.Step3Screen.autoSave()');

      return `
        <a href="${backHash}" class="header-back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Back
        </a>
        ${isViewOnly ? '<span class="header-title" style="font-size: var(--font-md);">Reservation</span>' : window.StepperBar.render(step, id, flowMode)}
        <div style="display: flex; align-items: center; background: var(--color-surface-alt); border: 1px solid var(--color-border); border-radius: 20px; height: 32px; overflow: hidden; margin-right: -8px;">
          <button onclick="${saveExitAction}; window.App.navigate('#/dashboard')" style="background: transparent; border: none; color: var(--color-accent); font-size: 13px; font-weight: 500; height: 100%; padding: 0 12px; display: flex; align-items: center; gap: 4px; cursor: pointer;">
            Save
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </button>
          <div style="width: 1px; height: 20px; background: var(--color-border);"></div>
          <button onclick="window.App.openSyncSheet('${id}')" style="background: transparent; border: none; color: var(--color-accent); height: 100%; padding: 0 8px; display: flex; align-items: center; cursor: pointer;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      `;
    },

    renderStepFooter(step, id, flowMode = 'default') {
      // Remove existing footer
      const existing = document.getElementById('step-footer');
      if (existing) existing.remove();

      if (step === 0) return; // Not in stepper

      const reservation = id ? window.Storage.getReservation(id) : null;
      const isBooked = reservation && reservation.status !== 'draft';

      const isNewRes = flowMode === 'new-reservation';

      // Actions
      const pricingAction = isNewRes
        ? `window.App.navigate('#/new-reservation/${id}/pricing')`
        : `window.App.navigate('#/new/${id}')`;
      const detailsAction = isNewRes
        ? `window.App.navigate('#/new-reservation/${id}')`
        : `window.App.navigate('#/new/${id}/details')`;
      const resumeAction = `window.App.navigate('#/new/${id}/adjustments')`;

      // Back button logic
      let backAction = '';
      if (isNewRes) {
        backAction = step === 1 ? `window.App.navigate('#/dashboard')` : detailsAction;
      } else {
        backAction = step === 1 ? `window.App.navigate('#/dashboard')` : (step === 2 ? pricingAction : detailsAction);
      }
      
      // Continue button logic
      let continueAction = '';
      let continueText = 'Continue';
      let continueIcon = '<polyline points="9 18 15 12 9 6"/>';

      if (isNewRes) {
        if (step === 1) {
          continueAction = `window.Step2Screen.autoSave(); window.Storage.updateCurrentStep('${id}', 2); ${pricingAction}`;
        } else if (step === 2) {
          if (isBooked) {
             continueAction = `window.App.navigate('#/dashboard')`;
             continueText = 'Done';
             continueIcon = '<polyline points="20 6 9 17 4 12"/>';
          } else {
             continueAction = `window.App.confirmReservation2Step('${id}')`;
             continueText = 'Confirm';
             continueIcon = '<polyline points="20 6 9 17 4 12"/>';
          }
        }
      } else {
        if (step === 1) {
          continueAction = `window.Storage.updateCurrentStep('${id}', 2); ${detailsAction}`;
        } else if (step === 2) {
          continueAction = `window.Step2Screen.autoSave(); window.Storage.updateCurrentStep('${id}', 3); ${resumeAction}`;
        } else if (step === 3) {
          if (isBooked) {
             continueAction = `window.App.navigate('#/dashboard')`;
             continueText = 'Done';
             continueIcon = '<polyline points="20 6 9 17 4 12"/>';
          } else {
             continueAction = `window.Step3Screen.confirmBooking()`;
             continueText = 'Confirm';
             continueIcon = '<polyline points="20 6 9 17 4 12"/>';
          }
        }
      }

      // SVGs for tabs
      const iconPricing = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`;
      const iconTrip = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
      const iconResume = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;

      // Render Middle Tabs
      let tabsHtml = '';
      if (isNewRes) {
        tabsHtml = `
          <button class="footer-tab ${step === 1 ? 'active' : ''}" onclick="${detailsAction}">
            ${iconTrip}
            <span>Trip</span>
          </button>
          <button class="footer-tab ${step === 2 ? 'active' : ''}" onclick="${pricingAction}">
            ${iconPricing}
            <span>Pricing</span>
          </button>
        `;
      } else {
        tabsHtml = `
          <button class="footer-tab ${step === 1 ? 'active' : ''}" onclick="${pricingAction}">
            ${iconPricing}
            <span>Pricing</span>
          </button>
          <button class="footer-tab ${step === 2 ? 'active' : ''}" onclick="${detailsAction}">
            ${iconTrip}
            <span>Trip</span>
          </button>
          <button class="footer-tab ${step === 3 ? 'active' : ''}" onclick="${resumeAction}">
            ${iconResume}
            <span>Resume</span>
          </button>
        `;
      }

      let footerHtml = `
        <div class="step-footer" id="step-footer">
          <div class="step-footer-inner">
            
            <!-- Back Button -->
            <button class="footer-nav-btn back" onclick="${backAction}" aria-label="Step back">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:20px;height:20px">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>

            <!-- Middle Tabs Group -->
            <div class="footer-tabs">
              ${tabsHtml}
            </div>

            <!-- Continue/Confirm Button -->
            <button class="footer-nav-btn continue" onclick="${continueAction}">
              <span>${continueText}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:18px;height:18px">
                ${continueIcon}
              </svg>
            </button>

          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', footerHtml);
    },

    /**
     * @deprecated — Screen logic moved to SettingsScreen (settings.js) with tab='sync'
     * Kept as a no-op stub to avoid breaking any remaining references.
     */
    renderDataScreen(container) {
      if (window.SettingsScreen) {
        window.SettingsScreen.render(container, { tab: 'sync' });
        return;
      }
    },

    downloadBackup() {
      const json = window.Storage.exportJSON();
      const blob = new window.Blob([json], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'reservations.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },

      async confirmReservation2Step(id) {
        if (!id) return;

        // Auto-save the pricing screen (which is currently rendering as Step 2 of the 2-step flow)
        if (window.Step1Screen && typeof window.Step1Screen.autoSave === 'function') {
          window.Step1Screen.autoSave();
        }

        const reservation = window.Storage.getReservation(id);
        if (!reservation) return;

        const s2 = reservation.data.step2_details;
        if (!s2 || !s2.customerName) {
          window.Toast.warning("Please add a customer name in Step 1");
          // Redirect back to step 1 (trip details)
          window.App.navigate(`#/new-reservation/${id}`);
          return;
        }

        window.Toast.success("Confirming booking...");
        window.Storage.promoteToBooking(id);

        if (window.SyncManager) {
          try {
            await window.SyncManager.syncReservation(id);
            window.Toast.success("Booking confirmed & synced! 🎉");
          } catch (e) {
            console.error("Sync error during confirm", e);
            window.Toast.warning("Booking confirmed, but sync failed.");
          }
        } else {
          window.Toast.success("Booking confirmed! 🎉");
        }

        window.App.navigate("#/dashboard");
      },


     openSyncSheet(id) {
       if (!id || id === 'undefined') {
         window.App.navigate('#/dashboard');
         return;
       }

       if (!this.syncContainer) {
         this.syncContainer = document.createElement("div");
         document.body.appendChild(this.syncContainer);
       }
       
       const r = window.Storage.getReservation(id);
       const isSynced = r && r.airtable_id ? true : false;
       const syncStatus = r?.sync_status || 'unknown';
       const airtableId = r?.airtable_id || null;
       const lastSynced = r?.lastSyncedAt ? new Date(r.lastSyncedAt).toLocaleString() : '—';
       const createdAt = r?.createdAt ? new Date(r.createdAt).toLocaleString() : '—';
       const updatedAt = r?.updatedAt ? new Date(r.updatedAt).toLocaleString() : '—';

       const syncBadgeColor = isSynced ? 'var(--color-success)' : syncStatus === 'failed' ? 'var(--color-danger)' : 'var(--color-warning)';
       const syncBadgeLabel = isSynced ? '✓ Synced' : syncStatus === 'failed' ? '✗ Failed' : '⏳ Pending';

       let backupPath = "./data/reservations.json";
       if (window.SyncManager && window.SyncManager.config) {
         backupPath = window.SyncManager.config.settings.localBackupPath;
       }

       this.syncContainer.innerHTML = `
         <div class="dtp-backdrop" id="app-sync-backdrop"></div>
         <div class="dtp-sheet" id="app-sync-sheet" style="padding-bottom: 32px;">
           <div class="dtp-header" style="justify-content: center; padding-top: 16px;">
             <div class="dtp-title" style="text-align: center;">Storage Status</div>
           </div>
           
           <div style="padding: 0 16px 16px; display: flex; flex-direction: column; gap: 12px;">

             <!-- Storage Layers -->
             <div style="display: flex; flex-direction: column; gap: 8px;">

               <!-- Layer 1: LocalStorage -->
               <div style="background: var(--color-surface-alt); border-radius: 10px; padding: 12px 14px; display: flex; align-items: center; gap: 12px; border: 1px solid var(--color-border);">
                 <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(34,197,94,0.1); border: 1px solid rgba(34,197,94,0.3); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" stroke-width="2">
                     <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
                   </svg>
                 </div>
                 <div style="flex: 1; min-width: 0;">
                   <div style="font-size: 13px; font-weight: 500; color: var(--color-text);">LocalStorage</div>
                   <div style="font-size: 11px; color: var(--color-text-secondary);">Created: ${createdAt}</div>
                   <div style="font-size: 11px; color: var(--color-text-secondary);">Updated: ${updatedAt}</div>
                 </div>
                 <div style="font-size: 12px; font-weight: 600; color: var(--color-success); white-space: nowrap;">✓ Saved</div>
               </div>

               <!-- Layer 2: Nube -->
               <div style="background: var(--color-surface-alt); border-radius: 10px; padding: 12px 14px; display: flex; align-items: center; gap: 12px; border: 1px solid var(--color-border);">
                 <div style="width: 36px; height: 36px; border-radius: 8px; background: color-mix(in srgb, ${syncBadgeColor} 10%, transparent); border: 1px solid color-mix(in srgb, ${syncBadgeColor} 30%, transparent); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${syncBadgeColor}" stroke-width="2">
                     <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
                     <path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
                   </svg>
                 </div>
                 <div style="flex: 1; min-width: 0;">
                   <div style="font-size: 13px; font-weight: 500; color: var(--color-text);">Nube</div>
                   ${airtableId ? `<div style="font-size: 10px; color: var(--color-text-secondary); font-family: monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${airtableId}</div>` : '<div style="font-size: 11px; color: var(--color-text-secondary);">No record yet</div>'}
                   ${isSynced ? `<div style="font-size: 11px; color: var(--color-text-secondary);">Last sync: ${lastSynced}</div>` : ''}
                 </div>
                 <div style="font-size: 12px; font-weight: 600; color: ${syncBadgeColor}; white-space: nowrap;">${syncBadgeLabel}</div>
               </div>

             </div>

             <!-- Divider -->
             <div style="height: 1px; background: var(--color-border);"></div>

             <!-- Export -->
             <div>
               <div style="font-size: 11px; font-weight: 500; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px;">Manual Backup</div>
               <div style="font-size: 10px; font-family: monospace; color: var(--color-text-secondary); margin-bottom: 8px; word-break: break-all;">${backupPath}</div>
               <button class="btn btn-secondary" style="width: 100%; font-size: 13px; padding: 10px;" onclick="window.App.downloadBackup()">
                 Download JSON Backup
               </button>
                <!-- Sync Action -->
             <button class="btn btn-primary" id="app-force-sync" style="width: 100%; display: flex; justify-content: center; gap: 8px; padding: 12px;">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <path d="M21 2v6h-6"></path>
                 <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
                 <path d="M3 22v-6h6"></path>
                 <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
               </svg>
               ${isSynced ? 'Re-Sync to Nube' : 'Sync to Nube'}
             </button>
             <button class="btn btn-danger" id="app-delete-reservation" style="width: 100%; display: flex; justify-content: center; gap: 8px; padding: 12px; margin-top: 8px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
                Borrar Reservación
              </button>
           </div>
         </div>
       `;
 
       document.getElementById("app-sync-backdrop").addEventListener("click", () => {
         this.hideSyncSheet();
       });
       
       document.getElementById("app-force-sync").addEventListener("click", async () => {
         const btn = document.getElementById("app-force-sync");
         btn.innerHTML = `Syncing...`;
         btn.disabled = true;
         try {
           if (window.SyncManager) {
             await window.SyncManager.syncReservation(id);
             window.Toast.success("Successfully synced!");
           } else {
             window.Toast.warning("SyncManager not loaded.");
           }
         } catch (e) {
           window.Toast.error("Sync failed. Check console.");
         }
         this.hideSyncSheet();
         this.route();
       });

       document.getElementById("app-delete-reservation").addEventListener("click", async () => {
          const btn = document.getElementById("app-delete-reservation");
          const originalText = btn.innerHTML;
          btn.innerHTML = `Cargando opciones...`;
          btn.disabled = true;

          try {
            // Check sources
            const localExists = window.Storage.getReservation(id) ? true : false;
            const airtableExists = airtableId ? true : false;
            
            // Load JSON and check if it exists there
            const jsonItems = await window.Storage.loadFromJSON();
            const jsonExists = jsonItems.some(item => item.id === id);

            btn.innerHTML = originalText;
            btn.disabled = false;

            const clientName = r?.data?.step2_details?.customerName || r?.guestName || r?.contactName || r?.name || 'Reservación sin nombre';

            if (!window.DeleteDialog) {
              window.Toast.error("El diálogo de eliminación no está cargado.");
              return;
            }

            window.DeleteDialog.show({
              id: id,
              clientName: clientName,
              hasLocal: localExists,
              hasAirtable: airtableExists,
              hasJson: jsonExists,
              onConfirm: async ({ deleteLocal, deleteAirtable, deleteJson }) => {
                const deletedSources = [];

                try {
                  // 1. Delete from Airtable if requested
                  if (deleteAirtable) {
                    if (!window.SyncManager) {
                      window.Toast.error("SyncManager no cargado. No se pudo borrar de Airtable.");
                    } else {
                      window.Toast.info("Eliminando de Airtable...");
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
                    window.Toast.info("Eliminando de reservations.json...");
                    const currentJsonList = await window.Storage.loadFromJSON();
                    const filtered = currentJsonList.filter(item => item.id !== id);
                    const success = await window.Storage.saveToJSON(filtered);
                    if (success) {
                      deletedSources.push("reservations.json");
                    } else {
                      window.Toast.warning("Servidor local no disponible. Descargando archivo JSON actualizado...");
                      
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
                    window.Toast.success(`¡Reservación eliminada de ${deletedSources.join(", ")} exitosamente!`);
                  }

                  this.hideSyncSheet();
                  this.route();
                } catch (e) {
                  console.error(e);
                  window.Toast.error("Error al eliminar la reservación: " + e.message);
                  throw e;
                }
              }
            });
          } catch (e) {
            console.error(e);
            window.Toast.error("Error al cargar opciones de eliminación.");
            btn.innerHTML = originalText;
            btn.disabled = false;
          }
        });

       setTimeout(() => {
         document.getElementById("app-sync-backdrop").setAttribute("data-state", "open");
         document.getElementById("app-sync-sheet").setAttribute("data-state", "open");
       }, 10);
     },

     hideSyncSheet() {
       const backdrop = document.getElementById("app-sync-backdrop");
       const sheet = document.getElementById("app-sync-sheet");
       if (backdrop) backdrop.removeAttribute("data-state");
       if (sheet) sheet.removeAttribute("data-state");
     }
   };

   // Export globally
   window.App = App;

   // Boot when DOM ready
   document.addEventListener('DOMContentLoaded', () => {
     App.init();
   });
 })();
