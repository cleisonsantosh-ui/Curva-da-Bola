-- =====================================================
-- FutBrasil — Supabase Database Schema
-- Execute este SQL no SQL Editor do seu projeto Supabase
-- =====================================================

-- ── 1. TEAMS (Times) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.teams (
  id          SERIAL PRIMARY KEY,
  api_id      INTEGER UNIQUE,           -- ID do time na API-Football
  name        TEXT NOT NULL,
  short_name  TEXT,
  logo        TEXT,                     -- URL do escudo
  country     TEXT DEFAULT 'Brazil',
  founded     INTEGER,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. LEAGUES (Ligas) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leagues (
  id          SERIAL PRIMARY KEY,
  api_id      INTEGER UNIQUE,           -- ID da liga na API-Football (71, 72, 73...)
  name        TEXT NOT NULL,            -- "Série A", "Copa do Brasil", etc.
  logo        TEXT,
  country     TEXT DEFAULT 'Brazil',
  season      INTEGER,                  -- Ano da temporada (ex: 2025)
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Seed das ligas brasileiras
INSERT INTO public.leagues (api_id, name, country, season)
VALUES
  (71,  'Campeonato Brasileiro Série A',   'Brazil', 2025),
  (72,  'Campeonato Brasileiro Série B',   'Brazil', 2025),
  (73,  'Copa do Brasil',                  'Brazil', 2025),
  (75,  'Copa Sul-Americana',              'Brazil', 2025),
  (13,  'Copa Libertadores',               'Brazil', 2025)
ON CONFLICT (api_id) DO NOTHING;

-- ── 3. MATCHES (Partidas) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.matches (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  api_id       INTEGER UNIQUE,           -- ID da partida na API-Football
  league_id    INTEGER REFERENCES public.leagues(api_id),
  league_name  TEXT,
  season       INTEGER DEFAULT 2025,

  home_team_id INTEGER REFERENCES public.teams(api_id),
  away_team_id INTEGER REFERENCES public.teams(api_id),

  kickoff      TIMESTAMPTZ NOT NULL,     -- Horário de início (UTC)
  venue        TEXT,                     -- Nome do estádio

  -- Status: SCHEDULED | LIVE | FINISHED | POSTPONED | CANCELLED
  status       TEXT DEFAULT 'SCHEDULED',
  minute       INTEGER,                  -- Minuto atual (apenas quando LIVE)

  -- Placar
  score_home   INTEGER,
  score_away   INTEGER,
  score_ht_home INTEGER,                 -- Placar no intervalo (casa)
  score_ht_away INTEGER,                 -- Placar no intervalo (visitante)

  -- Pênaltis (quando aplicável)
  penalties_home INTEGER,
  penalties_away INTEGER,

  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para queries mais rápidas
CREATE INDEX IF NOT EXISTS idx_matches_kickoff     ON public.matches (kickoff);
CREATE INDEX IF NOT EXISTS idx_matches_status      ON public.matches (status);
CREATE INDEX IF NOT EXISTS idx_matches_league_id   ON public.matches (league_id);
CREATE INDEX IF NOT EXISTS idx_matches_home_team   ON public.matches (home_team_id);
CREATE INDEX IF NOT EXISTS idx_matches_away_team   ON public.matches (away_team_id);

-- ── 4. LIVE_EVENTS (Eventos em tempo real) ────────────────────
-- Opcional: armazena gols, cartões, substituições
CREATE TABLE IF NOT EXISTS public.live_events (
  id          SERIAL PRIMARY KEY,
  match_id    UUID REFERENCES public.matches(id) ON DELETE CASCADE,
  minute      INTEGER,
  type        TEXT,                      -- 'Goal' | 'Card' | 'Subst'
  detail      TEXT,                      -- 'Normal Goal' | 'Yellow Card' etc.
  team_id     INTEGER,
  player_name TEXT,
  assist_name TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_events_match ON public.live_events (match_id);

-- ── 5. AUTO-UPDATE timestamp ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ── 6. ROW-LEVEL SECURITY (RLS) ───────────────────────────────
-- Habilita RLS (boa prática de segurança no Supabase)
ALTER TABLE public.matches     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leagues      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_events  ENABLE ROW LEVEL SECURITY;

-- Permite leitura pública (anon key) para todos os dados
CREATE POLICY "Public read matches"    ON public.matches    FOR SELECT USING (true);
CREATE POLICY "Public read teams"      ON public.teams      FOR SELECT USING (true);
CREATE POLICY "Public read leagues"    ON public.leagues    FOR SELECT USING (true);
CREATE POLICY "Public read events"     ON public.live_events FOR SELECT USING (true);

-- Apenas service_role pode inserir/atualizar/deletar (para o worker/cron)
CREATE POLICY "Service write matches"  ON public.matches    FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service write teams"    ON public.teams      FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── 7. REALTIME: habilitar tabela matches ─────────────────────
-- No Dashboard Supabase: Database > Replication > Tabelas
-- Ou execute:
ALTER TABLE public.matches REPLICA IDENTITY FULL;

-- Adiciona `matches` à publicação do Realtime
-- (Execute se a publicação supabase_realtime já existir)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;

-- =====================================================
-- Schema criado com sucesso!
-- Próximos passos:
--   1. Cole este SQL no SQL Editor do Supabase e clique Run
--   2. Em Database > Replication, ative a tabela `matches`
--   3. Insira suas credenciais no FutBrasil
-- =====================================================
