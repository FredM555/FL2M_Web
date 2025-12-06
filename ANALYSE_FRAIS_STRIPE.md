# Analyse : Frais Stripe et Commissions

## Situation actuelle

### Flux de paiement avec Stripe Connect

Lorsqu'un client paie 100€ pour un rendez-vous avec `application_fee_amount` = 10€ (commission plateforme) :

```
Client paie : 100€
    ↓
Stripe prélève ses frais de traitement : ~1.65€ (1.4% + 0.25€)
    ↓
Montant net disponible : 98.35€
    ↓
├─ FL2M reçoit (application_fee) : 10€
└─ Intervenant reçoit : 98.35€ - 10€ = 88.35€
```

**Problème identifié** : Les frais Stripe (1.65€) sont actuellement **déduits du montant de l'intervenant**.

### Ce que l'intervenant devrait recevoir

Si FL2M prend en charge les frais Stripe, l'intervenant devrait recevoir :
- **90€** (100€ - 10€ de commission uniquement)

Au lieu de :
- **88.35€** (100€ - 10€ - 1.65€)

---

## Solution proposée

Pour que FL2M Services prenne en charge les frais Stripe, il faut **réduire l'application_fee_amount** du montant des frais Stripe estimés.

### Calcul des frais Stripe

**Tarif Stripe en Europe (à vérifier avec votre compte)** :
- **1.4% + 0.25€** par transaction réussie avec carte européenne
- **2.9% + 0.25€** pour cartes non-européennes (rare)

**Formule de calcul** :
```typescript
const stripeFees = (amount * 0.014) + 0.25;
```

### Nouveau flux proposé

```typescript
// Exemple : Client paie 100€, commission = 10€

amount = 100€
platformFee = 10€  // Commission FL2M
stripeFees = (100 * 0.014) + 0.25 = 1.65€

// Au lieu de prélever 10€, on prélève 10€ - 1.65€ = 8.35€
application_fee_amount = platformFee - stripeFees = 8.35€

// Résultat :
// - Stripe prélève : 1.65€ (ses frais)
// - FL2M reçoit : 8.35€ (application_fee)
// - Intervenant reçoit : 100€ - 1.65€ - 8.35€ = 90€ ✅
```

**Vérification comptable** :
- FL2M reçoit : 8.35€
- FL2M a "payé" les frais Stripe : 1.65€ (car non déduits de l'intervenant)
- **Revenu net FL2M** : 8.35€ (on considère que Stripe gère tout)
- **L'intervenant reçoit bien** : 90€ (le montant attendu sans les frais Stripe)

---

## Modifications à apporter

### Fichier : `supabase/functions/stripe-create-appointment-payment/index.ts`

#### Ligne ~169 (après le calcul de platformFee)

**Code actuel** :
```typescript
practitionerAmount = amount - platformFee;
```

**Nouveau code** :
```typescript
// Calculer les frais Stripe (1.4% + 0.25€)
const stripeFees = (amount * 0.014) + 0.25;

// FL2M prend en charge les frais Stripe
practitionerAmount = amount - platformFee;  // L'intervenant reçoit son montant sans frais Stripe
```

#### Ligne ~213 (application_fee_amount)

**Code actuel** :
```typescript
sessionParams.payment_intent_data.application_fee_amount = Math.round(platformFee * 100);
```

**Nouveau code** :
```typescript
// Réduire la commission des frais Stripe pour que FL2M les prenne en charge
const applicationFee = Math.max(0, platformFee - stripeFees);
sessionParams.payment_intent_data.application_fee_amount = Math.round(applicationFee * 100);
```

#### Ligne ~229 (enregistrement transaction)

**Mise à jour pour tracer les frais Stripe** :
```typescript
await supabase
  .from('transactions')
  .insert({
    appointment_id: appointmentId,
    practitioner_id: practitionerId,
    client_id: clientId,
    stripe_payment_intent_id: session.payment_intent as string,
    amount_total: amount,
    amount_practitioner: practitionerAmount,
    amount_platform_commission: platformFee,
    amount_stripe_fees: stripeFees,  // ✅ Ajouter cette ligne
    status: 'pending',
    currency: 'EUR',
    description: description,
    commission_type: contract?.contract_type || null,
    transfer_status: 'pending'
  });
```

---

## Exemple de calcul par type de contrat

### Rendez-vous à 100€

| Type de contrat | Commission initiale | Frais Stripe | Application Fee | FL2M reçoit net | Intervenant reçoit |
|-----------------|---------------------|--------------|-----------------|-----------------|-------------------|
| **Free** (12%) | 12€ | 1.65€ | 10.35€ | 10.35€ | 88€ |
| **Starter** (6€) | 6€ | 1.65€ | 4.35€ | 4.35€ | 94€ |
| **Pro** (3€) | 3€ | 1.65€ | 1.35€ | 1.35€ | 97€ |
| **Premium** (0€) | 0€ | 1.65€ | 0€* | -1.65€* | 98.35€ |

\* **Note importante pour Premium** : Si la commission (0€) est inférieure aux frais Stripe (1.65€), FL2M sera **en négatif**. Deux options :
1. **Option A** : Accepter la perte (FL2M paie 1.65€ de sa poche)
2. **Option B** : Prélever au minimum les frais Stripe (1.65€) même pour Premium

---

## Cas particulier : Contrat Premium

Pour le contrat **Premium** (0€ de commission), si FL2M veut vraiment prendre en charge les frais Stripe, FL2M sera en perte de 1.65€ par transaction.

**Recommandation** :
```typescript
// S'assurer que l'application_fee couvre au minimum les frais Stripe
const applicationFee = Math.max(stripeFees, platformFee - stripeFees);
```

Ou alors, pour Premium, facturer **uniquement** les frais Stripe :
```typescript
if (contract.contract_type === 'premium') {
  platformFee = stripeFees;  // Facturer uniquement les frais Stripe
}
```

---

## Impact sur les revenus FL2M

### Exemple sur 100 rendez-vous à 85€ (moyenne)

**Sans prise en charge des frais Stripe (actuel)** :
- Commission moyenne : 7€
- Frais Stripe par RDV : ~1.44€
- **Revenu FL2M** : 7€ × 100 = **700€**
- **Revenu intervenant moyen** : (85 - 7 - 1.44) × 100 = **7 656€**

**Avec prise en charge des frais Stripe (proposé)** :
- Commission moyenne : 7€
- Frais Stripe pris en charge : 1.44€
- **Revenu FL2M** : (7 - 1.44) × 100 = **556€** (-144€)
- **Revenu intervenant moyen** : (85 - 7) × 100 = **7 800€** (+144€)

**Impact** : FL2M gagne 144€ de moins, mais c'est **plus transparent** et **plus attractif** pour les intervenants.

---

## Recommandations finales

1. ✅ **Appliquer la correction** pour que FL2M prenne en charge les frais Stripe
2. ✅ **Documenter clairement** dans les contrats que "FL2M prend en charge les frais Stripe"
3. ⚠️ **Gérer le cas Premium** : décider si on accepte la perte ou si on facture les frais Stripe
4. ✅ **Tracer les frais Stripe** dans la table transactions (`amount_stripe_fees`)
5. ✅ **Mettre à jour la documentation** des contrats

---

## Conclusion

**OUI**, les frais Stripe sont actuellement déduits de l'intervenant.

**Solution** : Réduire `application_fee_amount` des frais Stripe estimés pour que FL2M les prenne effectivement en charge.

Cette modification rend l'offre **plus attractive** pour les intervenants tout en restant transparente sur les coûts.
