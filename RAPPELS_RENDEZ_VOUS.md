# 📅 Système de rappels automatiques de rendez-vous

## Vue d'ensemble

Ce système permet d'envoyer automatiquement des emails de rappel aux clients ET aux bénéficiaires avant leurs rendez-vous.

### ✅ Fonctionnalités

- ⏰ Rappel envoyé X heures avant le RDV (par défaut: 24h, configurable par RDV)
- 📧 Email au client ET au bénéficiaire (si différent et notifications activées)
- 🎨 Template HTML personnalisé avec compte à rebours
- 📊 Logging automatique dans `activity_logs`
- ✔️ Marquage pour éviter les doublons

---

## 🚀 Déploiement

### Étape 1 : Migration de la base de données

**Fichier** : `supabase/migrations/20250118_add_appointment_reminders.sql`

**Dans Supabase Dashboard → SQL Editor** :
```sql
-- Copier-coller le contenu du fichier de migration
```

Cette migration ajoute :
- `reminder_sent_at` : Date d'envoi du rappel
- `reminder_hours_before` : Nombre d'heures avant le RDV (défaut: 24h)
- Fonction `get_appointments_needing_reminder()` : Récupère les RDV à rappeler
- Fonction `mark_reminder_sent(uuid)` : Marque un RDV comme rappelé

### Étape 2 : Déployer la fonction Edge

**Dans Supabase Dashboard → Edge Functions** :

1. Créer une nouvelle fonction nommée **`send-reminders`**
2. Copier le code depuis `supabase/functions/send-reminders/index.ts`
3. Déployer

---

## ⏱️ Configuration du CRON Job

Pour automatiser l'envoi des rappels, vous devez configurer un CRON job.

### Option 1 : Supabase pg_cron (Recommandé)

**Dans Supabase Dashboard → SQL Editor** :

```sql
-- Créer un CRON job qui s'exécute toutes les heures
SELECT cron.schedule(
  'send-appointment-reminders',  -- Nom du job
  '0 * * * *',                    -- Toutes les heures à la minute 0
  $$
  SELECT net.http_post(
    url := 'https://[VOTRE-PROJECT-REF].supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer [VOTRE-SERVICE-ROLE-KEY]'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

**Remplacez** :
- `[VOTRE-PROJECT-REF]` : Référence de votre projet Supabase
- `[VOTRE-SERVICE-ROLE-KEY]` : Clé service_role (Settings → API)

**Fréquence recommandée** :
- `'0 * * * *'` : Toutes les heures
- `'0 8,12,18 * * *'` : À 8h, 12h et 18h
- `'*/30 * * * *'` : Toutes les 30 minutes

### Option 2 : Service externe (Cron-job.org, EasyCron, etc.)

Configurer un appel HTTP vers :
```
POST https://[VOTRE-PROJECT-REF].supabase.co/functions/v1/send-reminders
Headers:
  Authorization: Bearer [VOTRE-SERVICE-ROLE-KEY]
  Content-Type: application/json
Body: {}
```

### Option 3 : GitHub Actions (Gratuit)

Créer `.github/workflows/send-reminders.yml` :

```yaml
name: Send Appointment Reminders

on:
  schedule:
    - cron: '0 * * * *'  # Toutes les heures
  workflow_dispatch:  # Permet l'exécution manuelle

jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Call Supabase Function
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json" \
            https://${{ secrets.SUPABASE_PROJECT_REF }}.supabase.co/functions/v1/send-reminders
```

Ajouter les secrets dans GitHub :
- `SUPABASE_PROJECT_REF`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## 🎛️ Configuration des rappels

### Par défaut
Tous les rendez-vous reçoivent un rappel **24h avant**.

### Personnaliser par rendez-vous

```sql
-- Rappel 48h avant
UPDATE appointments
SET reminder_hours_before = 48
WHERE id = 'xxx-xxx-xxx';

-- Rappel 2h avant
UPDATE appointments
SET reminder_hours_before = 2
WHERE id = 'xxx-xxx-xxx';

-- Désactiver le rappel pour un RDV spécifique
UPDATE appointments
SET reminder_hours_before = NULL
WHERE id = 'xxx-xxx-xxx';
```

### Dans l'interface utilisateur

Vous pouvez ajouter un champ dans le formulaire de création/modification de RDV :

```tsx
<TextField
  label="Rappel avant le RDV (heures)"
  type="number"
  value={reminderHoursBefore}
  onChange={(e) => setReminderHoursBefore(Number(e.target.value))}
  helperText="Nombre d'heures avant le RDV pour envoyer le rappel (défaut: 24h)"
/>
```

---

## 🧪 Tests

### Test manuel de la fonction

**Dans Supabase Dashboard → Edge Functions → send-reminders** :

Cliquer sur **"Invoke"** ou via curl :

```bash
curl -X POST \
  -H "Authorization: Bearer [SERVICE-ROLE-KEY]" \
  -H "Content-Type: application/json" \
  https://[PROJECT-REF].supabase.co/functions/v1/send-reminders
```

**Réponse attendue** :
```json
{
  "success": true,
  "processed": 2,
  "failed": 0,
  "total": 2
}
```

### Vérifier les rappels envoyés

```sql
-- Voir les RDV qui ont reçu un rappel
SELECT
  id,
  start_time,
  reminder_hours_before,
  reminder_sent_at,
  EXTRACT(EPOCH FROM (start_time - reminder_sent_at))/3600 as hours_before_sent
