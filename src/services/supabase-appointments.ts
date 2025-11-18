// src/services/supabase-appointments.ts
import { supabase, Appointment, logActivity } from './supabase';
import { startOfWeek, endOfWeek, format, parseISO } from 'date-fns';

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
 * Récupérer les intervenants disponibles
 * @returns Liste des intervenants avec leurs profils
 */
export const getPractitioners = () => {
  return supabase
    .from('practitioners')
    .select(`
      *,
      profile:profiles(*)
    `)
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

    // Envoyer les emails de confirmation
    if (data) {
      sendAppointmentConfirmationEmails(data).catch(err =>
        console.error('Erreur lors de l\'envoi des emails de confirmation:', err)
      );
    }

    return { success: true, data, error: null };
  } catch (error) {
    console.error('Erreur dans bookAppointment:', error);
    return { success: false, data: null, error };
  }
};

/**
 * Envoie les emails de confirmation de rendez-vous au client et au bénéficiaire
 * @param appointment Le rendez-vous confirmé avec toutes les informations
 */
const sendAppointmentConfirmationEmails = async (appointment: any) => {
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

    // Fonction pour obtenir le nom d'affichage de l'intervenant
    const getPractitionerDisplayName = () => {
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

    const emailHtml = (recipientFirstName: string, recipientLastName: string) => `
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
            <p>Bonjour ${recipientFirstName} ${recipientLastName},</p>

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
                <span>${getPractitionerDisplayName()}</span>
              </div>
              ` : ''}

              ${appointment.beneficiary_first_name ? `
              <div class="info-row">
                <span class="label">Bénéficiaire :</span>
                <span>${appointment.beneficiary_first_name} ${appointment.beneficiary_last_name}</span>
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
              Merci de vous présenter 5 minutes avant l'heure du rendez-vous
            </div>

            <p>Si vous avez besoin de modifier ou d'annuler ce rendez-vous, merci de nous contacter au plus tôt.</p>

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
          subject: `Confirmation de votre rendez-vous - ${appointment.service?.name || 'FL²M Services'}`,
          html: emailHtml(appointment.client.first_name, appointment.client.last_name),
          appointmentId: appointment.id,
          emailType: 'confirmation'
        }
      });
    }

    // Envoyer l'email au bénéficiaire si différent du client et si email renseigné
    if (appointment.beneficiary_email &&
        appointment.beneficiary_email !== appointment.client?.email &&
        appointment.beneficiary_notifications_enabled) {
      await supabase.functions.invoke('send-email', {
        body: {
          to: appointment.beneficiary_email,
          subject: `Confirmation de votre rendez-vous - ${appointment.service?.name || 'FL²M Services'}`,
          html: emailHtml(appointment.beneficiary_first_name, appointment.beneficiary_last_name),
          appointmentId: appointment.id,
          emailType: 'confirmation'
        }
      });
    }

    console.log('Emails de confirmation envoyés avec succès');
  } catch (error) {
    console.error('Erreur lors de l\'envoi des emails de confirmation:', error);
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
export const getAvailableAppointments = (
  startDate: string,
  endDate: string,
  serviceId: string,
  practitionerId?: string
) => {
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
    .gte('start_time', startDate)
    .lte('start_time', endDate)
    .not('status', 'eq', 'cancelled')
    .eq('service_id', serviceId);
  
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
export const getAvailableAppointmentsByWeek = (
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
  
  return getAvailableAppointments(startWeekDate, endWeekDate, serviceId, practitionerId);
};

/**
 * Récupérer les créneaux disponibles pour un mois donné
 * @param yearMonth Année et mois au format 'YYYY-MM'
 * @param serviceId ID du service
 * @param practitionerId ID de l'intervenant (optionnel)
 * @returns Liste des créneaux disponibles pour ce mois
 */
export const getAvailableAppointmentsByMonth = (
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
  
  return getAvailableAppointments(startMonthDate, endMonthDate, serviceId, practitionerId);
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
  const today = new Date();
  const defaultStartDate = format(today, "yyyy-MM-dd'T'00:00:00'Z'");
  
  const threeMonthsLater = new Date(today);
  threeMonthsLater.setMonth(today.getMonth() + 3);
  const defaultEndDate = format(threeMonthsLater, "yyyy-MM-dd'T'23:59:59'Z'");
  
  // Utiliser les dates fournies ou les dates par défaut
  const fromDate = startDate || defaultStartDate;
  const toDate = endDate || defaultEndDate;
  
  try {
    // Récupérer tous les rendez-vous disponibles dans la période
    const { data, error } = await supabase
      .from('appointments')
      .select(`start_time`)
      .is('client_id', null)
      .not('status', 'eq', 'cancelled')
      .eq('service_id', serviceId)
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
    console.error('Erreur dans getAvailableWeeks:', error);
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
  userId?: string
) => {
  try {
    // Récupérer d'abord l'état actuel du rendez-vous
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('payment_status, client_id')
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
    
    // Déterminer l'action à effectuer en fonction du statut de paiement
    const isPaid = appointment.payment_status === 'paid';
    
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

      // Logger l'annulation
      if (data && appointment.client_id) {
        logActivity({
          userId: appointment.client_id,
          actionType: 'appointment_cancelled',
          actionDescription: 'Rendez-vous annulé (conservé dans l\'historique)',
          entityType: 'appointment',
          entityId: appointmentId,
          metadata: { keepRecord: true, isPaid }
        }).catch(err => console.warn('Erreur log annulation RDV:', err));
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
        }).catch(err => console.warn('Erreur log annulation RDV:', err));
      }

      return {
        success: true,
        data,
        action: 'released',
        message: 'Le rendez-vous a été annulé et est à nouveau disponible pour réservation.'
      };
    }
  } catch (error) {
    console.error('Erreur dans cancelAppointment:', error);
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