// supabase/functions/send-contact-response/index_NEW.ts
// Version améliorée avec support du système de chat par thread
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

    // Récupérer les paramètres (support des deux formats)
    const body = await req.json();
    const { threadId, recipientEmail, recipientName, subject, response, messageId } = body;

    // Support de l'ancien format (messageId) et du nouveau (threadId)
    if (!response) {
      throw new Error('Réponse manquante');
    }

    let messageThread = null;
    let recipientInfo = {
      email: recipientEmail,
      name: recipientName,
      subject: subject
    };

    if (threadId) {
      // Nouveau format avec threadId
      // Récupérer tous les messages du thread pour construire l'historique
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (messagesError || !messages || messages.length === 0) {
        throw new Error('Thread non trouvé');
      }

      messageThread = messages;

      // Récupérer les infos du premier message si pas fournies
      if (!recipientEmail) {
        const firstMessage = messages[0];
        recipientInfo.email = firstMessage.email;
        recipientInfo.name = `${firstMessage.first_name} ${firstMessage.last_name}`;
        recipientInfo.subject = firstMessage.subject;
      }
    } else if (messageId) {
      // Ancien format avec messageId
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .select('*')
        .eq('id', messageId)
        .single();

      if (messageError || !message) {
        throw new Error('Message non trouvé');
      }

      recipientInfo.email = message.email;
      recipientInfo.name = `${message.first_name} ${message.last_name}`;
      recipientInfo.subject = message.subject;
      messageThread = [message];
    } else {
      throw new Error('threadId ou messageId requis');
    }

    if (!recipientInfo.email) {
      throw new Error('Email du destinataire manquant');
    }

    // Construire l'historique des messages pour l'email
    let messagesHistory = '';
    if (messageThread && messageThread.length > 1) {
      messagesHistory = '<div style="background: #f9f9f9; padding: 15px; margin: 15px 0; border-radius: 4px;">';
      messagesHistory += '<p class="label" style="font-weight: bold; color: #555;">Historique de la conversation :</p>';

      messageThread.forEach((msg, index) => {
        if (index === 0) {
          // Premier message (message original)
          messagesHistory += `
            <div style="background: white; padding: 10px; margin: 10px 0; border-radius: 4px; border-left: 4px solid #345995;">
              <p style="font-size: 12px; color: #666; margin: 0 0 5px 0;">
                <strong>${msg.first_name} ${msg.last_name}</strong> •
                ${new Date(msg.created_at).toLocaleString('fr-FR')}
              </p>
              <p style="white-space: pre-wrap; margin: 5px 0;">${msg.message}</p>
            </div>
          `;
        } else if (msg.sender_type === 'admin') {
          // Réponse admin
          messagesHistory += `
            <div style="background: #e8f4f8; padding: 10px; margin: 10px 0; border-radius: 4px; border-left: 4px solid #03a9f4;">
              <p style="font-size: 12px; color: #666; margin: 0 0 5px 0;">
                <strong>Équipe FL²M Services</strong> •
                ${new Date(msg.created_at).toLocaleString('fr-FR')}
              </p>
              <p style="white-space: pre-wrap; margin: 5px 0;">${msg.message}</p>
            </div>
          `;
        } else if (msg.sender_type === 'user') {
          // Réponse utilisateur
          messagesHistory += `
            <div style="background: white; padding: 10px; margin: 10px 0; border-radius: 4px; border-left: 4px solid #4caf50;">
              <p style="font-size: 12px; color: #666; margin: 0 0 5px 0;">
                <strong>${msg.first_name} ${msg.last_name}</strong> •
                ${new Date(msg.created_at).toLocaleString('fr-FR')}
              </p>
              <p style="white-space: pre-wrap; margin: 5px 0;">${msg.message}</p>
            </div>
          `;
        }
      });

      messagesHistory += '</div>';
    } else if (messageThread && messageThread.length === 1) {
      // Premier message seulement
      const firstMsg = messageThread[0];
      messagesHistory = `
        <div class="original-message" style="background: white; padding: 15px; margin: 15px 0; border-radius: 4px; border: 1px solid #ddd; border-left: 4px solid #345995;">
          <p class="label" style="font-weight: bold; color: #555;">Votre message :</p>
          <p style="white-space: pre-wrap; margin: 10px 0;">${firstMsg.message}</p>
        </div>
      `;
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
            .response-box { background: #e8f4f8; padding: 15px; margin: 15px 0; border-radius: 4px; border-left: 4px solid #03a9f4; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #777; }
            .label { font-weight: bold; color: #555; }
            .button { display: inline-block; padding: 12px 24px; background: #345995; color: white; text-decoration: none; border-radius: 6px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">📧 Nouveau message de FL²M Services</h1>
            </div>
            <div class="content">
              <div class="greeting">
                <p>Bonjour ${recipientInfo.name},</p>
                <p>Vous avez reçu une nouvelle réponse concernant : <strong>${recipientInfo.subject}</strong></p>
              </div>

              ${messagesHistory}

              <div class="response-box">
                <p class="label">Nouvelle réponse :</p>
                <p style="white-space: pre-wrap; margin: 10px 0;">${response}</p>
              </div>

              <div style="margin-top: 30px; text-align: center;">
                <p>Pour répondre à ce message, connectez-vous à votre espace personnel :</p>
                <a href="https://www.fl2m.fr/login" class="button">Accéder à mes messages</a>
              </div>

              <div style="margin-top: 20px;">
                <p>Si vous n'avez pas de compte, vous pouvez répondre directement à cet email.</p>
                <p>Cordialement,<br>L'équipe FL²M Services</p>
              </div>

              <div class="footer">
                <p>Cette réponse a été envoyée depuis FL²M Services</p>
                <p style="margin-top: 10px;">
                  <a href="https://www.fl2m.fr" style="color: #345995; text-decoration: none;">www.fl2m.fr</a> •
                  <a href="mailto:contact@fl2m.fr" style="color: #345995; text-decoration: none;">contact@fl2m.fr</a>
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
        to: [recipientInfo.email],
        reply_to: 'contact@fl2m.fr',
        subject: `Re: ${recipientInfo.subject}`,
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
