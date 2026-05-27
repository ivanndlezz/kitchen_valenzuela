/**
 * Delete Dialog Component — Love Shack v3
 * Gorgeous, custom, multi-source reservation deletion dialog with checkboxes
 */

(function () {
  // Inject component CSS dynamically
  const styleId = 'delete-dialog-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .delete-dialog-backdrop {
        position: fixed;
        inset: 0;
        z-index: 2000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.25s ease, visibility 0.25s ease;
      }
      .delete-dialog-backdrop.visible {
        opacity: 1;
        visibility: visible;
      }
      .delete-dialog {
        width: 100%;
        max-width: 440px;
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: 20px;
        padding: 24px;
        box-shadow: var(--shadow-xl);
        display: flex;
        flex-direction: column;
        gap: 16px;
        transform: scale(0.92);
        transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        text-align: left;
      }
      .delete-dialog-backdrop.visible .delete-dialog {
        transform: scale(1);
      }
      .delete-dialog-header {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .delete-dialog-title {
        font-size: 18px;
        font-weight: 600;
        color: var(--color-text);
        margin: 0;
      }
      .delete-dialog-subtitle {
        font-size: 13px;
        color: var(--color-text-secondary);
      }
      .delete-dialog-options {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-top: 4px;
      }
      .delete-dialog-option {
        display: flex;
        align-items: center;
        gap: 14px;
        background: var(--color-surface-alt);
        border: 1px solid var(--color-border);
        border-radius: 14px;
        padding: 14px 16px;
        cursor: pointer;
        transition: all 0.2s ease;
        user-select: none;
      }
      .delete-dialog-option:hover {
        background: var(--color-surface-raised);
        border-color: var(--color-accent);
      }
      .delete-dialog-option.checked.opt-local {
        border-color: var(--color-success);
        background: var(--color-success-muted);
      }
      .delete-dialog-option.checked.opt-airtable {
        border-color: var(--color-accent);
        background: var(--color-accent-muted);
      }
      .delete-dialog-option.checked.opt-json {
        border-color: var(--color-warning);
        background: var(--color-warning-muted);
      }
      .delete-dialog-option.disabled {
        opacity: 0.45;
        cursor: not-allowed;
        pointer-events: none;
      }
      .delete-dialog-option-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .delete-dialog-option-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--color-text);
      }
      .delete-dialog-option-desc {
        font-size: 11px;
        color: var(--color-text-secondary);
      }
      .delete-dialog-checkbox-icon {
        width: 20px;
        height: 20px;
        border-radius: 6px;
        border: 2px solid var(--color-text-tertiary);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        flex-shrink: 0;
        background: transparent;
      }
      .delete-dialog-option.checked .delete-dialog-checkbox-icon {
        background: currentColor;
        border-color: currentColor;
      }
      .delete-dialog-option.checked.opt-local .delete-dialog-checkbox-icon {
        color: var(--color-success);
      }
      .delete-dialog-option.checked.opt-airtable .delete-dialog-checkbox-icon {
        color: var(--color-accent);
      }
      .delete-dialog-option.checked.opt-json .delete-dialog-checkbox-icon {
        color: var(--color-warning);
      }
      .delete-dialog-checkbox-check {
        width: 10px;
        height: 10px;
        fill: none;
        stroke: #ffffff;
        stroke-width: 3px;
        stroke-linecap: round;
        stroke-linejoin: round;
        display: none;
      }
      .theme-dark .delete-dialog-option.checked.opt-local .delete-dialog-checkbox-check,
      .theme-dark .delete-dialog-option.checked.opt-airtable .delete-dialog-checkbox-check,
      .theme-dark .delete-dialog-option.checked.opt-json .delete-dialog-checkbox-check {
        stroke: #000000;
      }
      .delete-dialog-option.checked .delete-dialog-checkbox-check {
        display: block;
      }
      .delete-dialog-recommendation {
        background: var(--color-warning-muted);
        border: 1px solid var(--color-warning);
        border-radius: 10px;
        padding: 10px 12px;
        font-size: 11px;
        color: var(--color-warning);
        display: flex;
        align-items: flex-start;
        gap: 8px;
      }
      .delete-dialog-recommendation-icon {
        width: 14px;
        height: 14px;
        flex-shrink: 0;
        margin-top: 1px;
      }
      .delete-dialog-actions {
        display: flex;
        gap: 12px;
        margin-top: 8px;
      }
      .delete-dialog-btn {
        flex: 1;
        height: 44px;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 600;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border: none;
        transition: all 0.2s ease;
      }
      .delete-dialog-btn-cancel {
        background: var(--color-surface-raised);
        color: var(--color-text);
        border: 1px solid var(--color-border);
      }
      .delete-dialog-btn-cancel:hover {
        background: var(--color-surface-alt);
      }
      .delete-dialog-btn-confirm {
        background: var(--color-danger);
        color: #ffffff;
      }
      .delete-dialog-btn-confirm:hover {
        background: #e0241b;
      }
      .delete-dialog-btn-confirm:disabled {
        background: var(--color-text-tertiary);
        color: var(--color-text-secondary);
        cursor: not-allowed;
        opacity: 0.5;
      }
    `;
    document.head.appendChild(style);
  }

  const DeleteDialog = {
    /**
     * Show the custom delete options dialog
     * @param {Object} config - Config parameters
     * @param {string} config.id - The reservation ID
     * @param {string} config.clientName - The client name
     * @param {boolean} config.hasLocal - If exists in LocalStorage
     * @param {boolean} config.hasAirtable - If exists in Airtable (has airtable_id)
     * @param {boolean} config.hasJson - If exists in JSON file
     * @param {Function} config.onConfirm - Callback on confirm ({ deleteLocal, deleteAirtable, deleteJson })
     */
    show({ id, clientName, hasLocal = true, hasAirtable = false, hasJson = false, onConfirm }) {
      // Clean up any existing delete dialogs first
      const existing = document.getElementById('delete-dialog-overlay');
      if (existing) existing.remove();

      // Ensure at least one option is present
      const clientDisplay = clientName ? clientName : 'Reservación sin nombre';

      // Create overlay container
      const overlay = document.createElement('div');
      overlay.id = 'delete-dialog-overlay';
      overlay.className = 'delete-dialog-backdrop';

      overlay.innerHTML = `
        <div class="delete-dialog" role="dialog" aria-modal="true">
          <div class="delete-dialog-header">
            <h3 class="delete-dialog-title">Eliminar Reservación</h3>
            <span class="delete-dialog-subtitle">Para: <strong>${clientDisplay}</strong></span>
          </div>

          <div class="delete-dialog-options">
            <!-- LocalStorage Option -->
            <div class="delete-dialog-option opt-local ${hasLocal ? 'checked' : 'disabled'}" data-source="local">
              <div class="delete-dialog-checkbox-icon">
                <svg class="delete-dialog-checkbox-check" viewBox="0 0 10 10">
                  <polyline points="2 5 4 7 8 3"></polyline>
                </svg>
              </div>
              <div class="delete-dialog-option-content">
                <span class="delete-dialog-option-title">Borrar de LocalStorage</span>
                <span class="delete-dialog-option-desc">${hasLocal ? 'Elimina la copia de trabajo en tu navegador web.' : 'No disponible (no existe localmente)'}</span>
              </div>
            </div>

            <!-- Airtable Option -->
            <div class="delete-dialog-option opt-airtable ${hasAirtable ? 'checked' : 'disabled'}" data-source="airtable">
              <div class="delete-dialog-checkbox-icon">
                <svg class="delete-dialog-checkbox-check" viewBox="0 0 10 10">
                  <polyline points="2 5 4 7 8 3"></polyline>
                </svg>
              </div>
              <div class="delete-dialog-option-content">
                <span class="delete-dialog-option-title">Borrar de Airtable</span>
                <span class="delete-dialog-option-desc">${hasAirtable ? 'Elimina permanentemente de la base de datos en la nube.' : 'No disponible (no sincronizado en la nube)'}</span>
              </div>
            </div>

            <!-- JSON Option -->
            <div class="delete-dialog-option opt-json ${hasJson ? 'checked' : 'disabled'}" data-source="json">
              <div class="delete-dialog-checkbox-icon">
                <svg class="delete-dialog-checkbox-check" viewBox="0 0 10 10">
                  <polyline points="2 5 4 7 8 3"></polyline>
                </svg>
              </div>
              <div class="delete-dialog-option-content">
                <span class="delete-dialog-option-title">Borrar de reservations.json (Recomendado)</span>
                <span class="delete-dialog-option-desc">${hasJson ? 'Elimina del archivo de respaldo en disco.' : 'No disponible (no guardado en el archivo)'}</span>
              </div>
            </div>
          </div>

          <!-- Recommendation Banner (shows if json is available/checked) -->
          <div class="delete-dialog-recommendation" id="delete-dialog-recommendation-banner" style="${hasJson ? '' : 'display: none;'}">
            <svg class="delete-dialog-recommendation-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <span><strong>Recomendado:</strong> actualiza el archivo de respaldo para mantener la consistencia física de la base de datos.</span>
          </div>

          <div class="delete-dialog-actions">
            <button class="delete-dialog-btn delete-dialog-btn-cancel" id="delete-dialog-btn-cancel">Cancelar</button>
            <button class="delete-dialog-btn delete-dialog-btn-confirm" id="delete-dialog-btn-confirm">Eliminar seleccionados</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);

      // Trigger reflow & add active classes
      setTimeout(() => {
        overlay.classList.add('visible');
      }, 10);

      // DOM Elements
      const cancelBtn = overlay.querySelector('#delete-dialog-btn-cancel');
      const confirmBtn = overlay.querySelector('#delete-dialog-btn-confirm');
      const optionRows = overlay.querySelectorAll('.delete-dialog-option:not(.disabled)');
      const recommendationBanner = overlay.querySelector('#delete-dialog-recommendation-banner');

      // Selection state tracker
      const selection = {
        local: hasLocal,
        airtable: hasAirtable,
        json: hasJson
      };

      const updateConfirmButtonState = () => {
        const hasSelection = selection.local || selection.airtable || selection.json;
        confirmBtn.disabled = !hasSelection;
        
        // Show/hide recommendation banner based on JSON selection state
        if (selection.json) {
          recommendationBanner.style.display = 'flex';
        } else {
          recommendationBanner.style.display = 'none';
        }
      };

      // Toggle checkboxes on row clicks
      optionRows.forEach(row => {
        row.addEventListener('click', () => {
          const source = row.getAttribute('data-source');
          selection[source] = !selection[source];
          
          if (selection[source]) {
            row.classList.add('checked');
          } else {
            row.classList.remove('checked');
          }

          updateConfirmButtonState();
        });
      });

      // Close handler
      const closeDialog = () => {
        overlay.classList.remove('visible');
        overlay.addEventListener('transitionend', () => {
          overlay.remove();
        }, { once: true });
      };

      cancelBtn.addEventListener('click', closeDialog);
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeDialog();
      });

      // Confirm handler
      confirmBtn.addEventListener('click', async () => {
        confirmBtn.disabled = true;
        cancelBtn.disabled = true;
        confirmBtn.innerHTML = 'Eliminando...';
        optionRows.forEach(row => row.classList.add('disabled'));

        try {
          if (onConfirm) {
            await onConfirm({
              deleteLocal: selection.local,
              deleteAirtable: selection.airtable,
              deleteJson: selection.json
            });
          }
          closeDialog();
        } catch (err) {
          console.error('Error during deletion:', err);
          confirmBtn.innerHTML = 'Eliminar seleccionados';
          confirmBtn.disabled = false;
          cancelBtn.disabled = false;
          optionRows.forEach(row => {
            const src = row.getAttribute('data-source');
            const wasEnabled = (src === 'local' && hasLocal) || 
                               (src === 'airtable' && hasAirtable) || 
                               (src === 'json' && hasJson);
            if (wasEnabled) {
              row.classList.remove('disabled');
            }
          });
        }
      });
    }
  };

  window.DeleteDialog = DeleteDialog;
})();
