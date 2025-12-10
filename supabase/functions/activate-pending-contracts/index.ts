// supabase/functions/activate-pending-contracts/index.ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD

    console.log(`[Activate Contracts] Exécution pour la date: ${today}`);

    // 1. ACTIVER LES CONTRATS PENDING_ACTIVATION dont la date de début est atteinte
    const { data: contractsToActivate, error: fetchError } = await supabase
      .from('practitioner_contracts')
      .select('id, practitioner_id, contract_type, start_date')
      .eq('status', 'pending_activation')
      .lte('start_date', today);

    if (fetchError) {
      throw new Error(`Erreur lors de la récupération des contrats: ${fetchError.message}`);
    }

    let activatedCount = 0;

    if (contractsToActivate && contractsToActivate.length > 0) {
      console.log(`[Activate Contracts] ${contractsToActivate.length} contrat(s) à activer`);

      for (const contract of contractsToActivate) {
        // Activer le nouveau contrat
        const { error: activateError } = await supabase
          .from('practitioner_contracts')
          .update({
            status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('id', contract.id);

        if (activateError) {
          console.error(`[Activate Contracts] Erreur activation contrat ${contract.id}:`, activateError);
          continue;
        }

        console.log(`[Activate Contracts] ✅ Contrat ${contract.id} activé (${contract.contract_type})`);
        activatedCount++;
      }
    } else {
      console.log('[Activate Contracts] Aucun contrat à activer aujourd\'hui');
    }

    // 2. TERMINER LES CONTRATS ACTIFS dont la date de fin est atteinte
    const { data: contractsToTerminate, error: fetchTerminateError } = await supabase
      .from('practitioner_contracts')
      .select('id, practitioner_id, contract_type, end_date')
      .eq('status', 'active')
      .not('end_date', 'is', null)
      .lt('end_date', today);

    if (fetchTerminateError) {
      throw new Error(`Erreur lors de la récupération des contrats à terminer: ${fetchTerminateError.message}`);
    }

    let terminatedCount = 0;

    if (contractsToTerminate && contractsToTerminate.length > 0) {
      console.log(`[Activate Contracts] ${contractsToTerminate.length} contrat(s) à terminer`);

      for (const contract of contractsToTerminate) {
        // Terminer le contrat
        const { error: terminateError } = await supabase
          .from('practitioner_contracts')
          .update({
            status: 'terminated',
            updated_at: new Date().toISOString()
          })
          .eq('id', contract.id);

        if (terminateError) {
          console.error(`[Activate Contracts] Erreur terminaison contrat ${contract.id}:`, terminateError);
          continue;
        }

        console.log(`[Activate Contracts] ✅ Contrat ${contract.id} terminé (end_date: ${contract.end_date})`);
        terminatedCount++;
      }
    } else {
      console.log('[Activate Contracts] Aucun contrat à terminer aujourd\'hui');
    }

    // 3. RÉINITIALISER LES COMPTEURS MENSUELS (le 1er de chaque mois)
    const todayDate = new Date();
    const isFirstDayOfMonth = todayDate.getDate() === 1;
    let resetCount = 0;

    if (isFirstDayOfMonth) {
      console.log('[Activate Contracts] 1er du mois - Réinitialisation des compteurs mensuels');

      const { error: resetError } = await supabase
        .from('practitioner_contracts')
        .update({
          appointments_this_month: 0,
          updated_at: new Date().toISOString()
        })
        .eq('status', 'active');

      if (resetError) {
        console.error('[Activate Contracts] Erreur réinitialisation compteurs:', resetError);
      } else {
        console.log('[Activate Contracts] ✅ Compteurs mensuels réinitialisés');
        resetCount = 1; // Indicateur que les compteurs ont été réinitialisés
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        date: today,
        activated: activatedCount,
        terminated: terminatedCount,
        countersReset: resetCount > 0,
        message: `${activatedCount} contrat(s) activé(s), ${terminatedCount} contrat(s) terminé(s)${resetCount > 0 ? ', compteurs réinitialisés' : ''}`
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[Activate Contracts] Erreur:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
