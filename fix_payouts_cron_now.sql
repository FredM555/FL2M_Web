-- =====================================================
-- Script de correction immédiate du CRON process-payouts
-- À exécuter dans le SQL Editor de Supabase
-- =====================================================

-- INSTRUCTIONS:
-- 1. Allez sur https://supabase.com/dashboard/project/phokxjbocljahmbdkrbs/settings/api
-- 2. Copiez votre clé "service_role" (secret) - c'est une longue chaîne commençant par "eyJhbGc..."
-- 3. Remplacez "VOTRE_SERVICE_ROLE_KEY_ICI" ci-dessous par votre clé
-- 4. Exécutez ce script dans SQL Editor

-- 1. Supprimer l'ancien job cassé
SELECT cron.unschedule('process-payouts-hourly');

-- 2. Créer le nouveau job avec la bonne configuration
-- Copiez le modèle du job send-reminders qui fonctionne (jobid 6)
SELECT cron.schedule(
  'process-payouts-hourly',
  '0 * * * *',  -- Toutes les heures à la minute 0
  $$SELECT net.http_post(
    'https://phokxjbocljahmbdkrbs.supabase.co/functions/v1/process-payouts',
    '{}'::jsonb,
    '{}'::jsonb,
    '{"Content-Type": "application/json", "Authorization": "Bearer VOTRE_SERVICE_ROLE_KEY_ICI"}'::jsonb
  );$$
);

-- 3. Vérifier le résultat
SELECT
  jobid,
  jobname,
  schedule,
  active,
  LEFT(command, 100) as command_preview
FROM cron.job
WHERE jobname = 'process-payouts-hourly';

-- 4. Tester immédiatement (optionnel - lance le job maintenant)
SELECT net.http_post(
  'https://phokxjbocljahmbdkrbs.supabase.co/functions/v1/process-payouts',
  '{}'::jsonb,
  '{}'::jsonb,
  '{"Content-Type": "application/json", "Authorization": "Bearer VOTRE_SERVICE_ROLE_KEY_ICI"}'::jsonb
);

-- =====================================================
-- ⚠️ RAPPEL: Remplacez VOTRE_SERVICE_ROLE_KEY_ICI (2 fois dans ce script)
-- =====================================================
