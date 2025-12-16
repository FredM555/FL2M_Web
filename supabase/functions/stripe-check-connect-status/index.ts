// supabase/functions/stripe-check-connect-status/index.ts
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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header manquant');
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Non autorisé');
    }

    // Récupérer les informations du intervenant
    const { data: practitioner, error: practitionerError } = await supabase
      .from('practitioners')
      .select('id, stripe_account_id, stripe_account_status')
      .eq('user_id', user.id)
      .single();

    if (practitionerError || !practitioner) {
      throw new Error('intervenant non trouvé');
    }

    // Si pas de compte Stripe Connect
    if (!practitioner.stripe_account_id) {
      return new Response(
        JSON.stringify({
          hasAccount: false,
          status: 'not_created',
          canReceivePayments: false
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Vérifier le statut du compte Stripe
    const account = await stripe.accounts.retrieve(practitioner.stripe_account_id);

    const status = account.details_submitted && account.charges_enabled
      ? 'complete'
      : account.details_submitted
      ? 'pending'
      : 'incomplete';

    // Mettre à jour le statut dans la base de données
    await supabase
      .from('practitioners')
      .update({ stripe_account_status: status })
      .eq('id', practitioner.id);

    return new Response(
      JSON.stringify({
        hasAccount: true,
        accountId: practitioner.stripe_account_id,
        status: status,
        canReceivePayments: account.charges_enabled || false,
        detailsSubmitted: account.details_submitted || false,
        requiresAction: !account.details_submitted || !account.charges_enabled
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[Check Connect Status] Erreur:', error);
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
