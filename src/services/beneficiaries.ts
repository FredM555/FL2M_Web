// src/services/beneficiaries.ts
// Services pour gérer les bénéficiaires avec la nouvelle architecture

import { supabase } from './supabase';
import { logger } from '../utils/logger';

import type {
  Beneficiary,
  BeneficiaryAccess,
  BeneficiaryWithAccess,
  CreateBeneficiaryData,
  UpdateBeneficiaryData,
  ShareBeneficiaryAccessData,
  BeneficiarySearchOptions,
  BeneficiaryStats,
  AppointmentBeneficiary,
  BeneficiaryRoleInAppointment,
  BeneficiaryNote,
  CreateBeneficiaryNoteData,
  UpdateBeneficiaryNoteData,
  BeneficiaryNoteType,
  BeneficiaryDocument,
  CreateBeneficiaryDocumentData,
  UpdateBeneficiaryDocumentData
} from '../types/beneficiary';

// ============================================================================
// GESTION DES BÉNÉFICIAIRES
// ============================================================================

/**
 * Récupérer tous les bénéficiaires accessibles par l'utilisateur courant
 * (propriétaire OU accès partagé)
 */
export const getUserBeneficiaries = async (
  userId?: string
): Promise<{ data: BeneficiaryWithAccess[] | null; error: any }> => {
  try {
    const { data, error } = await supabase.rpc('get_user_beneficiaries', {
      p_user_id: userId || (await supabase.auth.getUser()).data.user?.id
    });

    if (error) throw error;

    // Mapper beneficiary_id vers id si nécessaire (pour compatibilité avec l'ancienne fonction RPC)
    const mappedData = data?.map((item: any) => {
      if (item.beneficiary_id && !item.id) {
        return {
          ...item,
          id: item.beneficiary_id
        };
      }
      return item;
    }) || null;

    return { data: mappedData, error: null };
  } catch (error) {
    logger.error('Erreur lors de la récupération des bénéficiaires:', error);
    return { data: null, error };
  }
};

/**
 * Rechercher des bénéficiaires avec options de filtrage
 */
export const searchBeneficiaries = async (
  options: BeneficiarySearchOptions = {}
): Promise<{ data: Beneficiary[] | null; error: any }> => {
  try {
    let query = supabase
      .from('beneficiaries')
      .select(`
        *,
        owner:profiles!owner_id(id, first_name, last_name, email)
      `);

    // Filtre par terme de recherche
    if (options.search_term) {
      query = query.or(
        `first_name.ilike.%${options.search_term}%,` +
        `last_name.ilike.%${options.search_term}%,` +
        `middle_names.ilike.%${options.search_term}%`
      );
    }

    // Filtre par année de naissance
    if (options.birth_year) {
      const startDate = `${options.birth_year}-01-01`;
      const endDate = `${options.birth_year}-12-31`;
      query = query.gte('birth_date', startDate).lte('birth_date', endDate);
    }

    // Filtre par email
    if (options.has_email !== undefined) {
      if (options.has_email) {
        query = query.not('email', 'is', null);
      } else {
        query = query.is('email', null);
      }
    }

    // Tri
    const orderBy = options.order_by || 'name';
    const direction = options.order_direction || 'asc';

    if (orderBy === 'name') {
      query = query.order('last_name', { ascending: direction === 'asc' });
      query = query.order('first_name', { ascending: direction === 'asc' });
    } else {
      query = query.order(orderBy, { ascending: direction === 'asc' });
    }

    // Pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    logger.error('Erreur lors de la recherche de bénéficiaires:', error);
    return { data: null, error };
  }
};

/**
 * Récupérer un bénéficiaire par ID
 */
export const getBeneficiaryById = async (
  beneficiaryId: string
): Promise<{ data: Beneficiary | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('beneficiaries')
      .select(`
        *,
        owner:profiles!owner_id(id, first_name, last_name, email)
      `)
      .eq('id', beneficiaryId)
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    logger.error('Erreur lors de la récupération du bénéficiaire:', error);
    return { data: null, error };
  }
};

/**
 * Vérifier si un bénéficiaire existe déjà avec la même date de naissance
 */
