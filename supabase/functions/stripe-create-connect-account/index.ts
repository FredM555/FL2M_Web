// supabase/functions/stripe-create-connect-account/index.ts
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

    // Récupérer les informations du praticien
    const { data: practitioner, error: practitionerError } = await supabase
      .from('practitioners')
      .select(`
        id,
        user_id,
        stripe_account_id,
        stripe_account_status,
        profiles (
          id,
          email,
          first_name,
          last_name,
          phone
        )
      `)
      .eq('user_id', user.id)
      .single();

    if (practitionerError || !practitioner) {
      throw new Error('Praticien non trouvé');
    }

    const profile = practitioner.profiles;

    // Si le praticien a déjà un compte Stripe Connect
    if (practitioner.stripe_account_id) {
      // Vérifier le statut du compte
      const account = await stripe.accounts.retrieve(practitioner.stripe_account_id);

      // Si le compte est déjà complet, retourner le dashboard link
      if (account.details_submitted && account.charges_enabled) {
        const loginLink = await stripe.accounts.createLoginLink(practitioner.stripe_account_id);

        return new Response(
          JSON.stringify({
            accountId: practitioner.stripe_account_id,
            status: 'complete',
            dashboardUrl: loginLink.url
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
          }
        );
      }

      // Si le compte existe mais n'est pas complet, créer un nouveau lien d'onboarding
      const accountLink = await stripe.accountLinks.create({
        account: practitioner.stripe_account_id,
        refresh_url: `${req.headers.get('origin')}/practitioner/stripe-connect?refresh=true`,
        return_url: `${req.headers.get('origin')}/practitioner/stripe-connect/success`,
        type: 'account_onboarding',
      });

      return new Response(
        JSON.stringify({
          accountId: practitioner.stripe_account_id,
          status: 'incomplete',
          onboardingUrl: accountLink.url
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      );
    }

    // Créer un nouveau compte Stripe Connect
    const account = await stripe.accounts.create({
      type: 'express', // Type Express pour une configuration simplifiée
      country: 'FR',
      email: profile.email,
      capabilities: {
        transfers: { requested: true }, // Permet de recevoir des transferts
      },
      business_type: 'individual',
      individual: {
        email: profile.email,
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone: profile.phone,
      },
      metadata: {
        practitioner_id: practitioner.id,
        user_id: user.id
      }
    });

    console.log(`[Stripe Connect] Compte créé: ${account.id} pour praticien ${practitioner.id}`);

    // Enregistrer l'account ID dans la base de données
    const { error: updateError } = await supabase
      .from('practitioners')
      .update({
        stripe_account_id: account.id,
        stripe_account_status: 'incomplete'
      })
      .eq('id', practitioner.id);

    if (updateError) {
      console.error('[Stripe Connect] Erreur mise à jour DB:', updateError);
      // Ne pas bloquer le flux, juste logger
    }

    // Créer un lien d'onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${req.headers.get('origin')}/practitioner/stripe-connect?refresh=true`,
      return_url: `${req.headers.get('origin')}/practitioner/stripe-connect/success`,
      type: 'account_onboarding',
    });

    return new Response(
      JSON.stringify({
        accountId: account.id,
        status: 'incomplete',
        onboardingUrl: accountLink.url
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[Stripe Connect] Erreur:', error);
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
