# 💳 Implémentation Stripe Connect - Guide Simplifié

**Date:** 2025-01-27
**Version:** 2.0 - Simplifié
**Objectif:** Paiement différé (48h) + Gestion contrats intervenants

> ✨ **Tout est géré par Stripe** : Pas de facturation manuelle, pas d'IBAN à stocker, pas de SIRET dans la DB !

---

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Flux utilisateur](#flux-utilisateur)
3. [Migrations SQL](#migrations-sql)
4. [Services TypeScript](#services-typescript)
5. [Composants React](#composants-react)
6. [API Routes](#api-routes)
7. [Cron Jobs](#cron-jobs)
8. [Configuration](#configuration)
9. [Checklist](#checklist)

---

## 🎯 Vue d'ensemble

### **Principe**

1. **Client → Intervenant** : Validation admin
2. **Choix forfait** : DÉCOUVERTE, STARTER, PRO, PREMIUM
3. **Changement mensuel** : Au 1er du mois
4. **Paiement différé** : Transfert après validation (48h)
5. **Stripe gère TOUT** : Facturation, IBAN, déclarations

### **Modèle de Commission**

| Type | Prix/mois | RDV Gratuits | Commission |
|------|-----------|--------------|------------|
| DÉCOUVERTE | 9€ | 0 | max(10€, 12%) ≤ 25€ |
| STARTER | 49€ | 2 | min(6€, 8%) ≤ 25€ |
| PRO | 99€ | 4 | 3€ fixe |
| PREMIUM | 159€ | Tous | 0€ |

---

## 🔄 Flux Utilisateur

### **1. Client devient Intervenant**

```
Client demande (DÉJÀ FAIT)
    ↓
Admin accepte
    ↓
- Rôle: practitioner
- Compte Stripe Connect créé
- Contrat DÉCOUVERTE par défaut
    ↓
Nouveau menu "Mon Contrat"
```

### **2. Choix du Forfait**

```
Intervenant choisit (ex: STARTER 49€)
    ↓
Stripe Checkout pour carte bancaire
    ↓
Souscription mensuelle créée
    ↓
Prélèvement auto le 1er du mois
```

### **3. Paiement RDV (Exemple 85€)**

```
JOUR 0: Réservation
├─ Client paie 85€
├─ Argent sur VOTRE compte
└─ Status: confirmed

JOUR X: RDV terminé
├─ Intervenant clique "Terminer"
└─ Status: completed (délai 48h démarre)

JOUR X+2: Validation
├─ Client: "✅ OK" → transfert immédiat
├─ OU auto après 48h → transfert auto
└─ OU "⚠️ Problème" → admin gère

JOUR X+3: Transfert
└─ 85€ - 1,70€ - 6€ = 77,30€ → Intervenant
```

---

## 🗄️ Migrations SQL

### **Migration 1: Tables principales**

Fichier: `supabase/migrations/YYYYMMDDHHMMSS_stripe_connect_setup.sql`

```sql
-- =====================================================
-- Migration Stripe Connect - Version Simplifiée
-- =====================================================

-- 1. Mise à jour practitioners (SIMPLIFIÉ)
ALTER TABLE practitioners
ADD COLUMN IF NOT EXISTS stripe_account_id VARCHAR UNIQUE,
ADD COLUMN IF NOT EXISTS stripe_account_status VARCHAR DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS stripe_onboarding_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR,
ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_practitioners_stripe_account
ON practitioners(stripe_account_id);

COMMENT ON COLUMN practitioners.stripe_account_id IS
'ID du compte Stripe Connect pour recevoir les paiements';

COMMENT ON COLUMN practitioners.stripe_customer_id IS
'ID customer Stripe pour prélever les abonnements mensuels';

-- 2. Mise à jour appointments
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'confirmed',
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS validation_deadline TIMESTAMP,
ADD COLUMN IF NOT EXISTS validated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS validated_by VARCHAR,
ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS dispute_reason TEXT,
ADD COLUMN IF NOT EXISTS admin_resolution TEXT;

ALTER TABLE appointments
ADD CONSTRAINT check_appointment_status
CHECK (status IN ('confirmed', 'completed', 'validated', 'disputed', 'refunded', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_validation_deadline
ON appointments(validation_deadline) WHERE status = 'completed';

-- 3. Mise à jour practitioner_contracts
ALTER TABLE practitioner_contracts
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR,
ADD COLUMN IF NOT EXISTS stripe_price_id VARCHAR,
ADD COLUMN IF NOT EXISTS next_contract_type VARCHAR,
ADD COLUMN IF NOT EXISTS next_contract_start_date DATE,
ADD COLUMN IF NOT EXISTS cancellation_requested BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cancellation_date DATE;

-- 4. Mise à jour transactions
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS can_be_refunded BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS refund_deadline TIMESTAMP,
ADD COLUMN IF NOT EXISTS validation_status VARCHAR DEFAULT 'pending_validation';

CREATE INDEX IF NOT EXISTS idx_transactions_validation_status
ON transactions(validation_status);

-- 5. Table historique changements contrats
CREATE TABLE IF NOT EXISTS contract_changes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  practitioner_id UUID REFERENCES practitioners(id) ON DELETE CASCADE NOT NULL,

  old_contract_type VARCHAR,
  old_monthly_fee DECIMAL(10,2),

  new_contract_type VARCHAR NOT NULL,
  new_monthly_fee DECIMAL(10,2),

  requested_at TIMESTAMP DEFAULT NOW(),
  effective_date DATE NOT NULL,

  old_subscription_id VARCHAR,
  new_subscription_id VARCHAR,

  reason TEXT,
  requested_by VARCHAR,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contract_changes_practitioner
ON contract_changes(practitioner_id);

CREATE INDEX IF NOT EXISTS idx_contract_changes_effective_date
ON contract_changes(effective_date);
```

---

### **Migration 2: Fonctions SQL**

Fichier: `supabase/migrations/YYYYMMDDHHMMSS_stripe_functions.sql`

```sql
-- =====================================================
-- Fonctions helper pour Stripe Connect
-- =====================================================

-- Fonction: RDV à valider automatiquement
CREATE OR REPLACE FUNCTION get_appointments_to_auto_validate()
RETURNS TABLE (
  appointment_id UUID,
  practitioner_id UUID,
  client_id UUID,
  appointment_date TIMESTAMP,
  validation_deadline TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.practitioner_id,
    a.client_id,
    a.appointment_date,
    a.validation_deadline
  FROM appointments a
  WHERE a.status = 'completed'
    AND a.validation_deadline < NOW()
    AND a.validated_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Fonction: Transactions en attente de transfert
CREATE OR REPLACE FUNCTION get_transactions_pending_transfer()
RETURNS TABLE (
  transaction_id UUID,
  appointment_id UUID,
  practitioner_id UUID,
  amount_to_transfer DECIMAL,
  stripe_account_id VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.appointment_id,
    t.practitioner_id,
    t.amount_practitioner,
    p.stripe_account_id
  FROM transactions t
  JOIN appointments a ON a.id = t.appointment_id
  JOIN practitioners p ON p.id = t.practitioner_id
  WHERE a.status = 'validated'
    AND t.transfer_date IS NULL
    AND t.status = 'succeeded'
    AND p.stripe_account_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Fonction: Stats intervenant pour un mois
CREATE OR REPLACE FUNCTION get_practitioner_monthly_stats(
  p_practitioner_id UUID,
  p_year INT,
  p_month INT
)
RETURNS TABLE (
  total_appointments INT,
  validated_appointments INT,
  pending_validation INT,
  disputed_appointments INT,
  total_revenue DECIMAL,
  total_commissions DECIMAL,
  total_stripe_fees DECIMAL,
  net_amount DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INT,
    COUNT(*) FILTER (WHERE a.status = 'validated')::INT,
    COUNT(*) FILTER (WHERE a.status = 'completed')::INT,
    COUNT(*) FILTER (WHERE a.status = 'disputed')::INT,
    COALESCE(SUM(t.amount_total), 0),
    COALESCE(SUM(t.amount_platform_commission), 0),
    COALESCE(SUM(t.amount_stripe_fees), 0),
    COALESCE(SUM(t.amount_practitioner), 0)
  FROM appointments a
  LEFT JOIN transactions t ON t.appointment_id = a.id
  WHERE a.practitioner_id = p_practitioner_id
    AND EXTRACT(YEAR FROM a.appointment_date) = p_year
    AND EXTRACT(MONTH FROM a.appointment_date) = p_month;
END;
$$ LANGUAGE plpgsql;

-- Fonction: Appliquer changements de contrat planifiés
CREATE OR REPLACE FUNCTION apply_scheduled_contract_changes()
RETURNS TABLE (
  practitioner_id UUID,
  old_type VARCHAR,
  new_type VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  UPDATE practitioner_contracts pc
  SET
    contract_type = pc.next_contract_type,
    monthly_fee = (
      SELECT monthly_fee
      FROM (VALUES
        ('decouverte', 9),
        ('starter', 49),
        ('pro', 99),
        ('premium', 159)
      ) AS configs(type, monthly_fee)
      WHERE configs.type = pc.next_contract_type
    ),
    start_date = pc.next_contract_start_date,
    next_contract_type = NULL,
    next_contract_start_date = NULL,
    updated_at = NOW()
  WHERE pc.next_contract_start_date = CURRENT_DATE
    AND pc.next_contract_type IS NOT NULL
  RETURNING
    pc.practitioner_id,
    pc.contract_type,
    pc.next_contract_type;
END;
$$ LANGUAGE plpgsql;
```

---

## 📦 Services TypeScript

### **Service 1: Stripe Connect**

Fichier: `src/services/stripe-connect.ts`

```typescript
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export class StripeConnectService {

  /**
   * Créer un compte Stripe Connect pour un intervenant
   */
  static async createConnectAccount(practitionerId: string) {
    const { data: practitioner } = await supabase
      .from('practitioners')
      .select('*, users(email, full_name)')
      .eq('id', practitionerId)
      .single();

    if (!practitioner) throw new Error('Intervenant non trouvé');

    if (practitioner.stripe_account_id) {
      return practitioner.stripe_account_id;
    }

    const account = await stripe.accounts.create({
      type: 'express',
      country: 'FR',
      email: practitioner.users.email,
      capabilities: {
        transfers: { requested: true },
      },
      business_type: 'individual',
      metadata: {
        practitioner_id: practitionerId,
      },
    });

    await supabase
      .from('practitioners')
      .update({
        stripe_account_id: account.id,
        stripe_account_status: 'pending',
        stripe_onboarding_completed: false,
      })
      .eq('id', practitionerId);

    return account.id;
  }

  /**
   * Générer lien onboarding Stripe
   */
  static async createOnboardingLink(practitionerId: string) {
    const { data: practitioner } = await supabase
      .from('practitioners')
      .select('stripe_account_id')
      .eq('id', practitionerId)
      .single();

    if (!practitioner?.stripe_account_id) {
      throw new Error('Compte Stripe non trouvé');
    }

    const accountLink = await stripe.accountLinks.create({
      account: practitioner.stripe_account_id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/onboarding/refresh`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/onboarding/complete`,
      type: 'account_onboarding',
    });

    return accountLink.url;
  }

  /**
   * Vérifier statut compte Connect
   */
  static async checkAccountStatus(practitionerId: string) {
    const { data: practitioner } = await supabase
      .from('practitioners')
      .select('stripe_account_id')
      .eq('id', practitionerId)
      .single();

    if (!practitioner?.stripe_account_id) return null;

    const account = await stripe.accounts.retrieve(practitioner.stripe_account_id);

    const isComplete = account.details_submitted &&
                       account.charges_enabled &&
                       account.payouts_enabled;

    await supabase
      .from('practitioners')
      .update({
        stripe_onboarding_completed: isComplete,
        stripe_charges_enabled: account.charges_enabled,
        stripe_payouts_enabled: account.payouts_enabled,
        stripe_account_status: account.charges_enabled ? 'active' : 'pending',
      })
      .eq('id', practitionerId);

    return { isComplete, account };
  }

  /**
   * Lien dashboard Stripe pour l'intervenant
   */
  static async createDashboardLink(practitionerId: string) {
    const { data: practitioner } = await supabase
      .from('practitioners')
      .select('stripe_account_id')
      .eq('id', practitionerId)
      .single();

    if (!practitioner?.stripe_account_id) {
      throw new Error('Compte Stripe non trouvé');
    }

    const loginLink = await stripe.accounts.createLoginLink(
      practitioner.stripe_account_id
    );

    return loginLink.url;
  }
}
```

---

### **Service 2: Gestion Contrats**

Fichier: `src/services/contract-management.ts`

```typescript
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { ContractType, CONTRACT_CONFIGS } from '@/types/payments';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export class ContractManagementService {

  private static STRIPE_PRICE_IDS = {
    starter: process.env.STRIPE_PRICE_STARTER!,
    pro: process.env.STRIPE_PRICE_PRO!,
    premium: process.env.STRIPE_PRICE_PREMIUM!,
  };

  /**
   * Créer/Modifier contrat intervenant
   */
  static async setContract(
    practitionerId: string,
    contractType: ContractType,
    effectiveDate?: Date
  ) {
    const effective = effectiveDate || new Date();
    const config = CONTRACT_CONFIGS[contractType];
    const isScheduled = effective > new Date();

    const { data: currentContract } = await supabase
      .from('practitioner_contracts')
      .select('*')
      .eq('practitioner_id', practitionerId)
      .eq('status', 'active')
      .single();

    // Planifier pour plus tard
    if (isScheduled && currentContract) {
      await supabase
        .from('practitioner_contracts')
        .update({
          next_contract_type: contractType,
          next_contract_start_date: effective.toISOString().split('T')[0],
        })
        .eq('id', currentContract.id);

      await supabase
        .from('contract_changes')
        .insert({
          practitioner_id: practitionerId,
          old_contract_type: currentContract.contract_type,
          old_monthly_fee: currentContract.monthly_fee,
          new_contract_type: contractType,
          new_monthly_fee: config.monthly_fee,
          effective_date: effective.toISOString().split('T')[0],
          requested_by: 'practitioner',
        });

      return { success: true, scheduled: true, effectiveDate: effective };
    }

    // Changement immédiat
    if (currentContract) {
      await supabase
        .from('practitioner_contracts')
        .update({
          status: 'terminated',
          end_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', currentContract.id);

      if (currentContract.stripe_subscription_id) {
        await stripe.subscriptions.cancel(currentContract.stripe_subscription_id);
      }
    }

    // Créer nouveau contrat
    const { data: newContract } = await supabase
      .from('practitioner_contracts')
      .insert({
        practitioner_id: practitionerId,
        contract_type: contractType,
        monthly_fee: config.monthly_fee,
        commission_fixed: config.commission_fixed,
        commission_percentage: config.commission_percentage,
        commission_cap: config.commission_cap,
        max_appointments_per_month: config.max_appointments_per_month,
        start_date: effective.toISOString().split('T')[0],
        status: 'active',
      })
      .select()
      .single();

    // Créer souscription Stripe si payant
    if (contractType !== 'decouverte') {
      const subscriptionId = await this.createSubscription(practitionerId, contractType);

      await supabase
        .from('practitioner_contracts')
        .update({
          stripe_subscription_id: subscriptionId,
          stripe_price_id: this.STRIPE_PRICE_IDS[contractType],
        })
        .eq('id', newContract.id);
    }

    return { success: true, scheduled: false, contract: newContract };
  }

  /**
   * Créer souscription Stripe
   */
  private static async createSubscription(
    practitionerId: string,
    contractType: 'starter' | 'pro' | 'premium'
  ) {
    const { data: practitioner } = await supabase
      .from('practitioners')
      .select('*, users(email, full_name)')
      .eq('id', practitionerId)
      .single();

    let customerId = practitioner.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: practitioner.users.email,
        name: practitioner.users.full_name,
        metadata: { practitioner_id: practitionerId },
      });

      customerId = customer.id;

      await supabase
        .from('practitioners')
        .update({ stripe_customer_id: customerId })
        .eq('id', practitionerId);
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: this.STRIPE_PRICE_IDS[contractType] }],
      metadata: {
        practitioner_id: practitionerId,
        contract_type: contractType,
      },
    });

    return subscription.id;
  }

  /**
   * Planifier changement pour le mois prochain
   */
  static async scheduleContractChange(
    practitionerId: string,
    newContractType: ContractType
  ) {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(0, 0, 0, 0);

    return this.setContract(practitionerId, newContractType, nextMonth);
  }
}
```

---

### **Service 3: Paiement Différé**

Fichier: `src/services/delayed-payment.ts`

```typescript
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { CommissionCalculator } from './commission-calculator';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export class DelayedPaymentService {

  /**
   * ÉTAPE 1: Créer paiement (argent reste chez vous)
   */
  static async createAppointmentPayment(appointmentData: {
    appointmentId: string;
    clientId: string;
    practitionerId: string;
    price: number;
    appointmentDate: string;
  }) {
    const { appointmentId, clientId, practitionerId, price, appointmentDate } = appointmentData;

    const commission = await CommissionCalculator.calculateCommission(
      practitionerId,
      price,
      appointmentDate
    );

    const priceInCents = Math.round(price * 100);
    const stripeFees = Math.round(price * 0.02 * 100);
    const platformCommission = Math.round(commission.commission_amount * 100);

    const { data: client } = await supabase
      .from('users')
      .select('stripe_customer_id')
      .eq('id', clientId)
      .single();

    const paymentIntent = await stripe.paymentIntents.create({
      amount: priceInCents,
      currency: 'eur',
      customer: client?.stripe_customer_id,
      metadata: {
        appointment_id: appointmentId,
        practitioner_id: practitionerId,
        client_id: clientId,
      },
    });

    await supabase
      .from('transactions')
      .insert({
        appointment_id: appointmentId,
        practitioner_id: practitionerId,
        client_id: clientId,
        stripe_payment_intent_id: paymentIntent.id,
        amount_total: price,
        amount_practitioner: commission.practitioner_amount,
        amount_platform_commission: commission.commission_amount,
        amount_stripe_fees: price * 0.02,
        commission_type: commission.contract_type,
        is_free_appointment: commission.is_free,
        status: 'pending',
        validation_status: 'pending_completion',
        payment_date: new Date().toISOString(),
        can_be_refunded: true,
      });

    return paymentIntent;
  }

  /**
   * ÉTAPE 2: Marquer RDV terminé
   */
  static async markAppointmentCompleted(appointmentId: string) {
    const validationDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await supabase
      .from('appointments')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        validation_deadline: validationDeadline.toISOString(),
      })
      .eq('id', appointmentId);

    await supabase
      .from('transactions')
      .update({
        validation_status: 'pending_validation',
        status: 'succeeded',
      })
      .eq('appointment_id', appointmentId);
  }

  /**
   * ÉTAPE 3a: Client valide
   */
  static async validateAppointmentByClient(appointmentId: string, clientId: string) {
    const { data: appointment } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .eq('client_id', clientId)
      .single();

    if (!appointment || appointment.status !== 'completed') {
      throw new Error('RDV non valide');
    }

    await supabase
      .from('appointments')
      .update({
        status: 'validated',
        validated_at: new Date().toISOString(),
        validated_by: 'client',
      })
      .eq('id', appointmentId);

    await this.transferToPractitioner(appointmentId);
  }

  /**
   * ÉTAPE 3b: Auto-validation (cron)
   */
  static async autoValidateAppointments() {
    const { data: appointments } = await supabase.rpc('get_appointments_to_auto_validate');

    if (!appointments || appointments.length === 0) return [];

    const validated = [];

    for (const appointment of appointments) {
      try {
        await supabase
          .from('appointments')
          .update({
            status: 'validated',
            validated_at: new Date().toISOString(),
            validated_by: 'auto',
          })
          .eq('id', appointment.appointment_id);

        await this.transferToPractitioner(appointment.appointment_id);
        validated.push(appointment.appointment_id);
      } catch (error) {
        console.error(`Erreur auto-validation ${appointment.appointment_id}:`, error);
      }
    }

    return validated;
  }

  /**
   * ÉTAPE 3c: Signaler problème
   */
  static async reportAppointmentIssue(
    appointmentId: string,
    clientId: string,
    reason: string
  ) {
    await supabase
      .from('appointments')
      .update({
        status: 'disputed',
        dispute_reason: reason,
        disputed_at: new Date().toISOString(),
      })
      .eq('id', appointmentId)
      .eq('client_id', clientId);

    return { success: true, disputed: true };
  }

  /**
   * ÉTAPE 4: Transférer à l'intervenant
   */
  static async transferToPractitioner(appointmentId: string) {
    const { data: appointment } = await supabase
      .from('appointments')
      .select(`
        *,
        practitioner:practitioners!inner(id, stripe_account_id),
        transaction:transactions!inner(*)
      `)
      .eq('id', appointmentId)
      .single();

    if (!appointment || appointment.status !== 'validated') {
      throw new Error('RDV non validé');
    }

    const transaction = Array.isArray(appointment.transaction)
      ? appointment.transaction[0]
      : appointment.transaction;

    if (transaction.transfer_date) return;

    if (!appointment.practitioner.stripe_account_id) {
      throw new Error('Compte Stripe Connect non configuré');
    }

    const stripeFees = Math.round(transaction.amount_total * 0.02 * 100);
    const platformCommission = Math.round(transaction.amount_platform_commission * 100);
    const practitionerAmount = Math.round(transaction.amount_practitioner * 100) - stripeFees;

    const transfer = await stripe.transfers.create({
      amount: practitionerAmount,
      currency: 'eur',
      destination: appointment.practitioner.stripe_account_id,
      description: `Paiement RDV du ${appointment.appointment_date}`,
      metadata: {
        appointment_id: appointmentId,
        transaction_id: transaction.id,
      },
    });

    await supabase
      .from('transactions')
      .update({
        transfer_date: new Date().toISOString(),
        stripe_transfer_id: transfer.id,
        validation_status: 'transferred',
        can_be_refunded: false,
      })
      .eq('id', transaction.id);

    return transfer;
  }

  /**
   * Rembourser (avant transfert uniquement)
   */
  static async refundAppointment(appointmentId: string) {
    const { data: transaction } = await supabase
      .from('transactions')
      .select('*')
      .eq('appointment_id', appointmentId)
      .single();

    if (!transaction) throw new Error('Transaction non trouvée');
    if (transaction.transfer_date) throw new Error('Déjà transféré');
    if (!transaction.can_be_refunded) throw new Error('Non remboursable');

    const refund = await stripe.refunds.create({
      payment_intent: transaction.stripe_payment_intent_id,
    });

    await supabase
      .from('transactions')
      .update({
        status: 'refunded',
        refund_date: new Date().toISOString(),
      })
      .eq('id', transaction.id);

    await supabase
      .from('appointments')
      .update({ status: 'refunded' })
      .eq('id', appointmentId);

    return refund;
  }
}
```

---

## 🎨 Composants React

### **Composant 1: Sélecteur de Forfait**

Fichier: `src/components/practitioner/ContractSelector.tsx`

```tsx
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { ContractType } from '@/types/payments';
import { ContractManagementService } from '@/services/contract-management';

const CONTRACTS = [
  {
    type: 'decouverte' as ContractType,
    name: 'Découverte',
    price: 9,
    features: ['Aucun RDV gratuit', 'Commission: max(10€, 12%)', 'Plafonné 25€', 'Limité 10 RDV/mois'],
  },
  {
    type: 'starter' as ContractType,
    name: 'Starter',
    price: 49,
    badge: '🎁 2 RDV gratuits',
    features: ['2 premiers RDV GRATUITS', 'Commission: min(6€, 8%)', 'Plafonné 25€', 'Limité 20 RDV/mois'],
  },
  {
    type: 'pro' as ContractType,
    name: 'Pro',
    price: 99,
    badge: '⭐ Recommandé',
    features: ['4 premiers RDV GRATUITS', 'Commission: 3€ fixe', 'RDV illimités', 'Badge Pro'],
  },
  {
    type: 'premium' as ContractType,
    name: 'Premium',
    price: 159,
    badge: '👑 VIP',
    features: ['0€ commission (tous)', 'RDV illimités', 'Featured homepage', 'Analytics avancés'],
  },
];

export function ContractSelector({
  currentContractType,
  practitionerId,
  onContractChange,
}: {
  currentContractType?: ContractType;
  practitionerId: string;
  onContractChange?: () => void;
}) {
  const [selected, setSelected] = useState<ContractType | null>(null);
  const [loading, setLoading] = useState(false);
  const [scheduleNext, setScheduleNext] = useState(false);

  const handleSelect = async () => {
    if (!selected) return;

    setLoading(true);
    try {
      if (scheduleNext) {
        await ContractManagementService.scheduleContractChange(practitionerId, selected);
        alert('Changement planifié pour le 1er du mois prochain !');
      } else {
        await ContractManagementService.setContract(practitionerId, selected);
        alert('Contrat mis à jour !');
      }
      onContractChange?.();
    } catch (error) {
      alert('Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {CONTRACTS.map((contract) => (
          <Card
            key={contract.type}
            className={`cursor-pointer transition-all ${
              selected === contract.type ? 'ring-2 ring-primary' : ''
            } ${currentContractType === contract.type ? 'border-green-500' : ''}`}
            onClick={() => setSelected(contract.type)}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{contract.name}</CardTitle>
                {currentContractType === contract.type && (
                  <Badge variant="outline" className="bg-green-50">
                    Actuel
                  </Badge>
                )}
              </div>
              {contract.badge && <Badge>{contract.badge}</Badge>}
              <CardDescription className="text-2xl font-bold">
                {contract.price}€<span className="text-sm">/mois</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {contract.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-500 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {selected && selected !== currentContractType && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={scheduleNext}
                onChange={(e) => setScheduleNext(e.target.checked)}
              />
              <span className="text-sm">Planifier pour le 1er du mois prochain</span>
            </label>

            <Button onClick={handleSelect} disabled={loading} className="w-full">
              {loading ? 'Traitement...' : scheduleNext ? 'Planifier' : 'Changer maintenant'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

---

### **Composant 2: Validation RDV**

Fichier: `src/components/appointments/AppointmentValidation.tsx`

```tsx
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { DelayedPaymentService } from '@/services/delayed-payment';

export function AppointmentValidation({
  appointmentId,
  clientId,
  validationDeadline,
  onValidated,
}: {
  appointmentId: string;
  clientId: string;
  validationDeadline: string;
  onValidated?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [reason, setReason] = useState('');

  const deadline = new Date(validationDeadline);
  const hoursLeft = Math.floor((deadline.getTime() - Date.now()) / (1000 * 60 * 60));

  const handleValidate = async () => {
    setLoading(true);
    try {
      await DelayedPaymentService.validateAppointmentByClient(appointmentId, clientId);
      alert('✅ RDV validé ! L\'intervenant va recevoir son paiement.');
      onValidated?.();
    } catch (error) {
      alert('Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handleDispute = async () => {
    if (!reason.trim()) return;

    setLoading(true);
    try {
      await DelayedPaymentService.reportAppointmentIssue(appointmentId, clientId, reason);
      alert('⚠️ Problème signalé. Un admin va examiner.');
      setShowDispute(false);
      onValidated?.();
    } catch (error) {
      alert('Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Votre RDV s'est bien passé ?
          </CardTitle>
          <CardDescription>
            {hoursLeft > 0 ? (
              <>Validation auto dans <strong>{hoursLeft}h</strong></>
            ) : (
              'Validation en cours...'
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={handleValidate} disabled={loading} className="w-full" size="lg">
            <CheckCircle className="w-4 h-4 mr-2" />
            Tout s'est bien passé
          </Button>

          <Button
            onClick={() => setShowDispute(true)}
            variant="outline"
            className="w-full"
            size="lg"
          >
            <AlertCircle className="w-4 h-4 mr-2" />
            Signaler un problème
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showDispute} onOpenChange={setShowDispute}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Signaler un problème</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              placeholder="Décrivez le problème..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={5}
            />

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDispute(false)} className="flex-1">
                Annuler
              </Button>
              <Button onClick={handleDispute} disabled={loading || !reason.trim()} className="flex-1">
                Envoyer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

---

## 🔌 API Routes

### **Route 1: Promouvoir Intervenant**

Fichier: `src/pages/api/admin/promote-practitioner.ts`

```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { StripeConnectService } from '@/services/stripe-connect';
import { ContractManagementService } from '@/services/contract-management';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { requestId, userId } = req.body;

    // 1. Approuver demande
    await supabase
      .from('practitioner_requests')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', requestId);

    // 2. Mettre à jour rôle
    await supabase
      .from('users')
      .update({ role: 'practitioner' })
      .eq('id', userId);

    // 3. Créer profil practitioner
    const { data: existingPractitioner } = await supabase
      .from('practitioners')
      .select('id')
      .eq('user_id', userId)
      .single();

    let practitionerId;

    if (!existingPractitioner) {
      const { data: newPractitioner } = await supabase
        .from('practitioners')
        .insert({ user_id: userId, status: 'active' })
        .select('id')
        .single();

      practitionerId = newPractitioner.id;
    } else {
      practitionerId = existingPractitioner.id;
    }

    // 4. Créer compte Stripe Connect
    await StripeConnectService.createConnectAccount(practitionerId);

    // 5. Contrat DÉCOUVERTE par défaut
    await ContractManagementService.setContract(practitionerId, 'decouverte');

    res.status(200).json({ success: true, practitionerId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

---

### **Route 2: Webhook Stripe**

Fichier: `src/pages/api/webhooks/stripe.ts`

```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { buffer } from 'micro';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const config = { api: { bodyParser: false } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature']!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'account.updated':
      const account = event.data.object as Stripe.Account;
      await supabase
        .from('practitioners')
        .update({
          stripe_account_status: account.charges_enabled ? 'active' : 'pending',
          stripe_onboarding_completed: account.details_submitted,
          stripe_charges_enabled: account.charges_enabled,
          stripe_payouts_enabled: account.payouts_enabled,
        })
        .eq('stripe_account_id', account.id);
      break;

    case 'payment_intent.succeeded':
      const pi = event.data.object as Stripe.PaymentIntent;
      await supabase
        .from('transactions')
        .update({ status: 'succeeded' })
        .eq('stripe_payment_intent_id', pi.id);
      break;
  }

  res.json({ received: true });
}
```

---

### **Route 3: Cron Auto-Validation**

Fichier: `src/pages/api/cron/auto-validate.ts`

```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import { DelayedPaymentService } from '@/services/delayed-payment';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const validated = await DelayedPaymentService.autoValidateAppointments();
    res.status(200).json({ success: true, validated: validated.length, appointments: validated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

---

### **Route 4: Cron Changements Contrat**

Fichier: `src/pages/api/cron/apply-contract-changes.ts`

```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { data: changes } = await supabase.rpc('apply_scheduled_contract_changes');
    res.status(200).json({ success: true, applied: changes?.length || 0, changes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

---

## ⏰ Cron Jobs

### **Configuration Vercel**

Fichier: `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/auto-validate",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/apply-contract-changes",
      "schedule": "0 0 1 * *"
    }
  ]
}
```

- **Auto-validation** : Toutes les heures
- **Changements contrat** : 1er du mois à minuit

---

## ⚙️ Configuration

### **Variables d'Environnement**

Fichier: `.env.local`

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Prix Stripe (créer dans Dashboard)
STRIPE_PRICE_STARTER=price_...  # 49€/mois
STRIPE_PRICE_PRO=price_...      # 99€/mois
STRIPE_PRICE_PREMIUM=price_...  # 159€/mois

# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Sécurité
CRON_SECRET=votre_secret_random

# App
NEXT_PUBLIC_APP_URL=https://votresite.com
```

### **Créer les Prix Stripe**

1. Aller sur https://dashboard.stripe.com/products
2. Créer 3 produits :
   - **STARTER** : 49€/mois récurrent
   - **PRO** : 99€/mois récurrent
   - **PREMIUM** : 159€/mois récurrent
3. Copier les IDs de prix → `.env`

---

## ✅ Checklist Déploiement

### **Phase 1: Base de Données**
- [ ] Appliquer migration SQL 1 (tables)
- [ ] Appliquer migration SQL 2 (fonctions)
- [ ] Tester les fonctions SQL

### **Phase 2: Stripe**
- [ ] Créer les 3 produits + prix
- [ ] Activer Stripe Connect
- [ ] Configurer webhook
- [ ] Ajouter variables env

### **Phase 3: Code**
- [ ] Créer `stripe-connect.ts`
- [ ] Créer `contract-management.ts`
- [ ] Créer `delayed-payment.ts`
- [ ] Créer composants React
- [ ] Créer API routes

### **Phase 4: Tests**
- [ ] Test promotion intervenant
- [ ] Test choix forfait
- [ ] Test paiement RDV
- [ ] Test validation client
- [ ] Test auto-validation
- [ ] Test remboursement

---

## 📝 Notes Importantes

✅ **Stripe gère tout** :
- IBAN de l'intervenant → Collecté pendant onboarding Connect
- SIRET/SIREN → Collecté par Stripe
- Adresse → Collectée par Stripe
- Facturation → Générée automatiquement

✅ **Sécurité** :
- 48h pour gérer litiges
- Remboursement impossible après transfert
- Admin peut intervenir sur disputes

✅ **Simplicité** :
- Aucune facturation manuelle
- Aucune donnée bancaire stockée
- Tout automatisé via Stripe

---

**Document simplifié - Version 2.0**
**Prêt pour développement ! 🚀**
