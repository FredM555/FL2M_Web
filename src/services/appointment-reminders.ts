// src/services/appointment-reminders.ts
import { supabase } from './supabase';

/**
 * Envoie un email de rappel de rendez-vous au client et au bénéficiaire
 * @param appointment Le rendez-vous avec toutes ses informations
 */
const sendReminderEmail = async (appointment: any) => {
  try {
    const startDate = new Date(appointment.start_time);
    const endDate = new Date(appointment.end_time);

    const formatDate = (date: Date) => {
      return new Intl.DateTimeFormat('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(date);
    };

    const formatTime = (date: Date) => {
      return new Intl.DateTimeFormat('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    };

    // Calculer le temps restant jusqu'au RDV
    const now = new Date();
    const hoursUntil = Math.round((startDate.getTime() - now.getTime()) / (1000 * 60 * 60));

    // Fonction pour obtenir le nom d'affichage de l'intervenant
    const getPractitionerDisplayName = () => {
      if (!appointment.practitioner) return 'Non spécifié';

      if (appointment.practitioner.display_name) {
        return appointment.practitioner.display_name;
      }

      if (appointment.practitioner.profile?.pseudo) {
        return appointment.practitioner.profile.pseudo;
      }

      if (appointment.practitioner.profile?.first_name) {
        return `${appointment.practitioner.profile.first_name} ${appointment.practitioner.profile.last_name || ''}`.trim();
      }

      return 'Non spécifié';
    };

    const emailHtml = (recipientFirstName: string, recipientLastName: string) => `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); color: #1a1a2e; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-box { background: white; padding: 20px; border-left: 4px solid #FFD700; margin: 20px 0; border-radius: 4px; }
          .info-row { margin: 12px 0; padding: 10px; background: #f8f9fa; border-radius: 4px; }
          .label { font-weight: bold; color: #345995; display: inline-block; width: 150px; }
          .alert-box { background: linear-gradient(135deg, #345995 0%, #1D3461 100%); color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .countdown { font-size: 36px; font-weight: bold; color: #FFD700; margin: 10px 0; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #FFD700; }
          .btn { display: inline-block; padding: 12px 30px; background: linear-gradient(45deg, #FFD700, #FFA500); color: #1a1a2e; text-decoration: none; border-radius: 25px; font-weight: bold; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">⏰ Rappel de votre rendez-vous</h2>
          </div>
          <div class="content">
            <p>Bonjour ${recipientFirstName} ${recipientLastName},</p>

            <p>Ce message est un rappel concernant votre rendez-vous à venir.</p>

            <div class="alert-box">
              <p style="margin: 0; font-size: 18px;">Votre rendez-vous aura lieu dans</p>
              <div class="countdown">${hoursUntil}h</div>
            </div>

            <div class="info-box">
              <h3 style="margin-top: 0; color: #345995;">Détails du rendez-vous</h3>

              <div class="info-row">
                <span class="label">Service :</span>
                <span>${appointment.service?.name || 'Non spécifié'}</span>
              </div>

              <div class="info-row">
                <span class="label">Date :</span>
                <span>${formatDate(startDate)}</span>
              </div>

              <div class="info-row">
                <span class="label">Heure :</span>
                <span>${formatTime(startDate)} - ${formatTime(endDate)}</span>
              </div>

              ${appointment.practitioner ? `
              <div class="info-row">
                <span class="label">Intervenant :</span>
                <span>${getPractitionerDisplayName()}</span>
              </div>
              ` : ''}

              ${appointment.beneficiary_first_name ? `
              <div class="info-row">
                <span class="label">Bénéficiaire :</span>
                <span>${appointment.beneficiary_first_name} ${appointment.beneficiary_last_name}</span>
              </div>
              ` : ''}

              ${appointment.meeting_link && appointment.status !== 'completed' ? `
              <div class="info-row">
                <span class="label">Lien visio :</span>
                <span><a href="${appointment.meeting_link}" style="color: #345995;">${appointment.meeting_link}</a></span>
              </div>
              ` : ''}

              ${appointment.notes ? `
              <div class="info-row">
                <span class="label">Notes :</span>
                <span>${appointment.notes}</span>
              </div>
              ` : ''}
            </div>

            <p style="background: #fff3cd; padding: 15px; border-left: 4px solid #FFA500; border-radius: 4px;">
              <strong>⚠️ Rappel important :</strong><br>
              Merci de vous présenter 5 minutes avant l'heure du rendez-vous.
            </p>

            <p>Si vous avez besoin de modifier ou d'annuler ce rendez-vous, merci de nous contacter au plus tôt.</p>

            <div style="text-align: center;">
              <a href="${typeof window !== 'undefined' ? window.location.origin : 'https://votre-site.com'}/mes-rendez-vous" class="btn">Gérer mon rendez-vous</a>
            </div>

            <div class="footer">
              <p style="margin: 0; color: #345995; font-weight: bold;">FL²M Services</p>
              <p style="margin: 5px 0; color: #666;">123 Avenue des Essences, 75001 Paris</p>
              <p style="margin: 5px 0; color: #666;">contact@fl2m.fr | +33 (0)1 23 45 67 89</p>
            </div>

            <p style="color: #999; font-size: 12px; margin-top: 30px; text-align: center;">
              Ceci est un message automatique, merci de ne pas y répondre directement.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Envoyer l'email au client
    if (appointment.client?.email) {
      await supabase.functions.invoke('send-email', {
        body: {
          to: appointment.client.email,
          subject: `Rappel : Rendez-vous ${formatDate(startDate)} à ${formatTime(startDate)} - FL²M Services`,
          html: emailHtml(appointment.client.first_name, appointment.client.last_name),
          appointmentId: appointment.id,
          emailType: 'reminder'
        }
      });
    }

    // Envoyer l'email au bénéficiaire si différent du client et si notifications activées
    if (appointment.beneficiary_email &&
        appointment.beneficiary_email !== appointment.client?.email &&
        appointment.beneficiary_notifications_enabled &&
        appointment.beneficiary_first_name &&
        appointment.beneficiary_last_name) {
      await supabase.functions.invoke('send-email', {
        body: {
          to: appointment.beneficiary_email,
          subject: `Rappel : Rendez-vous ${formatDate(startDate)} à ${formatTime(startDate)} - FL²M Services`,
          html: emailHtml(appointment.beneficiary_first_name, appointment.beneficiary_last_name),
          appointmentId: appointment.id,
          emailType: 'reminder'
        }
      });
    }

    console.log('Emails de rappel envoyés avec succès pour RDV:', appointment.id);
  } catch (error) {
    console.error('Erreur lors de l\'envoi des emails de rappel:', error);
    throw error;
  }
};

/**
 * Traiter tous les rendez-vous nécessitant un rappel
 * Cette fonction devrait être appelée par un CRON job
 */
export const processAppointmentReminders = async () => {
  try {
    console.log('Début du traitement des rappels de RDV...');

    // Récupérer les rendez-vous nécessitant un rappel via la fonction RPC
    const { data: appointments, error } = await supabase.rpc('get_appointments_needing_reminder');

    if (error) {
      console.error('Erreur lors de la récupération des RDV à rappeler:', error);
      return { success: false, error, processed: 0 };
    }

    if (!appointments || appointments.length === 0) {
      console.log('Aucun rendez-vous à rappeler pour le moment');
      return { success: true, processed: 0 };
    }

    console.log(`${appointments.length} rendez-vous nécessitent un rappel`);

    let processed = 0;
    let failed = 0;

    // Traiter chaque rendez-vous
    for (const appointment of appointments) {
      try {
        // Récupérer les détails complets du RDV
        const { data: fullAppointment, error: fetchError } = await supabase
          .from('appointments')
          .select(`
            *,
            client:profiles!client_id(*),
            practitioner:practitioners!practitioner_id(
              *,
              profile:profiles(*)
            ),
            service:services(*)
          `)
          .eq('id', appointment.id)
          .single();

        if (fetchError || !fullAppointment) {
          console.error(`Impossible de récupérer le RDV ${appointment.id}:`, fetchError);
          failed++;
          continue;
        }

        // Envoyer les emails de rappel
        await sendReminderEmail(fullAppointment);

        // Marquer le rappel comme envoyé
        await supabase.rpc('mark_reminder_sent', { p_appointment_id: appointment.id });

        processed++;
        console.log(`✓ Rappel envoyé pour RDV ${appointment.id}`);
      } catch (err) {
        console.error(`Erreur lors du traitement du RDV ${appointment.id}:`, err);
        failed++;
      }
    }

    console.log(`Traitement terminé. Succès: ${processed}, Échecs: ${failed}`);

    return {
      success: true,
      processed,
      failed,
      total: appointments.length
    };
  } catch (error) {
    console.error('Erreur globale lors du traitement des rappels:', error);
    return { success: false, error, processed: 0 };
  }
};
