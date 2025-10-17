// supabase/functions/send-contact-email/index.ts
import { serve } from 'https://deno.land/std@0.131.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.5.0';
import * as SendGrid from 'https://esm.sh/@sendgrid/mail@7.7.0';

interface ContactMessage {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  status: 'new' | 'processing' | 'responded';
}

interface RequestBody {
  message: ContactMessage;
  adminEmails: string[];
}

serve(async (req) => {
  // Configurer SendGrid
  SendGrid.setApiKey(Deno.env.get('SENDGRID_API_KEY') || '');
  
  // Valider la requête
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    // Extraire les données de la requête
    const { message, adminEmails }: RequestBody = await req.json();
    
    if (!message || !adminEmails || adminEmails.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid request data' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Créer le contenu de l'email
    const emailContent = {
      to: adminEmails,
      from: 'noreply@fl2m.com', // Remplacer par votre email vérifié sur SendGrid
      subject: `Nouveau message de contact: ${message.subject}`,
      html: `
        <h2>Nouveau message de contact reçu</h2>
        <p><strong>De:</strong> ${message.first_name} ${message.last_name} &lt;${message.email}&gt;</p>
        <p><strong>Téléphone:</strong> ${message.phone || 'Non renseigné'}</p>
        <p><strong>Sujet:</strong> ${message.subject}</p>
        <p><strong>Message:</strong></p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px;">
          ${message.message.replace(/\n/g, '<br>')}
        </div>
        <hr>
        <p>Vous recevez ce message car vous êtes administrateur du site FL²M Services.</p>
        <p>Veuillez vous connecter à <a href="https://flm-services.com/admin/messages">l'interface d'administration</a> pour répondre à ce message.</p>
      `
    };
    
    // Envoyer l'email
    await SendGrid.send(emailContent);
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error sending email:', error);
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});