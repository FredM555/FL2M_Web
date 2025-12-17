// src/services/invoice-service.ts
import { supabase } from './supabase';
import { logger } from '../utils/logger';

export interface Invoice {
  id: string;
  invoice_number: string;
  invoice_type: 'client' | 'practitioner' | 'platform';
  practitioner_id?: string;
  billing_name: string;
  billing_email: string;
  billing_address?: string;
  billing_postal_code?: string;
  billing_city?: string;
  billing_country?: string;
  amount_subtotal: number;
  amount_tax: number;
  amount_total: number;
  tax_rate: number;
  line_items: InvoiceLineItem[];
  pdf_url?: string;
  pdf_generated_at?: string;
  issue_date: string;
  due_date?: string;
  paid_date?: string;
  status: 'draft' | 'issued' | 'paid' | 'cancelled' | 'refunded';
  generation_type?: 'automatic' | 'manual';
  period_start?: string;
  period_end?: string;
  invoices_count_this_month?: number;
  extra_invoice_fee?: number;
  payment_instructions?: string;
  siret_number?: string;
  vat_number?: string;
  created_at?: string;
  updated_at?: string;
}

export interface InvoiceLineItem {
  description: string;
  appointment_id?: string;
  quantity: number;
  unit_price: number;
  commission?: number;
  amount: number;
}

export interface GenerateInvoiceParams {
  practitionerId: string;
  periodStart: string;
  periodEnd: string;
  generationType?: 'automatic' | 'manual';
  adminId?: string;
}

export interface MonthlyInvoiceResult {
  practitioner_id: string;
  invoice_id: string | null;
  success: boolean;
  error_message: string | null;
}

/**
 * Service de gestion des factures intervenants
 */
export class InvoiceService {
  /**
   * Génère une facture pour un intervenant pour une période donnée
   */
  static async generatePractitionerInvoice(
    params: GenerateInvoiceParams
  ): Promise<string> {
    try {
      const { practitionerId, periodStart, periodEnd, generationType = 'manual', adminId } = params;

      // Appeler la fonction SQL pour générer la facture
      const { data, error } = await supabase.rpc('generate_practitioner_invoice', {
        p_practitioner_id: practitionerId,
        p_period_start: periodStart,
        p_period_end: periodEnd,
        p_generation_type: generationType,
        p_admin_id: adminId || null
      });

      if (error) {
        logger.error('Erreur lors de la génération de la facture:', error);
        throw new Error(`Impossible de générer la facture: ${error.message}`);
      }

      if (!data) {
        throw new Error('La facture n\'a pas pu être générée');
      }

      return data as string; // UUID de la facture créée
    } catch (err: any) {
      logger.error('Erreur dans generatePractitionerInvoice:', err);
      throw err;
    }
  }

  /**
   * Génère toutes les factures mensuelles automatiques pour tous les intervenants
   */
  static async generateMonthlyInvoicesForAllPractitioners(
    year?: number,
    month?: number
  ): Promise<MonthlyInvoiceResult[]> {
    try {
      const { data, error } = await supabase.rpc('generate_monthly_invoices_for_all_practitioners', {
        p_year: year || null,
        p_month: month || null
      });

      if (error) {
        logger.error('Erreur lors de la génération des factures mensuelles:', error);
        throw new Error(`Impossible de générer les factures mensuelles: ${error.message}`);
      }

      return (data || []) as MonthlyInvoiceResult[];
    } catch (err: any) {
      logger.error('Erreur dans generateMonthlyInvoicesForAllPractitioners:', err);
      throw err;
    }
  }

