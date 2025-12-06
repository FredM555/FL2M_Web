# Frais Stripe et Commissions - Documentation Contractuelle

## 📋 Résumé

**Principe** : Les frais de paiement Stripe sont **à la charge de l'intervenant**.
Ils sont **séparés de la commission** FL2M pour plus de transparence.

---

## 💰 Calcul des montants

### Formule générale

Pour un rendez-vous d'un montant total **X€** :

```
Prix total payé par le client : X€
    ↓
Commission FL2M : selon contrat (0€ à 12€ ou 0% à 12%)
Frais Stripe : 1.4% + 0.25€
    ↓
Montant net intervenant = X€ - Commission FL2M - Frais Stripe
```

### Frais Stripe (tarif Europe)

**Tarif standard Stripe en Europe** :
- **1.4% + 0.25€** par transaction réussie avec carte européenne
- **2.9% + 0.25€** pour cartes non-européennes

**Formule** :
```
Frais Stripe = (Montant × 0.014) + 0.25€
```

**Exemples** :
| Prix du RDV | Frais Stripe |
|-------------|--------------|
| 50€ | 0.70€ + 0.25€ = **0.95€** |
| 85€ | 1.19€ + 0.25€ = **1.44€** |
| 100€ | 1.40€ + 0.25€ = **1.65€** |
| 150€ | 2.10€ + 0.25€ = **2.35€** |

---

## 📊 Répartition par type de contrat

### Exemple : Rendez-vous à 100€

| Contrat | Commission FL2M | Frais Stripe | Montant net intervenant |
|---------|----------------|--------------|-------------------------|
| **Free** (12%) | 12.00€ | 1.65€ | **86.35€** (86.35%) |
| **Starter** (6€) | 6.00€ | 1.65€ | **92.35€** (92.35%) |
| **Pro** (3€) | 3.00€ | 1.65€ | **95.35€** (95.35%) |
| **Premium** (0€) | 0.00€ | 1.65€ | **98.35€** (98.35%) |

### Exemple : Rendez-vous à 85€

| Contrat | Commission FL2M | Frais Stripe | Montant net intervenant |
|---------|----------------|--------------|-------------------------|
| **Free** (12%) | 10.20€ | 1.44€ | **73.36€** (86.31%) |
| **Starter** (6€) | 6.00€ | 1.44€ | **77.56€** (91.25%) |
| **Pro** (3€) | 3.00€ | 1.44€ | **80.56€** (94.78%) |
| **Premium** (0€) | 0.00€ | 1.44€ | **83.56€** (98.31%) |

### Exemple : Rendez-vous à 50€

| Contrat | Commission FL2M | Frais Stripe | Montant net intervenant |
|---------|----------------|--------------|-------------------------|
| **Free** (12%) | 6.00€ | 0.95€ | **43.05€** (86.10%) |
| **Starter** (8%) | 4.00€ | 0.95€ | **45.05€** (90.10%) |
| **Pro** (3€) | 3.00€ | 0.95€ | **46.05€** (92.10%) |
| **Premium** (0€) | 0.00€ | 0.95€ | **49.05€** (98.10%) |

---

## 📑 Texte contractuel suggéré

### Pour les contrats intervenants

> **Article X - Frais de paiement**
>
> Les frais de traitement des paiements par Stripe sont à la charge de l'intervenant et s'élèvent à **1.4% + 0.25€** par transaction avec carte bancaire européenne.
>
> Ces frais sont **distincts et séparés** de la commission FL2M Services et sont facturés directement par Stripe pour le traitement sécurisé des paiements.
>
> **Exemple de calcul** pour un rendez-vous à 100€ avec un contrat Starter (6€) :
> - Prix total : 100.00€
> - Commission FL2M : 6.00€
> - Frais Stripe : 1.65€ (1.4% + 0.25€)
> - **Montant net intervenant : 92.35€**

### Pour les CGV clients

> **Article X - Paiement**
>
> Le paiement des prestations s'effectue en ligne de manière sécurisée via Stripe.
>
> Le prix affiché est le prix **TTC** que vous payez. Ce montant inclut :
> - La rémunération de l'intervenant
> - La commission FL2M Services (variable selon le contrat de l'intervenant)
> - Les frais de traitement Stripe (à la charge de l'intervenant)
>
> Aucun frais supplémentaire ne vous sera facturé.

---

## 🔍 Transparence et traçabilité

### Dans la table `transactions`

Chaque transaction enregistre désormais :

```sql
{
  "amount_total": 100.00,              -- Prix payé par le client
  "amount_platform_commission": 6.00,   -- Commission FL2M
  "amount_stripe_fees": 1.65,          -- Frais Stripe
  "amount_practitioner": 92.35,        -- Montant net intervenant
  "is_test_mode": false                -- Mode test ou production
}
```

### Logs de paiement

Les logs affichent maintenant :
```
[STRIPE-PAYMENT] Calcul des montants:
  - Prix total: 100€
  - Commission plateforme: 6€
  - Frais Stripe: 1.65€
  - Montant net intervenant: 92.35€
[STRIPE-PAYMENT] Transaction créée (mode: PRODUCTION)
```

---

## 🎯 Avantages de cette séparation

### Pour FL2M Services
✅ **Transparence totale** sur les revenus réels
✅ **Traçabilité** des frais Stripe dans la comptabilité
✅ **Clarté contractuelle** vis-à-vis des intervenants

### Pour les intervenants
✅ **Compréhension claire** des déductions
✅ **Visibilité** sur les frais de paiement
✅ **Pas de surprise** sur les montants reçus

### Pour les clients
✅ **Prix unique et clair**
✅ **Aucun frais caché**
✅ **Paiement sécurisé** via Stripe

---

## 📱 Affichage dans l'interface

### Page "Mes gains" intervenant (suggestion)

```
┌─────────────────────────────────────────────┐
│ Rendez-vous avec Jean Dupont                │
│ 15 décembre 2025 - 14h00                    │
├─────────────────────────────────────────────┤
│ Prix total :              100.00 €          │
│ Commission FL2M :          - 6.00 €         │
│ Frais paiement Stripe :    - 1.65 €         │
├─────────────────────────────────────────────┤
│ Montant net à recevoir :   92.35 €          │
└─────────────────────────────────────────────┘
```

### Page admin/transactions

```
| Date       | Client      | Montant | Commission | Frais Stripe | Net intervenant | Mode |
|------------|-------------|---------|------------|--------------|-----------------|------|
| 06/12/2025 | J. Dupont   | 100.00€ | 6.00€      | 1.65€        | 92.35€          | PROD |
| 05/12/2025 | M. Martin   | 85.00€  | 10.20€     | 1.44€        | 73.36€          | TEST |
```

---

## ⚙️ Configuration technique

### Calcul des frais Stripe

```typescript
// Frais Stripe pour cartes européennes
const stripeFees = (amount * 0.014) + 0.25;

// Montant net de l'intervenant
const practitionerAmount = amount - platformFee - stripeFees;
```

### Détection test vs production

```typescript
// Dans la création de session
const session = await stripe.checkout.sessions.create(sessionParams);

// Enregistrement dans la transaction
{
  is_test_mode: !session.livemode  // TRUE si test, FALSE si production
}
```

---

## 📞 Support

Pour toute question sur les frais ou la répartition des montants :
- Email : contact@fl2m.fr
- Documentation complète : [lien vers la documentation]

---

**Date de mise à jour** : 6 décembre 2025
**Version** : 1.0
