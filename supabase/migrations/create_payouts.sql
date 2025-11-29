-- =====================================================
-- Migration: Création de la table payouts
-- Description: Table pour gérer les virements aux praticiens
-- Date: 2025-01-25
-- Sprint: 1 - Infrastructure BDD
-- =====================================================

-- Création de la table payouts (virements aux praticiens)
CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relations
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id),

  -- Identifiants Stripe
  stripe_payout_id VARCHAR(255) UNIQUE,
  stripe_account_id VARCHAR(255), -- Compte Stripe Connect du praticien

  -- Période couverte par le virement
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,

  -- Montants (en euros, 2 décimales)
  amount_total DECIMAL(10,2) NOT NULL, -- Montant total du virement
  amount_transactions DECIMAL(10,2) NOT NULL, -- Somme des transactions de la période
  amount_adjustments DECIMAL(10,2) DEFAULT 0, -- Ajustements manuels (positifs ou négatifs)
  transaction_count INT NOT NULL DEFAULT 0, -- Nombre de transactions incluses

  -- Statut
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled')),

  -- Dates
  scheduled_date DATE, -- Date prévue du virement (J+7)
  paid_date TIMESTAMPTZ, -- Date effective du virement
  failed_date TIMESTAMPTZ,

  -- Métadonnées
  currency VARCHAR(3) DEFAULT 'EUR',
  description TEXT,
  failure_reason TEXT,
  admin_notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),

  -- Contraintes
  CHECK (amount_total >= 0),
  CHECK (period_end_date >= period_start_date),
  CHECK (transaction_count >= 0)
);

-- Table de liaison entre payouts et transactions
CREATE TABLE IF NOT EXISTS public.payout_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payout_id UUID NOT NULL REFERENCES public.payouts(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Contraintes
  UNIQUE(payout_id, transaction_id)
);

-- Index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_payouts_practitioner ON public.payouts(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON public.payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_scheduled_date ON public.payouts(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_payouts_paid_date ON public.payouts(paid_date);
CREATE INDEX IF NOT EXISTS idx_payouts_period ON public.payouts(period_start_date, period_end_date);
CREATE INDEX IF NOT EXISTS idx_payouts_stripe_id ON public.payouts(stripe_payout_id);

CREATE INDEX IF NOT EXISTS idx_payout_transactions_payout ON public.payout_transactions(payout_id);
CREATE INDEX IF NOT EXISTS idx_payout_transactions_transaction ON public.payout_transactions(transaction_id);

-- Fonction de mise à jour automatique du timestamp
CREATE OR REPLACE FUNCTION update_payouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at automatiquement
DROP TRIGGER IF EXISTS trigger_update_payouts_timestamp ON public.payouts;
CREATE TRIGGER trigger_update_payouts_timestamp
  BEFORE UPDATE ON public.payouts
  FOR EACH ROW
  EXECUTE FUNCTION update_payouts_updated_at();

-- Commentaires pour la documentation
COMMENT ON TABLE public.payouts IS 'Table des virements effectués aux praticiens';
COMMENT ON COLUMN public.payouts.practitioner_id IS 'Praticien bénéficiaire du virement';
COMMENT ON COLUMN public.payouts.stripe_payout_id IS 'Identifiant du virement Stripe';
COMMENT ON COLUMN public.payouts.period_start_date IS 'Date de début de la période couverte';
COMMENT ON COLUMN public.payouts.period_end_date IS 'Date de fin de la période couverte';
COMMENT ON COLUMN public.payouts.amount_total IS 'Montant total du virement en euros';
COMMENT ON COLUMN public.payouts.transaction_count IS 'Nombre de transactions incluses dans ce virement';
COMMENT ON COLUMN public.payouts.scheduled_date IS 'Date prévue du virement (généralement J+7)';
COMMENT ON COLUMN public.payouts.paid_date IS 'Date effective du versement sur le compte du praticien';
COMMENT ON COLUMN public.payouts.status IS 'Statut: pending, processing, paid, failed, cancelled';

COMMENT ON TABLE public.payout_transactions IS 'Table de liaison entre virements et transactions';
