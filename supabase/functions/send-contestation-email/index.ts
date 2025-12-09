// supabase/functions/send-contestation-email/index.ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';

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

    const { appointmentId, problemDescription } = await req.json();

    if (!appointmentId || !problemDescription) {
      throw new Error('Paramètres manquants');
    }

    // Récupérer les détails du rendez-vous
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select(`
        id,
        unique_code,
        start_time,
        client:client_id (
          first_name,
          last_name,
          email
        ),
        practitioner:practitioner_id (
          profile:profiles!inner (
            first_name,
            last_name,
            pseudo
          )
        ),
        service:service_id (
          name
        )
      `)
      .eq('id', appointmentId)
      .single();

    if (appointmentError || !appointment) {
      throw new Error('Rendez-vous non trouvé');
    }

    // Formater la date
    const appointmentDate = new Date(appointment.start_time).toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Créer un message de contact pour l'admin
    const contestationMessage = `CONTESTATION DE RENDEZ-VOUS

Code RDV: ${appointment.unique_code}
Client: ${appointment.client?.first_name} ${appointment.client?.last_name}
Email: ${appointment.client?.email}
Intervenant: ${appointment.practitioner?.profile?.pseudo || appointment.practitioner?.profile?.first_name + ' ' + appointment.practitioner?.profile?.last_name}
Service: ${appointment.service?.name}
Date: ${appointmentDate}

--- MOTIF DE LA CONTESTATION ---
${problemDescription}`;

    await supabase
      .from('contact_messages')
      .insert({
        first_name: appointment.client?.first_name || 'Client',
        last_name: appointment.client?.last_name || 'Inconnu',
        email: appointment.client?.email || 'no-email@fl2m.fr',
        subject: 'Demande de contestation',
        message: contestationMessage,
        status: 'new'
      });

    // Envoyer l'email via Resend
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #345995 0%, #1D3461 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 8px 8px; }
            .alert-box { background: #fff3cd; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; }
            .info-box { background: white; padding: 15px; margin: 15px 0; border-radius: 4px; border: 1px solid #ddd; }
            .info-row { margin: 8px 0; }
            .label { font-weight: bold; color: #555; }
            .problem-box { background: #ffebee; border-left: 4px solid #f44336; padding: 15px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #777; }
            a.button { display: inline-block; background: #345995; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🚨 Contestation de rendez-vous</h1>
            </div>
            <div class="content">
              <div class="alert-box">
                <strong>⚠️ Action requise :</strong> Une contestation a été signalée sur un rendez-vous
              </div>

              <div class="info-box">
                <div class="info-row">
                  <span class="label">Code RDV :</span> ${appointment.unique_code}
                </div>
                <div class="info-row">
                  <span class="label">Client :</span> ${appointment.client?.first_name} ${appointment.client?.last_name}
                </div>
                <div class="info-row">
                  <span class="label">Intervenant :</span> ${appointment.practitioner?.profile?.pseudo || appointment.practitioner?.profile?.first_name + ' ' + appointment.practitioner?.profile?.last_name}
                </div>
                <div class="info-row">
                  <span class="label">Service :</span> ${appointment.service?.name}
                </div>
                <div class="info-row">
                  <span class="label">Date :</span> ${appointmentDate}
                </div>
              </div>

              <div class="problem-box">
                <strong>Motif de la contestation :</strong>
                <p style="margin: 10px 0; white-space: pre-wrap;">${problemDescription}</p>
              </div>

              <p style="text-align: center;">
                <a href="${supabaseUrl.replace('https://', 'https://app.')}/admin/appointments" class="button">
                  Accéder au tableau de bord admin
                </a>
              </p>

              <div class="footer">
                <p>Cette notification a été envoyée automatiquement par FL2M Services</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'FL2M Services <noreply@fl2m.fr>',
        to: ['contact@fl2m.fr'],
        subject: `🚨 Contestation RDV ${appointment.unique_code}`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('[Email] Erreur Resend:', errorText);
      throw new Error(`Erreur lors de l'envoi de l'email: ${errorText}`);
    }

    const emailResult = await emailResponse.json();
    console.log('[Email] Email envoyé avec succès:', emailResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email de contestation envoyé',
        emailId: emailResult.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[Email] Erreur:', error);
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
