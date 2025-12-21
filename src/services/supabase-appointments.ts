// src/services/supabase-appointments.ts
import { supabase, Appointment, logActivity } from './supabase';
import { startOfWeek, endOfWeek, format, parseISO } from 'date-fns';
import { logger } from '../utils/logger';
import { getPrimaryBeneficiaryForAppointment, getAppointmentBeneficiaries } from './beneficiaries';

/**
 * Vérifie s'il existe un conflit de créneau pour un intervenant et un service donnés
 * @param practitionerId ID de l'intervenant
 * @param serviceId ID du service/module
 * @param startTime Heure de début du nouveau rendez-vous
 * @param endTime Heure de fin du nouveau rendez-vous
 * @param excludeAppointmentId ID du rendez-vous à exclure (pour les modifications)
 * @returns true s'il y a un conflit, false sinon
 */
export const checkAppointmentConflict = async (
  practitionerId: string,
  serviceId: string,
  startTime: string,
  endTime: string,
  excludeAppointmentId?: string
): Promise<{ hasConflict: boolean; conflictingAppointment?: any }> => {
  try {
    // Requête pour trouver les rendez-vous qui se chevauchent
    // Deux créneaux se chevauchent si : new_start < existing_end AND new_end > existing_start
    let query = supabase
      .from('appointments')
      .select('*')
      .eq('practitioner_id', practitionerId)
      .eq('service_id', serviceId)
      .not('status', 'eq', 'cancelled') // Ignorer les rendez-vous annulés
      .lt('start_time', endTime) // existing_start < new_end
      .gt('end_time', startTime); // existing_end > new_start

    // Exclure le rendez-vous en cours de modification
    if (excludeAppointmentId) {
      query = query.neq('id', excludeAppointmentId);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Erreur lors de la vérification des conflits:', error);
      throw error;
    }

    if (data && data.length > 0) {
      return {
        hasConflict: true,
        conflictingAppointment: data[0]
      };
    }

    return { hasConflict: false };
  } catch (error) {
    logger.error('Exception dans checkAppointmentConflict:', error);
    throw error;
  }
};

/**
 * Suspend (annule) automatiquement les rendez-vous du même intervenant sur le même créneau
 * mais pour des modules différents lorsqu'un rendez-vous est confirmé
 * @param practitionerId ID de l'intervenant
 * @param startTime Heure de début du rendez-vous confirmé
 * @param endTime Heure de fin du rendez-vous confirmé
 * @param confirmedAppointmentId ID du rendez-vous confirmé à exclure
 * @returns Nombre de rendez-vous suspendus et liste des rendez-vous suspendus
 */
export const suspendConflictingAppointments = async (
  practitionerId: string,
  startTime: string,
  endTime: string,
  confirmedAppointmentId: string
): Promise<{ suspendedCount: number; suspendedAppointments: any[] }> => {
  try {
    // 1. Récupérer le service_id du rendez-vous confirmé
    const { data: confirmedAppointment, error: fetchError } = await supabase
      .from('appointments')
      .select('service_id')
      .eq('id', confirmedAppointmentId)
      .single();

    if (fetchError) {
      logger.error('Erreur lors de la récupération du rendez-vous confirmé:', fetchError);
      throw fetchError;
    }

    // 2. Trouver tous les rendez-vous qui se chevauchent avec le même intervenant
    // Deux créneaux se chevauchent si : new_start < existing_end AND new_end > existing_start
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('practitioner_id', practitionerId)
      .not('status', 'eq', 'cancelled') // Ignorer les rendez-vous déjà annulés
      .neq('id', confirmedAppointmentId) // Exclure le rendez-vous confirmé
      .neq('service_id', confirmedAppointment.service_id) // Exclure les rendez-vous du même module
      .lt('start_time', endTime) // existing_start < new_end
      .gt('end_time', startTime); // existing_end > new_start

    if (error) {
      logger.error('Erreur lors de la recherche des rendez-vous conflictuels:', error);
      throw error;
    }

    // 3. Si aucun rendez-vous à suspendre, retourner
    if (!data || data.length === 0) {
      return { suspendedCount: 0, suspendedAppointments: [] };
    }

    // 4. Suspendre (annuler) tous ces rendez-vous
    const appointmentIds = data.map(a => a.id);

    const { data: updatedAppointments, error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        notes: `[AUTO_SUSPENDED:${confirmedAppointmentId}] Suspendu automatiquement car un autre rendez-vous a été confirmé sur ce créneau`,
        updated_at: new Date().toISOString()
      })
      .in('id', appointmentIds)
      .select();

    if (updateError) {
      logger.error('Erreur lors de la suspension des rendez-vous:', updateError);
      throw updateError;
    }

    // 5. Logger l'action pour chaque rendez-vous suspendu
    for (const appointment of data) {
      if (appointment.client_id) {
        logActivity({
          userId: appointment.client_id,
          actionType: 'appointment_cancelled',
          actionDescription: 'Rendez-vous suspendu automatiquement suite à la confirmation d\'un autre rendez-vous du même intervenant',
          entityType: 'appointment',
          entityId: appointment.id,
          metadata: {
            auto_suspended: true,
            confirmed_appointment_id: confirmedAppointmentId
          }
        }).catch(err => logger.warn('Erreur log suspension auto RDV:', err));
      }
    }

    logger.debug(`${data.length} rendez-vous suspendu(s) automatiquement`);

    return {
      suspendedCount: data.length,
      suspendedAppointments: updatedAppointments || []
    };
  } catch (error) {
    logger.error('Exception dans suspendConflictingAppointments:', error);
    throw error;
  }
};

