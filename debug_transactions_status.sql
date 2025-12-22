-- =====================================================
-- Debug: Vérifier l'état des transactions
-- =====================================================

-- 1. Voir TOUTES les transactions avec leur statut
SELECT
  t.id,
  t.appointment_id,
  t.status as transaction_status,
  t.transfer_status,
  t.eligible_for_transfer_at,
  t.amount_practitioner,
  a.start_time,
  a.end_time,
  a.status as appointment_status,
  CASE
    WHEN t.eligible_for_transfer_at IS NULL THEN '❌ Pas de date d''éligibilité'
    WHEN t.eligible_for_transfer_at > NOW() THEN '⏳ Pas encore éligible'
    ELSE '✅ ÉLIGIBLE MAINTENANT'
  END as eligibility_check,
  EXTRACT(EPOCH FROM (NOW() - a.end_time))/3600 as hours_since_appointment_end
FROM transactions t
LEFT JOIN appointments a ON a.id = t.appointment_id
WHERE t.created_at >= '2025-12-01'  -- Transactions depuis décembre
ORDER BY t.created_at DESC;

-- 2. Compter par transfer_status
SELECT
  transfer_status,
  COUNT(*) as nb_transactions,
  SUM(amount_practitioner) as total_euros
FROM transactions
WHERE created_at >= '2025-12-01'
GROUP BY transfer_status
ORDER BY transfer_status;

-- 3. Transactions qui DEVRAIENT être traitées par process-payouts
-- (Conditions exactes du fichier process-payouts/index.ts ligne 45-48)
SELECT
  t.id,
  t.appointment_id,
  t.transfer_status,
  t.status,
  t.eligible_for_transfer_at,
  t.amount_practitioner,
  a.end_time
FROM transactions t
LEFT JOIN appointments a ON a.id = t.appointment_id
WHERE
  t.transfer_status = 'eligible'
  AND t.eligible_for_transfer_at <= NOW()
  AND t.status = 'succeeded';

-- 4. Transactions du 20 décembre spécifiquement
SELECT
  t.id as transaction_id,
  t.appointment_id,
  t.status as transaction_status,
  t.transfer_status,
  t.eligible_for_transfer_at,
  t.amount_practitioner,
  a.start_time,
  a.end_time,
  a.status as appointment_status
FROM transactions t
JOIN appointments a ON a.id = t.appointment_id
WHERE a.start_time >= '2025-12-20 00:00:00'
  AND a.start_time < '2025-12-21 00:00:00';
