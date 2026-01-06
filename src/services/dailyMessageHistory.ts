// Service pour gérer l'historique des messages du jour
import { supabase } from './supabase';
import { logger } from '../utils/logger';

export interface DailyMessageHistory {
  id: string;
  beneficiary_id: string;
  daily_draw_id: string;
  nombre: number;
  origine_label: string;
  titre: string;
  message: string;
  rating: number | null;
  user_note: string | null;
  viewed_at: string;
  rated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaveMessageParams {
  beneficiaryId: string;
  dailyDrawId: string;
  nombre: number;
  origineLabel: string;
  titre: string;
  message: string;
}

export interface RateMessageParams {
  messageHistoryId: string;
  rating: number; // 1-5
  userNote?: string;
}

export interface MessageHistoryStats {
  total_messages: number;
  rated_messages: number;
  average_rating: number;
  five_stars_count: number;
  four_stars_count: number;
  three_stars_count: number;
  two_stars_count: number;
  one_star_count: number;
}

/**
 * Enregistre un message du jour dans l'historique du bénéficiaire
 */
export const saveMessageToHistory = async ({
  beneficiaryId,
  dailyDrawId,
  nombre,
  origineLabel,
  titre,
  message
}: SaveMessageParams): Promise<{ data: DailyMessageHistory | null; error: Error | null }> => {
  try {
    // Vérifier si ce message n'a pas déjà été enregistré aujourd'hui
    const today = new Date().toISOString().split('T')[0];

    const { data: existing, error: checkError } = await supabase
      .from('daily_message_history')
      .select('id')
      .eq('beneficiary_id', beneficiaryId)
      .eq('daily_draw_id', dailyDrawId)
      .eq('origine_label', origineLabel)
      .gte('viewed_at', `${today}T00:00:00`)
      .lte('viewed_at', `${today}T23:59:59`)
      .maybeSingle();

    if (checkError) {
      logger.error('[Daily Message History] Erreur vérification doublon:', checkError);
    }

    // Si déjà enregistré aujourd'hui, ne pas réenregistrer
    if (existing) {
      logger.info('[Daily Message History] Message déjà enregistré aujourd\'hui');
      return { data: null, error: null };
    }

    // Enregistrer le nouveau message
    const { data, error } = await supabase
      .from('daily_message_history')
      .insert({
        beneficiary_id: beneficiaryId,
        daily_draw_id: dailyDrawId,
        nombre,
        origine_label: origineLabel,
        titre,
        message,
        viewed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      logger.error('[Daily Message History] Erreur enregistrement:', error);
      return { data: null, error };
    }

    logger.info('[Daily Message History] Message enregistré:', data.id);
    return { data, error: null };

  } catch (err: any) {
    logger.error('[Daily Message History] Exception:', err);
    return { data: null, error: err };
  }
};

/**
 * Noter un message de l'historique
 */
export const rateMessage = async ({
  messageHistoryId,
  rating,
  userNote
}: RateMessageParams): Promise<{ data: DailyMessageHistory | null; error: Error | null }> => {
  try {
    if (rating < 1 || rating > 5) {
      throw new Error('La note doit être entre 1 et 5');
    }

    const updateData: any = {
      rating,
      rated_at: new Date().toISOString()
    };

    if (userNote !== undefined) {
      updateData.user_note = userNote;
    }

    const { data, error } = await supabase
      .from('daily_message_history')
      .update(updateData)
      .eq('id', messageHistoryId)
      .select()
      .single();

    if (error) {
      logger.error('[Daily Message History] Erreur notation:', error);
      return { data: null, error };
    }

    logger.info('[Daily Message History] Message noté:', { id: messageHistoryId, rating });
    return { data, error: null };

  } catch (err: any) {
    logger.error('[Daily Message History] Exception notation:', err);
    return { data: null, error: err };
  }
};

/**
 * Récupérer l'historique des messages d'un bénéficiaire
 */
export const getBeneficiaryMessageHistory = async (
  beneficiaryId: string,
  options?: {
    limit?: number;
    offset?: number;
    rated?: boolean; // true = seulement notés, false = seulement non notés, undefined = tous
    minRating?: number; // Filtrer par note minimale
  }
): Promise<{ data: DailyMessageHistory[]; error: Error | null; count: number }> => {
  try {
    let query = supabase
      .from('daily_message_history')
      .select('*', { count: 'exact' })
      .eq('beneficiary_id', beneficiaryId)
      .order('viewed_at', { ascending: false });

    // Filtres optionnels
    if (options?.rated === true) {
      query = query.not('rating', 'is', null);
    } else if (options?.rated === false) {
      query = query.is('rating', null);
    }

    if (options?.minRating) {
      query = query.gte('rating', options.minRating);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      logger.error('[Daily Message History] Erreur récupération historique:', error);
      return { data: [], error, count: 0 };
    }

    return { data: data || [], error: null, count: count || 0 };

  } catch (err: any) {
    logger.error('[Daily Message History] Exception récupération:', err);
    return { data: [], error: err, count: 0 };
  }
};

/**
 * Récupérer les statistiques de notation d'un bénéficiaire
 */
export const getBeneficiaryRatingStats = async (
  beneficiaryId: string
): Promise<{ data: MessageHistoryStats | null; error: Error | null }> => {
  try {
    const { data, error } = await supabase
      .from('daily_message_rating_stats')
      .select('*')
      .eq('beneficiary_id', beneficiaryId)
      .maybeSingle();

    if (error) {
      logger.error('[Daily Message History] Erreur stats:', error);
      return { data: null, error };
    }

    return { data, error: null };

  } catch (err: any) {
    logger.error('[Daily Message History] Exception stats:', err);
    return { data: null, error: err };
  }
};

/**
 * Supprimer un message de l'historique
 */
export const deleteMessageFromHistory = async (
  messageHistoryId: string
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('daily_message_history')
      .delete()
      .eq('id', messageHistoryId);

    if (error) {
      logger.error('[Daily Message History] Erreur suppression:', error);
      return { success: false, error };
    }

    logger.info('[Daily Message History] Message supprimé:', messageHistoryId);
    return { success: true, error: null };

  } catch (err: any) {
    logger.error('[Daily Message History] Exception suppression:', err);
    return { success: false, error: err };
  }
};

/**
 * Mettre à jour la note personnelle d'un message
 */
export const updateMessageNote = async (
  messageHistoryId: string,
  userNote: string
): Promise<{ success: boolean; error: Error | null }> => {
  try {
    const { error } = await supabase
      .from('daily_message_history')
      .update({ user_note: userNote })
      .eq('id', messageHistoryId);

    if (error) {
      logger.error('[Daily Message History] Erreur mise à jour note:', error);
      return { success: false, error };
    }

    logger.info('[Daily Message History] Note mise à jour:', messageHistoryId);
    return { success: true, error: null };

  } catch (err: any) {
    logger.error('[Daily Message History] Exception mise à jour note:', err);
    return { success: false, error: err };
  }
};

/**
 * Récupérer les messages du jour pour un bénéficiaire
 */
export const getTodayMessages = async (
  beneficiaryId: string
): Promise<{ data: DailyMessageHistory[]; error: Error | null }> => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('daily_message_history')
      .select('*')
      .eq('beneficiary_id', beneficiaryId)
      .gte('viewed_at', `${today}T00:00:00`)
      .lte('viewed_at', `${today}T23:59:59`)
      .order('created_at', { ascending: true });

    if (error) {
      logger.error('[Daily Message History] Erreur récupération messages du jour:', error);
      return { data: [], error };
    }

    logger.info('[Daily Message History] Messages du jour récupérés:', data?.length || 0);
    return { data: data || [], error: null };

  } catch (err: any) {
    logger.error('[Daily Message History] Exception récupération messages du jour:', err);
    return { data: [], error: err };
  }
};
