/**
 * taxonomy-manager-panel.js
 * Specialist panel for taxonomy configuration, extending AppSideSheet.
 */

class TaxonomyManagerPanel extends AppSideSheet {
  constructor(options = {}) {
    super({
      id: "taxonomy-manager",
      title: "Gestionar",
      variant: "side",
      size: "md",
      ...options
    });
    this.taxonomyConfigPromise = null;
    this.taxonomyConfigRecord = null;
    this.state = null;
  }

  async open(type) {
    if (type === "seller") type = "user";
    const categoryKey = document.getElementById("f-cat")?.value || "";
    if (type === "subcategory" && !categoryKey) {
      window.showToast?.("Selecciona una categoría antes de agregar subcategoría.", "warning");
      return;
    }

    const meta = this.getTaxonomyMeta(type);
    this.title = `Gestionar ${meta.title}`;
    this.meta = {
      eyebrow: "Catálogo",
      activeId: "",
      mode: ""
    };
    this.state = { type, categoryKey, loading: true };
    this.slots.main = () => this.renderLoadingHTML(meta);

    super.open();

    try {
      const loaded = await this.loadTaxonomyConfig();
      this.state = {
        type,
        categoryKey,
        categories: this.cloneJson(loaded.categories),
        brands: [...loaded.brands],
        users: this.cloneJson(loaded.users || []),
        sellers: this.cloneJson(loaded.sellers || []),
        suppliers: this.cloneJson(loaded.suppliers || []),
        warehouses: this.cloneJson(loaded.warehouses || []),
        roles: this.cloneJson(loaded.roles || []),
      };
      this.slots.main = () => this.renderBodyHTML();
      this.hydrateMain();
      this.hydrate();

      window.setTimeout(() => {
        const input = this.root.querySelector("#taxonomy-manager-input");
        if (input) {
          input.value = "";
          input.focus();
        }
      }, 30);
    } catch (error) {
      console.error("TaxonomyManagerPanel: open failed", error);
      this.slots.main = () => this.renderErrorHTML();
      this.hydrateMain();
      window.showToast?.("No se pudo abrir el administrador.", "danger");
    }
  }

  renderLoadingHTML(meta) {
    return `
      <div class="taxonomy-manager__loading" style="padding: 24px;">
        <div class="skeleton-bone" style="width: 44%; height: 16px; margin-bottom: 18px;"></div>
        <div class="skeleton-bone" style="width: 100%; height: 42px; margin-bottom: 14px;"></div>
        <div class="skeleton-bone" style="width: 100%; height: 52px; margin-bottom: 10px;"></div>
        <div class="skeleton-bone" style="width: 82%; height: 52px;"></div>
      </div>
    `;
  }

  renderErrorHTML() {
    return `
      <div class="taxonomy-manager__error" style="padding: 24px; color: var(--color-danger);">
        No se pudo cargar el catálogo.
      </div>
    `;
  }