export const checkDuplicateBeneficiary = async (
  birthDate: string,
  userId?: string
): Promise<{ exists: boolean; beneficiaries: Beneficiary[]; error: any }> => {
  try {
    const currentUserId = userId || (await supabase.auth.getUser()).data.user?.id;

    if (!currentUserId) {
      throw new Error('Utilisateur non authentifié');
    }

    // Rechercher les bénéficiaires du même utilisateur avec la même date de naissance
    const { data, error } = await supabase
      .from('beneficiaries')
      .select('*')
      .eq('owner_id', currentUserId)
      .eq('birth_date', birthDate);

    if (error) throw error;

    return {
      exists: data && data.length > 0,
      beneficiaries: data || [],
      error: null
    };
  } catch (error) {
    logger.error('Erreur lors de la vérification des doublons:', error);
    return { exists: false, beneficiaries: [], error };
  }
};

/**
 * Créer un nouveau bénéficiaire
 */
export const createBeneficiary = async (
  beneficiaryData: CreateBeneficiaryData,
  userId?: string
): Promise<{ data: Beneficiary | null; error: any }> => {
  try {
    const currentUserId = userId || (await supabase.auth.getUser()).data.user?.id;

    if (!currentUserId) {
      throw new Error('Utilisateur non authentifié');
    }

    // Extraire relationship car il n'existe pas dans la table beneficiaries
    // Il sera utilisé uniquement pour beneficiary_access
    const { relationship, ...beneficiaryDataWithoutRelationship } = beneficiaryData;

    const dataToInsert = {
      ...beneficiaryDataWithoutRelationship,
      owner_id: currentUserId,
      created_by: currentUserId,
      updated_by: currentUserId
    };

    logger.debug('[CREATE_BENEFICIARY] Données à insérer:', dataToInsert);

    const { data, error } = await supabase
      .from('beneficiaries')
      .insert([dataToInsert])
      .select()
      .single();

    if (error) {
      logger.error('[CREATE_BENEFICIARY] Erreur Supabase:', error);
      throw error;
    }

    logger.debug('[CREATE_BENEFICIARY] Succès:', data);

    // Créer automatiquement l'accès pour le propriétaire
    // Utiliser le relationship fourni dans les données, sinon détecter automatiquement
    let relationshipToUse = relationship;

    if (!relationshipToUse) {
      // Si pas de relationship fourni, avec la relation "self" si c'est le premier, sinon "other"
      const { hasSelf } = await hasSelfBeneficiary(currentUserId);
      relationshipToUse = hasSelf ? 'other' : 'self';
    }

    logger.debug('[CREATE_BENEFICIARY] Création de l\'accès avec relationship:', relationshipToUse);

    const { error: accessError } = await supabase
      .from('beneficiary_access')
      .insert([{
        beneficiary_id: data.id,
        user_id: currentUserId,
        relationship: relationshipToUse,
        access_level: 'admin',
        can_view: true,
        can_book: true,
        can_edit: true,
        can_share: true,
        granted_by: currentUserId
      }]);

    if (accessError) {
      logger.error('[CREATE_BENEFICIARY] Erreur lors de la création de l\'accès:', accessError);
      // Ne pas échouer complètement, le bénéficiaire est créé
    }

    return { data, error: null };
  } catch (error) {
    logger.error('[CREATE_BENEFICIARY] Erreur globale:', error);
    return { data: null, error };
  }
};

/**
 * Mettre à jour un bénéficiaire
 */
