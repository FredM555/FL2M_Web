# Instructions de déploiement du webhook corrigé

## Modifications effectuées

✅ **Problème 1 résolu** : `payment_status` est maintenant mis à `'paid'` (ligne 370)
✅ **Problème 2 résolu** : Email de confirmation est envoyé automatiquement (lignes 374-426)

---

## Option A : Déploiement via Docker (Recommandé)

### Étape 1 : Démarrer Docker Desktop
1. Cherchez "Docker Desktop" dans le menu Démarrer Windows
2. Lancez l'application
3. Attendez que Docker soit complètement démarré (icône Docker dans la barre des tâches)

### Étape 2 : Déployer
```bash
npx supabase functions deploy stripe-webhook --no-verify-jwt
```

### Étape 3 : Vérifier
```bash
npx supabase functions list
```

Vous devriez voir `stripe-webhook` avec version 13 (ou supérieure à 12).

---

## Option B : Déploiement via Dashboard Supabase (Plus rapide)

### Étape 1 : Accéder au Dashboard
1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Menu **Edge Functions** > **stripe-webhook**

### Étape 2 : Créer un nouveau déploiement
1. Cliquez sur **"New deployment"** ou **"Deploy new version"**
2. Supprimez le code existant dans l'éditeur
3. Copiez-collez tout le contenu du fichier `supabase/functions/stripe-webhook/index.ts` (voir ci-dessous)
4. **IMPORTANT** : Vérifiez que "Require JWT" est **DÉSACTIVÉ**
5. Cliquez sur **"Deploy"**

### Code complet à copier (si vous utilisez le Dashboard)

Le fichier complet est dans :
- `C:\FLM\flm-services-new\supabase\functions\stripe-webhook\index.ts`

Vous pouvez l'ouvrir et copier tout son contenu.

---

## Test après déploiement

### 1. Vérifier le déploiement
```bash
npx supabase functions list
```

La version de `stripe-webhook` doit être >= 13.

### 2. Tester depuis Stripe Dashboard
1. Allez sur https://dashboard.stripe.com/webhooks
2. Cliquez sur votre webhook
3. Onglet "Tentatives d'envoi récentes"
4. Cliquez sur "Renvoyer" sur un événement `checkout.session.completed` ou `payment_intent.succeeded`
5. Vérifiez que la réponse est **200** (succès)

### 3. Test complet avec un nouveau paiement
1. Créez un nouveau rendez-vous sur votre application
2. Effectuez le paiement avec la carte de test : `4242 4242 4242 4242`
3. Attendez la redirection vers la page de succès
4. La page devrait afficher "Paiement réussi !" après 1-2 secondes

### 4. Vérifications
- [ ] Le rendez-vous a le statut **"Confirmé"** dans "Mes rendez-vous"
- [ ] Le paiement est marqué **"Payé"**
- [ ] Vous avez reçu un **email de confirmation** à l'adresse du bénéficiaire
- [ ] Les logs montrent l'email envoyé :

```bash
npx supabase functions logs stripe-webhook
```

Vous devriez voir :
```
[Webhook] Événement reçu: checkout.session.completed
[Webhook] Paiement rendez-vous: [ID]
[Webhook] Email de confirmation envoyé à [email]
```

---

## Résultat attendu

### Dans la base de données
Après un paiement réussi, dans la table `appointments` :
- `status` = `'confirmed'` ✅
- `payment_status` = `'paid'` ✅

Dans la table `transactions` :
- `status` = `'succeeded'` ✅
- `payment_date` est renseigné ✅
- `eligible_for_transfer_at` est calculé (48h après la fin du RDV) ✅

### Email envoyé
Le client devrait recevoir un email avec :
- ✅ Confirmation du paiement
- ✅ Détails du rendez-vous (date, heure, intervenant, prix)
- ✅ Code unique du rendez-vous
- ✅ Lien de visioconférence (si disponible)
- ✅ Rappel de valider la séance après le RDV

### Interface utilisateur
Dans "Mes rendez-vous" :
- Le rendez-vous apparaît avec une puce **"Confirmé"** (verte)
- Le statut de paiement affiche **"Payé"** (vert)

---

## En cas de problème

### Le déploiement échoue
- Vérifiez que Docker Desktop est bien démarré
- OU utilisez le Dashboard Supabase (Option B)

### L'email n'est pas envoyé
1. Vérifiez les logs :
   ```bash
   npx supabase functions logs stripe-webhook
   npx supabase functions logs send-email
   ```
2. Vérifiez que `RESEND_API_KEY` est bien configuré :
   ```bash
   npx supabase secrets list
   ```

### Le paiement n'est toujours pas marqué comme payé
1. Vérifiez que le webhook a bien été déployé (version >= 13)
2. Testez le webhook depuis Stripe Dashboard
3. Consultez les logs pour voir les erreurs

---

## Commandes utiles

```bash
# Lister les fonctions déployées
npx supabase functions list

# Consulter les logs du webhook
npx supabase functions logs stripe-webhook --limit 50

# Consulter les logs d'envoi d'email
npx supabase functions logs send-email --limit 50

# Lister les secrets configurés
npx supabase secrets list
```
