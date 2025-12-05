// supabase/functions/stripe-webhook/index.ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@17.3.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-04-30.basil',
  httpClient: Stripe.createFetchHttpClient()
});

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return new Response(
      JSON.stringify({ error: 'No signature' }),
      { status: 400 }
    );
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`[Webhook] Événement reçu: ${event.type}`);

    // Gérer les différents types d'événements
    switch (event.type) {
      // ========================================
      // ABONNEMENTS INTERVENANTS
      // ========================================
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // Vérifier si c'est un abonnement intervenant
        if (session.mode === 'subscription' && session.metadata?.contract_id) {
          await handleSubscriptionCheckoutCompleted(supabase, session);
        }
        // Ou un paiement de rendez-vous
        else if (session.mode === 'payment' && session.metadata?.appointment_id) {
          await handleAppointmentPaymentCompleted(supabase, session);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(supabase, subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentSucceeded(supabase, invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(supabase, invoice);
        break;
      }

      // ========================================
      // PAIEMENTS DE RENDEZ-VOUS
      // ========================================
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentSucceeded(supabase, paymentIntent);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        await handlePaymentIntentFailed(supabase, paymentIntent);
        break;
      }

      // ========================================
      // TRANSFERTS ET PAYOUTS
      // ========================================
      case 'transfer.created':
      case 'transfer.updated': {
        const transfer = event.data.object as Stripe.Transfer;
        await handleTransferUpdated(supabase, transfer);
        break;
      }

      // ========================================
      // STRIPE CONNECT ACCOUNTS
      // ========================================
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        await handleAccountUpdated(supabase, account);
        break;
      }

      default:
        console.log(`[Webhook] Événement non géré: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200 }
    );

  } catch (error) {
    console.error('[Webhook] Erreur:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }),
      { status: 400 }
    );
  }
});

// ========================================
// HANDLERS
// ========================================

async function handleSubscriptionCheckoutCompleted(
  supabase: any,
  session: Stripe.Checkout.Session
) {
  const contractId = session.metadata?.contract_id;
  const subscriptionId = session.subscription as string;

  if (!contractId) return;

  console.log(`[Webhook] Activation du contrat: ${contractId}`);

  // Activer le contrat
  const { error: updateError } = await supabase
    .from('practitioner_contracts')
    .update({
      status: 'active',
      start_date: new Date().toISOString()
    })
    .eq('id', contractId);

  if (updateError) {
    console.error('[Webhook] Erreur activation contrat:', updateError);
    return;
  }

  // Créer un enregistrement de paiement d'abonnement
  const { error: paymentError } = await supabase
    .from('subscription_payments')
    .insert({
      practitioner_id: session.metadata?.practitioner_id,
      contract_id: contractId,
      stripe_subscription_id: subscriptionId,
      stripe_payment_intent_id: session.payment_intent,
      amount: (session.amount_total || 0) / 100,
      currency: 'EUR',
      status: 'succeeded',
      payment_date: new Date().toISOString(),
      period_start_date: new Date().toISOString(),
      period_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // +30 jours
    });

  if (paymentError) {
    console.error('[Webhook] Erreur enregistrement paiement:', paymentError);
  }
}

async function handleAppointmentPaymentCompleted(
  supabase: any,
  session: Stripe.Checkout.Session
) {
  const appointmentId = session.metadata?.appointment_id;
  const paymentIntentId = session.payment_intent as string;

  if (!appointmentId) return;

  console.log(`[Webhook] Paiement rendez-vous: ${appointmentId}`);

  // Mettre à jour la transaction
  const { error: txError } = await supabase
    .from('transactions')
    .update({
      status: 'succeeded',
      payment_date: new Date().toISOString(),
      stripe_charge_id: paymentIntentId
    })
    .eq('appointment_id', appointmentId)
    .eq('stripe_payment_intent_id', paymentIntentId);

  if (txError) {
    console.error('[Webhook] Erreur mise à jour transaction:', txError);
    return;
  }

  // Récupérer la date de fin du rendez-vous
  const { data: appointment } = await supabase
    .from('appointments')
    .select('end_time')
    .eq('id', appointmentId)
    .single();

  if (appointment) {
    // Calculer la date d'éligibilité au transfert (48h après le RDV)
    const eligibleDate = new Date(appointment.end_time);
    eligibleDate.setHours(eligibleDate.getHours() + 48);

    // Mettre à jour la date d'éligibilité
    await supabase
      .from('transactions')
      .update({
        eligible_for_transfer_at: eligibleDate.toISOString(),
        transfer_status: 'pending'
      })
      .eq('appointment_id', appointmentId);
  }

  // Mettre à jour le statut du rendez-vous
  await supabase
    .from('appointments')
    .update({ status: 'confirmed' })
    .eq('id', appointmentId);

  // TODO: Envoyer l'email de confirmation du rendez-vous
  // Récupérer les détails complets du rendez-vous et envoyer l'email
  console.log(`[Webhook] Email de confirmation à envoyer pour le rendez-vous ${appointmentId}`);
}

async function handleSubscriptionUpdated(
  supabase: any,
  subscription: Stripe.Subscription
) {
  const contractId = subscription.metadata?.contract_id;

  if (!contractId) return;

  console.log(`[Webhook] Mise à jour abonnement: ${contractId}`);

  // Vérifier si l'abonnement est actif
  if (subscription.status === 'active') {
    await supabase
      .from('practitioner_contracts')
      .update({ status: 'active' })
      .eq('id', contractId);
  } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
    await supabase
      .from('practitioner_contracts')
      .update({ status: 'suspended' })
      .eq('id', contractId);
  }
}

async function handleSubscriptionDeleted(
  supabase: any,
  subscription: Stripe.Subscription
) {
  const contractId = subscription.metadata?.contract_id;

  if (!contractId) return;

  console.log(`[Webhook] Annulation abonnement: ${contractId}`);

  await supabase
    .from('practitioner_contracts')
    .update({
      status: 'terminated',
      end_date: new Date().toISOString()
    })
    .eq('id', contractId);
}

async function handleInvoicePaymentSucceeded(
  supabase: any,
  invoice: Stripe.Invoice
) {
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) return;

  console.log(`[Webhook] Facture payée: ${invoice.id}`);

  // Mettre à jour l'enregistrement de paiement
  await supabase
    .from('subscription_payments')
    .update({
      status: 'succeeded',
      payment_date: new Date().toISOString(),
      stripe_invoice_id: invoice.id,
      invoice_url: invoice.hosted_invoice_url
    })
    .eq('stripe_subscription_id', subscriptionId);
}

async function handleInvoicePaymentFailed(
  supabase: any,
  invoice: Stripe.Invoice
) {
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) return;

  console.log(`[Webhook] Échec paiement facture: ${invoice.id}`);

  // Mettre à jour l'enregistrement de paiement
  await supabase
    .from('subscription_payments')
    .update({
      status: 'failed',
      failure_reason: 'Payment failed'
    })
    .eq('stripe_subscription_id', subscriptionId);

  // Suspendre le contrat après plusieurs échecs
  const { data: payments } = await supabase
    .from('subscription_payments')
    .select('id')
    .eq('stripe_subscription_id', subscriptionId)
    .eq('status', 'failed');

  if (payments && payments.length >= 3) {
    // Après 3 échecs, suspendre le contrat
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const contractId = subscription.metadata?.contract_id;

    if (contractId) {
      await supabase
        .from('practitioner_contracts')
        .update({ status: 'suspended' })
        .eq('id', contractId);
    }
  }
}

async function handlePaymentIntentSucceeded(
  supabase: any,
  paymentIntent: Stripe.PaymentIntent
) {
  const appointmentId = paymentIntent.metadata?.appointment_id;

  if (!appointmentId) return;

  console.log(`[Webhook] PaymentIntent réussi: ${paymentIntent.id}`);

  // Mettre à jour la transaction
  await supabase
    .from('transactions')
    .update({
      status: 'succeeded',
      payment_date: new Date().toISOString()
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);
}

async function handlePaymentIntentFailed(
  supabase: any,
  paymentIntent: Stripe.PaymentIntent
) {
  const appointmentId = paymentIntent.metadata?.appointment_id;

  if (!appointmentId) return;

  console.log(`[Webhook] PaymentIntent échoué: ${paymentIntent.id}`);

  // Mettre à jour la transaction
  await supabase
    .from('transactions')
    .update({
      status: 'failed',
      failure_reason: paymentIntent.last_payment_error?.message || 'Payment failed'
    })
    .eq('stripe_payment_intent_id', paymentIntent.id);

  // Annuler le rendez-vous
  await supabase
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', appointmentId);
}

async function handleTransferUpdated(
  supabase: any,
  transfer: Stripe.Transfer
) {
  const transferId = transfer.id;

  console.log(`[Webhook] Transfert mis à jour: ${transferId}`);

  // Mettre à jour la transaction correspondante
  await supabase
    .from('transactions')
    .update({
      stripe_transfer_id: transferId,
      transfer_date: new Date().toISOString(),
      transfer_status: transfer.reversed ? 'failed' : 'completed'
    })
    .eq('stripe_transfer_id', transferId);
}

async function handleAccountUpdated(
  supabase: any,
  account: Stripe.Account
) {
  const accountId = account.id;
  const practitionerId = account.metadata?.practitioner_id;

  if (!practitionerId) {
    console.log(`[Webhook] Account ${accountId} n'a pas de practitioner_id dans les metadata`);
    return;
  }

  console.log(`[Webhook] Compte Connect mis à jour: ${accountId} pour praticien ${practitionerId}`);

  // Déterminer le statut du compte
  const status = account.details_submitted && account.charges_enabled
    ? 'complete'
    : account.details_submitted
    ? 'pending'
    : 'incomplete';

  // Mettre à jour le statut dans la base de données
  const { error } = await supabase
    .from('practitioners')
    .update({
      stripe_account_status: status,
      stripe_charges_enabled: account.charges_enabled || false,
      stripe_payouts_enabled: account.payouts_enabled || false
    })
    .eq('id', practitionerId);

  if (error) {
    console.error(`[Webhook] Erreur mise à jour statut compte: ${error.message}`);
  } else {
    console.log(`[Webhook] Statut compte mis à jour: ${status} (charges: ${account.charges_enabled}, payouts: ${account.payouts_enabled})`);
  }
}