export const updateBeneficiary = async (
  beneficiaryId: string,
  updates: UpdateBeneficiaryData,
  userId?: string
): Promise<{ data: Beneficiary | null; error: any }> => {
  try {
    const currentUserId = userId || (await supabase.auth.getUser()).data.user?.id;

    const { data, error } = await supabase
      .from('beneficiaries')
      .update({
        ...updates,
        updated_by: currentUserId,
        updated_at: new Date().toISOString()
      })
      .eq('id', beneficiaryId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    logger.error('Erreur lors de la mise à jour du bénéficiaire:', error);
    return { data: null, error };
  }
};

/**
 * Vérifier si un bénéficiaire a des rendez-vous actifs (non annulés)
 */
export const checkBeneficiaryHasActiveAppointments = async (
  beneficiaryId: string
): Promise<{ hasActiveAppointments: boolean; count: number; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('appointment_beneficiaries')
      .select('appointment_id, appointments!inner(id, status)')
      .eq('beneficiary_id', beneficiaryId)
      .neq('appointments.status', 'cancelled');

    if (error) throw error;

    const count = data?.length || 0;
    return {
      hasActiveAppointments: count > 0,
      count,
      error: null
    };
  } catch (error) {
    logger.error('Erreur lors de la vérification des rendez-vous actifs:', error);
    return { hasActiveAppointments: false, count: 0, error };
  }
};

/**
 * Récupérer le bénéficiaire principal d'un rendez-vous
 * Utile pour les emails et affichages simplifiés
 */
export const getPrimaryBeneficiaryForAppointment = async (
  appointmentId: string
): Promise<{ data: Beneficiary | null; error: any }> => {
  try {
    const { data: appointmentBeneficiaries, error } = await supabase
      .from('appointment_beneficiaries')
      .select(`
        beneficiary:beneficiaries(*)
      `)
      .eq('appointment_id', appointmentId)
      .order('role_order', { ascending: true })
      .limit(1)
      .single();

    if (error) {
      // Si pas de bénéficiaire trouvé, ce n'est pas une erreur critique
      if (error.code === 'PGRST116') {
        return { data: null, error: null };
      }
      throw error;
    }

    return { data: (appointmentBeneficiaries?.beneficiary as unknown as Beneficiary) || null, error: null };
  } catch (error) {
    logger.error('Erreur lors de la récupération du bénéficiaire principal:', error);
    return { data: null, error };
  }
};

/**
 * Supprimer un bénéficiaire
 * Vérifie d'abord qu'il n'a pas de rendez-vous actifs
 */
export const deleteBeneficiary = async (
  beneficiaryId: string
): Promise<{ success: boolean; error: any }> => {
  try {
    if (!beneficiaryId || beneficiaryId === 'undefined') {
      throw new Error('ID du bénéficiaire invalide');
    }

    // Vérifier les rendez-vous actifs avant suppression
    const { hasActiveAppointments, count } = await checkBeneficiaryHasActiveAppointments(beneficiaryId);

    if (hasActiveAppointments) {
      throw new Error(
        `Impossible de supprimer ce bénéficiaire : il a ${count} rendez-vous actif${count > 1 ? 's' : ''}. ` +
        `Veuillez d'abord annuler tous ses rendez-vous.`
      );
    }

    const { error } = await supabase
      .from('beneficiaries')
      .delete()
      .eq('id', beneficiaryId);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    logger.error('Erreur lors de la suppression du bénéficiaire:', error);
    return { success: false, error };
  }
};

// ============================================================================
// GESTION DES ACCÈS PARTAGÉS
// ============================================================================

/**
 * Récupérer les accès partagés d'un bénéficiaire
 */
export const getBeneficiaryAccess = async (
  beneficiaryId: string
): Promise<{ data: BeneficiaryAccess[] | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('beneficiary_access')
      .select(`
        *,
        user:profiles!user_id(id, first_name, last_name, email)
      `)
      .eq('beneficiary_id', beneficiaryId)
      .order('granted_at', { ascending: false });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    logger.error('Erreur lors de la récupération des accès:', error);
    return { data: null, error };
  }
};

/**
 * Partager l'accès à un bénéficiaire avec un autre utilisateur
 */
