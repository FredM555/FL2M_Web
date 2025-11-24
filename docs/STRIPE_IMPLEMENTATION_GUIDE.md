# Guide d'Implémentation Stripe - FLM Services

**Date:** 2025-01-23
**Version:** 1.0

---

## 🏗️ Architecture Technique Détaillée

### Vue d'Ensemble du Flux de Paiement

```
┌──────────────┐
│   CLIENT     │
│  (Réserve)   │
└──────┬───────┘
       │
       │ 1. Réservation RDV (60€)
       ↓
┌──────────────────────────────┐
│   FRONTEND (React)           │
│  - Confirmation RDV          │
│  - Stripe Checkout           │
└──────────┬───────────────────┘
           │
           │ 2. Paiement initié
           ↓
┌────────────────────────────────────┐
│        STRIPE CHECKOUT             │
│  - Saisie CB sécurisée            │
│  - 3D Secure                      │
│  - Validation paiement            │
└──────────┬─────────────────────────┘
           │
           │ 3. Payment Success
           ↓
┌────────────────────────────────────┐
│         STRIPE CONNECT             │
│  Calcul automatique:               │
│  - Total: 60€                      │
│  - Frais Stripe: 1,30€            │
│  - Commission plateforme: 10€      │
│  - Part intervenant: 48,70€       │
└──────────┬─────────────────────────┘
           │
           │ 4. Webhook 'payment_intent.succeeded'
           ↓
┌────────────────────────────────────┐
│       BACKEND (Supabase)           │
│  - Mise à jour appointment         │
│  - Création transaction            │
│  - Notification client             │
│  - Notification intervenant        │
└──────────┬─────────────────────────┘
           │
           │ 5. Transfert (J+7)
           ↓
┌────────────────────────────────────┐
│   COMPTE STRIPE INTERVENANT        │
│  + 48,70€                          │
│  Virement bancaire auto (J+2)      │
└────────────────────────────────────┘
```

---

## 💻 Exemples de Code

### 1. Configuration Stripe (Backend)

```typescript
// src/config/stripe.ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
});

export const STRIPE_CONFIG = {
  // Commission plateforme selon abonnement
  COMMISSIONS: {
    none: {
      fixe: 10, // 10€ par RDV
      pourcentage: 12, // OU 12% (le plus élevé)
      max: 25 // Plafond
    },
    starter: {
      fixe: 6,
      pourcentage: 8,
      max: null
    },
    pro: {
      fixe: 3,
      pourcentage: 0,
      max: null
    },
    premium: {
      fixe: 0,
      pourcentage: 0,
      max: null
    }
  },

  // Délai avant transfert (en jours)
  TRANSFER_DELAY: 7,

  // IDs des plans d'abonnement
  SUBSCRIPTION_PLANS: {
    starter: 'price_xxxxxxxxxxxxx', // ID Stripe
    pro: 'price_xxxxxxxxxxxxx',
    premium: 'price_xxxxxxxxxxxxx'
  }
};
```

### 2. Création d'une Session de Paiement

```typescript
// src/services/stripe-payments.ts

interface CreatePaymentSessionParams {
  appointmentId: string;
  clientId: string;
  practitionerId: string;
  amount: number; // En centimes (ex: 6000 pour 60€)
  serviceId: string;
}

export const createPaymentSession = async (params: CreatePaymentSessionParams) => {
  const { appointmentId, clientId, practitionerId, amount, serviceId } = params;

  // 1. Récupérer l'abonnement de l'intervenant
  const practitionerSubscription = await getPractitionerSubscription(practitionerId);
  const planType = practitionerSubscription?.plan_type || 'none';

  // 2. Calculer la commission
  const commission = calculateCommission(amount / 100, planType);

  // 3. Récupérer le Stripe Account ID de l'intervenant
  const practitioner = await getPractitioner(practitionerId);
  const stripeAccountId = practitioner.stripe_account_id;

  if (!stripeAccountId) {
    throw new Error('Intervenant non connecté à Stripe');
  }

  // 4. Créer la session Stripe Checkout
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'eur',
          product_data: {
            name: `Rendez-vous - ${serviceId}`,
            metadata: {
              appointment_id: appointmentId,
              practitioner_id: practitionerId,
            }
          },
          unit_amount: amount, // En centimes
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: Math.round(commission.platformAmount * 100), // Commission en centimes
      transfer_data: {
        destination: stripeAccountId, // Compte de l'intervenant
      },
      metadata: {
        appointment_id: appointmentId,
        client_id: clientId,
        practitioner_id: practitionerId,
        commission_amount: commission.platformAmount.toString(),
        commission_type: planType,
      }
    },
    customer_email: await getClientEmail(clientId),
    success_url: `${process.env.FRONTEND_URL}/appointments/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/appointments/cancel`,
    metadata: {
      appointment_id: appointmentId,
    }
  });

  return session;
};
```

