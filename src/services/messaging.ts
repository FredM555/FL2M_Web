// src/services/messaging.ts
import { supabase } from './supabase';
import { logger } from '../utils/logger';
import {
  Message,
  MessageThread,
  CreateMessageData,
  CreateThreadData
} from '../types/messaging';

/**
 * Créer un nouveau thread de messages (conversation)
 */
export async function createMessageThread(data: CreateThreadData) {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      user_id: userId || null,
      first_name: data.first_name || null,
      last_name: data.last_name || null,
      email: data.email || null,
      phone: data.phone || null,
      subject: data.subject,
      message: data.message,
      category: data.category,
      sender_type: userId ? 'user' : 'public',
      reference_type: data.reference_type || null,
      reference_id: data.reference_id || null,
      status: 'new',
      read_by_user: userId ? true : false, // L'expéditeur a déjà "lu" son propre message
      read_by_admin: false
    })
    .select()
    .single();

  if (error) {
    logger.error('Erreur création thread:', error);
    return { data: null, error };
  }

  return { data: message, error: null };
}

/**
 * Répondre à un message (créer un message dans le thread)
 */
export async function replyToMessage(data: CreateMessageData) {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  if (!userId) {
    return { data: null, error: 'Non authentifié' };
  }

  const { data: message, error } = await supabase
    .from('messages')
    .insert({
      thread_id: data.thread_id,
      parent_id: data.parent_id || data.thread_id, // Si pas de parent_id, répondre au message principal
      user_id: userId,
      subject: null, // Les réponses n'ont pas de sujet
      message: data.message,
      sender_type: data.sender_type || 'user',
      read_by_user: data.sender_type === 'user',
      read_by_admin: data.sender_type === 'admin'
    })
    .select()
    .single();

  if (error) {
    logger.error('Erreur création réponse:', error);
    return { data: null, error };
  }

  return { data: message, error: null };
}

/**
 * Récupérer tous les threads de messages d'un utilisateur
 * @param userId - ID de l'utilisateur
 * @param personalOnly - Si true, affiche uniquement les messages personnels (user_id = userId)
 *                       Si false, affiche tous les messages si admin/intervenant
 */
export async function getUserMessageThreads(userId: string, personalOnly: boolean = false) {
  // Récupérer le profil pour déterminer si c'est un admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', userId)
    .single();

  const isAdmin = profile?.user_type === 'admin' || profile?.user_type === 'intervenant';

  let query = supabase
    .from('message_threads')
    .select('*');

  // Si personalOnly = true OU si c'est un client, filtrer par user_id
  // Si personalOnly = false ET admin/intervenant, afficher tous les threads
  if (personalOnly || !isAdmin) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query
    .order('last_message_at', { ascending: false });

  if (error) {
    logger.error('Erreur récupération threads:', error);
    return { data: null, error };
  }

  return { data: data as MessageThread[], error: null };
}

/**
 * Récupérer tous les messages d'un thread
 */
