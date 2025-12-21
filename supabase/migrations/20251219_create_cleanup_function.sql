-- Fonction pour permettre aux intervenants de nettoyer leurs rendez-vous passés disponibles
-- Supprime tous les rendez-vous passés avec status = 'pending' et client_id = null

CREATE OR REPLACE FUNCTION cleanup_past_pending_appointments(
  practitioner_id UUID
)
RETURNS TABLE (
  deleted_count INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
  appointment_ids UUID[];
  count_deleted INTEGER;
BEGIN
  -- Récupérer l'ID de l'utilisateur actuel
  current_user_id := auth.uid();

  -- Vérifier que l'utilisateur actuel est bien le propriétaire du practitioner_id
  IF NOT EXISTS (
    SELECT 1 FROM practitioners
    WHERE id = practitioner_id
    AND user_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'Vous n''êtes pas autorisé à nettoyer ces rendez-vous';
  END IF;

  -- Récupérer les IDs des rendez-vous à supprimer
  SELECT array_agg(a.id) INTO appointment_ids
  FROM appointments a
  WHERE a.practitioner_id = cleanup_past_pending_appointments.practitioner_id
    AND a.status = 'pending'
    AND a.client_id IS NULL
    AND a.start_time < NOW();

  -- Si aucun rendez-vous à supprimer
  IF appointment_ids IS NULL OR array_length(appointment_ids, 1) = 0 THEN
    RETURN QUERY SELECT 0::INTEGER;
    RETURN;
  END IF;

  -- Supprimer les rendez-vous
  DELETE FROM appointments
  WHERE id = ANY(appointment_ids);

  -- Récupérer le nombre de lignes supprimées
  GET DIAGNOSTICS count_deleted = ROW_COUNT;

  -- Retourner le nombre de rendez-vous supprimés
  RETURN QUERY SELECT count_deleted;
END;
$$;

-- Accorder l'exécution de la fonction aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION cleanup_past_pending_appointments TO authenticated;

-- Commentaire pour documenter la fonction
COMMENT ON FUNCTION cleanup_past_pending_appointments IS
'Permet à un intervenant de supprimer tous ses rendez-vous passés disponibles (status = pending, client_id = null). Vérifie que l''utilisateur actuel est le propriétaire du practitioner_id.';
