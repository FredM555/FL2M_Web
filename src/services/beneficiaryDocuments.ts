// src/services/beneficiaryDocuments.ts
import { supabase } from './supabase';
import { logger } from '../utils/logger';

/**
 * Types de documents disponibles
 */
export type DocumentType = 'arbre' | 'arbre_detail' | 'plan_de_vie' | 'analyse' | 'autre';

/**
 * Type pour les documents de bénéficiaire
 */
export interface BeneficiaryDocument {
  id: string;
  beneficiary_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: 'pdf';
  document_type: DocumentType; // Type de document
  visibility: 'public' | 'private'; // public = visible par le bénéficiaire, private = visible uniquement par intervenants/admins
  uploaded_at: string;
  uploaded_by: string;
  description?: string;
  created_at: string;
  updated_at: string;
  uploaded_by_profile?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    display_name?: string;
    user_type?: string;
    title?: string;
  };
}

/**
 * Labels pour les types de documents
 */
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  arbre: 'Arbre',
  arbre_detail: 'Arbre Détail',
  plan_de_vie: 'Plan de vie',
  analyse: 'Analyse',
  autre: 'Autre',
};

/**
 * Visibilité par défaut selon le type de document
 */
export const DEFAULT_VISIBILITY_BY_TYPE: Record<DocumentType, 'public' | 'private'> = {
  arbre: 'public',           // public utilisateur par défaut
  arbre_detail: 'private',   // intervenant uniquement
  plan_de_vie: 'private',    // intervenant uniquement
  analyse: 'private',        // intervenant uniquement
  autre: 'private',          // intervenant uniquement
};

/**
 * Récupère tous les documents d'un bénéficiaire
 */
export const getBeneficiaryDocuments = (beneficiaryId: string) => {
  return supabase
    .from('beneficiary_documents')
    .select('*, uploaded_by_profile:profiles!uploaded_by(*)')
    .eq('beneficiary_id', beneficiaryId)
    .order('uploaded_at', { ascending: false });
};

/**
 * Récupère le premier document "arbre" d'un bénéficiaire (pour l'aperçu dans la liste)
 */
export const getBeneficiaryArbreDocument = (beneficiaryId: string) => {
  return supabase
    .from('beneficiary_documents')
    .select('*')
    .eq('beneficiary_id', beneficiaryId)
    .eq('document_type', 'arbre')
    .order('uploaded_at', { ascending: false })
    .limit(1)
    .single();
};

/**
 * Récupère les documents d'un bénéficiaire groupés par type (pour les raccourcis)
 * Retourne seulement les types : arbre, arbre_detail, plan_de_vie
 */
export const getBeneficiaryDocumentsByType = async (beneficiaryId: string) => {
  const { data, error } = await supabase
    .from('beneficiary_documents')
    .select('*')
    .eq('beneficiary_id', beneficiaryId)
    .in('document_type', ['arbre', 'arbre_detail', 'plan_de_vie'])
    .order('uploaded_at', { ascending: false });

  if (error) return { data: null, error };

  // Grouper par type et prendre le plus récent de chaque type
  const grouped: Record<string, any> = {};
  data?.forEach((doc) => {
    if (!grouped[doc.document_type]) {
      grouped[doc.document_type] = doc;
    }
  });

  return { data: grouped, error: null };
};

/**
 * Upload un document PDF pour un bénéficiaire
 */
