# 💳 Guide de Configuration des Paiements d'Abonnements Intervenants

## 🎯 Vue d'ensemble

Ce guide explique comment configurer Stripe pour gérer les paiements d'abonnements mensuels des intervenants lors de leur inscription sur FLM Services.

---

## 📋 Flux de Paiement

### Parcours Intervenant avec Paiement

```
1. L'intervenant finalise son inscription
   └─> Choisit son type de contrat (FREE, STARTER, PRO, PREMIUM)
       │
       ├─> Si FREE (0€/mois)
       │   └─> ✅ Activation immédiate (pas de paiement)
       │
       └─> Si STARTER/PRO/PREMIUM
           └─> Redirection vers /practitioner-payment
               └─> Page de paiement Stripe
                   └─> Paiement validé
                       └─> Contrat activé ✅
```

### États du Contrat

| Statut | Description | Action requise |
|--------|-------------|----------------|
| `pending_payment` | En attente du paiement | L'intervenant doit payer |
| `active` | Contrat actif | Aucune action |
| `suspended` | Contrat suspendu | Contacter l'admin |
| `terminated` | Contrat terminé | Renouveler ou changer |

---

## 🔧 Configuration Stripe

### Prérequis

1. **Compte Stripe** : Créer un compte sur [stripe.com](https://stripe.com)
2. **Clés API** : Récupérer les clés de test et de production
3. **Webhooks** : Configurer les webhooks pour les événements de paiement

### Étape 1 : Installation des dépendances

```bash
npm install @stripe/stripe-js stripe
```

### Étape 2 : Variables d'environnement

Ajouter dans `.env` :

```env
# Stripe - Clés publiques (frontend)
VITE_STRIPE_PUBLISHABLE_KEY_TEST=pk_test_...
VITE_STRIPE_PUBLISHABLE_KEY_LIVE=pk_live_...

# Stripe - Clés secrètes (backend/Supabase)
STRIPE_SECRET_KEY_TEST=sk_test_...
STRIPE_SECRET_KEY_LIVE=sk_live_...

# Stripe - Webhooks
STRIPE_WEBHOOK_SECRET_TEST=whsec_...
STRIPE_WEBHOOK_SECRET_LIVE=whsec_...
```

### Étape 3 : Créer les produits et prix dans Stripe

#### Via Dashboard Stripe :

1. Aller dans **Produits** > **Ajouter un produit**
2. Créer 3 produits (pas besoin pour FREE qui est à 0€) :

**Produit 1 : FLM Services - Starter**
- Nom : `FLM Services - Abonnement Starter`
- Description : `Abonnement mensuel Starter pour intervenants`
- Prix : `60€ / mois` (récurrent)
- ID Prix : Copier le `price_xxx` généré

**Produit 2 : FLM Services - Pro**
- Nom : `FLM Services - Abonnement Pro`
- Description : `Abonnement mensuel Pro pour intervenants`
- Prix : `100€ / mois` (récurrent)
- ID Prix : Copier le `price_xxx` généré

**Produit 3 : FLM Services - Premium**
- Nom : `FLM Services - Abonnement Premium`
- Description : `Abonnement mensuel Premium pour intervenants`
- Prix : `160€ / mois` (récurrent)
- ID Prix : Copier le `price_xxx` généré

#### Ajouter les IDs de prix dans `.env` :

```env
# Stripe Price IDs
STRIPE_STARTER_PRICE_ID=price_xxx
STRIPE_PRO_PRICE_ID=price_xxx
STRIPE_PREMIUM_PRICE_ID=price_xxx
```

---

## 💻 Implémentation Frontend

### Service Stripe

Créer `src/services/stripe.ts` :

```typescript
import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_TEST ||
                          import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY_LIVE;
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};

export const STRIPE_PRICE_IDS = {
  starter: import.meta.env.STRIPE_STARTER_PRICE_ID,
  pro: import.meta.env.STRIPE_PRO_PRICE_ID,
  premium: import.meta.env.STRIPE_PREMIUM_PRICE_ID
};

export const createSubscriptionCheckout = async (
  priceId: string,
  contractId: string
) => {
  const response = await fetch('/api/stripe/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      priceId,
      contractId,
      successUrl: `${window.location.origin}/practitioner-payment/success?contractId=${contractId}`,
      cancelUrl: `${window.location.origin}/practitioner-payment?contractId=${contractId}`
    })
  });

  const session = await response.json();
  return session;
};
```

### Mise à jour de PractitionerPaymentPage.tsx

Remplacer le paiement simulé par l'intégration Stripe :

```typescript
import { getStripe, STRIPE_PRICE_IDS, createSubscriptionCheckout } from '../services/stripe';

const handlePayment = async () => {
  if (!contractId || !contractType) return;

  setLoading(true);
  setError(null);

  try {
    // Récupérer le Price ID Stripe selon le type de contrat
    const priceId = STRIPE_PRICE_IDS[contractType];

    if (!priceId) {
      throw new Error('Prix Stripe non configuré pour ce type de contrat');
    }

    // Créer la session de paiement Stripe Checkout
    const session = await createSubscriptionCheckout(priceId, contractId);

    // Rediriger vers Stripe Checkout
    const stripe = await getStripe();

    if (!stripe) {
      throw new Error('Erreur lors du chargement de Stripe');
    }

    const { error: stripeError } = await stripe.redirectToCheckout({
      sessionId: session.id
    });

    if (stripeError) {
      throw new Error(stripeError.message);
    }
  } catch (err: any) {
    console.error('Erreur lors du paiement:', err);
    setError(err.message || 'Erreur lors du traitement du paiement');
    setLoading(false);
  }
};
```

---

## 🔙 Implémentation Backend (Supabase Edge Functions)

### Créer une Edge Function pour Stripe Checkout

`supabase/functions/stripe-create-checkout/index.ts` :

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.11.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient()
});

