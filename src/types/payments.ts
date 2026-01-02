// src/types/payments.ts
// Types pour le système de paiement et de redistribution (Modèle D)

/**
 * Type de contrat intervenant
 * Note: 'standard' est le seul abonnement actif actuellement
 * 'decouverte' est conservé pour les anciens contrats (mapped vers standard)
 * Les autres sont conservés pour compatibilité et possibilité de réactivation future
 */
export type ContractType = 'decouverte' | 'standard' | 'starter' | 'pro' | 'premium';

/**
 * Statut d'un contrat intervenant
 */
export type ContractStatus = 'pending_payment' | 'pending_activation' | 'active' | 'suspended' | 'terminated';

/**
 * Statut d'une transaction
 */
export type TransactionStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'refunded'
  | 'cancelled';

/**
 * Statut d'un virement (payout)
 */
export type PayoutStatus =
  | 'pending'
  | 'processing'
  | 'paid'
  | 'failed'
  | 'cancelled';

/**
 * Type de facture
 */
export type InvoiceType = 'client' | 'practitioner' | 'platform';

/**
 * Statut d'une facture
 */
export type InvoiceStatus =
  | 'draft'
  | 'issued'
  | 'paid'
  | 'cancelled'
  | 'refunded';

/**
 * Contrat d'un intervenant
 */
export interface PractitionerContract {
  id: string;
  practitioner_id: string;
  contract_type: ContractType;

  // Configuration du contrat
  monthly_fee: number;
  commission_fixed: number | null;
  commission_percentage: number | null;
  commission_cap: number | null;
  max_appointments_per_month: number | null;
  free_appointments_per_month: number;

  // Stripe
  stripe_subscription_id: string | null;
  cancel_at_period_end: boolean | null;

  // Dates et statut
  start_date: string; // ISO date
  end_date: string | null; // ISO date
  status: ContractStatus;

  // Compteurs
  appointments_this_month: number;
  total_appointments: number;

  // Document et notes
  contract_document_url: string | null;
  admin_notes: string | null;

  // Audit
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

/**
 * Transaction de paiement
 */
export interface Transaction {
  id: string;

  // Relations
  appointment_id: string;
  practitioner_id: string;
  client_id: string;

  // Identifiants Stripe
  stripe_payment_intent_id: string | null;
  stripe_charge_id: string | null;
  stripe_transfer_id: string | null;

  // Montants (en euros)
  amount_total: number;
  amount_practitioner: number;
  amount_platform_commission: number;
  amount_stripe_fees: number;

  // Détails de la commission
  commission_type: ContractType | null;
  is_free_appointment: boolean;
  appointment_number: number | null;

  // Mode test/production
  is_test_mode: boolean;

  // Statut
  status: TransactionStatus;
  transfer_status: 'pending' | 'eligible' | 'processing' | 'completed' | 'failed';

  // Dates
  payment_date: string | null;
  transfer_date: string | null;
  refund_date: string | null;
  eligible_for_transfer_at: string | null;
  transferred_at: string | null;

  // Métadonnées
  currency: string;
  description: string | null;
  failure_reason: string | null;

  // Audit
  created_at: string;
  updated_at: string;
}

/**
 * Virement aux intervenants
 */
export interface Payout {
  id: string;

  // Relations
  practitioner_id: string;

  // Identifiants Stripe
  stripe_payout_id: string | null;
  stripe_account_id: string | null;

  // Période couverte
  period_start_date: string; // ISO date
  period_end_date: string; // ISO date

  // Montants (en euros)
  amount_total: number;
  amount_transactions: number;
  amount_adjustments: number;
  transaction_count: number;

  // Statut
  status: PayoutStatus;

  // Dates
  scheduled_date: string | null; // ISO date
  paid_date: string | null;
  failed_date: string | null;

  // Métadonnées
  currency: string;
  description: string | null;
  failure_reason: string | null;
  admin_notes: string | null;

  // Audit
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

/**
 * Ligne de facture
 */
export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

/**
 * Facture
 */
export interface Invoice {
  id: string;

  // Numérotation
  invoice_number: string;
  invoice_type: InvoiceType;

  // Relations
  transaction_id: string | null;
  payout_id: string | null;
  client_id: string | null;
  practitioner_id: string | null;

  // Informations de facturation
  billing_name: string;
  billing_email: string;
  billing_address: string | null;
  billing_postal_code: string | null;
  billing_city: string | null;
  billing_country: string;

  // Montants (en euros)
  amount_subtotal: number;
  amount_tax: number;
  amount_total: number;
  tax_rate: number;

  // Détails
  line_items: InvoiceLineItem[];

  // Document PDF
  pdf_url: string | null;
  pdf_generated_at: string | null;

  // Dates
  issue_date: string; // ISO date
  due_date: string | null; // ISO date
  paid_date: string | null; // ISO date

  // Statut
  status: InvoiceStatus;

  // Métadonnées
  currency: string;
  notes: string | null;
  payment_method: string | null;

  // Informations légales
  siret_number: string | null;
  vat_number: string | null;

