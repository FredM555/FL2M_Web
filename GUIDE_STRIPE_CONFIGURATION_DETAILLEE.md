# 🎯 Guide Détaillé - Configuration Stripe (Pas à Pas)

**Temps estimé :** 20 minutes
**Prérequis :** Compte Stripe créé (gratuit)

---

## 📍 ÉTAPE 1 : Accéder au Dashboard Stripe

1. Aller sur : **https://dashboard.stripe.com**
2. Se connecter avec votre compte
3. **IMPORTANT :** En haut à gauche, vérifier que vous êtes en **"Mode test"** (toggle gris/bleu)
   ```
   🔵 Mode test  ← Doit être activé (fond bleu)
   ```

---

## 💰 ÉTAPE 2 : Créer les 3 Produits d'Abonnement

### 🔹 Produit 1 : STARTER (60€/mois)

#### A. Navigation
1. Dans le menu de gauche, cliquer sur **"Produits"** (ou "Products" en anglais)
2. Cliquer sur le bouton **"+ Ajouter un produit"** en haut à droite

#### B. Remplir le formulaire

**Section "Informations sur le produit" :**
```
Nom : Abonnement FLM Services - STARTER
Description : Forfait STARTER - Commission min(6€, 8%) - 3 premiers RDV gratuits
```

**Section "Modèle de tarification" :**
```
☑ Tarification standard

Prix : 60,00
Devise : EUR - Euro

☑ Récurrent
Période de facturation : Mensuelle

Type de facturation : Standard
```

#### C. Sauvegarder et copier le price_id

1. Cliquer sur **"Enregistrer le produit"** (en bas à droite)
2. Vous êtes redirigé vers la page du produit
3. Dans la section **"Tarification"**, vous verrez une ligne comme :
   ```
   60,00 € / mois    •    price_1QRs7xKkD...    ← C'EST ÇA !
   ```
4. **Cliquer sur le `price_xxx`** pour le copier

📝 **NOTER LE PRICE_ID :**
```
STARTER price_id = price_________________
```

---

### 🔹 Produit 2 : PRO (100€/mois)

#### Répéter les mêmes étapes avec :

**Informations :**
```
Nom : Abonnement FLM Services - PRO
Description : Forfait PRO - Commission 3€ fixe - 3 premiers RDV gratuits
Prix : 100,00 EUR
Récurrent : Mensuelle
```

📝 **NOTER LE PRICE_ID :**
```
PRO price_id = price_________________
```

---

### 🔹 Produit 3 : PREMIUM (160€/mois)

#### Répéter les mêmes étapes avec :

**Informations :**
```
Nom : Abonnement FLM Services - PREMIUM
Description : Forfait PREMIUM - 0€ commission - Tous les RDV gratuits
Prix : 160,00 EUR
Récurrent : Mensuelle
```

📝 **NOTER LE PRICE_ID :**
```
PREMIUM price_id = price_________________
```

---

## 🔑 ÉTAPE 3 : Récupérer les Clés API

### A. Navigation
1. Dans le menu de gauche, cliquer sur **"Développeurs"** (Developers)
2. Cliquer sur **"Clés API"** (API keys)

### B. Copier les clés

Vous verrez 2 clés :

#### 1. Clé publique (Publishable key)
```
Clé publique test :  pk_test_51QaF3d...........................
                     ^^^^^^^
                     Commence par pk_test_

[Bouton: Copier]     ← Cliquer ici
```

📝 **NOTER LA CLÉ PUBLIQUE :**
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_________________
```

#### 2. Clé secrète (Secret key)

⚠️ **ATTENTION :** La clé secrète est cachée par défaut

```
Clé secrète test :   sk_test_•••••••••••••••••••••

[Bouton: Révéler la clé de test]     ← Cliquer ici
```

Après avoir cliqué sur "Révéler" :
```
Clé secrète test :   sk_test_51QaF3d...........................
                     ^^^^^^^
                     Commence par sk_test_

