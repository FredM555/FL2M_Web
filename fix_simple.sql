-- =====================================================
-- Script simple : Corriger et vérifier
-- Exécutez ce script dans le SQL Editor de Supabase
-- =====================================================

-- 1. AVANT : Voir les transactions actuelles
SELECT 'AVANT CORRECTION' as etape, transfer_status, COUNT(*) as nb
FROM transactions
WHERE created_at >= '2025-12-01'
GROUP BY transfer_status;

-- 2. CORRECTION : pending → eligible
UPDATE transactions
SET transfer_status = 'eligible', updated_at = NOW()
WHERE transfer_status = 'pending'
  AND status = 'succeeded'
  AND eligible_for_transfer_at IS NOT NULL;

-- 3. APRÈS : Vérifier le résultat
SELECT 'APRÈS CORRECTION' as etape, transfer_status, COUNT(*) as nb
FROM transactions
WHERE created_at >= '2025-12-01'
GROUP BY transfer_status;

-- 4. Transactions prêtes pour transfert MAINTENANT
SELECT
  'PRÊT POUR TRANSFERT' as statut,
  COUNT(*) as nb_transactions,
  SUM(amount_practitioner) as total_euros
FROM transactions
WHERE transfer_status = 'eligible'
  AND status = 'succeeded'
  AND eligible_for_transfer_at <= NOW();

-- 5. Détail des transactions du 20 décembre
SELECT
  t.id,
  t.appointment_id,
  t.transfer_status,
  t.eligible_for_transfer_at,
  t.amount_practitioner,
  a.start_time,
  a.end_time
FROM transactions t
JOIN appointments a ON a.id = t.appointment_id
WHERE a.start_time >= '2025-12-20'
  AND a.start_time < '2025-12-21';