export const uploadBeneficiaryDocument = async (
  beneficiaryId: string,
  file: File,
  description?: string,
  documentType: DocumentType = 'autre',
  visibility?: 'public' | 'private' // Si non fourni, utilise la visibilité par défaut du type
): Promise<{ data?: BeneficiaryDocument; error?: any }> => {
  try {
    // Vérifier que c'est un PDF
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension !== 'pdf') {
      return { error: { message: 'Type de fichier non supporté. Seuls les PDF sont acceptés.' } };
    }

    // Obtenir l'utilisateur actuel
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: { message: 'Utilisateur non authentifié' } };
    }

    // 1. Téléchargement du fichier dans le stockage Supabase
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `beneficiaries/${beneficiaryId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (uploadError) {
      return { error: uploadError };
    }

    // 2. Enregistrement des métadonnées du document dans la base de données
    // Si la visibilité n'est pas fournie, utiliser la visibilité par défaut du type
    const finalVisibility = visibility ?? DEFAULT_VISIBILITY_BY_TYPE[documentType];

    const documentData = {
      beneficiary_id: beneficiaryId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      file_type: 'pdf' as const,
      document_type: documentType,
      visibility: finalVisibility,
      uploaded_by: user.id,
      description
    };

    const { data, error } = await supabase
      .from('beneficiary_documents')
      .insert(documentData)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    return { error };
  }
};

/**
 * Met à jour les métadonnées d'un document
 */
export const updateBeneficiaryDocument = async (
  documentId: string,
  updates: {
    description?: string;
    document_type?: DocumentType;
    visibility?: 'public' | 'private';
  }
) => {
  return supabase
    .from('beneficiary_documents')
    .update(updates)
    .eq('id', documentId)
    .select()
    .single();
};

/**
 * Supprime un document (fichier + métadonnées)
 */
export const deleteBeneficiaryDocument = async (
  documentId: string
): Promise<{ error?: any }> => {
  try {
    // 1. Récupérer les informations du document
    const { data: document, error: fetchError } = await supabase
      .from('beneficiary_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (fetchError || !document) {
      return { error: fetchError || new Error('Document non trouvé') };
    }

    // 2. Supprimer le fichier du stockage
    const { error: storageError } = await supabase.storage
      .from('documents')
      .remove([document.file_path]);

    if (storageError) {
      logger.error('Erreur lors de la suppression du fichier:', storageError);
      // On continue quand même pour supprimer l'entrée de la BDD
    }

    // 3. Supprimer l'enregistrement de la base de données
    const { error: deleteError } = await supabase
      .from('beneficiary_documents')
      .delete()
      .eq('id', documentId);

    return { error: deleteError };
  } catch (error) {
    return { error };
  }
};

/**
 * Télécharge un document
 */
export const downloadBeneficiaryDocument = async (
  filePath: string
): Promise<{ data?: Blob; error?: any }> => {
  const { data, error } = await supabase.storage
    .from('documents')
    .download(filePath);

  return { data: data || undefined, error };
};

/**
 * Obtient l'URL publique d'un document (bucket public)
 */
export const getBeneficiaryDocumentUrl = (filePath: string): string => {
  const { data } = supabase.storage
    .from('documents')
    .getPublicUrl(filePath);

  return data.publicUrl;
};

/**
 * Obtient une URL signée pour un document (bucket privé) - expire après 1 heure
 */
export const getSignedBeneficiaryDocumentUrl = async (
  filePath: string
): Promise<string> => {
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(filePath, 3600); // 1 heure

  if (error) {
    logger.error('Erreur lors de la création de l\'URL signée:', error);
    // Fallback sur l'URL publique
    return getBeneficiaryDocumentUrl(filePath);
  }

  return data.signedUrl;
};

/**
 * Obtient le blob d'un document (pour éviter les problèmes CORS avec react-pdf)
 */
export const getBeneficiaryDocumentBlob = async (
  filePath: string
): Promise<string | null> => {
  try {
    const { data, error } = await supabase.storage
      .from('documents')
      .download(filePath);

    if (error) {
      logger.error('Erreur lors du téléchargement du blob:', error);
      return null;
    }

    if (data) {
      // Créer une URL blob locale
      const blobUrl = URL.createObjectURL(data);
      return blobUrl;
    }

    return null;
  } catch (error) {
    logger.error('Exception lors du téléchargement du blob:', error);
    return null;
  }
};
