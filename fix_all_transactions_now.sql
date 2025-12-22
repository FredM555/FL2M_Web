-- =====================================================
-- Script complet : Diagnostic + Correction
-- =====================================================

-- PARTIE 1: DIAGNOSTIC
-- =====================================================
\echo '========================================';
\echo '1. DIAGNOSTIC DES TRANSACTIONS';
\echo '========================================';

-- 1.1 Vue d'ensemble par statut
SELECT
  transfer_status,
  COUNT(*) as nb_transactions,
  ROUND(SUM(amount_practitioner)::numeric, 2) as total_euros
FROM transactions
WHERE created_at >= '2025-12-01'
GROUP BY transfer_status
ORDER BY transfer_status;

\echo '';
\echo '1.2 Transactions qui devraient être traitées :';

-- 1.2 Transactions prêtes pour process-payouts
SELECT
  t.id,
  t.appointment_id,
  t.transfer_status,
  t.status,
  t.eligible_for_transfer_at,
  t.amount_practitioner,
  CASE
    WHEN t.eligible_for_transfer_at <= NOW() THEN '✅ OUI'
    ELSE '❌ NON - ' || EXTRACT(EPOCH FROM (t.eligible_for_transfer_at - NOW()))/3600 || 'h restantes'
  END as pret_pour_transfert
FROM transactions t
WHERE
  t.transfer_status = 'eligible'
  AND t.status = 'succeeded'
ORDER BY t.eligible_for_transfer_at;

\echo '';
\echo '1.3 Transactions PENDING qui devraient être ELIGIBLE :';

-- 1.3 Transactions bloquées en 'pending'
SELECT
  t.id,
  t.appointment_id,
  t.transfer_status as status_actuel,
  t.status as paiement_status,
  t.eligible_for_transfer_at,
  t.amount_practitioner,
  a.end_time,
  EXTRACT(EPOCH FROM (NOW() - a.end_time))/3600 as heures_depuis_rdv
FROM transactions t
LEFT JOIN appointments a ON a.id = t.appointment_id
WHERE
  t.transfer_status = 'pending'
  AND t.status = 'succeeded'
  AND t.eligible_for_transfer_at IS NOT NULL;

-- PARTIE 2: CORRECTION
-- =====================================================
\echo '';
\echo '========================================';
\echo '2. CORRECTION DES TRANSACTIONS';
\echo '========================================';

-- 2.1 Corriger toutes les transactions 'pending' → 'eligible'
UPDATE transactions
SET
  transfer_status = 'eligible',
  updated_at = NOW()
WHERE
  transfer_status = 'pending'
  AND status = 'succeeded'
  AND eligible_for_transfer_at IS NOT NULL
RETURNING
  id,
  appointment_id,
  'pending → eligible' as changement,
  eligible_for_transfer_at,
  amount_practitioner;

-- PARTIE 3: VÉRIFICATION POST-CORRECTION
-- =====================================================
\echo '';
\echo '========================================';
\echo '3. VÉRIFICATION APRÈS CORRECTION';
\echo '========================================';

-- 3.1 Transactions maintenant éligibles pour transfert immédiat
SELECT
  COUNT(*) as nb_transactions_pretes,
  ROUND(SUM(amount_practitioner)::numeric, 2) as total_a_transferer_euros
FROM transactions
WHERE
  transfer_status = 'eligible'
  AND status = 'succeeded'
  AND eligible_for_transfer_at <= NOW();

-- 3.2 Détail des transactions prêtes
SELECT
  t.id,
  t.appointment_id,
  t.eligible_for_transfer_at,
  t.amount_practitioner,
  EXTRACT(EPOCH FROM (NOW() - t.eligible_for_transfer_at))/3600 as heures_de_retard,
  a.start_time,
  a.end_time
FROM transactions t
LEFT JOIN appointments a ON a.id = t.appointment_id
WHERE
  t.transfer_status = 'eligible'
  AND t.status = 'succeeded'
  AND t.eligible_for_transfer_at <= NOW()
ORDER BY t.eligible_for_transfer_at;

\echo '';
\echo '========================================';
\echo 'TERMINÉ !';
\echo '';
\echo 'Prochaine étape : Relancer process-payouts';
\echo '========================================';
