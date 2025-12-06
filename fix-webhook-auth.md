# Fix Webhook Authentication - Solution temporaire

## Problème
Le webhook Stripe reçoit une erreur 401 "Missing authorization header" car Supabase Edge Functions requièrent par défaut une authentification.

## Solution appliquée
Création d'un fichier `.auth` vide dans `supabase/functions/stripe-webhook/` pour désactiver l'authentification.

## Déploiement requis

### Option A : Avec Docker Desktop (Recommandé)

1. Installer Docker Desktop : https://www.docker.com/products/docker-desktop/
2. Démarrer Docker Desktop
3. Exécuter :
   ```bash
   npx supabase functions deploy stripe-webhook --no-verify-jwt
   ```

### Option B : Via Dashboard Supabase

1. Aller sur https://supabase.com/dashboard
2. Sélectionner votre projet
3. Edge Functions > stripe-webhook
4. Dans les settings de la fonction, vérifier que "Require JWT" est désactivé

### Option C : Configuration via SQL (Solution de contournement)

Si les options ci-dessus ne fonctionnent pas, vous pouvez modifier la configuration de la fonction via SQL :

1. Aller dans SQL Editor sur le Dashboard Supabase
2. Exécuter cette requête :

```sql
-- Vérifier la configuration actuelle
SELECT * FROM supabase_functions.functions WHERE name = 'stripe-webhook';

-- Note: Les fonctions Edge sont gérées au niveau infrastructure,
-- pas au niveau base de données. Cette approche ne fonctionnera pas.
```

**Important** : Les Edge Functions Supabase sont déployées au niveau infrastructure, pas via SQL. Le déploiement via CLI ou Dashboard est obligatoire.

## Vérification après déploiement

1. Aller sur https://dashboard.stripe.com/webhooks
2. Cliquer sur votre webhook
3. Onglet "Tentatives d'envoi récentes"
4. Cliquer sur "Renvoyer" sur un événement `payment_intent.succeeded`
5. Vérifier que la réponse est 200 (succès) au lieu de 401

## Test complet

1. Faire un nouveau paiement test
2. Vérifier dans les logs Supabase :
   ```bash
   npx supabase functions logs stripe-webhook --limit 50
   ```
3. Vérifier que le rendez-vous est bien marqué comme "confirmé"
4. Vérifier que la transaction a le statut "succeeded"
