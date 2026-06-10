/**
 * client-sheet.js
 * Adopts the existing client form into the unified sheet shell.
 */

(function () {
  function getForm() {
    return document.getElementById("client-form");
  }

  function getSource() {
    return document.getElementById("client-form-container");
  }

  function getTitle() {
    const form = getForm();
    const isEdit = Boolean(document.getElementById("client-id")?.value);
    return isEdit ? "Editar Cliente" : "Registrar Nuevo Cliente";
  }

  function getMode() {
    return document.getElementById("client-id")?.value ? "edit" : "create";
  }

  function getMain() {
    return getForm();
  }

  function detach() {
    const form = getForm();
    const source = getSource();
    if (form && source && form.parentElement !== source) {
      source.appendChild(form);
    }
  }

  function reset() {
    const form = getForm();
    if (form) form.reset();
  }

  window.ClientSheet = {
    getTitle,
    getMode,
    getMain,
    detach,
    reset,
  };
})();
