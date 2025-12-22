-- =====================================================
-- Test process-payouts après correction
-- =====================================================

-- Remplacez VOTRE_SERVICE_ROLE_KEY par votre clé
-- (Settings > API > service_role)

SELECT net.http_post(
  'https://phokxjbocljahmbdkrbs.supabase.co/functions/v1/process-payouts',
  '{}'::jsonb,
  '{}'::jsonb,
  '{"Content-Type": "application/json", "Authorization": "Bearer VOTRE_SERVICE_ROLE_KEY"}'::jsonb
);

-- Attendre 2-3 secondes puis vérifier les transactions
SELECT
  id,
  appointment_id,
  transfer_status,
  stripe_transfer_id,
  transferred_at,
  amount_practitioner
FROM transactions
WHERE transfer_status IN ('completed', 'processing', 'failed')
  AND updated_at >= NOW() - INTERVAL '5 minutes'
ORDER BY updated_at DESC;
