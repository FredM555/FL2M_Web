// supabase/functions/send-consultation-request/index.ts
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
    const {
      appointmentId,
      clientEmail,
      clientName,
      serviceName,
      practitionerName,
      startTime,
      context
    } = await req.json();

    if (!appointmentId || !clientEmail || !context) {
      throw new Error('Paramètres manquants');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Formater la date et l'heure
    const appointmentDate = new Date(startTime);
    const formattedDate = appointmentDate.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = appointmentDate.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // Envoyer l'email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: 'FL²M Services <noreply@fl2m.fr>',
        to: 'contact@fl2m.fr', // Email de l'équipe FL²M
        reply_to: clientEmail,
        subject: `Demande de consultation - ${serviceName}`,
        html: `
          <h2>Nouvelle demande de consultation</h2>

          <h3>Informations du client</h3>
          <ul>
            <li><strong>Nom:</strong> ${clientName}</li>
            <li><strong>Email:</strong> ${clientEmail}</li>
          </ul>

          <h3>Détails du rendez-vous</h3>
          <ul>
            <li><strong>Service:</strong> ${serviceName}</li>
            <li><strong>Intervenant:</strong> ${practitionerName}</li>
            <li><strong>Date:</strong> ${formattedDate}</li>
            <li><strong>Heure:</strong> ${formattedTime}</li>
          </ul>

          <h3>Contexte de la demande</h3>
          <p>${context.replace(/\n/g, '<br>')}</p>

          <hr>
          <p><small>ID du rendez-vous: ${appointmentId}</small></p>
        `
      })
    });

    if (!emailResponse.ok) {
      const errorData = await emailResponse.json();
      console.error('Erreur Resend:', errorData);
      throw new Error('Erreur lors de l\'envoi de l\'email');
    }

    // Envoyer aussi un email de confirmation au client
    const clientEmailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: 'FL²M Services <noreply@fl2m.fr>',
        to: clientEmail,
        subject: `Demande de consultation reçue - ${serviceName}`,
        html: `
          <h2>Votre demande de consultation a bien été reçue</h2>

          <p>Bonjour ${clientName},</p>

          <p>Nous avons bien reçu votre demande de consultation pour le service <strong>${serviceName}</strong>.</p>

          <h3>Détails de votre demande</h3>
          <ul>
            <li><strong>Service:</strong> ${serviceName}</li>
            <li><strong>Intervenant:</strong> ${practitionerName}</li>
            <li><strong>Date souhaitée:</strong> ${formattedDate}</li>
            <li><strong>Heure souhaitée:</strong> ${formattedTime}</li>
          </ul>

          <p>Notre équipe va étudier votre demande et reviendra vers vous dans les plus brefs délais pour vous proposer un tarif adapté et confirmer le rendez-vous.</p>

          <p>Cordialement,<br>
          L'équipe FL²M Services</p>

          <hr>
          <p><small>Référence: ${appointmentId}</small></p>
        `
      })
    });

    if (!clientEmailResponse.ok) {
      console.error('Erreur envoi email client');
    }

    // Mettre à jour le statut du rendez-vous
    await supabase
      .from('appointments')
      .update({
        status: 'pending_quote', // Statut en attente de devis
        notes: context
      })
      .eq('id', appointmentId);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Demande de consultation envoyée avec succès'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Erreur:', error);
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
