-- Migration: Remplacer le forfait 'free' par 'decouverte'
-- Description: Mise à jour du type de contrat 'free' vers 'decouverte' avec abonnement 10€/mois

-- 1. Mettre à jour tous les contrats existants 'free' vers 'decouverte'
UPDATE practitioner_contracts
SET contract_type = 'decouverte'
WHERE contract_type = 'free';

-- 2. Mettre à jour toutes les transactions existantes
UPDATE transactions
SET commission_type = 'decouverte'
WHERE commission_type = 'free';

-- 3. Supprimer l'ancienne contrainte CHECK
ALTER TABLE practitioner_contracts DROP CONSTRAINT IF EXISTS practitioner_contracts_contract_type_check;

-- 4. Ajouter la nouvelle contrainte CHECK avec 'decouverte' au lieu de 'free'
ALTER TABLE practitioner_contracts
ADD CONSTRAINT practitioner_contracts_contract_type_check
CHECK (contract_type IN ('decouverte', 'starter', 'pro', 'premium'));

-- 5. Commenter la migration
COMMENT ON TABLE practitioner_contracts IS 'Contrats des intervenants - Forfait découverte à 10€/mois avec commission de 10€ fixe par RDV';
