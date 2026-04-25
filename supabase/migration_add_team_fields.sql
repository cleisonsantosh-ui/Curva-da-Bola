-- =============================================
-- MIGRATION: Adiciona campos inline de times
-- Cole e execute no SQL Editor do Supabase
-- =============================================

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS home_team_name TEXT,
  ADD COLUMN IF NOT EXISTS home_team_logo TEXT,
  ADD COLUMN IF NOT EXISTS away_team_name TEXT,
  ADD COLUMN IF NOT EXISTS away_team_logo TEXT;
