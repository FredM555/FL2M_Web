-- Diagnostic pour comprendre pourquoi l'intervenant ne voit pas les messages
-- Remplacer les IDs par les vrais IDs

-- ============================================================================
-- 1. Vérifier que l'intervenant a bien un enregistrement practitioners
-- ============================================================================

-- Remplacer '07377ef1-637a-4178-8000-d16c1430a8e0' par l'ID de votre user admin/intervenant
SELECT
  p.id as practitioner_id,
  p.user_id,
  pr.first_name,
  pr.last_name,
  pr.user_type
FROM practitioners p
JOIN profiles pr ON p.user_id = pr.id
WHERE p.user_id = '07377ef1-637a-4178-8000-d16c1430a8e0';

-- ============================================================================
-- 2. Vérifier que cet intervenant a des rendez-vous
-- ============================================================================

SELECT
  a.id as appointment_id,
  a.client_id,
  a.practitioner_id,
  a.status,
  s.name as service_name
FROM appointments a
LEFT JOIN services s ON a.service_id = s.id
LEFT JOIN practitioners p ON a.practitioner_id = p.id
WHERE p.user_id = '07377ef1-637a-4178-8000-d16c1430a8e0'
ORDER BY a.created_at DESC
LIMIT 10;

-- ============================================================================
-- 3. Vérifier qu'il y a des messages pour ces rendez-vous
-- ============================================================================

SELECT
  m.id as message_id,
  m.reference_id as appointment_id,
  m.sender_type,
  m.message,
  m.created_at,
  a.id as appt_check,
  p.user_id as practitioner_user_id
FROM messages m
LEFT JOIN appointments a ON a.id = m.reference_id
LEFT JOIN practitioners p ON a.practitioner_id = p.id
WHERE m.reference_type = 'appointment'
  AND p.user_id = '07377ef1-637a-4178-8000-d16c1430a8e0'
ORDER BY m.created_at DESC;

-- ============================================================================
-- 4. Test direct de la politique RLS pour un rendez-vous spécifique
-- ============================================================================

-- Remplacer 'baa72029-4a1f-4557-85e1-f761d3d4853e' par l'ID d'un rendez-vous
SELECT
  m.*,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM appointments a
      JOIN practitioners p ON a.practitioner_id = p.id
      WHERE a.id = m.reference_id
        AND p.user_id = '07377ef1-637a-4178-8000-d16c1430a8e0'
    ) THEN 'OUI - L''intervenant devrait voir ce message'
    ELSE 'NON - L''intervenant ne devrait PAS voir ce message'
  END as should_see
FROM messages m
WHERE m.reference_type = 'appointment'
  AND m.reference_id = 'baa72029-4a1f-4557-85e1-f761d3d4853e';

-- ============================================================================
-- 5. Vérifier si c'est un problème de RLS ou de données
-- ============================================================================

-- Cette requête BYPASS RLS (exécuter en tant que service_role ou avec RLS désactivé)
-- Elle montre TOUS les messages appointment sans restriction
SELECT
  m.id,
  m.reference_id,
  m.sender_type,
  m.message,
  m.user_id,
  m.created_at
FROM messages m
WHERE m.reference_type = 'appointment'
ORDER BY m.created_at DESC
LIMIT 10;

-- ============================================================================
-- 6. Test : Est-ce que la jointure fonctionne ?
-- ============================================================================

SELECT
  'Appointment exists' as check_type,
  COUNT(*) as count
FROM appointments
WHERE id = 'baa72029-4a1f-4557-85e1-f761d3d4853e'

UNION ALL

SELECT
  'Messages exist for this appointment' as check_type,
  COUNT(*) as count
FROM messages
WHERE reference_id = 'baa72029-4a1f-4557-85e1-f761d3d4853e'
  AND reference_type = 'appointment'

UNION ALL

SELECT
  'Practitioner linked to this appointment' as check_type,
  COUNT(*) as count
FROM appointments a
JOIN practitioners p ON a.practitioner_id = p.id
WHERE a.id = 'baa72029-4a1f-4557-85e1-f761d3d4853e'
  AND p.user_id = '07377ef1-637a-4178-8000-d16c1430a8e0';
