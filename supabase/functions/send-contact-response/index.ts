// supabase/functions/send-contact-response/index.ts
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

    // Vérifier l'authentification et que l'utilisateur est admin
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Non autorisé');
    }

    // Vérifier que l'utilisateur est admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', user.id)
      .single();

    if (!profile || profile.user_type !== 'admin') {
      throw new Error('Accès réservé aux administrateurs');
    }

    const { messageId, response } = await req.json();

    if (!messageId || !response) {
      throw new Error('Paramètres manquants');
    }

    // Récupérer le message de contact
    const { data: message, error: messageError } = await supabase
      .from('contact_messages')
      .select('*')
      .eq('id', messageId)
      .single();

    if (messageError || !message) {
      throw new Error('Message non trouvé');
    }

    // Créer l'email de réponse
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
            .greeting { margin-bottom: 20px; }
            .original-message { background: white; padding: 15px; margin: 15px 0; border-radius: 4px; border: 1px solid #ddd; border-left: 4px solid #345995; }
            .response-box { background: #e8f4f8; padding: 15px; margin: 15px 0; border-radius: 4px; border-left: 4px solid #03a9f4; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #777; }
            .label { font-weight: bold; color: #555; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">📧 Réponse à votre message</h1>
            </div>
            <div class="content">
              <div class="greeting">
                <p>Bonjour ${message.first_name} ${message.last_name},</p>
                <p>Nous avons bien reçu votre message concernant : <strong>${message.subject}</strong></p>
              </div>

              <div class="original-message">
                <p class="label">Votre message :</p>
                <p style="white-space: pre-wrap; margin: 10px 0;">${message.message}</p>
              </div>

              <div class="response-box">
                <p class="label">Notre réponse :</p>
                <p style="white-space: pre-wrap; margin: 10px 0;">${response}</p>
              </div>

              <div style="margin-top: 30px;">
                <p>Si vous avez d'autres questions, n'hésitez pas à nous contacter à nouveau via notre formulaire de contact ou directement à cette adresse email.</p>
                <p>Cordialement,<br>L'équipe FL²M Services</p>
              </div>

              <div class="footer">
                <p>Cette réponse a été envoyée depuis FL²M Services</p>
                <p style="margin-top: 10px;">
                  <a href="https://www.fl2m.fr" style="color: #345995; text-decoration: none;">www.fl2m.fr</a>
                </p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    // Envoyer l'email via Resend
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'FL2M Services <contact@fl2m.fr>',
        to: [message.email],
        reply_to: 'contact@fl2m.fr',
        subject: `Re: ${message.subject}`,
        html: emailHtml,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error('[Email] Erreur Resend:', errorText);
      throw new Error(`Erreur lors de l'envoi de l'email: ${errorText}`);
    }

    const emailResult = await emailResponse.json();
    console.log('[Email] Email de réponse envoyé avec succès:', emailResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Email de réponse envoyé',
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
