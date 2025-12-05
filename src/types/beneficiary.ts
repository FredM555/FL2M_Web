// src/types/beneficiary.ts
// Types pour la nouvelle architecture Bénéficiaires

/**
 * Type de relation entre un utilisateur et un bénéficiaire
 */
export type BeneficiaryRelationship =
  | 'self'        // Le bénéficiaire est l'utilisateur lui-même
  | 'child'       // Enfant
  | 'spouse'      // Conjoint(e)
  | 'partner'     // Partenaire
  | 'parent'      // Parent
  | 'sibling'     // Frère/Sœur
  | 'grandparent' // Grand-parent
  | 'grandchild'  // Petit-enfant
  | 'managed'     // Personne gérée (ex: secrétaire qui gère des clients)
  | 'other';      // Autre relation

/**
 * Niveau d'accès à un bénéficiaire
 */
export type BeneficiaryAccessLevel =
  | 'view'   // Peut voir les informations et RDV
  | 'book'   // Peut voir + prendre des RDV
  | 'edit'   // Peut voir + prendre RDV + modifier les infos
  | 'admin'; // Accès complet (partager, supprimer, etc.)

/**
 * Rôle d'un bénéficiaire dans un rendez-vous
 */
export type BeneficiaryRoleInAppointment =
  | 'primary'      // Bénéficiaire principal
  | 'partner'      // Partenaire (ex: couple)
  | 'team_member'  // Membre d'équipe
  | 'child'        // Enfant dans un RDV familial
  | 'parent';      // Parent dans un RDV familial

/**
 * Bénéficiaire principal
 */
export interface Beneficiary {
  // Identifiant
  id: string;
  owner_id: string; // Propriétaire principal

  // Identité (obligatoire)
  first_name: string;
  middle_names?: string | null; // Tous les autres prénoms
  last_name: string;
  birth_date: string; // Format ISO date

  // Contact (optionnel)
  email?: string | null;
  phone?: string | null;
  notifications_enabled: boolean;

  // Données de numérologie (optionnelles)
  tronc?: number | null; // Objectif de vie (jour + mois) - anciennement chemin_de_vie
  racine_1?: number | null; // Chemin de vie (jour + mois + année)
  racine_2?: number | null; // Expression (prénom + nom)
  dynamique_de_vie?: number | null;
  ecorce?: number | null;
  branche?: number | null;
  feuille?: number | null;
  fruit?: number | null;

  // Données supplémentaires flexibles
  metadata?: Record<string, any> | null;

  // Notes générales
  notes?: string | null;

  // Audit
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;

  // Relations jointes (optionnelles selon les requêtes)
  owner?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  appointments_count?: number;
}

/**
 * Accès partagé à un bénéficiaire
 */
export interface BeneficiaryAccess {
  id: string;
  beneficiary_id: string;
  user_id: string;

  // Type de relation
  relationship: BeneficiaryRelationship;

  // Niveaux d'accès
  access_level: BeneficiaryAccessLevel;
  can_book: boolean;
  can_view: boolean;
  can_edit: boolean;
  can_share: boolean;

  // Notes sur cette relation
  notes?: string | null;

  // Audit
  granted_at: string;
  granted_by?: string | null;
  expires_at?: string | null; // Date d'expiration (null = permanent)

  // Relations jointes (optionnelles)
  beneficiary?: Beneficiary;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

/**
 * Liaison entre un rendez-vous et ses bénéficiaires
 */
export interface AppointmentBeneficiary {
  id: string;
  appointment_id: string;
  beneficiary_id: string;

  // Rôle dans le rendez-vous
  role: BeneficiaryRoleInAppointment;
  role_order: number; // Pour ordonner l'affichage

  // Notes spécifiques à ce bénéficiaire pour ce RDV
  notes?: string | null;

  // Notifications
  receives_notifications: boolean;

  // Audit
  created_at: string;

  // Relations jointes (optionnelles)
  beneficiary?: Beneficiary;
}

/**
 * Bénéficiaire avec informations d'accès pour l'utilisateur courant
 */
export interface BeneficiaryWithAccess extends Beneficiary {
  relationship: BeneficiaryRelationship | 'owner';
  access_level: BeneficiaryAccessLevel;
  is_owner: boolean;
  can_book: boolean;
  can_view: boolean;
  can_edit: boolean;
  can_share: boolean;
}

/**
 * Données pour créer un nouveau bénéficiaire
 */
export interface CreateBeneficiaryData {
  // Identité (obligatoire)
  first_name: string;
  middle_names?: string;
  last_name: string;
  birth_date: string; // Format ISO date
  relationship?: BeneficiaryRelationship; // Type de relation (optionnel, par défaut 'other')

  // Contact (optionnel)
  email?: string;
  phone?: string;
  notifications_enabled?: boolean;

  // Données de numérologie (optionnelles)
  tronc?: number; // Objectif de vie (jour + mois) - anciennement chemin_de_vie
  racine_1?: number;
  racine_2?: number;
  dynamique_de_vie?: number;
  ecorce?: number;
  branche?: number;
  feuille?: number;
  fruit?: number;

