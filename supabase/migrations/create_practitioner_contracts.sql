-- =====================================================
-- Migration: Création de la table practitioner_contracts
-- Description: Table pour gérer les contrats des praticiens (Modèle D)
-- Date: 2025-01-25
-- Sprint: 1 - Infrastructure BDD
-- =====================================================

-- Création de la table practitioner_contracts
CREATE TABLE IF NOT EXISTS public.practitioner_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  contract_type VARCHAR(20) NOT NULL CHECK (contract_type IN ('free', 'starter', 'pro', 'premium')),

  -- Configuration du contrat
  monthly_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  commission_fixed DECIMAL(10,2),
  commission_percentage DECIMAL(5,2),
  commission_cap DECIMAL(10,2),
  max_appointments_per_month INT,

  -- Dates et statut
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'terminated')),

  -- Compteurs
  appointments_this_month INT NOT NULL DEFAULT 0,
  total_appointments INT NOT NULL DEFAULT 0,

  -- Document et notes
  contract_document_url TEXT,
  admin_notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),

  -- Contraintes
  UNIQUE(practitioner_id, start_date),
  CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_contracts_practitioner ON public.practitioner_contracts(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.practitioner_contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_type ON public.practitioner_contracts(contract_type);
CREATE INDEX IF NOT EXISTS idx_contracts_dates ON public.practitioner_contracts(start_date, end_date);

-- Fonction de mise à jour automatique du timestamp
CREATE OR REPLACE FUNCTION update_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at automatiquement
DROP TRIGGER IF EXISTS trigger_update_contracts_timestamp ON public.practitioner_contracts;
CREATE TRIGGER trigger_update_contracts_timestamp
  BEFORE UPDATE ON public.practitioner_contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_contracts_updated_at();

-- Commentaires pour la documentation
COMMENT ON TABLE public.practitioner_contracts IS 'Table des contrats des praticiens - Modèle D avec 4 paliers';
COMMENT ON COLUMN public.practitioner_contracts.contract_type IS 'Type de contrat: free (0€/mois), starter (60€/mois), pro (100€/mois), premium (180€/mois)';
COMMENT ON COLUMN public.practitioner_contracts.monthly_fee IS 'Frais mensuels en euros';
COMMENT ON COLUMN public.practitioner_contracts.commission_fixed IS 'Commission fixe par RDV en euros';
COMMENT ON COLUMN public.practitioner_contracts.commission_percentage IS 'Commission en pourcentage du prix du RDV';
COMMENT ON COLUMN public.practitioner_contracts.commission_cap IS 'Plafond maximum de commission par RDV';
COMMENT ON COLUMN public.practitioner_contracts.max_appointments_per_month IS 'Nombre maximum de RDV par mois (NULL = illimité)';
COMMENT ON COLUMN public.practitioner_contracts.appointments_this_month IS 'Compteur de RDV pour le mois en cours';
COMMENT ON COLUMN public.practitioner_contracts.total_appointments IS 'Compteur total de RDV depuis la création du contrat';

-- =====================================================
-- IMPORTANT: Les données de test seront insérées manuellement
-- après vérification des UUIDs existants des praticiens
-- =====================================================
