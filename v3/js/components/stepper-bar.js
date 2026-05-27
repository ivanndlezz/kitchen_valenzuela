/**
 * Stepper Bar — Love Shack v3
 * Progress indicator for the 3-step booking flow or alternative 2-step flow
 */

const StepperBar = {
  /**
   * Render the stepper bar into the header area
   * @param {number} currentStep - 1, 2, or 3 (for default), 1 or 2 (for new-reservation)
   * @param {string} id - Reservation ID
   * @param {string} flowMode - 'default' or 'new-reservation'
   * @returns {string} HTML string
   */
  render(currentStep, id, flowMode = 'default') {
    const isNewRes = flowMode === 'new-reservation';
    const steps = isNewRes
      ? [
          { num: 1, label: 'Trip' },
          { num: 2, label: 'Pricing' },
        ]
      : [
          { num: 1, label: 'Pricing' },
          { num: 2, label: 'Details' },
          { num: 3, label: 'Booking' },
        ];

    let html = '<div class="stepper-bar">';

    steps.forEach((step, i) => {
      const isActive = step.num === currentStep;
      const isCompleted = step.num < currentStep;

      // Dot
      let dotClass = 'stepper-dot';
      if (isActive) dotClass += ' active';
      else if (isCompleted) dotClass += ' completed';

      const dotContent = isCompleted
        ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>'
        : step.num;

      html += `<div class="stepper-step">`;
      html += `<div class="${dotClass}" onclick="window.StepperBar.handleStepClick(${step.num}, '${id}', '${flowMode}')">${dotContent}</div>`;

      // Line (not after last step)
      if (i < steps.length - 1) {
        const lineFilled = step.num < currentStep;
        html += `<div class="stepper-line ${lineFilled ? 'filled' : ''}"></div>`;
      }

      html += `</div>`;
    });

    html += '</div>';
    return html;
  },

  /**
   * Handle click on a stepper dot
   * @param {number} stepNum
   * @param {string} id
   * @param {string} flowMode
   */
  handleStepClick(stepNum, id, flowMode = 'default') {
    if (!id) return;

    // Auto-save current screen before navigating
    if (window.App && window.App.currentScreen && typeof window.App.currentScreen.autoSave === 'function') {
      window.App.currentScreen.autoSave();
    }

    const routes = flowMode === 'new-reservation'
      ? {
          1: `#/new-reservation/${id}`,
          2: `#/new-reservation/${id}/pricing`,
        }
      : {
          1: `#/new/${id}`,
          2: `#/new/${id}/details`,
          3: `#/new/${id}/adjustments`,
        };

    if (routes[stepNum]) {
      window.App.navigate(routes[stepNum]);
    }
  },

  /**
   * Render step labels separately
   * @param {number} currentStep
   * @param {string} flowMode
   * @returns {string} HTML
   */
  renderLabels(currentStep, flowMode = 'default') {
    const labels = flowMode === 'new-reservation'
      ? ['Trip', 'Pricing']
      : ['Pricing', 'Details', 'Booking'];

    return `<div class="stepper-labels">${labels
      .map((label, i) => {
        let cls = 'stepper-label';
        if (i + 1 === currentStep) cls += ' active';
        else if (i + 1 < currentStep) cls += ' completed';
        return `<span class="${cls}">${label}</span>`;
      })
      .join('')}</div>`;
  },
};

window.StepperBar = StepperBar;
