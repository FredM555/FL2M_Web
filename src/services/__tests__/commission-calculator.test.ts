// src/services/__tests__/commission-calculator.test.ts
// Tests unitaires pour le calculateur de commission

import { describe, it, expect } from 'vitest';
import { CommissionCalculator } from '../commission-calculator';
import { ContractType } from '../../types/payments';

describe('CommissionCalculator', () => {
  describe('calculateCommissionLocal - RDV Gratuits (1-3)', () => {
    it('devrait retourner 0€ de commission pour le 1er RDV (tous contrats)', () => {
      const contractTypes: ContractType[] = ['free', 'starter', 'pro', 'premium'];

      contractTypes.forEach((contractType) => {
        const result = CommissionCalculator.calculateCommissionLocal(1, 60, contractType);

        expect(result.commission_amount).toBe(0);
        expect(result.practitioner_amount).toBe(60);
        expect(result.is_free).toBe(true);
        expect(result.appointment_number).toBe(1);
        expect(result.contract_type).toBe(contractType);
      });
    });

    it('devrait retourner 0€ de commission pour le 2ème RDV', () => {
      const result = CommissionCalculator.calculateCommissionLocal(2, 80, 'free');

      expect(result.commission_amount).toBe(0);
      expect(result.practitioner_amount).toBe(80);
      expect(result.is_free).toBe(true);
    });

    it('devrait retourner 0€ de commission pour le 3ème RDV', () => {
      const result = CommissionCalculator.calculateCommissionLocal(3, 70, 'free');

      expect(result.commission_amount).toBe(0);
      expect(result.practitioner_amount).toBe(70);
      expect(result.is_free).toBe(true);
    });
  });

  describe('calculateCommissionLocal - Contrat FREE', () => {
    it('devrait calculer max(10€, 12%) pour un RDV de 60€ (4ème RDV)', () => {
      const result = CommissionCalculator.calculateCommissionLocal(4, 60, 'free');

      // max(10, 60 * 0.12) = max(10, 7.2) = 10
      expect(result.commission_amount).toBe(10);
      expect(result.practitioner_amount).toBe(50);
      expect(result.is_free).toBe(false);
    });

    it('devrait calculer 12% pour un RDV de 150€', () => {
      const result = CommissionCalculator.calculateCommissionLocal(4, 150, 'free');

      // max(10, 150 * 0.12) = max(10, 18) = 18
      expect(result.commission_amount).toBe(18);
      expect(result.practitioner_amount).toBe(132);
    });

    it('devrait plafonner la commission à 25€ pour un RDV de 300€', () => {
      const result = CommissionCalculator.calculateCommissionLocal(4, 300, 'free');

      // max(10, 300 * 0.12) = max(10, 36) = 36, plafonné à 25
      expect(result.commission_amount).toBe(25);
      expect(result.practitioner_amount).toBe(275);
    });

    it('devrait retourner 10€ minimum même pour un RDV très bas (20€)', () => {
      const result = CommissionCalculator.calculateCommissionLocal(4, 20, 'free');

      // max(10, 20 * 0.12) = max(10, 2.4) = 10
      expect(result.commission_amount).toBe(10);
      expect(result.practitioner_amount).toBe(10);
    });
  });

  describe('calculateCommissionLocal - Contrat STARTER', () => {
    it('devrait calculer min(6€, 8%) pour un RDV de 60€', () => {
      const result = CommissionCalculator.calculateCommissionLocal(4, 60, 'starter');

      // min(6, 60 * 0.08) = min(6, 4.8) = 4.8
      expect(result.commission_amount).toBe(4.8);
      expect(result.practitioner_amount).toBe(55.2);
      expect(result.is_free).toBe(false);
    });

    it('devrait calculer 6€ maximum pour un RDV de 100€', () => {
      const result = CommissionCalculator.calculateCommissionLocal(4, 100, 'starter');

      // min(6, 100 * 0.08) = min(6, 8) = 6
      expect(result.commission_amount).toBe(6);
      expect(result.practitioner_amount).toBe(94);
    });

    it('devrait calculer 6€ maximum pour un RDV de 200€', () => {
      const result = CommissionCalculator.calculateCommissionLocal(4, 200, 'starter');

      // min(6, 200 * 0.08) = min(6, 16) = 6
      expect(result.commission_amount).toBe(6);
      expect(result.practitioner_amount).toBe(194);
    });
  });

  describe('calculateCommissionLocal - Contrat PRO', () => {
    it('devrait retourner 3€ fixe pour tous les RDV', () => {
      const prices = [30, 60, 100, 200, 500];

      prices.forEach((price) => {
        const result = CommissionCalculator.calculateCommissionLocal(4, price, 'pro');

        expect(result.commission_amount).toBe(3);
        expect(result.practitioner_amount).toBe(price - 3);
        expect(result.is_free).toBe(false);
      });
    });
  });

  describe('calculateCommissionLocal - Contrat PREMIUM', () => {
    it('devrait retourner 0€ de commission pour tous les RDV', () => {
      const prices = [30, 60, 100, 200, 500];

      prices.forEach((price) => {
        const result = CommissionCalculator.calculateCommissionLocal(4, price, 'premium');

        expect(result.commission_amount).toBe(0);
        expect(result.practitioner_amount).toBe(price);
        expect(result.is_free).toBe(false);
      });
    });
  });

  describe('simulateCommission', () => {
    it('devrait simuler correctement les commissions pour différents numéros de RDV', () => {
      const results = CommissionCalculator.simulateCommission(60, 'free', [1, 2, 3, 4, 5]);

      expect(results).toHaveLength(5);
      expect(results[0].commission_amount).toBe(0); // RDV 1
      expect(results[1].commission_amount).toBe(0); // RDV 2
      expect(results[2].commission_amount).toBe(0); // RDV 3
      expect(results[3].commission_amount).toBe(10); // RDV 4
      expect(results[4].commission_amount).toBe(10); // RDV 5
    });
  });

  describe('estimateMonthlyRevenue', () => {
    it('devrait estimer correctement les revenus pour un contrat FREE', () => {
      const estimate = CommissionCalculator.estimateMonthlyRevenue(5, 60, 'free');

      // 5 RDV * 60€ = 300€ brut
      // RDV 1-3: 0€
      // RDV 4-5: 10€ chacun = 20€
      expect(estimate.gross_revenue).toBe(300);
      expect(estimate.monthly_fee).toBe(0);
      expect(estimate.total_commission).toBe(20);
      expect(estimate.net_revenue).toBe(280);
    });

    it('devrait estimer correctement les revenus pour un contrat PRO', () => {
      const estimate = CommissionCalculator.estimateMonthlyRevenue(15, 80, 'pro');

      // 15 RDV * 80€ = 1200€ brut
      // RDV 1-3: 0€
      // RDV 4-15: 3€ chacun = 12 * 3 = 36€
      expect(estimate.gross_revenue).toBe(1200);
      expect(estimate.monthly_fee).toBe(100);
      expect(estimate.total_commission).toBe(36);
      expect(estimate.net_revenue).toBe(1064); // 1200 - 100 - 36
    });

    it('devrait estimer correctement les revenus pour un contrat PREMIUM', () => {
      const estimate = CommissionCalculator.estimateMonthlyRevenue(25, 90, 'premium');

      // 25 RDV * 90€ = 2250€ brut
      // Commission: 0€
      expect(estimate.gross_revenue).toBe(2250);
      expect(estimate.monthly_fee).toBe(180);
      expect(estimate.total_commission).toBe(0);
      expect(estimate.net_revenue).toBe(2070); // 2250 - 180
    });
  });

  describe('compareAllContracts', () => {
    it('devrait comparer tous les types de contrats', () => {
      const comparison = CommissionCalculator.compareAllContracts(10, 80);

      expect(comparison).toHaveLength(4);
      expect(comparison.map((c) => c.contract_type)).toEqual([
        'free',
        'starter',
        'pro',
        'premium',
      ]);

      // Vérifier que chaque comparaison a les bonnes propriétés
      comparison.forEach((c) => {
        expect(c).toHaveProperty('monthly_fee');
        expect(c).toHaveProperty('total_commission');
        expect(c).toHaveProperty('total_cost');
        expect(c).toHaveProperty('net_revenue');
        expect(c).toHaveProperty('effective_rate');
      });
    });

    it('devrait montrer que PRO est plus avantageux que FREE à partir de 10 RDV', () => {
      const comparison = CommissionCalculator.compareAllContracts(10, 60);

      const freeContract = comparison.find((c) => c.contract_type === 'free')!;
      const proContract = comparison.find((c) => c.contract_type === 'pro')!;

      // FREE: 7 RDV payants * 10€ = 70€
      // PRO: 100€ + 7 RDV * 3€ = 121€
      // À 10 RDV, FREE et PRO devraient être proches
      expect(freeContract.total_cost).toBeGreaterThan(60);
      expect(proContract.total_cost).toBeGreaterThan(100);
    });
  });

  describe('calculateBreakEvenPoint', () => {
    it('devrait trouver le point d\'équilibre entre FREE et PRO', () => {
      const result = CommissionCalculator.calculateBreakEvenPoint(60, 'free', 'pro', 20);

      expect(result.breakEvenAppointments).toBeGreaterThan(0);
      expect(result.comparison).toHaveLength(17); // 4 à 20 RDV
      expect(result.comparison[0]).toHaveProperty('appointments', 4);
      expect(result.comparison[0]).toHaveProperty('cost1');
      expect(result.comparison[0]).toHaveProperty('cost2');
      expect(result.comparison[0]).toHaveProperty('difference');
    });

    it('devrait montrer que STARTER devient plus cher que PRO après un certain point', () => {
      const result = CommissionCalculator.calculateBreakEvenPoint(80, 'starter', 'pro', 20);

      // STARTER a une limite de 15 RDV/mois, donc le point d'équilibre devrait être trouvé
      expect(result.breakEvenAppointments).toBeGreaterThan(0);
      expect(result.breakEvenAppointments).toBeLessThanOrEqual(20);
    });
  });

  describe('Cas limites', () => {
    it('devrait gérer un prix de RDV de 0€', () => {
      const result = CommissionCalculator.calculateCommissionLocal(4, 0, 'free');

      expect(result.commission_amount).toBe(10); // Minimum 10€
      expect(result.practitioner_amount).toBe(-10); // Négatif car prix = 0
    });

    it('devrait gérer un très grand nombre de RDV', () => {
      const result = CommissionCalculator.calculateCommissionLocal(1000, 60, 'pro');

      expect(result.commission_amount).toBe(3);
      expect(result.appointment_number).toBe(1000);
    });

    it('devrait calculer correctement pour des prix avec décimales', () => {
      const result = CommissionCalculator.calculateCommissionLocal(4, 65.50, 'free');

      // max(10, 65.50 * 0.12) = max(10, 7.86) = 10
      expect(result.commission_amount).toBe(10);
      expect(result.practitioner_amount).toBe(55.50);
    });
  });

  describe('Scénarios réels du document', () => {
    it('Cas 1: Intervenant GRATUIT - 5 RDV/mois à 60€', () => {
      const results = CommissionCalculator.simulateCommission(60, 'free', [1, 2, 3, 4, 5]);

      expect(results[0].commission_amount).toBe(0); // RDV 1
      expect(results[1].commission_amount).toBe(0); // RDV 2
      expect(results[2].commission_amount).toBe(0); // RDV 3
      expect(results[3].commission_amount).toBe(10); // RDV 4
      expect(results[4].commission_amount).toBe(10); // RDV 5

      const totalCommission = results.slice(3, 5).reduce((sum, r) => sum + r.commission_amount, 0);
      expect(totalCommission).toBe(20);
    });

    it('Cas 2: Intervenant PRO - 15 RDV/mois à 80€', () => {
      const estimate = CommissionCalculator.estimateMonthlyRevenue(15, 80, 'pro');

      expect(estimate.gross_revenue).toBe(1200); // 15 * 80
      expect(estimate.monthly_fee).toBe(100);
      expect(estimate.total_commission).toBe(36); // 12 RDV * 3€
      expect(estimate.net_revenue).toBe(1064);
    });

    it('Cas 3: Intervenant PREMIUM - 25 RDV/mois à 90€', () => {
      const estimate = CommissionCalculator.estimateMonthlyRevenue(25, 90, 'premium');

      expect(estimate.gross_revenue).toBe(2250); // 25 * 90
      expect(estimate.monthly_fee).toBe(180);
      expect(estimate.total_commission).toBe(0);
      expect(estimate.net_revenue).toBe(2070);
    });
  });
});
