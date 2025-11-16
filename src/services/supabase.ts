// src/services/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Types pour la base de données
export type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  email?: string;
  birth_date?: string;
  user_type: 'admin' | 'intervenant' | 'client';
  created_at: string;
  updated_at: string;
  // Nouveaux champs
  is_active?: boolean;
  created_by?: string;
  updated_by?: string;
  pseudo?: string; // Nouveau champ ajouté
};

export type Service = {
  id: string;
  code: string;
  name: string;
  category: 'particuliers' | 'professionnels' | 'sportifs';
  subcategory: string;
  price: number;
  duration: number;
  description?: string;
  is_on_demand: boolean;
  created_at: string;
  updated_at: string;
  // Nouveaux champs
  created_by?: string;
  updated_by?: string;
};

export type Practitioner = {
  id: string;
  user_id: string;
  bio?: string;
  priority: number;
  created_at: string;
  updated_at: string;
  profile?: Profile;
  // Nouveaux champs
  created_by?: string;
  updated_by?: string;
  display_name?: string;
  title?: string;
  summary?: string;
  is_active: boolean;
};

export type Appointment = {
  id: string;
  client_id: string;
  practitioner_id: string;
  service_id: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  payment_status: 'unpaid' | 'paid' | 'refunded';
  payment_id?: string;
  notes?: string;
  // Les champs beneficiary existaient déjà
  beneficiary_first_name?: string;
  beneficiary_last_name?: string;
  beneficiary_birth_date?: string;
  // Lien de visioconférence
  meeting_link?: string;
  // Prix personnalisé (si NULL, utilise service.price)
  custom_price?: number;
  created_at: string;
  updated_at: string;
  // Relations
  client?: Profile;
  practitioner?: Practitioner;
  service?: Service;
  // Nouveaux champs
  created_by?: string;
  updated_by?: string;
  rating?: number;
  review?: string;
};

export type Availability = {
  id: string;
  practitioner_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

// Type pour les demandes d'inscription en tant qu'intervenant
export type PractitionerRequest = {
  id: string;
  user_id: string;
  motivation: string;
  experience?: string;
  certifications?: string;
  specialties?: string;
  proposed_display_name?: string;
  proposed_title?: string;
  proposed_bio?: string;
  proposed_summary?: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  // Relations
  user?: Profile;
  reviewer?: Profile;
};

// Nouveau type pour les logs de connexion
export type LoginLog = {
  id: string;
  user_id: string;
  login_time: string;
  ip_address?: string;
  user_agent?: string;
  country?: string;
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
};

// Nouveau type pour les documents de rendez-vous
export type AppointmentDocument = {
  id: string;
  appointment_id: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  file_type: 'pdf' | 'mp3' | 'mp4';
  visible_to_client: boolean;
  visible_to_consultant: boolean;
  uploaded_at: string;
  uploaded_by?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
};

// Nouveau type pour les commentaires de rendez-vous
export type AppointmentComment = {
  id: string;
  appointment_id: string;
  author_id: string;
  content: string;
  is_private: boolean; // true = note privée du consultant, false = commentaire public
  created_at: string;
  updated_at: string;
  // Relations
  author?: Profile;
};

// URL et clé d'API Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Création du client Supabase avec options de persistance
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,  // Persister la session dans localStorage
    autoRefreshToken: true, // Rafraîchir automatiquement le token
    detectSessionInUrl: true // Détecter la session dans l'URL (pour les connexions OAuth)
  }
});

// Fonctions d'aide pour les opérations Supabase

// Profils
export const getProfile = (userId: string) => {
  console.log('[GET_PROFILE] Début récupération profil pour utilisateur:', userId);
  try {
    const result = supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    console.log('[GET_PROFILE] Requête envoyée:', result);
    return result;
  } catch (error) {
    console.error('[GET_PROFILE] Exception dans getProfile:', error);
    throw error;
  }
};

export const createProfile = (profileData: Partial<Profile>) => {
  return supabase
    .from('profiles')
    .insert(profileData)
    .select()
    .single();
};

