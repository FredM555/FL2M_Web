// src/services/stripeConnect.ts
import { supabase } from './supabase';

export interface StripeConnectStatus {
  hasAccount: boolean;
  accountId?: string;
  status: 'not_created' | 'incomplete' | 'pending' | 'complete';
  canReceivePayments: boolean;
  detailsSubmitted?: boolean;
  requiresAction?: boolean;
}

export interface StripeConnectOnboardingResult {
  accountId: string;
  status: 'incomplete' | 'complete';
  onboardingUrl?: string;
  dashboardUrl?: string;
}

/**
 * Crée un compte Stripe Connect pour l'intervenant ou récupère le lien d'onboarding
 */
export const createConnectAccount = async (): Promise<StripeConnectOnboardingResult> => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Non authentifié');
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-create-connect-account`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'Origin': window.location.origin
      }
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erreur lors de la création du compte Connect');
  }

  return await response.json();
};

/**
 * Vérifie le statut du compte Stripe Connect de l'intervenant
 */
export const checkConnectStatus = async (): Promise<StripeConnectStatus> => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Non authentifié');
  }

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/stripe-check-connect-status`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      }
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Erreur lors de la vérification du statut');
  }

  return await response.json();
};

/**
 * Crée un lien vers le dashboard Stripe Connect de l'intervenant
 */
export const createConnectDashboardLink = async (accountId: string): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Non authentifié');
  }

  // Pour l'instant, on retourne simplement vers Stripe
  // Dans une version plus avancée, on pourrait créer un login link via une Edge Function
  return `https://dashboard.stripe.com/test/connect/accounts/${accountId}`;
};
