/**
 * Filter & Stats Screen — Love Shack v3
 * Displays statistics and filtering by tour type, duration, etc.
 */

const FilterScreen = {
  container: null,

  render(container) {
    this.container = container;
    const reservations = window.Storage.getAllReservations();
    const stats = this.calculateStats(reservations);

    container.innerHTML = `
      <div class="step-content stagger-children">
        <div class="step-section">
          <div class="step-section-title">Resumen General</div>
          <div class="stat-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-top: 12px;">
            <div class="stat-card" style="background: var(--color-surface-alt); padding: 16px; border-radius: var(--radius-lg); text-align: center;">
              <div style="font-size: 11px; color: var(--color-text-tertiary); text-transform: uppercase;">Total Reservas</div>
              <div style="font-size: 24px; font-weight: 700; color: var(--color-text);">${reservations.length}</div>
            </div>
            <div class="stat-card" style="background: var(--color-surface-alt); padding: 16px; border-radius: var(--radius-lg); text-align: center;">
              <div style="font-size: 11px; color: var(--color-text-tertiary); text-transform: uppercase;">Confirmadas</div>
              <div style="font-size: 24px; font-weight: 700; color: var(--color-success);">${stats.confirmed}</div>
            </div>
          </div>
        </div>

        <div class="step-section">
          <div class="step-section-title">Por Tipo de Tour</div>
          <div class="breakdown" style="background: var(--color-surface-alt); border-radius: var(--radius-lg); overflow: hidden;">
            ${Object.entries(stats.byTour).map(([tour, count]) => `
              <div class="breakdown-row" style="display: flex; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--color-border-subtle);">
                <div style="font-size: 14px; color: var(--color-text);">${tour || 'Otros'}</div>
                <div style="font-weight: 600; color: var(--color-accent);">${count}</div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="step-section">
          <div class="step-section-title">Por Duración</div>
          <div class="breakdown" style="background: var(--color-surface-alt); border-radius: var(--radius-lg); overflow: hidden;">
            ${Object.entries(stats.byDuration).sort((a,b) => a[0]-b[0]).map(([hours, count]) => `
              <div class="breakdown-row" style="display: flex; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid var(--color-border-subtle);">
                <div style="font-size: 14px; color: var(--color-text);">${hours} Horas</div>
                <div style="font-weight: 600; color: var(--color-accent);">${count}</div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  },

  calculateStats(reservations) {
    const stats = {
      confirmed: 0,
      byTour: {},
      byDuration: {}
    };

    reservations.forEach(r => {
      if (r.status === 'reservado' || r.status === 'completado') stats.confirmed++;
      
      const tour = r.data?.step2_details?.tourType || 'No especificado';
      stats.byTour[tour] = (stats.byTour[tour] || 0) + 1;

      const duration = r.data?.step1_pricing?.durationHours || 0;
      if (duration > 0) {
        stats.byDuration[duration] = (stats.byDuration[duration] || 0) + 1;
      }
    });

    return stats;
  },

  destroy() {
    this.container = null;
  }
};

window.FilterScreen = FilterScreen;