export const updateProfile = (userId: string, profileData: Partial<Profile>) => {
  return supabase
    .from('profiles')
    .update(profileData)
    .eq('id', userId)
    .select()
    .single();
};

// Fonction pour désactiver un profil utilisateur
export const deactivateProfile = (userId: string) => {
  return supabase
    .from('profiles')
    .update({ is_active: false })
    .eq('id', userId)
    .select()
    .single();
};

// Services
export const getServices = (category?: string) => {
  let query = supabase.from('services').select('*');
  
  if (category) {
    query = query.eq('category', category);
  }
  
  return query.order('name');
};

export const getServiceById = (serviceId: string) => {
  return supabase
    .from('services')
    .select('*')
    .eq('id', serviceId)
    .single();
};

export const createService = (serviceData: Partial<Service>) => {
  return supabase
    .from('services')
    .insert(serviceData)
    .select()
    .single();
};

export const updateService = (serviceId: string, serviceData: Partial<Service>) => {
  return supabase
    .from('services')
    .update(serviceData)
    .eq('id', serviceId)
    .select()
    .single();
};

export const deleteService = (serviceId: string) => {
  return supabase
    .from('services')
    .delete()
    .eq('id', serviceId);
};

// Intervenants
export const getPractitioners = () => {
  return supabase
    .from('practitioners')
    .select(`
      *,
      profile:profiles(*)
    `)
    .order('priority', { ascending: false });
};

export const getPractitionerById = (practitionerId: string) => {
  return supabase
    .from('practitioners')
    .select(`
      *,
      profile:profiles(*)
    `)
    .eq('id', practitionerId)
    .single();
};

export const createPractitioner = (practitionerData: Partial<Practitioner>) => {
  return supabase
    .from('practitioners')
    .insert(practitionerData)
    .select()
    .single();
};

export const updatePractitioner = (practitionerId: string, practitionerData: Partial<Practitioner>) => {
  return supabase
    .from('practitioners')
    .update(practitionerData)
    .eq('id', practitionerId)
    .select()
    .single();
};

export const deletePractitioner = (practitionerId: string) => {
  return supabase
    .from('practitioners')
    .delete()
    .eq('id', practitionerId);
};

// Fonctions pour que les intervenants gèrent leur propre profil
export const getMyPractitionerProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: { message: 'Non authentifié' } };
  }

  return supabase
    .from('practitioners')
    .select(`
      *,
      profile:profiles(*)
    `)
    .eq('user_id', user.id)
    .single();
};

export const updateMyPractitionerProfile = async (
  updates: {
    bio?: string;
    display_name?: string;
    title?: string;
    summary?: string;
  }
) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: { message: 'Non authentifié' } };
  }

  // Ne permettre que la modification des champs autorisés
  const allowedFields = {
    bio: updates.bio,
    display_name: updates.display_name,
    title: updates.title,
    summary: updates.summary
  };

  // Supprimer les champs undefined
  Object.keys(allowedFields).forEach(key =>
    allowedFields[key as keyof typeof allowedFields] === undefined &&
    delete allowedFields[key as keyof typeof allowedFields]
  );

  return supabase
    .from('practitioners')
    .update(allowedFields)
    .eq('user_id', user.id)
    .select(`
      *,
      profile:profiles(*)
    `)
    .single();
};

// Disponibilités
export const getAvailabilities = (practitionerId: string) => {
  return supabase
    .from('availability')
    .select('*')
    .eq('practitioner_id', practitionerId);
};

export const createAvailability = (availabilityData: Partial<Availability>) => {
  return supabase
    .from('availability')
    .insert(availabilityData)
    .select()
    .single();
};

export const deleteAvailability = (availabilityId: string) => {
  return supabase
    .from('availability')
    .delete()
    .eq('id', availabilityId);
};

// Rendez-vous
export const getAppointments = (userId: string, isAdmin: boolean = false) => {
  let query = supabase.from('appointments').select(`
    *,
    client:profiles!client_id(*),
    practitioner:practitioners!practitioner_id(
      *,
      profile:profiles(*)
    ),
    service:services(*)
  `);
  
  if (!isAdmin) {
    query = query.eq('client_id', userId);
  }
  
  return query.order('start_time', { ascending: true });
};

