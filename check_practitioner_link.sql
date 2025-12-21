-- Vérifier le lien entre l'intervenant et la table practitioners
-- Remplacer les IDs par les vrais

-- 1. Vérifier si l'admin a un enregistrement practitioners
SELECT
  'Admin user' as type,
  id as user_id,
  first_name,
  last_name,
  user_type
FROM profiles
WHERE id = '07377ef1-637a-4178-8000-d16c1d8e430a';

-- 2. Vérifier s'il existe dans practitioners
SELECT
  'Practitioner record' as type,
  id as practitioner_id,
  user_id,
  created_at
FROM practitioners
WHERE user_id = '07377ef1-637a-4178-8000-d16c1d8e430a';

-- 3. Vérifier le rendez-vous et son intervenant
SELECT
  'Appointment info' as type,
  a.id as appointment_id,
  a.client_id,
  a.practitioner_id,
  p.user_id as practitioner_user_id
FROM appointments a
LEFT JOIN practitioners p ON a.practitioner_id = p.id
WHERE a.id = 'baa72029-4a1f-4557-85e1-f761d3d4853e';

-- 4. TEST CRITIQUE : Est-ce que la politique fonctionne ?
-- Simuler exactement ce que fait la politique RLS
SELECT
  'Test politique RLS' as test,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM appointments a
      JOIN practitioners p ON a.practitioner_id = p.id
      WHERE a.id = 'baa72029-4a1f-4557-85e1-f761d3d4853e'
        AND p.user_id = '07377ef1-637a-4178-8000-d16c1d8e430a'
    ) THEN 'DEVRAIT VOIR LES MESSAGES ✅'
    ELSE 'NE DEVRAIT PAS VOIR LES MESSAGES ❌ - PROBLÈME ICI'
  END as resultat;

-- 5. Si le test ci-dessus échoue, vérifier pourquoi
SELECT
  'Debug jointure' as debug,
  a.id as appointment_id,
  a.practitioner_id,
  p.id as pract_id,
  p.user_id as pract_user_id,
  CASE
    WHEN a.practitioner_id = p.id THEN 'Lien OK'
    ELSE 'Lien CASSÉ'
  END as practitioner_link,
  CASE
    WHEN p.user_id = '07377ef1-637a-4178-8000-d16c1d8e430a' THEN 'User ID OK'
    ELSE 'User ID DIFFÉRENT'
  END as user_link
FROM appointments a
LEFT JOIN practitioners p ON a.practitioner_id = p.id
WHERE a.id = 'baa72029-4a1f-4557-85e1-f761d3d4853e';
