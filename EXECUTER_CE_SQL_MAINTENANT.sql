-- =====================================================
-- ⚠️ EXÉCUTEZ CE SQL MAINTENANT DANS SUPABASE DASHBOARD
-- =====================================================
-- URL : https://supabase.com/dashboard/project/phokxjbocljahmbdkrbs/sql/new
--
-- INSTRUCTIONS :
-- 1. Allez sur l'URL ci-dessus
-- 2. Copiez TOUT ce fichier
-- 3. Collez dans l'éditeur SQL
-- 4. Cliquez sur "RUN"
-- =====================================================

-- Rendre les colonnes NULLABLE pour permettre les réponses dans les threads
ALTER TABLE public.messages ALTER COLUMN first_name DROP NOT NULL;
ALTER TABLE public.messages ALTER COLUMN last_name DROP NOT NULL;
ALTER TABLE public.messages ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.messages ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE public.messages ALTER COLUMN subject DROP NOT NULL;

-- Message de confirmation
SELECT '✅ Colonnes rendues NULLABLE - Les utilisateurs peuvent maintenant répondre !' as resultat;
