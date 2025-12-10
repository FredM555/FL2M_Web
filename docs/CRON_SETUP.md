# Configuration du Cron Job pour l'activation automatique des contrats

Cette documentation explique comment configurer une tâche automatique quotidienne pour activer les contrats d'abonnement.

## Fonction Edge: `activate-pending-contracts`

Cette fonction est exécutée quotidiennement et effectue les tâches suivantes :

1. **Active les contrats** dont la `start_date` est atteinte et qui sont en statut `pending_activation`
2. **Termine les contrats** dont la `end_date` est atteinte et qui sont en statut `active`
3. **Réinitialise les compteurs mensuels** (`appointments_this_month`) le 1er de chaque mois

## Déploiement de la fonction

### 1. Déployer la fonction Edge

```bash
# Déployer la fonction
npx supabase functions deploy activate-pending-contracts

# OU si vous utilisez le CLI Supabase local
supabase functions deploy activate-pending-contracts
```

### 2. Option A: Utiliser Supabase Cron (Recommandé)

Supabase propose nativement la planification de tâches via `pg_cron`.

#### Créer une migration pour le cron job

Créez un fichier `supabase/migrations/setup_contract_activation_cron.sql` :

```sql
-- =====================================================
-- Migration: Configuration du Cron Job pour activation des contrats
-- Description: Exécute activate-pending-contracts quotidiennement à 2h du matin
-- Date: 2025-12-10
-- =====================================================

-- Activer l'extension pg_cron si ce n'est pas déjà fait
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Supprimer l'ancien cron job s'il existe
SELECT cron.unschedule('activate-pending-contracts');

-- Créer le cron job pour exécuter la fonction quotidiennement à 2h00 (heure du serveur)
SELECT cron.schedule(
  'activate-pending-contracts',                     -- nom du job
  '0 2 * * *',                                      -- Cron expression: tous les jours à 2h00
  $$
  SELECT
    net.http_post(
      url:='https://[VOTRE-SUPABASE-URL]/functions/v1/activate-pending-contracts',
      headers:=jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer [VOTRE-SERVICE-ROLE-KEY]'
      ),
      body:='{}'::jsonb
    ) as request_id;
  $$
);

-- Vérifier que le cron job a été créé
SELECT * FROM cron.job WHERE jobname = 'activate-pending-contracts';
```

**Important** : Remplacez `[VOTRE-SUPABASE-URL]` et `[VOTRE-SERVICE-ROLE-KEY]` par vos valeurs réelles.

#### Appliquer la migration

```bash
# Via Supabase CLI
supabase db push

# OU directement via SQL Editor dans le dashboard Supabase
```

#### Vérifier le cron job

```sql
-- Voir tous les cron jobs
SELECT * FROM cron.job;

-- Voir l'historique d'exécution
SELECT * FROM cron.job_run_details
WHERE jobname = 'activate-pending-contracts'
ORDER BY start_time DESC
LIMIT 10;
```

### 2. Option B: Utiliser un service externe (GitHub Actions, Vercel Cron, etc.)

Si vous préférez utiliser un service externe :

#### Exemple avec GitHub Actions

Créez `.github/workflows/activate-contracts.yml` :

```yaml
name: Activate Pending Contracts

on:
  schedule:
    # Exécution quotidienne à 2h00 UTC
    - cron: '0 2 * * *'
  workflow_dispatch: # Permet l'exécution manuelle

jobs:
  activate-contracts:
    runs-on: ubuntu-latest
    steps:
      - name: Call Supabase Function
        run: |
          curl -X POST \
            https://${{ secrets.SUPABASE_URL }}/functions/v1/activate-pending-contracts \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json"
```

Ajoutez ces secrets dans votre repository GitHub :
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Expression Cron

L'expression `0 2 * * *` signifie :
- `0` : à la minute 0
- `2` : à l'heure 2 (2h du matin)
- `*` : tous les jours du mois
- `*` : tous les mois
- `*` : tous les jours de la semaine

### Autres exemples d'expressions cron

```bash
# Toutes les heures
'0 * * * *'

# Tous les jours à minuit
'0 0 * * *'

# Toutes les 6 heures
'0 */6 * * *'

# Le 1er de chaque mois à midi
'0 12 1 * *'
```