  // Notes
  notes?: string;

  // Métadonnées
  metadata?: Record<string, any>;
}

/**
 * Données pour mettre à jour un bénéficiaire
 */
export interface UpdateBeneficiaryData extends Partial<CreateBeneficiaryData> {
  // Permet la mise à jour partielle
}

/**
 * Données pour partager l'accès à un bénéficiaire
 */
export interface ShareBeneficiaryAccessData {
  beneficiary_id: string;
  user_email: string; // Email de l'utilisateur à qui partager
  relationship: BeneficiaryRelationship;
  access_level: BeneficiaryAccessLevel;
  can_book?: boolean;
  can_view?: boolean;
  can_edit?: boolean;
  can_share?: boolean;
  notes?: string;
  expires_at?: string; // Date d'expiration (optionnel)
}

/**
 * Résultat d'une recherche de bénéficiaire
 */
export interface BeneficiarySearchResult {
  beneficiary: Beneficiary;
  relationship: BeneficiaryRelationship | 'owner';
  access_level: BeneficiaryAccessLevel;
  is_owner: boolean;
  appointments_count: number;
  last_appointment_date?: string | null;
}

/**
 * Statistiques d'un bénéficiaire
 */
export interface BeneficiaryStats {
  beneficiary_id: string;
  total_appointments: number;
  completed_appointments: number;
  upcoming_appointments: number;
  cancelled_appointments: number;
  practitioners_count: number; // Nombre d'intervenants consultés
  services_count: number; // Nombre de services différents
  first_appointment_date?: string | null;
  last_appointment_date?: string | null;
}

/**
 * Options de recherche de bénéficiaires
 */
export interface BeneficiarySearchOptions {
  search_term?: string; // Recherche dans nom/prénom
  relationship?: BeneficiaryRelationship;
  has_email?: boolean;
  birth_year?: number;
  include_shared?: boolean; // Inclure les bénéficiaires partagés
  only_owned?: boolean; // Uniquement les bénéficiaires possédés
  limit?: number;
  offset?: number;
  order_by?: 'name' | 'birth_date' | 'created_at';
  order_direction?: 'asc' | 'desc';
}

/**
 * Helper pour le nom complet d'un bénéficiaire
 */
export function getBeneficiaryFullName(beneficiary: Beneficiary | CreateBeneficiaryData): string {
  const parts = [beneficiary.first_name];

  if (beneficiary.middle_names) {
    parts.push(beneficiary.middle_names);
  }

  parts.push(beneficiary.last_name);

  return parts.join(' ');
}

/**
 * Helper pour l'initiales d'un bénéficiaire
 */
export function getBeneficiaryInitials(beneficiary: Beneficiary | CreateBeneficiaryData): string {
  const firstInitial = beneficiary.first_name.charAt(0).toUpperCase();
  const lastInitial = beneficiary.last_name.charAt(0).toUpperCase();
  return `${firstInitial}${lastInitial}`;
}

/**
 * Helper pour formater la date de naissance
 */
export function formatBirthDate(birthDate: string): string {
  const date = new Date(birthDate);
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

/**
 * Helper pour calculer l'âge
 */
export function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age;
}

/**
 * Helper pour obtenir le label d'une relation
 */
export function getRelationshipLabel(relationship: BeneficiaryRelationship | 'owner'): string {
  const labels: Record<BeneficiaryRelationship | 'owner', string> = {
    owner: 'Propriétaire',
    self: 'Moi-même',
    child: 'Enfant',
    spouse: 'Conjoint(e)',
    partner: 'Partenaire',
    parent: 'Parent',
    sibling: 'Frère/Sœur',
    grandparent: 'Grand-parent',
    grandchild: 'Petit-enfant',
    managed: 'Géré(e)',
    other: 'Autre'
  };

  return labels[relationship] || relationship;
}

/**
 * Helper pour obtenir le label d'un niveau d'accès
 */
export function getAccessLevelLabel(accessLevel: BeneficiaryAccessLevel): string {
  const labels: Record<BeneficiaryAccessLevel, string> = {
    view: 'Consultation',
    book: 'Réservation',
    edit: 'Modification',
    admin: 'Administration'
  };

  return labels[accessLevel] || accessLevel;
}

/**
 * Helper pour vérifier si un accès a expiré
 */
export function isAccessExpired(access: BeneficiaryAccess): boolean {
  if (!access.expires_at) return false;
  return new Date(access.expires_at) < new Date();
}

/**
 * Helper pour obtenir le rôle label dans un RDV
 */
export function getRoleInAppointmentLabel(role: BeneficiaryRoleInAppointment): string {
  const labels: Record<BeneficiaryRoleInAppointment, string> = {
    primary: 'Principal',
    partner: 'Partenaire',
    team_member: 'Membre d\'équipe',
    child: 'Enfant',
    parent: 'Parent'
  };

  return labels[role] || role;
}
