-- Fonction pour permettre aux intervenants de supprimer leurs propres rendez-vous
-- Contourne les politiques RLS pour la suppression

CREATE OR REPLACE FUNCTION delete_appointment_by_practitioner(
  appointment_id UUID,
  practitioner_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Supprimer le rendez-vous uniquement s'il appartient à l'intervenant
  DELETE FROM appointments
  WHERE id = appointment_id
    AND appointments.practitioner_id = delete_appointment_by_practitioner.practitioner_id;

  -- Récupérer le nombre de lignes supprimées
  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- Retourner true si au moins une ligne a été supprimée
  RETURN deleted_count > 0;
END;
$$;

-- Accorder l'exécution de la fonction aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION delete_appointment_by_practitioner TO authenticated;

-- Commentaire pour documenter la fonction
COMMENT ON FUNCTION delete_appointment_by_practitioner IS
'Permet à un intervenant de supprimer ses propres rendez-vous en contournant les politiques RLS';
