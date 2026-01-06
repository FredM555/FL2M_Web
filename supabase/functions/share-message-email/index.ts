// Fonction Edge pour envoyer un email de partage de message du jour
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ShareMessageRequest {
  to: string;
  senderName: string;
  senderComment: string;
  messageData: {
    firstName: string;
    date: string;
    nombre1: number;
    nombre2: number;
    nombre3?: number;
    label1: string;
    label2: string;
    label3?: string;
    titre1: string;
    titre2: string;
    titre3?: string;
    message1: string;
    message2: string;
    message3?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { to, senderName, senderComment, messageData }: ShareMessageRequest = await req.json();

    console.log('📧 Envoi email de partage à:', to, 'de la part de:', senderName);

    // Construire le contenu HTML de l'email
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Message du jour partagé</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">

  <!-- En-tête -->
  <div style="background: linear-gradient(135deg, #1D3461 0%, #345995 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
    <h1 style="margin: 0; font-size: 28px;">✨ Message du jour ✨</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px;">Partagé avec vous par <strong>${senderName}</strong></p>
  </div>

  <!-- Corps principal -->
  <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

    <!-- Message personnel -->
    ${senderComment ? `
    <div style="background: #f8f9fa; border-left: 4px solid #FFD700; padding: 15px; margin-bottom: 25px; border-radius: 5px;">
      <p style="margin: 0 0 5px 0; font-weight: bold; color: #1D3461;">Message de ${senderName} :</p>
      <p style="margin: 0; font-style: italic; color: #555;">
        "${senderComment}"
      </p>
    </div>
    ` : `
    <div style="background: #f8f9fa; border-left: 4px solid #FFD700; padding: 15px; margin-bottom: 25px; border-radius: 5px;">
      <p style="margin: 0; color: #555;">
        <strong>${senderName}</strong> a pensé à vous et souhaite partager ce message avec vous.
      </p>
    </div>
    `}

    <!-- Informations du message -->
    <div style="text-align: center; margin-bottom: 25px;">
      <h2 style="color: #1D3461; margin-bottom: 10px;">Message du jour de ${messageData.firstName}</h2>
      <p style="color: #666; margin: 0;">${messageData.date}</p>
    </div>

    <!-- Nombres -->
    <div style="display: flex; justify-content: center; gap: 15px; margin-bottom: 30px; flex-wrap: wrap;">
      <div style="background: rgba(103, 126, 234, 0.1); border-radius: 10px; padding: 15px; text-align: center; min-width: 150px;">
        <div style="color: #677EEA; font-size: 14px; margin-bottom: 5px;">${messageData.label1}</div>
        <div style="background: #677EEA; color: white; font-size: 24px; font-weight: bold; width: 50px; height: 50px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
          ${messageData.nombre1}
        </div>
      </div>

      <div style="background: rgba(156, 39, 176, 0.1); border-radius: 10px; padding: 15px; text-align: center; min-width: 150px;">
        <div style="color: #9C27B0; font-size: 14px; margin-bottom: 5px;">${messageData.label2}</div>
        <div style="background: #9C27B0; color: white; font-size: 24px; font-weight: bold; width: 50px; height: 50px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
          ${messageData.nombre2}
        </div>
      </div>

      ${messageData.nombre3 ? `
      <div style="background: rgba(255, 107, 107, 0.1); border-radius: 10px; padding: 15px; text-align: center; min-width: 150px;">
        <div style="color: #ff6b6b; font-size: 14px; margin-bottom: 5px;">${messageData.label3}</div>
        <div style="background: #ff6b6b; color: white; font-size: 24px; font-weight: bold; width: 50px; height: 50px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
          ${messageData.nombre3}
        </div>
      </div>
      ` : ''}
    </div>

    <!-- Messages -->
    ${messageData.message1 ? `
    <div style="margin-bottom: 25px; background: rgba(103, 126, 234, 0.05); border-left: 4px solid #677EEA; padding: 20px; border-radius: 5px;">
      <h3 style="color: #677EEA; margin-top: 0;">${messageData.titre1}</h3>
      <p style="margin: 0; line-height: 1.8;">${messageData.message1}</p>
    </div>
    ` : ''}

    ${messageData.message2 ? `
    <div style="margin-bottom: 25px; background: rgba(156, 39, 176, 0.05); border-left: 4px solid #9C27B0; padding: 20px; border-radius: 5px;">
      <h3 style="color: #9C27B0; margin-top: 0;">${messageData.titre2}</h3>
      <p style="margin: 0; line-height: 1.8;">${messageData.message2}</p>
    </div>
    ` : ''}

    ${messageData.message3 ? `
    <div style="margin-bottom: 25px; background: rgba(255, 107, 107, 0.05); border-left: 4px solid #ff6b6b; padding: 20px; border-radius: 5px;">
      <h3 style="color: #ff6b6b; margin-top: 0;">${messageData.titre3}</h3>
      <p style="margin: 0; line-height: 1.8;">${messageData.message3}</p>
    </div>
    ` : ''}

    <!-- CTA -->
    <div style="text-align: center; margin-top: 30px; padding-top: 30px; border-top: 2px solid #eee;">
      <p style="color: #666; margin-bottom: 20px;">Envie de découvrir votre propre message du jour ?</p>
      <a href="https://www.fl2m.fr/message-du-jour" style="display: inline-block; background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); color: #1D3461; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px;">
        Obtenir mon message
      </a>
    </div>

  </div>

  <!-- Pied de page -->
  <div style="text-align: center; margin-top: 20px; padding: 20px; color: #999; font-size: 12px;">
    <p>© ${new Date().getFullYear()} FL²M - Numérologie professionnelle</p>
    <p>
      <a href="https://www.fl2m.fr" style="color: #677EEA; text-decoration: none;">www.fl2m.fr</a>
    </p>
  </div>

</body>
</html>
    `;

    // Envoyer l'email via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'FL²M <noreply@fl2m.fr>',
        to: [to],
        subject: `✨ ${senderName} a partagé le message du jour de ${messageData.firstName} avec vous`,
        html: htmlContent,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('❌ Erreur Resend:', data);
      throw new Error(data.message || 'Erreur lors de l\'envoi de l\'email');
    }

    console.log('✅ Email envoyé:', data.id);

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error('❌ Erreur:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
