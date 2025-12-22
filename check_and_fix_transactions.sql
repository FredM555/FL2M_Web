-- Vérifier les transactions avec rendez-vous terminés depuis plus de 48h
SELECT
  t.id,
  t.appointment_id,
  t.status,
  t.transfer_status,
  t.eligible_for_transfer_at,
  t.amount_practitioner,
  a.start_time,
  a.end_time,
  a.status as appointment_status,
  EXTRACT(EPOCH FROM (NOW() - a.end_time))/3600 as hours_since_end
FROM transactions t
JOIN appointments a ON a.id = t.appointment_id
WHERE
  t.transfer_status = 'pending'
  AND a.end_time < NOW() - INTERVAL '48 hours'
ORDER BY a.end_time DESC;

-- Corriger toutes les transactions en 'pending' vers 'eligible'
UPDATE transactions
SET
  transfer_status = 'eligible',
  updated_at = NOW()
WHERE
  transfer_status = 'pending'
  AND status = 'succeeded'
  AND eligible_for_transfer_at IS NOT NULL
RETURNING id, appointment_id, eligible_for_transfer_at, transfer_status;
