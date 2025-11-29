-- =====================================================
-- Migration: Création de la table transactions
-- Description: Table pour gérer les transactions de paiement
-- Date: 2025-01-25
-- Sprint: 1 - Infrastructure BDD
-- =====================================================

-- Création de la table transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relations
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id),
  client_id UUID NOT NULL REFERENCES auth.users(id),

  -- Identifiants Stripe
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  stripe_charge_id VARCHAR(255),
  stripe_transfer_id VARCHAR(255),

  -- Montants (en euros, 2 décimales)
  amount_total DECIMAL(10,2) NOT NULL, -- Prix total payé par le client
  amount_practitioner DECIMAL(10,2) NOT NULL, -- Part nette de l'intervenant
  amount_platform_commission DECIMAL(10,2) NOT NULL, -- Commission plateforme
  amount_stripe_fees DECIMAL(10,2) NOT NULL DEFAULT 0, -- Frais Stripe

  -- Détails de la commission
  commission_type VARCHAR(20), -- 'free', 'starter', 'pro', 'premium'
  is_free_appointment BOOLEAN DEFAULT FALSE, -- Si c'est un des 3 RDV gratuits
  appointment_number INT, -- Numéro du RDV pour l'intervenant (1, 2, 3, 4+)

  -- Statut
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'cancelled')),

  -- Dates
  payment_date TIMESTAMPTZ,
  transfer_date TIMESTAMPTZ,
  refund_date TIMESTAMPTZ,

  -- Métadonnées
  currency VARCHAR(3) DEFAULT 'EUR',
  description TEXT,
  failure_reason TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Contraintes
  CHECK (amount_total >= 0),
  CHECK (amount_practitioner >= 0),
  CHECK (amount_platform_commission >= 0)
);

-- Index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_transactions_appointment ON public.transactions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_transactions_practitioner ON public.transactions(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_transactions_client ON public.transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_date ON public.transactions(payment_date);
CREATE INDEX IF NOT EXISTS idx_transactions_stripe_pi ON public.transactions(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at);

-- Trigger de mise à jour automatique du timestamp
DROP TRIGGER IF EXISTS trigger_update_transactions_timestamp ON public.transactions;
CREATE TRIGGER trigger_update_transactions_timestamp
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_contracts_updated_at();

-- Commentaires pour la documentation
COMMENT ON TABLE public.transactions IS 'Table des transactions de paiement avec intégration Stripe';
COMMENT ON COLUMN public.transactions.amount_total IS 'Montant total payé par le client en euros';
COMMENT ON COLUMN public.transactions.amount_practitioner IS 'Part nette reversée au praticien en euros';
COMMENT ON COLUMN public.transactions.amount_platform_commission IS 'Commission de la plateforme en euros';
COMMENT ON COLUMN public.transactions.amount_stripe_fees IS 'Frais Stripe prélevés en euros';
COMMENT ON COLUMN public.transactions.is_free_appointment IS 'TRUE si c''est l''un des 3 premiers RDV gratuits';
COMMENT ON COLUMN public.transactions.appointment_number IS 'Numéro séquentiel du RDV pour ce praticien';
COMMENT ON COLUMN public.transactions.status IS 'Statut de la transaction: pending, processing, succeeded, failed, refunded, cancelled';
