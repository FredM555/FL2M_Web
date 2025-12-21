-- Migration pour ajouter les fonctions de suspension/réactivation des RDV concurrents
-- Date: 2025-12-20

-- ============================================================================
-- Fonction pour suspendre les RDV concurrents
-- ============================================================================

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
  -- Deux créneaux se chevauchent si : new_start < existing_end AND new_end > existing_start
  SELECT ARRAY_AGG(id)
  INTO v_suspended_ids
  FROM appointments
  WHERE practitioner_id = p_practitioner_id
    AND status != 'cancelled' -- Ignorer les RDV déjà annulés
    AND id != p_confirmed_appointment_id -- Exclure le RDV confirmé
    AND service_id != v_service_id -- Exclure les RDV du même module
    AND start_time < p_end_time -- existing_start < new_end
    AND end_time > p_start_time; -- existing_end > new_start

  -- 3. Compter le nombre de RDV à suspendre
  v_count := COALESCE(array_length(v_suspended_ids, 1), 0);

  -- 4. Si aucun RDV à suspendre, retourner
  IF v_count = 0 THEN
    RETURN QUERY SELECT 0 AS suspended_count, ARRAY[]::UUID[] AS suspended_ids;
    RETURN;
  END IF;

  -- 5. Suspendre tous ces rendez-vous
  UPDATE appointments
  SET
    status = 'cancelled',
    notes = '[AUTO_SUSPENDED:' || p_confirmed_appointment_id || '] Suspendu automatiquement car un autre rendez-vous a été confirmé sur ce créneau',
    updated_at = NOW()
  WHERE id = ANY(v_suspended_ids);

  -- 6. Retourner le résultat
  RETURN QUERY SELECT v_count AS suspended_count, v_suspended_ids AS suspended_ids;
END;
$$;

-- ============================================================================
-- Fonction pour réactiver les RDV suspendus automatiquement
-- ============================================================================

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

  -- 2. Compter le nombre de RDV à réactiver
  v_count := COALESCE(array_length(v_reactivated_ids, 1), 0);

  -- 3. Si aucun RDV à réactiver, retourner
  IF v_count = 0 THEN
    RETURN QUERY SELECT 0 AS reactivated_count, ARRAY[]::UUID[] AS reactivated_ids;
    RETURN;
  END IF;

  -- 4. Réactiver tous ces rendez-vous
  UPDATE appointments
  SET
    status = 'pending',
    notes = NULL, -- Effacer la note d'annulation automatique
    updated_at = NOW()
  WHERE id = ANY(v_reactivated_ids);

  -- 5. Retourner le résultat
  RETURN QUERY SELECT v_count AS reactivated_count, v_reactivated_ids AS reactivated_ids;
END;
$$;

-- ============================================================================
-- Commentaires
-- ============================================================================

COMMENT ON FUNCTION suspend_conflicting_appointments IS 'Suspend automatiquement les rendez-vous concurrents quand un RDV est confirmé';
COMMENT ON FUNCTION reactivate_suspended_appointments IS 'Réactive les rendez-vous qui ont été suspendus automatiquement par un RDV donné';

-- Fin du script