### 3. Calcul de Commission

```typescript
// src/services/commission-calculator.ts

interface CommissionResult {
  totalAmount: number;        // Montant total payé par le client
  platformAmount: number;     // Commission plateforme
  practitionerAmount: number; // Part de l'intervenant
  stripeFeesEstimate: number; // Estimation frais Stripe
}

export const calculateCommission = (
  totalAmount: number, // En euros
  planType: 'none' | 'starter' | 'pro' | 'premium'
): CommissionResult => {
  const config = STRIPE_CONFIG.COMMISSIONS[planType];

  // Calcul commission
  let platformAmount = 0;

  if (config.pourcentage > 0) {
    // Commission en pourcentage
    const percentageAmount = (totalAmount * config.pourcentage) / 100;
    const fixedAmount = config.fixe;

    // Prendre le plus élevé
    platformAmount = Math.max(percentageAmount, fixedAmount);
  } else {
    platformAmount = config.fixe;
  }

  // Appliquer le plafond si défini
  if (config.max && platformAmount > config.max) {
    platformAmount = config.max;
  }

  // Estimation des frais Stripe (1,5% + 0,25€)
  const stripeFeesEstimate = (totalAmount * 0.015) + 0.25;

  // Part de l'intervenant
  const practitionerAmount = totalAmount - platformAmount - stripeFeesEstimate;

  return {
    totalAmount,
    platformAmount: Math.round(platformAmount * 100) / 100,
    practitionerAmount: Math.round(practitionerAmount * 100) / 100,
    stripeFeesEstimate: Math.round(stripeFeesEstimate * 100) / 100,
  };
};

// Exemples
console.log(calculateCommission(60, 'none'));
// {
//   totalAmount: 60,
//   platformAmount: 10,  // max(60 * 12% = 7.2, 10) = 10
//   practitionerAmount: 48.85,
//   stripeFeesEstimate: 1.15
// }

console.log(calculateCommission(150, 'none'));
// {
//   totalAmount: 150,
//   platformAmount: 25,  // 150 * 12% = 18, plafonné à 25
//   practitionerAmount: 122.6,
//   stripeFeesEstimate: 2.4
// }

console.log(calculateCommission(60, 'pro'));
// {
//   totalAmount: 60,
//   platformAmount: 3,
//   practitionerAmount: 55.85,
//   stripeFeesEstimate: 1.15
// }
```

### 4. Onboarding Intervenant sur Stripe Connect

```typescript
// src/services/stripe-connect.ts

export const createConnectAccount = async (practitionerId: string) => {
  const practitioner = await getPractitioner(practitionerId);
  const profile = practitioner.profile;

  // Créer un compte Connect Express
  const account = await stripe.accounts.create({
    type: 'express',
    country: 'FR',
    email: profile.email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: 'individual',
    individual: {
      email: profile.email,
      first_name: profile.first_name,
      last_name: profile.last_name,
    },
    metadata: {
      practitioner_id: practitionerId,
      user_id: profile.id,
    }
  });

  // Sauvegarder l'account ID
  await updatePractitioner(practitionerId, {
    stripe_account_id: account.id,
  });

  // Créer un lien d'onboarding
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${process.env.FRONTEND_URL}/dashboard/settings/stripe/refresh`,
    return_url: `${process.env.FRONTEND_URL}/dashboard/settings/stripe/complete`,
    type: 'account_onboarding',
  });

  return {
    accountId: account.id,
    onboardingUrl: accountLink.url,
  };
};
```

### 5. Gestion des Webhooks

```typescript
// src/api/webhooks/stripe.ts

