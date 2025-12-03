-- =====================================================
-- Migration: Tables de paiement et transactions
-- Description: Crée les tables pour gérer les paiements d'abonnement et les transactions de rendez-vous
-- Date: 2025-12-02
-- =====================================================

-- =====================================================
-- TABLE: transactions
-- Description: Transactions de paiement pour les rendez-vous
-- =====================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relations
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE RESTRICT,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,

  -- Identifiants Stripe
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  stripe_transfer_id TEXT,

  -- Montants (en euros)
  amount_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  amount_practitioner DECIMAL(10, 2) NOT NULL DEFAULT 0,
  amount_platform_commission DECIMAL(10, 2) NOT NULL DEFAULT 0,
  amount_stripe_fees DECIMAL(10, 2) DEFAULT 0,

  -- Détails de la commission
  commission_type VARCHAR(20) CHECK (commission_type IN ('free', 'starter', 'pro', 'premium')),
  is_free_appointment BOOLEAN DEFAULT false,
  appointment_number INTEGER,

  -- Statut
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'cancelled')),

  -- Dates
  payment_date TIMESTAMPTZ,
  transfer_date TIMESTAMPTZ,
  refund_date TIMESTAMPTZ,

  -- Métadonnées
  currency VARCHAR(3) DEFAULT 'EUR',
  description TEXT,
  failure_reason TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_transactions_appointment ON public.transactions(appointment_id);
CREATE INDEX IF NOT EXISTS idx_transactions_practitioner ON public.transactions(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_transactions_client ON public.transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_date ON public.transactions(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_stripe_payment ON public.transactions(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;

-- Commentaires
COMMENT ON TABLE public.transactions IS 'Transactions de paiement pour les rendez-vous';
COMMENT ON COLUMN public.transactions.amount_total IS 'Montant total payé par le client';
COMMENT ON COLUMN public.transactions.amount_practitioner IS 'Montant reversé au praticien';
COMMENT ON COLUMN public.transactions.amount_platform_commission IS 'Commission prélevée par la plateforme';

-- =====================================================
-- TABLE: subscription_payments
-- Description: Paiements d'abonnement mensuel des praticiens
-- =====================================================
CREATE TABLE IF NOT EXISTS public.subscription_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relations
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE RESTRICT,
  contract_id UUID REFERENCES public.practitioner_contracts(id) ON DELETE SET NULL,

  -- Identifiants Stripe
  stripe_payment_intent_id TEXT,
  stripe_subscription_id TEXT,
  stripe_invoice_id TEXT,

  -- Montant
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',

  -- Période couverte
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,

  -- Statut
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'cancelled')),

  -- Dates
  payment_date TIMESTAMPTZ,
  refund_date TIMESTAMPTZ,

  -- Métadonnées
  description TEXT,
  failure_reason TEXT,
  invoice_url TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_subscription_payments_practitioner ON public.subscription_payments(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_contract ON public.subscription_payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON public.subscription_payments(status);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_period ON public.subscription_payments(period_start_date DESC);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_payment_date ON public.subscription_payments(payment_date DESC);

-- Commentaires
COMMENT ON TABLE public.subscription_payments IS 'Paiements d''abonnement mensuel des praticiens';
COMMENT ON COLUMN public.subscription_payments.period_start_date IS 'Date de début de la période couverte';
COMMENT ON COLUMN public.subscription_payments.period_end_date IS 'Date de fin de la période couverte';

-- =====================================================
-- TABLE: payouts
-- Description: Virements aux praticiens (regroupement de transactions)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relations
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE RESTRICT,

  -- Identifiants Stripe
  stripe_payout_id TEXT,
  stripe_account_id TEXT,

  -- Période couverte
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,

  -- Montants (en euros)
  amount_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  amount_transactions DECIMAL(10, 2) NOT NULL DEFAULT 0,
  amount_adjustments DECIMAL(10, 2) DEFAULT 0,
  transaction_count INTEGER DEFAULT 0,

  -- Statut
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled')),

  -- Dates
  scheduled_date DATE,
  paid_date TIMESTAMPTZ,
  failed_date TIMESTAMPTZ,

  -- Métadonnées
  currency VARCHAR(3) DEFAULT 'EUR',
  description TEXT,
  failure_reason TEXT,
  admin_notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_payouts_practitioner ON public.payouts(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON public.payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_period ON public.payouts(period_start_date DESC);
CREATE INDEX IF NOT EXISTS idx_payouts_scheduled ON public.payouts(scheduled_date) WHERE scheduled_date IS NOT NULL;

-- Commentaires
COMMENT ON TABLE public.payouts IS 'Virements aux praticiens (regroupement de transactions)';
COMMENT ON COLUMN public.payouts.amount_transactions IS 'Montant total des transactions incluses';
COMMENT ON COLUMN public.payouts.amount_adjustments IS 'Ajustements manuels (positifs ou négatifs)';

-- =====================================================
-- RLS Policies
-- =====================================================

-- Activer RLS sur toutes les tables
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- Transactions: Les praticiens voient leurs propres transactions
CREATE POLICY "Practitioners can view their own transactions"
  ON public.transactions
  FOR SELECT
  USING (
    practitioner_id IN (
      SELECT id FROM public.practitioners WHERE user_id = auth.uid()
    )
  );

-- Transactions: Les clients voient leurs propres paiements
CREATE POLICY "Clients can view their own payments"
  ON public.transactions
  FOR SELECT
  USING (auth.uid() = client_id);

-- Transactions: Les admins voient tout
CREATE POLICY "Admins can view all transactions"
  ON public.transactions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- Subscription Payments: Les praticiens voient leurs propres paiements
CREATE POLICY "Practitioners can view their own subscription payments"
  ON public.subscription_payments
  FOR SELECT
  USING (
    practitioner_id IN (
      SELECT id FROM public.practitioners WHERE user_id = auth.uid()
    )
  );

-- Subscription Payments: Les admins voient tout
CREATE POLICY "Admins can view all subscription payments"
  ON public.subscription_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- Payouts: Les praticiens voient leurs propres virements
CREATE POLICY "Practitioners can view their own payouts"
  ON public.payouts
  FOR SELECT
  USING (
    practitioner_id IN (
      SELECT id FROM public.practitioners WHERE user_id = auth.uid()
    )
  );

-- Payouts: Les admins voient et gèrent tout
CREATE POLICY "Admins can manage all payouts"
  ON public.payouts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- =====================================================
-- Trigger pour updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_payments_updated_at
  BEFORE UPDATE ON public.subscription_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payouts_updated_at
  BEFORE UPDATE ON public.payouts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- IMPORTANT: Migration prête à être appliquée
-- =====================================================
