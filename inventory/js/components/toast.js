/**
 * toast.js
 * Toast notifications system and Lucide icons helper.
 */

function setupToastContainer() {
  window.DOM.toastContainer = document.createElement("div");
  window.DOM.toastContainer.className = "toast-container";
  document.body.appendChild(window.DOM.toastContainer);
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  
  let icon = "check-circle";
  if (type === "warning") icon = "alert-triangle";
  if (type === "danger") icon = "alert-octagon";
  if (type === "info") icon = "info";

  toast.innerHTML = `
    <i data-lucide="${icon}"></i>
    <span>${message}</span>
  `;
  
  window.DOM.toastContainer.appendChild(toast);
  createLucideIcons();

  setTimeout(() => {
    toast.style.animation = "toast-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Helper to re-render Lucide SVG Icons globally
function createLucideIcons() {
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}
