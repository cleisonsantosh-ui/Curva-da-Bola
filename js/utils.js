/**
 * utils.js
 * Utilitários globais carregados antes de qualquer lógica de negócio.
 */

const ToastService = (() => {
  function show(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) {
      console.warn('ToastContainer não encontrado no DOM.');
      return;
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    // Auto-remove com animação sutil
    setTimeout(() => {
      toast.classList.add('fading-out');
      setTimeout(() => toast.remove(), 400);
    }, duration);
  }
  return { show };
})();

window.ToastService = ToastService;
