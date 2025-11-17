// =====================================================
// Service d'envoi d'emails
// Description: Fonctions pour envoyer des emails via Supabase Edge Functions
// =====================================================

import { supabase } from './supabase';
import type { Appointment } from './supabase';

export type EmailType = 'confirmation' | 'reminder' | 'document' | 'cancellation';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  appointmentId?: string;
  emailType?: EmailType;
}

/**
 * Envoie un email via la Edge Function Supabase
 */
export const sendEmail = async (params: SendEmailParams) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: params
    });

    if (error) throw error;

    console.log('Email envoyé avec succès:', data);
    return { success: true, data };
  } catch (error: any) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Template HTML de base pour les emails
 */
const getEmailTemplate = (content: string) => {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FL2M Services</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 2px solid #345995;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #345995;
      margin: 0;
      font-size: 28px;
    }
    .content {
      margin-bottom: 30px;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background: linear-gradient(45deg, #345995, #1D3461);
      color: #ffffff;
      text-decoration: none;
      border-radius: 5px;
      margin: 20px 0;
      font-weight: bold;
    }
    .button:hover {
      background: linear-gradient(45deg, #1D3461, #345995);
    }
    .info-box {
      background-color: #f8f9fa;
      border-left: 4px solid #345995;
      padding: 15px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      padding-top: 20px;
      border-top: 1px solid #ddd;
      margin-top: 30px;
      font-size: 12px;
      color: #666;
    }
    .footer a {
      color: #345995;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>FL2M Services</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>
        Cet email a été envoyé automatiquement par FL2M Services.<br>
        Pour toute question, contactez-nous à <a href="mailto:contact@fl2m-services.com">contact@fl2m-services.com</a>
      </p>
      <p>
        <a href="#">Politique de confidentialité</a> |
        <a href="#">Se désabonner</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Formate une date en français
 */
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Email de confirmation de rendez-vous
 */
export const sendAppointmentConfirmation = async (
  email: string,
  appointment: Appointment
) => {
  const content = `
    <h2>Votre rendez-vous est confirmé</h2>
    <p>Bonjour ${appointment.beneficiary_first_name},</p>
    <p>Nous sommes heureux de confirmer votre rendez-vous :</p>

    <div class="info-box">
      <p><strong>Service :</strong> ${appointment.service?.name}</p>
      <p><strong>Date et heure :</strong> ${formatDate(appointment.start_time)}</p>
      <p><strong>Intervenant :</strong> ${appointment.practitioner?.profile?.pseudo || 'À confirmer'}</p>
      ${appointment.custom_price || appointment.service?.price !== 9999
        ? `<p><strong>Prix :</strong> ${appointment.custom_price || appointment.service?.price} €</p>`
        : '<p><strong>Prix :</strong> Sur devis</p>'}
    </div>

    ${appointment.meeting_link
      ? `<p style="text-align: center;">
          <a href="${appointment.meeting_link}" class="button">Rejoindre la séance</a>
        </p>`
      : ''}

    <p>Nous vous enverrons un rappel 24 heures avant le rendez-vous.</p>
    <p>À bientôt,<br>L'équipe FL2M Services</p>
  `;

  return sendEmail({
    to: email,
    subject: 'Confirmation de votre rendez-vous - FL2M Services',
    html: getEmailTemplate(content),
    appointmentId: appointment.id,
    emailType: 'confirmation'
  });
};

/**
 * Email de rappel 24h avant
 */
export const sendAppointmentReminder = async (
  email: string,
  appointment: Appointment
) => {
  const content = `
    <h2>Rappel : Rendez-vous demain</h2>
    <p>Bonjour ${appointment.beneficiary_first_name},</p>
    <p>Nous vous rappelons que vous avez un rendez-vous demain :</p>

    <div class="info-box">
      <p><strong>Service :</strong> ${appointment.service?.name}</p>
      <p><strong>Date et heure :</strong> ${formatDate(appointment.start_time)}</p>
      <p><strong>Intervenant :</strong> ${appointment.practitioner?.profile?.pseudo || '-'}</p>
    </div>

    ${appointment.meeting_link
      ? `<p style="text-align: center;">
          <a href="${appointment.meeting_link}" class="button">Rejoindre la séance</a>
        </p>`
      : ''}

    <p>À demain,<br>L'équipe FL2M Services</p>
  `;

  return sendEmail({
    to: email,
    subject: 'Rappel : Rendez-vous demain - FL2M Services',
    html: getEmailTemplate(content),
    appointmentId: appointment.id,
    emailType: 'reminder'
  });
};

/**
 * Email de notification de nouveau document
 */
export const sendDocumentNotification = async (
  email: string,
  appointment: Appointment,
  documentName: string
) => {
  const content = `
    <h2>Nouveau document disponible</h2>
    <p>Bonjour ${appointment.beneficiary_first_name},</p>
    <p>Un nouveau document est disponible pour votre rendez-vous du ${formatDate(appointment.start_time)}.</p>

    <div class="info-box">
      <p><strong>Document :</strong> ${documentName}</p>
      <p><strong>Service :</strong> ${appointment.service?.name}</p>
      <p><strong>Intervenant :</strong> ${appointment.practitioner?.profile?.pseudo || '-'}</p>
    </div>

    <p style="text-align: center;">
      <a href="${window.location.origin}/mes-rendez-vous" class="button">Voir mes rendez-vous</a>
    </p>

    <p>Cordialement,<br>L'équipe FL2M Services</p>
  `;

  return sendEmail({
    to: email,
    subject: 'Nouveau document disponible - FL2M Services',
    html: getEmailTemplate(content),
    appointmentId: appointment.id,
    emailType: 'document'
  });
};

/**
 * Email d'annulation de rendez-vous
 */
export const sendAppointmentCancellation = async (
  email: string,
  appointment: Appointment
) => {
  const content = `
    <h2>Annulation de rendez-vous</h2>
    <p>Bonjour ${appointment.beneficiary_first_name},</p>
    <p>Nous vous informons que votre rendez-vous a été annulé :</p>

    <div class="info-box">
      <p><strong>Service :</strong> ${appointment.service?.name}</p>
      <p><strong>Date et heure :</strong> ${formatDate(appointment.start_time)}</p>
    </div>

    <p>Si vous souhaitez reprendre rendez-vous, n'hésitez pas à nous contacter.</p>

    <p style="text-align: center;">
      <a href="${window.location.origin}/prendre-rendez-vous" class="button">Prendre un nouveau rendez-vous</a>
    </p>

    <p>Cordialement,<br>L'équipe FL2M Services</p>
  `;

  return sendEmail({
    to: email,
    subject: 'Annulation de rendez-vous - FL2M Services',
    html: getEmailTemplate(content),
    appointmentId: appointment.id,
    emailType: 'cancellation'
  });
};
