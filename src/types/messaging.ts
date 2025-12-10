// src/types/messaging.ts
// Types pour le système de messagerie unifié

/**
 * Statut d'un message/thread
 */
export type MessageStatus = 'new' | 'read' | 'responded' | 'closed';

/**
 * Catégorie d'un message
 */
export type MessageCategory =
  | 'contact'              // Message de contact public
  | 'practitioner_request' // Demande d'intervenant
  | 'support'              // Support général
  | 'billing'              // Facturation
  | 'technical'            // Problème technique
  | 'other';               // Autre

/**
 * Type d'expéditeur d'un message
 */
export type SenderType = 'public' | 'user' | 'admin' | 'system';

/**
 * Message (unifie les messages de contact et de conversation)
 */
export interface Message {
  id: string;
  thread_id: string | null;
  parent_id: string | null;
  user_id: string | null;

  // Infos pour messages publics (formulaire de contact)
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;

  // Contenu
  subject: string | null;
  message: string;

  // Métadonnées
  category: MessageCategory;
  sender_type: SenderType;
  status: MessageStatus;

  // Référence optionnelle
  reference_type: string | null;
  reference_id: string | null;

  // Statuts de lecture
  read_by_user: boolean;
  read_by_admin: boolean;
  read_at: string | null;

  // Réponse (pour compatibilité avec l'ancien système)
  response: string | null;
  responded_at: string | null;

  // Assignation
  assigned_to_email: string | null;
  assigned_to_name: string | null;

  // Pièces jointes
  attachments: any | null;

  // Dates
  created_at: string;
  updated_at: string;
}

/**
 * Thread de messages (vue agrégée)
 */
export interface MessageThread {
  thread_id: string;
  user_id: string | null;
  category: MessageCategory;
  subject: string;
  status: MessageStatus;
  first_message_at: string;
  last_message_at: string;
  message_count: number;
  unread_count_user: number;
  unread_count_admin: number;
  reference_type: string | null;
  reference_id: string | null;
}

/**
 * Message avec détails de l'expéditeur
 */
export interface MessageWithSender extends Message {
  sender?: {
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  };
}

/**
 * Données pour créer un thread de messages
 */
export interface CreateThreadData {
  subject: string;
  message: string;
  category: MessageCategory;

  // Pour messages publics (formulaire de contact)
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;

  // Référence optionnelle
  reference_type?: string;
  reference_id?: string;
}

/**
 * Données pour répondre à un message
 */
export interface CreateMessageData {
  thread_id: string;
  parent_id?: string;
  message: string;
  sender_type?: SenderType;
}

/**
 * Labels pour les catégories
 */
export function getMessageCategoryLabel(category: MessageCategory): string {
  const labels: Record<MessageCategory, string> = {
    contact: 'Contact',
    practitioner_request: 'Demande d\'intervenant',
    support: 'Support',
    billing: 'Facturation',
    technical: 'Problème technique',
    other: 'Autre'
  };
  return labels[category];
}

/**
 * Labels pour les statuts
 */
export function getMessageStatusLabel(status: MessageStatus): string {
  const labels: Record<MessageStatus, string> = {
    new: 'Nouveau',
    read: 'Lu',
    responded: 'Répondu',
    closed: 'Fermé'
  };
  return labels[status];
}

/**
 * Couleurs pour les catégories
 */
export function getMessageCategoryColor(category: MessageCategory): string {
  const colors: Record<MessageCategory, string> = {
    contact: '#78909C',               // Gris
    practitioner_request: '#42A5F5',  // Bleu
    support: '#66BB6A',               // Vert
    billing: '#FFA726',               // Orange
    technical: '#EF5350',             // Rouge
    other: '#AB47BC'                  // Violet
  };
  return colors[category];
}

/**
 * Icônes pour les catégories
 */
export function getMessageCategoryIcon(category: MessageCategory): string {
  const icons: Record<MessageCategory, string> = {
    contact: '📧',
    practitioner_request: '👤',
    support: '💬',
    billing: '💰',
    technical: '🔧',
    other: '📋'
  };
  return icons[category];
}

/**
 * Couleurs pour les statuts
 */
export function getMessageStatusColor(status: MessageStatus): 'default' | 'info' | 'success' | 'warning' | 'error' {
  const colors: Record<MessageStatus, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
    new: 'info',
    read: 'default',
    responded: 'success',
    closed: 'default'
  };
  return colors[status];
}
