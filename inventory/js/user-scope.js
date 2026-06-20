/**
 * user-scope.js
 * Header-level user and role context. This does not enforce permissions yet.
 */

(function () {
  const USER_STORAGE_KEY = "kv-active-user-scope";
  const ROLE_STORAGE_KEY = "kv-active-role-scope";

  const DEFAULT_ROLE_DEFINITIONS = {
    admin: {
      label: "Administrador",
      uiScopes: ["Inventario", "Catálogos", "Web", "Sync"],
      capabilities: ["leer", "crear", "actualizar", "conciliar", "sincronizar"],
    },
    vendedor: {
      label: "Vendedor",
      uiScopes: ["Inventario", "Cotizaciones", "Clientes"],
      capabilities: ["leer", "cotizar", "vender"],
    },
    almacen: {
      label: "Almacén",
      uiScopes: ["Inventario", "Existencias"],
      capabilities: ["leer", "ajustar_existencias"],
    },
  };

  const state = {
    button: null,
    label: null,
    users: [],
    roles: [],
    activeUserId: "",
    activeRoleId: "",
    loading: false,
    loaded: false,
  };

  function init() {
    state.button = document.getElementById("user-scope-btn");
    state.label = document.querySelector("[data-user-scope-label]");
    state.activeUserId = localStorage.getItem(USER_STORAGE_KEY) || "";
    state.activeRoleId = localStorage.getItem(ROLE_STORAGE_KEY) || "";

    state.button?.addEventListener("click", openUserSheet);
    window.addEventListener("taxonomy:updated", event => {
      if (!["role", "user", "seller"].includes(event.detail?.type)) return;
      refreshUsers().then(() => {
        resolveActiveContext();
        updateHeader();
        publishScope();
      });
    });
    refreshUsers().then(() => {
      resolveActiveContext();
      updateHeader();
      publishScope();
    });
  }

  async function refreshUsers() {
    state.loading = true;
    try {
      const taxonomy = await window.ProductFormTaxonomy?.load?.();
      const fields = taxonomy?.record?.fields || {};
      const explicitUsers = taxonomy?.users || parseJsonField(fields.usuarios || fields.Usuarios || fields.users || fields.Users, []);
      state.roles = normalizeRoleDefinitions(taxonomy?.roles || parseJsonField(fields.Roles || fields.roles, []));
      const users = normalizeUsers(explicitUsers);
      state.users = users.length ? users : normalizeUsersFromSellers(taxonomy?.sellers || []);
    } catch (error) {
      console.warn("UserScope: No se pudieron cargar usuarios desde configs.", error);
      state.users = [];
      state.roles = normalizeRoleDefinitions([]);
    } finally {
      state.loading = false;
      state.loaded = true;
    }
  }

  function normalizeUsers(rawUsers) {
    const source = Array.isArray(rawUsers)
      ? rawUsers
      : rawUsers && typeof rawUsers === "object"
        ? Object.entries(rawUsers).map(([id, value]) => ({ id, ...(typeof value === "object" ? value : { name: value }) }))
        : [];

    return source
      .map((item, index) => {
        const name = getText(item?.name || item?.nombre || item?.label || item?.email || item).trim();
        if (!name) return null;
        const id = getText(item?.id || item?.key || item?.email).trim() || `user-${slugify(name || `usuario-${index + 1}`)}`;
        const roles = normalizeRoles(item?.roles || item?.role || item?.rol || "vendedor");
        return {
          id,
          name,
          tel: getText(item?.tel || item?.telefono || item?.phone).trim(),
          email: getText(item?.email || item?.correo).trim(),
          roles,
          uiScopes: normalizeList(item?.uiScopes || item?.scopes || item?.scope),
          capabilities: normalizeList(item?.capabilities || item?.permisos),
          warehouseIds: normalizeList(item?.warehouseIds || item?.warehouses || item?.almacenes),
          active: item?.active !== false,
        };
      })
      .filter(Boolean)
      .filter(user => user.active !== false);
  }

  function normalizeUsersFromSellers(sellers) {
    return (Array.isArray(sellers) ? sellers : [])
      .map((seller, index) => {
        const name = getText(seller?.name || seller?.label || seller).trim();
        if (!name) return null;
        return {
          id: getText(seller?.id).trim() || `seller-${slugify(name || `vendedor-${index + 1}`)}`,
          name,
          tel: getText(seller?.tel || seller?.telefono || seller?.phone).trim(),
          email: getText(seller?.email).trim(),
          roles: ["vendedor"],
          uiScopes: [],
          capabilities: [],
          warehouseIds: normalizeList(seller?.warehouseIds || seller?.warehouses || seller?.almacenes),
          active: true,
        };
      })
      .filter(Boolean);
  }

  function normalizeRoles(value) {
    const roles = normalizeList(value)
      .map(role => slugify(role))
      .filter(Boolean);
    return roles.length ? Array.from(new Set(roles)) : ["vendedor"];
  }

  function normalizeRoleDefinitions(rawRoles) {
    const source = Array.isArray(rawRoles) ? rawRoles : [];
    const roles = source
      .map((item) => {
        const id = slugify(item?.id || item?.key || item?.value || item?.label || item?.name);
        const label = getText(item?.label || item?.name || item?.nombre || item?.title).trim();
        if (!id || !label) return null;
        return {
          id,
          label,
          uiScopes: normalizeList(item?.uiScopes || item?.screens || item?.scope || item?.scopes),
          capabilities: normalizeList(item?.capabilities || item?.permisos || item?.permissions),
          warehouseIds: normalizeList(item?.warehouseIds || item?.warehouses || item?.almacenes),
          active: item?.active !== false,
        };
      })
      .filter(Boolean)
      .filter(role => role.active !== false);

    if (roles.length) return roles;

    return Object.entries(DEFAULT_ROLE_DEFINITIONS).map(([id, role]) => ({
      id,
      label: role.label,
      uiScopes: role.uiScopes,
      capabilities: role.capabilities,
      active: true,
    }));
  }

  function normalizeList(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(getText).map(item => item.trim()).filter(Boolean);
    if (typeof value === "string") {
      return value.split(",").map(item => item.trim()).filter(Boolean);
    }
    return [getText(value).trim()].filter(Boolean);
  }

  function resolveActiveContext() {
    if (!state.users.length) {
      state.activeUserId = "";
      state.activeRoleId = "";
      return;
    }

    const hasUser = state.users.some(user => user.id === state.activeUserId);
    if (!hasUser) state.activeUserId = state.users[0].id;

    const user = getActiveUser();
    const roles = user?.roles?.length ? user.roles : ["vendedor"];
    if (!roles.includes(state.activeRoleId)) state.activeRoleId = roles[0];

    localStorage.setItem(USER_STORAGE_KEY, state.activeUserId);
    localStorage.setItem(ROLE_STORAGE_KEY, state.activeRoleId);
    if (window.AppState) {
      window.AppState.activeUserId = state.activeUserId;
      window.AppState.activeRoleId = state.activeRoleId;
    }
  }

  function getActiveUser() {
    return state.users.find(user => user.id === state.activeUserId) || null;
  }

  function getActiveRoleMeta(user = getActiveUser()) {
    const role = state.activeRoleId || user?.roles?.[0] || "vendedor";
    const roleMeta = state.roles.find(item => item.id === role) || DEFAULT_ROLE_DEFINITIONS[role] || {
      label: titleCase(role),
      uiScopes: [],
      capabilities: [],
    };
    return {
      id: role,
      label: roleMeta.label,
      uiScopes: user?.uiScopes?.length ? user.uiScopes : roleMeta.uiScopes,
      capabilities: user?.capabilities?.length ? user.capabilities : roleMeta.capabilities,
      warehouseIds: user?.warehouseIds?.length ? user.warehouseIds : roleMeta.warehouseIds || [],
    };
  }

  function updateHeader() {
    const user = getActiveUser();
    const role = getActiveRoleMeta(user);
    if (state.label) {
      state.label.textContent = user ? role.label : "Usuario";
    }
    if (state.button) {
      state.button.title = user ? `${user.name} · ${role.label}` : "Usuario activo";
    }
  }

  function publishScope() {
    const user = getActiveUser();
    const role = getActiveRoleMeta(user);
    window.dispatchEvent(new CustomEvent("user:scope-changed", {
      detail: {
        userId: state.activeUserId,
        roleId: role.id,
        user,
        role,
      },
    }));
  }

  function openUserSheet() {
    if (!window.SheetManager) return;

    window.SheetManager.open({
      id: "user-scope",
      title: "Usuario activo",
      variant: "side",
      size: "sm",
      meta: { eyebrow: "Scope" },
      slots: { main: renderSheetHtml() },
      onOpen(root) {
        bindSheet(root);
        refreshUsers().then(() => {
          resolveActiveContext();
          updateHeader();
          window.SheetManager.active?.hydrateMain(renderSheetHtml());
          bindSheet(document.getElementById("sheet-root"));
          publishScope();
        });
      },
    });
  }

  function renderSheetHtml() {
    if (state.loading && !state.users.length) {
      return `
        <div class="user-scope">
          <div class="user-scope__current" aria-busy="true">
            <div class="skeleton-bone" style="width: 55%; height: 18px;"></div>
            <div class="skeleton-bone" style="width: 36%; height: 12px;"></div>
          </div>
        </div>
      `;
    }

    if (!state.users.length) {
      return `
        <div class="user-scope">
          <div class="user-scope__current">
            <span class="user-scope__name">Sin usuarios configurados</span>
            <span class="user-scope__role">Pendiente</span>
          </div>
        </div>
      `;
    }

    const user = getActiveUser() || state.users[0];
    const role = getActiveRoleMeta(user);
    const roles = user.roles?.length ? user.roles : ["vendedor"];

    return `
      <div class="user-scope">
        <div class="user-scope__current">
          <span class="user-scope__name">${escapeHtml(user.name)}</span>
          <span class="user-scope__role">${escapeHtml(role.label)}</span>
        </div>
        <label class="user-scope__section">
          <span class="user-scope__label">Usuario</span>
          <select class="user-scope__select" data-user-scope-user>
            ${state.users.map(item => `
              <option value="${escapeHtml(item.id)}" ${item.id === user.id ? "selected" : ""}>${escapeHtml(item.name)}</option>
            `).join("")}
          </select>
        </label>
        <label class="user-scope__section">
          <span class="user-scope__label">Rol</span>
          <select class="user-scope__select" data-user-scope-role>
            ${roles.map(item => `
              <option value="${escapeHtml(item)}" ${item === role.id ? "selected" : ""}>${escapeHtml(getRoleLabel(item))}</option>
            `).join("")}
          </select>
        </label>
        <div class="user-scope__section">
          <span class="user-scope__label">UI scopes</span>
          <div class="user-scope__chips">
            ${renderChips(role.uiScopes)}
          </div>
        </div>
        <div class="user-scope__section">
          <span class="user-scope__label">Capabilities</span>
          <div class="user-scope__chips">
            ${renderChips(role.capabilities)}
          </div>
        </div>
      </div>
    `;
  }

  function bindSheet(root) {
    root?.querySelector("[data-user-scope-user]")?.addEventListener("change", event => {
      state.activeUserId = event.target.value;
      state.activeRoleId = "";
      resolveActiveContext();
      updateHeader();
      window.SheetManager.active?.hydrateMain(renderSheetHtml());
      bindSheet(document.getElementById("sheet-root"));
      publishScope();
    });

    root?.querySelector("[data-user-scope-role]")?.addEventListener("change", event => {
      state.activeRoleId = event.target.value;
      resolveActiveContext();
      updateHeader();
      window.SheetManager.active?.hydrateMain(renderSheetHtml());
      bindSheet(document.getElementById("sheet-root"));
      publishScope();
    });
  }

  function renderChips(items) {
    const values = normalizeList(items);
    if (!values.length) return '<span class="user-scope__chip">Sin asignar</span>';
    return values.map(item => `<span class="user-scope__chip">${escapeHtml(item)}</span>`).join("");
  }

  function getRoleLabel(roleId) {
    return (state.roles.find(item => item.id === roleId)?.label)
      || DEFAULT_ROLE_DEFINITIONS[roleId]?.label
      || titleCase(roleId);
  }

  function parseJsonField(value, fallback) {
    if (!value) return fallback;
    if (typeof value === "object") return value;
    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  function getText(value) {
    if (value == null) return "";
    if (typeof value === "string" || typeof value === "number") return String(value);
    if (typeof value !== "object") return "";
    for (const key of ["name", "nombre", "label", "title", "text", "value"]) {
      const text = getText(value[key]);
      if (text) return text;
    }
    return "";
  }

  function slugify(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function titleCase(value) {
    return String(value || "")
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, letter => letter.toUpperCase());
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  window.UserScope = {
    init,
    refresh: refreshUsers,
    getActiveUser,
    getUsers: () => state.users,
    getActiveRole: () => getActiveRoleMeta(),
  };
})();