[Bouton: Copier]     ← Cliquer ici
```

📝 **NOTER LA CLÉ SECRÈTE :**
```
STRIPE_SECRET_KEY=sk_test_________________
```

---

## 🔗 ÉTAPE 4 : Créer le Webhook (TRÈS IMPORTANT)

### A. Navigation
1. Toujours dans **"Développeurs"** (menu de gauche)
2. Cliquer sur **"Webhooks"**
3. Cliquer sur **"+ Ajouter un point de terminaison"** (Add endpoint)

### B. Configuration du webhook

#### 1. URL du point de terminaison

⚠️ **IMPORTANT :** Remplacer `[votre-projet]` par votre vrai projet ID Supabase

```
URL du point de terminaison :

https://[votre-projet].supabase.co/functions/v1/stripe-webhook

Exemple concret :
https://phokxjbocljahmbdkrbs.supabase.co/functions/v1/stripe-webhook
       ^^^^^^^^^^^^^^^^^^^^
       Votre projet ID Supabase (visible dans votre Dashboard Supabase)
```

**Comment trouver votre projet ID Supabase ?**
- Aller sur https://supabase.com/dashboard
- Votre URL complète est visible dans les paramètres du projet
- Format : `https://XXXXXXXX.supabase.co`

#### 2. Description (optionnelle)
```
Description : Webhook FLM Services - Gestion des paiements
```

#### 3. Sélectionner les événements

Cliquer sur **"Sélectionner les événements"** (Select events)

Une fenêtre s'ouvre avec une liste d'événements. Cocher les cases suivantes :

**Section "checkout" :**
```
☑ checkout.session.completed
```

**Section "customer" :**
```
☑ customer.subscription.created
☑ customer.subscription.updated
☑ customer.subscription.deleted
```

**Section "invoice" :**
```
☑ invoice.payment_succeeded
☑ invoice.payment_failed
```

**Section "payment_intent" :**
```
☑ payment_intent.succeeded
☑ payment_intent.payment_failed
```

**Section "transfer" :**
```
☑ transfer.created
☑ transfer.updated
```

Cliquer sur **"Ajouter les événements"** en bas de la fenêtre.

#### 4. Enregistrer le webhook

Cliquer sur **"Ajouter un point de terminaison"** (en bas à droite)

### C. Récupérer le Signing Secret (whsec_)

Après avoir créé le webhook, vous êtes redirigé vers sa page de détails.

#### Dans la section "Clé de signature" (Signing secret) :

```
Clé de signature :   whsec_•••••••••••••••••••••

[Bouton: Révéler]     ← Cliquer ici
```

Après avoir cliqué :
```
Clé de signature :   whsec_AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
                     ^^^^^^
                     Commence par whsec_

[Bouton: Copier]     ← Cliquer ici
```

📝 **NOTER LE WEBHOOK SECRET :**
```
STRIPE_WEBHOOK_SECRET=whsec_________________
```

---

## 📝 ÉTAPE 5 : Compléter le fichier .env.local

Maintenant que vous avez toutes les valeurs, ouvrez le fichier `.env.local` et complétez :

```bash
# ==========================================
# STRIPE (MODE TEST)
# ==========================================

# Clé publique (Frontend)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_[VOTRE_CLE_ICI]

# Clé secrète (Backend - NE PAS COMMITTER)
STRIPE_SECRET_KEY=sk_test_[VOTRE_CLE_ICI]

# Webhook Secret
STRIPE_WEBHOOK_SECRET=whsec_[VOTRE_SECRET_ICI]

# ==========================================
# STRIPE PRODUCTS IDs (Prix mensuels TEST)
# ==========================================

# STARTER: 60€/mois
STRIPE_STARTER_PRICE_ID=price_[VOTRE_PRICE_ID_STARTER]

# PRO: 100€/mois
STRIPE_PRO_PRICE_ID=price_[VOTRE_PRICE_ID_PRO]

# PREMIUM: 160€/mois
STRIPE_PREMIUM_PRICE_ID=price_[VOTRE_PRICE_ID_PREMIUM]
```

