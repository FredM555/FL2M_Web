# 💳 Guide de Configuration Stripe - Pas à Pas

**Temps estimé :** 30-45 minutes
**Prérequis :** Un compte email valide

---

## 🎯 Objectif

Configurer Stripe Connect pour gérer les paiements et commissions selon le Modèle D avec 4 types de contrats.

---

## 📋 Checklist Rapide

- [ ] Créer/configurer compte Stripe
- [ ] Activer Stripe Connect
- [ ] Créer les 3 produits mensuels
- [ ] Récupérer les clés API
- [ ] Configurer le webhook
- [ ] Mettre à jour .env.local

---

## 1️⃣ Créer et Configurer le Compte Stripe (5 min)

### A. Créer un compte
1. Aller sur https://dashboard.stripe.com/register
2. S'inscrire avec votre email professionnel
3. Compléter les informations de votre entreprise

### B. Activer le mode Test
1. En haut à gauche, vérifier que le toggle est sur **"Mode test"**
2. Pour le moment, rester en mode test (clés commençant par `_test_`)

### C. Activer Stripe Connect
1. Dans le menu de gauche : **Connect** → **Paramètres**
2. Cliquer sur **Activer**
3. Type de plateforme : **Custom** ou **Standard**
   - **Recommandé :** Custom (plus de contrôle)
4. Suivre l'assistant de configuration

---

## 2️⃣ Créer les 3 Produits Mensuels (15 min)

### Navigation
**Dashboard → Produits → Créer un produit**

### Produit 1 : STARTER

**Informations du produit :**
- Nom : `Contrat STARTER`
- Description : `Abonnement mensuel STARTER - Commission min(6€, 8%) - 3 premiers RDV gratuits`
- Image : (optionnel)

**Tarification :**
- Modèle de tarification : **Récurrent**
- Prix : `60.00 EUR`
- Période de facturation : **Mensuel**
- Type : **Standard**

**Cliquer sur "Enregistrer le produit"**

📝 **IMPORTANT :** Noter le `price_id` qui apparaît (commence par `price_`)

---

### Produit 2 : PRO

**Informations du produit :**
- Nom : `Contrat PRO`
- Description : `Abonnement mensuel PRO - Commission 3€ fixe - 3 premiers RDV gratuits`

**Tarification :**
- Prix : `100.00 EUR`
- Période : **Mensuel**

**Cliquer sur "Enregistrer le produit"**

📝 **IMPORTANT :** Noter le `price_id`

---

### Produit 3 : PREMIUM

**Informations du produit :**
- Nom : `Contrat PREMIUM`
- Description : `Abonnement mensuel PREMIUM - 0€ commission - Tous les RDV gratuits`

**Tarification :**
- Prix : `160.00 EUR`
- Période : **Mensuel**

**Cliquer sur "Enregistrer le produit"**

📝 **IMPORTANT :** Noter le `price_id`

---

### Note sur le Contrat "Sans Engagement"

Le contrat **Sans Engagement** (0€/mois) n'a **pas besoin** de produit Stripe car il n'y a pas d'abonnement mensuel. La commission est calculée uniquement sur chaque rendez-vous.

---

## 3️⃣ Récupérer les Clés API (5 min)

### Navigation
**Dashboard → Développeurs → Clés API**

### Clés à copier

1. **Clé publique** (Publishable key)
   - Commence par `pk_test_...`
   - Visible à tous
   - Utilisée côté frontend
   - 📋 Copier dans : `VITE_STRIPE_PUBLISHABLE_KEY`

2. **Clé secrète** (Secret key)
   - Commence par `sk_test_...`
   - ⚠️ À garder SECRÈTE
   - Utilisée côté backend
   - 📋 Copier dans : `STRIPE_SECRET_KEY`

---

## 4️⃣ Configurer le Webhook (15 min)

### Pourquoi un Webhook ?

Le webhook permet à Stripe de notifier votre application lorsqu'un événement se produit (paiement réussi, échec, etc.).

### A. Créer le Webhook

**Navigation :** Dashboard → Développeurs → Webhooks

1. Cliquer sur **"Ajouter un point de terminaison"**

2. **URL du point de terminaison :**
   - **Local (développement) :** `http://localhost:5173/api/webhooks/stripe`
   - **Production :** `https://votre-domaine.com/api/webhooks/stripe`

3. **Description :** `Webhook pour les paiements FLM Services`

4. **Événements à écouter :**
   - Cliquer sur **"Sélectionner les événements"**
   - Rechercher et cocher :
     - ✅ `payment_intent.succeeded`
     - ✅ `payment_intent.payment_failed`
     - ✅ `checkout.session.completed`
     - ✅ `customer.subscription.created`
     - ✅ `customer.subscription.updated`
     - ✅ `customer.subscription.deleted`
     - ✅ `account.updated` (pour Connect)
     - ✅ `transfer.created` (pour Connect)
     - ✅ `transfer.updated` (pour Connect)

5. Cliquer sur **"Ajouter un point de terminaison"**

### B. Récupérer le Secret du Webhook

1. Cliquer sur le webhook que vous venez de créer
2. Dans la section **"Clé de signature"**, cliquer sur **"Révéler"**
3. Copier la valeur (commence par `whsec_...`)
4. 📋 Copier dans : `STRIPE_WEBHOOK_SECRET`

