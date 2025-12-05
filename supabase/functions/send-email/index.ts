// =====================================================
// Edge Function: Envoi d'emails avec Resend
// Description: Fonction serverless pour envoyer des emails
//              via l'API Resend
// =====================================================
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  // Gérer les requêtes CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const { to, subject, html, appointmentId, emailType, replyTo } = await req.json();
    // Validation
    if (!to || !subject || !html) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: to, subject, html'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Validation de l'email
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(to)) {
      return new Response(JSON.stringify({
        error: 'Invalid email address'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log(`Sending email to ${to} - Type: ${emailType || 'generic'}`);
    // Envoyer l'email via Resend
    // Vérifier que la clé API est configurée
    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY is not configured');
      return new Response(JSON.stringify({
        error: 'Email service not configured'
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    console.log('Sending email via Resend API...');

    // Construire le corps de la requête
    const emailPayload: any = {
      from: 'FL2M Services <contact@fl2m.fr>',
      to: [to],
      subject,
      html
    };

    // Ajouter reply_to si fourni
    if (replyTo) {
      emailPayload.reply_to = [replyTo];
      console.log('Reply-To set to:', replyTo);
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify(emailPayload)
    });

    console.log('Resend API response status:', res.status);
    console.log('Resend API response content-type:', res.headers.get('content-type'));

    // Vérifier si la réponse est du JSON
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const textResponse = await res.text();
      console.error('Resend API returned non-JSON response:', textResponse.substring(0, 500));
      return new Response(JSON.stringify({
        error: 'Failed to send email - Invalid API response',
        details: {
          status: res.status,
          contentType,
          preview: textResponse.substring(0, 200)
        }
      }), {
        status: 502,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const data = await res.json();

    if (!res.ok) {
      console.error('Resend API error:', data);

      // Logger l'échec dans activity_logs
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Récupérer le user_id si on a un appointmentId
        let userId = null;
        if (appointmentId) {
          const { data: appointment } = await supabase
            .from('appointments')
            .select('client_id')
            .eq('id', appointmentId)
            .single();

          if (appointment) {
            userId = appointment.client_id;
          }
        }

        // Logger l'échec d'email
        await supabase.rpc('log_email_failed', {
          p_user_id: userId,
          p_recipient: to,
          p_subject: subject,
          p_email_type: emailType || 'generic',
          p_error_message: JSON.stringify(data),
          p_appointment_id: appointmentId || null
        });
      } catch (logError) {
        console.error('Erreur lors du logging de l\'échec:', logError);
      }

      return new Response(JSON.stringify({
        error: 'Failed to send email',
        details: data
      }), {
        status: res.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('Email sent successfully:', data);

    // Logger l'envoi dans activity_logs
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

      // Récupérer le user_id si on a un appointmentId
      let userId = null;
      if (appointmentId) {
        const { data: appointment } = await supabase
          .from('appointments')
          .select('client_id')
          .eq('id', appointmentId)
          .single();

        if (appointment) {
          userId = appointment.client_id;
        }
      }

      // Logger l'email envoyé
      await supabase.rpc('log_email_sent', {
        p_user_id: userId,
        p_recipient: to,
        p_subject: subject,
        p_email_type: emailType || 'generic',
        p_resend_id: data.id,
        p_appointment_id: appointmentId || null
      });
    } catch (logError) {
      console.error('Erreur lors du logging de l\'email:', logError);
      // Ne pas bloquer l'envoi si le logging échoue
    }
    return new Response(JSON.stringify({
      success: true,
      data
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