export const shareBeneficiaryAccess = async (
  shareData: ShareBeneficiaryAccessData
): Promise<{ data: BeneficiaryAccess | null; error: any }> => {
  try {
    const currentUserId = (await supabase.auth.getUser()).data.user?.id;

    // Trouver l'utilisateur par email
    const { data: targetUser, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', shareData.user_email)
      .single();

    if (userError || !targetUser) {
      throw new Error('Utilisateur non trouvé avec cet email');
    }

    // Créer l'accès
    const { data, error } = await supabase
      .from('beneficiary_access')
      .insert([{
        beneficiary_id: shareData.beneficiary_id,
        user_id: targetUser.id,
        relationship: shareData.relationship,
        access_level: shareData.access_level,
        can_book: shareData.can_book ?? (shareData.access_level !== 'view'),
        can_view: shareData.can_view ?? true,
        can_edit: shareData.can_edit ?? (shareData.access_level === 'edit' || shareData.access_level === 'admin'),
        can_share: shareData.can_share ?? (shareData.access_level === 'admin'),
        notes: shareData.notes,
        expires_at: shareData.expires_at,
        granted_by: currentUserId
      }])
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    logger.error('Erreur lors du partage de l\'accès:', error);
    return { data: null, error };
  }
};

/**
 * Révoquer l'accès d'un utilisateur à un bénéficiaire
 */
export const revokeBeneficiaryAccess = async (
  accessId: string
): Promise<{ success: boolean; error: any }> => {
  try {
    const { error } = await supabase
      .from('beneficiary_access')
      .delete()
      .eq('id', accessId);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    logger.error('Erreur lors de la révocation de l\'accès:', error);
    return { success: false, error };
  }
};

/**
 * Mettre à jour les permissions d'un accès partagé
 */
export const updateBeneficiaryAccess = async (
  accessId: string,
  updates: Partial<BeneficiaryAccess>
): Promise<{ data: BeneficiaryAccess | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('beneficiary_access')
      .update(updates)
      .eq('id', accessId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de l\'accès:', error);
    return { data: null, error };
  }
};

/**
 * Vérifier si l'utilisateur a une permission spécifique sur un bénéficiaire
 */
export const checkBeneficiaryPermission = async (
  beneficiaryId: string,
  permission: 'view' | 'book' | 'edit' | 'admin',
  userId?: string
): Promise<{ hasPermission: boolean; error: any }> => {
  try {
    const currentUserId = userId || (await supabase.auth.getUser()).data.user?.id;

    const { data, error } = await supabase.rpc('check_beneficiary_permission', {
      p_user_id: currentUserId,
      p_beneficiary_id: beneficiaryId,
      p_required_permission: permission
    });

    if (error) throw error;

    return { hasPermission: data, error: null };
  } catch (error) {
    logger.error('Erreur lors de la vérification des permissions:', error);
    return { hasPermission: false, error };
  }
};

// ============================================================================
// GESTION DES RENDEZ-VOUS ET BÉNÉFICIAIRES
// ============================================================================

/**
 * Récupérer les bénéficiaires d'un rendez-vous
 */
export const getAppointmentBeneficiaries = async (
  appointmentId: string
): Promise<{ data: AppointmentBeneficiary[] | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('appointment_beneficiaries')
      .select(`
        *,
        beneficiary:beneficiaries(*)
      `)
      .eq('appointment_id', appointmentId)
      .order('role_order', { ascending: true });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    logger.error('Erreur lors de la récupération des bénéficiaires du RDV:', error);
    return { data: null, error };
  }
};

/**
 * Ajouter un bénéficiaire à un rendez-vous
 */
export const addBeneficiaryToAppointment = async (
  appointmentId: string,
  beneficiaryId: string,
  role: BeneficiaryRoleInAppointment = 'primary',
  roleOrder: number = 1,
  receivesNotifications: boolean = true
): Promise<{ data: AppointmentBeneficiary | null; error: any }> => {
  try {
    // Utiliser upsert pour gérer les doublons
    const { data, error } = await supabase
      .from('appointment_beneficiaries')
      .upsert({
        appointment_id: appointmentId,
        beneficiary_id: beneficiaryId,
        role,
        role_order: roleOrder,
        receives_notifications: receivesNotifications
      }, {
        onConflict: 'appointment_id,beneficiary_id'
      })
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    logger.error('Erreur lors de l\'ajout du bénéficiaire au RDV:', error);
    return { data: null, error };
  }
};

/**
 * Retirer un bénéficiaire d'un rendez-vous
 */
