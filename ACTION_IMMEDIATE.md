# 🚨 ACTION IMMÉDIATE - Correction CORS

**Problème :** Erreur CORS lors de l'envoi d'email de contact
**Solution :** Headers CORS ajoutés au code
**Action requise :** Redéployer la fonction (5 min)

---

## 🎯 À Faire MAINTENANT (5 minutes)

### Étape 1 : Ouvrir Supabase Dashboard (1 min)

1. Allez sur : [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Connectez-vous
3. Sélectionnez votre projet
4. Cliquez sur **Edge Functions** dans le menu de gauche

### Étape 2 : Éditer la Fonction (2 min)

1. Trouvez `send-contact-email` dans la liste
2. Cliquez dessus
3. Cliquez sur **Edit** ou l'icône ✏️

### Étape 3 : Copier le Nouveau Code (1 min)

**Option A - Copier depuis le fichier local :**
1. Ouvrez : `C:\FLM\flm-services-new\supabase\functions\send-contact-email\index.ts`
2. Sélectionnez tout (Ctrl+A)
3. Copiez (Ctrl+C)
4. Collez dans l'éditeur Supabase

**Option B - Le code est ci-dessous :**

<details>
<summary>👉 Cliquez pour voir le code complet à copier</summary>

```typescript
// supabase/functions/send-contact-email/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

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
  adminEmail?: string;
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
              <span class="label">De :</span> \${message.first_name} \${message.last_name}
            </div>
            <div class="info-row">
              <span class="label">Email :</span> <a href="mailto:\${message.email}">\${message.email}</a>
            </div>
            \${message.phone ? \`
            <div class="info-row">
              <span class="label">Téléphone :</span> \${message.phone}
            </div>
            \` : ''}
            <div class="info-row">
              <span class="label">Sujet :</span> \${message.subject}
            </div>
            \${message.module ? \`
            <div class="info-row">
              <span class="label">Module concerné :</span> \${message.module}
            </div>
            \` : ''}
            <div class="message-box">
              <div class="label">Message :</div>
              <p>\${message.message.replace(/\\n/g, '<br>')}</p>
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
            <p>Bonjour \${message.first_name} \${message.last_name},</p>

            <p>Nous avons bien reçu votre message concernant : <strong>\${message.subject}</strong></p>

            \${message.module ? \`
            <p>Module concerné : <strong>\${message.module}</strong></p>
            \` : ''}

            <div class="message-box">
              <p style="margin: 0; color: #666; font-style: italic;">Votre message :</p>
              <p style="margin-top: 10px;">\${message.message.replace(/\\n/g, '<br>')}</p>
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
        'Authorization': \`Bearer \${resendApiKey}\`
      },
      body: JSON.stringify({
        from: 'FL²M Services <noreply@fl2m.fr>',
        to: [adminEmail || 'contact@fl2m.fr'],
        reply_to: message.email,
        subject: \`Nouveau message de contact : \${message.subject}\`,
        html: adminEmailHtml
      })
    });

    if (!adminResponse.ok) {
      const errorText = await adminResponse.text();
      console.error('Resend admin email error:', errorText);
      throw new Error(\`Failed to send admin email: \${errorText}\`);
    }

    const adminResult = await adminResponse.json();
    console.log('Admin email sent successfully:', adminResult);

    // Envoyer l'accusé de réception au client
    const clientResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${resendApiKey}\`
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
```

</details>

### Étape 4 : Déployer (1 min)

1. Cliquez sur **Deploy** (bouton en haut à droite)
2. Attendez quelques secondes (vous verrez une barre de progression)
3. Message de succès : "Function deployed successfully" ✅

### Étape 5 : Tester (30 secondes)

1. Retournez sur votre site : `http://localhost:5173/contact`
2. Rechargez la page (Ctrl+R ou F5)
3. Remplissez le formulaire
4. Envoyez un message test
5. **Ça devrait fonctionner !** 🎉

---

## ✅ Vérification

**Si ça fonctionne :**
- ✅ Pas d'erreur CORS dans la console
- ✅ Message "Votre message a été envoyé avec succès"
- ✅ Email reçu à contact@fl2m.fr
- ✅ Vous pouvez cliquer sur "Répondre" et l'email du client est pré-rempli

**Si ça ne fonctionne toujours pas :**
1. Vider le cache du navigateur (Ctrl+Shift+R)
2. Vérifier que la fonction est bien déployée dans le Dashboard
3. Regarder les logs : Dashboard → Edge Functions → send-contact-email → Logs

---

## 🎯 Changement Effectué

**Ce qui a été ajouté :**

```typescript
// Headers CORS (ligne 20-23)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Gestion des requêtes OPTIONS (ligne 26-31)
if (req.method === 'OPTIONS') {
  return new Response('ok', {
    headers: corsHeaders
  });
}

// Headers CORS ajoutés à TOUTES les réponses
headers: {
  ...corsHeaders,  // ← Ajouté partout
  'Content-Type': 'application/json'
}
```

---

## 📱 Support

**Si problème :**
- Regardez les logs Supabase : Dashboard → Edge Functions → Logs
- Vérifiez la console navigateur (F12)
- Lisez `REDEPLOYER_FONCTION.md` pour plus de détails

---

**⏰ Temps total : 5 minutes**

**🎯 Une fois fait, le formulaire de contact fonctionnera parfaitement !**
