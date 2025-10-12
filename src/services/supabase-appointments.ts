// src/services/supabase-appointments.ts
import { supabase, Appointment } from './supabase';
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
      .select()
      .single();
    
    if (updateError) throw updateError;
    
    return { success: true, data, error: null };
  } catch (error) {
    console.error('Erreur dans bookAppointment:', error);
    return { success: false, data: null, error };
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
      
      return { 
        success: true, 
        data, 
        action: 'cancelled',
        message: 'Le rendez-vous a été annulé et marqué comme tel dans l\'historique.' 
      };
    } 
    // Sinon, pour un rendez-vous non payé, le rendre à nouveau disponible
    else {
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