  // Audit
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

/**
 * Résultat du calcul de commission
 */
export interface CommissionCalculationResult {
  commission_amount: number;
  practitioner_amount: number;
  is_free: boolean;
  appointment_number: number;
  contract_type: ContractType;
}

/**
 * Configuration des frais pour chaque type de contrat
 */
export interface ContractConfig {
  monthly_fee: number;
  commission_fixed: number | null;
  commission_percentage: number | null;
  commission_cap: number | null;
  max_appointments_per_month: number | null;
  free_appointments_per_month: number;
}

/**
 * Configuration des contrats intervenants
 *
 * ACTIF:
 * - Standard (4,90€/mois + 8€/RDV fixe) - Seul abonnement sélectionnable
 * - Decouverte (mapped vers Standard) - Pour les anciens contrats existants
 *
 * DÉSACTIVÉS (conservés pour compatibilité):
 * - Starter, Pro, Premium - Non sélectionnables mais conservés dans le code
 */
export const CONTRACT_CONFIGS: Record<ContractType, ContractConfig> = {
  decouverte: {
    // ANCIEN TYPE - Mappé vers la config Standard pour compatibilité
    monthly_fee: 4.90,
    commission_fixed: 8,
    commission_percentage: null,
    commission_cap: null,
    max_appointments_per_month: null,
    free_appointments_per_month: 0,
  },
  standard: {
    monthly_fee: 4.90,
    commission_fixed: 8,
    commission_percentage: null, // Pas de pourcentage, seulement 8€ fixe
    commission_cap: null,
    max_appointments_per_month: null, // Pas de limite
    free_appointments_per_month: 0, // Pas de RDV gratuits
  },
  starter: {
    monthly_fee: 49,
    commission_fixed: 6,
    commission_percentage: 8,
    commission_cap: 25,
    max_appointments_per_month: 20,
    free_appointments_per_month: 2, // DÉSACTIVÉ - conservé pour compatibilité
  },
  pro: {
    monthly_fee: 99,
    commission_fixed: 3,
    commission_percentage: null,
    commission_cap: null,
    max_appointments_per_month: null,
    free_appointments_per_month: 4, // DÉSACTIVÉ - conservé pour compatibilité
  },
  premium: {
    monthly_fee: 159,
    commission_fixed: 0,
    commission_percentage: null,
    commission_cap: null,
    max_appointments_per_month: null,
    free_appointments_per_month: 0, // DÉSACTIVÉ - conservé pour compatibilité
  },
};

/**
 * Données pour créer un contrat
 */
export interface CreateContractData {
  practitioner_id: string;
  contract_type: ContractType;
  start_date?: string; // ISO date
  contract_document_url?: string;
  admin_notes?: string;
}

/**
 * Données pour mettre à jour un contrat
 */
export interface UpdateContractData {
  contract_type?: ContractType;
  end_date?: string | null; // ISO date
  status?: ContractStatus;
  contract_document_url?: string;
  admin_notes?: string;
}

/**
 * Données pour créer une transaction
 */
export interface CreateTransactionData {
  appointment_id: string;
  practitioner_id: string;
  client_id: string;
  stripe_payment_intent_id?: string;
  amount_total: number;
  amount_practitioner: number;
  amount_platform_commission: number;
  amount_stripe_fees?: number;
  commission_type?: ContractType;
  is_free_appointment?: boolean;
  appointment_number?: number;
  description?: string;
}

/**
 * Statistiques de paiement pour un intervenant
 */
export interface PractitionerPaymentStats {
  practitioner_id: string;
  total_appointments: number;
  free_appointments: number;
  paid_appointments: number;
  total_revenue: number;
  total_commission: number;
  net_revenue: number;
  pending_payout: number;
  current_contract_type: ContractType;
  appointments_this_month: number;
}

/**
 * Helpers pour les labels
 */
export function getContractTypeLabel(type: ContractType): string {
  const labels: Record<ContractType, string> = {
    decouverte: 'FL2M Standard', // Ancien type mappé vers Standard
    standard: 'FL2M Standard',
    starter: 'Starter',
    pro: 'Pro',
    premium: 'Premium',
  };
  return labels[type];
}

export function getContractStatusLabel(status: ContractStatus): string {
  const labels: Record<ContractStatus, string> = {
    pending_payment: 'En attente de paiement',
    pending_activation: 'En attente d\'activation',
    active: 'Actif',
    suspended: 'Suspendu',
    terminated: 'Résilié',
  };
  return labels[status];
}

export function getTransactionStatusLabel(status: TransactionStatus): string {
  const labels: Record<TransactionStatus, string> = {
    pending: 'En attente',
    processing: 'En cours',
    succeeded: 'Réussi',
    failed: 'Échoué',
    refunded: 'Remboursé',
    cancelled: 'Annulé',
  };
  return labels[status];
}

export function getPayoutStatusLabel(status: PayoutStatus): string {
  const labels: Record<PayoutStatus, string> = {
    pending: 'En attente',
    processing: 'En cours',
    paid: 'Payé',
    failed: 'Échoué',
    cancelled: 'Annulé',
  };
  return labels[status];
}

export function getInvoiceStatusLabel(status: InvoiceStatus): string {
  const labels: Record<InvoiceStatus, string> = {
    draft: 'Brouillon',
    issued: 'Émise',
    paid: 'Payée',
    cancelled: 'Annulée',
    refunded: 'Remboursée',
  };
  return labels[status];
}

/**
 * Helper pour formater un montant en euros
 */
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

/**
 * Helper pour calculer le pourcentage de commission
 */
export function calculateCommissionPercentage(
  commission: number,
  total: number
): number {
  if (total === 0) return 0;
  return Math.round((commission / total) * 10000) / 100; // 2 décimales
}
