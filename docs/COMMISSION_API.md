# API de Calcul de Commission - Documentation

**Date:** 2025-01-25
**Version:** 1.0
**Sprint:** 2 - Services Backend

---

## 📋 Vue d'ensemble

Cette documentation décrit l'API TypeScript pour le calcul de commission selon le Modèle D avec 3 RDV gratuits. Les services sont utilisables côté client (React) et communiquent avec Supabase.

---

## 📦 Services Disponibles

### 1. CommissionCalculator
### 2. ContractsService
### 3. AppointmentCounter

---

## 1️⃣ CommissionCalculator

Service principal de calcul de commission avec support du Modèle D.

### Import

```typescript
import { CommissionCalculator } from '@/services/commission-calculator';
```

---

### Méthodes Principales

#### `calculateCommission()`

Calcule la commission pour un RDV en utilisant la fonction SQL Supabase.

```typescript
static async calculateCommission(
  practitionerId: string,
  appointmentPrice: number,
  appointmentDate?: string
): Promise<CommissionCalculationResult>
```

**Paramètres:**
- `practitionerId`: UUID du praticien
- `appointmentPrice`: Prix du RDV en euros
- `appointmentDate`: Date du RDV (optionnel, par défaut aujourd'hui)

**Retour:**
```typescript
{
  commission_amount: number;     // Montant de la commission en €
  practitioner_amount: number;   // Montant net pour le praticien en €
  is_free: boolean;             // true si RDV 1-3
  appointment_number: number;    // Numéro séquentiel du RDV
  contract_type: ContractType;   // Type de contrat actif
}
```

**Exemple:**
```typescript
const result = await CommissionCalculator.calculateCommission(
  'uuid-praticien',
  60.00
);

console.log(result);
// {
//   commission_amount: 3,
//   practitioner_amount: 57,
//   is_free: false,
//   appointment_number: 5,
//   contract_type: 'pro'
// }
```

**Erreurs:**
- Lève une exception si aucun contrat actif n'est trouvé
- Lève une exception si la requête Supabase échoue

---

#### `calculateCommissionLocal()`

Calcule la commission localement (sans appel SQL). Utile pour les simulations et tests.

```typescript
static calculateCommissionLocal(
  appointmentNumber: number,
  appointmentPrice: number,
  contractType: ContractType
): CommissionCalculationResult
```

**Exemple:**
```typescript
const result = CommissionCalculator.calculateCommissionLocal(
  4, // 4ème RDV
  60,
  'free'
);

console.log(result.commission_amount); // 10 (max(10, 60*0.12))
```

---

#### `simulateCommission()`

Simule le calcul de commission pour différents scénarios de RDV.

```typescript
static simulateCommission(
  appointmentPrice: number,
  contractType: ContractType,
  appointmentNumbers?: number[]
): CommissionCalculationResult[]
```

**Exemple:**
```typescript
const simulations = CommissionCalculator.simulateCommission(
  60,
  'free',
  [1, 2, 3, 4, 5, 10, 20]
);

simulations.forEach(sim => {
  console.log(`RDV #${sim.appointment_number}: ${sim.commission_amount}€`);
});
// RDV #1: 0€
// RDV #2: 0€
// RDV #3: 0€
// RDV #4: 10€
// RDV #5: 10€
// ...
```

---

#### `estimateMonthlyRevenue()`

Estime les revenus mensuels d'un praticien selon son contrat.

```typescript
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
}
```

**Exemple:**
```typescript
const estimate = CommissionCalculator.estimateMonthlyRevenue(
  15, // 15 RDV/mois
  80, // Prix moyen 80€
  'pro'
);

console.log(estimate);
// {
//   gross_revenue: 1200,
//   monthly_fee: 100,
//   total_commission: 36,
//   net_revenue: 1064,
//   effective_commission_rate: 11.33
// }
```

---

#### `compareAllContracts()`

Compare tous les types de contrats pour un scénario donné.

```typescript
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
}>
```

**Exemple:**
```typescript
const comparison = CommissionCalculator.compareAllContracts(10, 60);

comparison.forEach(c => {
  console.log(`${c.contract_type}: ${c.total_cost}€ total, net: ${c.net_revenue}€`);
});
```

---

#### `calculateBreakEvenPoint()`

Calcule le point d'équilibre entre deux types de contrats.

```typescript
static calculateBreakEvenPoint(
  appointmentPrice: number,
  contractType1: ContractType,
  contractType2: ContractType,
  maxAppointments?: number
): {
  breakEvenAppointments: number | null;
  comparison: Array<{
    appointments: number;
    cost1: number;
    cost2: number;
    difference: number;
  }>;
}
```

**Exemple:**
```typescript
const breakeven = CommissionCalculator.calculateBreakEvenPoint(
  60,
  'free',
  'pro',
  20
);

