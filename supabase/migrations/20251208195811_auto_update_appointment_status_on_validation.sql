-- Migration: Mise à jour automatique du status du rendez-vous lors de la validation
-- Cette migration crée un trigger qui met à jour automatiquement le status du rendez-vous
-- quand une validation est créée dans la table appointment_validations

-- Fonction trigger pour mettre à jour le status du rendez-vous
CREATE OR REPLACE FUNCTION update_appointment_status_on_validation()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la validation est positive, mettre le status à 'validated'
  IF NEW.validated = true THEN
    UPDATE appointments
    SET
      status = 'validated',
      updated_at = NOW()
    WHERE id = NEW.appointment_id;

    RAISE NOTICE 'Rendez-vous % validé positivement', NEW.appointment_id;
  ELSE
    -- Si la validation est négative, mettre le status à 'issue_reported'
    UPDATE appointments
    SET
      status = 'issue_reported',
      updated_at = NOW()
    WHERE id = NEW.appointment_id;

    RAISE NOTICE 'Problème signalé pour le rendez-vous %', NEW.appointment_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger qui s'exécute après l'insertion d'une validation
DROP TRIGGER IF EXISTS trigger_update_appointment_status_on_validation ON appointment_validations;

CREATE TRIGGER trigger_update_appointment_status_on_validation
  AFTER INSERT ON appointment_validations
  FOR EACH ROW
  EXECUTE FUNCTION update_appointment_status_on_validation();

-- Commentaire pour documentation
COMMENT ON FUNCTION update_appointment_status_on_validation() IS
  'Met à jour automatiquement le status du rendez-vous (validated ou issue_reported) lors de la création d''une validation';
