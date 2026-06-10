/**
 * compare-sheet.js
 * Markup definition for the sync comparison sheet content.
 */

(function () {
  function render({ name, sku, status, fieldsHTML, actionsHTML }) {
    return `
      <div class="sheet-detail-header">
        <div class="sheet-detail-name">${name}</div>
        <div class="sheet-detail-uuid">SKU / ID: ${sku}</div>
        <div style="margin-top: 10px;">
          <span class="sync-badge sync-badge--${status.type}">${status.label}</span>
        </div>
      </div>

      <div class="compare-sheet-table-wrapper">
        <table class="compare-detail-table">
          <thead>
            <tr>
              <th>Campo</th>
              <th>Local</th>
              <th>JSON</th>
              <th>Nube</th>
            </tr>
          </thead>
          <tbody>
            ${fieldsHTML}
          </tbody>
        </table>
      </div>

      <div class="sheet-actions-section">
        <h4 class="sheet-actions-title">Acciones de Resolucion</h4>
        <div class="sheet-actions-grid">
          ${actionsHTML}
        </div>
      </div>
    `;
  }

  window.CompareSheet = {
    render,
  };
})();