  renderBodyHTML() {
    const meta = this.getTaxonomyMeta(this.state.type);
    const items = this.getTaxonomyItems(this.state.type, this.state.categories, this.state.brands, this.state.categoryKey, this.state.users, this.state.suppliers, this.state.warehouses, this.state.roles);
    const contextHTML = this.state.type === "subcategory"
      ? `<div class="taxonomy-manager__context" style="margin-bottom: 12px; font-weight: bold;">Categoría: ${this.state.categories[this.state.categoryKey]?.name || ""}</div>`
      : "";

    let createFieldsHTML = "";
    if (this.state.type === "role") {
      createFieldsHTML = `
        <div class="taxonomy-manager__seller-form">
          <div class="taxonomy-manager__seller-grid" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">
            <label class="taxonomy-manager__label" style="display: flex; flex-direction: column; font-size: 13px;">
              Nombre
              <input id="taxonomy-manager-input" data-role-label type="text" autocomplete="off" placeholder="Ej. Encargado de almacén" style="padding: 8px; border-radius: 6px; border: 1px solid var(--border-color); margin-top: 4px;" />
            </label>
            <label class="taxonomy-manager__label" style="display: flex; flex-direction: column; font-size: 13px;">
              UI / screens
              <input data-role-ui-scopes type="text" autocomplete="off" placeholder="Inventario, Catálogos, Web" style="padding: 8px; border-radius: 6px; border: 1px solid var(--border-color); margin-top: 4px;" />
            </label>
            <label class="taxonomy-manager__label" style="display: flex; flex-direction: column; font-size: 13px;">
              Capabilities
              <input data-role-capabilities type="text" autocomplete="off" placeholder="leer, crear, actualizar" style="padding: 8px; border-radius: 6px; border: 1px solid var(--border-color); margin-top: 4px;" />
            </label>
          </div>
          <div class="taxonomy-manager__input-row taxonomy-manager__input-row--seller" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <span></span>
            <button type="submit" data-taxonomy-create-submit class="drawer__primary-btn" style="padding: 8px 16px;">Guardar</button>
          </div>
        </div>
      `;
    } else if (this.state.type === "user" || this.state.type === "supplier") {
      const itemPlaceholder = this.state.type === "user" ? "Nuevo usuario" : "Nuevo proveedor";
      const emailPlaceholder = this.state.type === "user" ? "usuario@kitchenvalenzuela.com" : "proveedor@empresa.com";
      createFieldsHTML = `
        <div class="taxonomy-manager__seller-form">
          <div class="taxonomy-manager__seller-grid" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">
            <label class="taxonomy-manager__label" style="display: flex; flex-direction: column; font-size: 13px;">
              Nombre
              <input id="taxonomy-manager-input" data-seller-name type="text" autocomplete="off" placeholder="${itemPlaceholder}" style="padding: 8px; border-radius: 6px; border: 1px solid var(--border-color); margin-top: 4px;" />
            </label>
            <label class="taxonomy-manager__label" style="display: flex; flex-direction: column; font-size: 13px;">
              Tel
              <input data-seller-tel type="tel" autocomplete="off" placeholder="6242250029" style="padding: 8px; border-radius: 6px; border: 1px solid var(--border-color); margin-top: 4px;" />
            </label>
            <label class="taxonomy-manager__label taxonomy-manager__seller-email" style="display: flex; flex-direction: column; font-size: 13px;">
              Email
              <input data-seller-email type="email" autocomplete="off" placeholder="${emailPlaceholder}" style="padding: 8px; border-radius: 6px; border: 1px solid var(--border-color); margin-top: 4px;" />
            </label>
            ${this.state.type === "user" ? `
            <label class="taxonomy-manager__label" style="display: flex; flex-direction: column; font-size: 13px;">
              Roles
              <input data-user-roles type="text" autocomplete="off" value="vendedor" placeholder="vendedor, admin" style="padding: 8px; border-radius: 6px; border: 1px solid var(--border-color); margin-top: 4px;" />
            </label>
            <label class="taxonomy-manager__label" style="display: flex; flex-direction: column; font-size: 13px;">
              Almacenes permitidos
              <input data-user-warehouses type="text" autocomplete="off" placeholder="3, 4" style="padding: 8px; border-radius: 6px; border: 1px solid var(--border-color); margin-top: 4px;" />
            </label>
            ` : ""}
          </div>
          <div class="taxonomy-manager__input-row taxonomy-manager__input-row--seller" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <span></span>
            <button type="submit" data-taxonomy-create-submit class="drawer__primary-btn" style="padding: 8px 16px;">Guardar</button>
          </div>
        </div>
      `;
    } else {
      createFieldsHTML = `
        <label class="taxonomy-manager__label" for="taxonomy-manager-input" style="font-size: 13px; font-weight: bold; display: block; margin-bottom: 6px;">Agregar ${meta.singular}</label>
        <div class="taxonomy-manager__input-row" style="display: flex; gap: 8px; margin-bottom: 16px;">
          <input id="taxonomy-manager-input" type="text" autocomplete="off" placeholder="${this.escapeHtml(meta.placeholder)}" style="flex: 1; padding: 8px; border-radius: 6px; border: 1px solid var(--border-color);" />
          <button type="submit" data-taxonomy-create-submit class="drawer__primary-btn" style="padding: 8px 16px;">Guardar</button>
        </div>
      `;
    }

    const listHTML = items.length
      ? items.map((item) => (this.state.type === "role")
        ? `
        <div class="taxonomy-manager__item taxonomy-manager__item--seller" data-taxonomy-key="${this.escapeHtml(item.key)}" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid var(--border-color);">
          <div class="taxonomy-manager__item-main">
            <span class="taxonomy-manager__item-name" style="font-weight: bold; font-size: 14px;">${this.escapeHtml(item.label || "Sin nombre")}</span>
            <div class="taxonomy-manager__item-meta" style="font-size: 12px; color: var(--text-tertiary); display: flex; flex-direction: column; gap: 4px; margin-top: 4px;">
              <span>UI: ${this.escapeHtml((item.uiScopes || []).join(", ") || "Sin UI scopes")}</span>
              <span>Capabilities: ${this.escapeHtml((item.capabilities || []).join(", ") || "Sin capabilities")}</span>
            </div>
          </div>
          <div class="taxonomy-manager__item-actions" style="display: flex; gap: 8px;">
            <button type="button" class="btn-action-small" data-taxonomy-edit="${this.escapeHtml(item.key)}"><i data-lucide="edit"></i></button>
            <button type="button" class="btn-action-small btn-action-small--danger" data-taxonomy-delete="${this.escapeHtml(item.key)}"><i data-lucide="trash-2"></i></button>
          </div>
        </div>
      `
        : (this.state.type === "user" || this.state.type === "supplier")
        ? `
        <div class="taxonomy-manager__item taxonomy-manager__item--seller" data-taxonomy-key="${this.escapeHtml(item.key)}" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid var(--border-color);">
          <div class="taxonomy-manager__item-main">
            <span class="taxonomy-manager__item-name" style="font-weight: bold; font-size: 14px;">${this.escapeHtml(item.label || "Sin nombre")}</span>
            <div class="taxonomy-manager__item-meta" style="font-size: 12px; color: var(--text-tertiary); display: flex; gap: 12px; margin-top: 4px;">
              ${this.state.type === "user" ? `<span>${this.escapeHtml((item.roles || []).join(", ") || "Sin rol")}</span>` : ""}
              ${this.state.type === "user" ? `<span>Almacenes: ${this.escapeHtml((item.warehouseIds || []).join(", ") || "Todos")}</span>` : ""}
              <span>${this.escapeHtml(item.tel || "Sin tel")}</span>
              <span>${this.escapeHtml(item.email || "Sin email")}</span>
            </div>
          </div>
          <div class="taxonomy-manager__item-actions" style="display: flex; gap: 8px;">
            <button type="button" class="btn-action-small" data-taxonomy-edit="${this.escapeHtml(item.key)}"><i data-lucide="edit"></i></button>
            <button type="button" class="btn-action-small btn-action-small--danger" data-taxonomy-delete="${this.escapeHtml(item.key)}"><i data-lucide="trash-2"></i></button>
          </div>
        </div>
      `
        : `
        <div class="taxonomy-manager__item" data-taxonomy-key="${this.escapeHtml(item.key)}" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid var(--border-color);">
          <span class="taxonomy-manager__item-name" style="font-size: 14px;">${this.escapeHtml(item.label)}</span>
          <div class="taxonomy-manager__item-actions" style="display: flex; gap: 8px;">
            <button type="button" class="btn-action-small" data-taxonomy-edit="${this.escapeHtml(item.key)}"><i data-lucide="edit"></i></button>
            <button type="button" class="btn-action-small btn-action-small--danger" data-taxonomy-delete="${this.escapeHtml(item.key)}"><i data-lucide="trash-2"></i></button>
          </div>
        </div>
      `).join("")
      : `<div class="taxonomy-manager__empty" style="color: var(--text-tertiary); text-align: center; padding: 24px;">Sin ${meta.title.toLowerCase()} todavía.</div>`;

    return `
      <div class="taxonomy-manager__body-wrapper">
        <form class="taxonomy-manager__form" data-taxonomy-create-form>
          <div data-taxonomy-create-fields>${createFieldsHTML}</div>
        </form>
        ${contextHTML}
        <div class="taxonomy-manager__list" data-taxonomy-list>${listHTML}</div>
      </div>
    `;
  }

  hydrate() {
    super.hydrate();

    const form = this.root.querySelector("[data-taxonomy-create-form]");
    if (form) {
      form.addEventListener("submit", (e) => this.handleTaxonomyCreate(e));
    }

    const list = this.root.querySelector("[data-taxonomy-list]");
    if (list) {
      list.addEventListener("click", (e) => this.handleTaxonomyListClick(e));
    }
  }

  async handleTaxonomyListClick(event) {
    const editButton = event.target.closest("[data-taxonomy-edit]");
    if (editButton) {
      this.renderTaxonomyEditRow(editButton.dataset.taxonomyEdit);
      return;
    }

    const cancelButton = event.target.closest("[data-taxonomy-cancel-edit]");
    if (cancelButton) {
      this.hydrate();
      return;
    }

    const deleteButton = event.target.closest("[data-taxonomy-delete]");
    if (deleteButton) {
      await this.handleTaxonomyDelete(deleteButton.dataset.taxonomyDelete);
      return;
    }

    const saveButton = event.target.closest("[data-taxonomy-save-edit]");
    if (saveButton) {
      await this.handleTaxonomySaveEdit(saveButton);
      return;
    }
  }

