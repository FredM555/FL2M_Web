-- Diagnostic complet du problème de messages
-- Remplacer les IDs par les vrais

-- ============================================================================
-- 1. RLS est-il activé sur messages ?
-- ============================================================================

SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'messages';

-- ============================================================================
-- 2. Toutes les politiques SELECT sur messages
-- ============================================================================

SELECT
  policyname,
  permissive,
  roles,
  qual as using_clause
FROM pg_policies
WHERE tablename = 'messages'
  AND cmd = 'SELECT'
ORDER BY policyname;

-- ============================================================================
-- 3. Vérifier le profil de l'admin
-- ============================================================================

SELECT
  id,
  email,
  first_name,
  last_name,
  user_type
FROM profiles
WHERE id = '07377ef1-637a-4178-8000-d16c1430a8e0';

-- ============================================================================
-- 4. TEST : Simuler auth.uid() pour l'admin
-- ============================================================================

-- Vérifier si la clause admin de la politique retourne TRUE
SELECT
  '07377ef1-637a-4178-8000-d16c1430a8e0' as test_user_id,
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = '07377ef1-637a-4178-8000-d16c1430a8e0'
      AND user_type = 'admin'
  ) as is_admin,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM profiles
      WHERE id = '07377ef1-637a-4178-8000-d16c1430a8e0'
        AND user_type = 'admin'
    ) THEN 'Devrait voir TOUS les messages appointment'
    ELSE 'user_type n''est PAS "admin"'
  END as resultat;

-- ============================================================================
-- 5. Compter les messages que l'admin DEVRAIT voir
-- ============================================================================

SELECT
  COUNT(*) as total_appointment_messages,
  SUM(CASE WHEN sender_type = 'admin' THEN 1 ELSE 0 END) as from_admin,
  SUM(CASE WHEN sender_type = 'user' THEN 1 ELSE 0 END) as from_user
FROM messages
WHERE reference_type = 'appointment';

-- ============================================================================
-- 6. TEST AVEC RLS : Se connecter en tant qu'admin et exécuter
-- ============================================================================

-- NOTE : Cette requête doit être exécutée en étant connecté avec le compte admin
-- Elle utilisera auth.uid() réel
/*
SELECT
  id,
  reference_id,
  sender_type,
  message,
  created_at
FROM messages
WHERE reference_type = 'appointment'
ORDER BY created_at DESC;
*/