export async function getThreadMessages(threadId: string) {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:profiles(first_name, last_name, email, user_type)
    `)
    .eq('thread_id', threadId)
    .order('created_at', { ascending: true });

  if (error) {
    logger.error('Erreur récupération messages:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Récupérer un thread par son ID
 */
export async function getMessageThread(threadId: string) {
  const { data, error } = await supabase
    .from('message_threads')
    .select('*')
    .eq('thread_id', threadId)
    .single();

  if (error) {
    logger.error('Erreur récupération thread:', error);
    return { data: null, error };
  }

  return { data: data as MessageThread, error: null };
}

/**
 * Marquer les messages d'un thread comme lus
 */
export async function markThreadAsRead(threadId: string, isAdmin: boolean = false) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    return { error: 'Non authentifié' };
  }

  const updateField = isAdmin ? 'read_by_admin' : 'read_by_user';
  const senderTypeFilter = isAdmin ? ['user', 'public'] : ['admin', 'system'];

  const { error } = await supabase
    .from('messages')
    .update({
      [updateField]: true,
      read_at: new Date().toISOString()
    })
    .eq('thread_id', threadId)
    .in('sender_type', senderTypeFilter)
    .eq(updateField, false);

  if (error) {
    logger.error('Erreur marquage messages lus:', error);
    return { error };
  }

  return { error: null };
}

/**
 * Fermer un thread de messages
 */
export async function closeMessageThread(threadId: string) {
  // Le message principal a id = thread_id et parent_id IS NULL
  const { data, error } = await supabase
    .from('messages')
    .update({ status: 'closed' })
    .eq('id', threadId)
    .is('parent_id', null) // Seulement le message principal
    .select()
    .single();

  if (error) {
    logger.error('Erreur fermeture thread:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Rouvrir un thread de messages
 */
export async function reopenMessageThread(threadId: string) {
  // Le message principal a id = thread_id et parent_id IS NULL
  const { data, error } = await supabase
    .from('messages')
    .update({ status: 'new' }) // Rouvrir en tant que nouveau message
    .eq('id', threadId)
    .is('parent_id', null)
    .select()
    .single();

  if (error) {
    logger.error('Erreur réouverture thread:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Compter le nombre total de messages non lus pour un utilisateur
 */
export async function getUnreadMessageCount(userId: string) {
  const { data, error } = await supabase
    .rpc('count_unread_messages', { p_user_id: userId });

  if (error) {
    logger.error('Erreur comptage messages non lus:', error);
    return { count: 0, error };
  }

  return { count: data || 0, error: null };
}

/**
 * Compter le nombre de threads avec messages non lus
 */
export async function getUnreadThreadCount(userId: string) {
  const { data, error } = await supabase
    .rpc('count_unread_threads', { p_user_id: userId });

  if (error) {
    logger.error('Erreur comptage threads non lus:', error);
    return { count: 0, error };
  }

  return { count: data || 0, error: null };
}

/**
 * Créer un thread pour une demande d'intervenant
 */
export async function createPractitionerRequestThread(
  userId: string,
  requestId: string,
  userName: string,
  userEmail: string
) {
  return createMessageThread({
    subject: `Demande d'intervenant - ${userName}`,
    message: `Bonjour,\n\nJe souhaite devenir intervenant sur FL2M Services.\n\nMa demande a été soumise et est en cours de traitement.\n\nCordialement,\n${userName}`,
    category: 'practitioner_request',
    reference_type: 'practitioner_request',
    reference_id: requestId,
    email: userEmail,
    first_name: userName.split(' ')[0],
    last_name: userName.split(' ').slice(1).join(' ')
  });
}

/**
 * Envoyer un message système dans un thread
 */
