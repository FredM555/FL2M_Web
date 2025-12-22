-- =====================================================
-- Migration: Correction du CRON process-payouts
-- Description: Supprime l'ancien CRON cassé et le recrée
--              avec le service role key en dur comme send-reminders
-- Date: 2025-12-22
-- =====================================================

-- 1. Supprimer l'ancien job cassé
SELECT cron.unschedule('process-payouts-hourly');

-- 2. Supprimer l'ancienne fonction wrapper qui ne fonctionne pas
DROP FUNCTION IF EXISTS trigger_process_payouts();

-- 3. Récupérer le service role key depuis les secrets Vault
-- Note: Vous devez remplacer VOTRE_SERVICE_ROLE_KEY par votre vraie clé
-- Vous pouvez la trouver dans Settings > API > service_role (secret)

-- 4. Créer le nouveau CRON job directement avec net.http_post
-- Cette approche est identique à celle utilisée pour send-reminders (jobid 6)
SELECT cron.schedule(
  'process-payouts-hourly',
  '0 * * * *',  -- Toutes les heures
  $$SELECT net.http_post(
    'https://phokxjbocljahmbdkrbs.supabase.co/functions/v1/process-payouts',
    '{}'::jsonb,
    '{}'::jsonb,
    '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBob2t4amJvY2xqYWhtYmRrcmJzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNjc1OTY5OSwiZXhwIjoyMDQyMzM1Njk5fQ.VOTRE_SERVICE_ROLE_KEY_SIGNATURE_ICI"}'::jsonb
  );$$
);

-- 5. Vérifier que le job est bien créé
SELECT
  jobid,
  jobname,
  schedule,
  active,
  CASE
    WHEN command LIKE '%phokxjbocljahmbdkrbs%' THEN '✓ URL correcte'
    ELSE '✗ URL incorrecte'
  END as url_check
FROM cron.job
WHERE jobname = 'process-payouts-hourly';

-- =====================================================
-- IMPORTANT: Remplacez le token dans cette migration !
-- =====================================================
--
-- Pour obtenir votre service_role key:
-- 1. Allez sur https://supabase.com/dashboard/project/phokxjbocljahmbdkrbs/settings/api
-- 2. Copiez la clé "service_role" (secret)
-- 3. Remplacez "VOTRE_SERVICE_ROLE_KEY_SIGNATURE_ICI" par votre clé complète
--
-- ⚠️ ATTENTION: Ne commitez jamais cette clé dans Git !
-- Utilisez un fichier .env ou les secrets Supabase Vault
--
-- =====================================================
