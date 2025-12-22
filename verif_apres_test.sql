-- =====================================================
-- Vérification après test en production
-- Exécutez ce script après avoir créé un rendez-vous test
-- =====================================================

\echo '╔════════════════════════════════════════════════════════════╗';
\echo '║         VÉRIFICATION SYSTÈME - APRÈS TEST PROD            ║';
\echo '╚════════════════════════════════════════════════════════════╝';
\echo '';

-- =====================================================
-- 1. DERNIÈRE TRANSACTION
-- =====================================================
\echo '1️⃣  Dernière transaction créée :';
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

SELECT
  id,
  appointment_id,
  status,
  transfer_status,
  eligible_for_transfer_at,
  amount_practitioner,
  created_at,
  CASE
    WHEN status = 'succeeded' AND transfer_status = 'eligible' THEN '✅ OK'
    WHEN status = 'pending' THEN '❌ Status = pending (problème webhook)'
    WHEN transfer_status = 'pending' THEN '❌ Transfer_status = pending (problème webhook)'
    ELSE '⚠️ À vérifier'
  END as diagnostic
FROM transactions
ORDER BY created_at DESC
LIMIT 1;

-- =====================================================
-- 2. TRANSACTIONS EN ATTENTE DE TRANSFERT
-- =====================================================
\echo '';
\echo '2️⃣  Transactions en attente de transfert (< 48h) :';
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

SELECT
  COUNT(*) as nb_transactions,
  ROUND(SUM(amount_practitioner)::numeric, 2) as total_euros,
  MIN(eligible_for_transfer_at) as prochain_transfert
FROM transactions
WHERE transfer_status = 'eligible'
  AND status = 'succeeded'
  AND eligible_for_transfer_at > NOW();

-- =====================================================
-- 3. TRANSACTIONS PRÊTES POUR TRANSFERT IMMÉDIAT
-- =====================================================
\echo '';
\echo '3️⃣  Transactions PRÊTES pour transfert maintenant :';
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

SELECT
  COUNT(*) as nb_transactions,
  ROUND(SUM(amount_practitioner)::numeric, 2) as total_euros
FROM transactions
WHERE transfer_status = 'eligible'
  AND status = 'succeeded'
  AND eligible_for_transfer_at <= NOW();

-- =====================================================
-- 4. DERNIERS TRANSFERTS EFFECTUÉS
-- =====================================================
\echo '';
\echo '4️⃣  Derniers transferts effectués :';
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

SELECT
  id,
  appointment_id,
  stripe_transfer_id,
  transferred_at,
  amount_practitioner
FROM transactions
WHERE transfer_status = 'completed'
ORDER BY transferred_at DESC
LIMIT 5;

-- =====================================================
-- 5. STATUT DES CRON JOBS
-- =====================================================
\echo '';
\echo '5️⃣  CRON jobs actifs :';
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

SELECT
  jobname,
  schedule,
  active,
  CASE
    WHEN active = true THEN '✅'
    ELSE '❌'
  END as status
FROM cron.job
WHERE jobname IN (
  'process-payouts-hourly',
  'auto-complete-appointments',
  'send-appointment-reminders'
)
ORDER BY jobname;

-- =====================================================
-- 6. HISTORIQUE RÉCENT DES CRON
-- =====================================================
\echo '';
\echo '6️⃣  Dernières exécutions du CRON process-payouts :';
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

SELECT
  r.start_time,
  r.status,
  LEFT(r.return_message, 50) as message,
  CASE
    WHEN r.status = 'succeeded' THEN '✅'
    ELSE '❌'
  END as result
FROM cron.job_run_details r
JOIN cron.job j ON j.jobid = r.jobid
WHERE j.jobname = 'process-payouts-hourly'
  AND r.start_time > NOW() - INTERVAL '24 hours'
ORDER BY r.start_time DESC
LIMIT 5;

-- =====================================================
-- 7. DIAGNOSTIC GLOBAL
-- =====================================================
\echo '';
\echo '7️⃣  Diagnostic global :';
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

SELECT
  (SELECT COUNT(*) FROM transactions WHERE status = 'pending' AND transfer_status = 'eligible') as transactions_status_pending,
  (SELECT COUNT(*) FROM transactions WHERE status = 'succeeded' AND transfer_status = 'pending') as transactions_transfer_pending,
  (SELECT COUNT(*) FROM transactions WHERE transfer_status = 'failed') as transactions_failed,
  (SELECT active FROM cron.job WHERE jobname = 'process-payouts-hourly' LIMIT 1) as cron_actif;

\echo '';
\echo '╔════════════════════════════════════════════════════════════╗';
\echo '║                    VÉRIFICATION TERMINÉE                   ║';
\echo '╚════════════════════════════════════════════════════════════╝';
\echo '';
\echo '✅ Si tout est OK :';
\echo '   - Dernière transaction : status=succeeded, transfer_status=eligible';
\echo '   - CRON actif et s''exécute sans erreur';
\echo '   - Pas de transactions en status=pending ou transfer_status=failed';
\echo '';
\echo '⚠️ Si problèmes détectés :';
\echo '   - Consultez les logs : dashboard.stripe.com et supabase functions logs';
\echo '   - Exécutez debug_process_payouts_query.sql pour diagnostic détaillé';
\echo '';
