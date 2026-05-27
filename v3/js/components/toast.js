/**
 * Toast Component — Love Shack v3
 * Lightweight toast notification system
 */

const Toast = {
  /**
   * Show a toast notification
   * @param {string} message - Toast text
   * @param {string} type - 'success' | 'error' | 'warning' | 'info'
   * @param {number} duration - ms before auto-dismiss
   */
  show(message, type = "info", duration = 2500) {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const icons = {
      success: "✓",
      error: "✕",
      warning: "⚠",
      info: "ℹ",
    };

    const isPersistent = duration === -1;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || icons.info}</span>
      <span>${message}</span>
      ${
        isPersistent
          ? `
        <button class="toast-close" style="background: transparent; border: none; font-size: 13px; cursor: pointer; color: currentColor; opacity: 0.6; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; height: 18px; width: 18px; border-radius: 50%; padding: 0; margin-left: 8px;" onmouseover="this.style.opacity='1'; this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.opacity='0.6'; this.style.background='transparent'">✕</button>
      `
          : ""
      }
    `;

    container.appendChild(toast);

    if (isPersistent) {
      toast.querySelector(".toast-close")?.addEventListener("click", () => {
        toast.classList.add("toast-exit");
        toast.addEventListener("animationend", () => toast.remove(), {
          once: true,
        });
      });
    } else {
      // Auto-dismiss
      setTimeout(() => {
        toast.classList.add("toast-exit");
        toast.addEventListener("animationend", () => toast.remove(), {
          once: true,
        });
      }, duration);
    }

    return toast;
  },

  success(message, duration) {
    return this.show(message, "success", duration);
  },
  error(message, duration) {
    return this.show(message, "error", duration);
  },
  warning(message, duration) {
    return this.show(message, "warning", duration);
  },
  info(message, duration) {
    return this.show(message, "info", duration);
  },
};

window.Toast = Toast;