serve(async (req) => {
  try {
    const { priceId, contractId, successUrl, cancelUrl } = await req.json();

    // Créer une session de paiement Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        contract_id: contractId
      }
    });

    return new Response(
      JSON.stringify({ id: session.id }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
```

### Créer un Webhook pour gérer les événements Stripe

`supabase/functions/stripe-webhook/index.ts` :

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.11.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient()
});

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature!, webhookSecret);

    // Gérer les événements
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        const contractId = session.metadata?.contract_id;

        if (contractId && session.subscription) {
          // Activer le contrat après paiement réussi
          const { error } = await supabase.rpc('activate_contract_after_payment', {
            p_contract_id: contractId,
            p_stripe_payment_intent_id: session.payment_intent || session.subscription
          });

          if (error) {
            console.error('Erreur lors de l\'activation du contrat:', error);
          }
        }
        break;

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        // Gérer les mises à jour et annulations d'abonnement
        const subscription = event.data.object as Stripe.Subscription;
        // TODO: Mettre à jour le statut du contrat si nécessaire
        break;

      default:
        console.log(`Événement non géré: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200
    });
  } catch (error) {
    console.error('Erreur webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400 }
    );
  }
});
```

---

## 🔗 Configuration des Webhooks Stripe

### Étape 1 : URL du Webhook

Dans le Dashboard Stripe, aller dans **Développeurs** > **Webhooks** > **Ajouter un endpoint**

URL du webhook :
```
https://[votre-projet].supabase.co/functions/v1/stripe-webhook
```

### Étape 2 : Sélectionner les événements

Cocher les événements suivants :
- ✅ `checkout.session.completed`
- ✅ `customer.subscription.created`
- ✅ `customer.subscription.updated`
- ✅ `customer.subscription.deleted`
- ✅ `invoice.payment_succeeded`
- ✅ `invoice.payment_failed`

### Étape 3 : Copier le Signing Secret

Copier le `whsec_xxx` et l'ajouter dans les variables d'environnement.

---

## 🚀 Déploiement

### 1. Appliquer la migration SQL

```bash
npx supabase migration apply
```

### 2. Déployer les Edge Functions

```bash
# Déployer la fonction de création de checkout
supabase functions deploy stripe-create-checkout --no-verify-jwt

