# Configuration des Abonnements Stripe pour FL2M Services

Ce document explique comment configurer les 4 forfaits d'abonnement pour les intervenants dans Stripe.

## Vue d'ensemble

FL2M Services propose 4 forfaits d'abonnement mensuels pour les intervenants :

| Forfait | Prix mensuel | Limite RDV/mois | Commission | RDV gratuits/mois |
|---------|--------------|-----------------|------------|-------------------|
| 🌱 Découverte | 9€ | 10 | 12% (min 10€, max 25€) | 0 |
| 🚀 Starter | 49€ | 20 | 8% (min 6€, max 25€) | 2 |
| 💼 Pro | 99€ | Illimité | 3€ fixe | 4 |
| 👑 Premium | 159€ | Illimité | 0€ | 0 (tous gratuits) |

## Étapes de configuration dans Stripe

### 1. Créer les produits dans Stripe Dashboard

1. Connectez-vous à votre [Stripe Dashboard](https://dashboard.stripe.com/)
2. Allez dans **Produits** → **Ajouter un produit**
3. Créez les 4 produits suivants :

#### Produit 1: Forfait Découverte
- **Nom** : Forfait Découverte - FL2M Services
- **Description** : Pour débuter en douceur, avec un coût minimal. 10 RDV max/mois, commission 12% (min 10€, max 25€)
- **Prix** :
  - Modèle de tarification : **Récurrent**
  - Prix : **9,00 EUR**
  - Période de facturation : **Mensuel**
  - Type de prix : **Standard**

#### Produit 2: Forfait Starter
- **Nom** : Forfait Starter - FL2M Services
- **Description** : Pour les praticiens réguliers qui veulent optimiser leurs coûts. 20 RDV max/mois, commission 8% (min 6€, max 25€), 2 premiers RDV gratuits/mois
- **Prix** :
  - Modèle de tarification : **Récurrent**
  - Prix : **49,00 EUR**
  - Période de facturation : **Mensuel**
  - Type de prix : **Standard**

#### Produit 3: Forfait Pro
- **Nom** : Forfait Pro - FL2M Services
- **Description** : Pour les praticiens installés qui veulent maîtriser leurs coûts. RDV illimités, commission 3€ fixe, 4 premiers RDV gratuits/mois
- **Prix** :
  - Modèle de tarification : **Récurrent**
  - Prix : **99,00 EUR**
  - Période de facturation : **Mensuel**
  - Type de prix : **Standard**

#### Produit 4: Forfait Premium
- **Nom** : Forfait Premium - FL2M Services
- **Description** : Pour les professionnels très actifs—zéro limite, zéro commission. RDV illimités, 0€ de commission
- **Prix** :
  - Modèle de tarification : **Récurrent**
  - Prix : **159,00 EUR**
  - Période de facturation : **Mensuel**
  - Type de prix : **Standard**

### 2. Récupérer les Price IDs

Après avoir créé chaque produit, vous aurez un **Price ID** qui commence par `price_`.

1. Cliquez sur chaque produit
2. Copiez le **Price ID** (ex: `price_1234567890abcdef`)
3. Notez-les pour l'étape suivante

### 3. Configurer les variables d'environnement

Ajoutez les Price IDs dans votre fichier `.env` :

```env
# Stripe Price IDs pour les abonnements intervenants
VITE_STRIPE_DECOUVERTE_PRICE_ID=price_xxxxxxxxxxxxx
VITE_STRIPE_STARTER_PRICE_ID=price_xxxxxxxxxxxxx
VITE_STRIPE_PRO_PRICE_ID=price_xxxxxxxxxxxxx
VITE_STRIPE_PREMIUM_PRICE_ID=price_xxxxxxxxxxxxx
```

### 4. Configuration du Webhook Stripe

Le webhook est déjà configuré dans `supabase/functions/stripe-webhook/index.ts` pour gérer :

- ✅ `checkout.session.completed` - Activation des contrats
- ✅ `customer.subscription.created` - Création d'abonnement
- ✅ `customer.subscription.updated` - Mise à jour d'abonnement
- ✅ `customer.subscription.deleted` - Annulation d'abonnement
- ✅ `invoice.payment_succeeded` - Paiement réussi
- ✅ `invoice.payment_failed` - Paiement échoué

#### Configuration dans Stripe Dashboard

1. Allez dans **Développeurs** → **Webhooks**
2. Cliquez sur **Ajouter un endpoint**
3. URL du endpoint : `https://[VOTRE-SUPABASE-URL]/functions/v1/stripe-webhook`
4. Sélectionnez les événements suivants :
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copiez le **Signing secret** qui commence par `whsec_`
6. Ajoutez-le dans votre configuration Supabase :

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

## Fonctionnement du système d'abonnement

### Nouveau contrat

1. L'intervenant choisit un forfait lors de l'inscription (page `/practitioner-onboarding`)
2. Un contrat est créé avec `status='pending_payment'`
3. Redirection vers Stripe Checkout
4. Après paiement, le webhook active le contrat (`status='active'`)

### Changement d'abonnement

1. L'intervenant accède à la page `/practitioner-subscription`
2. Il choisit un nouveau forfait
3. Le système calcule la date anniversaire (jour du mois où l'abonnement a commencé)
4. Un nouveau contrat est créé avec :
   - `start_date` = date anniversaire (dans le futur)
   - `status='pending_payment'`
5. Redirection vers Stripe Checkout
6. Après paiement :
   - Le nouveau contrat passe en `status='pending_activation'`
   - L'ancien contrat reçoit un `end_date` = veille de la date anniversaire
7. À la date anniversaire, le nouveau contrat devient actif (via une tâche cron à créer)

### Activation automatique des contrats

**TODO** : Créer une Edge Function Supabase qui s'exécute quotidiennement via Supabase Cron pour :
- Activer les contrats `pending_activation` dont la `start_date` est atteinte
- Terminer les contrats actifs dont la `end_date` est atteinte

```sql
-- Exemple de requête pour activer les contrats
UPDATE practitioner_contracts
SET status = 'active'
WHERE status = 'pending_activation'
  AND start_date <= CURRENT_DATE;

-- Terminer les contrats expirés
UPDATE practitioner_contracts
SET status = 'terminated'
WHERE status = 'active'
  AND end_date IS NOT NULL
  AND end_date < CURRENT_DATE;
```

## Gestion des commissions

Les commissions sont calculées selon le forfait de l'intervenant :

### Forfait Découverte
```typescript
commission = Math.max(10, prix_rdv * 0.12)
commission = Math.min(commission, 25) // Plafonné à 25€
```

### Forfait Starter
```typescript
// 2 premiers RDV gratuits du mois
if (rdv_number <= 2) {
  commission = 0
} else {
  commission = Math.max(6, prix_rdv * 0.08)
  commission = Math.min(commission, 25) // Plafonné à 25€
}
// Au-delà de 20 RDV/mois, commission du Forfait Découverte
```

### Forfait Pro
```typescript
// 4 premiers RDV gratuits du mois
if (rdv_number <= 4) {
  commission = 0
} else {
  commission = 3 // Fixe
}
```

### Forfait Premium
```typescript
commission = 0 // Toujours gratuit
```

## Structure de la base de données

### Table `practitioner_contracts`

Colonnes principales :
- `id` : UUID
- `practitioner_id` : UUID (FK vers practitioners)
- `contract_type` : enum ('decouverte', 'starter', 'pro', 'premium')
- `monthly_fee` : decimal (9, 49, 99, ou 159)
- `commission_fixed` : decimal (10, 6, 3, ou 0)
- `commission_percentage` : decimal (12, 8, null, ou null)
- `commission_cap` : decimal (25, 25, null, ou null)
- `max_appointments_per_month` : int (10, 20, null, ou null)
- `free_appointments_per_month` : int (0, 2, 4, ou 0)
- `stripe_subscription_id` : varchar (ID Stripe)
- `start_date` : date
- `end_date` : date (nullable)
- `status` : enum ('pending_payment', 'pending_activation', 'active', 'suspended', 'terminated')
- `appointments_this_month` : int (compteur)
- `total_appointments` : int (compteur)

### Table `subscription_payments`

Enregistre tous les paiements mensuels d'abonnement :
- `id` : UUID
- `practitioner_id` : UUID
- `contract_id` : UUID
- `stripe_subscription_id` : varchar
- `stripe_payment_intent_id` : varchar
- `amount` : decimal
- `status` : enum ('succeeded', 'failed')
- `payment_date` : timestamp
- `period_start_date` : date
- `period_end_date` : date

## Pages utilisateur

### `/practitioner-onboarding`
Page d'inscription initiale pour choisir son premier forfait

### `/practitioner-subscription`
Page de gestion d'abonnement pour :
- Voir l'abonnement actuel
- Changer de forfait
- Voir l'historique des paiements

### `/practitioner-payment`
Page de confirmation avant redirection vers Stripe Checkout

## Variables d'environnement complètes

```env
# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx # ou pk_live_xxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx # ou sk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Stripe Price IDs
VITE_STRIPE_DECOUVERTE_PRICE_ID=price_xxxxxxxxxxxxx
VITE_STRIPE_STARTER_PRICE_ID=price_xxxxxxxxxxxxx
VITE_STRIPE_PRO_PRICE_ID=price_xxxxxxxxxxxxx
VITE_STRIPE_PREMIUM_PRICE_ID=price_xxxxxxxxxxxxx

# Supabase
VITE_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxxxxxxxxxx
```

## Tester le système

### Mode test Stripe

1. Utilisez les clés de test (`pk_test_` et `sk_test_`)
2. Créez des produits et prix de test dans Stripe
3. Utilisez les cartes de test Stripe :
   - **Succès** : `4242 4242 4242 4242`
   - **Échec** : `4000 0000 0000 0002`

### Vérifications

- [ ] Les 4 produits sont créés dans Stripe
- [ ] Les Price IDs sont correctement configurés dans `.env`
- [ ] Le webhook Stripe est configuré avec la bonne URL
- [ ] Le webhook secret est configuré dans Supabase
- [ ] Les migrations SQL sont appliquées (`free_appointments_per_month`, `stripe_subscription_id`, etc.)
- [ ] L'inscription d'un nouvel intervenant fonctionne
- [ ] Le changement d'abonnement fonctionne
- [ ] La date anniversaire est correctement calculée
- [ ] L'ancien contrat reçoit bien une `end_date`

## Support et dépannage

### Logs

- **Stripe** : Dashboard → Développeurs → Logs
- **Webhook** : Dashboard → Développeurs → Webhooks → Voir les événements
- **Supabase** : Logs des Edge Functions dans le dashboard Supabase

### Problèmes courants

**Le contrat n'est pas activé après paiement**
- Vérifiez que le webhook a bien reçu l'événement `checkout.session.completed`
- Vérifiez les logs de la fonction `stripe-webhook`

**L'ancien contrat n'est pas terminé lors d'un changement**
- Vérifiez que le webhook identifie bien le contrat comme un "changement" (start_date futur)
- Vérifiez que la date de fin est bien calculée

**Les prix ne correspondent pas**
- Vérifiez que les Price IDs dans `.env` correspondent aux bons produits Stripe
- Vérifiez que `CONTRACT_CONFIGS` dans `src/types/payments.ts` correspond au BusinessPlan

---

**Dernière mise à jour** : 2025-12-10