/**
 * Réactive les rendez-vous qui ont été automatiquement suspendus par un rendez-vous donné
 * Cette fonction est appelée quand un rendez-vous confirmé redevient disponible (pending)
 * @param appointmentId ID du rendez-vous qui avait causé les suspensions
 * @returns Nombre de rendez-vous réactivés
 */
export const reactivateSuspendedAppointments = async (
  appointmentId: string
): Promise<{ reactivatedCount: number; reactivatedAppointments: any[] }> => {
  try {
    // Trouver tous les rendez-vous annulés qui ont été suspendus automatiquement par ce rendez-vous
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('status', 'cancelled')
      .like('notes', `%[AUTO_SUSPENDED:${appointmentId}]%`);

    if (error) {
      logger.error('Erreur lors de la recherche des rendez-vous à réactiver:', error);
      throw error;
    }

    // Si aucun rendez-vous à réactiver
    if (!data || data.length === 0) {
      return { reactivatedCount: 0, reactivatedAppointments: [] };
    }

    // Réactiver tous ces rendez-vous
    const appointmentIds = data.map(a => a.id);

    const { data: updatedAppointments, error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'pending',
        notes: null, // Effacer la note d'annulation automatique
        updated_at: new Date().toISOString()
      })
      .in('id', appointmentIds)
      .select();

    if (updateError) {
      logger.error('Erreur lors de la réactivation des rendez-vous:', updateError);
      throw updateError;
    }

    // Logger l'action pour chaque rendez-vous réactivé
    for (const appointment of data) {
      if (appointment.client_id) {
        logActivity({
          userId: appointment.client_id,
          actionType: 'appointment_reactivated',
          actionDescription: 'Rendez-vous réactivé automatiquement car le rendez-vous conflictuel n\'est plus confirmé',
          entityType: 'appointment',
          entityId: appointment.id,
          metadata: {
            auto_reactivated: true,
            causing_appointment_id: appointmentId
          }
        }).catch(err => logger.warn('Erreur log réactivation auto RDV:', err));
      }
    }

    logger.debug(`${data.length} rendez-vous réactivé(s) automatiquement`);

    return {
      reactivatedCount: data.length,
      reactivatedAppointments: updatedAppointments || []
    };
  } catch (error) {
    logger.error('Exception dans reactivateSuspendedAppointments:', error);
    throw error;
  }
};

/**
 * Vérifie si un service a des créneaux disponibles pour un intervenant donné
 * @param serviceId ID du service
 * @param practitionerId ID de l'intervenant
 * @returns true s'il y a au moins un créneau disponible, false sinon
 */
export const checkServiceAvailability = async (
  serviceId: string,
  practitionerId: string
): Promise<boolean> => {
  try {
    const now = new Date();
    const currentDateTime = now.toISOString();

    // Vérifier s'il existe au moins un créneau disponible
    const { data, error } = await supabase
      .from('appointments')
      .select('id')
      .eq('service_id', serviceId)
      .eq('practitioner_id', practitionerId)
      .is('client_id', null)
      .not('status', 'eq', 'cancelled')
      .gte('start_time', currentDateTime)
      .limit(1);

    if (error) {
      logger.error('Erreur lors de la vérification de disponibilité:', error);
      return false;
    }

    return data && data.length > 0;
  } catch (error) {
    logger.error('Exception dans checkServiceAvailability:', error);
    return false;
  }
};

/**
 * Récupérer les services disponibles, éventuellement filtrés par catégorie
 * @param category Catégorie optionnelle pour filtrer les services
 * @returns Liste des services
 */
export const getServices = (category?: string) => {
  let query = supabase.from('services').select('*');

  if (category) {
    query = query.eq('category', category);
  }

  return query.order('name');
};

/**
 * Récupérer les intervenants disponibles (uniquement les actifs)
 * @returns Liste des intervenants actifs avec leurs profils
 */
export const getPractitioners = () => {
  return supabase
    .from('practitioners')
    .select(`
      *,
      profile:profiles(*)
    `)
    .eq('is_active', true)
    .eq('profile_visible', true)
    .order('priority', { ascending: false });
};

/**
 * Réserver un créneau de rendez-vous
 * @param appointmentId ID du rendez-vous à réserver
 * @param clientId ID du client qui réserve
 * @param additionalData Données supplémentaires pour la réservation
 * @returns Résultat de la réservation
 */
