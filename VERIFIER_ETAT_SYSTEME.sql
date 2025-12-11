-- =====================================================
-- SCRIPT DE VÉRIFICATION - État du Système de Chat
-- =====================================================
-- Exécutez ce script dans Supabase Dashboard pour vérifier
-- que toutes les migrations ont été appliquées correctement.
--
-- URL : https://supabase.com/dashboard/project/phokxjbocljahmbdkrbs/sql/new
-- =====================================================

-- 1️⃣ Vérifier que les colonnes sont NULLABLE
SELECT
  '1. VÉRIFICATION DES COLONNES NULLABLE' as check_name;

SELECT
  column_name,
  is_nullable,
  CASE
    WHEN is_nullable = 'YES' THEN '✅ OK'
    ELSE '❌ ERREUR - Doit être NULLABLE'
  END as status
FROM information_schema.columns
WHERE table_name = 'messages'
  AND column_name IN ('first_name', 'last_name', 'email', 'subject', 'phone')
ORDER BY column_name;

-- 2️⃣ Vérifier que la foreign key vers profiles existe
SELECT
  '2. VÉRIFICATION FOREIGN KEY messages → profiles' as check_name;

SELECT
  constraint_name,
  table_name,
  constraint_type,
  '✅ Foreign key existe' as status
FROM information_schema.table_constraints
WHERE constraint_name = 'messages_user_id_fkey'
  AND table_name = 'messages';

-- 3️⃣ Vérifier que la vue message_threads compte tous les messages
SELECT
  '3. VÉRIFICATION VUE message_threads' as check_name;

-- Comparer le nombre de messages dans la table vs dans la vue
WITH table_count AS (
  SELECT thread_id, COUNT(*) as count_in_table
  FROM public.messages
  GROUP BY thread_id
),
view_count AS (
  SELECT thread_id, message_count as count_in_view
  FROM public.message_threads
)
SELECT
  COALESCE(t.thread_id, v.thread_id) as thread_id,
  t.count_in_table,
  v.count_in_view,
  CASE
    WHEN t.count_in_table = v.count_in_view THEN '✅ OK'
    ELSE '❌ ERREUR - Nombres différents'
  END as status
FROM table_count t
FULL OUTER JOIN view_count v ON t.thread_id = v.thread_id
ORDER BY thread_id
LIMIT 10;

-- 4️⃣ Vérifier quelques messages pour comprendre la structure
SELECT
  '4. EXEMPLES DE MESSAGES (derniers 5)' as check_name;

SELECT
  id,
  thread_id,
  parent_id,
  sender_type,
  LEFT(message, 50) || '...' as message_preview,
  first_name,
  subject,
  created_at
FROM public.messages
ORDER BY created_at DESC
LIMIT 5;

-- 5️⃣ Résumé final
SELECT
  '5. RÉSUMÉ' as check_name;

SELECT
  'Total messages' as metric,
  COUNT(*) as value
FROM public.messages
UNION ALL
SELECT
  'Messages avec parent_id NULL (premiers messages)' as metric,
  COUNT(*) as value
FROM public.messages
WHERE parent_id IS NULL
UNION ALL
SELECT
  'Messages avec parent_id (réponses)' as metric,
  COUNT(*) as value
FROM public.messages
WHERE parent_id IS NOT NULL
UNION ALL
SELECT
  'Threads uniques' as metric,
  COUNT(DISTINCT thread_id) as value
FROM public.messages;

-- =====================================================
-- INTERPRÉTATION DES RÉSULTATS
-- =====================================================
--
-- ✅ Si tout est OK, vous devriez voir :
--   1. Toutes les colonnes first_name, last_name, email, subject, phone sont NULLABLE
--   2. La foreign key messages_user_id_fkey existe
--   3. Les comptes dans la table et la vue sont identiques
--   4. Des messages avec et sans parent_id
--
-- ❌ Si vous voyez des erreurs :
--   - Colonnes NOT NULL → Exécutez EXECUTER_CE_SQL_MAINTENANT.sql
--   - Foreign key manquante → Exécutez MIGRATIONS_A_APPLIQUER.sql
--   - Comptes différents → Exécutez MIGRATIONS_A_APPLIQUER.sql
--
-- =====================================================
