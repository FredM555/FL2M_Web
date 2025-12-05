-- =====================================================
-- Migration: Table de validation des rendez-vous
-- Description: Permet aux clients de valider qu'une séance s'est bien déroulée
--              pour déclencher la redistribution immédiate à l'intervenant
-- Date: 2025-12-05
-- =====================================================

-- =====================================================
-- TABLE: appointment_validations
-- Description: Validations client des rendez-vous
-- =====================================================
CREATE TABLE IF NOT EXISTS public.appointment_validations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relations
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,

  -- Validation
  validated BOOLEAN NOT NULL DEFAULT true,
  validation_comment TEXT,

  -- Dates
  validated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Contrainte: un seul enregistrement de validation par rendez-vous
  CONSTRAINT unique_appointment_validation UNIQUE (appointment_id)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_appointment_validations_appointment ON public.appointment_validations(appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_validations_client ON public.appointment_validations(client_id);
CREATE INDEX IF NOT EXISTS idx_appointment_validations_transaction ON public.appointment_validations(transaction_id);
CREATE INDEX IF NOT EXISTS idx_appointment_validations_validated_at ON public.appointment_validations(validated_at DESC);

-- Commentaires
COMMENT ON TABLE public.appointment_validations IS 'Validations client des rendez-vous pour déclencher la redistribution';
COMMENT ON COLUMN public.appointment_validations.validated IS 'true = séance OK, false = problème signalé';
COMMENT ON COLUMN public.appointment_validations.validation_comment IS 'Commentaire optionnel du client';

-- =====================================================
-- Mise à jour de la table transactions
-- Description: Ajouter des colonnes pour la redistribution
-- =====================================================

-- Ajouter la colonne pour la date de redistribution éligible (48h après le RDV)
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS eligible_for_transfer_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS transfer_status VARCHAR(20) DEFAULT 'pending'
  CHECK (transfer_status IN ('pending', 'eligible', 'processing', 'completed', 'failed'));

-- Commentaires
COMMENT ON COLUMN public.transactions.eligible_for_transfer_at IS 'Date à partir de laquelle le transfert peut être effectué (48h après le RDV ou validation immédiate)';
COMMENT ON COLUMN public.transactions.transferred_at IS 'Date effective du transfert à l''intervenant';
COMMENT ON COLUMN public.transactions.transfer_status IS 'Statut du transfert vers l''intervenant';

-- Index
CREATE INDEX IF NOT EXISTS idx_transactions_transfer_status ON public.transactions(transfer_status);
CREATE INDEX IF NOT EXISTS idx_transactions_eligible_for_transfer ON public.transactions(eligible_for_transfer_at)
WHERE transfer_status IN ('pending', 'eligible');

-- =====================================================
-- RLS Policies
-- =====================================================

-- Activer RLS
ALTER TABLE public.appointment_validations ENABLE ROW LEVEL SECURITY;

-- Les clients peuvent voir leurs propres validations
CREATE POLICY "Clients can view their own validations"
  ON public.appointment_validations
  FOR SELECT
  USING (auth.uid() = client_id);

-- Les clients peuvent créer des validations pour leurs propres rendez-vous
CREATE POLICY "Clients can create validations for their appointments"
  ON public.appointment_validations
  FOR INSERT
  WITH CHECK (
    auth.uid() = client_id
    AND EXISTS (
      SELECT 1 FROM public.appointments
      WHERE appointments.id = appointment_id
      AND appointments.client_id = client_id
    )
  );

-- Les admins voient tout
CREATE POLICY "Admins can view all validations"
  ON public.appointment_validations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- Les intervenants peuvent voir les validations de leurs rendez-vous
CREATE POLICY "Practitioners can view validations for their appointments"
  ON public.appointment_validations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.appointments a
      JOIN public.practitioners p ON p.id = a.practitioner_id
      WHERE a.id = appointment_id
      AND p.user_id = auth.uid()
    )
  );

-- =====================================================
-- Trigger pour updated_at
-- =====================================================
CREATE TRIGGER update_appointment_validations_updated_at
  BEFORE UPDATE ON public.appointment_validations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Fonction pour calculer la date d'éligibilité au transfert
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_transfer_eligibility_date(
  appointment_end_time TIMESTAMPTZ
) RETURNS TIMESTAMPTZ AS $$
BEGIN
  -- 48 heures après la fin du rendez-vous
  RETURN appointment_end_time + INTERVAL '48 hours';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_transfer_eligibility_date IS
'Calcule la date d''éligibilité au transfert (48h après la fin du RDV)';

-- =====================================================
-- IMPORTANT: Migration prête à être appliquée
-- =====================================================
