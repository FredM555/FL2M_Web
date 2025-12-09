# Configuration Email de Contestation

Ce document explique comment configurer l'envoi d'emails automatiques lors des contestations de rendez-vous.

## ✅ Ce qui a été créé

1. **Fonction Edge** : `supabase/functions/send-contestation-email/index.ts`
2. **Table BDD** : `admin_notifications` pour stocker les notifications
3. **Service Frontend** : `sendContestationEmail()` dans `stripe.ts`

## 📋 Étapes de configuration

### 1. Créer un compte Resend (Gratuit)

1. Aller sur [https://resend.com](https://resend.com)
2. Créer un compte gratuit (100 emails/jour gratuits)
3. Vérifier votre email

### 2. Configurer le domaine

**Option A - Domaine personnalisé (Recommandé)** :
1. Aller dans "Domains" dans Resend
2. Ajouter `fl2m.fr`
3. Ajouter les enregistrements DNS fournis par Resend
4. Attendre la vérification (quelques minutes)

**Option B - Domaine Resend (Test uniquement)** :
- Utiliser `onboarding@resend.dev` pour les tests
- Limité à votre propre email

### 3. Créer une clé API Resend

1. Aller dans "API Keys" dans Resend
2. Créer une nouvelle clé
3. Copier la clé (elle ne sera affichée qu'une fois !)
4. Format : `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 4. Configurer Supabase

#### A. Ajouter la variable d'environnement

```bash
# Via Supabase CLI
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# OU via le Dashboard Supabase
# Project Settings → Edge Functions → Add secret
# Name: RESEND_API_KEY
# Value: re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### B. Appliquer la migration SQL

```bash
# Créer la table admin_notifications
npx supabase db push
```

Ou exécutez manuellement le fichier :
`supabase/migrations/20251208220000_create_admin_notifications.sql`

#### C. Déployer la fonction Edge

```bash
npx supabase functions deploy send-contestation-email
```

### 5. Configurer l'email destinataire

Pour changer l'email destinataire, éditez le fichier :
`supabase/functions/send-contestation-email/index.ts`

Ligne ~180 :
```typescript
to: ['contact@fl2m.fr'], // Changez ici
```

Puis redéployez :
```bash
npx supabase functions deploy send-contestation-email
```

## 🧪 Tester

1. Créer un rendez-vous de test
2. Le marquer comme `completed`
3. Le contester depuis l'interface
4. Vérifier :
   - Email reçu à `contact@fl2m.fr`
   - Notification créée dans `admin_notifications`
   - Log visible dans Supabase Functions logs

## 📧 Format de l'email

L'email contient :
- 🚨 Sujet : Contestation RDV [CODE]
- Informations du RDV (code, client, intervenant, service, date)
- Description du problème
- Lien vers le dashboard admin

## 🔍 Monitoring

### Logs Supabase
```bash
# Voir les logs de la fonction
supabase functions logs send-contestation-email --project-ref [YOUR_PROJECT_REF]
```

### Resend Dashboard
- Voir les emails envoyés
- Statistiques de livraison
- Bounces et erreurs

## ❌ Troubleshooting

### L'email n'arrive pas

1. **Vérifier les logs Supabase** :
   - Dashboard → Functions → send-contestation-email → Logs
   - Chercher les erreurs

2. **Vérifier la clé API Resend** :
   ```bash
   supabase secrets list
   ```

3. **Vérifier le domaine** :
   - Resend Dashboard → Domains
   - Status doit être "Verified"

4. **Vérifier les spams** :
   - L'email peut être dans les spams

### Erreur 401 Unauthorized

- La clé API Resend est incorrecte ou expirée
- Recréer une clé dans Resend Dashboard

### Erreur 400 Bad Request

- Le domaine n'est pas vérifié
- Utiliser `onboarding@resend.dev` pour les tests

## 💡 Améliorations futures

1. **Templates HTML personnalisés** dans Resend
2. **Notifications multi-destinataires** (plusieurs admins)
3. **Webhooks Resend** pour tracking de livraison
4. **Résumé quotidien** des contestations
5. **Interface admin** pour voir les notifications

## 📚 Documentation

- [Resend Docs](https://resend.com/docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Secrets](https://supabase.com/docs/guides/functions/secrets)
