-- =====================================================
-- Migration: Colonnes Stripe Connect
-- Description: Ajoute les colonnes nécessaires pour gérer les comptes Stripe Connect des intervenants
-- Date: 2025-12-05
-- =====================================================

-- =====================================================
-- Ajouter les colonnes Stripe Connect à la table practitioners
-- =====================================================

ALTER TABLE public.practitioners
ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_account_status VARCHAR(20) DEFAULT 'not_created'
  CHECK (stripe_account_status IN ('not_created', 'incomplete', 'pending', 'complete')),
ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_onboarding_completed_at TIMESTAMPTZ;

-- Commentaires
COMMENT ON COLUMN public.practitioners.stripe_account_id IS 'ID du compte Stripe Connect de l''intervenant';
COMMENT ON COLUMN public.practitioners.stripe_account_status IS 'Statut du compte Stripe Connect (not_created, incomplete, pending, complete)';
COMMENT ON COLUMN public.practitioners.stripe_charges_enabled IS 'Indique si le compte peut recevoir des paiements';
COMMENT ON COLUMN public.practitioners.stripe_payouts_enabled IS 'Indique si le compte peut effectuer des retraits';
COMMENT ON COLUMN public.practitioners.stripe_onboarding_completed_at IS 'Date de complétion de l''onboarding Stripe Connect';

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_practitioners_stripe_account
ON public.practitioners(stripe_account_id)
WHERE stripe_account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_practitioners_stripe_status
ON public.practitioners(stripe_account_status);

-- =====================================================
-- IMPORTANT: Migration prête à être appliquée
-- =====================================================
