-- =====================================================
-- Correction immédiate pour le rendez-vous du 20 décembre
-- =====================================================

-- 1. Vérifier la transaction du rendez-vous du 20 décembre
SELECT
  t.id as transaction_id,
  t.appointment_id,
  t.status as transaction_status,
  t.transfer_status,
  t.eligible_for_transfer_at,
  t.amount_practitioner,
  a.start_time,
  a.end_time,
  a.status as appointment_status,
  EXTRACT(EPOCH FROM (NOW() - a.end_time))/3600 as hours_since_end,
  EXTRACT(EPOCH FROM (NOW() - t.eligible_for_transfer_at))/3600 as hours_overdue
FROM transactions t
JOIN appointments a ON a.id = t.appointment_id
WHERE a.start_time >= '2025-12-20 00:00:00'
  AND a.start_time < '2025-12-21 00:00:00'
  AND a.start_time::time >= '09:00:00'
ORDER BY a.start_time;

-- 2. Marquer toutes les transactions du 20 décembre comme eligible
UPDATE transactions t
SET
  transfer_status = 'eligible',
  updated_at = NOW()
FROM appointments a
WHERE
  t.appointment_id = a.id
  AND t.transfer_status = 'pending'
  AND t.status = 'succeeded'
  AND a.start_time >= '2025-12-20 00:00:00'
  AND a.start_time < '2025-12-21 00:00:00'
RETURNING
  t.id as transaction_id,
  t.appointment_id,
  t.transfer_status,
  t.eligible_for_transfer_at,
  t.amount_practitioner;

-- 3. Vérifier le résultat
SELECT
  t.id as transaction_id,
  t.appointment_id,
  t.transfer_status,
  t.eligible_for_transfer_at,
  t.amount_practitioner,
  CASE
    WHEN t.eligible_for_transfer_at <= NOW() THEN '✓ PRÊT POUR TRANSFERT'
    ELSE '⏳ PAS ENCORE ÉLIGIBLE'
  END as status,
  a.start_time,
  a.end_time
FROM transactions t
JOIN appointments a ON a.id = t.appointment_id
WHERE a.start_time >= '2025-12-20 00:00:00'
  AND a.start_time < '2025-12-21 00:00:00'
ORDER BY a.start_time;

-- 4. Vérifier toutes les transactions éligibles pour transfert immédiat
SELECT
  COUNT(*) as nb_transactions,
  SUM(amount_practitioner) as total_a_transferer
FROM transactions
WHERE
  transfer_status = 'eligible'
  AND status = 'succeeded'
  AND eligible_for_transfer_at <= NOW();

-- =====================================================
-- Après avoir exécuté ce script, lancez process-payouts
-- manuellement pour déclencher le transfert:
--
-- Option 1: Via le script batch
--   > trigger_payouts_manually.bat
--
-- Option 2: Via curl
--   curl -X POST https://phokxjbocljahmbdkrbs.supabase.co/functions/v1/process-payouts \
--     -H "Authorization: Bearer VOTRE_SERVICE_ROLE_KEY" \
--     -H "Content-Type: application/json"
--
-- Option 3: Via le Dashboard Supabase
--   Functions > process-payouts > Invoke function
-- =====================================================
