// supabase/functions/stripe-create-appointment-payment/index.ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@17.3.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2025-04-30.basil',
  httpClient: Stripe.createFetchHttpClient()
});

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      appointmentId,
      amount,
      practitionerId,
      clientId,
      description,
      successUrl,
      cancelUrl
    } = await req.json();

    if (!appointmentId || !amount || !practitionerId || !clientId) {
      throw new Error('Paramètres manquants');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Récupérer les informations du client
    console.log('[STRIPE-PAYMENT] Recherche du client:', clientId);

    let client = null;
    let clientError = null;

    const clientQuery = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name, stripe_customer_id')
      .eq('id', clientId)
      .single();

    client = clientQuery.data;
    clientError = clientQuery.error;

    // Si le client n'existe pas, essayons de récupérer ses infos depuis auth.users et créer son profil
    if (clientError || !client) {
      console.log('[STRIPE-PAYMENT] Profil non trouvé, tentative de récupération depuis auth.users');

      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(clientId);

      if (authError || !authUser.user) {
        console.error('[STRIPE-PAYMENT] Erreur auth.users:', authError);
        throw new Error(`Client non trouvé: ${clientError?.message || 'utilisateur inexistant'}`);
      }

      // Créer le profil manquant
      console.log('[STRIPE-PAYMENT] Création du profil pour:', authUser.user.email);

      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: clientId,
          email: authUser.user.email,
          user_type: 'client',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id, email, first_name, last_name, stripe_customer_id')
        .single();

      if (createError || !newProfile) {
        console.error('[STRIPE-PAYMENT] Erreur création profil:', createError);
        throw new Error('Impossible de créer le profil client');
      }

      client = newProfile;
      console.log('[STRIPE-PAYMENT] Profil créé avec succès');
    }

    console.log('[STRIPE-PAYMENT] Client trouvé:', {
      id: client.id,
      email: client.email,
      name: `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Non renseigné'
    });

    // Récupérer les informations du praticien
    const { data: practitioner, error: practitionerError } = await supabase
      .from('practitioners')
      .select('id, stripe_account_id')
      .eq('id', practitionerId)
      .single();

    if (practitionerError || !practitioner) {
      throw new Error('Praticien non trouvé');
    }

    // Créer ou récupérer le client Stripe
    let stripeCustomerId: string;

    if (client.stripe_customer_id) {
      stripeCustomerId = client.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: client.email,
        name: `${client.first_name} ${client.last_name}`,
        metadata: {
          user_id: client.id
        }
      });

      stripeCustomerId = customer.id;

      // Enregistrer l'ID client Stripe
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', client.id);
    }

    // Calculer la commission pour la plateforme
    // On va chercher le contrat du praticien pour calculer la commission
    const { data: contract } = await supabase
      .from('practitioner_contracts')
      .select('contract_type, commission_fixed, commission_percentage, commission_cap, appointments_this_month')
      .eq('practitioner_id', practitionerId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let platformFee = 0;
    let stripeFees = 0;
    let practitionerAmount = amount;

    if (contract) {
      // Calculer la commission selon le type de contrat
      const appointmentNumber = (contract.appointments_this_month || 0) + 1;

      // Pour les 3 premiers RDV, c'est gratuit pour STARTER et PRO uniquement
      if ((contract.contract_type === 'starter' || contract.contract_type === 'pro') && appointmentNumber <= 3) {
        platformFee = 0;
      } else if (contract.contract_type === 'decouverte') {
        // DÉCOUVERTE (10€/mois): 10€ fixe par RDV - PAS de RDV gratuit
        platformFee = 10;
      } else if (contract.contract_type === 'starter') {
        // min(6€, 8%)
        const percentageFee = amount * 0.08;
        platformFee = Math.min(6, percentageFee);
      } else if (contract.contract_type === 'pro') {
        // 3€ fixe
        platformFee = 3;
      } else if (contract.contract_type === 'premium') {
        // 0€
        platformFee = 0;
      }

      // Calculer les frais Stripe (1.4% + 0.25€ pour cartes européennes)
      // Ces frais sont à la charge de l'intervenant
      stripeFees = (amount * 0.014) + 0.25;

      // Montant net de l'intervenant = Prix total - Commission plateforme - Frais Stripe
      practitionerAmount = amount - platformFee - stripeFees;
    }

    console.log(`[STRIPE-PAYMENT] Calcul des montants:`);
    console.log(`  - Prix total: ${amount}€`);
    console.log(`  - Commission plateforme: ${platformFee}€`);
    console.log(`  - Frais Stripe: ${stripeFees.toFixed(2)}€`);
    console.log(`  - Montant net intervenant: ${practitionerAmount.toFixed(2)}€`);

    console.log(`[STRIPE-PAYMENT] Configuration URLs de redirection:`);
    console.log(`  - Success URL: ${successUrl}`);
    console.log(`  - Cancel URL: ${cancelUrl}`);

    // Créer la session Stripe Checkout
    // Si le praticien a un compte Stripe Connect, utiliser application_fee_amount
    const sessionParams: any = {
      customer: stripeCustomerId,
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: description || 'Rendez-vous FLM Services',
              description: `Rendez-vous avec intervenant`
            },
            unit_amount: Math.round(amount * 100) // Convertir en centimes
          },
          quantity: 1
        }
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        appointment_id: appointmentId,
        practitioner_id: practitionerId,
        client_id: clientId,
        platform_fee: platformFee.toFixed(2),
        practitioner_amount: practitionerAmount.toFixed(2)
      },
      payment_intent_data: {
        metadata: {
          appointment_id: appointmentId,
          practitioner_id: practitionerId,
          client_id: clientId,
          platform_fee: platformFee.toFixed(2),
          practitioner_amount: practitionerAmount.toFixed(2)
        }
      }
    };

    // Si le praticien a un compte Stripe Connect, ajouter le transfert
    if (practitioner.stripe_account_id && practitionerAmount > 0) {
      sessionParams.payment_intent_data.application_fee_amount = Math.round(platformFee * 100);
      sessionParams.payment_intent_data.transfer_data = {
        destination: practitioner.stripe_account_id
      };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    console.log(`[STRIPE-PAYMENT] Session Stripe créée:`);
    console.log(`  - Session ID: ${session.id}`);
    console.log(`  - Checkout URL: ${session.url}`);
    console.log(`  - Mode: ${session.livemode ? 'PRODUCTION' : 'TEST'}`);

    // Créer la transaction en base de données
    await supabase
      .from('transactions')
      .insert({
        appointment_id: appointmentId,
        practitioner_id: practitionerId,
        client_id: clientId,
        stripe_payment_intent_id: session.payment_intent as string,
        amount_total: amount,
        amount_practitioner: practitionerAmount,
        amount_platform_commission: platformFee,
        amount_stripe_fees: stripeFees,
        is_test_mode: !session.livemode,  // TRUE si mode test, FALSE si production
        status: 'pending',
        currency: 'EUR',
        description: description,
        commission_type: contract?.contract_type || null,
        transfer_status: 'pending'
      });

    console.log(`[STRIPE-PAYMENT] Transaction créée (mode: ${session.livemode ? 'PRODUCTION' : 'TEST'})`);

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Erreur création paiement:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