  renderTaxonomyEditRow(key) {
    const items = this.getTaxonomyItems(this.state.type, this.state.categories, this.state.brands, this.state.categoryKey, this.state.users, this.state.suppliers, this.state.warehouses, this.state.roles);
    const item = items.find(candidate => candidate.key === key);
    const row = Array.from(this.root.querySelectorAll("[data-taxonomy-key]"))
      .find(candidate => candidate.dataset.taxonomyKey === key);
    if (!item || !row) return;

    if (this.state.type === "role") {
      row.innerHTML = `
        <div style="flex: 1; margin-right: 12px;">
          <div class="taxonomy-manager__seller-edit" style="display: flex; flex-direction: column; gap: 6px;">
            <label class="taxonomy-manager__label" style="font-size: 12px; display: flex; flex-direction: column;">
              Nombre
              <input class="taxonomy-manager__edit-input" data-role-edit-label type="text" value="${this.escapeHtml(item.label)}" style="padding: 6px; border: 1px solid var(--border-color); border-radius: 4px;" />
            </label>
            <label class="taxonomy-manager__label" style="font-size: 12px; display: flex; flex-direction: column;">
              UI / screens
              <input class="taxonomy-manager__edit-input" data-role-edit-ui-scopes type="text" value="${this.escapeHtml((item.uiScopes || []).join(", "))}" style="padding: 6px; border: 1px solid var(--border-color); border-radius: 4px;" />
            </label>
            <label class="taxonomy-manager__label" style="font-size: 12px; display: flex; flex-direction: column;">
              Capabilities
              <input class="taxonomy-manager__edit-input" data-role-edit-capabilities type="text" value="${this.escapeHtml((item.capabilities || []).join(", "))}" style="padding: 6px; border: 1px solid var(--border-color); border-radius: 4px;" />
            </label>
          </div>
        </div>
        <div class="taxonomy-manager__item-actions" style="display: flex; gap: 6px;">
          <button type="button" class="drawer__primary-btn" data-taxonomy-save-edit="${this.escapeHtml(item.key)}" style="padding: 6px 12px;">Guardar</button>
          <button type="button" class="btn-action-small" data-taxonomy-cancel-edit style="padding: 6px 12px;">Cancelar</button>
        </div>
      `;
      row.querySelector("[data-role-edit-label]")?.focus();
      return;
    }

    if (this.state.type === "user" || this.state.type === "supplier") {
      row.innerHTML = `
        <div style="flex: 1; margin-right: 12px;">
          <div class="taxonomy-manager__seller-edit" style="display: flex; flex-direction: column; gap: 6px;">
            <label class="taxonomy-manager__label" style="font-size: 12px; display: flex; flex-direction: column;">
              Nombre
              <input class="taxonomy-manager__edit-input" data-seller-edit-name type="text" value="${this.escapeHtml(item.label)}" style="padding: 6px; border: 1px solid var(--border-color); border-radius: 4px;" />
            </label>
            <label class="taxonomy-manager__label" style="font-size: 12px; display: flex; flex-direction: column;">
              Tel
              <input class="taxonomy-manager__edit-input" data-seller-edit-tel type="tel" value="${this.escapeHtml(item.tel || "")}" style="padding: 6px; border: 1px solid var(--border-color); border-radius: 4px;" />
            </label>
            <label class="taxonomy-manager__label" style="font-size: 12px; display: flex; flex-direction: column;">
              Email
              <input class="taxonomy-manager__edit-input" data-seller-edit-email type="email" value="${this.escapeHtml(item.email || "")}" style="padding: 6px; border: 1px solid var(--border-color); border-radius: 4px;" />
            </label>
            ${this.state.type === "user" ? `
            <label class="taxonomy-manager__label" style="font-size: 12px; display: flex; flex-direction: column;">
              Roles
              <input class="taxonomy-manager__edit-input" data-user-edit-roles type="text" value="${this.escapeHtml((item.roles || []).join(", "))}" style="padding: 6px; border: 1px solid var(--border-color); border-radius: 4px;" />
            </label>
            <label class="taxonomy-manager__label" style="font-size: 12px; display: flex; flex-direction: column;">
              Almacenes permitidos
              <input class="taxonomy-manager__edit-input" data-user-edit-warehouses type="text" value="${this.escapeHtml((item.warehouseIds || []).join(", "))}" style="padding: 6px; border: 1px solid var(--border-color); border-radius: 4px;" />
            </label>
            ` : ""}
          </div>
        </div>
        <div class="taxonomy-manager__item-actions" style="display: flex; gap: 6px;">
          <button type="button" class="drawer__primary-btn" data-taxonomy-save-edit="${this.escapeHtml(item.key)}" style="padding: 6px 12px;">Guardar</button>
          <button type="button" class="btn-action-small" data-taxonomy-cancel-edit style="padding: 6px 12px;">Cancelar</button>
        </div>
      `;
      row.querySelector("[data-seller-edit-name]")?.focus();
      return;
    }

    row.innerHTML = `
      <input class="taxonomy-manager__edit-input" type="text" value="${this.escapeHtml(item.label)}" style="flex: 1; padding: 6px; border: 1px solid var(--border-color); border-radius: 4px; margin-right: 12px;" />
      <div class="taxonomy-manager__item-actions" style="display: flex; gap: 6px;">
        <button type="button" class="drawer__primary-btn" data-taxonomy-save-edit="${this.escapeHtml(item.key)}" style="padding: 6px 12px;">Guardar</button>
        <button type="button" class="btn-action-small" data-taxonomy-cancel-edit style="padding: 6px 12px;">Cancelar</button>
      </div>
    `;
    row.querySelector(".taxonomy-manager__edit-input")?.focus();
  }

