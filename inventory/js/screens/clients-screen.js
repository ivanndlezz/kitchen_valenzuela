/**
 * clients-screen.js
 * Clients registry, card list renderer, editing controller, and submit event handler.
 */

function setupClientsUI() {
  const form = document.getElementById("client-form");
  if (form) {
    form.addEventListener("submit", handleClientSubmit);
  }

  const btnAdd = document.getElementById("btn-add-client");
  if (btnAdd) {
    btnAdd.addEventListener("click", () => {
      openClientDrawer();
      document.getElementById("client-form-title").textContent = "Registrar Nuevo Cliente";
      if (form) form.reset();
      document.getElementById("client-id").value = "";
    });
  }

  const btnCancel = document.getElementById("btn-cancel-client");
  if (btnCancel) {
    btnCancel.addEventListener("click", closeClientDrawer);
  }

  const btnCancelBtn = document.getElementById("btn-cancel-client-btn");
  if (btnCancelBtn) {
    btnCancelBtn.addEventListener("click", closeClientDrawer);
  }

  const btnSync = document.getElementById("btn-sync-clients");
  if (btnSync) {
    btnSync.addEventListener("click", async () => {
      btnSync.disabled = true;
      btnSync.innerHTML = `<i data-lucide="loader" class="spinning"></i> Sincronizando...`;
      createLucideIcons();
      try {
        await syncAllClientsFromCloud();
        showToast("Clientes sincronizados con Airtable exitosamente.", "success");
      } catch (err) {
        showToast("Error al sincronizar clientes: " + err.message, "danger");
      } finally {
        btnSync.disabled = false;
        btnSync.innerHTML = `<i data-lucide="refresh-cw"></i> Sincronizar Nube`;
        createLucideIcons();
      }
    });
  }
}

function openClientDrawer() {
  const container = document.getElementById("client-form-container");
  const scrim = document.getElementById("app-scrim");
  if (container) container.classList.add("drawer__sheet--active");
  if (scrim) scrim.classList.add("drawer__scrim--active");
}

function closeClientDrawer() {
  const container = document.getElementById("client-form-container");
  const scrim = document.getElementById("app-scrim");
  if (container) container.classList.remove("drawer__sheet--active");
  if (scrim) scrim.classList.remove("drawer__scrim--active");
  const form = document.getElementById("client-form");
  if (form) form.reset();
}
window.closeClientDrawer = closeClientDrawer;

window.renderClientsView = function() {
  renderClientsList();
};