export const removeBeneficiaryFromAppointment = async (
  appointmentId: string,
  beneficiaryId: string
): Promise<{ success: boolean; error: any }> => {
  try {
    const { error } = await supabase
      .from('appointment_beneficiaries')
      .delete()
      .eq('appointment_id', appointmentId)
      .eq('beneficiary_id', beneficiaryId);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    logger.error('Erreur lors du retrait du bénéficiaire du RDV:', error);
    return { success: false, error };
  }
};

/**
 * Mettre à jour les bénéficiaires d'un rendez-vous
 * (remplace tous les bénéficiaires existants)
 */
export const updateAppointmentBeneficiaries = async (
  appointmentId: string,
  beneficiaries: Array<{
    beneficiary_id: string;
    role?: BeneficiaryRoleInAppointment;
    role_order?: number;
    receives_notifications?: boolean;
  }>
): Promise<{ success: boolean; error: any }> => {
  try {
    // Supprimer les liens existants
    await supabase
      .from('appointment_beneficiaries')
      .delete()
      .eq('appointment_id', appointmentId);

    // Insérer les nouveaux liens
    if (beneficiaries.length > 0) {
      const { error } = await supabase
        .from('appointment_beneficiaries')
        .insert(
          beneficiaries.map((b, index) => ({
            appointment_id: appointmentId,
            beneficiary_id: b.beneficiary_id,
            role: b.role || 'primary',
            role_order: b.role_order ?? index + 1,
            receives_notifications: b.receives_notifications ?? true
          }))
        );

      if (error) throw error;
    }

    return { success: true, error: null };
  } catch (error) {
    logger.error('Erreur lors de la mise à jour des bénéficiaires du RDV:', error);
    return { success: false, error };
  }
};

// ============================================================================
// STATISTIQUES ET RAPPORTS
// ============================================================================

/**
 * Récupérer les statistiques d'un bénéficiaire
 */
export const getBeneficiaryStats = async (
  beneficiaryId: string
): Promise<{ data: BeneficiaryStats | null; error: any }> => {
  try {
    const { data: appointments, error } = await supabase
      .from('appointment_beneficiaries')
      .select(`
        id,
        appointment:appointments(
          id,
          status,
          start_time,
          practitioner_id,
          service_id
        )
      `)
      .eq('beneficiary_id', beneficiaryId);

    if (error) throw error;

    // Calculer les statistiques
    const stats: BeneficiaryStats = {
      beneficiary_id: beneficiaryId,
      total_appointments: appointments?.length || 0,
      completed_appointments: 0,
      upcoming_appointments: 0,
      cancelled_appointments: 0,
      practitioners_count: 0,
      services_count: 0,
      first_appointment_date: null,
      last_appointment_date: null
    };

    if (appointments && appointments.length > 0) {
      const now = new Date();
      const practitionerIds = new Set<string>();
      const serviceIds = new Set<string>();
      const dates: Date[] = [];

      appointments.forEach(ab => {
        const appt = ab.appointment as any;
        if (!appt) return;

        // Statut
        if (appt.status === 'completed') stats.completed_appointments++;
        else if (appt.status === 'cancelled') stats.cancelled_appointments++;
        else if (new Date(appt.start_time) > now) stats.upcoming_appointments++;

        // Intervenants et services uniques
        if (appt.practitioner_id) practitionerIds.add(appt.practitioner_id);
        if (appt.service_id) serviceIds.add(appt.service_id);

        // Dates
        dates.push(new Date(appt.start_time));
      });

      stats.practitioners_count = practitionerIds.size;
      stats.services_count = serviceIds.size;

      if (dates.length > 0) {
        dates.sort((a, b) => a.getTime() - b.getTime());
        stats.first_appointment_date = dates[0].toISOString();
        stats.last_appointment_date = dates[dates.length - 1].toISOString();
      }
    }

    return { data: stats, error: null };
  } catch (error) {
    logger.error('Erreur lors du calcul des statistiques:', error);
    return { data: null, error };
  }
};

/**
 * Récupérer l'historique des rendez-vous d'un bénéficiaire
 */
