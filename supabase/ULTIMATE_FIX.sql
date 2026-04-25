-- =========================================================
-- ULTIMATE DATABASE REPAIR — Curva da Bola
-- Execute este comando no SQL Editor do seu Supabase.
-- Clique em "RUN" para aplicar.
-- =========================================================

-- 1. Garante que a tabela exista
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  api_id INTEGER UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Adiciona TODAS as colunas necessárias (caso faltem)
ALTER TABLE public.matches 
  ADD COLUMN IF NOT EXISTS league_id INTEGER,
  ADD COLUMN IF NOT EXISTS league_name TEXT,
  ADD COLUMN IF NOT EXISTS kickoff TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS minute INTEGER,
  ADD COLUMN IF NOT EXISTS score_home INTEGER,
  ADD COLUMN IF NOT EXISTS score_away INTEGER,
  ADD COLUMN IF NOT EXISTS venue TEXT,
  ADD COLUMN IF NOT EXISTS home_team_name TEXT,
  ADD COLUMN IF NOT EXISTS home_team_logo TEXT,
  ADD COLUMN IF NOT EXISTS away_team_name TEXT,
  ADD COLUMN IF NOT EXISTS away_team_logo TEXT;

-- 3. Garante que o índice de conflito para 'api_id' exista
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'matches_api_id_key') THEN
        ALTER TABLE public.matches ADD CONSTRAINT matches_api_id_key UNIQUE (api_id);
    END IF;
END $$;

-- 4. Habilita Realtime (importante para atualização automática)
ALTER TABLE public.matches REPLICA IDENTITY FULL;

-----------------------------------------------------------
-- BANCO DE DADOS ATUALIZADO COM SUCESSO!
-----------------------------------------------------------
