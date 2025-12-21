-- Test pour vérifier la politique RLS des messages de rendez-vous
-- À exécuter dans le SQL Editor de Supabase

-- 1. Vérifier qu'un rendez-vous existe avec des messages
SELECT
  a.id as appointment_id,
  a.client_id,
  a.practitioner_id,
  p.user_id as practitioner_user_id,
  COUNT(m.id) as message_count
FROM appointments a
LEFT JOIN practitioners p ON a.practitioner_id = p.id
LEFT JOIN messages m ON a.id = m.reference_id AND m.category = 'appointment'
WHERE a.id = 'baa72029-4a1f-4557-85e1-f761d3d4853e'  -- Remplacer par l'ID du RDV
GROUP BY a.id, a.client_id, a.practitioner_id, p.user_id;

-- 2. Voir tous les messages du RDV (sans RLS)
-- NOTE: Cette requête bypasse RLS, elle doit être exécutée en tant qu'admin
SELECT
  id,
  user_id,
  sender_type,
  message,
  reference_id,
  category,
  read_by_user,
  read_by_admin,
  created_at
FROM messages
WHERE reference_type = 'appointment'
  AND reference_id = 'baa72029-4a1f-4557-85e1-f761d3d4853e'  -- Remplacer par l'ID du RDV
ORDER BY created_at ASC;

-- 3. Test de la jointure pour la politique RLS
-- Simuler ce que fait la politique pour l'intervenant
SELECT
  m.id,
  m.message,
  m.sender_type,
  a.id as appointment_id,
  p.user_id as practitioner_user_id
FROM messages m
INNER JOIN appointments a ON a.id = m.reference_id
INNER JOIN practitioners p ON a.practitioner_id = p.id
WHERE m.reference_type = 'appointment'
  AND m.reference_id = 'baa72029-4a1f-4557-85e1-f761d3d4853e'
  AND p.user_id = '07377ef1-637a-4178-8000-d16c1430a8e0'  -- Remplacer par l'ID user de l'intervenant
ORDER BY m.created_at ASC;

-- 4. Vérifier le type de reference_id
SELECT
  reference_id,
  pg_typeof(reference_id) as reference_id_type,
  pg_typeof(reference_id::uuid) as reference_id_as_uuid
FROM messages
WHERE category = 'appointment'
LIMIT 1;

-- 5. Vérifier la politique RLS active
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'messages'
  AND policyname LIKE '%appointment%';
