/**
 * customFields.js — Optional named custom fields for product form step 8.
 *
 * Keeps the UI dynamic while syncing hidden inputs to Airtable's
 * cf{n}_name / cf{n}_data slot schema.
 */

const MAX_CUSTOM_FIELDS = 6;

let fields = [];
let editingIndex = null;
let documentClickBound = false;

export function initCustomFields() {
  const root = getRoot();
  if (!root || root.dataset.customFieldsReady === "true") return;

  root.dataset.customFieldsReady = "true";
  hydrateFromHiddenInputs();
  render();

  root.addEventListener("click", handleClick);
  root.addEventListener("submit", handleSubmit);
  root.addEventListener("keydown", handleKeydown);

  if (!documentClickBound) {
    document.addEventListener("click", handleDocumentClick);
    documentClickBound = true;
  }
}

export function resetCustomFields() {
  fields = [];
  editingIndex = null;
  syncHiddenInputs();
  render();
}

export function setCustomFields(nextFields = []) {
  fields = normalizeFields(nextFields).slice(0, MAX_CUSTOM_FIELDS);
  editingIndex = null;
  syncHiddenInputs();
  render();
}

export function getCustomFields() {
  return fields.map((field) => ({ ...field }));
}

function getRoot() {
  return document.querySelector("[data-custom-fields-root]");
}

function hydrateFromHiddenInputs() {
  const root = getRoot();
  if (!root) return;

  fields = [];
  for (let i = 1; i <= MAX_CUSTOM_FIELDS; i += 1) {
    const name = root.querySelector(`input[name="cf${i}_name"]`)?.value.trim() || "";
    const value = root.querySelector(`input[name="cf${i}_data"]`)?.value.trim() || "";
    if (!name && !value) continue;
    fields.push({
      name: name || `Campo ${i}`,
      value,
    });
  }
}

function normalizeFields(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      name: String(item?.name || item?.label || "").trim(),
      value: String(item?.value || item?.data || "").trim(),
    }))
    .filter((item) => item.name || item.value);
}

function syncHiddenInputs() {
  const root = getRoot();
  if (!root) return;

  for (let i = 1; i <= MAX_CUSTOM_FIELDS; i += 1) {
    const field = fields[i - 1] || { name: "", value: "" };
    const nameInput = root.querySelector(`input[name="cf${i}_name"]`);
    const valueInput = root.querySelector(`input[name="cf${i}_data"]`);
    if (nameInput) nameInput.value = field.name || "";
    if (valueInput) valueInput.value = field.value || "";
  }

  root.dispatchEvent(new Event("change", { bubbles: true }));
}

function render() {
  const root = getRoot();
  if (!root) return;

  const available = MAX_CUSTOM_FIELDS - fields.length;
  const isEditing = editingIndex !== null;
  root.classList.toggle("is-editing", isEditing);
  root.closest(".step")?.classList.toggle("has-custom-field-popover", isEditing);

  root.querySelector("[data-custom-fields-count]").textContent =
    `${available} ${available === 1 ? "slot disponible" : "slots disponibles"}`;

  const list = root.querySelector("[data-custom-fields-list]");
  if (list) {
    list.innerHTML = fields.length
      ? fields.map(renderFieldCard).join("")
      : `<div class="custom-fields-empty">Sin campos personalizados.</div>`;
  }

  const addButton = root.querySelector("[data-custom-field-add]");
  if (addButton) {
    addButton.disabled = available <= 0;
    addButton.setAttribute("aria-expanded", String(isEditing));
  }

  const editor = root.querySelector("[data-custom-field-editor]");
  if (editor) {
    editor.hidden = !isEditing;
    editor.classList.toggle("is-open", isEditing);
    if (isEditing) renderEditor(editor);
  }

  if (window.lucide) window.lucide.createIcons();
}

function renderFieldCard(field, index) {
  return `
    <article class="custom-field-card" data-custom-field-index="${index}">
      <div class="custom-field-card__main">
        <span class="custom-field-card__label">${escapeHtml(field.name || "Sin nombre")}</span>
        <span class="custom-field-card__value">${escapeHtml(field.value || "-")}</span>
      </div>
      <div class="custom-field-card__actions">
        <button type="button" class="custom-field-icon-btn" data-custom-field-edit="${index}" aria-label="Editar campo personalizado">
          <i data-lucide="pencil"></i>
        </button>
        <button type="button" class="custom-field-icon-btn custom-field-icon-btn--danger" data-custom-field-delete="${index}" aria-label="Eliminar campo personalizado">
          <i data-lucide="trash-2"></i>
        </button>
      </div>
    </article>
  `;
}