---

## 5️⃣ Configurer Stripe CLI (Optionnel - Pour développement local)

### Installation

**Windows (via Scoop) :**
```bash
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
scoop install stripe
```

**Mac (via Homebrew) :**
```bash
brew install stripe/stripe-cli/stripe
```

### Connexion

```bash
stripe login
```

### Écouter les webhooks localement

```bash
stripe listen --forward-to localhost:5173/api/webhooks/stripe
```

Ceci créera un secret temporaire que vous pourrez utiliser pour `STRIPE_WEBHOOK_SECRET` en développement.

---

## 6️⃣ Mettre à Jour .env.local (5 min)

Ouvrir le fichier `.env.local` et ajouter/modifier :

```bash
# ==========================================
# STRIPE
# ==========================================

# Clés API
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_XXXXX
STRIPE_SECRET_KEY=sk_test_XXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXX

# Product IDs (Prix mensuels)
STRIPE_STARTER_PRICE_ID=price_XXXXX  # 60€/mois
STRIPE_PRO_PRICE_ID=price_XXXXX      # 100€/mois
STRIPE_PREMIUM_PRICE_ID=price_XXXXX  # 160€/mois
```

**Remplacer les `XXXXX` par vos vraies valeurs !**

---

## ✅ Vérification de la Configuration

### Test 1 : Vérifier les Clés API

Dans votre terminal :

```bash
# Test de la clé secrète
curl https://api.stripe.com/v1/customers \
  -u sk_test_VOTRE_CLE_SECRETE:

# Devrait retourner une liste vide de clients (pas d'erreur)
```

### Test 2 : Vérifier les Produits

Dans Stripe Dashboard :
1. Aller dans **Produits**
2. Vous devriez voir vos 3 produits :
   - ✅ Contrat STARTER (60€)
   - ✅ Contrat PRO (100€)
   - ✅ Contrat PREMIUM (160€)

### Test 3 : Vérifier le Webhook

1. Aller dans **Développeurs → Webhooks**
2. Vous devriez voir votre webhook avec le statut **"Actif"**

---

## 🚀 Prochaine Étape

Maintenant que Stripe est configuré, vous pouvez :

1. **Déployer les migrations SQL** (voir `ETAT_AVANCEMENT_COMMISSIONS.md`)
2. **Tester le système de paiement** localement
3. **Créer des tests de paiement** avec les cartes de test Stripe

---

## 💳 Cartes de Test Stripe

Pour tester les paiements en mode test :

**Paiement réussi :**
```
Numéro : 4242 4242 4242 4242
Date : N'importe quelle date future (ex: 12/25)
CVC : N'importe quel 3 chiffres (ex: 123)
```

**Paiement échoué :**
```
Numéro : 4000 0000 0000 0002
Date : N'importe quelle date future
CVC : N'importe quel 3 chiffres
```

**Authentification 3D Secure :**
```
Numéro : 4000 0025 0000 3155
Date : N'importe quelle date future
CVC : N'importe quel 3 chiffres
```

Plus de cartes de test : https://stripe.com/docs/testing

---

## 📚 Ressources

### Documentation Officielle Stripe
- [Stripe Connect Guide](https://stripe.com/docs/connect)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Testing](https://stripe.com/docs/testing)

### Documentation Projet
- `docs/STRIPE_CONNECT_IMPLEMENTATION.md` - Guide technique complet
- `docs/MODELE_D_FINAL.md` - Modèle de commission
- `ETAT_AVANCEMENT_COMMISSIONS.md` - État d'avancement

---

## ❓ Troubleshooting

### Problème : "API key is invalid"

**Solution :**
- Vérifier que la clé commence bien par `sk_test_` ou `pk_test_`
- Vérifier qu'il n'y a pas d'espaces avant/après la clé
- Vérifier que vous êtes bien en mode Test dans le dashboard

### Problème : "Webhook signature verification failed"

**Solution :**
- Vérifier que `STRIPE_WEBHOOK_SECRET` correspond bien au webhook créé
- Vérifier que l'URL du webhook est correcte
- En développement local, utiliser Stripe CLI

### Problème : "Price ID not found"

**Solution :**
- Vérifier que le `price_id` copié est correct (commence par `price_`)
- Vérifier que le produit existe bien dans le dashboard
- Vérifier que vous êtes en mode Test/Live cohérent

---

## ✅ Checklist Finale

Avant de passer à la suite, vérifier que :

- [ ] Compte Stripe créé et en mode Test
- [ ] Stripe Connect activé
- [ ] 3 produits créés (STARTER 60€, PRO 100€, PREMIUM 160€)
- [ ] Les 3 `price_id` notés
- [ ] Clés API copiées (`pk_test_` et `sk_test_`)
- [ ] Webhook créé et configuré
- [ ] Secret du webhook copié (`whsec_`)
- [ ] Fichier `.env.local` mis à jour avec toutes les valeurs
- [ ] Test API réussi (pas d'erreur d'authentification)

---

**🎉 Configuration Stripe terminée !**

**Prochaine étape :** Déployer les migrations SQL (voir `ETAT_AVANCEMENT_COMMISSIONS.md`)

---

**Date de création :** 2025-11-29
**Dernière mise à jour :** 2025-11-29
