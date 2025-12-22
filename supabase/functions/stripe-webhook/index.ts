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
    // Utiliser constructEventAsync au lieu de constructEvent pour Deno
    const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);

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
// EMAIL HELPER
// ========================================

function buildConfirmationEmailContent(appointment: any): string {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const beneficiaryName = appointment.client?.first_name
    ? `${appointment.client.first_name} ${appointment.client.last_name || ''}`.trim()
    : 'Cher client';

  const practitionerName = appointment.practitioner?.profile?.pseudo
    || `${appointment.practitioner?.profile?.first_name || ''} ${appointment.practitioner?.profile?.last_name || ''}`.trim()
    || 'Intervenant FLM';

  const price = appointment.custom_price ?? appointment.service?.price;
  const priceDisplay = price !== 9999 ? `${price} €` : 'Sur devis';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FL2M Services</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 2px solid #345995;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #345995;
      margin: 0;
      font-size: 28px;
    }
    .content {
      margin-bottom: 30px;
    }
    .info-box {
      background-color: #f8f9fa;
      border-left: 4px solid #345995;
      padding: 15px;
      margin: 20px 0;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background: linear-gradient(45deg, #345995, #1D3461);
      color: #ffffff;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
      font-weight: bold;
    }
    .footer {
      text-align: center;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      margin-top: 30px;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>FL2M Services</h1>
    </div>
    <div class="content">
      <h2>✅ Paiement confirmé !</h2>
      <p>Bonjour ${beneficiaryName},</p>
      <p>Nous confirmons la réception de votre paiement et la validation de votre rendez-vous :</p>

      <div class="info-box">
        <p><strong>📅 Service :</strong> ${appointment.service?.name || 'Service FLM'}</p>
        <p><strong>🕐 Date et heure :</strong> ${formatDate(appointment.start_time)}</p>
        <p><strong>👤 Intervenant :</strong> ${practitionerName}</p>
        <p><strong>💰 Prix :</strong> ${priceDisplay}</p>
        ${appointment.unique_code ? `<p><strong>🔖 Code du rendez-vous :</strong> ${appointment.unique_code}</p>` : ''}
      </div>

      ${appointment.meeting_link ? `
      <p style="text-align: center;">
        <a href="${appointment.meeting_link}" class="button">🎥 Rejoindre la séance</a>
      </p>
      ` : ''}

      <p><strong>Important :</strong> Pensez à valider que la séance s'est bien déroulée après votre rendez-vous pour que l'intervenant soit payé immédiatement !</p>

      <p>Nous vous enverrons un rappel 24 heures avant le rendez-vous.</p>
      <p>À bientôt,<br>L'équipe FL2M Services</p>
    </div>
    <div class="footer">
      <p>
        Cet email a été envoyé automatiquement par FL2M Services.<br>
        Pour toute question, contactez-nous à <a href="mailto:contact@fl2m.fr">contact@fl2m.fr</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

function buildPractitionerConfirmationEmailContent(appointment: any): string {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const beneficiaryName = appointment.client?.first_name
    ? `${appointment.client.first_name} ${appointment.client.last_name || ''}`.trim()
    : 'Client';

  const practitionerName = appointment.practitioner?.profile?.pseudo
    || `${appointment.practitioner?.profile?.first_name || ''} ${appointment.practitioner?.profile?.last_name || ''}`.trim()
    || 'Intervenant';

  const price = appointment.custom_price ?? appointment.service?.price;
  const priceDisplay = price !== 9999 ? `${price} €` : 'Sur devis';

  const clientEmail = appointment.client?.email || 'Non renseigné';
  const clientPhone = appointment.client?.phone || 'Non renseigné';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FL2M Services</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 2px solid #345995;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #345995;
      margin: 0;
      font-size: 28px;
    }
    .content {
      margin-bottom: 30px;
    }
    .info-box {
      background-color: #f8f9fa;
      border-left: 4px solid #345995;
      padding: 15px;
      margin: 20px 0;
    }
    .alert-box {
      background-color: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background: linear-gradient(45deg, #345995, #1D3461);
      color: #ffffff;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
      font-weight: bold;
    }
    .footer {
      text-align: center;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      margin-top: 30px;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>FL2M Services</h1>
    </div>
    <div class="content">
      <h2>🎉 Nouveau rendez-vous confirmé !</h2>
      <p>Bonjour ${practitionerName},</p>
      <p>Un nouveau rendez-vous vient d'être réservé et payé sur votre planning :</p>

      <div class="info-box">
        <p><strong>📅 Service :</strong> ${appointment.service?.name || 'Service FLM'}</p>
        <p><strong>🕐 Date et heure :</strong> ${formatDate(appointment.start_time)}</p>
        <p><strong>👤 Client/Bénéficiaire :</strong> ${beneficiaryName}</p>
        <p><strong>📧 Email :</strong> ${clientEmail}</p>
        <p><strong>📞 Téléphone :</strong> ${clientPhone}</p>
        <p><strong>💰 Prix :</strong> ${priceDisplay}</p>
        ${appointment.unique_code ? `<p><strong>🔖 Code du rendez-vous :</strong> ${appointment.unique_code}</p>` : ''}
      </div>

      ${appointment.meeting_link ? `
      <p style="text-align: center;">
        <a href="${appointment.meeting_link}" class="button">🎥 Lien de visioconférence</a>
      </p>
      ` : ''}

      <div class="alert-box">
        <p><strong>⚠️ Important - Paiement et validation</strong></p>
        <p>Le paiement de ${priceDisplay} a été reçu et sera conservé en attente pendant 48 heures après le rendez-vous.</p>
        <p><strong>Après la séance :</strong> Le client doit valider que la séance s'est bien déroulée. Dès validation, vous recevrez automatiquement le paiement sur votre compte Stripe Connect.</p>
        <p><strong>Si pas de validation :</strong> Le paiement vous sera transféré automatiquement 48 heures après la fin du rendez-vous.</p>
      </div>

      <p><strong>Rendez-vous en conflit :</strong> Les autres créneaux disponibles sur ce même horaire ont été automatiquement annulés.</p>

      <p>À bientôt,<br>L'équipe FL2M Services</p>
    </div>
    <div class="footer">
      <p>
        Cet email a été envoyé automatiquement par FL2M Services.<br>
        Pour toute question, contactez-nous à <a href="mailto:contact@fl2m.fr">contact@fl2m.fr</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

// ========================================
// HANDLERS
// ========================================

async function handleSubscriptionCheckoutCompleted(
  supabase: any,
  session: Stripe.Checkout.Session
) {
  const contractId = session.metadata?.contract_id;
  const subscriptionId = session.subscription as string;
  const practitionerId = session.metadata?.practitioner_id;

  if (!contractId) return;

  console.log(`[Webhook] Activation du contrat: ${contractId}`);

  // Récupérer le contrat pour vérifier sa date de début
  const { data: contract, error: fetchError } = await supabase
    .from('practitioner_contracts')
    .select('start_date, practitioner_id')
    .eq('id', contractId)
    .single();

  if (fetchError || !contract) {
    console.error('[Webhook] Erreur récupération contrat:', fetchError);
    return;
  }

  const startDate = new Date(contract.start_date);
  const today = new Date();
  const isFutureStart = startDate > today;

  // Si le contrat commence dans le futur, c'est un changement d'abonnement
  if (isFutureStart) {
    console.log(`[Webhook] Changement d'abonnement planifié pour le ${startDate.toISOString()}`);

    // Marquer le nouveau contrat comme pending_activation (sera activé à la date de début)
    const { error: updateError } = await supabase
      .from('practitioner_contracts')
      .update({
        status: 'pending_activation'
      })
      .eq('id', contractId);

    if (updateError) {
      console.error('[Webhook] Erreur mise à jour contrat:', updateError);
    }

    // Récupérer l'ancien contrat actif et planifier sa fin
    const { data: oldContract } = await supabase
      .from('practitioner_contracts')
      .select('id, start_date')
      .eq('practitioner_id', contract.practitioner_id)
      .eq('status', 'active')
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (oldContract) {
      // Calculer la veille du début du nouveau contrat comme date de fin de l'ancien
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() - 1);

      await supabase
        .from('practitioner_contracts')
        .update({
          end_date: endDate.toISOString().split('T')[0]
        })
        .eq('id', oldContract.id);

      console.log(`[Webhook] Ancien contrat ${oldContract.id} se terminera le ${endDate.toISOString()}`);
    }
  } else {
    // Nouveau contrat, activer immédiatement
    console.log(`[Webhook] Nouveau contrat, activation immédiate`);

    const { error: updateError } = await supabase
      .from('practitioner_contracts')
      .update({
        status: 'active',
        start_date: today.toISOString().split('T')[0]
      })
      .eq('id', contractId);

    if (updateError) {
      console.error('[Webhook] Erreur activation contrat:', updateError);
      return;
    }
  }

  // Enregistrer l'ID de subscription Stripe dans le contrat
  await supabase
    .from('practitioner_contracts')
    .update({
      stripe_subscription_id: subscriptionId
    })
    .eq('id', contractId);

  // Créer un enregistrement de paiement d'abonnement
  const { error: paymentError } = await supabase
    .from('subscription_payments')
    .insert({
      practitioner_id: practitionerId || contract.practitioner_id,
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

  // Mettre à jour le statut ET le payment_status du rendez-vous
  const { data: updatedAppointment } = await supabase
    .from('appointments')
    .update({
      status: 'confirmed',
      payment_status: 'paid'
    })
    .eq('id', appointmentId)
    .select('practitioner_id, start_time, end_time')
    .single();

  // Suspendre les rendez-vous concurrents automatiquement
  if (updatedAppointment) {
    try {
      const { data: suspendResult, error: suspendError } = await supabase.rpc(
        'suspend_conflicting_appointments',
        {
          p_practitioner_id: updatedAppointment.practitioner_id,
          p_start_time: updatedAppointment.start_time,
          p_end_time: updatedAppointment.end_time,
          p_confirmed_appointment_id: appointmentId
        }
      );

      if (suspendError) {
        console.error('[Webhook] Erreur lors de la suspension des RDV concurrents:', suspendError);
      } else if (suspendResult && suspendResult.length > 0) {
        const count = suspendResult[0].suspended_count;
        console.log(`[Webhook] ${count} rendez-vous concurrent(s) suspendu(s) automatiquement`);
      }
    } catch (suspendException) {
      console.error('[Webhook] Exception lors de la suspension des RDV:', suspendException);
    }
  }

  // Récupérer les détails complets du rendez-vous pour l'email
  const { data: fullAppointment } = await supabase
    .from('appointments')
    .select(`
      *,
      service:services(*),
      practitioner:practitioners(
        id,
        profile:profiles(*)
      ),
      client:profiles(*)
    `)
    .eq('id', appointmentId)
    .single();

  if (fullAppointment) {
    // ========================================
    // ENVOI EMAIL AU CLIENT
    // ========================================
    const recipientEmail = fullAppointment.client?.email;

    if (recipientEmail) {
      // Construire le contenu de l'email
      const emailContent = buildConfirmationEmailContent(fullAppointment);

      // Envoyer l'email via la Edge Function send-email
      try {
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({
            to: recipientEmail,
            subject: 'Confirmation de votre rendez-vous - FL2M Services',
            html: emailContent,
            appointmentId: appointmentId,
            emailType: 'confirmation'
          })
        });

        if (emailResponse.ok) {
          console.log(`[Webhook] Email de confirmation CLIENT envoyé à ${recipientEmail}`);
        } else {
          const error = await emailResponse.text();
          console.error(`[Webhook] Erreur envoi email CLIENT:`, error);
        }
      } catch (emailError) {
        console.error('[Webhook] Exception lors de l\'envoi d\'email CLIENT:', emailError);
      }
    } else {
      console.warn(`[Webhook] Pas d'email CLIENT trouvé pour le rendez-vous ${appointmentId}`);
    }

    // ========================================
    // ENVOI EMAIL À L'INTERVENANT
    // ========================================
    const practitionerEmail = fullAppointment.practitioner?.profile?.email;

    if (practitionerEmail) {
      // Construire le contenu de l'email pour l'intervenant
      const practitionerEmailContent = buildPractitionerConfirmationEmailContent(fullAppointment);

      // Envoyer l'email via la Edge Function send-email
      try {
        const practitionerEmailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`
          },
          body: JSON.stringify({
            to: practitionerEmail,
            subject: 'Nouveau rendez-vous confirmé sur votre planning - FL2M Services',
            html: practitionerEmailContent,
            appointmentId: appointmentId,
            emailType: 'practitioner_confirmation'
          })
        });

        if (practitionerEmailResponse.ok) {
          console.log(`[Webhook] Email de confirmation INTERVENANT envoyé à ${practitionerEmail}`);
        } else {
          const error = await practitionerEmailResponse.text();
          console.error(`[Webhook] Erreur envoi email INTERVENANT:`, error);
        }
      } catch (emailError) {
        console.error('[Webhook] Exception lors de l\'envoi d\'email INTERVENANT:', emailError);
      }
    } else {
      console.warn(`[Webhook] Pas d'email INTERVENANT trouvé pour le rendez-vous ${appointmentId}`);
    }
  }
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

  console.log(`[Webhook] Compte Connect mis à jour: ${accountId} pour intervenant ${practitionerId}`);

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
