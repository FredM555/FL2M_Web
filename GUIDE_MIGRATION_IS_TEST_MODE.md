# Guide : Ajout du champ is_test_mode à la table transactions

## 🎯 Objectif

Ajouter un champ `is_test_mode` à la table `transactions` pour différencier les paiements de test des paiements en production.

---

## 📝 Migration SQL à appliquer

### Option 1 : Via le Dashboard Supabase (Recommandé)

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Menu **SQL Editor**
4. Cliquez sur **New query**
5. Copiez-collez le SQL ci-dessous
6. Cliquez sur **Run**

```sql
-- Ajouter le champ is_test_mode
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS is_test_mode BOOLEAN DEFAULT FALSE NOT NULL;

-- Ajouter un commentaire pour la documentation
COMMENT ON COLUMN public.transactions.is_test_mode IS 'Indique si la transaction a été effectuée en mode test Stripe (TRUE) ou en production (FALSE)';

-- Créer un index pour faciliter les requêtes de filtrage
CREATE INDEX IF NOT EXISTS idx_transactions_test_mode ON public.transactions(is_test_mode);

-- Mettre à jour les commentaires existants pour clarifier
COMMENT ON COLUMN public.transactions.amount_stripe_fees IS 'Frais Stripe prélevés (1.4% + 0.25€ pour cartes EU). Ces frais sont à la charge de l''intervenant.';

COMMENT ON COLUMN public.transactions.amount_practitioner IS 'Montant net que l''intervenant recevra (montant total - commission - frais Stripe)';
```

### Option 2 : Via CLI Supabase

Si vous avez déjà des migrations en local qui fonctionnent :

```bash
npx supabase db push
```

Le fichier de migration est déjà créé :
- `supabase/migrations/20251206125916_add_test_mode_to_transactions.sql`

---

## ✅ Vérification

Après avoir appliqué la migration, vérifiez que tout s'est bien passé :

```sql
-- Vérifier que la colonne existe
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'transactions'
AND column_name = 'is_test_mode';

-- Résultat attendu :
-- column_name  | data_type | is_nullable | column_default
-- is_test_mode | boolean   | NO          | false
```

---

## 🔄 Mise à jour des transactions existantes (optionnel)

Si vous avez déjà des transactions en base, vous pouvez les marquer comme test ou production :

```sql
-- Marquer toutes les transactions existantes comme production
-- (à ajuster selon votre besoin)
UPDATE public.transactions
SET is_test_mode = FALSE
WHERE is_test_mode IS NULL OR is_test_mode = TRUE;

-- OU marquer toutes comme test si c'était votre environnement de test
UPDATE public.transactions
SET is_test_mode = TRUE
WHERE created_at < '2025-12-06';  -- Date avant le déploiement en prod
```

---

## 📊 Utilisation

### Filtrer les transactions de production

```sql
SELECT * FROM public.transactions
WHERE is_test_mode = FALSE
ORDER BY created_at DESC;
```

### Filtrer les transactions de test

```sql
SELECT * FROM public.transactions
WHERE is_test_mode = TRUE
ORDER BY created_at DESC;
```

### Statistiques par mode

```sql
SELECT
  is_test_mode,
  COUNT(*) as nombre_transactions,
  SUM(amount_total) as montant_total,
  SUM(amount_platform_commission) as commission_totale,
  SUM(amount_stripe_fees) as frais_stripe_total
FROM public.transactions
WHERE status = 'succeeded'
GROUP BY is_test_mode;
```

---

## 🔍 Impact

### Aucun impact sur l'existant
- Les transactions existantes auront `is_test_mode = FALSE` par défaut
- Les nouvelles transactions seront automatiquement marquées selon le mode Stripe

### Nouveaux paiements
À partir du déploiement de la fonction `stripe-create-appointment-payment` mise à jour :
- Paiements avec carte de test (4242 4242 4242 4242) → `is_test_mode = TRUE`
- Paiements avec vraies cartes en production → `is_test_mode = FALSE`

---

## 📱 Affichage dans l'interface (suggestion future)

```typescript
// Exemple de badge conditionnel
{transaction.is_test_mode && (
  <Chip
    label="TEST"
    size="small"
    color="warning"
    icon={<WarningIcon />}
  />
)}
```

---

## ⚠️ Notes importantes

1. **Sauvegarde** : Toujours faire une sauvegarde avant de modifier la structure de la BDD
2. **Test** : Tester la migration sur un environnement de dev/staging avant la production
3. **Performance** : L'index créé améliore les performances des requêtes filtrant par mode

---

## 🐛 Dépannage

### Erreur "column already exists"
```
ERROR: column "is_test_mode" of relation "transactions" already exists
```
✅ C'est normal si la migration a déjà été appliquée. Pas de problème.

### Erreur de permissions
```
ERROR: permission denied for table transactions
```
❌ Utilisez un compte avec les droits d'administration (service_role).

### La colonne n'apparaît pas
1. Rafraîchissez la page du Dashboard
2. Vérifiez que vous êtes sur le bon projet
3. Consultez les logs de la migration

---

**Date de création** : 6 décembre 2025
