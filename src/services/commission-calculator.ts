// src/services/commission-calculator.ts
// Service de calcul de commission selon le Modèle D

import { createClient } from '@supabase/supabase-js';
import {
  CommissionCalculationResult,
  ContractType,
  CONTRACT_CONFIGS,
} from '../types/payments';
import { ContractsService } from './contracts';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Service de calcul de commission pour les RDV
 */
export class CommissionCalculator {
  /**
   * Nombre de RDV gratuits offerts à tous les praticiens
   */
  private static readonly FREE_APPOINTMENTS_COUNT = 3;

  /**
   * Calcule la commission pour un RDV en utilisant la fonction SQL
   * @param practitionerId ID du praticien
   * @param appointmentPrice Prix du RDV en euros
   * @param appointmentDate Date du RDV (optionnel, par défaut aujourd'hui)
   * @returns Résultat du calcul de commission
   */
  static async calculateCommission(
    practitionerId: string,
    appointmentPrice: number,
    appointmentDate?: string
  ): Promise<CommissionCalculationResult> {
    const date = appointmentDate || new Date().toISOString().split('T')[0];

    const { data, error } = await supabase.rpc('calculate_commission', {
      p_practitioner_id: practitionerId,
      p_appointment_price: appointmentPrice,
      p_appointment_date: date,
    });

    if (error) {
      console.error('Erreur lors du calcul de la commission:', error);
      throw new Error(`Impossible de calculer la commission: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('Aucun résultat retourné par le calcul de commission');
    }

    return data[0] as CommissionCalculationResult;
  }

  /**
   * Calcule la commission localement (sans appeler la fonction SQL)
   * Utile pour les prévisualisations et les tests
   */
  static calculateCommissionLocal(
    appointmentNumber: number,
    appointmentPrice: number,
    contractType: ContractType
  ): CommissionCalculationResult {
    let commission = 0;
    let isFree = false;

    // RÈGLE 1 : Les 3 premiers RDV sont GRATUITS UNIQUEMENT pour STARTER et PRO
    const hasFreeAppointments = contractType === 'starter' || contractType === 'pro';

    if (hasFreeAppointments && appointmentNumber <= this.FREE_APPOINTMENTS_COUNT) {
      commission = 0;
      isFree = true;
    } else {
      // RÈGLE 2 : Calcul selon le type de contrat
      const config = CONTRACT_CONFIGS[contractType];

      switch (contractType) {
        case 'free':
          // SANS ENGAGEMENT: max(10€, 12% du prix), plafonné à 25€
          commission = Math.max(
            config.commission_fixed || 0,
            appointmentPrice * ((config.commission_percentage || 0) / 100)
          );
          commission = Math.min(commission, config.commission_cap || commission);
          break;

        case 'starter':
          // STARTER (60€/mois): min(6€, 8% du prix) - 3 premiers RDV gratuits
          commission = Math.min(
            config.commission_fixed || 0,
            appointmentPrice * ((config.commission_percentage || 0) / 100)
          );
          break;

        case 'pro':
          // PRO (100€/mois): 3€ fixe - 3 premiers RDV gratuits
          commission = config.commission_fixed || 0;
          break;

        case 'premium':
          // PREMIUM (160€/mois): 0€ pour tous les RDV
          commission = 0;
          isFree = true; // Tous les RDV sont à 0€ pour premium
          break;

        default:
          throw new Error(`Type de contrat inconnu: ${contractType}`);
      }
    }

    return {
      commission_amount: commission,
      practitioner_amount: appointmentPrice - commission,
      is_free: isFree,
      appointment_number: appointmentNumber,
      contract_type: contractType,
    };
  }

  /**
   * Simule le calcul de commission pour différents scénarios
   * Utile pour l'interface admin
   */
  static simulateCommission(
    appointmentPrice: number,
    contractType: ContractType,
    appointmentNumbers: number[] = [1, 2, 3, 4, 5, 10, 20]
  ): CommissionCalculationResult[] {
    return appointmentNumbers.map((appointmentNumber) =>
      this.calculateCommissionLocal(appointmentNumber, appointmentPrice, contractType)
    );
  }

  /**
   * Calcule le point d'équilibre entre deux types de contrats
   * (nombre de RDV par mois où le coût est équivalent)
   */
  static calculateBreakEvenPoint(
    appointmentPrice: number,
    contractType1: ContractType,
    contractType2: ContractType,
    maxAppointments: number = 50
  ): {
    breakEvenAppointments: number | null;
    comparison: Array<{
      appointments: number;
      cost1: number;
      cost2: number;
      difference: number;
    }>;
  } {
    const config1 = CONTRACT_CONFIGS[contractType1];
    const config2 = CONTRACT_CONFIGS[contractType2];

    const comparison: Array<{
      appointments: number;
      cost1: number;
      cost2: number;
      difference: number;
    }> = [];

    let breakEvenAppointments: number | null = null;

    for (let appointments = 4; appointments <= maxAppointments; appointments++) {
      // Calculer le coût total pour chaque type de contrat
      let cost1 = config1.monthly_fee;
      let cost2 = config2.monthly_fee;

      // Ajouter les commissions (en commençant après les 3 RDV gratuits)
      for (let i = 4; i <= appointments; i++) {
        const result1 = this.calculateCommissionLocal(i, appointmentPrice, contractType1);
        const result2 = this.calculateCommissionLocal(i, appointmentPrice, contractType2);
        cost1 += result1.commission_amount;
        cost2 += result2.commission_amount;
      }

      comparison.push({
        appointments,
        cost1: Math.round(cost1 * 100) / 100,
        cost2: Math.round(cost2 * 100) / 100,
        difference: Math.round((cost1 - cost2) * 100) / 100,
      });

      // Trouver le point d'équilibre (première fois que cost2 devient moins cher)
      if (breakEvenAppointments === null && cost2 < cost1) {
        breakEvenAppointments = appointments;
      }
    }

    return {
      breakEvenAppointments,
      comparison,
    };
  }

  /**
   * Calcule les statistiques de commission pour un praticien
   */
  static async getPractitionerCommissionStats(
    practitionerId: string,
    periodStart?: string,
    periodEnd?: string
  ): Promise<{
    total_appointments: number;
    free_appointments: number;
    paid_appointments: number;
    total_commission: number;
    average_commission: number;
    total_practitioner_amount: number;
  }> {
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('practitioner_id', practitionerId)
      .eq('status', 'succeeded');

    if (periodStart) {
      query = query.gte('payment_date', periodStart);
    }
    if (periodEnd) {
      query = query.lte('payment_date', periodEnd);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erreur lors de la récupération des statistiques:', error);
      throw new Error(`Impossible de récupérer les statistiques: ${error.message}`);
    }

    const transactions = data || [];
    const freeAppointments = transactions.filter((t) => t.is_free_appointment);
    const paidAppointments = transactions.filter((t) => !t.is_free_appointment);

    const totalCommission = transactions.reduce(
      (sum, t) => sum + (t.amount_platform_commission || 0),
      0
    );
    const totalPractitionerAmount = transactions.reduce(
      (sum, t) => sum + (t.amount_practitioner || 0),
      0
    );

    return {
      total_appointments: transactions.length,
      free_appointments: freeAppointments.length,
      paid_appointments: paidAppointments.length,
      total_commission: Math.round(totalCommission * 100) / 100,
      average_commission:
        paidAppointments.length > 0
          ? Math.round((totalCommission / paidAppointments.length) * 100) / 100
          : 0,
      total_practitioner_amount: Math.round(totalPractitionerAmount * 100) / 100,
    };
  }

  /**
   * Estime le revenu mensuel d'un praticien selon son contrat
   */
  static estimateMonthlyRevenue(
    appointmentsPerMonth: number,
    averageAppointmentPrice: number,
    contractType: ContractType
  ): {
    gross_revenue: number;
    monthly_fee: number;
    total_commission: number;
    net_revenue: number;
    effective_commission_rate: number;
  } {
    const config = CONTRACT_CONFIGS[contractType];
    const grossRevenue = appointmentsPerMonth * averageAppointmentPrice;

    let totalCommission = 0;

    // Calculer les commissions pour chaque RDV
    for (let i = 1; i <= appointmentsPerMonth; i++) {
      const result = this.calculateCommissionLocal(i, averageAppointmentPrice, contractType);
      totalCommission += result.commission_amount;
    }

    const totalCost = config.monthly_fee + totalCommission;
    const netRevenue = grossRevenue - totalCost;
    const effectiveCommissionRate = grossRevenue > 0 ? (totalCost / grossRevenue) * 100 : 0;

    return {
      gross_revenue: Math.round(grossRevenue * 100) / 100,
      monthly_fee: config.monthly_fee,
      total_commission: Math.round(totalCommission * 100) / 100,
      net_revenue: Math.round(netRevenue * 100) / 100,
      effective_commission_rate: Math.round(effectiveCommissionRate * 100) / 100,
    };
  }

  /**
   * Compare tous les types de contrats pour un scénario donné
   */
  static compareAllContracts(
    appointmentsPerMonth: number,
    averageAppointmentPrice: number
  ): Array<{
    contract_type: ContractType;
    monthly_fee: number;
    total_commission: number;
    total_cost: number;
    net_revenue: number;
    effective_rate: number;
  }> {
    const contractTypes: ContractType[] = ['free', 'starter', 'pro', 'premium'];

    return contractTypes.map((contractType) => {
      const estimate = this.estimateMonthlyRevenue(
        appointmentsPerMonth,
        averageAppointmentPrice,
        contractType
      );

      return {
        contract_type: contractType,
        monthly_fee: estimate.monthly_fee,
        total_commission: estimate.total_commission,
        total_cost: estimate.monthly_fee + estimate.total_commission,
        net_revenue: estimate.net_revenue,
        effective_rate: estimate.effective_commission_rate,
      };
    });
  }
}

export default CommissionCalculator;
