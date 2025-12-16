// supabase/functions/stripe-create-subscription-checkout/index.ts
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
    const { priceId, contractId, contractType, successUrl, cancelUrl } = await req.json();

    if (!priceId || !contractId || !contractType) {
      throw new Error('Paramètres manquants: priceId, contractId, contractType requis');
    }

    // Vérifier que le contrat existe et est en attente de paiement
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: contract, error: contractError } = await supabase
      .from('practitioner_contracts')
      .select('id, practitioner_id, status, monthly_fee')
      .eq('id', contractId)
      .single();

    if (contractError || !contract) {
      throw new Error('Contrat non trouvé');
    }

    if (contract.status !== 'pending_payment') {
      throw new Error('Ce contrat n\'est pas en attente de paiement');
    }

    // Récupérer les informations du intervenant
    const { data: practitioner, error: practitionerError } = await supabase
      .from('practitioners')
      .select(`
        id,
        user_id,
        profiles (
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('id', contract.practitioner_id)
      .single();

    if (practitionerError || !practitioner) {
      throw new Error('intervenant non trouvé');
    }

    const profile = practitioner.profiles;

    // Créer ou récupérer le client Stripe
    let stripeCustomerId: string;

    const { data: existingCustomer } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', profile.id)
      .single();

    if (existingCustomer?.stripe_customer_id) {
      stripeCustomerId = existingCustomer.stripe_customer_id;
    } else {
      const customer = await stripe.customers.create({
        email: profile.email,
        name: `${profile.first_name} ${profile.last_name}`,
        metadata: {
          user_id: profile.id,
          practitioner_id: practitioner.id
        }
      });

      stripeCustomerId = customer.id;

      // Enregistrer l'ID client Stripe
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', profile.id);
    }

    // Créer la session Stripe Checkout
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
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
        contract_id: contractId,
        contract_type: contractType,
        practitioner_id: practitioner.id,
        user_id: profile.id
      },
      subscription_data: {
        metadata: {
          contract_id: contractId,
          contract_type: contractType,
          practitioner_id: practitioner.id
        }
      }
    });

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
    console.error('Erreur création checkout:', error);
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