export const bookAppointment = async (
  appointmentId: string,
  clientId: string,
  additionalData?: Partial<Appointment>
) => {
  try {
    // Vérifier d'abord que le créneau est toujours disponible
    const { data: appointmentData, error: appointmentError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .is('client_id', null)
      .not('status', 'eq', 'cancelled')
      .single();

    if (appointmentError || !appointmentData) {
      throw new Error('Ce créneau n\'est plus disponible');
    }

    // Mettre à jour le rendez-vous avec les informations du client
    const { data, error: updateError } = await supabase
      .from('appointments')
      .update({
        client_id: clientId,
        status: 'confirmed',
        ...additionalData,
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId)
      .select(`
        *,
        practitioner:practitioners!practitioner_id(
          *,
          profile:profiles(*)
        ),
        service:services(*),
        client:profiles!client_id(*)
      `)
      .single();

    if (updateError) throw updateError;

    // Suspendre les autres rendez-vous du même intervenant sur le même créneau
    if (data) {
      suspendConflictingAppointments(
        data.practitioner_id,
        data.start_time,
        data.end_time,
        data.id
      ).catch(err =>
        logger.error('Erreur lors de la suspension des rendez-vous conflictuels:', err)
      );
    }

    // Envoyer les emails de confirmation uniquement si pas de paiement requis
    // Si paiement requis, l'email sera envoyé après confirmation du paiement via webhook
    if (data && !data.payment_required) {
      sendAppointmentConfirmationEmails(data).catch(err =>
        logger.error('Erreur lors de l\'envoi des emails de confirmation:', err)
      );
    }

    return { success: true, data, error: null };
  } catch (error) {
    logger.error('Erreur dans bookAppointment:', error);
    return { success: false, data: null, error };
  }
};

// Fonctions utilitaires pour le formatage des dates et noms
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

// Fonction pour obtenir le nom d'affichage de l'intervenant
const getPractitionerDisplayName = (appointment: any) => {
  if (!appointment.practitioner) return 'Non spécifié';

  // Priorité : display_name > pseudo > prénom nom
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

/**
 * Envoie les emails de confirmation de rendez-vous au client et au bénéficiaire
 * @param appointment Le rendez-vous confirmé avec toutes les informations
 */
// Fonction pour construire l'email de confirmation pour l'intervenant
const buildPractitionerEmailHtml = (appointment: any, beneficiaryName?: string) => {
  const startDate = new Date(appointment.start_time);
  const endDate = new Date(appointment.end_time);

  const practitionerName = getPractitionerDisplayName(appointment);
  const clientName = appointment.client?.pseudo ||
    `${appointment.client?.first_name || ''} ${appointment.client?.last_name || ''}`.trim() ||
    'Client';

  const price = appointment.custom_price ?? appointment.service?.price;
  const priceDisplay = price !== 9999 ? `${price} €` : 'Sur devis';
  const isPaid = appointment.payment_status === 'paid';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #345995 0%, #1D3461 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
        .info-box { background: white; padding: 20px; border-left: 4px solid #FFD700; margin: 20px 0; border-radius: 4px; }
        .alert-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
        .info-row { margin: 12px 0; padding: 10px; background: #f8f9fa; border-radius: 4px; }
        .label { font-weight: bold; color: #345995; display: inline-block; width: 150px; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #FFD700; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2 style="margin: 0; color: white;">🎉 Nouveau rendez-vous confirmé !</h2>
        </div>
        <div class="content">
          <p>Bonjour ${practitionerName},</p>
          <p>Un nouveau rendez-vous vient d'être réservé sur votre planning${isPaid ? ' et payé' : ''} :</p>

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

            <div class="info-row">
              <span class="label">Client :</span>
              <span>${clientName}</span>
            </div>

            ${beneficiaryName ? `
            <div class="info-row">
              <span class="label">Bénéficiaire :</span>
              <span>${beneficiaryName}</span>
            </div>
            ` : ''}

            ${appointment.client?.email ? `
            <div class="info-row">
              <span class="label">Email :</span>
              <span>${appointment.client.email}</span>
            </div>
            ` : ''}

            ${appointment.client?.phone ? `
            <div class="info-row">
              <span class="label">Téléphone :</span>
              <span>${appointment.client.phone}</span>
            </div>
            ` : ''}

            ${isPaid ? `
            <div class="info-row">
              <span class="label">Prix :</span>
              <span>${priceDisplay}</span>
            </div>
            ` : ''}
          </div>

          ${isPaid ? `
          <div class="alert-box">
            <p><strong>⚠️ Important - Paiement et validation</strong></p>
            <p>Le paiement de ${priceDisplay} a été reçu et sera conservé en attente pendant 48 heures après le rendez-vous.</p>
            <p><strong>Après la séance :</strong> Le client doit valider que la séance s'est bien déroulée. Dès validation, vous recevrez automatiquement le paiement sur votre compte Stripe Connect.</p>
            <p><strong>Si pas de validation :</strong> Le paiement vous sera transféré automatiquement 48 heures après la fin du rendez-vous.</p>
          </div>
          ` : ''}

          <p><strong>Rendez-vous en conflit :</strong> Les autres créneaux disponibles sur ce même horaire ont été automatiquement annulés.</p>

          <p>Retrouvez tous vos rendez-vous sur votre tableau de bord : <a href="https://www.fl2m.fr/intervenant/planning" style="color: #345995; text-decoration: none; font-weight: bold;">Mon planning</a></p>

          <div class="footer">
            <p style="margin: 0; color: #345995; font-weight: bold;">FL2M IPServices</p>
            <p style="margin: 5px 0; color: #666;">6, rue albert nicolas</p>
            <p style="margin: 5px 0; color: #666;">+33 (0)6 95 57 31 37</p>
          </div>

          <p style="color: #999; font-size: 12px; margin-top: 30px; text-align: center;">
            Ceci est un message automatique, merci de ne pas y répondre directement.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

const sendAppointmentConfirmationEmails = async (appointment: any) => {
  try {
    const startDate = new Date(appointment.start_time);
    const endDate = new Date(appointment.end_time);

    // Récupérer le bénéficiaire principal depuis la table de liaison
    const { data: primaryBeneficiary } = await getPrimaryBeneficiaryForAppointment(appointment.id);

    const emailHtml = (recipientFirstName: string, recipientLastName: string, isClient: boolean = true, beneficiaryName?: string) => `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #345995 0%, #1D3461 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-box { background: white; padding: 20px; border-left: 4px solid #FFD700; margin: 20px 0; border-radius: 4px; }
          .info-row { margin: 12px 0; padding: 10px; background: #f8f9fa; border-radius: 4px; }
          .label { font-weight: bold; color: #345995; display: inline-block; width: 150px; }
          .highlight { background: linear-gradient(45deg, #FFD700, #FFA500); color: #1a1a2e; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #FFD700; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0; color: white;">✓ Rendez-vous confirmé</h2>
          </div>
          <div class="content">
            <p>Bonjour ${isClient && appointment.client?.pseudo ? appointment.client.pseudo : recipientFirstName},</p>

            <p>Votre rendez-vous a été confirmé avec succès !</p>

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
                <span>${getPractitionerDisplayName(appointment)}</span>
              </div>
              ` : ''}

              ${beneficiaryName ? `
              <div class="info-row">
                <span class="label">Bénéficiaire :</span>
                <span>${beneficiaryName}</span>
              </div>
              ` : ''}

              ${appointment.location ? `
              <div class="info-row">
                <span class="label">Lieu :</span>
                <span>${appointment.location}</span>
              </div>
              ` : ''}

              ${appointment.notes ? `
              <div class="info-row">
                <span class="label">Notes :</span>
                <span>${appointment.notes}</span>
              </div>
              ` : ''}
            </div>

            <div class="highlight">
              Merci de vous connecter 5 minutes avant le rendez-vous pour valider la connexion
            </div>

            <p>Si vous avez besoin de modifier ou d'annuler ce rendez-vous, merci d'aller dans le menu <strong>"Mes rendez-vous"</strong> sur <a href="https://www.fl2m.fr" style="color: #345995; text-decoration: none; font-weight: bold;">www.fl2m.fr</a></p>

            <div class="footer">
              <p style="margin: 0; color: #345995; font-weight: bold;">FL2M IPServices</p>
              <p style="margin: 5px 0; color: #666;">6, rue albert nicolas</p>
              <p style="margin: 5px 0; color: #666;">+33 (0)6 95 57 31 37</p>
            </div>

            <p style="color: #999; font-size: 12px; margin-top: 30px; text-align: center;">
              Ceci est un message automatique, merci de ne pas y répondre directement.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const beneficiaryName = primaryBeneficiary
      ? `${primaryBeneficiary.first_name} ${primaryBeneficiary.last_name}`
      : undefined;

    // Envoyer l'email au client
    if (appointment.client?.email) {
      await supabase.functions.invoke('send-email', {
        body: {
          to: appointment.client.email,
          subject: `Confirmation de votre rendez-vous - ${appointment.service?.name || 'FL²M Services'}`,
          html: emailHtml(appointment.client.first_name, appointment.client.last_name, true, beneficiaryName),
          appointmentId: appointment.id,
          emailType: 'confirmation'
        }
      });
    }

    // Envoyer l'email au bénéficiaire si différent du client et si email renseigné
    if (primaryBeneficiary?.email &&
        primaryBeneficiary.email !== appointment.client?.email &&
        primaryBeneficiary.notifications_enabled) {
      await supabase.functions.invoke('send-email', {
        body: {
          to: primaryBeneficiary.email,
          subject: `Confirmation de votre rendez-vous - ${appointment.service?.name || 'FL²M Services'}`,
          html: emailHtml(primaryBeneficiary.first_name, primaryBeneficiary.last_name, false, beneficiaryName),
          appointmentId: appointment.id,
          emailType: 'confirmation'
        }
      });
    }

    // Envoyer l'email à l'intervenant
    if (appointment.practitioner?.profile?.email) {
      const practitionerEmailHtml = buildPractitionerEmailHtml(appointment, beneficiaryName);
      await supabase.functions.invoke('send-email', {
        body: {
          to: appointment.practitioner.profile.email,
          subject: `Nouveau rendez-vous confirmé - ${appointment.service?.name || 'FL²M Services'}`,
          html: practitionerEmailHtml,
          appointmentId: appointment.id,
          emailType: 'practitioner_confirmation'
        }
      });
    }

    logger.debug('Emails de confirmation envoyés avec succès');
  } catch (error) {
    logger.error('Erreur lors de l\'envoi des emails de confirmation:', error);
    throw error;
  }
};

/**
 * Envoie les emails d'annulation de rendez-vous au client et au bénéficiaire
 * @param appointment Le rendez-vous annulé avec toutes les informations
 */
const sendAppointmentCancellationEmails = async (appointment: any) => {
  try {
    const startDate = new Date(appointment.start_time);
    const endDate = new Date(appointment.end_time);

    // Récupérer le bénéficiaire principal depuis la table de liaison
    const { data: primaryBeneficiary } = await getPrimaryBeneficiaryForAppointment(appointment.id);

    const emailHtml = (recipientFirstName: string, recipientLastName: string, isClient: boolean = true, beneficiaryName?: string) => `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #d32f2f 0%, #b71c1c 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .info-box { background: white; padding: 20px; border-left: 4px solid #d32f2f; margin: 20px 0; border-radius: 4px; }
          .info-row { margin: 12px 0; padding: 10px; background: #f8f9fa; border-radius: 4px; }
          .label { font-weight: bold; color: #d32f2f; display: inline-block; width: 150px; }
          .highlight { background: linear-gradient(45deg, #ffcdd2, #ef9a9a); color: #b71c1c; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 2px solid #d32f2f; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0; color: white;">✗ Rendez-vous annulé</h2>
          </div>
          <div class="content">
            <p>Bonjour ${isClient && appointment.client?.pseudo ? appointment.client.pseudo : recipientFirstName},</p>

            <p>Votre rendez-vous a été annulé.</p>

            <div class="info-box">
              <h3 style="margin-top: 0; color: #d32f2f;">Détails du rendez-vous annulé</h3>

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
                <span>${getPractitionerDisplayName(appointment)}</span>
              </div>
              ` : ''}

              ${beneficiaryName ? `
              <div class="info-row">
                <span class="label">Bénéficiaire :</span>
                <span>${beneficiaryName}</span>
              </div>
              ` : ''}
            </div>

            <div class="highlight">
              Ce rendez-vous a été annulé avec succès
            </div>

            <p>Si vous souhaitez prendre un nouveau rendez-vous, merci de vous rendre sur <a href="https://www.fl2m.fr" style="color: #d32f2f; text-decoration: none; font-weight: bold;">www.fl2m.fr</a></p>

            <div class="footer">
              <p style="margin: 0; color: #345995; font-weight: bold;">FL2M IPServices</p>
              <p style="margin: 5px 0; color: #666;">6, rue albert nicolas</p>
              <p style="margin: 5px 0; color: #666;">+33 (0)6 95 57 31 37</p>
            </div>

            <p style="color: #999; font-size: 12px; margin-top: 30px; text-align: center;">
              Ceci est un message automatique, merci de ne pas y répondre directement.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const beneficiaryName = primaryBeneficiary
      ? `${primaryBeneficiary.first_name} ${primaryBeneficiary.last_name}`
      : undefined;

    // Envoyer l'email au client
    if (appointment.client?.email) {
      await supabase.functions.invoke('send-email', {
        body: {
          to: appointment.client.email,
          subject: `Annulation de votre rendez-vous - ${appointment.service?.name || 'FL²M Services'}`,
          html: emailHtml(appointment.client.first_name, appointment.client.last_name, true, beneficiaryName),
          appointmentId: appointment.id,
          emailType: 'cancellation'
        }
      });
    }

    // Envoyer l'email au bénéficiaire si différent du client et si email renseigné
    if (primaryBeneficiary?.email &&
        primaryBeneficiary.email !== appointment.client?.email &&
        primaryBeneficiary.notifications_enabled) {
      await supabase.functions.invoke('send-email', {
        body: {
          to: primaryBeneficiary.email,
          subject: `Annulation de votre rendez-vous - ${appointment.service?.name || 'FL²M Services'}`,
          html: emailHtml(primaryBeneficiary.first_name, primaryBeneficiary.last_name, false, beneficiaryName),
          appointmentId: appointment.id,
          emailType: 'cancellation'
        }
      });
    }

    logger.debug('Emails d\'annulation envoyés avec succès');
  } catch (error) {
    logger.error('Erreur lors de l\'envoi des emails d\'annulation:', error);
    throw error;
  }
};

/**
 * Récupérer les créneaux disponibles pour un service sur une période donnée
 * @param startDate Date de début au format ISO
 * @param endDate Date de fin au format ISO
 * @param serviceId ID du service
 * @param practitionerId ID de l'intervenant (optionnel)
 * @returns Liste des créneaux disponibles
 */
export const getAvailableAppointments = async (
  startDate: string,
  endDate: string,
  serviceId: string,
  practitionerId?: string
) => {
  // D'abord, récupérer les IDs des practitioners actifs
  const { data: activePractitioners, error: practitionersError } = await supabase
    .from('practitioners')
    .select('id')
    .eq('is_active', true)
    .eq('profile_visible', true);

  if (practitionersError) {
    return { data: null, error: practitionersError };
  }

  // Extraire les IDs
  const activePractitionerIds = activePractitioners?.map(p => p.id) || [];

  // Si aucun practitioner actif, retourner une liste vide
  if (activePractitionerIds.length === 0) {
    return { data: [], error: null };
  }

  // S'assurer que startDate est au minimum l'heure actuelle pour bloquer les créneaux passés
  const now = new Date();
  const currentDateTime = now.toISOString();
  const effectiveStartDate = startDate > currentDateTime ? startDate : currentDateTime;

  // Construire la requête de base
  let query = supabase
    .from('appointments')
    .select(`
      *,
      practitioner:practitioners!practitioner_id(
        *,
        profile:profiles(*)
      ),
      service:services(*)
    `)
    .is('client_id', null) // Uniquement les créneaux non réservés
    .gte('start_time', effectiveStartDate) // Utiliser la date effective (jamais dans le passé)
    .lte('start_time', endDate)
    .not('status', 'eq', 'cancelled')
    .eq('service_id', serviceId)
    .in('practitioner_id', activePractitionerIds); // Filtrer uniquement les intervenants actifs

  // Ajouter le filtre d'intervenant si spécifié
  if (practitionerId) {
    query = query.eq('practitioner_id', practitionerId);
  }

  return query.order('start_time', { ascending: true });
};

/**
 * Récupérer les créneaux disponibles par semaine
 * @param weekDate Date de référence pour la semaine (format ISO)
 * @param serviceId ID du service
 * @param practitionerId ID de l'intervenant (optionnel)
 * @returns Liste des créneaux disponibles pour cette semaine
 */
export const getAvailableAppointmentsByWeek = async (
  weekDate: string,
  serviceId: string,
  practitionerId?: string
) => {
  // Calculer le début et la fin de la semaine
  const date = parseISO(weekDate);
  const start = startOfWeek(date, { weekStartsOn: 1 }); // Lundi
  const end = endOfWeek(date, { weekStartsOn: 1 }); // Dimanche

  const startWeekDate = format(start, "yyyy-MM-dd'T'HH:mm:ss'Z'");
  const endWeekDate = format(end, "yyyy-MM-dd'T'23:59:59'Z'");

  return await getAvailableAppointments(startWeekDate, endWeekDate, serviceId, practitionerId);
};

/**
 * Récupérer les créneaux disponibles pour un mois donné
 * @param yearMonth Année et mois au format 'YYYY-MM'
 * @param serviceId ID du service
 * @param practitionerId ID de l'intervenant (optionnel)
 * @returns Liste des créneaux disponibles pour ce mois
 */
export const getAvailableAppointmentsByMonth = async (
  yearMonth: string,
  serviceId: string,
  practitionerId?: string
) => {
  // Extraire l'année et le mois
  const [year, month] = yearMonth.split('-').map(num => parseInt(num));

  // Premier jour du mois
  const startDate = new Date(year, month - 1, 1);
  // Dernier jour du mois
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const startMonthDate = format(startDate, "yyyy-MM-dd'T'00:00:00'Z'");
  const endMonthDate = format(endDate, "yyyy-MM-dd'T'23:59:59'Z'");

  return await getAvailableAppointments(startMonthDate, endMonthDate, serviceId, practitionerId);
};

/**
 * Récupérer toutes les semaines qui contiennent des rendez-vous disponibles
 * @param serviceId ID du service
 * @param startDate Date de début (optionnelle, par défaut aujourd'hui)
 * @param endDate Date de fin (optionnelle, par défaut dans 3 mois)
 * @returns Liste des semaines contenant des créneaux disponibles
 */
export const getAvailableWeeks = async (
  serviceId: string,
  startDate?: string,
  endDate?: string
) => {
  // Définir les dates par défaut si non fournies
  const now = new Date();
  // Utiliser l'heure actuelle pour bloquer les créneaux passés (même jour)
  const defaultStartDate = now.toISOString();

  const threeMonthsLater = new Date(now);
  threeMonthsLater.setMonth(now.getMonth() + 3);
  const defaultEndDate = format(threeMonthsLater, "yyyy-MM-dd'T'23:59:59'Z'");

  // Utiliser les dates fournies ou les dates par défaut
  const fromDate = startDate || defaultStartDate;
  const toDate = endDate || defaultEndDate;

  try {
    // D'abord, récupérer les IDs des practitioners actifs
    const { data: activePractitioners, error: practitionersError } = await supabase
      .from('practitioners')
      .select('id')
      .eq('is_active', true)
      .eq('profile_visible', true);

    if (practitionersError) throw practitionersError;

    // Extraire les IDs
    const activePractitionerIds = activePractitioners?.map(p => p.id) || [];

    // Si aucun practitioner actif, retourner une liste vide
    if (activePractitionerIds.length === 0) {
      return { data: [] };
    }

    // Récupérer tous les rendez-vous disponibles dans la période (uniquement pour les intervenants actifs)
    const { data, error } = await supabase
      .from('appointments')
      .select(`start_time`)
      .is('client_id', null)
      .not('status', 'eq', 'cancelled')
      .eq('service_id', serviceId)
      .in('practitioner_id', activePractitionerIds)
      .gte('start_time', fromDate)
      .lte('start_time', toDate)
      .order('start_time', { ascending: true });
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return { data: [] };
    }
    
    // Grouper par semaine
    const weekMap = new Map();
    
    data.forEach(appointment => {
      const appointmentDate = parseISO(appointment.start_time);
      const weekStart = startOfWeek(appointmentDate, { weekStartsOn: 1 });
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      
      if (!weekMap.has(weekKey)) {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        weekMap.set(weekKey, {
          weekStart: format(weekStart, 'yyyy-MM-dd'),
          weekEnd: format(weekEnd, 'yyyy-MM-dd'),
          displayRange: `${format(weekStart, 'dd/MM')} - ${format(weekEnd, 'dd/MM/yyyy')}`,
        });
      }
    });
    
    // Convertir la Map en tableau
    const availableWeeks = Array.from(weekMap.values());
    
    return { data: availableWeeks };
  } catch (error) {
    logger.error('Erreur dans getAvailableWeeks:', error);
    throw error;
  }
};

/**
 * Annule un rendez-vous réservé et le rend à nouveau disponible
 * @param appointmentId ID du rendez-vous à annuler
 * @param keepRecord Si true, conserve l'historique (statut cancelled), sinon rend le créneau disponible
 * @param userId ID de l'utilisateur qui effectue l'annulation (pour traçabilité)
 */
export const cancelAppointment = async (
  appointmentId: string,
  keepRecord: boolean = false,
  userId?: string,
  userRole?: 'admin' | 'intervenant' | 'client'
) => {
  try {
    // Récupérer d'abord toutes les informations du rendez-vous pour l'email
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select(`
        *,
        client:profiles!client_id(id, first_name, last_name, email, pseudo),
        practitioner:practitioners!practitioner_id(
          id,
          user_id,
          bio,
          priority,
          display_name,
          title,
          profile:profiles!user_id(id, first_name, last_name, email, phone, pseudo)
        ),
        service:services(id, code, name, category, subcategory, price, duration, description)
      `)
      .eq('id', appointmentId)
      .single();

    if (fetchError) throw fetchError;

    // Si le rendez-vous n'existe pas ou n'a pas de client, retourner une erreur
    if (!appointment || !appointment.client_id) {
      return {
        success: false,
        error: new Error('Rendez-vous introuvable ou déjà annulé')
      };
    }

    // Vérifier s'il existe une transaction associée
    const { data: transaction, error: transactionError } = await supabase
      .from('transactions')
      .select('id, status')
      .eq('appointment_id', appointmentId)
      .single();

    // Si une transaction existe et que l'utilisateur n'est pas admin, bloquer l'annulation
    if (transaction && userRole !== 'admin') {
      return {
        success: false,
        error: new Error('Ce rendez-vous a une transaction associée. Seul un administrateur peut l\'annuler. Les intervenants peuvent le déplacer.'),
        canReschedule: userRole === 'intervenant' // Indiquer que l'intervenant peut déplacer
      };
    }
    
    // Déterminer l'action à effectuer en fonction du statut de paiement
    const isPaid = appointment.payment_status === 'paid';
    const wasConfirmed = appointment.status === 'confirmed';

    // Si le rendez-vous a été payé ou si keepRecord est true, juste marquer comme annulé
    if (isPaid || keepRecord) {
      const { data, error } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
          updated_by: userId || null
        })
        .eq('id', appointmentId)
        .select()
        .single();

      if (error) throw error;

      // Réactiver les rendez-vous qui avaient été suspendus par ce rendez-vous
      if (wasConfirmed) {
        reactivateSuspendedAppointments(appointmentId).catch(err =>
          logger.error('Erreur lors de la réactivation des RDV suspendus:', err)
        );
      }

      // Envoyer les emails d'annulation
      sendAppointmentCancellationEmails(appointment).catch(err =>
        logger.error('Erreur lors de l\'envoi des emails d\'annulation:', err)
      );

      // Logger l'annulation
      if (data && appointment.client_id) {
        logActivity({
          userId: appointment.client_id,
          actionType: 'appointment_cancelled',
          actionDescription: 'Rendez-vous annulé (conservé dans l\'historique)',
          entityType: 'appointment',
          entityId: appointmentId,
          metadata: { keepRecord: true, isPaid }
        }).catch(err => logger.warn('Erreur log annulation RDV:', err));
      }

      return {
        success: true,
        data,
        action: 'cancelled',
        message: 'Le rendez-vous a été annulé et marqué comme tel dans l\'historique.'
      };
    } 
    // Sinon, pour un rendez-vous non payé, le rendre à nouveau disponible
    else {
      const clientId = appointment.client_id; // Sauvegarder avant de le mettre à null

      // Réactiver les rendez-vous qui avaient été suspendus par ce rendez-vous (si il était confirmé)
      if (wasConfirmed) {
        reactivateSuspendedAppointments(appointmentId).catch(err =>
          logger.error('Erreur lors de la réactivation des RDV suspendus:', err)
        );
      }

      // Envoyer les emails d'annulation AVANT de supprimer les données du client
      sendAppointmentCancellationEmails(appointment).catch(err =>
        logger.error('Erreur lors de l\'envoi des emails d\'annulation:', err)
      );

      const { data, error } = await supabase
        .from('appointments')
        .update({
          client_id: null,
          status: 'pending',
          payment_status: 'unpaid',
          payment_id: null,
          notes: null,
          beneficiary_first_name: null,
          beneficiary_last_name: null,
          beneficiary_birth_date: null,
          beneficiary_email: null,
          beneficiary_notifications_enabled: false,
          updated_at: new Date().toISOString(),
          updated_by: userId || null
        })
        .eq('id', appointmentId)
        .select()
        .single();

      if (error) throw error;

      // Logger l'annulation
      if (clientId) {
        logActivity({
          userId: clientId,
          actionType: 'appointment_cancelled',
          actionDescription: 'Rendez-vous annulé (créneau libéré)',
          entityType: 'appointment',
          entityId: appointmentId,
          metadata: { keepRecord: false, isPaid: false }
        }).catch(err => logger.warn('Erreur log annulation RDV:', err));
      }

      return {
        success: true,
        data,
        action: 'released',
        message: 'Le rendez-vous a été annulé et est à nouveau disponible pour réservation.'
      };
    }
  } catch (error) {
    logger.error('Erreur dans cancelAppointment:', error);
    return { 
      success: false, 
      error,
      message: 'Une erreur est survenue lors de l\'annulation du rendez-vous.' 
    };
  }
};

/**
 * Met à jour le statut de paiement d'un rendez-vous
 * @param appointmentId ID du rendez-vous
 * @param paymentStatus Nouveau statut de paiement ('unpaid', 'paid', 'refunded')
 * @param paymentId ID de la transaction de paiement (optionnel)
 */
export const updatePaymentStatus = (
  appointmentId: string,
  paymentStatus: 'unpaid' | 'paid' | 'refunded',
  paymentId?: string
) => {
  const updateData: Partial<Appointment> = { 
    payment_status: paymentStatus,
    updated_at: new Date().toISOString()
  };
  
  if (paymentId) {
    updateData.payment_id = paymentId;
  }
  
  return supabase
    .from('appointments')
    .update(updateData)
    .eq('id', appointmentId)
    .select()
    .single();
};

/**
 * Récupérer les rendez-vous d'un client
 * @param clientId ID du client
 * @returns Liste des rendez-vous du client
 */
export const getClientAppointments = (clientId: string) => {
  return supabase
    .from('appointments')
    .select(`
      *,
      practitioner:practitioners!practitioner_id(
        *,
        profile:profiles(*)
      ),
      service:services(*)
    `)
    .eq('client_id', clientId)
    .order('start_time', { ascending: true });
};

/**
 * Supprime automatiquement les rendez-vous passés avec le statut "pending" (disponibles)
 * Ces créneaux non utilisés encombrent inutilement la base de données
 * @param practitionerId ID de l'intervenant (optionnel, sinon nettoie pour tous les intervenants)
 * @returns Nombre de rendez-vous supprimés
 */
export const cleanupPastPendingAppointments = async (
  practitionerId?: string
): Promise<{ deletedCount: number; error?: any }> => {
  try {
    if (!practitionerId) {
      logger.warn('[CLEANUP] practitionerId manquant - impossible de nettoyer');
      return { deletedCount: 0, error: new Error('practitionerId requis') };
    }

    logger.info(`[CLEANUP] Nettoyage des rendez-vous passés pour l'intervenant: ${practitionerId}`);

    // Utiliser la fonction RPC sécurisée pour contourner les politiques RLS
    const { data, error } = await supabase.rpc('cleanup_past_pending_appointments', {
      practitioner_id: practitionerId
    });

    if (error) {
      logger.error('[CLEANUP] Erreur lors du nettoyage via RPC:', error);
      return { deletedCount: 0, error };
    }

    // La fonction RPC retourne un tableau avec une seule ligne contenant deleted_count
    const deletedCount = data && data.length > 0 ? data[0].deleted_count : 0;

    if (deletedCount > 0) {
      logger.info(`[CLEANUP] ${deletedCount} rendez-vous passé(s) disponible(s) supprimé(s) avec succès`);
    } else {
      logger.info('[CLEANUP] Aucun rendez-vous passé disponible à nettoyer');
    }

    return { deletedCount };
  } catch (error) {
    logger.error('[CLEANUP] Exception dans cleanupPastPendingAppointments:', error);
    return { deletedCount: 0, error };
  }
};

/**
 * Marquer un rendez-vous comme terminé (manuellement par l'intervenant)
 * @param appointmentId ID du rendez-vous à marquer comme terminé
 * @param userId ID de l'utilisateur qui effectue l'action
 * @returns Résultat de la mise à jour
 */
export const markAppointmentAsCompleted = async (
  appointmentId: string,
  userId?: string
) => {
  try {
    // Vérifier que le rendez-vous existe et n'est pas déjà terminé ou annulé
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('id, status, start_time, end_time')
      .eq('id', appointmentId)
      .single();

    if (fetchError) throw fetchError;

    if (!appointment) {
      return {
        success: false,
        error: new Error('Rendez-vous introuvable')
      };
    }

    if (appointment.status === 'completed') {
      return {
        success: false,
        error: new Error('Ce rendez-vous est déjà marqué comme terminé')
      };
    }

    if (appointment.status === 'cancelled') {
      return {
        success: false,
        error: new Error('Impossible de marquer un rendez-vous annulé comme terminé')
      };
    }

    // Mettre à jour le statut à 'completed'
    const { data, error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'completed',
        updated_at: new Date().toISOString(),
        updated_by: userId || null
      })
      .eq('id', appointmentId)
      .select(`
        *,
        client:profiles!client_id(*),
        practitioner:practitioners!practitioner_id(
          *,
          profile:profiles(*)
        ),
        service:services(*)
      `)
      .single();

    if (updateError) throw updateError;

    // Logger l'action
    if (data && data.client_id) {
      logActivity({
        userId: data.client_id,
        actionType: 'appointment_completed',
        actionDescription: 'Rendez-vous marqué comme terminé',
        entityType: 'appointment',
        entityId: appointmentId,
        metadata: {
          completed_by: userId,
          completed_at: new Date().toISOString()
        }
      }).catch(err => logger.warn('Erreur log completion RDV:', err));
    }

    return {
      success: true,
      data,
      message: 'Le rendez-vous a été marqué comme terminé.'
    };
  } catch (error) {
    logger.error('Erreur dans markAppointmentAsCompleted:', error);
    return {
      success: false,
      error,
      message: 'Une erreur est survenue lors du marquage du rendez-vous comme terminé.'
    };
  }
};