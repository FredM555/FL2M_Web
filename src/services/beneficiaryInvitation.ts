// src/services/beneficiaryInvitation.ts
import { supabase } from './supabase';
import { logger } from '../utils/logger';

/**
 * Vérifier si un email existe déjà dans la base utilisateurs
 */
export const checkEmailExists = async (email: string): Promise<{
  exists: boolean;
  userId: string | null;
  error: any;
}> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error) {
      // PGRST116 = Aucune ligne trouvée (email n'existe pas)
      if (error.code === 'PGRST116') {
        return { exists: false, userId: null, error: null };
      }
      throw error;
    }

    return { exists: true, userId: data.id, error: null };
  } catch (error) {
    logger.error('Erreur vérification email:', error);
    return { exists: false, userId: null, error };
  }
};

/**
 * Créer une invitation pour un bénéficiaire
 * Stocke l'invitation en base pour traitement ultérieur
 */
export const createBeneficiaryInvitation = async (
  beneficiaryId: string,
  beneficiaryEmail: string,
  invitedByUserId: string
): Promise<{ data: any; error: any }> => {
  try {
    // Créer un token d'invitation unique
    const invitationToken = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // Expire dans 30 jours

    const { data, error } = await supabase
      .from('beneficiary_invitations')
      .insert([{
        beneficiary_id: beneficiaryId,
        invited_email: beneficiaryEmail.toLowerCase().trim(),
        invited_by: invitedByUserId,
        invitation_token: invitationToken,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      }])
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    logger.error('Erreur création invitation:', error);
    return { data: null, error };
  }
};

/**
 * Envoyer l'email d'invitation
 */
export const sendBeneficiaryInvitationEmail = async (
  beneficiaryId: string,
  beneficiaryName: string,
  beneficiaryEmail: string,
  inviterName: string,
  invitationToken: string
): Promise<{ success: boolean; error: any }> => {
  try {
    // URL de création de compte avec le token d'invitation
    const invitationUrl = `${window.location.origin}/inscription?invitation=${invitationToken}`;

    // Appeler la fonction edge Supabase pour envoyer l'email
    const { data, error } = await supabase.functions.invoke('send-invitation-email', {
      body: {
        to: beneficiaryEmail,
        beneficiaryName,
        inviterName,
        invitationUrl
      }
    });

    if (error) throw error;

    logger.info('Email d\'invitation envoyé avec succès à:', beneficiaryEmail);
    return { success: true, error: null };
  } catch (error) {
    logger.error('Erreur envoi email invitation:', error);
    return { success: false, error };
  }
};

/**
 * Vérifier et traiter une invitation lors de l'inscription
 */
export const processInvitationOnSignup = async (
  invitationToken: string,
  newUserId: string
): Promise<{ beneficiaryId: string | null; error: any }> => {
  try {
    // Récupérer l'invitation
    const { data: invitation, error: invitationError } = await supabase
      .from('beneficiary_invitations')
      .select('*, beneficiary:beneficiaries(*)')
      .eq('invitation_token', invitationToken)
      .eq('status', 'pending')
      .single();

    if (invitationError) throw invitationError;

    // Vérifier que l'invitation n'a pas expiré
    if (new Date(invitation.expires_at) < new Date()) {
      throw new Error('L\'invitation a expiré');
    }

    // Transférer la propriété du bénéficiaire
    const { error: transferError } = await supabase
      .from('beneficiaries')
      .update({
        owner_id: newUserId,
        updated_by: newUserId,
        updated_at: new Date().toISOString()
      })
      .eq('id', invitation.beneficiary_id);

    if (transferError) throw transferError;

    // Créer l'accès pour le nouveau propriétaire
    const { error: accessError } = await supabase
      .from('beneficiary_access')
      .insert([{
        beneficiary_id: invitation.beneficiary_id,
        user_id: newUserId,
        relationship: 'self',
        access_level: 'admin',
        can_view: true,
        can_book: true,
        can_edit: true,
        can_share: true,
        granted_by: newUserId
      }]);

    if (accessError) throw accessError;

    // Créer un accès partagé pour l'ancien propriétaire (view only)
    const { error: sharedAccessError } = await supabase
      .from('beneficiary_access')
      .update({
        access_level: 'view',
        can_edit: false,
        can_share: false,
        can_book: false
      })
      .eq('beneficiary_id', invitation.beneficiary_id)
      .eq('user_id', invitation.invited_by);

    if (sharedAccessError) {
      logger.warn('Erreur mise à jour accès ancien propriétaire:', sharedAccessError);
    }

    // Marquer l'invitation comme acceptée
    await supabase
      .from('beneficiary_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: newUserId
      })
      .eq('invitation_token', invitationToken);

    logger.info('Invitation traitée avec succès, propriété transférée');
    return { beneficiaryId: invitation.beneficiary_id, error: null };
  } catch (error) {
    logger.error('Erreur traitement invitation:', error);
    return { beneficiaryId: null, error };
  }
};