export const getBeneficiaryAppointmentHistory = async (
  beneficiaryId: string,
  options: {
    limit?: number;
    offset?: number;
    include_cancelled?: boolean;
  } = {}
): Promise<{ data: any[] | null; error: any }> => {
  try {
    let query = supabase
      .from('appointment_beneficiaries')
      .select(`
        *,
        appointment:appointments(
          *,
          practitioner:practitioners(
            *,
            profile:profiles(*)
          ),
          service:services(*)
        )
      `)
      .eq('beneficiary_id', beneficiaryId);

    if (!options.include_cancelled) {
      query = query.neq('appointment.status', 'cancelled');
    }

    query = query.order('appointment(start_time)', { ascending: false });

    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    logger.error('Erreur lors de la récupération de l\'historique:', error);
    return { data: null, error };
  }
};

// ============================================================================
// CONFIRMATION DES DONNÉES BÉNÉFICIAIRE
// ============================================================================

/**
 * Vérifier si un bénéficiaire peut être modifié
 */
export const canModifyBeneficiaryIdentity = async (
  beneficiaryId: string
): Promise<{ canModify: boolean; error: any }> => {
  try {
    const { data, error } = await supabase.rpc('can_modify_beneficiary_identity', {
      p_beneficiary_id: beneficiaryId
    });

    if (error) throw error;

    return { canModify: data, error: null };
  } catch (error) {
    logger.error('Erreur lors de la vérification de modification:', error);
    return { canModify: false, error };
  }
};

/**
 * Confirmer les données d'un bénéficiaire pour un rendez-vous
 */
export const confirmBeneficiaryData = async (
  appointmentId: string,
  beneficiaryId: string,
  confirmedBy?: string
): Promise<{ data: any | null; error: any }> => {
  try {
    const { data, error } = await supabase.rpc('confirm_beneficiary_data', {
      p_appointment_id: appointmentId,
      p_beneficiary_id: beneficiaryId,
      p_confirmed_by: confirmedBy
    });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    logger.error('Erreur lors de la confirmation des données:', error);
    return { data: null, error };
  }
};

/**
 * Déclencher la confirmation automatique des rendez-vous dans les 72h
 * (Cette fonction est normalement appelée par un cron job)
 */
export const autoConfirmBeneficiaryData = async (): Promise<{ data: any[] | null; error: any }> => {
  try {
    const { data, error } = await supabase.rpc('auto_confirm_beneficiary_data_before_appointment');

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    logger.error('Erreur lors de la confirmation automatique:', error);
    return { data: null, error };
  }
};

/**
 * Vérifier si l'utilisateur a déjà un bénéficiaire "self" (moi-même)
 */
export const hasSelfBeneficiary = async (
  userId?: string
): Promise<{ hasSelf: boolean; error: any }> => {
  try {
    const currentUserId = userId || (await supabase.auth.getUser()).data.user?.id;

    if (!currentUserId) {
      throw new Error('Utilisateur non authentifié');
    }

    const { data, error } = await supabase
      .from('beneficiary_access')
      .select('beneficiary_id')
      .eq('user_id', currentUserId)
      .eq('relationship', 'self')
      .limit(1);

    if (error) throw error;

    return { hasSelf: (data && data.length > 0), error: null };
  } catch (error) {
    logger.error('Erreur lors de la vérification du bénéficiaire self:', error);
    return { hasSelf: false, error };
  }
};

/**
 * Mettre à jour la relation dans beneficiary_access
 */
export const updateBeneficiaryRelationship = async (
  beneficiaryId: string,
  relationship: string,
  userId?: string
): Promise<{ error: any }> => {
  try {
    const currentUserId = userId || (await supabase.auth.getUser()).data.user?.id;

    if (!currentUserId) {
      throw new Error('Utilisateur non authentifié');
    }

    const { error } = await supabase
      .from('beneficiary_access')
      .update({ relationship })
      .eq('beneficiary_id', beneficiaryId)
      .eq('user_id', currentUserId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de la relation:', error);
    return { error };
  }
};

// ============================================================================
// ORDRE D'AFFICHAGE
// ============================================================================

/**
 * Mettre à jour l'ordre d'affichage des bénéficiaires pour l'utilisateur courant
 */
export const updateBeneficiariesDisplayOrder = async (
  beneficiaryOrders: Array<{ id: string; order: number }>,
  userId?: string
): Promise<{ success: boolean; error: any }> => {
  try {
    const currentUserId = userId || (await supabase.auth.getUser()).data.user?.id;

    if (!currentUserId) {
      throw new Error('Utilisateur non authentifié');
    }

    const { error } = await supabase.rpc('update_beneficiary_display_order', {
      p_user_id: currentUserId,
      p_beneficiary_orders: beneficiaryOrders
    });

    if (error) throw error;

    return { success: true, error: null };
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de l\'ordre d\'affichage:', error);
    return { success: false, error };
  }
};

