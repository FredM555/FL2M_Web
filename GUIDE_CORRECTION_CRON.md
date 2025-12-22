# Guide de correction du CRON process-payouts

## Problème identifié

Le CRON job `process-payouts-hourly` (jobid 9) échoue avec l'erreur :
```
ERROR: unrecognized configuration parameter "app.settings.service_role_key"
```

**Causes** :
1. ❌ L'URL contient le placeholder `[votre-projet]` au lieu de `phokxjbocljahmbdkrbs`
2. ❌ Il essaie d'utiliser `current_setting('app.settings.service_role_key')` qui n'existe pas
3. ✅ Le job #6 (`send-appointment-reminders`) utilise la bonne méthode et fonctionne

## Solution rapide (5 minutes)

### Étape 1 : Récupérer votre Service Role Key

1. Allez sur : https://supabase.com/dashboard/project/phokxjbocljahmbdkrbs/settings/api
2. Dans la section **Project API keys**, trouvez `service_role` (secret)
3. Cliquez sur **Reveal** et **copiez** la clé complète
   - Elle commence par `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   - C'est une longue chaîne de caractères

### Étape 2 : Exécuter le script de correction

1. Allez sur : https://supabase.com/dashboard/project/phokxjbocljahmbdkrbs/sql/new
2. Ouvrez le fichier `fix_payouts_cron_now.sql`
3. **Remplacez** `VOTRE_SERVICE_ROLE_KEY_ICI` par la clé que vous venez de copier (2 occurrences)
4. Cliquez sur **Run** (Exécuter)

### Étape 3 : Vérifier que ça fonctionne

Exécutez cette requête pour voir le statut :
```sql
SELECT
  jobid,
  jobname,
  schedule,
  active,
  CASE
    WHEN command LIKE '%phokxjbocljahmbdkrbs%' THEN '✓ URL OK'
    ELSE '✗ URL manquante'
  END as url_status,
  CASE
    WHEN command LIKE '%Bearer eyJ%' THEN '✓ Token OK'
    ELSE '✗ Token manquant'
  END as token_status
FROM cron.job
WHERE jobname = 'process-payouts-hourly';
```

Vous devriez voir : `✓ URL OK` et `✓ Token OK`

### Étape 4 : Vérifier les exécutions

Attendez la prochaine heure pile (ex: 21:00, 22:00) puis vérifiez :

```sql
SELECT
  j.jobname,
  r.status,
  r.return_message,
  r.start_time,
  r.end_time
FROM cron.job_run_details r
JOIN cron.job j ON j.jobid = r.jobid
WHERE j.jobname = 'process-payouts-hourly'
ORDER BY r.start_time DESC
LIMIT 5;
```

Le `status` devrait être `succeeded` (pas `failed`)

## Alternative : Correction manuelle par jobid

Si la méthode ci-dessus ne fonctionne pas, utilisez cette approche :

```sql
-- 1. Supprimer le job cassé par son ID
SELECT cron.unschedule(9);  -- jobid 9 est le job cassé

-- 2. Recréer avec la bonne config
SELECT cron.schedule(
  'process-payouts-hourly',
  '0 * * * *',
  $$SELECT net.http_post(
    'https://phokxjbocljahmbdkrbs.supabase.co/functions/v1/process-payouts',
    '{}'::jsonb,
    '{}'::jsonb,
    '{"Content-Type": "application/json", "Authorization": "Bearer VOTRE_SERVICE_ROLE_KEY"}'::jsonb
  );$$
);
```

## Test immédiat (sans attendre l'heure)

Pour tester immédiatement si process-payouts fonctionne :

```sql
SELECT net.http_post(
  'https://phokxjbocljahmbdkrbs.supabase.co/functions/v1/process-payouts',
  '{}'::jsonb,
  '{}'::jsonb,
  '{"Content-Type": "application/json", "Authorization": "Bearer VOTRE_SERVICE_ROLE_KEY"}'::jsonb
);
```

Puis vérifiez les logs :
- https://supabase.com/dashboard/project/phokxjbocljahmbdkrbs/functions/process-payouts/logs

## Corriger en même temps les transactions en attente

Pendant que vous êtes dans le SQL Editor, exécutez aussi :

```sql
-- Marquer toutes les transactions pending comme eligible
UPDATE transactions
SET
  transfer_status = 'eligible',
  updated_at = NOW()
WHERE
  transfer_status = 'pending'
  AND status = 'succeeded'
  AND eligible_for_transfer_at IS NOT NULL;

-- Vérifier combien de transactions sont prêtes pour transfert
SELECT
  COUNT(*) as nb_transactions,
  SUM(amount_practitioner) as total_euros
FROM transactions
WHERE
  transfer_status = 'eligible'
  AND status = 'succeeded'
  AND eligible_for_transfer_at <= NOW();
```

## Résumé des CRON jobs actuels

D'après votre sortie, vous avez ces jobs actifs :

| Job ID | Nom | Fréquence | Status |
|--------|-----|-----------|--------|
| 6 | send-appointment-reminders | Toutes les heures | ✅ Fonctionne |
| 7 | auto-confirm-beneficiary-data | Tous les jours à 9h | ✅ Fonctionne |
| 9 | process-payouts-hourly | Toutes les heures | ❌ **CASSÉ** |
| 10 | cancel-expired-appointments | Toutes les 15 min | ✅ Fonctionne |
| 11 | auto-complete-appointments | Toutes les heures | ✅ Fonctionne |

Après correction, tous devraient être ✅

## ⚠️ Sécurité

**Ne commitez JAMAIS votre service_role key dans Git !**

Si vous devez partager ce script :
1. Utilisez un fichier `.env` local
2. Ou les secrets Supabase Vault
3. Ou remplacez la clé par `VOTRE_SERVICE_ROLE_KEY` avant de commiter
