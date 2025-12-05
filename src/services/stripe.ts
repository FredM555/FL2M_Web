// src/services/stripe.ts
import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

/**
 * Récupère l'instance Stripe avec la clé publique
 */
export const getStripe = (): Promise<Stripe | null> => {
  if (!stripePromise) {
    const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

    if (!publishableKey) {
      console.error('VITE_STRIPE_PUBLISHABLE_KEY non définie dans les variables d\'environnement');
      return Promise.resolve(null);
    }

    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};

/**
 * IDs des prix Stripe pour les abonnements intervenants
 */
export const STRIPE_PRICE_IDS = {
  starter: import.meta.env.STRIPE_STARTER_PRICE_ID || '',
  pro: import.meta.env.STRIPE_PRO_PRICE_ID || '',
  premium: import.meta.env.STRIPE_PREMIUM_PRICE_ID || ''
};

/**
 * Crée une session de paiement Stripe Checkout pour un abonnement intervenant
 */
export const createSubscriptionCheckout = async (
  contractId: string,
  contractType: 'starter' | 'pro' | 'premium'
) => {
  const priceId = STRIPE_PRICE_IDS[contractType];

  if (!priceId) {
    throw new Error(`Prix Stripe non configuré pour le contrat ${contractType}`);
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-create-subscription-checkout`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        priceId,
        contractId,
        contractType,
        successUrl: `${window.location.origin}/practitioner-payment/success?contractId=${contractId}`,
        cancelUrl: `${window.location.origin}/practitioner-payment?contractId=${contractId}&contractType=${contractType}`
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erreur lors de la création de la session de paiement');
  }

  return await response.json();
};

/**
 * Crée une session de paiement Stripe Checkout pour un rendez-vous
 */
export const createAppointmentCheckout = async (
  appointmentId: string,
  amount: number,
  practitionerId: string,
  clientId: string,
  description: string
) => {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-create-appointment-payment`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        appointmentId,
        amount,
        practitionerId,
        clientId,
        description,
        successUrl: `${window.location.origin}/appointment-success?appointmentId=${appointmentId}`,
        cancelUrl: `${window.location.origin}/appointment-booking`
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erreur lors de la création du paiement');
  }

  return await response.json();
};

/**
 * Redirige vers Stripe Checkout
 * @param sessionIdOrUrl - L'ID de session ou l'URL de checkout Stripe
 */
export const redirectToCheckout = async (sessionIdOrUrl: string) => {
  // Si c'est une URL (commence par http), rediriger directement
  if (sessionIdOrUrl.startsWith('http')) {
    window.location.href = sessionIdOrUrl;
    return;
  }

  // Sinon, c'est un sessionId - construire l'URL manuellement
  // Note: Cette méthode est dépréciée depuis Stripe.js v17+
  // Il est préférable d'utiliser directement l'URL retournée par l'API
  const stripe = await getStripe();

  if (!stripe) {
    throw new Error('Erreur lors du chargement de Stripe');
  }

  // Pour compatibilité avec les anciennes versions, mais préférez passer l'URL directement
  throw new Error('Veuillez utiliser l\'URL de checkout au lieu du sessionId');
};

/**
 * Valide qu'une séance s'est bien déroulée
 */
export const validateAppointment = async (
  appointmentId: string,
  validated: boolean,
  comment?: string
) => {
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-appointment`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        appointmentId,
        validated,
        comment
      })
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erreur lors de la validation');
  }

  return await response.json();
};
