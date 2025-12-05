-- Migration: Gestion de l'expiration des rendez-vous non payés
-- Description: Annuler automatiquement les rendez-vous qui nécessitent un paiement mais qui n'ont pas été payés dans l'heure

-- Ajouter une colonne pour suivre si un paiement est attendu et quand
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS payment_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS payment_deadline TIMESTAMPTZ;

-- Fonction pour annuler les rendez-vous non payés après 1 heure
CREATE OR REPLACE FUNCTION cancel_expired_unpaid_appointments()
RETURNS TABLE (
  cancelled_appointment_id UUID,
  cancelled_at TIMESTAMPTZ
) AS $$
DECLARE
  expired_record RECORD;
BEGIN
  -- Trouver tous les rendez-vous qui :
  -- 1. Nécessitent un paiement (payment_required = true)
  -- 2. Ont dépassé la deadline de paiement
  -- 3. N'ont pas de transaction payée associée
  -- 4. Sont dans un statut "pending" ou "confirmed"
  FOR expired_record IN
    SELECT a.id
    FROM appointments a
    LEFT JOIN transactions t ON t.appointment_id = a.id AND t.status = 'paid'
    WHERE a.payment_required = true
      AND a.payment_deadline < NOW()
      AND t.id IS NULL
      AND a.status IN ('pending', 'confirmed')
  LOOP
    -- Mettre à jour le statut du rendez-vous
    UPDATE appointments
    SET
      status = 'cancelled',
      updated_at = NOW(),
      notes = COALESCE(notes || E'\n\n', '') || 'Annulé automatiquement : paiement non reçu dans les délais (1 heure).'
    WHERE id = expired_record.id;

    -- Supprimer les liaisons avec les bénéficiaires
    DELETE FROM appointment_beneficiaries
    WHERE appointment_id = expired_record.id;

    -- Retourner l'ID du rendez-vous annulé
    RETURN QUERY SELECT expired_record.id, NOW();
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction appelée automatiquement lors de la création d'un rendez-vous payant
CREATE OR REPLACE FUNCTION set_payment_deadline()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le rendez-vous nécessite un paiement, définir la deadline à 1 heure après la création
  IF NEW.payment_required = true AND NEW.payment_deadline IS NULL THEN
    NEW.payment_deadline := NEW.created_at + INTERVAL '1 hour';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger pour définir automatiquement la deadline
DROP TRIGGER IF EXISTS trigger_set_payment_deadline ON appointments;
CREATE TRIGGER trigger_set_payment_deadline
  BEFORE INSERT OR UPDATE OF payment_required ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION set_payment_deadline();

-- Commentaires
COMMENT ON COLUMN appointments.payment_required IS 'Indique si un paiement est nécessaire pour ce rendez-vous';
COMMENT ON COLUMN appointments.payment_deadline IS 'Date limite pour effectuer le paiement (1h après création si paiement requis)';
COMMENT ON FUNCTION cancel_expired_unpaid_appointments() IS 'Annule les rendez-vous dont le paiement n''a pas été reçu dans les délais (1 heure)';
COMMENT ON FUNCTION set_payment_deadline() IS 'Définit automatiquement la deadline de paiement à 1 heure après la création du rendez-vous';

-- Permissions
GRANT EXECUTE ON FUNCTION cancel_expired_unpaid_appointments() TO service_role;
GRANT EXECUTE ON FUNCTION cancel_expired_unpaid_appointments() TO authenticated;
