/**
 * app.js — Curva da Bola (Somente Brasil)
 */

const App = (() => {
  let activeTab = 'hoje';
  let activeLeague = 'all';
  let allOntemMatches    = [];
  let allTodayMatches    = [];
  let lastDataHash       = ''; // Para evitar re-renders desnecessários

  // Pega as datas ajustadas para o fuso brasileiro (UTC-3) usando DateUtils
  const ontemStr    = () => window.DateUtils.getBRTDateStr(-1);
  const todayStr    = () => window.DateUtils.getBRTDateStr(0);

  function prettyDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long',
    });
  }

  function switchTab(tabName) {
    if (activeTab === tabName) return;
    activeTab = tabName;
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`panel-${tabName}`)?.classList.add('active');
    document.getElementById(`tab-${tabName}`)?.classList.add('active');
    
    // Ao trocar de aba, força a renderização da nova aba ativa
    rerenderAll(true); 
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
    if (!activeLeague || activeLeague === 'all') return matches;
    return matches.filter(m => {
      if (!m.league_id) return false;
      return String(m.league_id) === String(activeLeague);
    });
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

  function rerenderAll(force = false) {
    // Cria um hash simples dos dados para ver se mudaram
    const currentHash = JSON.stringify({
      tab: activeTab,
      league: activeLeague,
      count: allOntemMatches.length + allTodayMatches.length,
      // Pega os IDs e scores do topo para detectar mudanças rápidas
      top: allTodayMatches.map(m => `${m.id}-${m.score_home}-${m.score_away}-${m.status}-${m.minute}`).join('|').slice(0, 500)
    });

    if (!force && currentHash === lastDataHash) return;
    lastDataHash = currentHash;

    console.info(`[App] Renderizando aba ativa: ${activeTab}...`);
    
    if (activeTab === 'ontem') {
      const filtered = sortMatches(filterMatches(allOntemMatches));
      renderGrid('games-grid-ontem', 'empty-ontem', 'ontem-count', allOntemMatches, filtered);
    } else if (activeTab === 'hoje') {
      const filtered = sortMatches(filterMatches(allTodayMatches));
      renderGrid('games-grid-hoje', 'empty-hoje', 'hoje-count', allTodayMatches, filtered);
    }

    // Atualiza apenas os contadores das outras abas (leve)
    updateCountsOnly();
  }

  function updateCountsOnly() {
    const counts = {
      ontem: filterMatches(allOntemMatches).length,
      hoje: filterMatches(allTodayMatches).length
    };
    if (document.getElementById('ontem-count')) document.getElementById('ontem-count').textContent = `${counts.ontem} jogo${counts.ontem !== 1 ? 's' : ''}`;
    if (document.getElementById('hoje-count')) document.getElementById('hoje-count').textContent = `${counts.hoje} jogo${counts.hoje !== 1 ? 's' : ''}`;
  }

  async function loadMatches() {
    const [ontemData, todayData] = await Promise.all([
      ApiService.getMatchesForDate(ontemStr()),
      ApiService.getMatchesForDate(todayStr()),
    ]);
    allOntemMatches    = ontemData    || [];
    allTodayMatches    = todayData    || [];

    // Instant Cache: Salva os dados no localStorage para o próximo carregamento
    saveToInstantCache();

    const ontEl = document.getElementById('ontem-date-title');
    const todEl = document.getElementById('today-date-title');
    
    if (ontEl) ontEl.textContent = `Ontem — ${prettyDate(ontemStr())}`;
    if (todEl) todEl.textContent = `Hoje — ${prettyDate(todayStr())}`;
    
    rerenderAll();
    refreshLiveCount();
    
    // 🎯 Se a aba ativa estiver vazia após carregar, e pudermos pedir, tenta um sync rápido
    if (activeTab === 'hoje' && allTodayMatches.length === 0 && RequestManager.canRequest()) {
        console.info('[App] Aba hoje vazia. Tentando sync forçado...');
        runSmartSync();
    }
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
    if (window.DateUtils.getBRTDateStrFromISO(newRow.kickoff) === todayStr()) loadMatches();
  }

  // 🛡️ RequestManager: Controla o orçamento de 100 requisições/dia
  const RequestManager = {
    getStats() {
      const today = todayStr();
      const stored = JSON.parse(localStorage.getItem('api_stats') || '{}');
      if (stored.date !== today) return { date: today, count: 0 };
      return stored;
    },
    increment() {
      const stats = this.getStats();
      stats.count++;
      localStorage.setItem('api_stats', JSON.stringify(stats));
      console.info(`[Budget] API Request #${stats.count}/100`);
    },
    canRequest() {
      return this.getStats().count < 100;
    },
    // 🎯 GlobalSync: Protege o limite de 100 req/dia verificando o banco antes de gastar
    async shouldSyncGlobal(forceIfEmpty = true) {
      try {
        if (forceIfEmpty && allTodayMatches.length === 0) return true;
        if (allTodayMatches.length === 0) return false;

        const timestamps = allTodayMatches
          .map(m => m.updated_at ? new Date(m.updated_at).getTime() : 0)
          .filter(t => t > 0);
        
        if (timestamps.length === 0) return true;
        
        const lastUpdate = Math.max(...timestamps);
        const diffMin = (Date.now() - lastUpdate) / 60000;
        
        console.info(`[GlobalSync] Dados no banco atualizados há ${diffMin.toFixed(1)} min.`);
        return diffMin > 15;
      } catch (e) {
        console.warn('[GlobalSync] Erro ao checar banco, forçando sync:', e);
        return true;
      }
    }
  };

  function saveToInstantCache() {
    const data = {
      ontem: allOntemMatches,
      hoje: allTodayMatches,
      timestamp: Date.now()
    };
    localStorage.setItem('instant_cache_matches', JSON.stringify(data));
  }

  function loadFromInstantCache() {
    const cached = localStorage.getItem('instant_cache_matches');
    if (!cached) return false;
    try {
      const data = JSON.parse(cached);
      // Ignora cache se tiver mais de 12 horas (opcional, mas bom para garantir frescor)
      if (Date.now() - data.timestamp > 12 * 60 * 60 * 1000) return false;

      allOntemMatches = data.ontem || [];
      allTodayMatches = data.hoje || [];
      console.info('[App] Instant Cache: Carregado do armazenamento local.');
      return true;
    } catch (e) { return false; }
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
    Object.keys(localStorage)
      .filter(k => k.startsWith('last_fetch_') && k !== `last_fetch_${today}`)
      .forEach(k => localStorage.removeItem(k));
  }

  async function runSmartSync() {
    if (!RequestManager.canRequest()) {
      console.warn('[App] SmartSync: Limite diário de 100 requisições atingido.');
      return;
    }

    const now = new Date();
    // Verifica se há jogos hoje que estão AO VIVO ou que começam nos próximos 15 min
    const hasLiveGames = allTodayMatches.some(m => m.status === 'LIVE');
    const hasUpcomingGames = allTodayMatches.some(m => {
      if (m.status !== 'SCHEDULED') return false;
      const kick = new Date(m.kickoff);
      const diffMin = (kick - now) / 60000;
      return diffMin > -10 && diffMin < 15; // Começa em 15 min ou começou há menos de 10 min
    });
    
    if (hasLiveGames || hasUpcomingGames) {
      // 🎯 Fix: Mesmo em jogos ao vivo, só gasta API se o banco não tiver sido atualizado recentemente por outro usuário
      if (await RequestManager.shouldSyncGlobal(false)) {
        console.info('[App] SmartSync: Jogos ativos e banco desatualizado. Sincronizando...');
        RequestManager.increment();
        const liveData = await ApiService.syncLiveMatches();
        if (liveData && liveData.length > 0) {
          // Mescla dados ao vivo no estado atual imediatamente
          allTodayMatches = mergeMatches(allTodayMatches, liveData);
          saveToInstantCache();
          rerenderAll();
        }
      } else {
        console.info('[App] SmartSync: Jogos ativos mas banco já atualizado por outro usuário. Pulando...');
      }
    } else {
      console.info('[App] SmartSync: Nenhum jogo ativo ou próximo. Pulando sync para economizar API.');
    }
  }

  // Verifica se jogos de ONTEM ficaram "presos" no status LIVE
  async function cleanupYesterday() {
    const unfinished = allOntemMatches.filter(m => m.status === 'LIVE' || m.status === 'SCHEDULED');
    if (unfinished.length > 0 && RequestManager.canRequest()) {
      console.info(`[App] Cleanup: Sincronizando ${unfinished.length} jogos de ontem.`);
      RequestManager.increment();
      const data = await ApiService.syncDate(ontemStr());
      if (data && data.length > 0) {
        allOntemMatches = data;
        rerenderAll();
      }
    }
  }

  async function init() {
    console.info('[App] Inicializando...');
    
    try {
      // 1. Carregamento Base e UI (Sempre executa)
      cleanOldCache();
      loadFromInstantCache();
      bindEvents();
      setupConfigModal();
      rerenderAll(); 

      // 2. Notícias (Independente do banco)
      try {
        if (window.NewsService) window.NewsService.renderNews('news-grid');
      } catch (e) { console.error('[App] Erro nas notícias:', e); }

      // 3. Supabase e Sync (Pode falhar sem quebrar o resto)
      try {
        SupabaseService.loadSavedCredentials();
        const sbClient = SupabaseService.init();
        
        if (sbClient) {
          console.info('[App] Supabase conectado.');
          RealtimeService.subscribe();
          await loadMatches(); 
          await cleanupYesterday();

          if (await RequestManager.shouldSyncGlobal() && RequestManager.canRequest()) {
            console.info('[App] Sincronização necessária...');
            const data = await ApiService.syncLeagues();
            if (data) {
              if (data[ontemStr()]) allOntemMatches = data[ontemStr()];
              if (data[todayStr()]) allTodayMatches = data[todayStr()];
              saveToInstantCache();
              rerenderAll();
            }
          }
        } else {
          console.warn('[App] Supabase não configurado ou indisponível.');
          // Tenta carregar matches mesmo sem Supabase (se houver cache)
          await loadMatches(); 
        }
      } catch (e) { console.error('[App] Erro no Supabase/Sync:', e); }

      // 4. Agendamentos de Intervalo
      setInterval(() => runSmartSync(), 5 * 60 * 1000); 
      setInterval(() => {
        loadMatches().catch(e => console.warn('[App] Erro no refresh:', e));
      }, 25_000);

    } catch (e) {
      console.error('[App] Erro crítico:', e);
      alert('Erro ao carregar o site. Por favor, recarregue a página.');
    }
  }

  function mergeMatches(oldList, newList) {
    if (!newList || !Array.isArray(newList)) return oldList;
    const map = new Map(oldList.map(m => [m.api_id, m]));
    newList.forEach(m => {
      if (m && m.api_id) map.set(m.api_id, m);
    });
    return Array.from(map.values());
  }

  return { init, refreshLiveCount, reloadTodayIfNeeded };
})();

window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());