function renderEditor(editor) {
  const field = editingIndex >= 0 ? fields[editingIndex] : { name: "", value: "" };
  editor.innerHTML = `
    <form class="custom-field-editor" data-custom-field-form>
      <div class="custom-field-editor__label" contenteditable="true" data-custom-field-name role="textbox" aria-label="Nombre del campo">${escapeHtml(field.name)}</div>
      <input type="text" class="custom-field-editor__value" data-custom-field-value value="${escapeHtml(field.value)}" placeholder="Valor" autocomplete="off" />
      <div class="custom-field-editor__actions">
        <button type="submit" class="custom-field-save">Guardar</button>
        <button type="button" class="custom-field-cancel" data-custom-field-cancel>Cancelar</button>
      </div>
    </form>
  `;
}


function handleClick(event) {
  const addButton = event.target.closest("[data-custom-field-add]");
  if (addButton) {
    event.stopPropagation();
    if (fields.length >= MAX_CUSTOM_FIELDS) return;
    editingIndex = editingIndex === null ? -1 : null;
    render();
    if (editingIndex !== null) focusEditor();
    return;
  }

  const editButton = event.target.closest("[data-custom-field-edit]");
  if (editButton) {
    event.stopPropagation();
    editingIndex = Number(editButton.dataset.customFieldEdit);
    render();
    focusEditor();
    return;
  }

  const deleteButton = event.target.closest("[data-custom-field-delete]");
  if (deleteButton) {
    event.stopPropagation();
    const index = Number(deleteButton.dataset.customFieldDelete);
    fields.splice(index, 1);
    editingIndex = null;
    syncHiddenInputs();
    render();
    return;
  }

  if (event.target.closest("[data-custom-field-cancel]")) {
    closeEditor();
    return;
  }

  // NUEVO: Manejar el click en Guardar del editor
  const submitButton = event.target.closest(".custom-field-save");
  if (submitButton) {
    event.preventDefault();
    event.stopPropagation();
    
    const editor = submitButton.closest("[data-custom-field-editor]");
    const form = editor?.querySelector("[data-custom-field-form]") || editor;
    
    const name = form.querySelector("[data-custom-field-name]")?.textContent.trim() || "";
    const value = form.querySelector("[data-custom-field-value]")?.value.trim() || "";

    if (!name && !value) {
      closeEditor();
      return;
    }

    if (editingIndex === -1) {
      fields.push({
        name: name || `Campo ${fields.length + 1}`,
        value,
      });
    } else if (editingIndex !== null) {
      fields[editingIndex] = {
        name: name || `Campo ${editingIndex + 1}`,
        value,
      };
    }

    editingIndex = null;
    syncHiddenInputs();
    render();
    return;
  }
}


function handleSubmit(event) {
  const form = event.target.closest("[data-custom-field-form]");
  if (!form) return;
  event.preventDefault();
  event.stopPropagation();

  const name = form.querySelector("[data-custom-field-name]")?.textContent.trim() || "";
  const value = form.querySelector("[data-custom-field-value]")?.value.trim() || "";
  if (!name && !value) {
    closeEditor();
    return;
  }

  if (editingIndex === -1) {
    fields.push({
      name: name || `Campo ${fields.length + 1}`,
      value,
    });
  } else if (editingIndex !== null) {
    fields[editingIndex] = {
      name: name || `Campo ${editingIndex + 1}`,
      value,
    };
  }

  editingIndex = null;
  syncHiddenInputs();
  render();
  
}

function handleKeydown(event) {
  const nameField = event.target.closest("[data-custom-field-name]");
  if (nameField && event.key === "Enter") {
    event.preventDefault();
    getRoot()?.querySelector("[data-custom-field-value]")?.focus();
    return;
  }

  const valueField = event.target.closest("[data-custom-field-value]");
  if (valueField && event.key === "Enter") {
    event.preventDefault();
    getRoot()?.querySelector("[data-custom-field-form]")?.requestSubmit();
    return;
  }

  if (event.key === "Escape" && editingIndex !== null) {
    closeEditor();
  }
}

function handleDocumentClick(event) {
  const root = getRoot();
  if (!root || editingIndex === null) return;
  if (root.contains(event.target)) return;
  closeEditor();
}

function closeEditor() {
  editingIndex = null;
  render();
}

function focusEditor() {
  window.setTimeout(() => {
    const root = getRoot();
    root?.querySelector("[data-custom-field-name]")?.focus();
  }, 0);
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

window.ProductFormCustomFields = {
  getFields: getCustomFields,
  setFields: setCustomFields,
  reset: resetCustomFields,
};
