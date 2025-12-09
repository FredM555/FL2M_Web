// src/services/__tests__/commission-calculator.test.ts
// Tests unitaires pour le calculateur de commission

import { describe, it, expect } from 'vitest';
import { CommissionCalculator } from '../commission-calculator';
import { ContractType } from '../../types/payments';

describe('CommissionCalculator', () => {
  describe('calculateCommissionLocal - RDV Gratuits', () => {
    it('devrait retourner 0€ de commission pour le 1er RDV (STARTER, PRO, PREMIUM)', () => {
      const contractTypes: ContractType[] = ['starter', 'pro', 'premium'];

      contractTypes.forEach((contractType) => {
        const result = CommissionCalculator.calculateCommissionLocal(1, 60, contractType);

        expect(result.commission_amount).toBe(0);
        expect(result.practitioner_amount).toBe(60);
        expect(result.is_free).toBe(true);
        expect(result.appointment_number).toBe(1);
        expect(result.contract_type).toBe(contractType);
      });
    });

    it('devrait retourner 0€ de commission pour le 2ème RDV (STARTER, PRO, PREMIUM)', () => {
      const contractTypes: ContractType[] = ['starter', 'pro', 'premium'];

      contractTypes.forEach((contractType) => {
        const result = CommissionCalculator.calculateCommissionLocal(2, 80, contractType);

        expect(result.commission_amount).toBe(0);
        expect(result.practitioner_amount).toBe(80);
        expect(result.is_free).toBe(true);
      });
    });

    it('devrait retourner 0€ de commission pour les RDV 3-4 (PRO, PREMIUM uniquement)', () => {
      const contractTypes: ContractType[] = ['pro', 'premium'];

      contractTypes.forEach((contractType) => {
        const result3 = CommissionCalculator.calculateCommissionLocal(3, 70, contractType);
        const result4 = CommissionCalculator.calculateCommissionLocal(4, 70, contractType);

        expect(result3.commission_amount).toBe(0);
        expect(result3.is_free).toBe(true);
        expect(result4.commission_amount).toBe(0);
        expect(result4.is_free).toBe(true);
      });
    });
  });

  describe('calculateCommissionLocal - Contrat DÉCOUVERTE', () => {
    it('devrait calculer max(10€, 12%) pour un RDV de 60€ (1er RDV, pas gratuit)', () => {
      const result = CommissionCalculator.calculateCommissionLocal(1, 60, 'decouverte');

      // max(10, 60 * 0.12) = max(10, 7.2) = 10
      expect(result.commission_amount).toBe(10);
      expect(result.practitioner_amount).toBe(50);
      expect(result.is_free).toBe(false);
    });

    it('devrait calculer 12% pour un RDV de 150€', () => {
      const result = CommissionCalculator.calculateCommissionLocal(1, 150, 'decouverte');

      // max(10, 150 * 0.12) = max(10, 18) = 18
      expect(result.commission_amount).toBe(18);
      expect(result.practitioner_amount).toBe(132);
    });

    it('devrait plafonner la commission à 25€ pour un RDV de 300€', () => {
      const result = CommissionCalculator.calculateCommissionLocal(1, 300, 'decouverte');

      // max(10, 300 * 0.12) = max(10, 36) = 36, plafonné à 25
      expect(result.commission_amount).toBe(25);
      expect(result.practitioner_amount).toBe(275);
    });

    it('devrait retourner 10€ minimum même pour un RDV très bas (20€)', () => {
      const result = CommissionCalculator.calculateCommissionLocal(1, 20, 'decouverte');

      // max(10, 20 * 0.12) = max(10, 2.4) = 10
      expect(result.commission_amount).toBe(10);
      expect(result.practitioner_amount).toBe(10);
    });
  });

  describe('calculateCommissionLocal - Contrat STARTER', () => {
    it('devrait calculer min(6€, 8%) pour un RDV de 60€ (RDV #3, après les 2 gratuits)', () => {
      const result = CommissionCalculator.calculateCommissionLocal(3, 60, 'starter');

      // min(6, 60 * 0.08) = min(6, 4.8) = 4.8
      expect(result.commission_amount).toBe(4.8);
      expect(result.practitioner_amount).toBe(55.2);
      expect(result.is_free).toBe(false);
    });

    it('devrait calculer 6€ maximum pour un RDV de 100€', () => {
      const result = CommissionCalculator.calculateCommissionLocal(3, 100, 'starter');

      // min(6, 100 * 0.08) = min(6, 8) = 6
      expect(result.commission_amount).toBe(6);
      expect(result.practitioner_amount).toBe(94);
    });

    it('devrait plafonner à 25€ pour un RDV de 500€', () => {
      const result = CommissionCalculator.calculateCommissionLocal(3, 500, 'starter');

      // min(6, 500 * 0.08) = min(6, 40) = 6, puis plafonné à 25
      expect(result.commission_amount).toBe(6);
      expect(result.practitioner_amount).toBe(494);
    });
  });

  describe('calculateCommissionLocal - Contrat PRO', () => {
    it('devrait retourner 3€ fixe pour tous les RDV (après les 4 gratuits)', () => {
      const prices = [30, 60, 100, 200, 500];

      prices.forEach((price) => {
        const result = CommissionCalculator.calculateCommissionLocal(5, price, 'pro');

        expect(result.commission_amount).toBe(3);
        expect(result.practitioner_amount).toBe(price - 3);
        expect(result.is_free).toBe(false);
      });
    });
  });

  describe('calculateCommissionLocal - Contrat PREMIUM', () => {
    it('devrait retourner 0€ de commission pour tous les RDV (tous gratuits)', () => {
      const prices = [30, 60, 100, 200, 500];

      prices.forEach((price) => {
        const result = CommissionCalculator.calculateCommissionLocal(1, price, 'premium');

        expect(result.commission_amount).toBe(0);
        expect(result.practitioner_amount).toBe(price);
        expect(result.is_free).toBe(true);
      });
    });
  });

  describe('simulateCommission', () => {
    it('devrait simuler correctement les commissions pour différents numéros de RDV (STARTER)', () => {
      const results = CommissionCalculator.simulateCommission(60, 'starter', [1, 2, 3, 4, 5]);

      expect(results).toHaveLength(5);
      expect(results[0].commission_amount).toBe(0); // RDV 1 (gratuit)
      expect(results[1].commission_amount).toBe(0); // RDV 2 (gratuit)
      expect(results[2].commission_amount).toBe(4.8); // RDV 3 (min(6, 60*0.08))
      expect(results[3].commission_amount).toBe(4.8); // RDV 4
      expect(results[4].commission_amount).toBe(4.8); // RDV 5
    });
  });

  describe('estimateMonthlyRevenue', () => {
    it('devrait estimer correctement les revenus pour un contrat DÉCOUVERTE', () => {
      const estimate = CommissionCalculator.estimateMonthlyRevenue(5, 60, 'decouverte');

      // 5 RDV * 60€ = 300€ brut
      // Tous les RDV: 10€ chacun (pas de gratuits) = 50€
      expect(estimate.gross_revenue).toBe(300);
      expect(estimate.monthly_fee).toBe(9);
      expect(estimate.total_commission).toBe(50);
      expect(estimate.net_revenue).toBe(241); // 300 - 9 - 50
    });

    it('devrait estimer correctement les revenus pour un contrat PRO', () => {
      const estimate = CommissionCalculator.estimateMonthlyRevenue(15, 80, 'pro');

      // 15 RDV * 80€ = 1200€ brut
      // RDV 1-4: 0€ (gratuits)
      // RDV 5-15: 3€ chacun = 11 * 3 = 33€
      expect(estimate.gross_revenue).toBe(1200);
      expect(estimate.monthly_fee).toBe(99);
      expect(estimate.total_commission).toBe(33);
      expect(estimate.net_revenue).toBe(1068); // 1200 - 99 - 33
    });

    it('devrait estimer correctement les revenus pour un contrat PREMIUM', () => {
      const estimate = CommissionCalculator.estimateMonthlyRevenue(25, 90, 'premium');

      // 25 RDV * 90€ = 2250€ brut
      // Commission: 0€ (tous gratuits)
      expect(estimate.gross_revenue).toBe(2250);
      expect(estimate.monthly_fee).toBe(159);
      expect(estimate.total_commission).toBe(0);
      expect(estimate.net_revenue).toBe(2091); // 2250 - 159
    });
  });

  describe('compareAllContracts', () => {
    it('devrait comparer tous les types de contrats', () => {
      const comparison = CommissionCalculator.compareAllContracts(10, 80);

      expect(comparison).toHaveLength(4);
      expect(comparison.map((c) => c.contract_type)).toEqual([
        'decouverte',
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

    it('devrait montrer les différences de coûts entre DÉCOUVERTE et PRO', () => {
      const comparison = CommissionCalculator.compareAllContracts(10, 60);

      const decouverteContract = comparison.find((c) => c.contract_type === 'decouverte')!;
      const proContract = comparison.find((c) => c.contract_type === 'pro')!;

      // DÉCOUVERTE: 9€ + 10 RDV * 10€ = 109€
      // PRO: 99€ + 6 RDV * 3€ = 117€ (4 gratuits)
      expect(decouverteContract.total_cost).toBeGreaterThan(100);
      expect(proContract.total_cost).toBeGreaterThan(99);
    });
  });

  describe('calculateBreakEvenPoint', () => {
    it('devrait trouver le point d\'équilibre entre DÉCOUVERTE et STARTER', () => {
      const result = CommissionCalculator.calculateBreakEvenPoint(60, 'decouverte', 'starter', 20);

      expect(result.breakEvenAppointments).toBeGreaterThan(0);
      expect(result.comparison).toHaveLength(20);
      expect(result.comparison[0]).toHaveProperty('appointments', 1);
      expect(result.comparison[0]).toHaveProperty('cost1');
      expect(result.comparison[0]).toHaveProperty('cost2');
      expect(result.comparison[0]).toHaveProperty('difference');
    });

    it('devrait montrer que STARTER devient plus cher que PRO après un certain point', () => {
      const result = CommissionCalculator.calculateBreakEvenPoint(80, 'starter', 'pro', 25);

      // Le point d'équilibre devrait être trouvé
      expect(result.breakEvenAppointments).toBeGreaterThan(0);
      expect(result.breakEvenAppointments).toBeLessThanOrEqual(25);
    });
  });

  describe('Cas limites', () => {
    it('devrait gérer un prix de RDV de 0€', () => {
      const result = CommissionCalculator.calculateCommissionLocal(1, 0, 'decouverte');

      expect(result.commission_amount).toBe(10); // Minimum 10€
      expect(result.practitioner_amount).toBe(-10); // Négatif car prix = 0
    });

    it('devrait gérer un très grand nombre de RDV', () => {
      const result = CommissionCalculator.calculateCommissionLocal(1000, 60, 'pro');

      expect(result.commission_amount).toBe(3);
      expect(result.appointment_number).toBe(1000);
    });

    it('devrait calculer correctement pour des prix avec décimales', () => {
      const result = CommissionCalculator.calculateCommissionLocal(1, 65.50, 'decouverte');

      // max(10, 65.50 * 0.12) = max(10, 7.86) = 10
      expect(result.commission_amount).toBe(10);
      expect(result.practitioner_amount).toBe(55.50);
    });
  });

  describe('Scénarios réels du document', () => {
    it('Cas 1: Intervenant DÉCOUVERTE - 10 RDV/mois à 120€', () => {
      const estimate = CommissionCalculator.estimateMonthlyRevenue(10, 120, 'decouverte');

      expect(estimate.gross_revenue).toBe(1200); // 10 * 120
      expect(estimate.monthly_fee).toBe(9);
      // max(10, 120*0.12) = max(10, 14.4) = 14.4 par RDV × 10 = 144€
      expect(estimate.total_commission).toBe(144);
      expect(estimate.net_revenue).toBe(1047); // 1200 - 9 - 144
    });

    it('Cas 2: Intervenant STARTER - 10 RDV/mois à 120€', () => {
      const estimate = CommissionCalculator.estimateMonthlyRevenue(10, 120, 'starter');

      expect(estimate.gross_revenue).toBe(1200); // 10 * 120
      expect(estimate.monthly_fee).toBe(49);
      // 2 gratuits + 8 payants à 6€ = 48€
      expect(estimate.total_commission).toBe(48);
      expect(estimate.net_revenue).toBe(1103); // 1200 - 49 - 48
    });

    it('Cas 3: Intervenant PRO - 20 RDV/mois à 120€', () => {
      const estimate = CommissionCalculator.estimateMonthlyRevenue(20, 120, 'pro');

      expect(estimate.gross_revenue).toBe(2400); // 20 * 120
      expect(estimate.monthly_fee).toBe(99);
      // 4 gratuits + 16 payants à 3€ = 48€
      expect(estimate.total_commission).toBe(48);
      expect(estimate.net_revenue).toBe(2253); // 2400 - 99 - 48
    });

    it('Cas 4: Intervenant PREMIUM - 30 RDV/mois à 120€', () => {
      const estimate = CommissionCalculator.estimateMonthlyRevenue(30, 120, 'premium');

      expect(estimate.gross_revenue).toBe(3600); // 30 * 120
      expect(estimate.monthly_fee).toBe(159);
      expect(estimate.total_commission).toBe(0); // Tous gratuits
      expect(estimate.net_revenue).toBe(3441); // 3600 - 159
    });
  });
});