function renderClientsList() {
  const grid = document.getElementById("clients-list-grid");
  if (!grid) return;

  if (window.AppState.clients.length === 0) {
    grid.innerHTML = `<div class="quote-empty-state" style="grid-column: span 3;">No hay clientes registrados en la base de datos.</div>`;
    return;
  }

  grid.innerHTML = window.AppState.clients.map(c => {
    const isSynced = c.sync_status === "synced";
    const badgeClass = isSynced ? "sync-badge--synced" : "sync-badge--no-cloud";
    const badgeLabel = isSynced ? "Sincronizado" : "Pendiente";
    const badgeIcon = isSynced ? "cloud" : "cloud-lightning";

    return `
      <div class="client-card">
        <div class="client-card__sync-badge sync-badge ${badgeClass}" title="${isSynced ? 'Sincronizado con Airtable' : 'Pendiente de sincronizar con Airtable'}">
          <i data-lucide="${badgeIcon}" style="width:12px;height:12px;"></i> ${badgeLabel}
        </div>
        <div class="client-card-name" style="padding-right: 80px;">${c.nombre}</div>
        <div class="client-card-empresa">${c.empresa || '—'}</div>
        <div class="client-card-detail">
          <i data-lucide="hash" style="width:12px;height:12px;"></i> RFC: ${c.rfc || '—'}
        </div>
        <div class="client-card-detail">
          <i data-lucide="phone" style="width:12px;height:12px;"></i> Tel: ${c.telefono || '—'}
        </div>
        <div class="client-card-detail">
          <i data-lucide="mail" style="width:12px;height:12px;"></i> Mail: ${c.correo || '—'}
        </div>
        <div class="client-card-detail">
          <i data-lucide="map-pin" style="width:12px;height:12px;"></i> Dir: ${c.direccion || '—'}
        </div>
        
        <!-- Extended Fields Preview -->
        ${c.ciudad || c.estado ? `
          <div class="client-card-detail">
            <i data-lucide="map" style="width:12px;height:12px;"></i> Región: ${[c.ciudad, c.estado].filter(Boolean).join(', ')}
          </div>
        ` : ''}
        ${c.categoria ? `
          <div class="client-card-detail">
            <i data-lucide="tag" style="width:12px;height:12px;"></i> Cat: ${c.categoria}
          </div>
        ` : ''}
        ${c.industry ? `
          <div class="client-card-detail">
            <i data-lucide="briefcase" style="width:12px;height:12px;"></i> Ind: ${c.industry}
          </div>
        ` : ''}
        ${c.notes ? `
          <div class="client-card-detail" style="margin-top: 4px; font-style: italic; border-left: 2px solid var(--border-color); padding-left: 6px; font-size: 11px;">
            ${c.notes}
          </div>
        ` : ''}

        <div class="client-card-actions">
          <button class="btn-action-small" data-edit-id="${c.id}"><i data-lucide="edit" style="width:16px;height:16px;"></i></button>
          <button class="btn-action-small btn-action-small--danger" data-delete-id="${c.id}"><i data-lucide="trash-2" style="width:16px;height:16px;"></i></button>
        </div>
      </div>
    `;
  }).join("");

  // Add event handlers
  grid.querySelectorAll("[data-edit-id]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-edit-id");
      const client = window.AppState.clients.find(c => c.id === id);
      if (client) {
        editClient(client);
      }
    });
  });

  grid.querySelectorAll("[data-delete-id]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-delete-id");
      if (confirm("¿Estás seguro de que deseas eliminar este cliente?")) {
        const clientToDelete = window.AppState.clients.find(c => c.id === id);
        
        // Remove locally first
        window.AppState.clients = window.AppState.clients.filter(c => c.id !== id);
        saveClientsToStorage();
        showToast("Cliente eliminado localmente.", "success");
        renderClientsList();

        // Remove from Airtable asynchronously
        if (clientToDelete && clientToDelete.airtable_id) {
          try {
            await window.SyncManager.deleteClientFromAirtable(clientToDelete.airtable_id);
            showToast("Cliente eliminado de la nube con éxito.", "success");
          } catch (err) {
            console.error("Failed to delete client from cloud:", err);
            showToast("Error al eliminar de la nube (se reintentará en la siguiente sincronización).", "warning");
          }
        }
      }
    });
  });

  createLucideIcons();
}

function editClient(client) {
  document.getElementById("client-form-title").textContent = "Editar Cliente";
  
  document.getElementById("client-id").value = client.id;
  document.getElementById("client-nombre").value = client.nombre;
  document.getElementById("client-empresa").value = client.empresa || "";
  document.getElementById("client-rfc").value = client.rfc || "";
  document.getElementById("client-telefono").value = client.telefono || "";
  document.getElementById("client-correo").value = client.correo || "";
  document.getElementById("client-direccion").value = client.direccion || "";

  // Populate new fields
  document.getElementById("client-ciudad").value = client.ciudad || "";
  document.getElementById("client-estado").value = client.estado || "";
  document.getElementById("client-categoria").value = client.categoria || "REFACCIONES";
  document.getElementById("client-industry").value = client.industry || "";
  document.getElementById("client-notas").value = client.notes || "";

  openClientDrawer();
}

