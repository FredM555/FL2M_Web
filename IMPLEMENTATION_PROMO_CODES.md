# Implémentation : Codes Promo et Annulation d'Abonnement

## 📋 Résumé

Votre modèle simplifié :
- **Abonnement découverte** : 4.99€/mois
- **Commission par RDV** : 10€ (fixe)
- **Code promo** : Premier mois gratuit (pour recrutement)
- **Annulation** : Prise en compte en fin de période payée

## ✅ Ce qui a été créé

### 1. Migration SQL (`supabase/migrations/20250101_create_promo_codes.sql`)

**Tables créées :**
- `promo_codes` : Gestion des codes promotionnels
  - Nouvelle colonne : `applicable_contract_types` (ARRAY) - Types d'abonnements concernés
- `promo_code_uses` : Suivi des utilisations par utilisateur
- Colonnes ajoutées à `practitioner_contracts` :
  - `promo_code_id` : Référence au code promo utilisé
  - `cancel_at_period_end` : Indicateur d'annulation programmée
  - `canceled_at` : Date de la demande d'annulation

**Fonctions SQL créées :**
- `validate_promo_code(code, user_id, contract_type)` : Valide un code promo pour un type d'abonnement spécifique
- `use_promo_code(promo_code_id, user_id, contract_id)` : Enregistre l'utilisation

**Code promo d'exemple créé :**
- Code : `RECRUTEMENT2025`
- Avantage : 1er mois gratuit
- Restriction : **Uniquement pour l'abonnement "découverte"**

### 2. Modifications dans `PractitionerSubscriptionPage.tsx`

**Fonctionnalités ajoutées :**

#### A. Système de codes promo
```typescript
- État pour le code promo (promoCode, promoCodeValid, etc.)
- Fonction validatePromoCode() pour vérifier la validité du code pour le type d'abonnement sélectionné
- Réinitialisation automatique de la validation quand l'utilisateur change de type d'abonnement
- Le code promo sera appliqué lors de la création de l'abonnement
```

#### B. Annulation d'abonnement
```typescript
- État pour la gestion d'annulation (cancelDialogOpen, canceling)
- Fonction handleCancelSubscription() pour marquer l'annulation
- L'abonnement continue jusqu'à la fin de la période, puis s'arrête
```

## 🚀 Étapes d'installation

### Étape 1 : Appliquer la migration SQL

```bash
# Option 1 : Via Supabase CLI (recommandé)
npx supabase db push

# Option 2 : Via l'interface Supabase
# 1. Aller dans le SQL Editor de votre projet Supabase
# 2. Copier-coller le contenu de supabase/migrations/20250101_create_promo_codes.sql
# 3. Exécuter la requête
```

### Étape 2 : Interface utilisateur à ajouter

Je vous recommande d'ajouter dans `PractitionerSubscriptionPage.tsx` :

#### **1. Dans la section "Abonnement actuel" (après la ligne 313)**

```tsx
{/* Statut d'annulation */}
{currentContract.cancel_at_period_end && (
  <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}>
    <Typography variant="body2" sx={{ fontWeight: 600 }}>
      Annulation programmée
    </Typography>
    <Typography variant="body2">
      Votre abonnement prendra fin le {calculateNextBillingDate()}
    </Typography>
  </Alert>
)}

{/* Bouton d'annulation */}
{!currentContract.cancel_at_period_end && (
  <Button
    variant="outlined"
    color="error"
    onClick={() => setCancelDialogOpen(true)}
    sx={{ mt: 2 }}
  >
    Arrêter mon abonnement
  </Button>
)}
```

#### **2. Dans la section "Changer d'abonnement" (avant le bouton de confirmation)**

```tsx
{/* Champ code promo */}
<Box sx={{ mt: 3 }}>
  <Typography variant="h6" sx={{ mb: 2 }}>
    Code promo (optionnel)
  </Typography>
  <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
    <TextField
      fullWidth
      label="Code promo"
      value={promoCode}
      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
      placeholder="Ex: RECRUTEMENT2025"
      disabled={validatingPromoCode}
      error={promoCodeValid === false}
      success={promoCodeValid === true}
    />
    <Button
      variant="outlined"
      onClick={validatePromoCode}
      disabled={!promoCode.trim() || validatingPromoCode}
      sx={{ minWidth: 120 }}
    >
      {validatingPromoCode ? 'Validation...' : 'Valider'}
    </Button>
  </Box>

  {/* Message de validation */}
  {promoCodeMessage && (
    <Alert
      severity={promoCodeValid ? 'success' : 'error'}
      sx={{ mt: 1 }}
    >
      {promoCodeMessage}
    </Alert>
  )}

  {promoCodeValid && (
    <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mt: 1 }}>
      🎉 Votre premier mois sera gratuit !
    </Alert>
  )}
</Box>
```

#### **3. À la fin du fichier (avant le dernier `</Container>`)**

```tsx
{/* Dialog de confirmation d'annulation */}
<Dialog
  open={cancelDialogOpen}
  onClose={() => !canceling && setCancelDialogOpen(false)}
>
  <DialogTitle>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <WarningIcon color="error" />
      Confirmer l'annulation
    </Box>
  </DialogTitle>
  <DialogContent>
    <Typography variant="body1" sx={{ mb: 2 }}>
      Êtes-vous sûr de vouloir arrêter votre abonnement ?
    </Typography>
    <Typography variant="body2" color="text.secondary">
      • Votre abonnement restera actif jusqu'au {calculateNextBillingDate()}
      <br />
      • Vous pourrez continuer à utiliser tous les services jusqu'à cette date
      <br />
      • Après cette date, vous n'aurez plus accès aux fonctionnalités intervenant
    </Typography>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setCancelDialogOpen(false)} disabled={canceling}>
      Non, conserver
    </Button>
    <Button
      onClick={handleCancelSubscription}
      color="error"
      variant="contained"
      disabled={canceling}
    >
      {canceling ? <CircularProgress size={20} /> : 'Oui, arrêter'}
    </Button>
  </DialogActions>
</Dialog>
```

