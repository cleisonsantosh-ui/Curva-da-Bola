-- =========================================================
-- DESBLOQUEIO DE SEGURANÇA (RLS) — Curva da Bola
-- Execute este comando no SQL Editor do seu Supabase.
-- =========================================================

-- Isso permite que o seu site (usando a chave Anon) consiga salvar os jogos no banco.
DROP POLICY IF EXISTS "Anon write matches" ON public.matches;
CREATE POLICY "Anon write matches" ON public.matches 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Caso as outras tabelas também estejam bloqueando algo:
DROP POLICY IF EXISTS "Anon write teams" ON public.teams;
CREATE POLICY "Anon write teams" ON public.teams FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon write leagues" ON public.leagues;
CREATE POLICY "Anon write leagues" ON public.leagues FOR ALL USING (true) WITH CHECK (true);