export async function sendSystemMessage(
  threadId: string,
  message: string,
  parentId?: string
) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      thread_id: threadId,
      parent_id: parentId || null,
      user_id: null,
      message,
      sender_type: 'system',
      read_by_user: false,
      read_by_admin: true
    })
    .select()
    .single();

  if (error) {
    logger.error('Erreur envoi message système:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

// ============================================================================
// FONCTIONS SPÉCIFIQUES POUR LES MESSAGES DE RENDEZ-VOUS
// ============================================================================

/**
 * Créer un message lié à un rendez-vous
 */
export async function createAppointmentMessage(
  appointmentId: string,
  message: string,
  senderType?: 'user' | 'admin' | 'system'
) {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  if (!userId && senderType !== 'system') {
    return { data: null, error: 'Non authentifié' };
  }

  // Déterminer le sender_type
  let actualSenderType = senderType;
  if (!actualSenderType) {
    // Par défaut, si pas de senderType spécifié, déterminer selon le profil
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('id', userId)
      .single();

    actualSenderType = profile?.user_type === 'admin' || profile?.user_type === 'intervenant'
      ? 'admin'
      : 'user';
  }

  // Chercher si un thread existe déjà pour ce RDV
  const { data: existingThread } = await supabase
    .from('messages')
    .select('thread_id, id')
    .eq('reference_type', 'appointment')
    .eq('reference_id', appointmentId)
    .is('parent_id', null)
    .single();

  let threadId: string;
  let parentId: string | null = null;

  if (existingThread) {
    // Thread existe, on répond dedans
    threadId = existingThread.thread_id || existingThread.id;
    parentId = existingThread.id;
  } else {
    // Créer le thread initial
    const { data: appointment } = await supabase
      .from('appointments')
      .select('id, service:services(name)')
      .eq('id', appointmentId)
      .single();

    const serviceName = (appointment?.service as any)?.name || null;
    const subject = serviceName
      ? `Rendez-vous - ${serviceName}`
      : 'Rendez-vous';

    const { data: newThread, error: threadError } = await supabase
      .from('messages')
      .insert({
        user_id: userId,
        subject,
        message,
        category: 'appointment',
        sender_type: actualSenderType,
        reference_type: 'appointment',
        reference_id: appointmentId,
        status: 'new',
        read_by_user: actualSenderType === 'user',
        read_by_admin: actualSenderType === 'admin' || actualSenderType === 'system'
      })
      .select()
      .single();

    if (threadError) {
      logger.error('Erreur création thread rendez-vous:', threadError);
      return { data: null, error: threadError };
    }

    return { data: newThread, error: null };
  }

  // Ajouter une réponse au thread existant
  const { data: newMessage, error } = await supabase
    .from('messages')
    .insert({
      thread_id: threadId,
      parent_id: parentId,
      user_id: userId,
      message,
      category: 'appointment',
      sender_type: actualSenderType,
      reference_type: 'appointment',
      reference_id: appointmentId,
      read_by_user: actualSenderType === 'user',
      read_by_admin: actualSenderType === 'admin' || actualSenderType === 'system'
    })
    .select()
    .single();

  if (error) {
    logger.error('Erreur création message rendez-vous:', error);
    return { data: null, error };
  }

  return { data: newMessage, error: null };
}

/**
 * Récupérer tous les messages d'un rendez-vous
 */
export async function getAppointmentMessages(appointmentId: string) {
  const { data: { session } } = await supabase.auth.getSession();

  logger.debug('[getAppointmentMessages] Récupération messages pour RDV:', {
    appointmentId,
    userId: session?.user?.id
  });

  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:user_id(first_name, last_name, email)
    `)
    .eq('reference_type', 'appointment')
    .eq('reference_id', appointmentId)
    .order('created_at', { ascending: true });

  if (error) {
    logger.error('[getAppointmentMessages] Erreur récupération messages rendez-vous:', error);
    return { data: null, error };
  }

  logger.debug('[getAppointmentMessages] Messages récupérés:', {
    count: data?.length || 0,
    messages: data
  });

  return { data, error: null };
}

/**
 * Compter les messages non lus d'un rendez-vous pour un utilisateur
 */
export async function countUnreadAppointmentMessages(
  appointmentId: string,
  userType: 'client' | 'practitioner'
) {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  if (!userId) {
    return { count: 0, error: 'Non authentifié' };
  }

  const { data, error } = await supabase.rpc(
    'count_unread_appointment_messages',
    {
      p_appointment_id: appointmentId,
      p_user_id: userId,
      p_user_type: userType
    }
  );

  if (error) {
    logger.error('Erreur comptage messages non lus rendez-vous:', error);
    return { count: 0, error };
  }

  return { count: data || 0, error: null };
}

/**
 * Marquer les messages d'un rendez-vous comme lus
 */
export async function markAppointmentMessagesAsRead(
  appointmentId: string,
  isAdmin: boolean = false
) {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.user) {
    return { error: 'Non authentifié' };
  }

  const updateField = isAdmin ? 'read_by_admin' : 'read_by_user';
  const senderTypeFilter = isAdmin ? ['user'] : ['admin', 'system'];

  const { error } = await supabase
    .from('messages')
    .update({
      [updateField]: true,
      read_at: new Date().toISOString()
    })
    .eq('reference_type', 'appointment')
    .eq('reference_id', appointmentId)
    .in('sender_type', senderTypeFilter)
    .eq(updateField, false);

  if (error) {
    logger.error('Erreur marquage messages rendez-vous lus:', error);
    return { error };
  }

  return { error: null };
}

/**
 * Récupérer la liste des rendez-vous avec messages non lus pour un utilisateur
 */
export async function getAppointmentsWithUnreadMessages(
  userType: 'client' | 'practitioner'
) {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  if (!userId) {
    return { data: null, error: 'Non authentifié' };
  }

  const { data, error } = await supabase.rpc(
    'get_appointments_with_unread_messages',
    {
      p_user_id: userId,
      p_user_type: userType
    }
  );

  if (error) {
    logger.error('Erreur récupération RDV avec messages non lus:', error);
    return { data: null, error };
  }

  return { data, error: null };
}
