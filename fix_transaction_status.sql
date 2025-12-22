-- =====================================================
-- Correction : Marquer les transactions payées comme 'succeeded'
-- =====================================================

-- 1. DIAGNOSTIC : Voir les transactions avec transfer_status='eligible' mais status='pending'
SELECT
  t.id,
  t.appointment_id,
  t.status as transaction_status,
  t.transfer_status,
  t.stripe_payment_intent_id,
  t.amount_practitioner,
  a.payment_status as appointment_payment_status
FROM transactions t
JOIN appointments a ON a.id = t.appointment_id
WHERE t.transfer_status = 'eligible'
  AND t.status = 'pending';

-- 2. CORRECTION : Si l'appointment est payé (payment_status='paid'),
--    alors la transaction doit être 'succeeded'
UPDATE transactions t
SET
  status = 'succeeded',
  updated_at = NOW()
FROM appointments a
WHERE
  t.appointment_id = a.id
  AND t.status = 'pending'
  AND t.transfer_status = 'eligible'
  AND a.payment_status = 'paid'
RETURNING
  t.id,
  t.appointment_id,
  'pending → succeeded' as changement,
  t.amount_practitioner;

-- 3. VÉRIFICATION : Transactions maintenant prêtes pour transfert
SELECT
  COUNT(*) as nb_transactions_pretes,
  SUM(amount_practitioner) as total_euros
FROM transactions
WHERE
  transfer_status = 'eligible'
  AND status = 'succeeded'
  AND eligible_for_transfer_at <= NOW();

-- 4. DÉTAIL des transactions prêtes
SELECT
  t.id,
  t.appointment_id,
  t.status,
  t.transfer_status,
  t.eligible_for_transfer_at,
  t.amount_practitioner,
  a.start_time,
  a.end_time
FROM transactions t
JOIN appointments a ON a.id = t.appointment_id
WHERE
  t.transfer_status = 'eligible'
  AND t.status = 'succeeded'
  AND t.eligible_for_transfer_at <= NOW()
ORDER BY t.eligible_for_transfer_at;
