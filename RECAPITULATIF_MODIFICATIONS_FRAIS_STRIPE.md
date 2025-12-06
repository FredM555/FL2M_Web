# Récapitulatif des modifications - Frais Stripe et mode Test/Production

## ✅ Modifications effectuées

### 1. Calcul explicite des frais Stripe

**Fichier** : `supabase/functions/stripe-create-appointment-payment/index.ts`

**Changements** :
- ✅ Ajout de la variable `stripeFees` pour calculer les frais Stripe : `(montant × 0.014) + 0.25€`
- ✅ Modification du calcul : `practitionerAmount = amount - platformFee - stripeFees`
- ✅ Ajout de logs détaillés pour afficher la répartition des montants
- ✅ Enregistrement des frais Stripe dans `amount_stripe_fees`
- ✅ Détection du mode test/production via `session.livemode`

**Avant** :
```typescript
let platformFee = 0;
let practitionerAmount = amount;
// ...
practitionerAmount = amount - platformFee;
```

**Après** :
```typescript
let platformFee = 0;
let stripeFees = 0;
let practitionerAmount = amount;
// ...
stripeFees = (amount * 0.014) + 0.25;
practitionerAmount = amount - platformFee - stripeFees;

console.log(`[STRIPE-PAYMENT] Calcul des montants:`);
console.log(`  - Prix total: ${amount}€`);
console.log(`  - Commission plateforme: ${platformFee}€`);
console.log(`  - Frais Stripe: ${stripeFees.toFixed(2)}€`);
console.log(`  - Montant net intervenant: ${practitionerAmount.toFixed(2)}€`);
```

### 2. Ajout du champ is_test_mode

**Fichier** : `supabase/migrations/20251206125916_add_test_mode_to_transactions.sql`

**Changements** :
- ✅ Ajout de la colonne `is_test_mode BOOLEAN DEFAULT FALSE NOT NULL`
- ✅ Création d'un index `idx_transactions_test_mode`
- ✅ Ajout de commentaires sur les colonnes pour la documentation

**Enregistrement dans la transaction** :
```typescript
await supabase
  .from('transactions')
  .insert({
    // ...
    amount_stripe_fees: stripeFees,
    is_test_mode: !session.livemode,  // TRUE si test, FALSE si production
    // ...
  });

console.log(`[STRIPE-PAYMENT] Transaction créée (mode: ${session.livemode ? 'PRODUCTION' : 'TEST'})`);
```

### 3. Documentation créée

- ✅ **`FRAIS_STRIPE_ET_COMMISSIONS.md`** : Documentation contractuelle complète
  - Formules de calcul
  - Exemples par type de contrat
  - Textes contractuels suggérés
  - Exemples d'affichage

- ✅ **`GUIDE_MIGRATION_IS_TEST_MODE.md`** : Guide d'application de la migration
  - SQL à exécuter
  - Vérifications
  - Utilisation et requêtes

- ✅ **`ANALYSE_FRAIS_STRIPE.md`** : Analyse technique détaillée
  - Impact financier
  - Comparaisons avant/après

---

## 📊 Impact des changements

### Exemple : Rendez-vous à 100€ avec contrat Starter (6€)

**Avant les modifications** (calcul implicite) :
```
Client paie : 100€
  → FL2M commission : 6€
  → Intervenant reçoit : ~92.35€ (mais frais Stripe non tracés)
```

**Après les modifications** (calcul explicite) :
```
Client paie : 100€
  → Commission FL2M : 6.00€
  → Frais Stripe : 1.65€ (tracés séparément)
  → Intervenant reçoit : 92.35€
```

**Changement** : Même montant, mais maintenant **transparent** et **tracé** séparément dans la BDD.

### Table transactions

**Nouvelles colonnes utilisées** :
```json
{
  "amount_total": 100.00,
  "amount_platform_commission": 6.00,
  "amount_stripe_fees": 1.65,        // ✅ Maintenant calculé et enregistré
  "amount_practitioner": 92.35,
  "is_test_mode": false               // ✅ Nouveau champ
}
```