export const getAppointmentById = (appointmentId: string) => {
  return supabase
    .from('appointments')
    .select(`
      *,
      client:profiles!client_id(*),
      practitioner:practitioners!practitioner_id(
        *,
        profile:profiles(*)
      ),
      service:services(*)
    `)
    .eq('id', appointmentId)
    .single();
};

export const createAppointment = (appointmentData: Partial<Appointment>) => {
  return supabase
    .from('appointments')
    .insert(appointmentData)
    .select()
    .single();
};

export const updateAppointment = (appointmentId: string, appointmentData: Partial<Appointment>) => {
  return supabase
    .from('appointments')
    .update(appointmentData)
    .eq('id', appointmentId)
    .select()
    .single();
};

export const updateAppointmentStatus = (appointmentId: string, status: string) => {
  return supabase
    .from('appointments')
    .update({ status })
    .eq('id', appointmentId)
    .select()
    .single();
};

/**
 * Mettre à jour les informations du bénéficiaire d'un rendez-vous
 * (Admin ou Intervenant uniquement)
 */
export const updateAppointmentBeneficiary = async (
  appointmentId: string,
  beneficiaryData: {
    beneficiary_first_name?: string;
    beneficiary_last_name?: string;
    beneficiary_birth_date?: string;
    custom_price?: number | null;
  }
) => {
  // Étape 1 : Mettre à jour les données
  const { error: updateError } = await supabase
    .from('appointments')
    .update(beneficiaryData)
    .eq('id', appointmentId);

  if (updateError) {
    return { data: null, error: updateError };
  }

  // Étape 2 : Récupérer l'appointment complet avec toutes les relations
  return supabase
    .from('appointments')
    .select(`
      *,
      client:profiles!client_id(id, first_name, last_name, email, phone),
      practitioner:practitioners!practitioner_id(
        id,
        user_id,
        bio,
        priority,
        profile:profiles!user_id(id, first_name, last_name, email, phone, pseudo)
      ),
      service:services(id, code, name, category, subcategory, price, duration, description)
    `)
    .eq('id', appointmentId)
    .single();
};

