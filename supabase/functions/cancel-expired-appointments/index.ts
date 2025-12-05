// supabase/functions/cancel-expired-appointments/index.ts
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

    // Appeler la fonction SQL pour annuler les rendez-vous expirés
    const { data, error } = await supabase.rpc('cancel_expired_unpaid_appointments');

    if (error) {
      throw error;
    }

    const cancelledCount = data?.length || 0;

    console.log(`[CRON] ${cancelledCount} rendez-vous annulés pour non-paiement`);

    // Si des rendez-vous ont été annulés, envoyer une notification
    if (cancelledCount > 0) {
      // Envoyer un email de notification aux clients
      for (const cancelled of data || []) {
        try {
          // Récupérer les informations du rendez-vous
          const { data: appointment } = await supabase
            .from('appointments')
            .select(`
              id,
              client_id,
              start_time,
              service:services(name),
              practitioner:practitioners(
                display_name,
                profile:profiles(first_name, last_name)
              ),
              client:profiles!appointments_client_id_fkey(email, first_name, last_name)
            `)
            .eq('id', cancelled.cancelled_appointment_id)
            .single();

          if (appointment && appointment.client?.email) {
            // TODO: Envoyer un email de notification au client
            console.log(`[NOTIFICATION] Email à envoyer à ${appointment.client.email} pour le rendez-vous ${appointment.id}`);
          }
        } catch (notifError) {
          console.error('[NOTIFICATION] Erreur lors de l\'envoi de notification:', notifError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        cancelled_count: cancelledCount,
        cancelled_appointments: data
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[CRON] Erreur:', error);
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
