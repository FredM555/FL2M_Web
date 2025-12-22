-- =====================================================
-- Migration: Configuration du CRON pour process-payouts
-- Description: Configure un appel HTTP automatique vers la fonction
--              process-payouts toutes les heures via pg_cron
-- Date: 2025-12-22
-- =====================================================

-- Note: pg_cron peut appeler des fonctions SQL ou des commandes shell
-- Pour appeler une Edge Function Supabase, nous devons utiliser pg_net
-- qui permet de faire des requêtes HTTP depuis PostgreSQL

-- 1. Activer l'extension pg_cron si pas déjà fait
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Activer l'extension pg_net pour les appels HTTP
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 3. Créer une fonction wrapper qui appelle process-payouts via HTTP
CREATE OR REPLACE FUNCTION trigger_process_payouts()
RETURNS void AS $$
DECLARE
  response_id bigint;
BEGIN
  -- Appeler la fonction process-payouts via HTTP
  -- Note: Remplacez VOTRE_PROJECT_URL par votre URL Supabase
  -- et VOTRE_SERVICE_ROLE_KEY par votre clé de service
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/process-payouts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  ) INTO response_id;

  RAISE NOTICE 'Process-payouts déclenché, response_id: %', response_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Configurer les settings nécessaires (À FAIRE VIA DASHBOARD)
-- Ces commandes ne fonctionneront que si vous avez les droits superuser
-- Sinon, configurez-les manuellement dans le Dashboard Supabase
--
-- ALTER DATABASE postgres SET app.settings.supabase_url = 'https://VOTRE_PROJECT.supabase.co';
-- ALTER DATABASE postgres SET app.settings.service_role_key = 'VOTRE_SERVICE_ROLE_KEY';

-- 5. Créer le CRON job qui exécute process-payouts toutes les heures
SELECT cron.schedule(
  'process-payouts-hourly',     -- Nom du job
  '0 * * * *',                   -- Toutes les heures à la minute 0
  'SELECT trigger_process_payouts();'
);

-- Commentaires
COMMENT ON FUNCTION trigger_process_payouts() IS
'Déclenche l''exécution de la fonction Edge process-payouts via HTTP.
Appelé automatiquement toutes les heures par pg_cron pour transférer
les paiements aux intervenants après 48h.';

-- =====================================================
-- INSTRUCTIONS DE CONFIGURATION MANUELLE
-- =====================================================
--
-- Si la configuration automatique ne fonctionne pas, vous pouvez :
--
-- 1. Créer un webhook externe (ex: cron-job.org, EasyCron)
--    URL: https://VOTRE_PROJECT.supabase.co/functions/v1/process-payouts
--    Header: Authorization: Bearer VOTRE_SERVICE_ROLE_KEY
--    Fréquence: Toutes les heures
--
-- 2. Ou utiliser GitHub Actions avec un workflow planifié
--
-- 3. Vérifier les CRON configurés:
--    SELECT * FROM cron.job;
--
-- 4. Vérifier l'historique d'exécution:
--    SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
--
-- =====================================================