  /**
   * Récupère une facture par son ID
   */
  static async getInvoice(invoiceId: string): Promise<Invoice | null> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Facture non trouvée
        }
        throw error;
      }

      return data as Invoice;
    } catch (err: any) {
      logger.error('Erreur dans getInvoice:', err);
      throw err;
    }
  }

  /**
   * Récupère toutes les factures d'un intervenant
   */
  static async getPractitionerInvoices(
    practitionerId: string,
    options?: {
      status?: Invoice['status'];
      limit?: number;
      offset?: number;
    }
  ): Promise<Invoice[]> {
    try {
      let query = supabase
        .from('invoices')
        .select('*')
        .eq('practitioner_id', practitionerId)
        .eq('invoice_type', 'practitioner')
        .order('issue_date', { ascending: false });

      if (options?.status) {
        query = query.eq('status', options.status);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return (data || []) as Invoice[];
    } catch (err: any) {
      logger.error('Erreur dans getPractitionerInvoices:', err);
      throw err;
    }
  }

  /**
   * Compte le nombre de factures générées ce mois pour un intervenant
   */
  static async countPractitionerInvoicesThisMonth(
    practitionerId: string
  ): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('count_practitioner_invoices_this_month', {
        p_practitioner_id: practitionerId
      });

      if (error) {
        throw error;
      }

      return (data || 0) as number;
    } catch (err: any) {
      logger.error('Erreur dans countPractitionerInvoicesThisMonth:', err);
      throw err;
    }
  }

  /**
   * Calcule les frais de facturation pour une nouvelle facture
   */
  static async calculateInvoiceFee(
    practitionerId: string,
    generationType: 'automatic' | 'manual'
  ): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('calculate_invoice_fee', {
        p_practitioner_id: practitionerId,
        p_generation_type: generationType
      });

      if (error) {
        throw error;
      }

      return (data || 0) as number;
    } catch (err: any) {
      logger.error('Erreur dans calculateInvoiceFee:', err);
      throw err;
    }
  }

  /**
   * Marque une facture comme payée
   */
  static async markInvoiceAsPaid(
    invoiceId: string,
    paidDate?: string,
    userId?: string
  ): Promise<Invoice> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          paid_date: paidDate || new Date().toISOString().split('T')[0],
          updated_by: userId
        })
        .eq('id', invoiceId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as Invoice;
    } catch (err: any) {
      logger.error('Erreur dans markInvoiceAsPaid:', err);
      throw err;
    }
  }

  /**
   * Annule une facture
   */
  static async cancelInvoice(
    invoiceId: string,
    userId?: string
  ): Promise<Invoice> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .update({
          status: 'cancelled',
          updated_by: userId
        })
        .eq('id', invoiceId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data as Invoice;
    } catch (err: any) {
      logger.error('Erreur dans cancelInvoice:', err);
      throw err;
    }
  }

  /**
   * Récupère les statistiques de facturation d'un intervenant
   */
  static async getPractitionerInvoiceStats(
    practitionerId: string
  ): Promise<{
    total_invoices: number;
    total_amount: number;
    paid_amount: number;
    pending_amount: number;
    this_month_count: number;
    this_month_fees: number;
  }> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('status, amount_total, extra_invoice_fee, issue_date')
        .eq('practitioner_id', practitionerId)
        .eq('invoice_type', 'practitioner');

      if (error) {
        throw error;
      }

      const invoices = data || [];
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const stats = {
        total_invoices: invoices.length,
        total_amount: invoices.reduce((sum, inv) => sum + Number(inv.amount_total), 0),
        paid_amount: invoices
          .filter(inv => inv.status === 'paid')
          .reduce((sum, inv) => sum + Number(inv.amount_total), 0),
        pending_amount: invoices
          .filter(inv => inv.status === 'issued')
          .reduce((sum, inv) => sum + Number(inv.amount_total), 0),
        this_month_count: invoices.filter(inv => {
          const issueDate = new Date(inv.issue_date);
          return issueDate.getMonth() === currentMonth && issueDate.getFullYear() === currentYear;
        }).length,
        this_month_fees: invoices
          .filter(inv => {
            const issueDate = new Date(inv.issue_date);
            return issueDate.getMonth() === currentMonth && issueDate.getFullYear() === currentYear;
          })
          .reduce((sum, inv) => sum + Number(inv.extra_invoice_fee || 0), 0)
      };

      return stats;
    } catch (err: any) {
      logger.error('Erreur dans getPractitionerInvoiceStats:', err);
      throw err;
    }
  }

  /**
   * Télécharge une facture en PDF (à implémenter avec génération PDF)
   */
  static async downloadInvoicePDF(invoiceId: string): Promise<string> {
    try {
      const invoice = await this.getInvoice(invoiceId);

      if (!invoice) {
        throw new Error('Facture non trouvée');
      }

      if (invoice.pdf_url) {
        return invoice.pdf_url;
      }

      // TODO: Implémenter la génération de PDF
      // Pour l'instant, retourner une URL vide
      throw new Error('La génération de PDF n\'est pas encore implémentée');
    } catch (err: any) {
      logger.error('Erreur dans downloadInvoicePDF:', err);
      throw err;
    }
  }
}

export default InvoiceService;
