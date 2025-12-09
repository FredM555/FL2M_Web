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
 * Valide ou signale un problème sur un rendez-vous (SIMPLIFIÉ)
 * Change directement le status dans appointments et crée un log dans appointment_validations
 */
export const validateAppointment = async (
  appointmentId: string,
  validated: boolean,
  comment?: string
) => {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_ANON_KEY!
  );

  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error('Vous devez être connecté pour valider un rendez-vous');
  }

  // Vérifier que le rendez-vous appartient bien au client
  const { data: appointment, error: appointmentError } = await supabase
    .from('appointments')
    .select('id, client_id, status')
    .eq('id', appointmentId)
    .single();

  if (appointmentError || !appointment) {
    throw new Error('Rendez-vous non trouvé');
  }

  if (appointment.client_id !== session.user.id) {
    throw new Error('Ce rendez-vous ne vous appartient pas');
  }

  // Permettre la validation/signalement pour les RDV "completed" ou "issue_reported"
  const allowedStatuses = ['completed', 'issue_reported'];
  if (!allowedStatuses.includes(appointment.status)) {
    throw new Error('Ce rendez-vous doit être marqué comme terminé avant validation');
  }

  // Si déjà en issue_reported et qu'on essaie de re-signaler, bloquer
  if (appointment.status === 'issue_reported' && !validated) {
    throw new Error('Un problème a déjà été signalé pour ce rendez-vous. Vous pouvez le valider si le problème est résolu.');
  }

  // 1. CHANGER LE STATUS DANS APPOINTMENTS
  const newStatus = validated ? 'validated' : 'issue_reported';
  const { error: statusError } = await supabase
    .from('appointments')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', appointmentId);

  if (statusError) {
    console.error('[Validation] Erreur lors du changement de status:', statusError);
    throw new Error(`Erreur lors du changement de status: ${statusError.message}`);
  }

  // 2. CRÉER UN LOG DANS APPOINTMENT_VALIDATIONS
  const { data: transaction } = await supabase
    .from('transactions')
    .select('id')
    .eq('appointment_id', appointmentId)
    .maybeSingle();

  const validationData: any = {
    appointment_id: appointmentId,
    client_id: session.user.id,
    validated,
    validation_comment: comment || null,
    validated_at: new Date().toISOString()
  };

  if (transaction) {
    validationData.transaction_id = transaction.id;
  }

  const { data: validation, error: validationError } = await supabase
    .from('appointment_validations')
    .insert(validationData)
    .select()
    .single();

  if (validationError) {
    console.error('[Validation] Erreur lors de la création du log:', validationError);
    // Ne pas bloquer si le log échoue, le status a déjà été changé
  }

  // 3. GÉRER LA TRANSACTION
  if (transaction && validated) {
    await supabase
      .from('transactions')
      .update({
        eligible_for_transfer_at: new Date().toISOString(),
        transfer_status: 'eligible'
      })
      .eq('id', transaction.id);
  } else if (transaction && !validated) {
    await supabase
      .from('transactions')
      .update({
        transfer_status: 'failed',
        failure_reason: 'Client reported an issue'
      })
      .eq('id', transaction.id);
  }

  return {
    success: true,
    validation,
    newStatus
  };
};

/**
 * Envoie un email de notification de contestation à l'admin
 */
export const sendContestationEmail = async (appointmentId: string, problemDescription: string) => {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_ANON_KEY!
  );

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    console.error('[Email] Pas de session utilisateur');
    return;
  }

  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-contestation-email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          appointmentId,
          problemDescription
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('[Email] Erreur lors de l\'envoi:', error);
      // Ne pas bloquer si l'email échoue
      return;
    }

    const result = await response.json();
    console.log('[Email] Email de contestation envoyé:', result);
  } catch (error) {
    console.error('[Email] Erreur lors de l\'envoi de l\'email:', error);
    // Ne pas bloquer si l'email échoue
  }
};

/**
 * Fonction admin pour rétablir un rendez-vous après résolution d'un problème
 * Change le status de issue_reported vers completed
 */
export const restoreAppointment = async (appointmentId: string) => {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_ANON_KEY!
  );

  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    throw new Error('Vous devez être connecté');
  }

  // Vérifier que le RDV existe et a le bon status
  const { data: appointment, error: appointmentError } = await supabase
    .from('appointments')
    .select('id, status')
    .eq('id', appointmentId)
    .single();

  if (appointmentError || !appointment) {
    throw new Error('Rendez-vous non trouvé');
  }

  if (appointment.status !== 'issue_reported') {
    throw new Error('Ce rendez-vous n\'a pas de problème signalé');
  }

  // Changer le status vers completed (pour permettre la revalidation)
  const { error: statusError } = await supabase
    .from('appointments')
    .update({
      status: 'completed',
      updated_at: new Date().toISOString()
    })
    .eq('id', appointmentId);

  if (statusError) {
    console.error('[Restore] Erreur lors du rétablissement:', statusError);
    throw new Error(`Erreur lors du rétablissement: ${statusError.message}`);
  }

  // Rétablir la transaction si elle existe
  const { data: transaction } = await supabase
    .from('transactions')
    .select('id')
    .eq('appointment_id', appointmentId)
    .maybeSingle();

  if (transaction) {
    await supabase
      .from('transactions')
      .update({
        transfer_status: 'pending',
        failure_reason: null
      })
      .eq('id', transaction.id);
  }

  return {
    success: true,
    message: 'Rendez-vous rétabli avec succès'
  };
};