---

## 🚀 Actions à effectuer

### 1. Appliquer la migration BDD

**Via Dashboard Supabase** (recommandé) :
1. SQL Editor → New query
2. Copier le SQL de `GUIDE_MIGRATION_IS_TEST_MODE.md`
3. Run

**OU via CLI** (si Docker fonctionne) :
```bash
npx supabase db push
```

### 2. Déployer la fonction Edge mise à jour

**Si Docker est démarré** :
```bash
npx supabase functions deploy stripe-create-appointment-payment --no-verify-jwt
```

**OU via Dashboard Supabase** :
1. Edge Functions → stripe-create-appointment-payment
2. New deployment
3. Copier le code de `supabase/functions/stripe-create-appointment-payment/index.ts`
4. Deploy

### 3. Tester

**Test complet** :
1. Créer un rendez-vous
2. Payer avec carte de test : `4242 4242 4242 4242`
3. Vérifier dans les logs :
   ```bash
   npx supabase functions logs stripe-create-appointment-payment
   ```
   Vous devriez voir :
   ```
   [STRIPE-PAYMENT] Calcul des montants:
     - Prix total: 85€
     - Commission plateforme: 10.2€
     - Frais Stripe: 1.44€
     - Montant net intervenant: 73.36€
   [STRIPE-PAYMENT] Transaction créée (mode: TEST)
   ```

4. Vérifier dans la BDD :
   ```sql
   SELECT
     amount_total,
     amount_platform_commission,
     amount_stripe_fees,
     amount_practitioner,
     is_test_mode
   FROM transactions
   ORDER BY created_at DESC
   LIMIT 1;
   ```

---

## 📋 Checklist de déploiement

- [ ] Migration BDD appliquée (`is_test_mode` ajouté)
- [ ] Fonction `stripe-create-appointment-payment` déployée
- [ ] Test avec carte 4242 effectué
- [ ] Logs vérifiés (calcul des montants affiché)
- [ ] Transaction vérifiée en BDD (frais Stripe + is_test_mode présents)
- [ ] Documentation contractuelle revue et approuvée

---

## 🔍 Vérifications post-déploiement

### 1. Vérifier qu'une transaction test est bien marquée

```sql
-- Dernière transaction de test
SELECT * FROM transactions
WHERE is_test_mode = TRUE
ORDER BY created_at DESC
LIMIT 1;
```

### 2. Vérifier les frais Stripe sont calculés

```sql
-- Vérifier que amount_stripe_fees > 0
SELECT
  COUNT(*) as total,
  COUNT(CASE WHEN amount_stripe_fees > 0 THEN 1 END) as avec_frais
FROM transactions
WHERE created_at > NOW() - INTERVAL '1 day';
```

### 3. Statistiques par mode

```sql
SELECT
  is_test_mode,
  COUNT(*) as nombre,
  SUM(amount_total) as total,
  AVG(amount_stripe_fees) as frais_moyen
FROM transactions
GROUP BY is_test_mode;
```

---

## 📞 Support

Si vous rencontrez des problèmes :

1. **Vérifier les logs** :
   ```bash
   npx supabase functions logs stripe-create-appointment-payment --limit 50
   ```

2. **Vérifier la BDD** :
   - La colonne `is_test_mode` existe bien
   - Les transactions récentes ont `amount_stripe_fees > 0`

3. **Tester le paiement** :
   - Utiliser la carte de test Stripe
   - Vérifier que la redirection fonctionne
   - Consulter les logs Stripe Dashboard

---

## 🎯 Bénéfices

### Pour FL2M Services
✅ **Transparence** : Frais Stripe clairement identifiés
✅ **Traçabilité** : Mode test/prod différencié
✅ **Comptabilité** : Répartition précise des montants

### Pour les intervenants
✅ **Clarté** : Comprendre exactement les déductions
✅ **Confiance** : Savoir ce qui est prélevé et pourquoi

### Pour les clients
✅ **Simplicité** : Un seul prix, pas de surprise

---

**Date** : 6 décembre 2025
**Version** : 1.0