async function handleClientSubmit(e) {
  e.preventDefault();
  const id = document.getElementById("client-id").value;
  const nombre = document.getElementById("client-nombre").value.trim();
  const empresa = document.getElementById("client-empresa").value.trim();
  const rfc = document.getElementById("client-rfc").value.trim();
  const telefono = document.getElementById("client-telefono").value.trim();
  const correo = document.getElementById("client-correo").value.trim();
  const direccion = document.getElementById("client-direccion").value.trim();

  // Extended fields
  const ciudad = document.getElementById("client-ciudad").value.trim();
  const estado = document.getElementById("client-estado").value.trim();
  const categoria = document.getElementById("client-categoria").value;
  const industry = document.getElementById("client-industry").value.trim();
  const notes = document.getElementById("client-notas").value.trim();

  let clientObj;

  if (id) {
    // Edit mode
    const idx = window.AppState.clients.findIndex(c => c.id === id);
    if (idx !== -1) {
      const existing = window.AppState.clients[idx];
      clientObj = {
        ...existing,
        nombre,
        empresa,
        rfc,
        telefono,
        correo,
        direccion,
        ciudad,
        estado,
        categoria,
        industry,
        notes,
        sync_status: "pending" // mark as pending sync
      };
      window.AppState.clients[idx] = clientObj;
      showToast("Cliente actualizado localmente.", "success");
    }
  } else {
    // Create mode
    const newId = "C" + Date.now();
    clientObj = {
      id: newId,
      nombre,
      empresa,
      rfc,
      telefono,
      correo,
      direccion,
      ciudad,
      estado,
      categoria,
      industry,
      notes,
      airtable_id: null,
      sync_status: "pending"
    };
    window.AppState.clients.push(clientObj);
    showToast("Nuevo cliente registrado localmente.", "success");
  }

  saveClientsToStorage();
  closeClientDrawer();
  renderClientsList();

  // Try to sync to Airtable immediately
  if (clientObj) {
    try {
      showToast("Guardando en la nube...", "info");
      await window.SyncManager.syncClient(clientObj);
      saveClientsToStorage();
      renderClientsList();
      showToast("Cliente guardado en la nube con éxito.", "success");
    } catch (err) {
      console.error("Failed to sync client to cloud:", err);
      showToast("No se pudo guardar en la nube (se reintentará más tarde).", "warning");
    }
  }
}

async function syncAllClientsFromCloud() {
  if (!window.SyncManager || typeof window.SyncManager.fetchAllClientsFromAirtable !== "function") {
    console.warn("SyncManager or client methods not available.");
    return;
  }

  // 1. Fetch remote clients
  const rawCloud = await window.SyncManager.fetchAllClientsFromAirtable();
  const cloudClients = rawCloud.map(rec => window.SyncManager.mapAirtableToLocalClient(rec));

  const localClients = window.AppState.clients || [];

  // 2. Identify local clients that need uploading (sync_status !== 'synced' or no airtable_id)
  const unsyncedLocal = localClients.filter(c => c.sync_status !== "synced" || !c.airtable_id);
  for (const localClient of unsyncedLocal) {
    try {
      await window.SyncManager.syncClient(localClient);
      console.log("Uploaded local client:", localClient.nombre);
    } catch (e) {
      console.warn("Failed to upload local client during bulk sync:", localClient.nombre, e);
    }
  }

  // Re-fetch cloud clients if we did any uploads to get latest Airtable timestamps/IDs
  let finalCloudClients = cloudClients;
  if (unsyncedLocal.length > 0) {
    const reRawCloud = await window.SyncManager.fetchAllClientsFromAirtable();
    finalCloudClients = reRawCloud.map(rec => window.SyncManager.mapAirtableToLocalClient(rec));
  }

  // 3. Merge: cloud data is the source of truth for synced objects, but keep unsynced local data
  const mergedClients = [...finalCloudClients];

  localClients.forEach(lc => {
    if (!lc.airtable_id || lc.sync_status !== "synced") {
      if (!mergedClients.some(mc => mc.id === lc.id)) {
        mergedClients.push(lc);
      }
    }
  });

  window.AppState.clients = mergedClients;
  saveClientsToStorage();
  renderClientsList();
}
window.syncAllClientsFromCloud = syncAllClientsFromCloud;
