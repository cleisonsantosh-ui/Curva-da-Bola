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

const DateUtils = (() => {
  /**
   * Retorna um objeto Date ajustado para o fuso de Brasília (UTC-3).
   * @param {number} offsetDays - Deslocamento em dias (Ex: -1 para Ontem, 0 para Hoje, 1 para Amanhã)
   */
  function getBRTDate(offsetDays = 0) {
    const now = new Date();
    // Ajusta para o fuso de Brasília (UTC-3)
    const brtOffset = -3;
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const brtTime = new Date(utc + (3600000 * brtOffset));
    
    // Apliva o offset de dias
    brtTime.setDate(brtTime.getDate() + offsetDays);
    return brtTime;
  }

  /**
   * Retorna a string YYYY-MM-DD no fuso de Brasília.
   */
  function getBRTDateStr(offsetDays = 0) {
    const d = getBRTDate(offsetDays);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Converte uma string ISO para a data YYYY-MM-DD no fuso de Brasília.
   */
  function getBRTDateStrFromISO(isoStr) {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const brtTime = new Date(utc + (3600000 * -3));
    const year = brtTime.getFullYear();
    const month = String(brtTime.getMonth() + 1).padStart(2, '0');
    const day = String(brtTime.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return { getBRTDate, getBRTDateStr, getBRTDateStrFromISO };
})();

window.ToastService = ToastService;
window.DateUtils = DateUtils;