  async handleTaxonomySaveEdit(saveButton) {
    const row = saveButton.closest("[data-taxonomy-key]");
    const cancelButton = row?.querySelector("[data-taxonomy-cancel-edit]");
    const inputs = row?.querySelectorAll("input");

    const restoreButtonsAndInputs = () => {
      if (saveButton) {
        saveButton.disabled = false;
        saveButton.dataset.loading = "false";
        saveButton.textContent = "Guardar";
      }
      if (cancelButton) cancelButton.disabled = false;
      if (inputs) inputs.forEach(input => input.disabled = false);
    };

    try {
      if (saveButton) {
        saveButton.disabled = true;
        saveButton.dataset.loading = "true";
      }
      if (cancelButton) cancelButton.disabled = true;
      if (inputs) inputs.forEach(input => input.disabled = true);

      if (this.state.type === "role") {
        const label = row?.querySelector("[data-role-edit-label]")?.value.trim();
        const uiScopes = this.parseCsvList(row?.querySelector("[data-role-edit-ui-scopes]")?.value || "");
        const capabilities = this.parseCsvList(row?.querySelector("[data-role-edit-capabilities]")?.value || "");
        const role = (this.state.roles || []).find(item => item.id === saveButton.dataset.taxonomySaveEdit);
        if (!role) {
          restoreButtonsAndInputs();
          return;
        }
        if (!label) {
          window.showToast?.("El rol necesita un nombre.", "warning");
          restoreButtonsAndInputs();
          return;
        }
        role.label = label;
        role.name = label;
        role.uiScopes = uiScopes;
        role.capabilities = capabilities;
        this.state.roles = [...(this.state.roles || [])];
        await this.persistTaxonomyState(this.state, role.id, label, "Se actualizó el rol.");
      } else if (this.state.type === "user" || this.state.type === "supplier") {
        const name = row?.querySelector("[data-seller-edit-name]")?.value.trim();
        const tel = row?.querySelector("[data-seller-edit-tel]")?.value.trim();
        const email = row?.querySelector("[data-seller-edit-email]")?.value.trim();
        const roles = this.parseCsvList(row?.querySelector("[data-user-edit-roles]")?.value || "vendedor");
        const warehouseIds = this.parseCsvList(row?.querySelector("[data-user-edit-warehouses]")?.value || "");
        const isUser = this.state.type === "user";
        const currentList = isUser ? (this.state.users || []) : (this.state.suppliers || []);
        const sellerItem = currentList.find(item => item.id === saveButton.dataset.taxonomySaveEdit);
        if (!sellerItem) {
          restoreButtonsAndInputs();
          return;
        }
        if (!name) {
          window.showToast?.(`El ${this.getTaxonomyMeta(this.state.type).singular} necesita un nombre.`, "warning");
          restoreButtonsAndInputs();
          return;
        }
        if (this.state.type === "supplier" && !tel && !email) {
          window.showToast?.(`Agrega al menos un teléfono o email para el ${this.getTaxonomyMeta(this.state.type).singular}.`, "warning");
          restoreButtonsAndInputs();
          return;
        }
        sellerItem.name = name;
        sellerItem.tel = tel || "";
        sellerItem.email = email || "";
        if (isUser) sellerItem.roles = roles.length ? roles : ["vendedor"];
        if (isUser) sellerItem.warehouseIds = warehouseIds;
        if (isUser) this.state.users = [...currentList];
        await this.persistTaxonomyState(this.state, sellerItem.id, name, `Se actualizó la ${this.getTaxonomyMeta(this.state.type).singular}.`);
      } else {
        const value = row?.querySelector(".taxonomy-manager__edit-input")?.value.trim();
        if (!value) {
          restoreButtonsAndInputs();
          return;
        }
        await this.handleTaxonomyRename(this.state, saveButton.dataset.taxonomySaveEdit, value);
      }
    } catch (error) {
      console.error("TaxonomyManagerPanel: rename failed", error);
      window.showToast?.("No se pudo actualizar.", "danger");
      restoreButtonsAndInputs();
    }
  }

  async handleTaxonomyRename(state, key, value) {
    const meta = this.getTaxonomyMeta(state.type);
    if (!value) return;

    if (state.type === "category") {
      state.categories[key].name = value;
      await this.persistTaxonomyState(state, key, value, `Se actualizó la ${meta.singular}.`);
    } else if (state.type === "subcategory") {
      const current = state.categories[state.categoryKey].subcategories || [];
      const index = current.findIndex(item => this.slugifyTaxonomyValue(item) === key);
      if (index === -1) return;
      current[index] = value;
      state.categories[state.categoryKey].subcategories = Array.from(new Set(current));
      await this.persistTaxonomyState(state, this.slugifyTaxonomyValue(value), value, `Se actualizó la ${meta.singular}.`);
    } else if (state.type === "brand") {
      const current = state.brands || [];
      const index = current.indexOf(key);
      if (index === -1) return;
      current[index] = value;
      state.brands = Array.from(new Set(current));
      await this.persistTaxonomyState(state, value, value, `Se actualizó la ${meta.singular}.`);
    } else if (state.type === "warehouse") {
      const current = state.warehouses || [];
      const item = current.find(warehouse => warehouse.id === key);
      if (!item) return;
      item.name = value;
      state.warehouses = [...current];
      await this.persistTaxonomyState(state, item.id, value, `Se actualizó el ${meta.singular}.`);
    } else if (state.type === "supplier") {
      const current = state.suppliers || [];
      const index = current.findIndex(item => item.id === key);
      if (index === -1) return;
      current[index] = {
        ...current[index],
        name: value,
      };
      state.suppliers = [...current];
      await this.persistTaxonomyState(state, current[index].id, value, `Se actualizó la ${meta.singular}.`);
    } else {
      const current = state.sellers || [];
      const index = current.findIndex(item => item.id === key);
      if (index === -1) return;
      current[index] = {
        ...current[index],
        name: value,
      };
      state.sellers = [...current];
      await this.persistTaxonomyState(state, current[index].id, value, `Se actualizó la ${meta.singular}.`);
    }
  }

  async handleTaxonomyDelete(key) {
    const state = this.state;
    const meta = this.getTaxonomyMeta(state.type);
    const deleteButton = Array.from(this.root.querySelectorAll("[data-taxonomy-delete]"))
      .find(button => button.dataset.taxonomyDelete === key);
    if (deleteButton) {
      deleteButton.disabled = true;
      deleteButton.dataset.loading = "true";
    }

    if (state.type === "category") {
      delete state.categories[key];
    } else if (state.type === "subcategory") {
      const current = state.categories[state.categoryKey].subcategories || [];
      state.categories[state.categoryKey].subcategories = current.filter(item => this.slugifyTaxonomyValue(item) !== key);
    } else if (state.type === "brand") {
      state.brands = (state.brands || []).filter(item => item !== key);
    } else if (state.type === "warehouse") {
      state.warehouses = (state.warehouses || []).filter(item => item.id !== key);
    } else if (state.type === "role") {
      state.roles = (state.roles || []).filter(item => item.id !== key);
    } else if (state.type === "user") {
      state.users = (state.users || []).filter(item => item.id !== key);
    } else if (state.type === "supplier") {
      state.suppliers = (state.suppliers || []).filter(item => item.id !== key);
    } else {
      state.sellers = (state.sellers || []).filter(item => item.id !== key);
    }

    try {
      await this.persistTaxonomyState(state, "", "", `Se eliminó la ${meta.singular}.`);
    } catch (error) {
      console.error("TaxonomyManagerPanel: delete failed", error);
      window.showToast?.(`No se pudo eliminar la ${meta.singular}.`, "danger");
    } finally {
      const currentButton = Array.from(this.root.querySelectorAll("[data-taxonomy-delete]"))
        .find(button => button.dataset.taxonomyDelete === key);
      if (currentButton) {
        currentButton.disabled = false;
        currentButton.dataset.loading = "false";
        currentButton.textContent = "Eliminar";
      }
    }
  }

