/**
 * api.js — Curva da Bola
 * 🚀 VERSÃO ULTIMATE — CORREÇÃO TOTAL 🚀
 */

const ApiService = (() => {

  function normFixture(f) {
    const { fixture, teams, goals, league } = f;
    return {
      api_id:         fixture.id,
      league_id:      league.id,
      league_name:    league.name,
      venue:          fixture.venue?.name || '',
      kickoff:        fixture.date,
      status:         ApiService.normaliseStatus(fixture.status.short),
      minute:         fixture.status.elapsed ?? null,
      score_home:     goals.home,
      score_away:     goals.away,
      home_team_name: teams.home.name,
      home_team_logo: teams.home.logo,
      away_team_name: teams.away.name,
      away_team_logo: teams.away.logo,
    };
  }

  function normaliseStatus(s) {
    const LIVE = ['1H','HT','2H','ET','BT','P','SUSP','INT','LIVE'];
    const FIN  = ['FT','AET','PEN','WO','AWD'];
    if (LIVE.includes(s)) return 'LIVE';
    if (FIN.includes(s))  return 'FINISHED';
    return 'SCHEDULED';
  }

  async function fetchFromSupabase(dateStr) {
    const client = window.SupabaseClient;
    if (!client) return null;
    try {
      const { data, error } = await client
        .from('matches')
        .select('*')
        // Ajuste Fuso Horário Brasil (UTC-3): 00:00 no Brasil = 03:00 no UTC do mesmo dia
        .gte('kickoff', `${dateStr}T03:00:00+00:00`)
        // 23:59 no Brasil = 02:59 no UTC do dia SEGUINTE
        .lte('kickoff', `${dateStr}T23:59:59-03:00`)
        .order('kickoff', { ascending: true });

      if (error) { console.error('[Supabase] Erro:', error); return null; }
      return (data || []).map(m => ({
        ...m,
        home_team: { name: m.home_team_name, logo: m.home_team_logo },
        away_team: { name: m.away_team_name, logo: m.away_team_logo },
      }));
    } catch (err) {
      return null;
    }
  }

  async function upsertMatches(matches) {
    const client = window.SupabaseClient;
    if (!client || !matches?.length) return;

    // Tenta upsert. Se falhar, avisa que as colunas podem estar faltando.
    const { error } = await client.from('matches').upsert(matches, { onConflict: 'api_id' });
    
    if (error) {
      console.error('[Supabase] Erro Crítico no Upsert:', error.message);
      if (error.message.includes('column') || error.message.includes('not found')) {
        ToastService.show('🚨 Erro no Banco: Colunas faltando! Execute o SQL de migração.', 'error', 10000);
      }
    }
  }

  // 🔄 SYNC LIVE: Pega apenas jogos AO VIVO (Super econômico: 1 requisição)
  async function syncLiveMatches() {
    const key = window.FUT_CONFIG.API_FOOTBALL_KEY;
    if (!key) return;

    console.info('[Sync] 🔴 Buscando atualizações ao vivo (Smart Sync)...');
    try {
      const res = await fetch(`${window.FUT_CONFIG.API_FOOTBALL_BASE}/fixtures?live=all`, {
        headers: { 'x-apisports-key': key }
      });
      const json = await res.json();
      const fixtures = json?.response || [];
      
      // Filtra apenas times do Brasil
      const brFixtures = fixtures.filter(f => f.league.country === 'Brazil');
      if (brFixtures.length > 0) {
        console.info(`[Sync] Atualizando ${brFixtures.length} jogos ao vivo.`);
        await upsertMatches(brFixtures.map(normFixture));
        return true;
      }
    } catch (e) {
      console.error('[Sync] Erro no Live Sync:', e);
    }
    return false;
  }

  // 🔄 SYNC ULTIMATE: Pega tudo de Hoje e Amanhã + Ligas BR
  async function syncLeagues() {
    const key = window.FUT_CONFIG.API_FOOTBALL_KEY;
    if (!key) return ToastService.show('❌ Configure sua API Key!', 'error');

    ToastService.show('⏳ Sincronizando Jogos Brasileiros...', 'info');
    let totalSaved = 0;

    // 1. Tenta Sync Live primeiro para garantir os placares atuais
    await syncLiveMatches();

    // 2. Puxar por DATA (Ontem, Hoje e Amanhã)
    const now = Date.now();
    const dates = [
      new Date(now - 86400000).toLocaleDateString('sv'), // Ontem
      new Date(now).toLocaleDateString('sv'),            // Hoje
      new Date(now + 86400000).toLocaleDateString('sv')  // Amanhã
    ];

    for (const d of dates) {
      console.info(`[Sync] Buscando data: ${d}...`);
      try {
        const res = await fetch(`${window.FUT_CONFIG.API_FOOTBALL_BASE}/fixtures?date=${d}`, {
          headers: { 'x-apisports-key': key }
        });
        const json = await res.json();
        const fixtures = json?.response || [];
        
        const brFixtures = fixtures.filter(f => f.league.country === 'Brazil');
        if (brFixtures.length > 0) {
          await upsertMatches(brFixtures.map(normFixture));
          totalSaved += brFixtures.length;
        }
      } catch (e) { }
    }

    if (totalSaved > 0) {
      ToastService.show(`✅ Sucesso! ${totalSaved} partidas sincronizadas.`, 'success');
    } else {
      ToastService.show('⚠️ Nenhum jogo novo. Verifique sua cota API.', 'warning');
    }
  }

  async function getMatchesForDate(dateStr) {
    return await fetchFromSupabase(dateStr) || [];
  }

  return { getMatchesForDate, syncLeagues, normFixture, normaliseStatus };
})();

window.ApiService = ApiService;
