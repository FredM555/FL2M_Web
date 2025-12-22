-- =====================================================
-- Vérification des CRON jobs et de leur historique
-- =====================================================

-- 1. Voir tous les CRON jobs configurés
SELECT
  jobid,
  jobname,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job
ORDER BY jobname;

-- 2. Voir l'historique d'exécution des CRON jobs (dernières 24h)
SELECT
  j.jobname,
  r.runid,
  r.job_pid,
  r.database,
  r.username,
  r.command,
  r.status,
  r.return_message,
  r.start_time,
  r.end_time,
  EXTRACT(EPOCH FROM (r.end_time - r.start_time)) as duration_seconds
FROM cron.job_run_details r
JOIN cron.job j ON j.jobid = r.jobid
WHERE r.start_time > NOW() - INTERVAL '24 hours'
ORDER BY r.start_time DESC;

-- 3. Vérifier les transactions éligibles pour transfert
SELECT
  t.id,
  t.appointment_id,
  t.status,
  t.transfer_status,
  t.eligible_for_transfer_at,
  t.amount_practitioner,
  CASE
    WHEN t.eligible_for_transfer_at <= NOW() THEN 'PRÊT POUR TRANSFERT'
    ELSE 'PAS ENCORE ÉLIGIBLE'
  END as eligibility_status,
  a.start_time,
  a.end_time,
  a.status as appointment_status
FROM transactions t
JOIN appointments a ON a.id = t.appointment_id
WHERE
  t.transfer_status = 'eligible'
  AND t.status = 'succeeded'
ORDER BY t.eligible_for_transfer_at;

-- 4. Vérifier s'il y a des CRON configurés pour process-payouts
SELECT
  jobid,
  jobname,
  schedule,
  command,
  active
FROM cron.job
WHERE command LIKE '%process-payouts%'
   OR jobname LIKE '%payout%'
   OR jobname LIKE '%transfer%';