  async handleTaxonomyCreate(event) {
    event.preventDefault();
    const state = this.state;
    const meta = this.getTaxonomyMeta(state?.type);
    const input = this.root.querySelector("#taxonomy-manager-input");
    const submitButton = this.root.querySelector("[data-taxonomy-create-submit]");
    const sellerNameInput = this.root.querySelector("[data-seller-name]");
    const sellerTelInput = this.root.querySelector("[data-seller-tel]");
    const sellerEmailInput = this.root.querySelector("[data-seller-email]");
    const userRolesInput = this.root.querySelector("[data-user-roles]");
    const userWarehousesInput = this.root.querySelector("[data-user-warehouses]");
    const roleLabelInput = this.root.querySelector("[data-role-label]");
    const roleUiScopesInput = this.root.querySelector("[data-role-ui-scopes]");
    const roleCapabilitiesInput = this.root.querySelector("[data-role-capabilities]");
    const value = input?.value.trim();
    if (!state) return;

    if (state.type === "role") {
      const label = roleLabelInput?.value.trim() || "";
      const uiScopes = this.parseCsvList(roleUiScopesInput?.value || "");
      const capabilities = this.parseCsvList(roleCapabilitiesInput?.value || "");
      if (!label) return;

      try {
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.dataset.loading = "true";
        }
        if (roleLabelInput) roleLabelInput.disabled = true;
        if (roleUiScopesInput) roleUiScopesInput.disabled = true;
        if (roleCapabilitiesInput) roleCapabilitiesInput.disabled = true;

        const item = {
          id: this.createRoleId(label, state.roles),
          label,
          name: label,
          uiScopes,
          capabilities,
          active: true,
        };
        state.roles = [...(state.roles || []), item];
        await this.persistTaxonomyState(state, item.id, label, "Se agregó el rol.");
        this.close();
      } catch (error) {
        console.error("TaxonomyManagerPanel: create role failed", error);
        window.showToast?.("No se pudo guardar el rol.", "danger");
      } finally {
        const currentLabelInput = this.root.querySelector("[data-role-label]");
        const currentUiScopesInput = this.root.querySelector("[data-role-ui-scopes]");
        const currentCapabilitiesInput = this.root.querySelector("[data-role-capabilities]");
        const currentSubmit = this.root.querySelector("[data-taxonomy-create-submit]");
        if (currentSubmit) {
          currentSubmit.disabled = false;
          currentSubmit.dataset.loading = "false";
          currentSubmit.textContent = "Guardar";
        }
        if (currentLabelInput) currentLabelInput.disabled = false;
        if (currentUiScopesInput) currentUiScopesInput.disabled = false;
        if (currentCapabilitiesInput) currentCapabilitiesInput.disabled = false;
      }
      return;
    }

