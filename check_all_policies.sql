-- Vérifier TOUTES les politiques sur la table messages

SELECT
  policyname,
  cmd as operation,
  permissive,
  roles
FROM pg_policies
WHERE tablename = 'messages'
ORDER BY cmd, policyname;
