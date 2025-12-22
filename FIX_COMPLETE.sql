-- =====================================================
-- CORRECTION COMPLÈTE : Validation automatique après 48h
-- Ce script corrige tous les problèmes identifiés
-- =====================================================
-- PROBLÈMES IDENTIFIÉS :
-- 1. Transactions en transfer_status='eligible' mais status='pending'
-- 2. process-payouts cherche status='succeeded'
-- 3. Le webhook a été corrigé et redéployé
--
-- EXÉCUTEZ CE SCRIPT DANS LE SQL EDITOR DE SUPABASE
-- =====================================================

\echo '╔════════════════════════════════════════════════════════════╗';
\echo '║  CORRECTION COMPLÈTE : Validation automatique après 48h   ║';
\echo '╚════════════════════════════════════════════════════════════╝';
\echo '';

-- =====================================================
-- PARTIE 1 : DIAGNOSTIC
-- =====================================================
\echo '1️⃣  DIAGNOSTIC INITIAL';
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

\echo '';
\echo '📊 Répartition des transactions par statut :';
SELECT
  transfer_status,
  status,
  COUNT(*) as nb_transactions,
  ROUND(SUM(amount_practitioner)::numeric, 2) as total_euros
FROM transactions
WHERE created_at >= '2025-12-01'
GROUP BY transfer_status, status
ORDER BY transfer_status, status;

\echo '';
\echo '⚠️  Transactions bloquées (eligible + pending) :';
SELECT
  t.id,
  t.appointment_id,
  t.status as transaction_status,
  t.transfer_status,
  t.eligible_for_transfer_at,
  t.amount_practitioner,
  a.payment_status as appointment_payment_status,
  a.start_time,
  a.end_time
FROM transactions t
JOIN appointments a ON a.id = t.appointment_id
WHERE t.transfer_status = 'eligible'
  AND t.status = 'pending'
ORDER BY t.eligible_for_transfer_at;

-- =====================================================
-- PARTIE 2 : CORRECTION
-- =====================================================
\echo '';
\echo '2️⃣  CORRECTION DES TRANSACTIONS';
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

\echo '';
\echo '🔧 Correction : pending → succeeded (pour appointments payés)';

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

-- =====================================================
-- PARTIE 3 : VÉRIFICATION POST-CORRECTION
-- =====================================================
\echo '';
\echo '3️⃣  VÉRIFICATION APRÈS CORRECTION';
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

\echo '';
\echo '✅ Transactions PRÊTES pour transfert immédiat :';
SELECT
  COUNT(*) as nb_transactions,
  ROUND(SUM(amount_practitioner)::numeric, 2) as total_a_transferer_euros
FROM transactions
WHERE
  transfer_status = 'eligible'
  AND status = 'succeeded'
  AND eligible_for_transfer_at <= NOW();

\echo '';
\echo '📋 Détail des transactions prêtes :';
SELECT
  t.id,
  t.appointment_id,
  t.eligible_for_transfer_at,
  t.amount_practitioner,
  ROUND(EXTRACT(EPOCH FROM (NOW() - t.eligible_for_transfer_at))/3600::numeric, 1) as heures_de_retard,
  a.start_time as rdv_debut,
  a.end_time as rdv_fin
FROM transactions t
JOIN appointments a ON a.id = t.appointment_id
WHERE
  t.transfer_status = 'eligible'
  AND t.status = 'succeeded'
  AND t.eligible_for_transfer_at <= NOW()
ORDER BY t.eligible_for_transfer_at;

\echo '';
\echo '╔════════════════════════════════════════════════════════════╗';
\echo '║                  CORRECTION TERMINÉE ✅                     ║';
\echo '╚════════════════════════════════════════════════════════════╝';
\echo '';
\echo '🚀 PROCHAINE ÉTAPE : Lancer process-payouts';
\echo '';
\echo 'Exécutez maintenant le script TEST_PAYOUTS.sql';
\echo 'ou utilisez le Dashboard : Functions > process-payouts > Invoke';
\echo '';