/**
 * Logique complète lors de la création d'un bénéficiaire avec email
 * Vérifie si l'email existe et propose automatiquement le transfert
 */
export const handleBeneficiaryCreationWithEmail = async (
  beneficiaryData: any,
  creatorUserId: string
): Promise<{
  needsInvitation: boolean;
  existingUserId: string | null;
  shouldAutoTransfer: boolean;
  error: any;
}> => {
  try {
    if (!beneficiaryData.email) {
      return {
        needsInvitation: false,
        existingUserId: null,
        shouldAutoTransfer: false,
        error: null
      };
    }

    // Vérifier si l'email existe
    const { exists, userId } = await checkEmailExists(beneficiaryData.email);

    if (exists && userId) {
      // L'email existe déjà pour un autre utilisateur
      logger.info('Email existe pour utilisateur:', userId);
      return {
        needsInvitation: false,
        existingUserId: userId,
        shouldAutoTransfer: true,
        error: null
      };
    }

    // L'email n'existe pas, on peut envoyer une invitation
    return {
      needsInvitation: true,
      existingUserId: null,
      shouldAutoTransfer: false,
      error: null
    };
  } catch (error) {
    logger.error('Erreur gestion création bénéficiaire:', error);
    return {
      needsInvitation: false,
      existingUserId: null,
      shouldAutoTransfer: false,
      error
    };
  }
};

/**
 * Transférer automatiquement la propriété vers un utilisateur existant
 */
export const transferBeneficiaryOwnership = async (
  beneficiaryId: string,
  newOwnerId: string,
  formerOwnerId: string
): Promise<{ success: boolean; error: any }> => {
  try {
    // Transférer la propriété
    const { error: transferError } = await supabase
      .from('beneficiaries')
      .update({
        owner_id: newOwnerId,
        updated_by: newOwnerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', beneficiaryId);

    if (transferError) throw transferError;

    // Créer l'accès admin pour le nouveau propriétaire
    const { error: newAccessError } = await supabase
      .from('beneficiary_access')
      .upsert([{
        beneficiary_id: beneficiaryId,
        user_id: newOwnerId,
        relationship: 'self',
        access_level: 'admin',
        can_view: true,
        can_book: true,
        can_edit: true,
        can_share: true,
        granted_by: newOwnerId
      }]);

    if (newAccessError) throw newAccessError;

    // Mettre à jour l'accès de l'ancien propriétaire (peut garder un accès)
    const { error: oldAccessError } = await supabase
      .from('beneficiary_access')
      .update({
        access_level: 'view',
        can_edit: false,
        can_share: false,
        can_book: false
      })
      .eq('beneficiary_id', beneficiaryId)
      .eq('user_id', formerOwnerId);

    if (oldAccessError) {
      logger.warn('Erreur mise à jour accès ancien propriétaire:', oldAccessError);
    }

    logger.info('Propriété transférée avec succès de', formerOwnerId, 'vers', newOwnerId);
    return { success: true, error: null };
  } catch (error) {
    logger.error('Erreur transfert propriété:', error);
    return { success: false, error };
  }
};