console.log(`Point d'équilibre: ${breakeven.breakEvenAppointments} RDV/mois`);
```

---

#### `getPractitionerCommissionStats()`

Récupère les statistiques de commission d'un praticien.

```typescript
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
}>
```

**Exemple:**
```typescript
const stats = await CommissionCalculator.getPractitionerCommissionStats(
  'uuid-praticien',
  '2025-01-01',
  '2025-01-31'
);

console.log(`Total commission: ${stats.total_commission}€`);
```

---

## 2️⃣ ContractsService

Service de gestion des contrats praticiens.

### Import

```typescript
import { ContractsService } from '@/services/contracts';
```

---

### Méthodes Principales

#### `getActiveContract()`

Récupère le contrat actif d'un praticien.

```typescript
static async getActiveContract(
  practitionerId: string
): Promise<PractitionerContract | null>
```

**Exemple:**
```typescript
const contract = await ContractsService.getActiveContract('uuid-praticien');

if (contract) {
  console.log(`Type: ${contract.contract_type}`);
  console.log(`RDV ce mois: ${contract.appointments_this_month}`);
}
```

---

#### `createContract()`

Crée un nouveau contrat pour un praticien.

```typescript
static async createContract(
  contractData: CreateContractData,
  userId: string
): Promise<PractitionerContract | null>
```

**Exemple:**
```typescript
const newContract = await ContractsService.createContract(
  {
    practitioner_id: 'uuid-praticien',
    contract_type: 'pro',
    start_date: '2025-01-01',
    admin_notes: 'Contrat négocié le 15/12/2024'
  },
  'uuid-admin'
);
```

---

#### `updateContract()`

Met à jour un contrat existant.

```typescript
static async updateContract(
  contractId: string,
  updates: UpdateContractData,
  userId: string
): Promise<PractitionerContract | null>
```

**Exemple:**
```typescript
await ContractsService.updateContract(
  'uuid-contrat',
  {
    contract_type: 'premium',
    admin_notes: 'Upgrade suite à succès'
  },
  'uuid-admin'
);
```

---

#### `canPractitionerBookAppointment()`

Vérifie si un praticien peut prendre un nouveau RDV (limite starter).

```typescript
static async canPractitionerBookAppointment(
  practitionerId: string
): Promise<{ can_book: boolean; reason?: string }>
```

**Exemple:**
```typescript
const check = await ContractsService.canPractitionerBookAppointment('uuid-praticien');

if (!check.can_book) {
  alert(`Impossible de réserver: ${check.reason}`);
}
```

---

#### `incrementAppointmentCount()`

Incrémente le compteur de RDV d'un contrat.

```typescript
static async incrementAppointmentCount(
  practitionerId: string
): Promise<void>
```

**Utilisation:** Appelé automatiquement après chaque nouveau RDV confirmé.

---

#### `getContractsStatistics()`

Récupère les statistiques globales des contrats.

```typescript
static async getContractsStatistics(): Promise<{
  total: number;
  by_type: Record<ContractType, number>;
  active: number;
  suspended: number;
  terminated: number;
}>
```

**Exemple:**
```typescript
const stats = await ContractsService.getContractsStatistics();

console.log(`Total contrats: ${stats.total}`);
console.log(`Contrats PRO: ${stats.by_type.pro}`);
```

---

## 3️⃣ AppointmentCounter

Service de comptage des rendez-vous.

### Import

```typescript
import { AppointmentCounter } from '@/services/appointment-counter';
```

---

### Méthodes Principales

#### `countPractitionerAppointments()`

Compte le nombre total de RDV d'un praticien.

```typescript
static async countPractitionerAppointments(
  practitionerId: string,
  includeCancelled?: boolean
): Promise<number>
```

**Exemple:**
```typescript
const count = await AppointmentCounter.countPractitionerAppointments('uuid-praticien');
console.log(`Total RDV: ${count}`);
```

---

#### `hasFreeAppointmentsRemaining()`

Vérifie si un praticien a encore des RDV gratuits.

```typescript
static async hasFreeAppointmentsRemaining(
  practitionerId: string
): Promise<boolean>
```

**Exemple:**
```typescript
const hasFree = await AppointmentCounter.hasFreeAppointmentsRemaining('uuid-praticien');

if (hasFree) {
  console.log('Ce RDV sera gratuit (0€ commission)');
}
```

---

#### `getNextAppointmentNumber()`

Récupère le numéro du prochain RDV pour un praticien.

```typescript
static async getNextAppointmentNumber(
  practitionerId: string
): Promise<number>
```

**Exemple:**
```typescript
const nextNumber = await AppointmentCounter.getNextAppointmentNumber('uuid-praticien');
console.log(`Prochain RDV: #${nextNumber}`);
```

---

#### `getPractitionerAppointmentStats()`

Récupère des statistiques détaillées sur les RDV.

```typescript
static async getPractitionerAppointmentStats(
  practitionerId: string
): Promise<{
  total: number;
  completed: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  this_month: number;
  this_year: number;
  free_remaining: boolean;
}>
```

**Exemple:**
```typescript
const stats = await AppointmentCounter.getPractitionerAppointmentStats('uuid-praticien');

