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
  file_type?: string;
  uploaded_at: string;
  uploaded_by?: string;
  description?: string;
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
    .select('*')
    .eq('appointment_id', appointmentId);
};

export const uploadAppointmentDocument = (
  appointmentId: string,
  file: File,
  description?: string
): Promise<any> => {
  // 1. Téléchargement du fichier dans le stockage Supabase
  const fileName = `${Date.now()}_${file.name}`;
  const filePath = `appointments/${appointmentId}/${fileName}`;

  return supabase
    .storage
    .from('documents')
    .upload(filePath, file)
    .then(({ data: fileData, error: fileError }: any) => {
      if (fileError) {
        return { error: fileError };
      }

      // 2. Enregistrement des métadonnées du document dans la base de données
      const documentData: Partial<AppointmentDocument> = {
        appointment_id: appointmentId,
        file_name: fileName,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
        description
      };

      return supabase
        .from('appointment_documents')
        .insert(documentData)
        .select()
        .single();
    }) as any;
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


