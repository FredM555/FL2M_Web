// =====================================================
// Edge Function: Envoi d'invitations bénéficiaires
// Description: Fonction serverless pour envoyer des invitations
//              à revendiquer un profil bénéficiaire
// =====================================================
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

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

  try {
    const { to, beneficiaryName, inviterName, invitationUrl } = await req.json();

    // Validation
    if (!to || !beneficiaryName || !inviterName || !invitationUrl) {
      return new Response(JSON.stringify({
        error: 'Missing required fields: to, beneficiaryName, inviterName, invitationUrl'
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

    console.log(`Sending invitation email to ${to} for beneficiary ${beneficiaryName}`);

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

    // Construire le HTML de l'email
    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation FL2M</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #345995 0%, #1D3461 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">
                FL2M - Numérologie
              </h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">
                Votre profil vous attend
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #345995; margin: 0 0 20px 0; font-size: 24px; font-weight: 600;">
                Bonjour ${beneficiaryName},
              </h2>

              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                <strong>${inviterName}</strong> a créé votre profil bénéficiaire sur FL2M.
              </p>

              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                Créez votre compte pour accéder à :
              </p>

              <ul style="color: #333333; font-size: 16px; line-height: 1.8; margin: 0 0 30px 0;">
                <li>🔮 Votre profil numérologique complet</li>
                <li>📅 Vos rendez-vous et consultations</li>
                <li>📄 Vos documents (arbre, plan de vie)</li>
                <li>✨ Votre message du jour personnalisé</li>
              </ul>

              <!-- Call to Action Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${invitationUrl}"
                       style="background: linear-gradient(45deg, #345995, #1D3461);
                              color: #ffffff;
                              text-decoration: none;
                              padding: 16px 40px;
                              border-radius: 8px;
                              font-size: 18px;
                              font-weight: 600;
                              display: inline-block;
                              box-shadow: 0 4px 6px rgba(52, 89, 149, 0.3);">
                      CRÉER MON COMPTE
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 30px 0 0 0; text-align: center;">
                Vous avez déjà un compte ?
                <a href="https://fl2m.fr/login" style="color: #345995; text-decoration: none; font-weight: 600;">
                  Se connecter
                </a>
              </p>

              <div style="border-top: 1px solid #e0e0e0; margin: 30px 0; padding-top: 20px;">
                <p style="color: #999999; font-size: 12px; line-height: 1.5; margin: 0;">
                  💡 <strong>Bon à savoir :</strong> En créant votre compte avec cet email,
                  vous deviendrez automatiquement propriétaire de votre profil.
                  ${inviterName} conservera un accès en lecture seule.
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e0e0e0;">
              <p style="color: #666666; font-size: 14px; margin: 0 0 10px 0;">
                Cette invitation expire dans 30 jours
              </p>
              <p style="color: #999999; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} FL2M - Tous droits réservés<br>
                <a href="https://fl2m.fr" style="color: #345995; text-decoration: none;">fl2m.fr</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    // Envoyer l'email via Resend
    const emailPayload = {
      from: 'FL2M Services <contact@fl2m.fr>',
      to: [to],
      subject: `${inviterName} vous invite à rejoindre FL2M`,
      html
    };

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify(emailPayload)
    });

    console.log('Resend API response status:', res.status);

    // Vérifier si la réponse est du JSON
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const textResponse = await res.text();
      console.error('Resend API returned non-JSON response:', textResponse.substring(0, 500));
      return new Response(JSON.stringify({
        error: 'Failed to send invitation email - Invalid API response',
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
      return new Response(JSON.stringify({
        error: 'Failed to send invitation email',
        details: data
      }), {
        status: res.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    console.log('Invitation email sent successfully:', data);

    return new Response(JSON.stringify({
      success: true,
      emailId: data.id
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Error in send-invitation-email function:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