export const handleStripeWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature']!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Gérer les différents événements
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
      break;

    case 'payment_intent.payment_failed':
      await handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
      break;

    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionChange(event.data.object as Stripe.Subscription);
      break;

    case 'customer.subscription.deleted':
      await handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
      break;

    case 'transfer.created':
      await handleTransferCreated(event.data.object as Stripe.Transfer);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
};

const handlePaymentSuccess = async (paymentIntent: Stripe.PaymentIntent) => {
  const appointmentId = paymentIntent.metadata.appointment_id;
  const commissionAmount = parseFloat(paymentIntent.metadata.commission_amount);

  // 1. Mettre à jour le rendez-vous
  await supabase
    .from('appointments')
    .update({
      payment_status: 'paid',
      payment_id: paymentIntent.id,
    })
    .eq('id', appointmentId);

  // 2. Créer une transaction
  await supabase
    .from('transactions')
    .insert({
      appointment_id: appointmentId,
      stripe_payment_intent_id: paymentIntent.id,
      amount_total: paymentIntent.amount / 100,
      amount_platform: commissionAmount,
      amount_practitioner: (paymentIntent.amount / 100) - commissionAmount,
      amount_stripe_fees: estimateStripeFees(paymentIntent.amount / 100),
      currency: paymentIntent.currency,
      status: 'succeeded',
    });

  // 3. Envoyer notifications
  await sendPaymentConfirmationEmail(appointmentId);
};
```

### 6. Gestion des Abonnements

```typescript
// src/services/subscription-manager.ts

export const subscribePractitioner = async (
  practitionerId: string,
  planCode: 'starter' | 'pro' | 'premium'
) => {
  const practitioner = await getPractitioner(practitionerId);
  const profile = practitioner.profile;

  // Vérifier si l'intervenant a déjà un customer Stripe
  let customerId = practitioner.stripe_customer_id;

  if (!customerId) {
    // Créer un customer
    const customer = await stripe.customers.create({
      email: profile.email,
      name: `${profile.first_name} ${profile.last_name}`,
      metadata: {
        practitioner_id: practitionerId,
        user_id: profile.id,
      }
    });

    customerId = customer.id;

    // Sauvegarder le customer ID
    await updatePractitioner(practitionerId, {
      stripe_customer_id: customerId,
    });
  }

  // Récupérer le price ID du plan
  const priceId = STRIPE_CONFIG.SUBSCRIPTION_PLANS[planCode];

  // Créer l'abonnement
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    payment_settings: {
      save_default_payment_method: 'on_subscription'
    },
    expand: ['latest_invoice.payment_intent'],
    metadata: {
      practitioner_id: practitionerId,
      plan_code: planCode,
    }
  });

  // Sauvegarder l'abonnement dans la BDD
  await supabase
    .from('practitioner_subscriptions')
    .insert({
      practitioner_id: practitionerId,
      plan_type: planCode,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
    });

  // Retourner le client secret pour confirmer le paiement
  const invoice = subscription.latest_invoice as Stripe.Invoice;
  const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;

  return {
    subscriptionId: subscription.id,
    clientSecret: paymentIntent?.client_secret,
  };
};
```

---

## 📱 Interface Utilisateur

### Page de Sélection d'Abonnement (Intervenant)

```typescript
// src/pages/SubscriptionPlansPage.tsx

