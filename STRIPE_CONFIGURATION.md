# Configuration Stripe : Gestion du solde et des virements

## 🔴 Problème identifié

Les virements automatiques tous les 15 jours vident le compte Stripe, empêchant les transferts vers les intervenants.

## ✅ Solution recommandée : Virements manuels périodiques

### Étape 1 : Désactiver les virements automatiques

1. Allez sur : https://dashboard.stripe.com/settings/payouts
2. Section **Payout schedule**
3. Changez de **"Every 2 weeks"** vers **"Manual"**
4. Enregistrez

### Étape 2 : Définir votre stratégie de virements

**Option A - Virements mensuels** (recommandé) :
- Gardez les fonds dans Stripe
- 1 fois par mois, faites un virement manuel des **commissions accumulées**
- Laissez toujours un solde de réserve pour les transferts en cours

**Option B - Virements hebdomadaires** :
- Calculez le montant sûr à virer
- Gardez une réserve = total des paiements en attente de transfert (48h)

## 💰 Comprendre les flux d'argent

### Flux type d'une transaction

```
┌─────────────────────────────────────────────────────────────┐
│ CLIENT paie 95,20 €                                         │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ STRIPE prend ses frais : 3,01 € (2,9% + 0,25€)            │
│ Net reçu dans votre compte Stripe : 92,19 €                │
└─────────────────────────────────────────────────────────────┘
                    ↓
        Attend 48h (validation)
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ TRANSFERT vers intervenant : 85,00 €                       │
│ (Stripe Connect Transfer)                                   │
└─────────────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────────────┐
│ Reste dans votre compte Stripe : 7,19 €                    │
│ (C'est votre commission nette après frais Stripe)          │
└─────────────────────────────────────────────────────────────┘
```

### Détail des 95,20 € payés par le client

| Montant | Destinataire | Description |
|---------|--------------|-------------|
| 85,00 € | Intervenant | Prestation |
| 10,20 € | Plateforme | Commission brute (12%) |
| -3,01 € | Stripe | Frais de paiement |
| **7,19 €** | **Plateforme** | **Commission nette** |

## 📊 Calcul des frais Stripe à répercuter

### Frais Stripe standards
- **2,9% + 0,25 €** par transaction européenne
- **1,5%** pour les paiements par carte enregistrée
- **Transferts Stripe Connect** : GRATUITS (0€)

### Exemple de calcul

Pour une prestation de **85 €** :

```python
# Prix intervenant
prix_intervenant = 85.00

# Commission plateforme (12%)
commission_brute = prix_intervenant * 0.12  # 10,20 €

# Prix total AVANT frais Stripe
prix_total_ht = prix_intervenant + commission_brute  # 95,20 €

# Frais Stripe
frais_stripe = (prix_total_ht * 0.029) + 0.25  # 3,01 €

# OPTION 1 : Client paie les frais Stripe
prix_final_client = prix_total_ht + frais_stripe  # 98,21 €

# OPTION 2 : Plateforme absorbe les frais Stripe (ACTUEL)
prix_final_client = prix_total_ht  # 95,20 €
commission_nette = commission_brute - frais_stripe  # 7,19 €
```

### 🎯 Recommandation

**Option actuelle** : Client paie 95,20 €, plateforme garde 7,19 € net
- ✅ Prix transparent pour le client
- ✅ Simple à comprendre
- ❌ Commission nette réduite (7,19€ au lieu de 10,20€)

**Option alternative** : Client paie 98,21 €, plateforme garde 10,20 € net
- ✅ Commission pleine pour la plateforme
- ✅ Frais Stripe répercutés au client
- ⚠️ Prix légèrement plus élevé

## 🔧 Configuration actuelle vs recommandée

### Actuellement

| Paramètre | Valeur |
|-----------|--------|
| Commission plateforme | 12% (10,20€ sur 85€) |
| Qui paie frais Stripe ? | Plateforme |
| Commission nette | 7,19€ (≈8,5%) |
| Virements | Automatiques tous les 15j ❌ |

### Recommandé

| Paramètre | Valeur |
|-----------|--------|
| Commission plateforme | 12% (10,20€ sur 85€) |
| Qui paie frais Stripe ? | Plateforme (OK) ou Client (optionnel) |
| Commission nette | 7,19€ ou 10,20€ |
| Virements | **Manuels mensuels** ✅ |

## 📋 Solde de réserve recommandé

Pour éviter les erreurs `balance_insufficient`, gardez toujours dans votre compte Stripe :

```sql
-- Calculer le solde de réserve nécessaire
SELECT
  COUNT(*) as nb_rdv_en_attente,
  SUM(amount_practitioner) as reserve_necessaire,
  'Gardez au moins ' || ROUND(SUM(amount_practitioner), 2) || '€ dans Stripe' as recommandation
FROM transactions
WHERE transfer_status = 'eligible'
  AND status = 'succeeded'
  AND eligible_for_transfer_at > NOW() - INTERVAL '2 days';
```

**Règle simple** : Gardez au moins **200-500€** de réserve dans Stripe pour couvrir les transferts en cours.

## 🔄 Processus recommandé

### Quotidien (automatique)
1. Clients paient leurs rendez-vous
2. Stripe prend ses frais
3. Fonds restent dans le compte Stripe

### Toutes les heures (automatique - CRON)
1. `auto_complete_appointments` : RDV terminés → status "completed"
2. `process-payouts` : Transferts vers intervenants (après 48h)

### Mensuel (manuel)
1. Vérifiez le solde Stripe
2. Calculez : Solde - Réserve = Montant disponible
3. Faites un virement manuel vers votre compte bancaire
4. Gardez la réserve pour les transferts en cours

## 💡 Exemple de gestion mensuelle

```
Solde Stripe au 1er janvier : 1 500 €

Transactions en attente de transfert (48h) :
- 10 rendez-vous × 85€ = 850 €

Montant sûr à virer :
1 500 € - 850 € = 650 € ✅

→ Faites un virement de 650€ vers votre compte bancaire
→ Gardez 850€ dans Stripe pour les transferts programmés
```

## 🛠️ Actions immédiates

1. ✅ Désactiver les virements automatiques
2. ✅ Corriger le CRON job process-payouts (voir GUIDE_CORRECTION_CRON.md)
3. ✅ Attendre que les paiements s'accumulent
4. ✅ Faire des virements manuels mensuels du surplus

## 📞 Support

- Dashboard Stripe : https://dashboard.stripe.com
- Documentation Payouts : https://stripe.com/docs/payouts
- Documentation Connect : https://stripe.com/docs/connect/account-balances
