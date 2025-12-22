-- Vérification rapide : status a-t-il bien été mis à jour ?

SELECT
  'Avant correction (devrait être 0)' as etape,
  COUNT(*) as nb_transactions
FROM transactions
WHERE transfer_status = 'eligible'
  AND status = 'pending';

SELECT
  'Après correction (devrait être 2)' as etape,
  COUNT(*) as nb_transactions
FROM transactions
WHERE transfer_status = 'eligible'
  AND status = 'succeeded';

-- Détail des 2 transactions
SELECT
  id,
  appointment_id,
  practitioner_id,
  status,
  transfer_status,
  eligible_for_transfer_at,
  amount_practitioner,
  created_at,
  updated_at
FROM transactions
WHERE transfer_status = 'eligible'
  AND eligible_for_transfer_at <= NOW()
ORDER BY eligible_for_transfer_at;
