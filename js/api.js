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
      home_team: {
        name: teams.home.name,
        logo: teams.home.logo,
        id:   teams.home.id
      },
      away_team: {
        name: teams.away.name,
        logo: teams.away.logo,
        id:   teams.away.id
      },
      updated_at: new Date().toISOString()
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
      // 🎯 Fix: Busca jogos que ocorrem dentro do dia especificado no horário de Brasília (UTC-3)
      // 00:00 BRT = 03:00 UTC | 23:59 BRT = 02:59 UTC (dia seguinte)
      const { data, error } = await client
        .from('matches')
        .select('*')
        .gte('kickoff', `${dateStr}T03:00:00+00:00`)
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

    // Converte de volta para o formato chato do banco (Flat Columns)
    const flatMatches = matches.map(m => ({
      api_id:         m.api_id,
      league_id:      m.league_id,
      league_name:    m.league_name,
      venue:          m.venue,
      kickoff:        m.kickoff,
      status:         m.status,
      minute:         m.minute,
      score_home:     m.score_home,
      score_away:     m.score_away,
      home_team_name: m.home_team.name,
      home_team_logo: m.home_team.logo,
      away_team_name: m.away_team.name,
      away_team_logo: m.away_team.logo,
      updated_at:     m.updated_at
    }));

    const { error } = await client.from('matches').upsert(flatMatches, { onConflict: 'api_id' });
    
    if (error) {
      console.error('[Supabase] Erro Crítico no Upsert:', error.message);
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
      
      // 🎯 Fix: Inclui TUDO do Brasil + Ligas Internacionais configuradas (Liberta/Sula)
      const allowedLeagues = window.FUT_CONFIG.BRAZILIAN_LEAGUE_IDS;
      const relevantFixtures = fixtures.filter(f => 
        f.league.country === 'Brazil' || allowedLeagues.includes(f.league.id)
      );
      
      if (relevantFixtures.length > 0) {
        console.info(`[Sync] Atualizando ${relevantFixtures.length} jogos relevantes ao vivo.`);
        await upsertMatches(relevantFixtures.map(normFixture));
        return relevantFixtures.map(normFixture); // 🎯 Retorna os dados para renderização imediata
      }
      return [];
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
      const allowedLeagues = window.FUT_CONFIG.BRAZILIAN_LEAGUE_IDS;
      const relevantFixtures = fixtures.filter(f => 
        f.league.country === 'Brazil' || allowedLeagues.includes(f.league.id)
      );
      if (relevantFixtures.length > 0) {
        await upsertMatches(relevantFixtures.map(normFixture));
        return relevantFixtures.map(normFixture); // 🎯 Retorna os dados
      }
    } catch (e) {
      console.error(`[Sync] Erro ao sincronizar data ${d}:`, e);
    }
    return [];
  }

  // 🔄 SYNC ULTIMATE: Pega tudo de Ontem, Hoje e Amanhã
  async function syncLeagues() {
    const key = window.FUT_CONFIG.API_FOOTBALL_KEY;
    if (!key) return ToastService.show('❌ Configure sua API Key!', 'error');

    ToastService.show('⏳ Sincronizando Calendário...', 'info');
    let totalSaved = 0;

    const dates = [
      window.DateUtils.getBRTDateStr(-1), // Ontem
      window.DateUtils.getBRTDateStr(0)   // Hoje
    ];

    const results = {};
    for (const d of dates) {
      const data = await syncDate(d);
      totalSaved += data.length;
      results[d] = data;
    }

    if (totalSaved > 0) {
      ToastService.show(`✅ Sucesso! ${totalSaved} partidas sincronizadas.`, 'success');
    } else {
      ToastService.show('⚠️ Calendário atualizado (nenhum jogo novo).', 'warning');
    }
    return results; // 🎯 Retorna objeto com dados por data
  }

  async function getMatchesForDate(dateStr) {
    return await fetchFromSupabase(dateStr) || [];
  }

  return { getMatchesForDate, syncLeagues, syncLiveMatches, syncDate, normFixture, normaliseStatus };
})();

window.ApiService = ApiService;
