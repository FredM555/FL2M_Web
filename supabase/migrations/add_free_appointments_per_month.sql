-- =====================================================
-- Migration: Ajout du champ free_appointments_per_month
-- Description: Ajoute le champ pour gérer les RDV gratuits par mois selon le business plan
-- Date: 2025-12-10
-- =====================================================

-- Ajouter le champ free_appointments_per_month
ALTER TABLE public.practitioner_contracts
ADD COLUMN IF NOT EXISTS free_appointments_per_month INT DEFAULT 0;

-- Mettre à jour les contrats existants selon le business plan
-- Découverte: 0 RDV gratuits
UPDATE public.practitioner_contracts
SET free_appointments_per_month = 0
WHERE contract_type = 'decouverte';

-- Starter: 2 RDV gratuits/mois
UPDATE public.practitioner_contracts
SET free_appointments_per_month = 2
WHERE contract_type = 'starter';

-- Pro: 4 RDV gratuits/mois
UPDATE public.practitioner_contracts
SET free_appointments_per_month = 4
WHERE contract_type = 'pro';

-- Premium: 0 (car tous les RDV sont déjà sans commission)
UPDATE public.practitioner_contracts
SET free_appointments_per_month = 0
WHERE contract_type = 'premium';

-- Commentaire pour la documentation
COMMENT ON COLUMN public.practitioner_contracts.free_appointments_per_month IS 'Nombre de RDV gratuits (sans commission) par mois selon le forfait';