## Tester manuellement la fonction

Vous pouvez appeler la fonction manuellement pour tester :

### Via curl

```bash
curl -X POST \
  https://[VOTRE-SUPABASE-URL]/functions/v1/activate-pending-contracts \
  -H "Authorization: Bearer [VOTRE-SERVICE-ROLE-KEY]" \
  -H "Content-Type: application/json"
```

### Via Supabase Dashboard

1. Allez dans **Edge Functions**
2. Sélectionnez `activate-pending-contracts`
3. Cliquez sur **Invoke Function**

### Via code TypeScript

```typescript
const response = await fetch(
  `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/activate-pending-contracts`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY}`
    }
  }
);

const result = await response.json();
console.log(result);
// {
//   "success": true,
//   "date": "2025-12-10",
//   "activated": 2,
//   "terminated": 1,
//   "countersReset": false,
//   "message": "2 contrat(s) activé(s), 1 contrat(s) terminé(s)"
// }
```

## Surveillance et logs

### Vérifier les logs de la fonction

```bash
# Via Supabase CLI
supabase functions logs activate-pending-contracts

# OU dans le dashboard Supabase
# Edge Functions → activate-pending-contracts → Logs
```

### Créer une alerte en cas d'échec

Vous pouvez configurer des alertes par email si la fonction échoue :

1. Dans le dashboard Supabase, allez dans **Project Settings** → **Integrations**
2. Configurez une intégration avec un service de monitoring (ex: Sentry, LogRocket)

### Logs attendus

En cas de succès :
```
[Activate Contracts] Exécution pour la date: 2025-12-10
[Activate Contracts] 2 contrat(s) à activer
[Activate Contracts] ✅ Contrat abc-123 activé (starter)
[Activate Contracts] ✅ Contrat def-456 activé (pro)
[Activate Contracts] 1 contrat(s) à terminer
[Activate Contracts] ✅ Contrat xyz-789 terminé (end_date: 2025-12-09)
```

## Dépannage

### La fonction ne s'exécute pas

1. Vérifiez que le cron job est bien créé :
   ```sql
   SELECT * FROM cron.job WHERE jobname = 'activate-pending-contracts';
   ```

2. Vérifiez l'historique d'exécution :
   ```sql
   SELECT * FROM cron.job_run_details
   WHERE jobname = 'activate-pending-contracts'
   ORDER BY start_time DESC;
   ```

3. Vérifiez que la fonction est bien déployée :
   ```bash
   supabase functions list
   ```

### Les contrats ne sont pas activés

1. Vérifiez les logs de la fonction
2. Vérifiez que les contrats ont bien le statut `pending_activation` et une `start_date` correcte :
   ```sql
   SELECT id, practitioner_id, contract_type, start_date, status
   FROM practitioner_contracts
   WHERE status = 'pending_activation';
   ```

3. Testez manuellement la fonction avec curl

### Fuseau horaire

Attention : `pg_cron` utilise le fuseau horaire du serveur PostgreSQL. Pour la France (UTC+1/+2), ajustez l'heure en conséquence.

```sql
-- Vérifier le fuseau horaire du serveur
SHOW timezone;

-- Si vous voulez exécuter à 2h Paris time et que le serveur est en UTC
-- Utilisez 1h00 UTC en hiver, 0h00 UTC en été
SELECT cron.schedule(
  'activate-pending-contracts',
  '0 1 * * *',  -- 1h00 UTC = 2h00 Paris (hiver)
  $$ ... $$
);
```

## Commandes utiles

```sql
-- Lister tous les cron jobs
SELECT * FROM cron.job;

-- Voir l'historique d'exécution
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;

-- Supprimer un cron job
SELECT cron.unschedule('activate-pending-contracts');

-- Désactiver temporairement un cron job
UPDATE cron.job SET active = false WHERE jobname = 'activate-pending-contracts';

-- Réactiver un cron job
UPDATE cron.job SET active = true WHERE jobname = 'activate-pending-contracts';
```

---

**Dernière mise à jour** : 2025-12-10
