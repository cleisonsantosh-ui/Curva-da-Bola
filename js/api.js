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
      // Simplificado: Busca jogos que ocorrem dentro do dia especificado no horário de Brasília
      // Como o banco está em UTC, comparamos com o intervalo equivalente em UTC:
      // 00:00 BRT = 03:00 UTC | 23:59 BRT = 02:59 UTC (dia seguinte)
      const { data, error } = await client
        .from('matches')
        .select('*')
        .gte('kickoff', `${dateStr}T03:00:00+00:00`)
        .lte('kickoff', `${dateStr}T23:59:59-03:00`) // O Supabase costuma inferir o offset corretamente
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

  // 🔄 Sync por data específica (Econômico: 1 requisição)
  async function syncDate(d) {
    const key = window.FUT_CONFIG.API_FOOTBALL_KEY;
    if (!key) return;
    console.info(`[Sync] Sincronizando data específica: ${d}...`);
    try {
      const res = await fetch(`${window.FUT_CONFIG.API_FOOTBALL_BASE}/fixtures?date=${d}`, {
        headers: { 'x-apisports-key': key }
      });
      const json = await res.json();
      const fixtures = json?.response || [];
      const brFixtures = fixtures.filter(f => f.league.country === 'Brazil');
      if (brFixtures.length > 0) {
        await upsertMatches(brFixtures.map(normFixture));
        return brFixtures.length;
      }
    } catch (e) {
      console.error(`[Sync] Erro ao sincronizar data ${d}:`, e);
    }
    return 0;
  }

  // 🔄 SYNC ULTIMATE: Pega tudo de Ontem, Hoje e Amanhã
  async function syncLeagues() {
    const key = window.FUT_CONFIG.API_FOOTBALL_KEY;
    if (!key) return ToastService.show('❌ Configure sua API Key!', 'error');

    ToastService.show('⏳ Sincronizando Calendário...', 'info');
    let totalSaved = 0;

    const dates = [
      window.DateUtils.getBRTDateStr(-1), // Ontem
      window.DateUtils.getBRTDateStr(0),  // Hoje
      window.DateUtils.getBRTDateStr(1)   // Amanhã
    ];

    for (const d of dates) {
      totalSaved += await syncDate(d);
    }

    if (totalSaved > 0) {
      ToastService.show(`✅ Sucesso! ${totalSaved} partidas sincronizadas.`, 'success');
    } else {
      ToastService.show('⚠️ Calendário atualizado (nenhum jogo novo).', 'warning');
    }
  }

  async function getMatchesForDate(dateStr) {
    return await fetchFromSupabase(dateStr) || [];
  }

  return { getMatchesForDate, syncLeagues, syncLiveMatches, syncDate, normFixture, normaliseStatus };
})();

window.ApiService = ApiService;
