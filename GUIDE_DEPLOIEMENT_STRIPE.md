# 🚀 Guide de Déploiement - Système de Paiement Stripe

**Date :** 2025-12-05
**Version :** 1.0
**Statut :** Implémentation complète en mode TEST

---

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Prérequis](#prérequis)
3. [Configuration Stripe](#configuration-stripe)
4. [Configuration des variables d'environnement](#configuration-des-variables-denvironnement)
5. [Déploiement de la base de données](#déploiement-de-la-base-de-données)
6. [Déploiement des Edge Functions](#déploiement-des-edge-functions)
7. [Configuration du CRON job](#configuration-du-cron-job)
8. [Tests](#tests)
9. [Passage en production](#passage-en-production)
10. [Dépannage](#dépannage)

---

## 📊 Vue d'ensemble

### Fonctionnalités implémentées

✅ **Paiement des abonnements intervenants**
- Paiement mensuel via Stripe Checkout
- 3 formules : Starter (60€), Pro (100€), Premium (160€)
- Renouvellement automatique
- Activation automatique du contrat après paiement

✅ **Paiement des rendez-vous**
- Paiement par carte bancaire via Stripe Checkout
- Calcul automatique des commissions selon le contrat de l'intervenant
- Support des prix personnalisés par créneau

✅ **Redistribution aux intervenants**
- Système de validation client
- Transfert immédiat si validation positive
- Transfert automatique 48h après le rendez-vous si pas de validation
- CRON job pour traiter les paiements éligibles

✅ **Validation client**
- Interface de validation après chaque rendez-vous
- Possibilité de signaler un problème
- Suspension du paiement en cas de problème signalé

---

## 🔧 Prérequis

### Comptes et services

- [ ] Compte Stripe (mode TEST pour commencer)
- [ ] Projet Supabase configuré
- [ ] Accès au Supabase CLI

### Outils

```bash
# Supabase CLI
npm install -g supabase

# Vérifier l'installation
supabase --version
```

---

## 💳 Configuration Stripe

### 1. Créer un compte Stripe TEST

1. Aller sur https://dashboard.stripe.com
2. S'assurer d'être en **Mode Test** (toggle en haut à gauche)
3. Le mode test utilise des clés commençant par `pk_test_` et `sk_test_`

### 2. Créer les produits d'abonnement

Dans le Dashboard Stripe, aller dans **Produits** → **Créer un produit**

#### Produit 1 : STARTER
```
Nom : Abonnement FLM Services - STARTER
Prix : 60.00 EUR / mois (récurrent)
Description : Commission min(6€, 8%) - 3 premiers RDV gratuits
```
📝 **Copier le `price_id`** (commence par `price_`)

#### Produit 2 : PRO
```
Nom : Abonnement FLM Services - PRO
Prix : 100.00 EUR / mois (récurrent)
Description : Commission 3€ fixe - 3 premiers RDV gratuits
```
📝 **Copier le `price_id`**

#### Produit 3 : PREMIUM
```
Nom : Abonnement FLM Services - PREMIUM
Prix : 160.00 EUR / mois (récurrent)
Description : 0€ commission - Tous les RDV gratuits
```
📝 **Copier le `price_id`**

### 3. Récupérer les clés API

Dans **Développeurs** → **Clés API**

- **Clé publique** : `pk_test_...` (pour le frontend)
- **Clé secrète** : `sk_test_...` (pour le backend)

### 4. Configurer le Webhook

Dans **Développeurs** → **Webhooks** → **Ajouter un point de terminaison**

**URL :** `https://[votre-projet].supabase.co/functions/v1/stripe-webhook`

**Événements à écouter :**
- ✅ `checkout.session.completed`
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`
- ✅ `payment_intent.succeeded`
- ✅ `payment_intent.payment_failed`
- ✅ `transfer.created`
- ✅ `transfer.updated`

📝 **Copier le `whsec_`** (Signing Secret)

---

## 🔐 Configuration des variables d'environnement

### Fichier `.env.local` (Frontend)

```bash
# Supabase
VITE_SUPABASE_URL=https://[votre-projet].supabase.co
VITE_SUPABASE_ANON_KEY=votre_anon_key

# Stripe - Clé publique (mode TEST)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_XXXXX

# Stripe - IDs des prix (mode TEST)
STRIPE_STARTER_PRICE_ID=price_XXXXX
STRIPE_PRO_PRICE_ID=price_XXXXX
STRIPE_PREMIUM_PRICE_ID=price_XXXXX
```

### Variables Supabase (Backend)

Dans le dashboard Supabase, aller dans **Project Settings** → **Edge Functions** → **Secrets**

```bash
# Ajouter les secrets
supabase secrets set STRIPE_SECRET_KEY=sk_test_XXXXX
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_XXXXX
```

---

## 🗄️ Déploiement de la base de données

### 1. Appliquer la migration des validations

```bash
# Se connecter à Supabase
supabase login

# Lier le projet
supabase link --project-ref [votre-projet-ref]

# Appliquer la migration
supabase db push
```

Ou via SQL directement :

```bash
psql -h db.[votre-projet].supabase.co -U postgres -d postgres -f supabase/migrations/create_appointment_validations.sql
```

### 2. Vérifier les tables créées

```sql
-- Vérifier que les tables existent
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('appointment_validations', 'transactions', 'subscription_payments', 'payouts');
```

### 3. Ajouter une colonne stripe_customer_id aux profiles (si nécessaire)

```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer
ON public.profiles(stripe_customer_id);
```

---

## ☁️ Déploiement des Edge Functions

### 1. Structure des fonctions

```
supabase/functions/
├── stripe-create-subscription-checkout/
│   └── index.ts
├── stripe-create-appointment-payment/
│   └── index.ts
├── stripe-webhook/
│   └── index.ts
├── validate-appointment/
│   └── index.ts
└── process-payouts/
    └── index.ts
```

### 2. Déployer les fonctions

```bash
# Déployer toutes les fonctions en une fois
supabase functions deploy stripe-create-subscription-checkout --no-verify-jwt
supabase functions deploy stripe-create-appointment-payment --no-verify-jwt
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy validate-appointment
supabase functions deploy process-payouts
```

### 3. Vérifier les déploiements

Dans le Dashboard Supabase, aller dans **Edge Functions**

Vous devriez voir :
- ✅ stripe-create-subscription-checkout
- ✅ stripe-create-appointment-payment
- ✅ stripe-webhook
- ✅ validate-appointment
- ✅ process-payouts

---

## ⏰ Configuration du CRON job

La fonction `process-payouts` doit être appelée régulièrement pour traiter les paiements éligibles.

### Option 1 : CRON Supabase (Recommandé)

Dans le Dashboard Supabase, aller dans **Database** → **Cron Jobs**

```sql
-- Créer un cron job qui s'exécute toutes les heures
SELECT cron.schedule(
  'process-payouts-hourly',
  '0 * * * *', -- Toutes les heures à la minute 0
  $$
  SELECT net.http_post(
    url := 'https://[votre-projet].supabase.co/functions/v1/process-payouts',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
```

### Option 2 : Service externe (GitHub Actions, Vercel Cron, etc.)

Créer un endpoint qui appelle la fonction process-payouts régulièrement.

---

## 🧪 Tests

### 1. Tester le paiement d'abonnement intervenant

1. Créer un compte intervenant
2. Choisir un forfait payant (Starter, Pro, ou Premium)
3. Utiliser une carte de test Stripe :
   ```
   Numéro : 4242 4242 4242 4242
   Date : 12/25 (ou toute date future)
   CVC : 123 (ou tout nombre à 3 chiffres)
   ```
4. Vérifier que :
   - ✅ Le paiement est accepté
   - ✅ Le contrat passe en statut `active`
   - ✅ Une ligne est créée dans `subscription_payments`

### 2. Tester le paiement d'un rendez-vous

1. Réserver un rendez-vous payant
2. Utiliser la carte de test Stripe
3. Vérifier que :
   - ✅ Le paiement est accepté
   - ✅ Une transaction est créée
   - ✅ Le rendez-vous est confirmé
   - ✅ La date d'éligibilité au transfert est définie (48h après)

### 3. Tester la validation client

1. Après un rendez-vous, aller dans "Mes rendez-vous"
2. Voir la carte de validation
3. Cliquer sur "Tout s'est bien passé"
4. Vérifier que :
   - ✅ Une validation est créée
   - ✅ La transaction passe en `eligible` immédiatement
   - ✅ Le transfert sera traité au prochain CRON

### 4. Tester la redistribution automatique

1. Appeler manuellement la fonction :
   ```bash
   curl -X POST https://[votre-projet].supabase.co/functions/v1/process-payouts \
     -H "Authorization: Bearer [votre-service-role-key]"
   ```
2. Vérifier que :
   - ✅ Les transactions éligibles sont traitées
   - ✅ Les transferts Stripe sont créés
   - ✅ Les transactions passent en `completed`

### 5. Cartes de test Stripe

```
✅ Paiement réussi : 4242 4242 4242 4242
❌ Paiement échoué : 4000 0000 0000 0002
🔐 3D Secure : 4000 0025 0000 3155
```

Plus de cartes : https://stripe.com/docs/testing

---

## 🚀 Passage en production

### 1. Activer le compte Stripe en mode Live

1. Dans le Dashboard Stripe, compléter les informations de vérification
2. Activer le compte pour recevoir des paiements réels
3. Basculer en **Mode Live** (toggle en haut à gauche)

### 2. Récupérer les nouvelles clés

- **Clé publique Live** : `pk_live_...`
- **Clé secrète Live** : `sk_live_...`

### 3. Créer les produits en mode Live

Recréer les 3 produits (STARTER, PRO, PREMIUM) en mode Live et récupérer les nouveaux `price_id`.

### 4. Configurer le webhook en mode Live

Créer un nouveau webhook pointant vers la même URL mais en mode Live.

Récupérer le nouveau `whsec_...`

### 5. Mettre à jour les variables d'environnement

```bash
# Frontend (.env.local)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_XXXXX
STRIPE_STARTER_PRICE_ID=price_live_XXXXX
STRIPE_PRO_PRICE_ID=price_live_XXXXX
STRIPE_PREMIUM_PRICE_ID=price_live_XXXXX

# Backend (Supabase Secrets)
supabase secrets set STRIPE_SECRET_KEY=sk_live_XXXXX
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_live_XXXXX
```

### 6. Rebuild et redéployer

```bash
# Rebuild le frontend
npm run build

# Redéployer les Edge Functions (les secrets sont mis à jour automatiquement)
supabase functions deploy stripe-create-subscription-checkout --no-verify-jwt
supabase functions deploy stripe-create-appointment-payment --no-verify-jwt
supabase functions deploy stripe-webhook --no-verify-jwt
```

---

## 🔍 Dépannage

### Erreur : "API key is invalid"

**Cause :** La clé Stripe est incorrecte ou expirée

**Solution :**
- Vérifier que la clé commence par `sk_test_` (test) ou `sk_live_` (prod)
- Copier/coller à nouveau depuis le Dashboard Stripe
- Vérifier qu'il n'y a pas d'espaces avant/après

### Erreur : "Webhook signature verification failed"

**Cause :** Le secret du webhook est incorrect

**Solution :**
- Vérifier que `STRIPE_WEBHOOK_SECRET` correspond au webhook créé
- Recréer le webhook si nécessaire
- En local, utiliser Stripe CLI :
  ```bash
  stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
  ```

### Erreur : "Price ID not found"

**Cause :** Le `price_id` est incorrect ou appartient à un autre mode (test/live)

**Solution :**
- Vérifier que le produit existe dans le bon mode (test ou live)
- Copier/coller à nouveau le `price_id`
- S'assurer de la cohérence test/live

### Les transferts ne sont pas exécutés

**Cause :** Le CRON job n'est pas configuré ou ne fonctionne pas

**Solution :**
- Vérifier que le CRON job existe dans Supabase
- Tester manuellement l'Edge Function `process-payouts`
- Vérifier les logs dans le Dashboard Supabase

### La validation client ne fonctionne pas

**Cause :** Le rendez-vous n'est pas encore terminé ou pas de transaction associée

**Solution :**
- Vérifier que le rendez-vous est passé (`end_time < now()`)
- Vérifier qu'une transaction existe pour ce rendez-vous
- Vérifier qu'il n'y a pas déjà une validation

---

## 📚 Ressources

### Documentation officielle

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Testing](https://stripe.com/docs/testing)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

### Fichiers du projet

- `src/services/stripe.ts` - Service Stripe frontend
- `src/types/payments.ts` - Types et configuration des contrats
- `supabase/functions/` - Edge Functions Stripe
- `supabase/migrations/create_appointment_validations.sql` - Migration

---

## ✅ Checklist de déploiement

### Mode TEST

- [ ] Compte Stripe créé et en mode TEST
- [ ] 3 produits créés avec `price_id` récupérés
- [ ] Clés API récupérées (`pk_test_`, `sk_test_`)
- [ ] Webhook configuré avec `whsec_` récupéré
- [ ] Variables d'environnement configurées (frontend + backend)
- [ ] Migration de base de données appliquée
- [ ] Edge Functions déployées
- [ ] CRON job configuré
- [ ] Tests réussis (abonnement + rendez-vous + validation)

### Passage en PRODUCTION

- [ ] Compte Stripe vérifié et activé en mode LIVE
- [ ] 3 produits recréés en mode LIVE
- [ ] Nouvelles clés API récupérées (`pk_live_`, `sk_live_`)
- [ ] Nouveau webhook configuré en mode LIVE
- [ ] Variables d'environnement mises à jour
- [ ] Frontend rebuild et redéployé
- [ ] Edge Functions redéployées
- [ ] Tests en production réussis

---

**🎉 Félicitations ! Le système de paiement Stripe est opérationnel !**

Pour toute question, consulter la documentation ou contacter le support technique.
