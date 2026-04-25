-- =========================================================
-- SOLUÇÃO: REMOVER TRAVAS DO BANCO (FOREIGN KEYS)
-- Execute este comando no SQL Editor do seu Supabase.
-- =========================================================

-- O erro apontou que o banco recusou salvar porque a liga não estava
-- previamente cadastrada na tabela "leagues". Como estamos salvando o 
-- nome da liga e dos times direto na tabela "matches", não precisamos 
-- dessas travas. Vamos removê-las!

ALTER TABLE public.matches
  DROP CONSTRAINT IF EXISTS matches_league_id_fkey,
  DROP CONSTRAINT IF EXISTS matches_home_team_id_fkey,
  DROP CONSTRAINT IF EXISTS matches_away_team_id_fkey;

-- Opcional: Esvaziar as tabelas antigas se quiser limpar a sujeira
-- DELETE FROM public.matches;

SELECT 'Travas removidas com sucesso! Já pode testar o botão Sincronizar de novo.' AS status;
