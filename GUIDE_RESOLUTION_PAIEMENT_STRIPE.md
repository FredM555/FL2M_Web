# Guide de résolution - Paiements Stripe non validés

## Problème identifié

Après un paiement réussi sur Stripe, le rendez-vous reste "impayé" et non confirmé.

## Cause principale

Le webhook Stripe n'est pas correctement configuré avec le secret webhook, ce qui empêche le traitement des événements de paiement.

---

## Solution étape par étape

### Étape 1 : Configurer le webhook dans Stripe Dashboard

1. **Accédez au Dashboard Stripe** :
   - URL : https://dashboard.stripe.com/webhooks
   - Connectez-vous avec vos identifiants

2. **Créer ou modifier le webhook** :
   - Si vous n'avez pas de webhook, cliquez sur "Ajouter un endpoint"
   - **URL du webhook** : `https://[VOTRE_PROJECT_ID].supabase.co/functions/v1/stripe-webhook`
     - Remplacez `[VOTRE_PROJECT_ID]` par l'ID de votre projet Supabase

3. **Sélectionner les événements à écouter** :
   ```
   ✓ checkout.session.completed
   ✓ payment_intent.succeeded
   ✓ payment_intent.payment_failed
   ✓ customer.subscription.created
   ✓ customer.subscription.updated
   ✓ customer.subscription.deleted
   ✓ invoice.payment_succeeded
   ✓ invoice.payment_failed
   ✓ transfer.created
   ✓ transfer.updated
   ✓ account.updated
   ```

4. **Copier le Signing Secret** :
   - Cliquez sur le webhook créé
   - Dans la section "Signing secret", cliquez sur "Révéler"
   - Copiez le secret (commence par `whsec_...`)

### Étape 2 : Configurer le secret dans Supabase

Exécutez cette commande dans votre terminal :

```bash
npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_VOTRE_SECRET_ICI
```

⚠️ **Important** : Remplacez `whsec_VOTRE_SECRET_ICI` par le vrai secret copié à l'étape précédente.

### Étape 3 : Vérifier que le secret est bien configuré

```bash
npx supabase secrets list
```

Vous devriez voir `STRIPE_WEBHOOK_SECRET` dans la liste.

### Étape 4 : Tester le paiement

1. **Créer un nouveau rendez-vous** sur votre application

2. **Effectuer un paiement de test** :
   - Utilisez la carte de test Stripe : `4242 4242 4242 4242`
   - Date d'expiration : n'importe quelle date future
   - CVC : n'importe quel 3 chiffres

3. **Vérifier le résultat** :
   - Vous devriez être redirigé vers la page de succès
   - La page vérifie automatiquement le statut (max 10 secondes)
   - Si configuré correctement : "Paiement réussi !" s'affiche
   - Si non configuré : message d'avertissement "Paiement en cours de traitement"

4. **Vérifier dans la base de données** :
   - Le rendez-vous doit avoir `status = 'confirmed'`
   - La transaction doit avoir `status = 'succeeded'`

---

## Vérifications supplémentaires

### Consulter les logs du webhook

Pour voir si le webhook reçoit bien les événements de Stripe :

```bash
npx supabase functions logs stripe-webhook --limit 50
```

Vous devriez voir des logs comme :
```
[Webhook] Événement reçu: checkout.session.completed
[Webhook] Paiement rendez-vous: [ID_DU_RENDEZ_VOUS]
```

### Tester le webhook depuis Stripe Dashboard

1. Allez sur https://dashboard.stripe.com/webhooks
2. Cliquez sur votre webhook
3. Onglet "Tentatives d'envoi"
4. Vous devriez voir les événements envoyés avec un statut 200 (succès)

Si vous voyez des erreurs 400 ou 401, c'est que le secret n'est pas correctement configuré.

---

## Amélioration apportée : Page de succès intelligente

La page `AppointmentPaymentSuccessPage.tsx` a été améliorée pour :

1. **Vérifier réellement le statut** du paiement dans la base de données
2. **Réessayer jusqu'à 10 fois** (1 par seconde) pour laisser le temps au webhook de traiter
3. **Afficher un message clair** selon le résultat :
   - ✅ Succès : "Paiement réussi !"
   - ⚠️ En attente : "Paiement en cours de traitement" avec instructions
   - ❌ Erreur : Message d'erreur détaillé

---

## Flux technique (pour référence)

```
1. Client effectue le paiement
   ↓
2. Stripe traite le paiement
   ↓
3. Stripe redirige vers /appointment-success?appointmentId=XXX
   ↓
4. Page de succès vérifie le statut en base (polling 10x)
   ↓
5. Stripe envoie webhook → stripe-webhook function
   ↓
6. Webhook vérifie la signature avec STRIPE_WEBHOOK_SECRET
   ↓
7. Si valide : handleAppointmentPaymentCompleted()
   - Met à jour transaction → status: 'succeeded'
   - Met à jour appointment → status: 'confirmed'
   - Calcule date d'éligibilité au transfert (48h après RDV)
   ↓
8. Page de succès détecte le changement et affiche "Paiement réussi !"
```

---

## Dépannage

### Le paiement reste "en cours de traitement"

**Causes possibles** :
- Secret webhook non configuré ou incorrect
- Webhook non créé dans Stripe Dashboard
- URL du webhook incorrecte
- Événements non sélectionnés dans le webhook

**Solution** :
1. Vérifier que le secret est bien configuré : `npx supabase secrets list`
2. Vérifier les logs du webhook : `npx supabase functions logs stripe-webhook`
3. Tester l'envoi depuis Stripe Dashboard

### Le webhook retourne une erreur 400

**Cause** : Le secret webhook est incorrect ou non configuré

**Solution** :
1. Re-copier le secret depuis Stripe Dashboard
2. Reconfigurer avec `npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...`

### Les événements n'arrivent pas au webhook

**Causes possibles** :
- URL du webhook incorrecte
- Webhook désactivé dans Stripe

**Solution** :
1. Vérifier l'URL dans Stripe Dashboard
2. Vérifier que le webhook est actif (toggle "Actif")

---

## Contact support

Si le problème persiste après avoir suivi ce guide :
1. Vérifier les logs Supabase : `npx supabase functions logs stripe-webhook`
2. Vérifier les tentatives d'envoi dans Stripe Dashboard
3. Vérifier que tous les secrets Stripe sont configurés :
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
