# Guide de Configuration du Cron Job pour l'Expiration des Rendez-vous

## Vue d'ensemble

Un système a été mis en place pour annuler automatiquement les rendez-vous qui nécessitent un paiement mais n'ont pas été payés dans l'heure qui suit leur création.

## Composants

### 1. Migration SQL (`add_appointment_payment_expiration.sql`)

Cette migration ajoute :
- Colonne `payment_required` : indique si un paiement est nécessaire
- Colonne `payment_deadline` : date limite de paiement (1h après création)
- Fonction `cancel_expired_unpaid_appointments()` : annule les rendez-vous expirés
- Trigger automatique pour définir la deadline

### 2. Edge Function (`cancel-expired-appointments`)

Cette fonction doit être appelée périodiquement pour :
- Exécuter la fonction SQL d'annulation
- Envoyer des notifications aux clients
- Logger les annulations

## Configuration du Cron Job

### Option 1 : Supabase Cron (Recommandé)

Si votre plan Supabase le permet, utilisez pg_cron directement :

```sql
-- Dans le SQL Editor de Supabase
SELECT cron.schedule(
  'cancel-expired-appointments',  -- Nom du job
  '*/15 * * * *',                  -- Toutes les 15 minutes
  $$
  SELECT cancel_expired_unpaid_appointments();
  $$
);
```

### Option 2 : Service Externe (GitHub Actions)

Créez `.github/workflows/cancel-expired-appointments.yml` :

```yaml
name: Cancel Expired Appointments

on:
  schedule:
    - cron: '*/15 * * * *'  # Toutes les 15 minutes
  workflow_dispatch:  # Permet l'exécution manuelle

jobs:
  cancel-expired:
    runs-on: ubuntu-latest
    steps:
      - name: Call Supabase Function
        run: |
          curl -X POST \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            ${{ secrets.SUPABASE_URL }}/functions/v1/cancel-expired-appointments
```

### Option 3 : Service de Cron externe (cron-job.org, EasyCron, etc.)

1. Créez un compte sur un service de cron (ex: https://cron-job.org)
2. Configurez une tâche HTTP :
   - **URL** : `https://[votre-projet].supabase.co/functions/v1/cancel-expired-appointments`
   - **Méthode** : POST
   - **Headers** :
     - `Content-Type: application/json`
     - `Authorization: Bearer [SUPABASE_SERVICE_ROLE_KEY]`
   - **Fréquence** : Toutes les 15 minutes

## Déploiement

### 1. Appliquer la migration SQL

Via l'interface Supabase :
```bash
# Copiez le contenu de supabase/migrations/add_appointment_payment_expiration.sql
# Collez dans SQL Editor
# Exécutez
```

Ou via CLI (nécessite Docker) :
```bash
npx supabase db push
```

### 2. Déployer la Edge Function

```bash
npx supabase functions deploy cancel-expired-appointments
```

### 3. Tester manuellement

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  https://your-project.supabase.co/functions/v1/cancel-expired-appointments
```

## Monitoring

### Vérifier les rendez-vous expirés

```sql
-- Voir les rendez-vous en attente de paiement
SELECT
  id,
  unique_code,
  start_time,
  payment_deadline,
  payment_deadline - NOW() as temps_restant,
  status
FROM appointments
WHERE payment_required = true
  AND status IN ('pending', 'confirmed')
ORDER BY payment_deadline ASC;
```

### Voir les rendez-vous annulés automatiquement

```sql
SELECT
  id,
  unique_code,
  start_time,
  status,
  notes,
  updated_at
FROM appointments
WHERE status = 'cancelled'
  AND notes LIKE '%Annulé automatiquement%'
ORDER BY updated_at DESC
LIMIT 20;
```

## Flux de paiement

1. **Création du rendez-vous** :
   - Si `price > 0` et `price !== 9999` : `payment_required = true`
   - La `payment_deadline` est automatiquement définie à `created_at + 1 hour`

2. **Redirection vers Stripe** :
   - L'utilisateur est redirigé vers Stripe Checkout
   - Une transaction est créée avec `status = 'pending'`

3. **Après paiement réussi** :
   - Webhook Stripe met à jour la transaction : `status = 'paid'`
   - Le rendez-vous reste actif

4. **Si pas de paiement dans l'heure** :
   - Le cron job appelle `cancel_expired_unpaid_appointments()`
   - Le rendez-vous est annulé automatiquement
   - Les liaisons avec les bénéficiaires sont supprimées

## Notifications

Pour activer les notifications par email lors de l'annulation :

1. Ajoutez la clé API Resend dans les secrets Supabase :
   ```bash
   npx supabase secrets set RESEND_API_KEY=re_xxxxx
   ```

2. Décommentez le code d'envoi d'email dans `cancel-expired-appointments/index.ts`

## Troubleshooting

### Le cron ne s'exécute pas

- Vérifiez que la Edge Function est bien déployée
- Vérifiez les logs Supabase : Dashboard > Functions > Logs
- Testez manuellement avec curl

### Les rendez-vous ne sont pas annulés

```sql
-- Exécuter manuellement la fonction
SELECT * FROM cancel_expired_unpaid_appointments();
```

### Vérifier les permissions

```sql
-- Vérifier que la fonction existe et les permissions
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'cancel_expired_unpaid_appointments';
```

## Sécurité

⚠️ **Important** :
- Ne jamais exposer la `SERVICE_ROLE_KEY` publiquement
- Utiliser des secrets/variables d'environnement pour les clés
- Restreindre l'accès à la Edge Function si nécessaire

## Questions fréquentes

**Q : Que se passe-t-il si l'utilisateur paie après l'annulation ?**
R : Le créneau redevient disponible. L'utilisateur devra faire une nouvelle réservation.

**Q : Peut-on modifier la durée de 1 heure ?**
R : Oui, modifiez l'INTERVAL dans la fonction `set_payment_deadline()` :
```sql
NEW.payment_deadline := NEW.created_at + INTERVAL '2 hours'; -- Au lieu de '1 hour'
```

**Q : Les rendez-vous gratuits sont-ils concernés ?**
R : Non, seuls les rendez-vous avec `payment_required = true` sont vérifiés.

**Q : Les rendez-vous "sur consultation" (prix 9999) sont-ils concernés ?**
R : Non, ils n'ont pas `payment_required = true` et ne sont donc pas annulés automatiquement.
