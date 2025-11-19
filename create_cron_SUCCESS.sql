-- =====================================================
-- Création du job cron - VERSION QUI FONCTIONNE
-- =====================================================

-- Supprimer l'ancien job (s'il existe)
SELECT cron.unschedule('send-appointment-reminders');

-- Créer le nouveau job (JSON sur UNE ligne)
SELECT cron.schedule(
  'send-appointment-reminders',
  '0 * * * *',
  $$
  SELECT net.http_post(
    'https://phokxjbocljahmbdkrbs.supabase.co/functions/v1/send-reminders',
    '{}'::jsonb,
    '{}'::jsonb,
    '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBob2t4amJvY2xqYWhtYmRrcmJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxNjU3NjYsImV4cCI6MjA3NTc0MTc2Nn0.bl3CI7b8QuQ9VMzFLcNUYqMHEy6_3MTCsgQ20r3kyWw"}'::jsonb
  );
  $$
);

-- Vérifier la création du job
SELECT
    jobid,
    jobname,
    schedule,
    active
FROM cron.job
WHERE jobname = 'send-appointment-reminders';

-- =====================================================
-- COMMANDES UTILES
-- =====================================================

-- Voir les logs d'exécution (après la première exécution)
-- SELECT
--     status,
--     return_message,
--     start_time,
--     end_time
-- FROM cron.job_run_details
-- WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'send-appointment-reminders')
-- ORDER BY start_time DESC
-- LIMIT 10;

-- Voir les réponses HTTP
-- SELECT
--     id,
--     status_code,
--     content::text as response,
--     created
-- FROM net._http_response
-- ORDER BY created DESC
-- LIMIT 10;

-- Désactiver temporairement le job
-- UPDATE cron.job SET active = false WHERE jobname = 'send-appointment-reminders';

-- Réactiver le job
-- UPDATE cron.job SET active = true WHERE jobname = 'send-appointment-reminders';

-- Supprimer le job
-- SELECT cron.unschedule('send-appointment-reminders');
