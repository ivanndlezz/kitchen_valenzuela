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
      const container = document.getElementById("client-form-container");
      if (container) {
        const isVisible = container.getAttribute("data-visible") === "true";
        container.setAttribute("data-visible", isVisible ? "false" : "true");
        document.getElementById("client-form-title").textContent = "Registrar Nuevo Cliente";
        form.reset();
        document.getElementById("client-id").value = "";
      }
    });
  }

  const btnCancel = document.getElementById("btn-cancel-client");
  if (btnCancel) {
    btnCancel.addEventListener("click", () => {
      const container = document.getElementById("client-form-container");
      if (container) container.setAttribute("data-visible", "false");
      form.reset();
    });
  }
}

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

  grid.innerHTML = window.AppState.clients.map(c => `
    <div class="client-card">
      <div class="client-card-name">${c.nombre}</div>
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
      <div class="client-card-actions">
        <button class="btn-action-small" data-edit-id="${c.id}"><i data-lucide="edit" style="width:16px;height:16px;"></i></button>
        <button class="btn-action-small btn-action-small--danger" data-delete-id="${c.id}"><i data-lucide="trash-2" style="width:16px;height:16px;"></i></button>
      </div>
    </div>
  `).join("");

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
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-delete-id");
      if (confirm("¿Estás seguro de que deseas eliminar este cliente?")) {
        window.AppState.clients = window.AppState.clients.filter(c => c.id !== id);
        saveClientsToStorage();
        showToast("Cliente eliminado correctamente.", "danger");
        renderClientsList();
      }
    });
  });

  createLucideIcons();
}

function editClient(client) {
  const container = document.getElementById("client-form-container");
  if (!container) return;

  container.setAttribute("data-visible", "true");
  document.getElementById("client-form-title").textContent = "Editar Cliente";
  
  document.getElementById("client-id").value = client.id;
  document.getElementById("client-nombre").value = client.nombre;
  document.getElementById("client-empresa").value = client.empresa || "";
  document.getElementById("client-rfc").value = client.rfc || "";
  document.getElementById("client-telefono").value = client.telefono || "";
  document.getElementById("client-correo").value = client.correo || "";
  document.getElementById("client-direccion").value = client.direccion || "";

  container.scrollIntoView({ behavior: "smooth" });
}

function handleClientSubmit(e) {
  e.preventDefault();
  const id = document.getElementById("client-id").value;
  const nombre = document.getElementById("client-nombre").value.trim();
  const empresa = document.getElementById("client-empresa").value.trim();
  const rfc = document.getElementById("client-rfc").value.trim();
  const telefono = document.getElementById("client-telefono").value.trim();
  const correo = document.getElementById("client-correo").value.trim();
  const direccion = document.getElementById("client-direccion").value.trim();

  if (id) {
    // Edit mode
    const idx = window.AppState.clients.findIndex(c => c.id === id);
    if (idx !== -1) {
      window.AppState.clients[idx] = { id, nombre, empresa, rfc, telefono, correo, direccion };
      showToast("Cliente actualizado correctamente.", "success");
    }
  } else {
    // Create mode
    const newId = "C" + Date.now();
    window.AppState.clients.push({ id: newId, nombre, empresa, rfc, telefono, correo, direccion });
    showToast("Nuevo cliente registrado con éxito.", "success");
  }

  saveClientsToStorage();
  document.getElementById("client-form-container").setAttribute("data-visible", "false");
  document.getElementById("client-form").reset();
  renderClientsList();
}
