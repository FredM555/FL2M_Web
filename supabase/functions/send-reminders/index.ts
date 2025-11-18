// =====================================================
// Edge Function: Envoi automatique des rappels de RDV
// Description: Fonction appelée par CRON pour envoyer
//              les rappels de rendez-vous
// =====================================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  // Gérer les requêtes CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Début du traitement des rappels de RDV...');

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Récupérer les rendez-vous nécessitant un rappel
    const { data: appointments, error } = await supabase.rpc('get_appointments_needing_reminder');

    if (error) {
      console.error('Erreur lors de la récupération des RDV à rappeler:', error);
      return new Response(JSON.stringify({
        success: false,
        error: error.message,
        processed: 0
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!appointments || appointments.length === 0) {
      console.log('Aucun rendez-vous à rappeler pour le moment');
      return new Response(JSON.stringify({
        success: true,
        message: 'Aucun rendez-vous à rappeler',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`${appointments.length} rendez-vous nécessitent un rappel`);

    let processed = 0;
    let failed = 0;
    const errors: any[] = [];

    // Traiter chaque rendez-vous
    for (const appointment of appointments) {
      try {
        // Récupérer les détails complets du RDV
        const { data: fullAppointment, error: fetchError } = await supabase
          .from('appointments')
          .select(`
            *,
            client:profiles!client_id(*),
            practitioner:practitioners!practitioner_id(
              *,
              profile:profiles(*)
            ),
            service:services(*)
          `)
          .eq('id', appointment.id)
          .single();

        if (fetchError || !fullAppointment) {
          console.error(`Impossible de récupérer le RDV ${appointment.id}:`, fetchError);
          failed++;
          errors.push({ appointment_id: appointment.id, error: fetchError?.message || 'Not found' });
          continue;
        }

        // Envoyer les emails de rappel via la fonction send-email
        const startDate = new Date(fullAppointment.start_time);
        const now = new Date();
        const hoursUntil = Math.round((startDate.getTime() - now.getTime()) / (1000 * 60 * 60));

        const formatDate = (date: Date) => new Intl.DateTimeFormat('fr-FR', {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        }).format(date);

        const formatTime = (date: Date) => new Intl.DateTimeFormat('fr-FR', {
          hour: '2-digit', minute: '2-digit'
        }).format(date);

        const getPractitionerDisplayName = () => {
          if (!fullAppointment.practitioner) return 'Non spécifié';
          if (fullAppointment.practitioner.display_name) return fullAppointment.practitioner.display_name;
          if (fullAppointment.practitioner.profile?.pseudo) return fullAppointment.practitioner.profile.pseudo;
          if (fullAppointment.practitioner.profile?.first_name) {
            return `${fullAppointment.practitioner.profile.first_name} ${fullAppointment.practitioner.profile.last_name || ''}`.trim();
          }
          return 'Non spécifié';
        };

        const createEmailHtml = (firstName: string, lastName: string) => `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); color: #1a1a2e; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
              .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
              .info-box { background: white; padding: 20px; border-left: 4px solid #FFD700; margin: 20px 0; border-radius: 4px; }
              .info-row { margin: 12px 0; padding: 10px; background: #f8f9fa; border-radius: 4px; }
              .label { font-weight: bold; color: #345995; display: inline-block; width: 150px; }
              .alert-box { background: linear-gradient(135deg, #345995 0%, #1D3461 100%); color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
              .countdown { font-size: 36px; font-weight: bold; color: #FFD700; margin: 10px 0; }
              .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #FFD700; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2 style="margin: 0;">⏰ Rappel de votre rendez-vous</h2>
              </div>
              <div class="content">
                <p>Bonjour ${firstName} ${lastName},</p>
                <p>Ce message est un rappel concernant votre rendez-vous à venir.</p>
                <div class="alert-box">
                  <p style="margin: 0; font-size: 18px;">Votre rendez-vous aura lieu dans</p>
                  <div class="countdown">${hoursUntil}h</div>
                </div>
                <div class="info-box">
                  <h3 style="margin-top: 0; color: #345995;">Détails du rendez-vous</h3>
                  <div class="info-row"><span class="label">Service :</span><span>${fullAppointment.service?.name || 'Non spécifié'}</span></div>
                  <div class="info-row"><span class="label">Date :</span><span>${formatDate(startDate)}</span></div>
                  <div class="info-row"><span class="label">Heure :</span><span>${formatTime(startDate)} - ${formatTime(new Date(fullAppointment.end_time))}</span></div>
                  ${fullAppointment.practitioner ? `<div class="info-row"><span class="label">Intervenant :</span><span>${getPractitionerDisplayName()}</span></div>` : ''}
                  ${fullAppointment.meeting_link ? `<div class="info-row"><span class="label">Lien visio :</span><span><a href="${fullAppointment.meeting_link}" style="color: #345995;">${fullAppointment.meeting_link}</a></span></div>` : ''}
                </div>
                <p style="background: #fff3cd; padding: 15px; border-left: 4px solid #FFA500; border-radius: 4px;"><strong>⚠️ Rappel important :</strong><br>Merci de vous présenter 5 minutes avant l'heure du rendez-vous.</p>
                <div class="footer">
                  <p style="margin: 0; color: #345995; font-weight: bold;">FL²M Services</p>
                  <p style="margin: 5px 0; color: #666;">contact@fl2m.fr | +33 (0)1 23 45 67 89</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `;

        // Envoyer au client
        if (fullAppointment.client?.email) {
          await supabase.functions.invoke('send-email', {
            body: {
              to: fullAppointment.client.email,
              subject: `Rappel : Rendez-vous ${formatDate(startDate)} à ${formatTime(startDate)} - FL²M Services`,
              html: createEmailHtml(fullAppointment.client.first_name, fullAppointment.client.last_name),
              appointmentId: fullAppointment.id,
              emailType: 'reminder'
            }
          });
        }

        // Envoyer au bénéficiaire si applicable
        if (fullAppointment.beneficiary_email &&
            fullAppointment.beneficiary_email !== fullAppointment.client?.email &&
            fullAppointment.beneficiary_notifications_enabled &&
            fullAppointment.beneficiary_first_name &&
            fullAppointment.beneficiary_last_name) {
          await supabase.functions.invoke('send-email', {
            body: {
              to: fullAppointment.beneficiary_email,
              subject: `Rappel : Rendez-vous ${formatDate(startDate)} à ${formatTime(startDate)} - FL²M Services`,
              html: createEmailHtml(fullAppointment.beneficiary_first_name, fullAppointment.beneficiary_last_name),
              appointmentId: fullAppointment.id,
              emailType: 'reminder'
            }
          });
        }

        // Marquer le rappel comme envoyé
        await supabase.rpc('mark_reminder_sent', { p_appointment_id: appointment.id });

        processed++;
        console.log(`✓ Rappel envoyé pour RDV ${appointment.id}`);
      } catch (err: any) {
        console.error(`Erreur lors du traitement du RDV ${appointment.id}:`, err);
        failed++;
        errors.push({ appointment_id: appointment.id, error: err.message });
      }
    }

    console.log(`Traitement terminé. Succès: ${processed}, Échecs: ${failed}`);

    return new Response(JSON.stringify({
      success: true,
      processed,
      failed,
      total: appointments.length,
      errors: errors.length > 0 ? errors : undefined
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Erreur globale:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