# Déployer le webhook
supabase functions deploy stripe-webhook --no-verify-jwt

# Configurer les secrets
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### 3. Tester en mode Test

Utiliser les cartes de test Stripe :
- **Succès** : `4242 4242 4242 4242`
- **Échec** : `4000 0000 0000 0002`
- **3D Secure** : `4000 0025 0000 3155`

Date d'expiration : N'importe quelle date future
CVC : N'importe quel nombre à 3 chiffres

---

## 📊 Gestion des Abonnements

### Renouvellement Automatique

Les abonnements se renouvellent automatiquement chaque mois. Stripe envoie une facture et tente le paiement.

**Si le paiement réussit** :
- ✅ L'abonnement continue
- ✅ Le contrat reste `active`

**Si le paiement échoue** :
- ⚠️ Stripe réessaie automatiquement (3 tentatives)
- ⚠️ Webhook `invoice.payment_failed` déclenché
- ❌ Si toutes les tentatives échouent : abonnement annulé
- ❌ Le contrat passe en `suspended`

### Annulation d'Abonnement

L'intervenant peut annuler son abonnement :
- Via le Dashboard FLM (à implémenter)
- Via le portail client Stripe

### Changement de Formule

L'intervenant peut upgrader/downgrader :
- Créer un nouvel abonnement
- Annuler l'ancien
- Calculer le prorata

---

## 🛡️ Sécurité

### Bonnes Pratiques

1. **Ne jamais exposer les clés secrètes** dans le frontend
2. **Toujours valider côté serveur** (Supabase Edge Functions)
3. **Vérifier les signatures des webhooks** avec le signing secret
4. **Logger tous les événements** de paiement pour audit
5. **Gérer les échecs gracieusement** avec des messages clairs

### Gestion des Erreurs

```typescript
try {
  // Tentative de paiement
} catch (error) {
  if (error.type === 'StripeCardError') {
    // Carte refusée
    setError('Votre carte a été refusée. Veuillez vérifier vos informations.');
  } else if (error.type === 'StripeInvalidRequestError') {
    // Requête invalide
    setError('Erreur de configuration. Contactez le support.');
  } else {
    // Autre erreur
    setError('Une erreur est survenue. Réessayez plus tard.');
  }
}
```

---

## 📞 Support et Débogage

### Logs Stripe

Dashboard Stripe > **Développeurs** > **Logs** :
- Voir tous les événements webhook
- Vérifier les paiements réussis/échoués
- Consulter les détails des erreurs

### Logs Supabase

Dashboard Supabase > **Edge Functions** > **Logs** :
- Voir les logs des fonctions
- Déboguer les erreurs serveur

### Mode Test

Toujours tester en mode test avant de passer en production !

---

## ✅ Checklist de Déploiement

- [ ] Compte Stripe créé et vérifié
- [ ] Produits et prix créés dans Stripe
- [ ] Clés API configurées dans `.env`
- [ ] Edge Functions déployées
- [ ] Webhooks configurés et testés
- [ ] Tests avec cartes de test effectués
- [ ] Gestion des erreurs implémentée
- [ ] Documentation à jour
- [ ] Passage en mode production (clés live)

---

## 🎉 Conclusion

Une fois configuré, le système de paiement des abonnements intervenants est **entièrement automatisé** :

✅ Paiement sécurisé via Stripe Checkout
✅ Activation automatique du contrat après paiement
✅ Renouvellement mensuel automatique
✅ Gestion des échecs et annulations
✅ Webhooks pour synchronisation en temps réel

**Note** : Le système actuel utilise un paiement simulé. Suivez ce guide pour l'intégration complète avec Stripe.