console.log(`RDV ce mois: ${stats.this_month}`);
console.log(`RDV gratuits restants: ${stats.free_remaining ? 'Oui' : 'Non'}`);
```

---

## 🧪 Tests Unitaires

Les tests sont disponibles dans `src/services/__tests__/commission-calculator.test.ts`.

### Exécuter les tests

```bash
npm run test
# ou
npm run test:watch
```

### Couverture des tests

Les tests couvrent :
- ✅ Les 3 premiers RDV gratuits (tous contrats)
- ✅ Calcul FREE: max(10€, 12%), plafonné à 25€
- ✅ Calcul STARTER: min(6€, 8%)
- ✅ Calcul PRO: 3€ fixe
- ✅ Calcul PREMIUM: 0€
- ✅ Simulations et estimations
- ✅ Points d'équilibre
- ✅ Cas limites (prix 0, décimales, etc.)

---

## 🔐 Sécurité

### Permissions requises

Les services communiquent avec Supabase et nécessitent :

1. **Lecture des contrats:** Praticien peut voir ses propres contrats
2. **Création/Modification de contrats:** Admin uniquement
3. **Lecture des transactions:** Praticien voit ses transactions, Admin voit tout
4. **Calcul de commission:** Accessible à tous (utilise RLS sur la fonction SQL)

### RLS (Row Level Security)

À configurer sur Supabase :

```sql
-- Praticiens peuvent lire leurs propres contrats
CREATE POLICY "Praticiens can read own contracts"
ON practitioner_contracts FOR SELECT
USING (practitioner_id IN (
  SELECT id FROM practitioners WHERE user_id = auth.uid()
));

-- Admins peuvent tout gérer
CREATE POLICY "Admins can manage all contracts"
ON practitioner_contracts FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);
```

---

## 📊 Exemples d'Utilisation Réels

### Exemple 1 : Calculer la commission lors d'une réservation

```typescript
async function processAppointmentPayment(
  appointmentId: string,
  practitionerId: string,
  price: number
) {
  // 1. Calculer la commission
  const commission = await CommissionCalculator.calculateCommission(
    practitionerId,
    price
  );

  // 2. Créer la transaction
  const transaction = await supabase
    .from('transactions')
    .insert({
      appointment_id: appointmentId,
      practitioner_id: practitionerId,
      amount_total: price,
      amount_platform_commission: commission.commission_amount,
      amount_practitioner: commission.practitioner_amount,
      is_free_appointment: commission.is_free,
      appointment_number: commission.appointment_number,
      commission_type: commission.contract_type,
    });

  // 3. Incrémenter le compteur
  await ContractsService.incrementAppointmentCount(practitionerId);

  return transaction;
}
```

---

### Exemple 2 : Afficher les options de contrat à un praticien

```typescript
function PractitionerContractComparison() {
  const [comparison, setComparison] = useState([]);

  useEffect(() => {
    // Comparer les contrats pour 15 RDV à 75€
    const data = CommissionCalculator.compareAllContracts(15, 75);
    setComparison(data);
  }, []);

  return (
    <div>
      {comparison.map(contract => (
        <div key={contract.contract_type}>
          <h3>{getContractTypeLabel(contract.contract_type)}</h3>
          <p>Abonnement: {contract.monthly_fee}€</p>
          <p>Commissions: {contract.total_commission}€</p>
          <p>Coût total: {contract.total_cost}€</p>
          <p>Revenu net: {contract.net_revenue}€</p>
        </div>
      ))}
    </div>
  );
}
```

---

### Exemple 3 : Dashboard praticien

```typescript
async function PractitionerDashboard({ practitionerId }: Props) {
  const [stats, setStats] = useState(null);
  const [contract, setContract] = useState(null);

  useEffect(() => {
    async function loadData() {
      const [statsData, contractData] = await Promise.all([
        CommissionCalculator.getPractitionerCommissionStats(practitionerId),
        ContractsService.getActiveContract(practitionerId)
      ]);

      setStats(statsData);
      setContract(contractData);
    }

    loadData();
  }, [practitionerId]);

  if (!stats || !contract) return <div>Chargement...</div>;

  return (
    <div>
      <h2>Mon contrat: {getContractTypeLabel(contract.contract_type)}</h2>
      <p>RDV ce mois: {contract.appointments_this_month}</p>
      <p>Total RDV: {stats.total_appointments}</p>
      <p>RDV gratuits: {stats.free_appointments}</p>
      <p>Commissions totales: {formatAmount(stats.total_commission)}</p>
      <p>Revenu net: {formatAmount(stats.total_practitioner_amount)}</p>
    </div>
  );
}
```

---

## 🚀 Prochaines Étapes

Sprint 3 :
- [ ] Interface admin de gestion des contrats
- [ ] Modal de création/modification de contrat
- [ ] Dashboard praticien avec graphiques

Sprint 4 :
- [ ] Intégration Stripe Checkout
- [ ] Création automatique de transactions

---

**Document créé le:** 2025-01-25
**Dernière mise à jour:** 2025-01-25
**Version:** 1.0