FROM appointments
WHERE reminder_sent_at IS NOT NULL
ORDER BY reminder_sent_at DESC
LIMIT 10;

-- Voir les logs d'emails de rappel
SELECT * FROM email_logs_view
WHERE email_type = 'reminder'
ORDER BY created_at DESC
LIMIT 10;
```

### Créer un RDV de test

```sql
-- Créer un RDV dans 23h pour tester le rappel
INSERT INTO appointments (
  practitioner_id,
  service_id,
  client_id,
  start_time,
  end_time,
  status,
  reminder_hours_before
) VALUES (
  '[practitioner-id]',
  '[service-id]',
  '[client-id]',
  NOW() + interval '23 hours',
  NOW() + interval '24 hours',
  'confirmed',
  24
);
```

Puis exécuter la fonction `send-reminders` manuellement.

---

## 📊 Monitoring

### Vérifier l'exécution du CRON

```sql
-- Voir l'historique des exécutions du CRON (pg_cron)
SELECT * FROM cron.job_run_details
WHERE jobname = 'send-appointment-reminders'
ORDER BY start_time DESC
LIMIT 10;
```

### Statistiques des rappels

```sql
-- Nombre de rappels envoyés par jour
SELECT
  DATE(reminder_sent_at) as date,
  COUNT(*) as reminders_sent
FROM appointments
WHERE reminder_sent_at IS NOT NULL
GROUP BY DATE(reminder_sent_at)
ORDER BY date DESC
LIMIT 30;

-- Taux de succès des rappels
SELECT
  COUNT(CASE WHEN al.action_type = 'email_sent' THEN 1 END) as sent,
  COUNT(CASE WHEN al.action_type = 'email_failed' THEN 1 END) as failed,
  ROUND(
    COUNT(CASE WHEN al.action_type = 'email_sent' THEN 1 END)::numeric /
    NULLIF(COUNT(*)::numeric, 0) * 100,
    2
  ) as success_rate_pct
FROM activity_logs al
WHERE al.metadata->>'email_type' = 'reminder';
```

---

## 🔧 Dépannage

### Le CRON ne s'exécute pas

1. **Vérifier que pg_cron est activé** :
```sql
SELECT * FROM pg_extension WHERE extname = 'pg_cron';
```

2. **Vérifier les jobs CRON** :
```sql
SELECT * FROM cron.job;
```

3. **Voir les erreurs** :
```sql
SELECT * FROM cron.job_run_details
WHERE jobname = 'send-appointment-reminders'
  AND status != 'succeeded'
ORDER BY start_time DESC;
```

### Aucun rappel n'est envoyé

1. **Vérifier qu'il y a des RDV éligibles** :
```sql
SELECT * FROM get_appointments_needing_reminder();
```

2. **Vérifier les conditions** :
- Le RDV est dans les prochaines X heures (selon `reminder_hours_before`)
- Le RDV n'a pas encore de `reminder_sent_at`
- Le statut est `pending` ou `confirmed`

3. **Vérifier les logs de la fonction** :
```bash
# Supabase CLI
npx supabase functions logs send-reminders
```

### Les emails ne sont pas reçus

1. **Vérifier les logs d'emails** :
```sql
SELECT * FROM email_logs_view
WHERE email_type = 'reminder'
  AND status = 'failed'
ORDER BY created_at DESC;
```

2. **Vérifier la configuration Resend** (voir logs de `send-email`)

3. **Vérifier les emails des clients** :
```sql
SELECT
  a.id,
  c.email as client_email,
  a.beneficiary_email,
  a.beneficiary_notifications_enabled
FROM appointments a
JOIN profiles c ON a.client_id = c.id
WHERE a.id = '[appointment-id]';
```

---

## 📝 Emails envoyés au bénéficiaire

Le bénéficiaire reçoit des emails dans les cas suivants :

| Événement | Condition |
|-----------|-----------|
| ✅ Confirmation de RDV | `beneficiary_email` renseigné ET différent du client ET `beneficiary_notifications_enabled = true` |
| ⏰ Rappel de RDV | Idem |
| 📄 Nouveau document | Idem |
| 💬 Commentaire public | Idem |

**Pour activer les notifications au bénéficiaire** :

```typescript
// Lors de la création/modification du RDV
await supabase
  .from('appointments')
  .update({
    beneficiary_email: 'beneficiaire@example.com',
    beneficiary_first_name: 'Jean',
    beneficiary_last_name: 'Dupont',
    beneficiary_notifications_enabled: true  // ← Important !
  })
  .eq('id', appointmentId);
```

---

## 🎯 Prochaines améliorations possibles

- [ ] Ajouter un second rappel (ex: 2h avant)
- [ ] Permettre au client de configurer ses préférences de rappel
- [ ] Ajouter des rappels SMS via Twilio
- [ ] Dashboard admin pour visualiser les rappels envoyés
- [ ] Rappel personnalisé selon le type de service
- [ ] Notification push pour l'app mobile

---

## 📞 Support

Pour toute question :
- Consulter les logs : `email_logs_view` et `cron.job_run_details`
- Tester manuellement la fonction `send-reminders`
- Vérifier la configuration du CRON job
