// src/services/messaging.ts
import { supabase } from './supabase';
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
    console.error('Erreur création thread:', error);
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
    console.error('Erreur création réponse:', error);
    return { data: null, error };
  }

  return { data: message, error: null };
}

/**
 * Récupérer tous les threads de messages d'un utilisateur
 */
export async function getUserMessageThreads(userId: string) {
  const { data, error } = await supabase
    .from('message_threads')
    .select('*')
    .eq('user_id', userId)
    .order('last_message_at', { ascending: false });

  if (error) {
    console.error('Erreur récupération threads:', error);
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
    console.error('Erreur récupération messages:', error);
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
    console.error('Erreur récupération thread:', error);
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
    console.error('Erreur marquage messages lus:', error);
    return { error };
  }

  return { error: null };
}

/**
 * Fermer un thread de messages
 */
export async function closeMessageThread(threadId: string) {
  const { data, error } = await supabase
    .from('messages')
    .update({ status: 'closed' })
    .eq('thread_id', threadId)
    .eq('parent_id', null) // Seulement le message principal
    .select()
    .single();

  if (error) {
    console.error('Erreur fermeture thread:', error);
    return { data: null, error };
  }

  return { data, error: null };
}

/**
 * Rouvrir un thread de messages
 */
export async function reopenMessageThread(threadId: string) {
  const { data, error } = await supabase
    .from('messages')
    .update({ status: 'responded' }) // Ou 'new' selon votre logique
    .eq('thread_id', threadId)
    .eq('parent_id', null)
    .select()
    .single();

  if (error) {
    console.error('Erreur réouverture thread:', error);
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
    console.error('Erreur comptage messages non lus:', error);
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
    console.error('Erreur comptage threads non lus:', error);
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
    console.error('Erreur envoi message système:', error);
    return { data: null, error };
  }

  return { data, error: null };
}