export const updatePaymentStatus = (appointmentId: string, paymentStatus: string, paymentId?: string) => {
  const updateData: any = { payment_status: paymentStatus };
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

export const rateAppointment = (appointmentId: string, rating: number, review?: string) => {
  const updateData: Partial<Appointment> = { rating };
  if (review) {
    updateData.review = review;
  }
  
  return supabase
    .from('appointments')
    .update(updateData)
    .eq('id', appointmentId)
    .select()
    .single();
};

// Documents de rendez-vous
export const getAppointmentDocuments = (appointmentId: string) => {
  return supabase
    .from('appointment_documents')
    .select('*, uploaded_by_profile:profiles!uploaded_by(*)')
    .eq('appointment_id', appointmentId)
    .order('uploaded_at', { ascending: false });
};

export const uploadAppointmentDocument = async (
  appointmentId: string,
  file: File,
  visibleToClient: boolean = true,
  visibleToConsultant: boolean = true,
  description?: string
): Promise<{ data?: AppointmentDocument; error?: any }> => {
  try {
    // Déterminer le type de fichier
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    let fileType: 'pdf' | 'mp3' | 'mp4';

    if (fileExtension === 'pdf') {
      fileType = 'pdf';
    } else if (fileExtension === 'mp3') {
      fileType = 'mp3';
    } else if (fileExtension === 'mp4') {
      fileType = 'mp4';
    } else {
      return { error: { message: 'Type de fichier non supporté. Seuls PDF, MP3 et MP4 sont acceptés.' } };
    }

    // Obtenir l'utilisateur actuel
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: { message: 'Utilisateur non authentifié' } };
    }

    // 1. Téléchargement du fichier dans le stockage Supabase
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `appointments/${appointmentId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, file);

    if (uploadError) {
      return { error: uploadError };
    }

    // 2. Enregistrement des métadonnées du document dans la base de données
    const documentData = {
      appointment_id: appointmentId,
      file_name: file.name,
      file_path: filePath,
      file_size: file.size,
      file_type: fileType,
      visible_to_client: visibleToClient,
      visible_to_consultant: visibleToConsultant,
      uploaded_by: user.id,
      description
    };

    const { data, error } = await supabase
      .from('appointment_documents')
      .insert(documentData)
      .select()
      .single();

    return { data, error };
  } catch (error) {
    return { error };
  }
};

export const updateAppointmentDocument = async (
  documentId: string,
  updates: {
    visible_to_client?: boolean;
    visible_to_consultant?: boolean;
    description?: string;
  }
) => {
  return supabase
    .from('appointment_documents')
    .update(updates)
    .eq('id', documentId)
    .select()
    .single();
};

// Obtenir l'URL publique d'un document (pour bucket public)
export const getDocumentUrl = (filePath: string): string => {
  const { data } = supabase.storage
    .from('documents')
    .getPublicUrl(filePath);

  return data.publicUrl;
};

// Obtenir une URL signée pour un document (pour bucket privé) - expire après 1 heure
export const getSignedDocumentUrl = async (filePath: string): Promise<string> => {
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(filePath, 3600); // 1 heure

  if (error) {
    console.error('Erreur lors de la création de l\'URL signée:', error);
    // Fallback sur l'URL publique
    return getDocumentUrl(filePath);
  }

  return data.signedUrl;
};

export const downloadDocument = async (filePath: string): Promise<{ data?: Blob; error?: any }> => {
  const { data, error } = await supabase.storage
    .from('documents')
    .download(filePath);

  return { data: data || undefined, error };
};

// Obtenir le blob d'un document (pour éviter les problèmes CORS avec react-pdf)
export const getDocumentBlob = async (filePath: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase.storage
      .from('documents')
      .download(filePath);

    if (error) {
      console.error('Erreur lors du téléchargement du blob:', error);
      return null;
    }

    if (data) {
      // Créer une URL blob locale
      const blobUrl = URL.createObjectURL(data);
      return blobUrl;
    }

    return null;
  } catch (error) {
    console.error('Exception lors du téléchargement du blob:', error);
    return null;
  }
};

export const deleteAppointmentDocument = (documentId: string): Promise<any> => {
  // 1. Récupérer les informations du document
  return supabase
    .from('appointment_documents')
    .select('*')
    .eq('id', documentId)
    .single()
    .then(({ data: document, error: fetchError }: any) => {
      if (fetchError || !document) {
        return { error: fetchError || new Error('Document not found') };
      }

      // 2. Supprimer le fichier du stockage
      return supabase
        .storage
        .from('documents')
        .remove([document.file_path])
        .then(({ error: storageError }: any) => {
          if (storageError) {
            return { error: storageError };
          }

          // 3. Supprimer l'enregistrement de la base de données
          return supabase
            .from('appointment_documents')
            .delete()
            .eq('id', documentId);
        });
    }) as any;
};

// Commentaires de rendez-vous
export const getAppointmentComments = (appointmentId: string) => {
  return supabase
    .from('appointment_comments')
    .select('*, author:profiles!author_id(*)')
    .eq('appointment_id', appointmentId)
    .order('created_at', { ascending: true });
};

export const createAppointmentComment = async (
  appointmentId: string,
  content: string,
  isPrivate: boolean = false
): Promise<{ data?: AppointmentComment; error?: any }> => {
  try {
    // Obtenir l'utilisateur actuel
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: { message: 'Utilisateur non authentifié' } };
    }

    const commentData = {
      appointment_id: appointmentId,
      author_id: user.id,
      content,
      is_private: isPrivate
    };

    const { data, error } = await supabase
      .from('appointment_comments')
      .insert(commentData)
      .select('*, author:profiles!author_id(*)')
      .single();

    return { data, error };
  } catch (error) {
    return { error };
  }
};

export const updateAppointmentComment = async (
  commentId: string,
  content: string,
  isPrivate?: boolean
) => {
  const updates: any = { content };
  if (isPrivate !== undefined) {
    updates.is_private = isPrivate;
  }

  return supabase
    .from('appointment_comments')
    .update(updates)
    .eq('id', commentId)
    .select('*, author:profiles!author_id(*)')
    .single();
};

export const deleteAppointmentComment = (commentId: string) => {
  return supabase
    .from('appointment_comments')
    .delete()
    .eq('id', commentId);
};

// Logs de connexion utilisateur
export const getLoginLogs = (userId: string) => {
  return supabase
    .from('login_logs')
    .select('*')
    .eq('user_id', userId)
    .order('login_time', { ascending: false });
};

// Fonction pour enregistrer manuellement une connexion (utile si la fonction RPC ne fonctionne pas)
export const logUserLogin = (
  userId: string, 
  ipAddress?: string, 
  userAgent?: string, 
  geoData?: {
    country?: string;
    city?: string;
    region?: string;
    latitude?: number;
    longitude?: number;
  }
) => {
  const logData: Partial<LoginLog> = {
    user_id: userId,
    ip_address: ipAddress,
    user_agent: userAgent,
    ...geoData
  };
  
  return supabase
    .from('login_logs')
    .insert(logData)
    .select()
    .single();
};

// ========================================
// Fonctions pour les demandes d'intervenant
// ========================================

/**
 * Créer une demande pour devenir intervenant
 */
export const createPractitionerRequest = async (data: {
  motivation: string;
  experience?: string;
  certifications?: string;
  specialties?: string;
  proposed_display_name?: string;
  proposed_title?: string;
  proposed_bio?: string;
  proposed_summary?: string;
}) => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: new Error('User not authenticated') };
  }

  return supabase
    .from('practitioner_requests')
    .insert({
      user_id: user.id,
      ...data
    })
    .select(`
      *,
      user:profiles!user_id(id, first_name, last_name, email, user_type)
    `)
    .single();
};

/**
 * Récupérer la demande de l'utilisateur connecté
 */
export const getMyPractitionerRequest = async () => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: new Error('User not authenticated') };
  }

  return supabase
    .from('practitioner_requests')
    .select(`
      *,
      user:profiles!user_id(id, first_name, last_name, email, user_type),
      reviewer:profiles!reviewed_by(id, first_name, last_name)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
};