// ============================================================================
// GESTION DES NOTES SUR LES BÉNÉFICIAIRES
// ============================================================================

/**
 * Récupérer les notes d'un bénéficiaire
 * Les intervenants voient leurs notes privées + toutes les notes publiques
 * Les admins voient toutes les notes
 */
export const getBeneficiaryNotes = async (
  beneficiaryId: string,
  practitionerId?: string
): Promise<{ data: BeneficiaryNote[] | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('beneficiary_notes')
      .select(`
        *,
        practitioner:practitioners(
          id,
          display_name,
          profile:profiles(first_name, last_name, pseudo)
        )
      `)
      .eq('beneficiary_id', beneficiaryId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    logger.error('Erreur lors de la récupération des notes:', error);
    return { data: null, error };
  }
};

/**
 * Créer une note sur un bénéficiaire
 */
export const createBeneficiaryNote = async (
  noteData: CreateBeneficiaryNoteData
): Promise<{ data: BeneficiaryNote | null; error: any }> => {
  try {
    const currentUserId = (await supabase.auth.getUser()).data.user?.id;

    const insertData: any = {
      beneficiary_id: noteData.beneficiary_id,
      note_type: noteData.note_type,
      content: noteData.content,
      created_by: currentUserId
    };

    // Ajouter practitioner_id pour les notes practitioner et shared
    if (noteData.note_type === 'practitioner' || noteData.note_type === 'shared') {
      if (!noteData.practitioner_id) {
        throw new Error('practitioner_id est requis pour les notes de type practitioner ou shared');
      }
      insertData.practitioner_id = noteData.practitioner_id;
    }

    // Ajouter user_id pour les notes user
    if (noteData.note_type === 'user') {
      insertData.user_id = noteData.user_id || currentUserId;
    }

    const { data, error } = await supabase
      .from('beneficiary_notes')
      .insert(insertData)
      .select(`
        *,
        practitioner:practitioners(
          id,
          display_name,
          profile:profiles(first_name, last_name, pseudo)
        ),
        user:profiles!user_id(id, email, first_name, last_name)
      `)
      .single();

    if (error) throw error;

    logger.debug('Note créée avec succès:', data);
    return { data, error: null };
  } catch (error) {
    logger.error('Erreur lors de la création de la note:', error);
    return { data: null, error };
  }
};

/**
 * Mettre à jour une note
 */
export const updateBeneficiaryNote = async (
  noteId: string,
  noteData: UpdateBeneficiaryNoteData
): Promise<{ data: BeneficiaryNote | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('beneficiary_notes')
      .update(noteData)
      .eq('id', noteId)
      .select(`
        *,
        practitioner:practitioners(
          id,
          display_name,
          profile:profiles(first_name, last_name, pseudo)
        )
      `)
      .single();

    if (error) throw error;

    logger.debug('Note mise à jour avec succès:', data);
    return { data, error: null };
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de la note:', error);
    return { data: null, error };
  }
};

/**
 * Supprimer une note
 */
export const deleteBeneficiaryNote = async (
  noteId: string
): Promise<{ success: boolean; error: any }> => {
  try {
    const { error } = await supabase
      .from('beneficiary_notes')
      .delete()
      .eq('id', noteId);

    if (error) throw error;

    logger.debug('Note supprimée avec succès');
    return { success: true, error: null };
  } catch (error) {
    logger.error('Erreur lors de la suppression de la note:', error);
    return { success: false, error };
  }
};

