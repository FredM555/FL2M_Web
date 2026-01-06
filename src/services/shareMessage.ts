// Service pour partager des messages du jour par email
import { supabase } from './supabase';
import { logger } from '../utils/logger';

export interface ShareMessageByEmailParams {
  recipientEmail: string;
  senderName: string;
  senderComment: string;
  messageData: {
    firstName: string;
    date: string;
    nombre1: number;
    nombre2: number;
    nombre3?: number;
    label1: string;
    label2: string;
    label3?: string;
    titre1: string;
    titre2: string;
    titre3?: string;
    message1: string;
    message2: string;
    message3?: string;
  };
}

/**
 * Partager un message du jour par email
 */
export const shareMessageByEmail = async ({
  recipientEmail,
  senderName,
  senderComment,
  messageData
}: ShareMessageByEmailParams): Promise<{ success: boolean; error: any }> => {
  try {
    logger.info('[Share Message] Envoi email à:', recipientEmail, 'de la part de:', senderName);

    // Appeler la fonction edge Supabase pour envoyer l'email
    const { data, error } = await supabase.functions.invoke('share-message-email', {
      body: {
        to: recipientEmail,
        senderName,
        senderComment,
        messageData
      }
    });

    if (error) {
      logger.error('[Share Message] Erreur envoi email:', error);
      throw error;
    }

    logger.info('[Share Message] Email envoyé avec succès');
    return { success: true, error: null };

  } catch (error: any) {
    logger.error('[Share Message] Exception:', error);
    return { success: false, error };
  }
};
