/**
 * app.js — Curva da Bola (Somente Brasil)
 */

const App = (() => {
  let activeTab = 'hoje';
  let activeLeague = 'all';
  let allOntemMatches    = [];
  let allTodayMatches    = [];
  let allTomorrowMatches = [];

  // Pega as datas ajustadas para o fuso brasileiro (UTC-3)
  const getBrDateStr = (offsetMs = 0) => {
    const d = new Date(Date.now() + offsetMs);
    const brTime = new Date(d.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    return brTime.toLocaleDateString('sv');
  };

  const ontemStr    = () => getBrDateStr(-86_400_000);
  const todayStr    = () => getBrDateStr(0);
  const tomorrowStr = () => getBrDateStr(86_400_000);

  function prettyDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
  }

  function switchTab(tabName) {
    activeTab = tabName;
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`panel-${tabName}`)?.classList.add('active');
    document.getElementById(`tab-${tabName}`)?.classList.add('active');
  }

  const STATUS_ORDER = { LIVE: 0, SCHEDULED: 1, FINISHED: 2 };
  function sortMatches(matches) {
    return [...matches].sort((a, b) => {
      const sd = (STATUS_ORDER[a.status] ?? 1) - (STATUS_ORDER[b.status] ?? 1);
      if (sd !== 0) return sd;
      return new Date(a.kickoff) - new Date(b.kickoff);
    });
  }

  function filterMatches(matches) {
    if (activeLeague === 'all') return matches;
    return matches.filter(m => String(m.league_id) === String(activeLeague));
  }

  function clearGrid(id) {
    const grid = document.getElementById(id);
    if (grid) grid.innerHTML = '';
  }

  function renderGrid(gridId, emptyId, countId, matches, filtered) {
    clearGrid(gridId);
    const countEl = document.getElementById(countId);
    const emptyEl = document.getElementById(emptyId);
    if (!filtered || filtered.length === 0) {
      emptyEl?.classList.remove('hidden');
      if (countEl) countEl.textContent = '0 jogos';
    } else {
      emptyEl?.classList.add('hidden');
      if (countEl) countEl.textContent = `${filtered.length} jogo${filtered.length !== 1 ? 's' : ''}`;
      CardsService.renderMatches(gridId, filtered);
    }
  }

  function rerenderAll() {
    const ontemFiltered   = sortMatches(filterMatches(allOntemMatches));
    const todayFiltered   = sortMatches(filterMatches(allTodayMatches));
    const amanhaFiltered  = sortMatches(filterMatches(allTomorrowMatches));
    renderGrid('games-grid-ontem',  'empty-ontem',  'ontem-count',  allOntemMatches,    ontemFiltered);
    renderGrid('games-grid-hoje',   'empty-hoje',   'hoje-count',   allTodayMatches,    todayFiltered);
    renderGrid('games-grid-amanha', 'empty-amanha', 'amanha-count', allTomorrowMatches, amanhaFiltered);
  }

  async function loadMatches() {
    const [ontemData, todayData, tomorrowData] = await Promise.all([
      ApiService.getMatchesForDate(ontemStr()),
      ApiService.getMatchesForDate(todayStr()),
      ApiService.getMatchesForDate(tomorrowStr()),
    ]);
    allOntemMatches    = ontemData    || [];
    allTodayMatches    = todayData    || [];
    allTomorrowMatches = tomorrowData || [];

    const ontEl = document.getElementById('ontem-date-title');
    const todEl = document.getElementById('today-date-title');
    const tomEl = document.getElementById('tomorrow-date-title');
    
    if (ontEl) ontEl.textContent = `Ontem — ${prettyDate(ontemStr())}`;
    if (todEl) todEl.textContent = `Hoje — ${prettyDate(todayStr())}`;
    if (tomEl) tomEl.textContent = `Amanhã — ${prettyDate(tomorrowStr())}`;
    
    rerenderAll();
    refreshLiveCount();
  }

  function refreshLiveCount() {
    const liveGames = allTodayMatches.filter(m => m.status === 'LIVE');
    const badgeEl   = document.getElementById('live-count-badge');
    const indicatorEl = document.getElementById('live-indicator');
    if (badgeEl) {
      badgeEl.textContent = liveGames.length > 0
        ? `${liveGames.length} jogo${liveGames.length !== 1 ? 's' : ''} ao vivo agora`
        : 'Nenhum jogo ao vivo agora';
    }
    if (indicatorEl) indicatorEl.style.opacity = liveGames.length > 0 ? '1' : '0.4';
  }

  function reloadTodayIfNeeded(newRow) {
    if (new Date(newRow.kickoff).toLocaleDateString('sv') === todayStr()) loadMatches();
  }

  function setupConfigModal() {
    const overlay = document.getElementById('config-overlay');
    const form    = document.getElementById('config-form');
    if (window.FUT_CONFIG.SUPABASE_URL || localStorage.getItem('futbrasil_sb_url')) {
      overlay?.classList.add('hidden');
      return;
    }
    overlay?.classList.remove('hidden');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const url = document.getElementById('supabase-url').value.trim();
      const key = document.getElementById('supabase-key').value.trim();
      if (!url || !key) return;
      SupabaseService.saveCredentials(url, key);
      SupabaseService.init();
      overlay.classList.add('hidden');
      RealtimeService.subscribe();
      await loadMatches();
    });
  }

  function bindEvents() {
    document.querySelectorAll('.nav-btn[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    document.querySelectorAll('.filter-chip[data-league]').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        activeLeague = chip.dataset.league;
        rerenderAll();
      });
    });
    document.getElementById('sync-btn')?.addEventListener('click', async () => {
      const btn = document.getElementById('sync-btn');
      btn.disabled = true;
      const oldTxt = btn.textContent;
      btn.textContent = '⌛...';
      await ApiService.syncLeagues();
      btn.disabled = false;
      btn.textContent = oldTxt;
      await loadMatches();
    });
  }

  function cleanOldCache() {
    const today = todayStr();
    const tom   = tomorrowStr();
    Object.keys(localStorage)
      .filter(k => k.startsWith('last_fetch_') && k !== `last_fetch_${today}` && k !== `last_fetch_${tom}`)
      .forEach(k => localStorage.removeItem(k));
  }

  async function runSmartSync() {
    const today = todayStr();
    // Verifica se há jogos hoje que ainda não acabaram
    const hasActiveGames = allTodayMatches.some(m => m.status === 'LIVE' || m.status === 'SCHEDULED');
    
    if (hasActiveGames) {
      console.info('[App] SmartSync: Iniciando atualização de placares...');
      await ApiService.syncLiveMatches();
      await loadMatches();
    } else {
      console.info('[App] SmartSync: Nenhum jogo ativo no momento. Pulando sync.');
    }
  }

  async function init() {
    SupabaseService.loadSavedCredentials();
    const sbClient = SupabaseService.init();
    bindEvents();
    setupConfigModal();
    if (sbClient) {
      RealtimeService.subscribe();
      await loadMatches();
      cleanOldCache();
      
      // Sincronização Inteligente:
      // 1. Sincroniza tudo ao abrir (se não houver dados de hoje)
      if (allTodayMatches.length === 0) {
        await ApiService.syncLeagues();
        await loadMatches();
      }

      // 2. Roda o SmartSync a cada 10 minutos (Econômico)
      setInterval(() => runSmartSync(), 10 * 60 * 1000); 
    }
    
    // Atualiza a UI (apenas leitura do Supabase) a cada 1 min
    setInterval(() => loadMatches(), window.FUT_CONFIG.LIVE_POLL_INTERVAL);
  }

  return { init, refreshLiveCount, reloadTodayIfNeeded };
})();

window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());