// ============================================================================
// GESTION DES DOCUMENTS DES BÉNÉFICIAIRES
// ============================================================================

/**
 * Récupérer les documents d'un bénéficiaire
 */
export const getBeneficiaryDocuments = async (
  beneficiaryId: string
): Promise<{ data: BeneficiaryDocument[] | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('beneficiary_documents')
      .select(`
        *,
        practitioner:practitioners(
          id,
          display_name,
          profile:profiles(first_name, last_name, pseudo)
        ),
        appointment:appointments(
          id,
          start_time,
          service:services(name)
        )
      `)
      .eq('beneficiary_id', beneficiaryId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    logger.error('Erreur lors de la récupération des documents:', error);
    return { data: null, error };
  }
};

/**
 * Créer un document pour un bénéficiaire
 */
export const createBeneficiaryDocument = async (
  documentData: CreateBeneficiaryDocumentData
): Promise<{ data: BeneficiaryDocument | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('beneficiary_documents')
      .insert({
        ...documentData,
        created_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select(`
        *,
        practitioner:practitioners(
          id,
          display_name,
          profile:profiles(first_name, last_name, pseudo)
        ),
        appointment:appointments(
          id,
          start_time,
          service:services(name)
        )
      `)
      .single();

    if (error) throw error;

    logger.debug('Document créé avec succès:', data);
    return { data, error: null };
  } catch (error) {
    logger.error('Erreur lors de la création du document:', error);
    return { data: null, error };
  }
};

/**
 * Mettre à jour un document
 */
export const updateBeneficiaryDocument = async (
  documentId: string,
  documentData: UpdateBeneficiaryDocumentData
): Promise<{ data: BeneficiaryDocument | null; error: any }> => {
  try {
    const { data, error } = await supabase
      .from('beneficiary_documents')
      .update(documentData)
      .eq('id', documentId)
      .select(`
        *,
        practitioner:practitioners(
          id,
          display_name,
          profile:profiles(first_name, last_name, pseudo)
        ),
        appointment:appointments(
          id,
          start_time,
          service:services(name)
        )
      `)
      .single();

    if (error) throw error;

    logger.debug('Document mis à jour avec succès:', data);
    return { data, error: null };
  } catch (error) {
    logger.error('Erreur lors de la mise à jour du document:', error);
    return { data: null, error };
  }
};

/**
 * Supprimer un document
 */
export const deleteBeneficiaryDocument = async (
  documentId: string
): Promise<{ success: boolean; error: any }> => {
  try {
    const { error } = await supabase
      .from('beneficiary_documents')
      .delete()
      .eq('id', documentId);

    if (error) throw error;

    logger.debug('Document supprimé avec succès');
    return { success: true, error: null };
  } catch (error) {
    logger.error('Erreur lors de la suppression du document:', error);
    return { success: false, error };
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // CRUD Bénéficiaires
  getUserBeneficiaries,
  searchBeneficiaries,
  getBeneficiaryById,
  createBeneficiary,
  updateBeneficiary,
  deleteBeneficiary,

  // Accès partagés
  getBeneficiaryAccess,
  shareBeneficiaryAccess,
  revokeBeneficiaryAccess,
  updateBeneficiaryAccess,
  checkBeneficiaryPermission,

  // Rendez-vous
  getAppointmentBeneficiaries,
  addBeneficiaryToAppointment,
  removeBeneficiaryFromAppointment,
  updateAppointmentBeneficiaries,

  // Statistiques
  getBeneficiaryStats,
  getBeneficiaryAppointmentHistory,

  // Confirmation des données
  canModifyBeneficiaryIdentity,
  confirmBeneficiaryData,
  autoConfirmBeneficiaryData,

  // Relation
  hasSelfBeneficiary,

  // Ordre d'affichage
  updateBeneficiariesDisplayOrder,

  // Notes
  getBeneficiaryNotes,
  createBeneficiaryNote,
  updateBeneficiaryNote,
  deleteBeneficiaryNote,

  // Documents
  getBeneficiaryDocuments,
  createBeneficiaryDocument,
  updateBeneficiaryDocument,
  deleteBeneficiaryDocument
};