    if (state.type === "user" || state.type === "supplier") {
      const name = sellerNameInput?.value.trim() || "";
      const tel = sellerTelInput?.value.trim() || "";
      const email = sellerEmailInput?.value.trim() || "";
      const roles = this.parseCsvList(userRolesInput?.value || "vendedor");
      const warehouseIds = this.parseCsvList(userWarehousesInput?.value || "");
      if (!name) return;
      if (state.type === "supplier" && !tel && !email) {
        window.showToast?.(`Agrega al menos un teléfono o email para el ${meta.singular}.`, "warning");
        return;
      }
      try {
        if (submitButton) {
          submitButton.disabled = true;
          submitButton.dataset.loading = "true";
        }
        if (sellerNameInput) sellerNameInput.disabled = true;
        if (sellerTelInput) sellerTelInput.disabled = true;
        if (sellerEmailInput) sellerEmailInput.disabled = true;

        const isUser = state.type === "user";
        const current = isUser ? (state.users || []) : (state.suppliers || []);
        const item = {
          id: isUser ? this.createUserId(name, tel, email, state.users) : this.createSellerId(name, tel, email).replace(/^seller-/, "supplier-"),
          name,
          tel,
          email,
          ...(isUser ? { roles: roles.length ? roles : ["vendedor"], warehouseIds, active: true } : {}),
        };
        if (isUser) {
          state.users = [...current, item];
        } else {
          state.suppliers = [...current, item];
        }
        await this.persistTaxonomyState(state, item.id, name, `Se agregó el ${meta.singular}.`);
        if (state.type === "supplier") {
          this.close();
          return;
        }
        sellerNameInput.value = "";
        sellerTelInput.value = "";
        sellerEmailInput.value = "";
        sellerNameInput.focus();
      } catch (error) {
        console.error("TaxonomyManagerPanel: create failed", error);
        window.showToast?.(`No se pudo guardar el ${meta.singular}.`, "danger");
      } finally {
        const currentNameInput = this.root.querySelector("[data-seller-name]");
        const currentTelInput = this.root.querySelector("[data-seller-tel]");
        const currentEmailInput = this.root.querySelector("[data-seller-email]");
        const currentSubmit = this.root.querySelector("[data-taxonomy-create-submit]");
        if (currentSubmit) {
          currentSubmit.disabled = false;
          currentSubmit.dataset.loading = "false";
          currentSubmit.textContent = "Guardar";
        }
        if (currentNameInput) currentNameInput.disabled = false;
        if (currentTelInput) currentTelInput.disabled = false;
        if (currentEmailInput) currentEmailInput.disabled = false;
      }
      return;
    }
    if (!value) return;

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.dataset.loading = "true";
      }
      if (input) input.disabled = true;

      if (state.type === "category") {
        const key = this.getNextCategoryKey(state.categories);
        state.categories[key] = { name: value, subcategories: [] };
        await this.persistTaxonomyState(state, key, value, `Se agregó la ${meta.singular}.`);
        this.close();
        return;
      } else if (state.type === "subcategory") {
        const current = state.categories[state.categoryKey].subcategories || [];
        state.categories[state.categoryKey].subcategories = Array.from(new Set([...current, value]));
        await this.persistTaxonomyState(state, this.slugifyTaxonomyValue(value), value, `Se agregó la ${meta.singular}.`);
        this.close();
        return;
      } else if (state.type === "brand") {
        const current = state.brands || [];
        state.brands = Array.from(new Set([...current, value]));
        await this.persistTaxonomyState(state, value, value, `Se agregó la ${meta.singular}.`);
        this.close();
        return;
      } else if (state.type === "warehouse") {
        const item = {
          id: this.getNextWarehouseKey(state.warehouses),
          name: value,
          color: "#111111",
          active: true,
        };
        state.warehouses = [...(state.warehouses || []), item];
        await this.persistTaxonomyState(state, item.id, value, `Se agregó el ${meta.singular}.`);
        this.close();
        return;
      }
    } catch (error) {
      console.error("TaxonomyManagerPanel: create failed", error);
      window.showToast?.(`No se pudo guardar la ${meta.singular}.`, "danger");
    } finally {
      const currentInput = this.root.querySelector("#taxonomy-manager-input");
      const currentSubmit = this.root.querySelector("[data-taxonomy-create-submit]");
      if (currentSubmit) {
        currentSubmit.disabled = false;
        currentSubmit.dataset.loading = "false";
        currentSubmit.textContent = "Guardar";
      }
      if (currentInput) currentInput.disabled = false;
    }
  }

  async loadTaxonomyConfig() {
    if (this.taxonomyConfigPromise) return this.taxonomyConfigPromise;

    this.taxonomyConfigPromise = (async () => {
      if (!window.SyncManager || typeof window.SyncManager.shumRequest !== "function") {
        throw new Error("SyncManager no cargado");
      }

      const result = await window.SyncManager.shumRequest("list", {
        baseId: window.SyncManager.config.baseId,
        table: "configs",
      });
      const record = result?.records?.[0];
      if (!record) throw new Error("No se encontró el registro configs");

      this.taxonomyConfigRecord = record;
      const fields = record.fields || {};
      const categories = this.normalizeCategoryMap(
        this.parseJsonField(fields.Categorias, {}),
        this.parseJsonField(fields.Subcategorias, {})
      );
      const brands = this.normalizeBrandList(this.parseJsonField(fields.Marcas, []));
      const sellers = this.normalizeSellerList(this.parseJsonField(fields.vendedores, []));
      const users = this.normalizeUserList(this.parseJsonField(fields.usuarios || fields.Usuarios || fields.users, []), sellers);
      const suppliers = this.normalizeSupplierList(this.parseJsonField(fields.proveedores, []));
      const warehouses = this.normalizeWarehouseList(this.parseJsonField(fields.Almacenes || fields.almacenes, []));
      const roles = this.normalizeRoleList(this.parseJsonField(fields.Roles || fields.roles, []));
      const aliases = window.TaxonomyReconciliation?.normalizeAliasConfig
        ? window.TaxonomyReconciliation.normalizeAliasConfig(
            this.parseJsonField(fields.Aliases || fields.aliases || fields.TaxonomyAliases || fields.taxonomy_aliases, {})
          )
        : this.parseJsonField(fields.Aliases || fields.aliases || fields.TaxonomyAliases || fields.taxonomy_aliases, {});

      if (window.ProductFormSheet && typeof window.ProductFormSheet.applyTaxonomyToFormConfig === "function") {
        window.ProductFormSheet.applyTaxonomyToFormConfig({ categories, brands, suppliers, warehouses, aliases });
      }
      if (window.ProductFormSheet && typeof window.ProductFormSheet.updateTaxonomySelects === "function") {
        window.ProductFormSheet.updateTaxonomySelects();
      }

      return { record, categories, brands, users, sellers, suppliers, warehouses, roles, aliases };
    })();

    try {
      return await this.taxonomyConfigPromise;
    } catch (error) {
      this.taxonomyConfigPromise = null;
      throw error;
    }
  }

  async saveTaxonomyConfig(categories, brands, users = [], suppliers = [], warehouses = [], roles = []) {
    const loaded = await this.loadTaxonomyConfig();
    const recordId = loaded.record.id || this.taxonomyConfigRecord?.id;
    if (!recordId) throw new Error("El registro configs no tiene id");
    const configFields = loaded.record.fields || {};
    const rolesFieldName = Object.prototype.hasOwnProperty.call(configFields, "roles")
      ? "roles"
      : Object.prototype.hasOwnProperty.call(configFields, "Roles")
        ? "Roles"
        : roles.length
          ? "Roles"
          : "";
    const warehousesFieldName = Object.prototype.hasOwnProperty.call(configFields, "almacenes")
      ? "almacenes"
      : Object.prototype.hasOwnProperty.call(configFields, "Almacenes")
        ? "Almacenes"
        : warehouses.length
          ? "almacenes"
          : "";
    const usersFieldName = Object.prototype.hasOwnProperty.call(configFields, "usuarios")
      ? "usuarios"
      : Object.prototype.hasOwnProperty.call(configFields, "Usuarios")
        ? "Usuarios"
        : "usuarios";
    const sellers = this.deriveSellersFromUsers(users);
    const data = {
      Categorias: JSON.stringify(categories),
      Subcategorias: JSON.stringify(
        Object.fromEntries(Object.entries(categories).map(([key, value]) => [key, value.subcategories || []]))
      ),
      Marcas: JSON.stringify(brands),
      [usersFieldName]: JSON.stringify(users),
      vendedores: JSON.stringify(sellers),
      proveedores: JSON.stringify(suppliers),
    };
    if (warehousesFieldName) {
      data[warehousesFieldName] = JSON.stringify(warehouses);
    }
    if (rolesFieldName) {
      data[rolesFieldName] = JSON.stringify(roles);
    }

    await window.SyncManager.shumRequest("update", {
      baseId: window.SyncManager.config.baseId,
      table: "configs",
      recordId,
      data,
    });
  }

  async persistTaxonomyState(state, selectedKey, selectedLabel, message) {
    await this.saveTaxonomyConfig(state.categories, state.brands, state.users, state.suppliers, state.warehouses, state.roles);
    this.taxonomyConfigPromise = null;

    if (window.ProductFormSheet && typeof window.ProductFormSheet.applyTaxonomyToFormConfig === "function") {
      window.ProductFormSheet.applyTaxonomyToFormConfig({ categories: state.categories, brands: state.brands, suppliers: state.suppliers, warehouses: state.warehouses });
    }
    if (window.ProductFormSheet && typeof window.ProductFormSheet.updateTaxonomySelects === "function") {
      window.ProductFormSheet.updateTaxonomySelects();
    }
    if (window.ProductFormSheet && typeof window.ProductFormSheet.selectTaxonomyValue === "function") {
      if (selectedKey || selectedLabel) {
        window.ProductFormSheet.selectTaxonomyValue(state.type, selectedKey, selectedLabel);
      }
    }

    this.hydrate();
    window.dispatchEvent(new CustomEvent("taxonomy:updated", {
      detail: { type: state.type, selectedKey, selectedLabel },
    }));
    window.showToast?.(message, "success");
  }

  // --- Helpers ---
  escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  slugifyTaxonomyValue(value) {
    return String(value || "").trim().toLowerCase().replace(/\s/g, "_");
  }

  createSellerId(name, tel, email) {
    const base = this.slugifyTaxonomyValue(name || email || tel || "seller");
    return `seller-${base || "item"}-${Date.now().toString(36)}`;
  }

  createUserId(name, tel, email, users = []) {
    const base = this.slugifyRoleId(name || email || tel || "user") || "user";
    const existing = new Set((users || []).map(user => String(user.id || "").trim()));
    let candidate = `user-${base}`;
    let index = 2;
    while (existing.has(candidate)) {
      candidate = `user-${base}-${index}`;
      index += 1;
    }
    return candidate;
  }

  createRoleId(label, roles = []) {
    const base = this.slugifyRoleId(label || "role") || "role";
    const existing = new Set((roles || []).map(role => String(role.id || "").trim()));
    let candidate = base;
    let index = 2;
    while (existing.has(candidate)) {
      candidate = `${base}-${index}`;
      index += 1;
    }
    return candidate;
  }

  slugifyRoleId(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  parseCsvList(value) {
    if (Array.isArray(value)) {
      return value.map(item => String(item || "").trim()).filter(Boolean);
    }
    return String(value || "")
      .split(",")
      .map(item => item.trim())
      .filter(Boolean);
  }

  getSellerLabel(item) {
    if (!item) return "";
    return String(item.name || item.nombre || item.label || "").trim();
  }

  getSellerMeta(item) {
    if (!item || typeof item !== "object") return { tel: "", email: "" };
    return {
      tel: String(item.tel || item.telefono || item.phone || "").trim(),
      email: String(item.email || item.correo || item.mail || "").trim(),
    };
  }

  parseJsonField(value, fallback) {
    if (!value) return fallback;
    if (typeof value === "object") return value;
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn("TaxonomyManagerPanel: parseJsonField failed", error);
      return fallback;
    }
  }

  cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  isEmptyConfigObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    return Object.keys(value).length === 0;
  }

  normalizeCategoryMap(rawCategories, rawSubcategories) {
    const defaults = (window.ProductFormConfig || {}).CATEGORIES || {};
    const normalized = {};

    Object.entries(defaults).forEach(([key, value]) => {
      normalized[key] = {
        name: typeof value === "object" ? value.name : String(value || key),
        subcategories: Array.isArray(value?.subcategories) ? [...value.subcategories] : [],
      };
    });

    if (Array.isArray(rawCategories)) {
      rawCategories.forEach((item) => {
        if (!item) return;
        const key = String(item.id || item.value || item.codigo || item.code || item.name || "").trim();
        const name = String(item.name || item.label || item.nombre || item.value || key).trim();
        if (!key || !name) return;
        normalized[key] = {
          name,
          subcategories: Array.isArray(item.subcategories) ? [...item.subcategories] : normalized[key]?.subcategories || [],
        };
      });
    } else if (rawCategories && typeof rawCategories === "object" && !this.isEmptyConfigObject(rawCategories)) {
      Object.entries(rawCategories).forEach(([key, value]) => {
        const cleanKey = String(key || "").trim();
        if (!cleanKey) return;
        const name = typeof value === "object"
          ? String(value.name || value.label || value.nombre || cleanKey).trim()
          : String(value || "").trim();
        if (!name) return;
        normalized[cleanKey] = {
          name,
          subcategories: Array.isArray(value?.subcategories) ? [...value.subcategories] : normalized[cleanKey]?.subcategories || [],
        };
      });
    }

    if (rawSubcategories && typeof rawSubcategories === "object" && !this.isEmptyConfigObject(rawSubcategories)) {
      Object.entries(rawSubcategories).forEach(([categoryKey, subcategories]) => {
        const key = String(categoryKey || "").trim();
        if (!key || !normalized[key]) return;
        const values = Array.isArray(subcategories)
          ? subcategories
          : Object.values(subcategories || {});
        normalized[key].subcategories = values
          .map(value => String(value || "").trim())
          .filter(Boolean);
      });
    }

    return normalized;
  }

  normalizeBrandList(rawBrands) {
    const brands = Array.isArray(rawBrands)
      ? rawBrands
      : rawBrands && typeof rawBrands === "object" && !this.isEmptyConfigObject(rawBrands)
        ? Object.values(rawBrands)
        : (window.ProductFormConfig || {}).BRANDS || [];

    const normalized = brands.map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        return String(item.name || item.nombre || item.label || "").trim();
      }
      return String(item || "").trim();
    }).filter(Boolean);

    return Array.from(new Set(normalized));
  }

  normalizeSellerList(rawSellers) {
    const values = Array.isArray(rawSellers)
      ? rawSellers
      : rawSellers && typeof rawSellers === "object" && !this.isEmptyConfigObject(rawSellers)
        ? Object.values(rawSellers)
        : [];

    return values
      .map((item, index) => {
        if (typeof item === "string") {
          const name = String(item || "").trim();
          if (!name) return null;
          return {
            id: `seller-${this.slugifyTaxonomyValue(name) || "item"}-${index + 1}`,
            name,
            tel: "",
            email: "",
          };
        }

        if (!item || typeof item !== "object") return null;

        const name = String(item.name || item.nombre || item.label || "").trim();
        const tel = String(item.tel || item.telefono || item.phone || "").trim();
        const email = String(item.email || item.correo || item.mail || "").trim();
        const id = String(item.id || item.key || item.value || "").trim() || `seller-${this.slugifyTaxonomyValue(name || email || tel || `item-${index + 1}`) || `item-${index + 1}`}`;
        if (!name && !tel && !email) return null;

        return { id, name, tel, email };
      })
      .filter(Boolean);
  }

  normalizeSupplierList(rawSuppliers) {
    const values = Array.isArray(rawSuppliers)
      ? rawSuppliers
      : rawSuppliers && typeof rawSuppliers === "object" && !this.isEmptyConfigObject(rawSuppliers)
        ? Object.values(rawSuppliers)
        : [];

    return values
      .map((item, index) => {
        if (typeof item === "string") {
          const name = String(item || "").trim();
          if (!name) return null;
          return {
            id: `supplier-${this.slugifyTaxonomyValue(name) || "item"}-${index + 1}`,
            name,
            tel: "",
            email: "",
          };
        }

        if (!item || typeof item !== "object") return null;

        const name = String(item.name || item.nombre || item.label || "").trim();
        const tel = String(item.tel || item.telefono || item.phone || "").trim();
        const email = String(item.email || item.correo || item.mail || "").trim();
        const id = String(item.id || item.key || item.value || "").trim() || `supplier-${this.slugifyTaxonomyValue(name || email || tel || `item-${index + 1}`) || `item-${index + 1}`}`;
        if (!name && !tel && !email) return null;

        return { id, name, tel, email };
      })
      .filter(Boolean);
  }

  normalizeUserList(rawUsers, legacySellers = []) {
    const values = Array.isArray(rawUsers)
      ? rawUsers
      : rawUsers && typeof rawUsers === "object" && !this.isEmptyConfigObject(rawUsers)
        ? Object.entries(rawUsers).map(([id, value]) => ({ id, ...(typeof value === "object" ? value : { name: value }) }))
        : [];

    const normalized = values
      .map((item, index) => {
        const name = String(item.name || item.nombre || item.label || "").trim();
        const tel = String(item.tel || item.telefono || item.phone || "").trim();
        const email = String(item.email || item.correo || item.mail || "").trim();
        const id = String(item.id || item.key || item.value || "").trim() || this.createUserId(name || email || tel || `usuario-${index + 1}`, tel, email, source);
        if (!name && !tel && !email) return null;
        const roles = this.parseCsvList(item.roles || item.role || item.rol || "vendedor");
        return {
          id,
          name,
          tel,
          email,
          roles: roles.length ? roles : ["vendedor"],
          warehouseIds: this.parseCsvList(item.warehouseIds || item.warehouses || item.almacenes),
          active: item.active !== false,
        };
      })
      .filter(Boolean);

    if (normalized.length) return normalized;

    return (legacySellers || []).map(seller => ({
      ...seller,
      roles: ["vendedor"],
      migratedFrom: "vendedores",
    }));
  }

  deriveSellersFromUsers(users = []) {
    return (users || [])
      .filter(user => (user.roles || []).includes("vendedor"))
      .map(user => ({
        id: user.id,
        name: user.name || "",
        tel: user.tel || "",
        email: user.email || "",
      }));
  }

  normalizeWarehouseList(rawWarehouses) {
    const defaults = (window.ProductFormConfig || {}).WAREHOUSES || [];
    const values = Array.isArray(rawWarehouses)
      ? rawWarehouses
      : rawWarehouses && typeof rawWarehouses === "object" && !this.isEmptyConfigObject(rawWarehouses)
        ? Object.entries(rawWarehouses).map(([id, value]) => ({ id, ...(typeof value === "object" ? value : { name: value }) }))
        : defaults;

    const normalized = values
      .map((item, index) => {
        const id = this.getPrimitiveText(item?.id || item?.key || item?.slug).trim() || String(index + 1);
        const name = this.getWarehouseText(item).trim();
        if (!id || !name) return null;
        return {
          id,
          name,
          color: String(item?.color || "#111111").trim(),
          active: item?.active !== false,
        };
      })
      .filter(Boolean);

    return normalized.length ? normalized : defaults;
  }

  normalizeRoleList(rawRoles) {
    const values = Array.isArray(rawRoles)
      ? rawRoles
      : rawRoles && typeof rawRoles === "object" && !this.isEmptyConfigObject(rawRoles)
        ? Object.entries(rawRoles).map(([id, value]) => ({ id, ...(typeof value === "object" ? value : { label: value }) }))
        : [];

    return values
      .map((item, index) => {
        const label = String(item?.label || item?.name || item?.nombre || item?.title || "").trim();
        const id = String(item?.id || item?.key || item?.value || "").trim() || this.createRoleId(label || `role-${index + 1}`, values);
        if (!id || !label) return null;
        return {
          id,
          label,
          name: label,
          uiScopes: this.parseCsvList(item?.uiScopes || item?.screens || item?.scope || item?.scopes),
          capabilities: this.parseCsvList(item?.capabilities || item?.permisos || item?.permissions),
          active: item?.active !== false,
        };
      })
      .filter(Boolean);
  }

  getPrimitiveText(value) {
    if (value == null) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);
    return "";
  }

  getWarehouseText(value) {
    if (value == null) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);
    if (typeof value !== "object") return "";

    for (const key of ["name", "nombre", "label", "title", "text", "value"]) {
      const text = this.getWarehouseText(value[key]);
      if (text) return text;
    }

    return "";
  }

  getTaxonomyMeta(type) {
    if (type === "category") {
      return {
        title: "Categorías",
        singular: "categoría",
        placeholder: "Ej. Refrigeración",
      };
    }
    if (type === "subcategory") {
      return {
        title: "Subcategorías",
        singular: "subcategoría",
        placeholder: "Ej. Vitrinas",
      };
    }
    if (type === "brand") {
      return {
        title: "Marcas",
        singular: "marca",
        placeholder: "Ej. Torrey",
      };
    }
    if (type === "user") {
      return {
        title: "Usuarios",
        singular: "usuario",
        placeholder: "Ej. Juan Pérez",
      };
    }
    if (type === "supplier") {
      return {
        title: "Proveedores",
        singular: "proveedor",
        placeholder: "Ej. RATIONAL México",
      };
    }
    if (type === "warehouse") {
      return {
        title: "Almacenes",
        singular: "almacén",
        placeholder: "Ej. Bodega San José",
      };
    }
    if (type === "role") {
      return {
        title: "Roles",
        singular: "rol",
        placeholder: "Ej. Encargado de almacén",
      };
    }
    return { title: "Catálogo", singular: "elemento", placeholder: "" };
  }

  getTaxonomyItems(type, categories, brands, categoryKey, sellers, suppliers, warehouses = [], roles = []) {
    if (type === "category") {
      return Object.entries(categories || {}).map(([key, item]) => ({
        key,
        label: item.name || key,
      }));
    }
    if (type === "subcategory") {
      const parent = categories[categoryKey];
      const subcategories = parent?.subcategories || [];
      return subcategories.map((label) => ({
        key: this.slugifyTaxonomyValue(label),
        label,
      }));
    }
    if (type === "user") {
      return (sellers || []).map((item) => ({
        key: item.id,
        label: this.getSellerLabel(item),
        tel: this.getSellerMeta(item).tel,
        email: this.getSellerMeta(item).email,
        roles: item.roles || ["vendedor"],
        warehouseIds: item.warehouseIds || [],
      }));
    }
    if (type === "supplier") {
      return (suppliers || []).map((item) => ({
        key: item.id,
        label: this.getSellerLabel(item),
        tel: this.getSellerMeta(item).tel,
        email: this.getSellerMeta(item).email,
      }));
    }
    if (type === "warehouse") {
      return (warehouses || []).map((item) => ({
        key: item.id,
        label: item.name,
      }));
    }
    if (type === "role") {
      return (roles || []).map((item) => ({
        key: item.id,
        label: item.label || item.name || item.id,
        uiScopes: item.uiScopes || [],
        capabilities: item.capabilities || [],
      }));
    }
    return (brands || []).map((label) => ({ key: label, label }));
  }

  getNextCategoryKey(categories) {
    const numericKeys = Object.keys(categories || {})
      .map(key => Number(key))
      .filter(Number.isFinite);
    return String((numericKeys.length ? Math.max(...numericKeys) : 0) + 1);
  }

  getNextWarehouseKey(warehouses = []) {
    const numericKeys = warehouses
      .map(warehouse => Number(warehouse.id))
      .filter(Number.isFinite);
    return String((numericKeys.length ? Math.max(...numericKeys) : 0) + 1);
  }
}

// Instantiate and expose window.ProductFormTaxonomy for backwards compatibility
document.addEventListener("DOMContentLoaded", () => {
  const panel = new TaxonomyManagerPanel();
  window.ProductFormTaxonomy = {
    load() { return panel.loadTaxonomyConfig(); },
    open(type) { return panel.open(type); },
    close() { return panel.close(); },
    refresh() {
      panel.taxonomyConfigPromise = null;
      return panel.loadTaxonomyConfig();
    }
  };
});
