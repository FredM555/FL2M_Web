# 📧 Configuration du Système d'Emails

## Vue d'ensemble

Le système d'emails permet d'envoyer automatiquement des notifications aux bénéficiaires :
- ✉️ **Confirmation de rendez-vous**
- ✉️ **Rappel 24h avant**
- ✉️ **Nouveau document disponible**
- ✉️ **Annulation de rendez-vous**

## 📋 Prérequis

### 1. Compte Resend.com

1. Créer un compte sur [https://resend.com](https://resend.com)
2. Gratuit jusqu'à **3000 emails/mois** (largement suffisant pour démarrer)
3. Excellente délivrabilité et interface simple

### 2. Vérification du Domaine (Recommandé)

Pour une meilleure délivrabilité, vérifiez votre domaine :

1. Dans Resend Dashboard → **Domains**
2. Ajouter votre domaine (ex: `fl2m-services.com`)
3. Ajouter les enregistrements DNS fournis :
   - SPF
   - DKIM
   - DMARC

**Sans domaine vérifié :** Les emails seront envoyés depuis `onboarding@resend.dev` (fonctionne mais moins professionnel)

## ⚙️ Installation

### Étape 1 : Exécuter la Migration SQL

```bash
# Connectez-vous à votre Supabase et exécutez :
supabase/migrations/20250117_add_beneficiary_email_phone.sql
```

Cette migration ajoute :
- `beneficiary_email` - Email du bénéficiaire (optionnel)
- `beneficiary_phone` - Téléphone du bénéficiaire (optionnel)
- `beneficiary_notifications_enabled` - Consentement RGPD (boolean)

### Étape 2 : Déployer la Edge Function

```bash
# Depuis la racine du projet
supabase functions deploy send-email
```

### Étape 3 : Configurer les Variables d'Environnement

Dans votre **Supabase Dashboard** → **Edge Functions** → **Environment variables** :

| Variable | Valeur | Description |
|----------|--------|-------------|
| `RESEND_API_KEY` | `re_xxxxx` | Clé API Resend (depuis resend.com/api-keys) |

Les autres variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) sont automatiquement disponibles.

### Étape 4 : Modifier l'Adresse d'Envoi

Dans `supabase/functions/send-email/index.ts`, ligne 62 :

```typescript
from: 'FL2M Services <noreply@VOTRE-DOMAINE.com>',  // ← Modifier ici
```

**Options :**
- Domaine vérifié : `noreply@fl2m-services.com`
- Sans domaine : `onboarding@resend.dev` (par défaut Resend)

## 🧪 Test du Système

### Test Manuel

Depuis la console Supabase SQL Editor :

```sql
-- Tester l'envoi d'un email
SELECT extensions.http((
  'POST',
  'https://VOTRE-PROJECT-REF.supabase.co/functions/v1/send-email',
  ARRAY[extensions.http_header('Authorization', 'Bearer VOTRE-ANON-KEY')],
  'application/json',
  '{"to":"votre-email@test.com","subject":"Test","html":"<h1>Test email</h1>"}'
)::extensions.http_request);
```

### Test depuis l'Application

1. Créer un rendez-vous
2. Dans l'onglet **Bénéficiaire**, ajouter :
   - Email du bénéficiaire
   - Cocher "Recevoir des notifications"
3. Sauvegarder → Un email de confirmation devrait être envoyé

## 📨 Types d'Emails Disponibles

### 1. Confirmation de Rendez-vous

**Quand ?** Lorsque le statut passe à `confirmed`

```typescript
import { sendAppointmentConfirmation } from './services/email';

await sendAppointmentConfirmation(
  appointment.beneficiary_email,
  appointment
);
```

### 2. Rappel 24h Avant

**Quand ?** Via un CRON job (à configurer)

```typescript
import { sendAppointmentReminder } from './services/email';

await sendAppointmentReminder(
  appointment.beneficiary_email,
  appointment
);
```

### 3. Nouveau Document

**Quand ?** Lors de l'upload d'un document public

```typescript
import { sendDocumentNotification } from './services/email';

await sendDocumentNotification(
  appointment.beneficiary_email,
  appointment,
  'Compte-rendu de séance.pdf'
);
```

### 4. Annulation

**Quand ?** Lorsque le statut passe à `cancelled`

```typescript
import { sendAppointmentCancellation } from './services/email';

await sendAppointmentCancellation(
  appointment.beneficiary_email,
  appointment
);
```

## 🔄 Automatisation avec Supabase Database Webhooks

Pour envoyer automatiquement les emails lors de changements, configurez des **Database Webhooks** :

### Webhook pour Confirmation de RDV

