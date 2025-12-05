// supabase/functions/send-contact-email/index.ts
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

interface ContactMessage {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  subject: string;
  module?: string;
  message: string;
  status: 'new' | 'processing' | 'responded';
}

interface RequestBody {
  message: ContactMessage;
  adminEmail?: string; // Email de destination (par défaut contact@fl2m.fr)
}

// Headers CORS pour permettre les requêtes depuis le frontend
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  // Gérer les requêtes CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  // Valider la requête
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }

  try {
    // Extraire les données de la requête
    const { message, adminEmail }: RequestBody = await req.json();

    if (!message || !message.email) {
      return new Response(JSON.stringify({ error: 'Invalid request data' }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    // Email HTML pour l'admin
    const adminEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #345995 0%, #1D3461 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px; }
          .info-row { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
          .label { font-weight: bold; color: #345995; }
          .message-box { background: white; padding: 15px; border-left: 4px solid #FFD700; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">📧 Nouveau message de contact</h2>
          </div>
          <div class="content">
            <div class="info-row">
              <span class="label">De :</span> ${message.first_name} ${message.last_name}
            </div>
            <div class="info-row">
              <span class="label">Email :</span> <a href="mailto:${message.email}">${message.email}</a>
            </div>
            ${message.phone ? `
            <div class="info-row">
              <span class="label">Téléphone :</span> ${message.phone}
            </div>
            ` : ''}
            <div class="info-row">
              <span class="label">Sujet :</span> ${message.subject}
            </div>
            ${message.module ? `
            <div class="info-row">
              <span class="label">Module concerné :</span> ${message.module}
            </div>
            ` : ''}
            <div class="message-box">
              <div class="label">Message :</div>
              <p>${message.message.replace(/\n/g, '<br>')}</p>
            </div>
            <p style="color: #666; font-size: 12px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
              Ce message a été envoyé depuis le formulaire de contact du site FL²M Services.<br>
              <strong>Pour répondre, utilisez simplement "Répondre" dans votre client email.</strong>
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Email HTML de confirmation pour le client
    const clientEmailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #345995 0%, #1D3461 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .message-box { background: white; padding: 20px; border-left: 4px solid #FFD700; margin: 20px 0; border-radius: 4px; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #FFD700; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0; color: white;">✓ Message bien reçu</h2>
          </div>
          <div class="content">
            <p>Bonjour ${message.first_name} ${message.last_name},</p>

            <p>Nous avons bien reçu votre message concernant : <strong>${message.subject}</strong></p>

            ${message.module ? `
            <p>Module concerné : <strong>${message.module}</strong></p>
            ` : ''}

            <div class="message-box">
              <p style="margin: 0; color: #666; font-style: italic;">Votre message :</p>
              <p style="margin-top: 10px;">${message.message.replace(/\n/g, '<br>')}</p>
            </div>

            <p>Notre équipe va l'examiner attentivement et vous répondra dans les plus brefs délais, généralement sous 24 heures ouvrées.</p>

            <div class="footer">
              <p style="margin: 0; color: #345995; font-weight: bold;">FL²M Services</p>
              <p style="margin: 5px 0; color: #666;">123 Avenue des Essences, 75001 Paris</p>
              <p style="margin: 5px 0; color: #666;">contact@fl2m.fr</p>
            </div>

            <p style="color: #999; font-size: 12px; margin-top: 30px; text-align: center;">
              Ceci est un message automatique, merci de ne pas y répondre directement.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Envoyer l'email à l'admin avec Resend
    const adminResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: 'FL²M Services <noreply@fl2m.fr>',
        to: [adminEmail || 'contact@fl2m.fr'],
        reply_to: message.email, // IMPORTANT : Email du client pour pouvoir répondre
        subject: `Nouveau message de contact : ${message.subject}`,
        html: adminEmailHtml
      })
    });

    if (!adminResponse.ok) {
      const errorText = await adminResponse.text();
      console.error('Resend admin email error:', errorText);
      throw new Error(`Failed to send admin email: ${errorText}`);
    }

    const adminResult = await adminResponse.json();
    console.log('Admin email sent successfully:', adminResult);

    // Envoyer l'accusé de réception au client
    const clientResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: 'FL²M Services <noreply@fl2m.fr>',
        to: [message.email],
        subject: 'Confirmation de réception de votre message - FL²M Services',
        html: clientEmailHtml
      })
    });

    if (!clientResponse.ok) {
      const errorText = await clientResponse.text();
      console.error('Resend client email error:', errorText);
      // Ne pas faire échouer si l'accusé de réception échoue
    } else {
      const clientResult = await clientResponse.json();
      console.log('Client confirmation email sent successfully:', clientResult);
    }

    return new Response(JSON.stringify({
      success: true,
      adminEmailId: adminResult.id
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error sending email:', error);

    return new Response(JSON.stringify({
      error: error.message || 'Failed to send email'
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
