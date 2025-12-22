-- =====================================================
-- Application de la fonction suspend_conflicting_appointments
-- Cette fonction suspend automatiquement les RDV concurrents
-- =====================================================

-- Vérifier si la fonction existe déjà
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public'
        AND p.proname = 'suspend_conflicting_appointments'
    )
    THEN '✓ Fonction existe déjà'
    ELSE '✗ Fonction n''existe pas - création nécessaire'
  END as status;

-- Créer la fonction
CREATE OR REPLACE FUNCTION suspend_conflicting_appointments(
  p_practitioner_id UUID,
  p_start_time TIMESTAMPTZ,
  p_end_time TIMESTAMPTZ,
  p_confirmed_appointment_id UUID
)
RETURNS TABLE(
  suspended_count INT,
  suspended_ids UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_service_id UUID;
  v_suspended_ids UUID[];
  v_count INT;
BEGIN
  -- 1. Récupérer le service_id du rendez-vous confirmé
  SELECT service_id INTO v_service_id
  FROM appointments
  WHERE id = p_confirmed_appointment_id;

  -- 2. Trouver tous les rendez-vous qui se chevauchent
  SELECT ARRAY_AGG(id)
  INTO v_suspended_ids
  FROM appointments
  WHERE practitioner_id = p_practitioner_id
    AND status != 'cancelled'
    AND id != p_confirmed_appointment_id
    AND service_id != v_service_id
    AND start_time < p_end_time
    AND end_time > p_start_time;

  -- 3. Compter
  v_count := COALESCE(array_length(v_suspended_ids, 1), 0);

  -- 4. Si aucun RDV à suspendre
  IF v_count = 0 THEN
    RETURN QUERY SELECT 0 AS suspended_count, ARRAY[]::UUID[] AS suspended_ids;
    RETURN;
  END IF;

  -- 5. Suspendre
  UPDATE appointments
  SET
    status = 'cancelled',
    notes = '[AUTO_SUSPENDED:' || p_confirmed_appointment_id || '] Suspendu automatiquement car un autre rendez-vous a été confirmé sur ce créneau',
    updated_at = NOW()
  WHERE id = ANY(v_suspended_ids);

  -- 6. Retourner
  RETURN QUERY SELECT v_count AS suspended_count, v_suspended_ids AS suspended_ids;
END;
$$;

-- Créer aussi la fonction de réactivation
CREATE OR REPLACE FUNCTION reactivate_suspended_appointments(
  p_appointment_id UUID
)
RETURNS TABLE(
  reactivated_count INT,
  reactivated_ids UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reactivated_ids UUID[];
  v_count INT;
BEGIN
  -- 1. Trouver tous les RDV annulés par ce rendez-vous
  SELECT ARRAY_AGG(id)
  INTO v_reactivated_ids
  FROM appointments
  WHERE status = 'cancelled'
    AND notes LIKE '%[AUTO_SUSPENDED:' || p_appointment_id || ']%';

  -- 2. Compter
  v_count := COALESCE(array_length(v_reactivated_ids, 1), 0);

  -- 3. Si aucun RDV à réactiver
  IF v_count = 0 THEN
    RETURN QUERY SELECT 0 AS reactivated_count, ARRAY[]::UUID[] AS reactivated_ids;
    RETURN;
  END IF;

  -- 4. Réactiver
  UPDATE appointments
  SET
    status = 'pending',
    notes = NULL,
    updated_at = NOW()
  WHERE id = ANY(v_reactivated_ids);

  -- 5. Retourner
  RETURN QUERY SELECT v_count AS reactivated_count, v_reactivated_ids AS reactivated_ids;
END;
$$;

-- Ajouter les commentaires
COMMENT ON FUNCTION suspend_conflicting_appointments IS 'Suspend automatiquement les rendez-vous concurrents quand un RDV est confirmé';
COMMENT ON FUNCTION reactivate_suspended_appointments IS 'Réactive les rendez-vous qui ont été suspendus automatiquement par un RDV donné';

-- Vérifier que les fonctions ont été créées
SELECT
  '✅ Fonction créée avec succès : ' || proname as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND proname IN ('suspend_conflicting_appointments', 'reactivate_suspended_appointments')
ORDER BY proname;