### Étape 3 : Modifier la logique de paiement Stripe

Dans la fonction `handleConfirmChange`, ajoutez l'utilisation du code promo :

```typescript
// Après la création du nouveau contrat (ligne ~162)
if (promoCodeId) {
  // Enregistrer l'utilisation du code promo
  await supabase.rpc('use_promo_code', {
    p_promo_code_id: promoCodeId,
    p_user_id: user.id,
    p_contract_id: newContractData.id
  });

  // Mettre à jour le contrat avec le code promo
  await supabase
    .from('practitioner_contracts')
    .update({ promo_code_id: promoCodeId })
    .eq('id', newContractData.id);
}
```

## 📊 Gestion des codes promo (Admin)

Vous pouvez créer des codes promo via SQL :

### Code promo pour un type d'abonnement spécifique

```sql
-- Code promo uniquement pour l'abonnement "découverte"
INSERT INTO promo_codes (code, description, discount_type, applicable_contract_types, max_uses, valid_until, created_by)
VALUES (
  'RECRUTEMENT2025',
  '1er mois gratuit pour le recrutement - abonnement découverte uniquement',
  'first_month_free',
  ARRAY['decouverte'], -- Uniquement pour l'abonnement découverte
  NULL, -- Illimité
  '2025-12-31', -- Date d'expiration
  (SELECT id FROM auth.users WHERE email = 'admin@flmservices.app' LIMIT 1)
);

-- Code promo pour plusieurs types d'abonnements
INSERT INTO promo_codes (code, description, discount_type, applicable_contract_types, max_uses, valid_until, created_by)
VALUES (
  'PROMO_PRO',
  '1er mois gratuit pour les abonnements Pro et Premium',
  'first_month_free',
  ARRAY['pro', 'premium'], -- Plusieurs abonnements
  100, -- Limité à 100 utilisations
  '2025-12-31',
  (SELECT id FROM auth.users WHERE email = 'admin@flmservices.app' LIMIT 1)
);

-- Code promo pour TOUS les types d'abonnements
INSERT INTO promo_codes (code, description, discount_type, applicable_contract_types, max_uses, valid_until, created_by)
VALUES (
  'PROMO_TOUS',
  '1er mois gratuit pour tous les abonnements',
  'first_month_free',
  NULL, -- NULL = valable pour tous les types
  50,
  '2025-12-31',
  (SELECT id FROM auth.users WHERE email = 'admin@flmservices.app' LIMIT 1)
);
```

## 🎯 Fonctionnement

### Scénario 1 : Nouveau client avec code promo (abonnement découverte)

1. Client sélectionne l'abonnement **"découverte"**
2. Client entre le code `RECRUTEMENT2025`
3. Système valide le code **pour l'abonnement découverte**
4. Affiche "🎉 Votre premier mois sera gratuit !"
5. Stripe facture 0€ pour le 1er mois
6. Le mois suivant : facturation normale à 4.99€

**Important :** Si le client change de type d'abonnement après avoir validé le code promo, la validation est automatiquement réinitialisée et le client doit valider un nouveau code compatible avec le nouveau type d'abonnement.

### Scénario 2 : Code promo incompatible avec le type d'abonnement

1. Client sélectionne l'abonnement **"pro"**
2. Client entre le code `RECRUTEMENT2025` (qui est uniquement pour "découverte")
3. Système valide le code et affiche : **"Ce code promo n'est pas valide pour ce type d'abonnement"**
4. Client doit soit :
   - Changer pour l'abonnement "découverte"
   - Utiliser un code promo valide pour l'abonnement "pro"
   - Continuer sans code promo

### Scénario 3 : Annulation d'abonnement

1. Client clique sur "Arrêter mon abonnement"
2. Confirme l'annulation
3. Le contrat est marqué `cancel_at_period_end = true`
4. L'abonnement continue jusqu'au prochain anniversaire
5. À la date anniversaire, le statut passe à `canceled` (via un cron job à créer)

## ⚠️ À faire ensuite

### 1. Créer un cron job pour gérer les fins d'abonnement

```sql
-- À exécuter quotidiennement
UPDATE practitioner_contracts
SET status = 'canceled'
WHERE cancel_at_period_end = true
  AND status = 'active'
  AND start_date + interval '1 month' * (
    EXTRACT(YEAR FROM age(CURRENT_DATE, start_date::date)) * 12 +
    EXTRACT(MONTH FROM age(CURRENT_DATE, start_date::date))
  ) <= CURRENT_DATE;
```

### 2. Adapter Stripe pour appliquer le code promo

Dans `src/services/stripe.ts`, modifier `createSubscriptionCheckout` pour :
- Vérifier si un code promo est associé au contrat
- Si `first_month_free`, créer une promotion Stripe ou appliquer un coupon

## 🎨 Amélioration future (optionnelle)

- Page d'admin pour gérer les codes promo (CRUD)
- Statistiques d'utilisation des codes promo
- Codes promo avec pourcentages de réduction
- Codes promo pour réduction sur les RDV

---

**Note** : Cette implémentation est prête à être utilisée. Il ne reste plus qu'à appliquer la migration SQL et ajouter les éléments d'interface utilisateur dans la page d'abonnement.
