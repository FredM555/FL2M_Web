-- =====================================================
-- Migration: Ajout des champs pour les abonnements Stripe
-- Description: Ajoute stripe_subscription_id et le statut pending_activation
-- Date: 2025-12-10
-- =====================================================

-- Ajouter le champ stripe_subscription_id
ALTER TABLE public.practitioner_contracts
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);

-- Mettre à jour la contrainte de statut pour ajouter pending_activation
ALTER TABLE public.practitioner_contracts
DROP CONSTRAINT IF EXISTS practitioner_contracts_status_check;

ALTER TABLE public.practitioner_contracts
ADD CONSTRAINT practitioner_contracts_status_check
CHECK (status IN ('pending_payment', 'pending_activation', 'active', 'suspended', 'terminated'));

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_contracts_stripe_subscription ON public.practitioner_contracts(stripe_subscription_id);

-- Commentaires
COMMENT ON COLUMN public.practitioner_contracts.stripe_subscription_id IS 'ID de l''abonnement Stripe associé à ce contrat';
