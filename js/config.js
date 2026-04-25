/**
 * config.js
 * Configuração central — APENAS BRASIL.
 */

window.FUT_CONFIG = {
  // ── Supabase ──────────────────────────────────────────────
  SUPABASE_URL: 'https://hxioxyyptqbdwgoejkar.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_q4po9Quo3QpCOj14kyjLrw_MYbcdLu7',

  // ── API-Football ──────────────────────────────────────────
  API_FOOTBALL_KEY: '999d134e9c533f8befbfa34d20d204a1',
  API_FOOTBALL_BASE: 'https://v3.football.api-sports.io',

  // ── Ligas Brasileiras ─────────────────────────────────────
  LEAGUE_IDS: {
    serie_a:           71,   // Série A
    serie_b:           72,   // Série B
    copa_do_brasil:    73,   // Copa do Brasil
    copa_sul_americana: 75,  // Sul-Americana
    libertadores:      13,   // Libertadores
  },

  get BRAZILIAN_LEAGUE_IDS() {
    return Object.values(this.LEAGUE_IDS);
  },

  LEAGUE_NAMES: {
    71: 'Série A',
    72: 'Série B',
    73: 'Copa do Brasil',
    75: 'Sul-Americana',
    13: 'Libertadores',
  },

  // ── Intervalos ────────────────────────────────────────────
  LIVE_POLL_INTERVAL:  60_000,  // 1 min
  
  DEMO_MODE: false,
  DEMO_GAMES: [],
};
