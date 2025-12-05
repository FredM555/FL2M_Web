// supabase/functions/validate-appointment/index.ts
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

    const { appointmentId, validated, comment } = await req.json();

    if (!appointmentId || validated === undefined) {
      throw new Error('Paramètres manquants: appointmentId et validated requis');
    }

    // Vérifier que le rendez-vous appartient bien au client
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('id, client_id, practitioner_id, end_time, status')
      .eq('id', appointmentId)
      .single();

    if (appointmentError || !appointment) {
      throw new Error('Rendez-vous non trouvé');
    }

    if (appointment.client_id !== user.id) {
      throw new Error('Ce rendez-vous ne vous appartient pas');
    }

    // Vérifier que le rendez-vous est terminé
    const now = new Date();
    const endTime = new Date(appointment.end_time);

    if (endTime > now) {
      throw new Error('Le rendez-vous n\'est pas encore terminé');
    }

    // Vérifier qu'une validation n'existe pas déjà
    const { data: existingValidation } = await supabase
      .from('appointment_validations')
      .select('id')
      .eq('appointment_id', appointmentId)
      .single();

    if (existingValidation) {
      throw new Error('Ce rendez-vous a déjà été validé');
    }

    // Récupérer la transaction associée
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('id, amount_practitioner, transfer_status')
      .eq('appointment_id', appointmentId)
      .single();

    if (transactionError || !transaction) {
      throw new Error('Transaction non trouvée');
    }

    // Créer la validation
    const { data: validation, error: validationError } = await supabase
      .from('appointment_validations')
      .insert({
        appointment_id: appointmentId,
        client_id: user.id,
        transaction_id: transaction.id,
        validated,
        validation_comment: comment || null,
        validated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (validationError) {
      throw new Error('Erreur lors de la création de la validation');
    }

    // Si la validation est positive, déclencher le transfert immédiat
    if (validated && transaction.transfer_status === 'pending') {
      // Mettre la transaction en éligible pour transfert immédiat
      await supabase
        .from('transactions')
        .update({
          eligible_for_transfer_at: new Date().toISOString(),
          transfer_status: 'eligible'
        })
        .eq('id', transaction.id);

      console.log(`[Validation] Transfert immédiat activé pour la transaction ${transaction.id}`);
    }

    // Si la validation est négative, marquer pour investigation
    if (!validated) {
      await supabase
        .from('transactions')
        .update({
          transfer_status: 'failed',
          failure_reason: 'Client reported an issue'
        })
        .eq('id', transaction.id);

      // Marquer le rendez-vous comme problématique
      await supabase
        .from('appointments')
        .update({
          status: 'issue_reported'
        })
        .eq('id', appointmentId);

      console.log(`[Validation] Problème signalé pour le rendez-vous ${appointmentId}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        validation
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[Validation] Erreur:', error);
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