/**
 * Mettre à jour une demande en attente
 */
export const updateMyPractitionerRequest = async (
  requestId: string,
  data: {
    motivation?: string;
    experience?: string;
    certifications?: string;
    specialties?: string;
    proposed_display_name?: string;
    proposed_title?: string;
    proposed_bio?: string;
    proposed_summary?: string;
  }
) => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: new Error('User not authenticated') };
  }

  return supabase
    .from('practitioner_requests')
    .update(data)
    .eq('id', requestId)
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .select(`
      *,
      user:profiles!user_id(id, first_name, last_name, email, user_type)
    `)
    .single();
};

/**
 * Récupérer toutes les demandes (admin uniquement)
 */
export const getAllPractitionerRequests = async (status?: 'pending' | 'approved' | 'rejected') => {
  let query = supabase
    .from('practitioner_requests')
    .select(`
      *,
      user:profiles!user_id(id, first_name, last_name, email, phone, user_type),
      reviewer:profiles!reviewed_by(id, first_name, last_name)
    `)
    .order('created_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  return query;
};

/**
 * Approuver une demande d'intervenant (admin uniquement)
 */
export const approvePractitionerRequest = async (
  requestId: string,
  adminNotes?: string
) => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: new Error('User not authenticated') };
  }

  return supabase.rpc('approve_practitioner_request', {
    request_id: requestId,
    admin_id: user.id,
    notes: adminNotes || null
  });
};

/**
 * Rejeter une demande d'intervenant (admin uniquement)
 */
export const rejectPractitionerRequest = async (
  requestId: string,
  adminNotes?: string
) => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: new Error('User not authenticated') };
  }

  return supabase.rpc('reject_practitioner_request', {
    request_id: requestId,
    admin_id: user.id,
    notes: adminNotes || null
  });
};

/**
 * Supprimer une demande (admin uniquement)
 */
export const deletePractitionerRequest = async (requestId: string) => {
  return supabase
    .from('practitioner_requests')
    .delete()
    .eq('id', requestId);
};


