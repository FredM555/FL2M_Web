// src/services/contracts.ts
// Service de gestion des contrats praticiens

import { createClient } from '@supabase/supabase-js';
import {
  PractitionerContract,
  CreateContractData,
  UpdateContractData,
  ContractType,
  ContractStatus,
  CONTRACT_CONFIGS,
} from '../types/payments';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Service de gestion des contrats praticiens
 */
export class ContractsService {
  /**
   * Récupère le contrat actif d'un praticien
   */
  static async getActiveContract(
    practitionerId: string
  ): Promise<PractitionerContract | null> {
    const { data, error } = await supabase
      .from('practitioner_contracts')
      .select('*')
      .eq('practitioner_id', practitionerId)
      .eq('status', 'active')
      .lte('start_date', new Date().toISOString().split('T')[0])
      .or(`end_date.is.null,end_date.gte.${new Date().toISOString().split('T')[0]}`)
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Erreur lors de la récupération du contrat actif:', error);
      return null;
    }

    return data;
  }

  /**
   * Récupère tous les contrats d'un praticien (historique)
   */
  static async getPractitionerContracts(
    practitionerId: string
  ): Promise<PractitionerContract[]> {
    const { data, error } = await supabase
      .from('practitioner_contracts')
      .select('*')
      .eq('practitioner_id', practitionerId)
      .order('start_date', { ascending: false });

    if (error) {
      console.error('Erreur lors de la récupération des contrats:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Crée un nouveau contrat pour un praticien
   */
  static async createContract(
    contractData: CreateContractData,
    userId: string
  ): Promise<PractitionerContract | null> {
    // Récupérer la configuration du type de contrat
    const config = CONTRACT_CONFIGS[contractData.contract_type];

    const { data, error } = await supabase
      .from('practitioner_contracts')
      .insert({
        practitioner_id: contractData.practitioner_id,
        contract_type: contractData.contract_type,
        monthly_fee: config.monthly_fee,
        commission_fixed: config.commission_fixed,
        commission_percentage: config.commission_percentage,
        commission_cap: config.commission_cap,
        max_appointments_per_month: config.max_appointments_per_month,
        start_date: contractData.start_date || new Date().toISOString().split('T')[0],
        status: 'active',
        contract_document_url: contractData.contract_document_url || null,
        admin_notes: contractData.admin_notes || null,
        created_by: userId,
        updated_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur lors de la création du contrat:', error);
      throw new Error(`Impossible de créer le contrat: ${error.message}`);
    }

    return data;
  }

  /**
   * Met à jour un contrat existant
   */
  static async updateContract(
    contractId: string,
    updates: UpdateContractData,
    userId: string
  ): Promise<PractitionerContract | null> {
    const updateData: any = {
      ...updates,
      updated_by: userId,
    };

    // Si le type de contrat change, mettre à jour les paramètres
    if (updates.contract_type) {
      const config = CONTRACT_CONFIGS[updates.contract_type];
      updateData.monthly_fee = config.monthly_fee;
      updateData.commission_fixed = config.commission_fixed;
      updateData.commission_percentage = config.commission_percentage;
      updateData.commission_cap = config.commission_cap;
      updateData.max_appointments_per_month = config.max_appointments_per_month;
    }

    const { data, error } = await supabase
      .from('practitioner_contracts')
      .update(updateData)
      .eq('id', contractId)
      .select()
      .single();

    if (error) {
      console.error('Erreur lors de la mise à jour du contrat:', error);
      throw new Error(`Impossible de mettre à jour le contrat: ${error.message}`);
    }

    return data;
  }

  /**
   * Termine un contrat (le marque comme terminé)
   */
  static async terminateContract(
    contractId: string,
    userId: string,
    endDate?: string
  ): Promise<PractitionerContract | null> {
    return this.updateContract(
      contractId,
      {
        status: 'terminated' as ContractStatus,
        end_date: endDate || new Date().toISOString().split('T')[0],
      },
      userId
    );
  }

  /**
   * Suspend un contrat
   */
  static async suspendContract(
    contractId: string,
    userId: string
  ): Promise<PractitionerContract | null> {
    return this.updateContract(
      contractId,
      {
        status: 'suspended' as ContractStatus,
      },
      userId
    );
  }

  /**
   * Réactive un contrat suspendu
   */
  static async reactivateContract(
    contractId: string,
    userId: string
  ): Promise<PractitionerContract | null> {
    return this.updateContract(
      contractId,
      {
        status: 'active' as ContractStatus,
      },
      userId
    );
  }

  /**
   * Incrémente le compteur de RDV d'un contrat
   */
  static async incrementAppointmentCount(
    practitionerId: string
  ): Promise<void> {
    const contract = await this.getActiveContract(practitionerId);
    if (!contract) {
      throw new Error(`Aucun contrat actif trouvé pour le praticien ${practitionerId}`);
    }

    const { error } = await supabase
      .from('practitioner_contracts')
      .update({
        appointments_this_month: contract.appointments_this_month + 1,
        total_appointments: contract.total_appointments + 1,
      })
      .eq('id', contract.id);

    if (error) {
      console.error('Erreur lors de l\'incrémentation du compteur:', error);
      throw new Error(`Impossible d'incrémenter le compteur: ${error.message}`);
    }
  }

  /**
   * Réinitialise le compteur mensuel de RDV pour tous les contrats
   * (à appeler au début de chaque mois via un cron job)
   */
  static async resetMonthlyCounters(): Promise<void> {
    const { error } = await supabase
      .from('practitioner_contracts')
      .update({ appointments_this_month: 0 })
      .eq('status', 'active');

    if (error) {
      console.error('Erreur lors de la réinitialisation des compteurs mensuels:', error);
      throw new Error(`Impossible de réinitialiser les compteurs: ${error.message}`);
    }
  }

  /**
   * Récupère tous les contrats actifs
   */
  static async getAllActiveContracts(): Promise<PractitionerContract[]> {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('practitioner_contracts')
      .select('*')
      .eq('status', 'active')
      .lte('start_date', today)
      .or(`end_date.is.null,end_date.gte.${today}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur lors de la récupération des contrats actifs:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Récupère les statistiques des contrats
   */
  static async getContractsStatistics(): Promise<{
    total: number;
    by_type: Record<ContractType, number>;
    active: number;
    suspended: number;
    terminated: number;
  }> {
    const { data, error } = await supabase
      .from('practitioner_contracts')
      .select('contract_type, status');

    if (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      return {
        total: 0,
        by_type: { decouverte: 0, starter: 0, pro: 0, premium: 0 },
        active: 0,
        suspended: 0,
        terminated: 0,
      };
    }

    const stats = {
      total: data.length,
      by_type: { decouverte: 0, starter: 0, pro: 0, premium: 0 } as Record<ContractType, number>,
      active: 0,
      suspended: 0,
      terminated: 0,
    };

    data.forEach((contract) => {
      stats.by_type[contract.contract_type as ContractType]++;
      if (contract.status === 'active') stats.active++;
      else if (contract.status === 'suspended') stats.suspended++;
      else if (contract.status === 'terminated') stats.terminated++;
    });

    return stats;
  }

  /**
   * Vérifie si un praticien peut prendre un nouveau RDV
   * (selon les limites du contrat starter)
   */
  static async canPractitionerBookAppointment(
    practitionerId: string
  ): Promise<{ can_book: boolean; reason?: string }> {
    const contract = await this.getActiveContract(practitionerId);

    if (!contract) {
      return { can_book: false, reason: 'Aucun contrat actif' };
    }

    if (contract.status !== 'active') {
      return { can_book: false, reason: `Contrat ${contract.status}` };
    }

    // Vérifier la limite mensuelle pour le contrat Starter
    if (
      contract.max_appointments_per_month !== null &&
      contract.appointments_this_month >= contract.max_appointments_per_month
    ) {
      return {
        can_book: false,
        reason: `Limite mensuelle atteinte (${contract.max_appointments_per_month} RDV/mois)`,
      };
    }

    return { can_book: true };
  }
}

export default ContractsService;
