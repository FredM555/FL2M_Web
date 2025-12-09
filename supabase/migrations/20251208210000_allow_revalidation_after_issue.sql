-- Migration: Permettre la revalidation après signalement d'un problème
-- Cette migration ajoute un trigger pour gérer les UPDATE en plus des INSERT

-- Modifier le trigger pour qu'il s'exécute aussi sur UPDATE
DROP TRIGGER IF EXISTS trigger_update_appointment_status_on_validation ON appointment_validations;

CREATE TRIGGER trigger_update_appointment_status_on_validation
  AFTER INSERT OR UPDATE ON appointment_validations
  FOR EACH ROW
  EXECUTE FUNCTION update_appointment_status_on_validation();

-- Commentaire
COMMENT ON TRIGGER trigger_update_appointment_status_on_validation ON appointment_validations IS
  'Met à jour automatiquement le status du rendez-vous lors de la création ou modification d''une validation';
