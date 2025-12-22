# Configuration du CRON pour process-payouts

## Problème identifié

La fonction `process-payouts` existe mais n'est **jamais appelée automatiquement**. Elle doit être déclenchée toutes les heures pour traiter les paiements éligibles.

## Solutions possibles

### Option 1: CRON HTTP externe (RECOMMANDÉ)

Utilisez un service de CRON externe qui appellera votre fonction via HTTP.

#### Services recommandés:
- **cron-job.org** (gratuit, fiable)
- **EasyCron** (gratuit jusqu'à 2 tâches)
- **GitHub Actions** (gratuit pour projets publics/privés)

#### Configuration pour cron-job.org:

1. Allez sur https://cron-job.org
2. Créez un compte gratuit
3. Créez un nouveau CRON job avec ces paramètres:
   - **Title**: Process Payouts FL2M
   - **URL**: `https://phokxjbocljahmbdkrbs.supabase.co/functions/v1/process-payouts`
   - **Schedule**: Every hour (0 * * * *)
   - **Request method**: POST
   - **Headers**: Ajoutez ce header:
     ```
     Authorization: Bearer VOTRE_SERVICE_ROLE_KEY
     ```
   - **Enabled**: ✓

4. Testez le job manuellement
5. Vérifiez les logs dans le dashboard

#### Configuration avec GitHub Actions:

Créez le fichier `.github/workflows/process-payouts.yml`:

```yaml
name: Process Payouts Hourly

on:
  schedule:
    # Toutes les heures à la minute 0
    - cron: '0 * * * *'
  workflow_dispatch: # Permet de déclencher manuellement

jobs:
  process-payouts:
    runs-on: ubuntu-latest
    steps:
      - name: Call process-payouts function
        run: |
          curl -X POST \
            https://phokxjbocljahmbdkrbs.supabase.co/functions/v1/process-payouts \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json"
```

N'oubliez pas d'ajouter `SUPABASE_SERVICE_ROLE_KEY` dans les secrets GitHub.

### Option 2: pg_cron avec pg_net (Configuration dans Supabase)

Si vous avez les permissions superuser dans Supabase, vous pouvez configurer pg_cron directement.

1. Appliquez la migration `20251222_setup_payouts_cron.sql`
2. Configurez les variables dans le Dashboard Supabase:
   - Allez dans Settings > Database > Configuration
   - Ajoutez:
     ```
     app.settings.supabase_url = https://phokxjbocljahmbdkrbs.supabase.co
     app.settings.service_role_key = VOTRE_SERVICE_ROLE_KEY
     ```

3. Vérifiez que le CRON est actif:
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'process-payouts-hourly';
   ```

## Vérification des exécutions

### 1. Vérifier les CRON jobs configurés:
```sql
SELECT
  jobid,
  jobname,
  schedule,
  command,
  active
FROM cron.job
ORDER BY jobname;
```

### 2. Vérifier l'historique d'exécution (dernières 24h):
```sql
SELECT
  j.jobname,
  r.status,
  r.return_message,
  r.start_time,
  r.end_time,
  EXTRACT(EPOCH FROM (r.end_time - r.start_time)) as duration_seconds
FROM cron.job_run_details r
JOIN cron.job j ON j.jobid = r.jobid
WHERE r.start_time > NOW() - INTERVAL '24 hours'
ORDER BY r.start_time DESC;
```

### 3. Vérifier les transactions en attente de transfert:
```sql
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
  EXTRACT(EPOCH FROM (NOW() - t.eligible_for_transfer_at))/3600 as hours_overdue
FROM transactions t
WHERE
  t.transfer_status = 'eligible'
  AND t.status = 'succeeded'
ORDER BY t.eligible_for_transfer_at;
```

### 4. Vérifier les logs de la fonction process-payouts:

Dans le Dashboard Supabase:
1. Allez dans **Functions** > **process-payouts**
2. Cliquez sur **Logs**
3. Vous verrez l'historique des exécutions

## Déclencher manuellement

Pour tester immédiatement, vous pouvez appeler la fonction manuellement:

```bash
curl -X POST \
  https://phokxjbocljahmbdkrbs.supabase.co/functions/v1/process-payouts \
  -H "Authorization: Bearer VOTRE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
```

Ou via le Dashboard Supabase:
1. Allez dans **Functions** > **process-payouts**
2. Cliquez sur **Invoke function**

## Correction immédiate pour le rendez-vous du 20 décembre

Pour corriger immédiatement la transaction du rendez-vous du 20 décembre, exécutez ce SQL:

```sql
-- 1. Vérifier la transaction
SELECT
  t.id,
  t.appointment_id,
  t.transfer_status,
  t.eligible_for_transfer_at,
  a.end_time
FROM transactions t
JOIN appointments a ON a.id = t.appointment_id
WHERE a.end_time >= '2025-12-20 09:00:00'
  AND a.end_time < '2025-12-20 10:00:00';

-- 2. Marquer la transaction comme eligible
UPDATE transactions
SET
  transfer_status = 'eligible',
  updated_at = NOW()
WHERE
  transfer_status = 'pending'
  AND status = 'succeeded'
  AND appointment_id IN (
    SELECT id FROM appointments
    WHERE end_time >= '2025-12-20 09:00:00'
      AND end_time < '2025-12-20 10:00:00'
  );

-- 3. Appeler manuellement process-payouts (voir ci-dessus)
```

## Résumé des modifications apportées

1. ✅ **stripe-webhook** modifié pour marquer `transfer_status = 'eligible'` dès le paiement
2. ✅ **Migration** créée pour corriger les transactions existantes en 'pending'
3. ✅ **Migration CRON** créée pour appeler process-payouts automatiquement
4. ⚠️ **À FAIRE**: Configurer le CRON externe OU appliquer la migration pg_cron

## Prochaines étapes

1. Choisissez l'option de CRON (externe ou pg_cron)
2. Configurez le CRON selon l'option choisie
3. Appliquez la migration `20251222_fix_pending_transactions.sql` pour corriger les transactions existantes
4. Testez avec un appel manuel à process-payouts
5. Vérifiez que le rendez-vous du 20 décembre est traité