**Exemple avec de vraies valeurs :**
```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51QaF3dKkD8xY2zAbCdEfGhIjKlMnOpQrStUvWxYz
STRIPE_SECRET_KEY=sk_test_51QaF3dKkD8xY2zAbCdEfGhIjKlMnOpQrStUvWxYz
STRIPE_WEBHOOK_SECRET=whsec_AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
STRIPE_STARTER_PRICE_ID=price_1QRs7xKkD8xY2zAbCdEfGhI
STRIPE_PRO_PRICE_ID=price_1QRs8AKkD8xY2zAbCdEfGhJ
STRIPE_PREMIUM_PRICE_ID=price_1QRs8NKkD8xY2zAbCdEfGhK
```

---

## ✅ ÉTAPE 6 : Vérification

### Checklist finale

- [ ] 3 produits créés dans Stripe (STARTER, PRO, PREMIUM)
- [ ] 3 `price_id` copiés et notés
- [ ] Clé publique `pk_test_` copiée
- [ ] Clé secrète `sk_test_` copiée
- [ ] Webhook créé avec la bonne URL
- [ ] 9 événements cochés dans le webhook
- [ ] Signing secret `whsec_` copié
- [ ] Fichier `.env.local` complété

### Vérifier que tout fonctionne

Dans le Dashboard Stripe, vérifier :

**1. Produits :**
```
Produits → Vous devriez voir 3 produits :
✅ Abonnement FLM Services - STARTER (60,00 €/mois)
✅ Abonnement FLM Services - PRO (100,00 €/mois)
✅ Abonnement FLM Services - PREMIUM (160,00 €/mois)
```

**2. Webhook :**
```
Développeurs → Webhooks → Vous devriez voir :
✅ https://[votre-projet].supabase.co/functions/v1/stripe-webhook
   Statut : Actif
   Événements : 9 événements écoutés
```

---

## 🚨 Problèmes courants

### ❌ "Je ne trouve pas les price_id"

**Solution :**
1. Aller dans "Produits"
2. Cliquer sur le produit (ex: "Abonnement FLM Services - STARTER")
3. Dans la section "Tarification", cliquer sur le prix (60,00 €/mois)
4. L'URL change et contient le price_id :
   ```
   https://dashboard.stripe.com/test/prices/price_1QRs7x...
                                                 ^^^^^^^^^^^
                                                 C'est ici !
   ```

### ❌ "Le webhook ne fonctionne pas"

**Vérifications :**
1. L'URL contient-elle bien `/functions/v1/stripe-webhook` ?
2. Le projet Supabase est-il bien le bon ?
3. Les 9 événements sont-ils cochés ?
4. Le webhook est-il en mode TEST (pas en mode LIVE) ?

### ❌ "Je ne vois pas le Signing Secret"

**Solution :**
1. Aller dans "Développeurs" → "Webhooks"
2. Cliquer sur votre webhook dans la liste
3. Scroller vers le bas jusqu'à "Clé de signature"
4. Cliquer sur "Révéler"

---

## 📱 Prochaine étape

Une fois toutes les valeurs récupérées et `.env.local` complété :

**Passer à l'étape suivante :** Déploiement des Edge Functions et de la base de données

Voir le fichier `GUIDE_DEPLOIEMENT_STRIPE.md` section "Déploiement"

---

## 💡 Astuces

### Tester vos clés API

Vous pouvez tester rapidement si vos clés fonctionnent :

```bash
# Test de la clé secrète (via curl)
curl https://api.stripe.com/v1/customers \
  -u sk_test_VOTRE_CLE:

# Si ça fonctionne, vous recevrez une liste vide : {"data": [], ...}
# Si erreur, vérifier que la clé est correcte
```

### Stripe CLI (optionnel)

Pour tester les webhooks en local :

```bash
# Installer Stripe CLI
npm install -g stripe

# Se connecter
stripe login

# Écouter les webhooks localement
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook
```

Cela génère un `whsec_` temporaire pour le développement local.

---

**✅ Configuration Stripe terminée !**

Vous êtes maintenant prêt pour déployer les Edge Functions et tester le système de paiement.