1. **Supabase Dashboard** → **Database** → **Webhooks**
2. Créer un nouveau webhook :
   - **Table :** `appointments`
   - **Events :** `UPDATE`
   - **Conditions :**
     ```sql
     old.status != 'confirmed' AND new.status = 'confirmed'
     AND new.beneficiary_notifications_enabled = true
     ```
   - **HTTP Request :**
     - **URL :** `https://VOTRE-PROJECT.supabase.co/functions/v1/send-confirmation-email`
     - **Method :** `POST`
     - **Headers :**
       ```json
       {
         "Authorization": "Bearer YOUR-ANON-KEY",
         "Content-Type": "application/json"
       }
       ```

## 📊 Monitoring des Emails

### Dashboard Resend

1. [https://resend.com/emails](https://resend.com/emails)
2. Voir tous les emails envoyés
3. Statut de délivrabilité
4. Taux d'ouverture (si activé)

### Logs Supabase

```sql
-- Créer une table pour logger les emails (optionnel)
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id),
  recipient VARCHAR(255) NOT NULL,
  email_type VARCHAR(50),
  subject TEXT,
  status VARCHAR(20), -- 'sent', 'failed', 'bounced'
  resend_id VARCHAR(100),
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  error_message TEXT
);

-- Voir les derniers emails envoyés
SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 50;
```

## 🛡️ Conformité RGPD

### Consentement

✅ **Implémenté :**
- Checkbox explicite pour accepter les notifications
- Email requis uniquement si notifications activées
- Stocké dans `beneficiary_notifications_enabled`

### Politique de Confidentialité

**À faire :** Ajouter dans votre politique de confidentialité :

```markdown
## Notifications par Email

Avec votre consentement, nous envoyons des emails de :
- Confirmation de rendez-vous
- Rappels
- Notifications de documents
- Annulations

Vous pouvez vous désabonner à tout moment en contactant contact@fl2m-services.com
```

### Désabonnement

Dans chaque email, un lien "Se désabonner" est présent. À implémenter :

```typescript
// Route pour désabonnement
app.get('/unsubscribe/:token', async (req, res) => {
  // Décoder le token pour trouver l'appointment
  // Mettre beneficiary_notifications_enabled = false
});
```

## 💰 Coûts

### Resend Gratuit (Plan Free)
- **3000 emails/mois**
- Pas de carte bancaire requise
- Parfait pour débuter

### Estimation pour 100 clients/mois
- 100 confirmations
- 100 rappels
- ~50 documents
- ~10 annulations
- **Total : ~260 emails/mois** → **100% gratuit**

### Si dépassement (Plan Pro - $20/mois)
- 50 000 emails/mois
- Support prioritaire
- Analytics avancés

## 🔧 Troubleshooting

### Emails non reçus

1. **Vérifier les logs Resend**
   - Dashboard → Emails → Rechercher l'email
   - Statut : Delivered / Bounced / Spam

2. **Vérifier les variables d'environnement**
   ```bash
   supabase secrets list
   ```

3. **Vérifier la Edge Function**
   ```bash
   supabase functions logs send-email
   ```

4. **Tester manuellement**
   ```bash
   curl -X POST 'https://VOTRE-PROJECT.supabase.co/functions/v1/send-email' \
     -H 'Authorization: Bearer YOUR-ANON-KEY' \
     -H 'Content-Type: application/json' \
     -d '{"to":"test@example.com","subject":"Test","html":"<h1>Test</h1>"}'
   ```

### Emails dans les spams

1. **Vérifier le domaine** : Utiliser un domaine vérifié
2. **SPF/DKIM/DMARC** : Configurer correctement les DNS
3. **Contenu** : Éviter les mots "spam triggers" (GRATUIT, !!!, etc.)
4. **Taux d'engagement** : Demander aux utilisateurs d'ajouter à leurs contacts

## 📚 Ressources

- [Documentation Resend](https://resend.com/docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Configuration DNS pour emails](https://resend.com/docs/send-with-nodejs#dns-records)

## 🎯 Prochaines Étapes

### Phase 1 : Configuration de Base ✅
- [x] Migration SQL
- [x] Edge Function créée
- [x] Templates d'emails créés
- [ ] Variables d'environnement configurées
- [ ] Edge Function déployée

### Phase 2 : Automatisation
- [ ] Webhook pour confirmation automatique
- [ ] CRON job pour rappels 24h avant
- [ ] Notification lors d'ajout de document
- [ ] Notification lors d'annulation

### Phase 3 : Amélioration
- [ ] Domaine vérifié
- [ ] Table email_logs
- [ ] Système de désabonnement
- [ ] Analytics d'ouverture
- [ ] A/B testing des templates

---

**Besoin d'aide ?** Consultez la [documentation Resend](https://resend.com/docs) ou les [logs Supabase](https://app.supabase.com/project/_/logs)
