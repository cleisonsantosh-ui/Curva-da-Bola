/**
 * supabase.js
 * Supabase client initialisation and credential management.
 */

window.SupabaseClient = null;

const SupabaseService = (() => {
  const STORAGE_KEY_URL = 'futbrasil_sb_url';
  const STORAGE_KEY_KEY = 'futbrasil_sb_key';

  function loadSavedCredentials() {
    const url = localStorage.getItem(STORAGE_KEY_URL);
    const key = localStorage.getItem(STORAGE_KEY_KEY);
    if (url) window.FUT_CONFIG.SUPABASE_URL = url;
    if (key) window.FUT_CONFIG.SUPABASE_ANON_KEY = key;
  }

  function saveCredentials(url, anon_key) {
    localStorage.setItem(STORAGE_KEY_URL, url);
    localStorage.setItem(STORAGE_KEY_KEY, anon_key);
    window.FUT_CONFIG.SUPABASE_URL = url;
    window.FUT_CONFIG.SUPABASE_ANON_KEY = anon_key;
  }

  function init() {
    const { url, key } = { url: window.FUT_CONFIG.SUPABASE_URL, key: window.FUT_CONFIG.SUPABASE_ANON_KEY };
    if (!url || !key) {
      console.warn('[Supabase] No credentials configured.');
      return null;
    }
    try {
      const client = supabase.createClient(url, key);
      window.SupabaseClient = client;
      console.info('[Supabase] Client initialised ✅');
      return client;
    } catch (err) {
      console.error('[Supabase] Failed to init client:', err);
      return null;
    }
  }

  function isConnected() {
    return window.SupabaseClient !== null;
  }

  return { init, loadSavedCredentials, saveCredentials, isConnected };
})();

window.SupabaseService = SupabaseService;