const SubscriptionPlansPage = () => {
  const plans = [
    {
      code: 'none',
      name: 'Sans Abonnement',
      price: 0,
      commission: '10€/RDV ou 12%',
      features: [
        'Accès à la plateforme',
        'Calendrier de disponibilités',
        'Notifications par email',
      ],
      limitations: [
        'Commission élevée par RDV',
        'Pas de priorisation',
      ]
    },
    {
      code: 'starter',
      name: 'Starter',
      price: 60,
      commission: '6€/RDV',
      recommended: false,
      features: [
        'Tout du plan gratuit',
        'Commission réduite',
        'Support prioritaire',
        'Jusqu\'à 15 RDV/mois',
      ],
    },
    {
      code: 'pro',
      name: 'Pro',
      price: 100,
      commission: '3€/RDV (frais technique)',
      recommended: true,
      features: [
        'Tout du plan Starter',
        'RDV illimités',
        'Priorisation dans les résultats',
        'Badge "Pro"',
        'Analytics basiques',
      ],
    },
    {
      code: 'premium',
      name: 'Premium',
      price: 180,
      commission: '0€',
      features: [
        'Tout du plan Pro',
        'Aucune commission',
        'Featured sur la homepage',
        'Newsletter dédiée',
        'Analytics avancés',
        'Export comptable',
      ],
    }
  ];

  // ... Render logic
};
```

---

## 🔒 Sécurité

### Checklist de Sécurité

- [ ] **Clés API Stripe** : Stockées dans variables d'environnement
- [ ] **Webhooks** : Vérification signature obligatoire
- [ ] **Montants** : Validation côté serveur uniquement
- [ ] **HTTPS** : Obligatoire pour Stripe
- [ ] **PCI Compliance** : Géré par Stripe (pas de stockage CB)
- [ ] **Logs** : Audit trail de toutes les transactions
- [ ] **Idempotence** : Clés idempotentes pour les requêtes critiques

### Exemple de Validation Serveur

```typescript
// JAMAIS faire confiance au montant envoyé par le client
const createPayment = async (appointmentId: string) => {
  // ✅ BON : Récupérer le prix depuis la BDD
  const appointment = await getAppointment(appointmentId);
  const service = await getService(appointment.service_id);
  const amount = appointment.custom_price || service.price;

  // Créer le paiement avec le montant validé
  return createPaymentSession({
    appointmentId,
    amount: amount * 100, // En centimes
    // ...
  });

  // ❌ MAUVAIS : Faire confiance au montant du client
  // const amount = req.body.amount; // DANGEREUX !
};
```

---

## 📊 Dashboard Intervenant

### Métriques à Afficher

```typescript
interface PractitionerDashboard {
  // Période courante
  currentMonth: {
    totalAppointments: number;
    totalRevenue: number;        // Montant reçu
    platformCommissions: number; // Commissions payées
    stripeFeesEstimate: number; // Frais Stripe estimés
    netRevenue: number;         // Net après tout
  };

  // Abonnement
  subscription: {
    plan: 'none' | 'starter' | 'pro' | 'premium';
    status: 'active' | 'canceled' | 'past_due';
    nextBillingDate?: Date;
    canUpgrade: boolean;
  };

  // Recommandation
  recommendation?: {
    suggestedPlan: string;
    estimatedSavings: number; // Par mois
    breakEvenPoint: number;   // Nombre de RDV
  };

  // Paiements en attente
  pendingPayouts: {
    amount: number;
    expectedDate: Date;
  }[];
}
```

---

## 🚨 Gestion des Erreurs

### Cas d'Erreur Courants

1. **Paiement refusé**
   - Notification client
   - RDV reste "pending"
   - Retry possible

2. **Compte Connect non vérifié**
   - Bloquer réservations
   - Notification intervenant
   - Lien re-vérification

3. **Échec abonnement**
   - Downgrade automatique après 3 échecs
   - Notifications multiples
   - Mise à jour commission

4. **Remboursement**
   - Vérifier si transfert déjà effectué
   - Calcul commission à rembourser
   - Notification toutes parties

---

## 📈 KPIs à Suivre

### Plateforme
- Taux de conversion checkout
- Taux d'abandon panier
- Répartition par plan d'abonnement
- Revenu moyen par intervenant
- Taux de churm abonnements

### Intervenants
- Revenu moyen par RDV
- Économies par plan
- Taux d'upgrade
- Satisfaction paiements

---

## ✅ Checklist de Lancement

### Avant Production
- [ ] Compte Stripe activé et vérifié
- [ ] Webhooks configurés et testés
- [ ] Tests de paiement (cartes test Stripe)
- [ ] Flow de remboursement testé
- [ ] CGV et politique remboursement publiées
- [ ] Support client formé
- [ ] Monitoring erreurs Stripe actif
- [ ] Backup BDD automatisé
- [ ] Tests de charge effectués

### Documentation
- [ ] Guide d'onboarding intervenant
- [ ] FAQ paiements
- [ ] Processus de support
- [ ] Runbook incidents

---

## 🎯 Conclusion

Cette implémentation Stripe Connect offre :
- ✅ Paiements sécurisés et conformes
- ✅ Commission automatique
- ✅ Gestion d'abonnements flexible
- ✅ Virements automatiques
- ✅ Scalabilité

**Budget estimé:** 60-80h développement
**Délai estimé:** 6-8 semaines
**ROI:** Positif dès 30 intervenants actifs
