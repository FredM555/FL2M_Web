-- Migration: Correction des transactions en attente
-- Description: Marque toutes les transactions 'pending' comme 'eligible'
--              pour qu'elles puissent être traitées par process-payouts
-- Date: 2025-12-22

-- Mettre à jour toutes les transactions en 'pending' vers 'eligible'
-- Ces transactions ont déjà leur date d'éligibilité calculée (48h après le RDV)
-- et seront transférées par process-payouts quand cette date sera atteinte
UPDATE transactions
SET
  transfer_status = 'eligible',
  updated_at = NOW()
WHERE
  transfer_status = 'pending'
  AND status = 'succeeded'
  AND eligible_for_transfer_at IS NOT NULL;

-- Afficher le nombre de transactions mises à jour
DO $$
DECLARE
  updated_count integer;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM transactions
  WHERE transfer_status = 'eligible'
    AND status = 'succeeded'
    AND eligible_for_transfer_at IS NOT NULL;

  RAISE NOTICE 'Migration terminée : % transaction(s) marquée(s) comme eligible', updated_count;
END $$;
