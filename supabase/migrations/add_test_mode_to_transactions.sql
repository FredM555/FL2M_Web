-- =====================================================
-- Migration: Ajout du champ is_test_mode à transactions
-- Description: Permet d'identifier les transactions de test vs production
-- Date: 2025-12-06
-- =====================================================

-- Ajouter le champ is_test_mode
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS is_test_mode BOOLEAN DEFAULT FALSE NOT NULL;

-- Ajouter un commentaire pour la documentation
COMMENT ON COLUMN public.transactions.is_test_mode IS 'Indique si la transaction a été effectuée en mode test Stripe (TRUE) ou en production (FALSE)';

-- Créer un index pour faciliter les requêtes de filtrage
CREATE INDEX IF NOT EXISTS idx_transactions_test_mode ON public.transactions(is_test_mode);

-- Commentaire pour la colonne amount_stripe_fees (si pas déjà présent)
COMMENT ON COLUMN public.transactions.amount_stripe_fees IS 'Frais Stripe prélevés (1.4% + 0.25€ pour cartes EU). Ces frais sont à la charge de l''intervenant.';

-- Commentaire pour amount_practitioner
COMMENT ON COLUMN public.transactions.amount_practitioner IS 'Montant net que l''intervenant recevra (montant total - commission - frais Stripe)';
