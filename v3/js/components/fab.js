/**
 * FAB Component — Love Shack v3
 * Floating Action Button that creates new drafts for the normal 3-step flow directly.
 */

(function () {
  'use strict';

  const FAB = {
    el: null,

    init() {
      this.el = document.getElementById('fab');
      if (!this.el) return;

      this.el.addEventListener('click', () => {
        this.handleClick();
      });
    },

    handleClick() {
      const draft = window.Storage.createDraft();
      const all = window.Storage.getAllReservations();
      const idx = all.findIndex(r => r.id === draft.id);
      if (idx !== -1) {
        all[idx].flowMode = 'default';
        window.Storage.saveAll(all);
      }
      window.App.navigate(`#/new/${draft.id}`);
      window.Toast.success('Nueva cotización iniciada');
    },

    show() {
      if (this.el) {
        this.el.style.display = '';
        this.el.classList.remove('hidden');
      }
    },

    hide() {
      if (this.el) {
        this.el.classList.add('hidden');
        this.el.style.display = 'none';
      }
    },
  };

  window.FAB = FAB;
})();
