# Documentation des Migrations - Sprint 1 Modèle D

**Date:** 2025-01-25
**Sprint:** 1 - Infrastructure Base de Données
**Statut:** ✅ Prêt à appliquer

---

## 📋 Vue d'ensemble

Ce sprint implémente l'infrastructure de base de données complète pour le système de paiement avec le Modèle D (4 paliers avec 3 RDV gratuits).

### Migrations créées

1. **create_practitioner_contracts.sql** - Contrats des praticiens
2. **create_transactions.sql** - Transactions de paiement
3. **create_payouts.sql** - Virements aux praticiens
4. **create_invoices.sql** - Factures (clients et praticiens)
5. **create_commission_calculator.sql** - Fonction de calcul de commission

---

## 🗄️ Schéma des Tables

### 1. practitioner_contracts

Table principale pour gérer les contrats des praticiens avec les 4 types de paliers.

**Colonnes principales:**
- `contract_type`: 'free', 'starter', 'pro', 'premium'
- `monthly_fee`: Frais mensuels (0, 60, 100, ou 180€)
- `commission_fixed`: Commission fixe par RDV
- `commission_percentage`: Commission en pourcentage
- `commission_cap`: Plafond de commission
- `max_appointments_per_month`: Limite de RDV/mois (NULL = illimité)
- `appointments_this_month`: Compteur mensuel
- `total_appointments`: Compteur total

**Relations:**
- `practitioner_id` → `practitioners(id)` (CASCADE)

**Index créés:**
- Sur practitioner_id, status, contract_type, dates

---

### 2. transactions

Table des transactions de paiement avec intégration Stripe.

**Colonnes principales:**
- `appointment_id`: Référence au RDV
- `practitioner_id`: Praticien concerné
- `client_id`: Client payeur
- `stripe_payment_intent_id`: ID Stripe unique
- `amount_total`: Montant total payé par le client
- `amount_practitioner`: Part nette du praticien
- `amount_platform_commission`: Commission de la plateforme
- `amount_stripe_fees`: Frais Stripe
- `is_free_appointment`: Si c'est un des 3 RDV gratuits
- `appointment_number`: Numéro séquentiel du RDV
- `status`: 'pending', 'processing', 'succeeded', 'failed', 'refunded', 'cancelled'

**Relations:**
- `appointment_id` → `appointments(id)` (CASCADE)
- `practitioner_id` → `practitioners(id)`
- `client_id` → `auth.users(id)`

**Index créés:**
- Sur appointment_id, practitioner_id, client_id, status, payment_date, stripe_payment_intent_id

---

### 3. payouts

Table des virements effectués aux praticiens.

**Colonnes principales:**
- `practitioner_id`: Praticien bénéficiaire
- `stripe_payout_id`: ID du virement Stripe
- `period_start_date` / `period_end_date`: Période couverte
- `amount_total`: Montant total du virement
- `transaction_count`: Nombre de transactions incluses
- `scheduled_date`: Date prévue (J+7)
- `paid_date`: Date effective du paiement
- `status`: 'pending', 'processing', 'paid', 'failed', 'cancelled'

**Table associée:**
- `payout_transactions`: Liaison N-N entre payouts et transactions

**Relations:**
- `practitioner_id` → `practitioners(id)`

**Index créés:**
- Sur practitioner_id, status, scheduled_date, paid_date, period

---

### 4. invoices

Table des factures (clients, praticiens, plateforme).

**Colonnes principales:**
- `invoice_number`: Numéro unique auto-généré (INV-2025-0001, PRV-2025-0001)
- `invoice_type`: 'client', 'practitioner', 'platform'
- `transaction_id`: Pour factures clients
- `payout_id`: Pour factures praticiens
- `amount_subtotal`: Montant HT
- `amount_tax`: TVA
- `amount_total`: Montant TTC
- `line_items`: Détails en JSON
- `pdf_url`: Lien vers le PDF généré
- `status`: 'draft', 'issued', 'paid', 'cancelled', 'refunded'

**Fonctions automatiques:**
- Génération automatique du numéro de facture
- Format: {PRÉFIXE}-{ANNÉE}-{NUMÉRO}

**Relations:**
- `transaction_id` → `transactions(id)`
- `payout_id` → `payouts(id)`
- `client_id` → `auth.users(id)`
- `practitioner_id` → `practitioners(id)`

**Index créés:**
- Sur invoice_number, type, transaction_id, payout_id, client_id, practitioner_id, status, issue_date

---

## 🔧 Fonctions SQL Créées

### calculate_commission(practitioner_id, price, date)

Fonction principale de calcul de commission selon le Modèle D.

**Paramètres:**
- `p_practitioner_id` (UUID): ID du praticien
- `p_appointment_price` (DECIMAL): Prix du RDV
- `p_appointment_date` (DATE): Date du RDV (défaut: aujourd'hui)

**Retour:**
```sql
TABLE (
  commission_amount DECIMAL,     -- Montant de la commission
  practitioner_amount DECIMAL,   -- Montant net pour le praticien
  is_free BOOLEAN,              -- Si c'est un RDV gratuit (1-3)
  appointment_number INT,        -- Numéro du RDV
  contract_type VARCHAR          -- Type de contrat actif
)
```

**Logique:**
1. Les 3 premiers RDV sont GRATUITS (commission = 0€)
2. À partir du RDV #4:
   - **FREE**: max(10€, 12% du prix), plafonné à 25€
   - **STARTER**: min(6€, 8% du prix)
   - **PRO**: 3€ fixe
   - **PREMIUM**: 0€

**Exemple d'utilisation:**
```sql
-- Calculer la commission pour un RDV de 60€
SELECT * FROM calculate_commission('uuid-du-praticien', 60.00);

-- Résultat possible:
-- commission_amount | practitioner_amount | is_free | appointment_number | contract_type
-- 3.00              | 57.00              | false   | 5                  | pro
```

---

### count_practitioner_appointments(practitioner_id, include_cancelled)

Compte le nombre de RDV d'un praticien.

**Paramètres:**
- `p_practitioner_id` (UUID)
- `p_include_cancelled` (BOOLEAN): Inclure les annulés (défaut: FALSE)

**Retour:** INT

---

### has_free_appointments_remaining(practitioner_id)

Vérifie si un praticien a encore des RDV gratuits (< 3 RDV).

**Paramètres:**
- `p_practitioner_id` (UUID)

**Retour:** BOOLEAN

---

## 📦 Ordre d'Application des Migrations

**IMPORTANT:** Appliquer les migrations dans cet ordre exact:

```bash
1. create_practitioner_contracts.sql
2. create_transactions.sql
3. create_payouts.sql
4. create_invoices.sql
5. create_commission_calculator.sql
```

---

## 🚀 Comment Appliquer les Migrations

### Option 1: Via Supabase Dashboard (Recommandé)

1. Connectez-vous à Supabase Dashboard
2. Allez dans **Database** → **SQL Editor**
3. Pour chaque fichier de migration (dans l'ordre):
   - Ouvrez le fichier SQL
   - Copiez tout le contenu
   - Collez dans l'éditeur SQL
   - Cliquez sur **RUN** (▶️)
   - Vérifiez qu'il n'y a pas d'erreurs

### Option 2: Via Supabase CLI

```bash
# Assurez-vous d'être dans le dossier du projet
cd C:\FLM\flm-services-new

# Appliquer toutes les migrations
npx supabase db push

# Ou appliquer une migration spécifique
npx supabase db execute --file supabase/migrations/create_practitioner_contracts.sql
```

### Option 3: Via psql

```bash
psql -h db.xxx.supabase.co -U postgres -d postgres -f supabase/migrations/create_practitioner_contracts.sql
```

---

## ✅ Vérifications Post-Migration

Après avoir appliqué toutes les migrations, exécutez ces requêtes pour vérifier:

```sql
-- 1. Vérifier que toutes les tables existent
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'practitioner_contracts',
    'transactions',
    'payouts',
    'payout_transactions',
    'invoices'
  )
ORDER BY table_name;
-- Devrait retourner 5 lignes

-- 2. Vérifier les fonctions
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%commission%'
ORDER BY routine_name;
-- Devrait retourner calculate_commission, count_practitioner_appointments, has_free_appointments_remaining

-- 3. Vérifier les index
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('practitioner_contracts', 'transactions', 'payouts', 'invoices')
ORDER BY tablename, indexname;

-- 4. Vérifier les triggers
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

---

## 🧪 Tests de Base

### Test 1: Créer un contrat de test

```sql
-- Insérer un contrat FREE pour un praticien existant
INSERT INTO practitioner_contracts (
  practitioner_id,
  contract_type,
  monthly_fee,
  commission_fixed,
  commission_percentage,
  commission_cap
) VALUES (
  'uuid-d-un-praticien-existant',
  'free',
  0,
  10,
  12,
  25
);
```

### Test 2: Tester le calcul de commission

```sql
-- Simuler le calcul pour différents scénarios
-- RDV #1 (devrait être gratuit)
SELECT * FROM calculate_commission('uuid-du-praticien', 60.00);

-- Résultat attendu:
-- commission_amount: 0.00
-- is_free: true
-- appointment_number: 1
```

### Test 3: Vérifier les contraintes

```sql
-- Test: On ne peut pas créer une transaction avec un montant négatif
INSERT INTO transactions (
  appointment_id,
  practitioner_id,
  client_id,
  amount_total,
  amount_practitioner,
  amount_platform_commission
) VALUES (
  gen_random_uuid(),
  'uuid-praticien',
  'uuid-client',
  -50.00, -- Devrait échouer
  -45.00,
  -5.00
);
-- Devrait retourner une erreur de contrainte CHECK
```

---

## 📊 Diagramme de Relations

```
practitioners
    ↑
    |
practitioner_contracts ← (contrat actif)
    |
    |
    ↓
appointments → transactions → payout_transactions → payouts
    |              |                                    |
    |              ↓                                    ↓
    |          invoices (client)               invoices (practitioner)
    |
    ↓
clients (auth.users)
```

---

## 🔐 Sécurité et Permissions (RLS)

**TODO pour Sprint 2:**
- Activer Row Level Security (RLS) sur toutes les tables
- Créer les policies pour:
  - Admins: accès complet
  - Praticiens: lecture de leurs propres contrats, transactions, payouts
  - Clients: lecture de leurs propres transactions et factures

---

## 📝 Prochaines Étapes

### Sprint 2: Services Backend
- [ ] Créer `src/types/payments.ts`
- [ ] Créer `src/services/commission-calculator.ts` (wrapper TypeScript)
- [ ] Créer `src/services/contracts.ts`
- [ ] Tests unitaires du calculateur

### Sprint 3: Interface Admin
- [ ] Page de gestion des contrats
- [ ] Formulaire d'assignation de contrat
- [ ] Upload de documents PDF

---

## 🐛 Problèmes Connus et Solutions

### Problème: Fonction calculate_commission retourne une erreur

**Solution:**
- Vérifier qu'un contrat actif existe pour le praticien
- Vérifier que le type de contrat est valide ('free', 'starter', 'pro', 'premium')

### Problème: Conflit de numéro de facture

**Solution:**
- La fonction `generate_invoice_number()` génère automatiquement un numéro unique
- En cas de conflit, relancer la transaction

---

## 📞 Support

Pour toute question ou problème:
1. Consulter `docs/PROJET_PAIEMENTS_SUIVI.md`
2. Consulter `docs/MODELE_D_3RDV_GRATUITS.md`
3. Vérifier les logs Supabase

---

**Document créé le:** 2025-01-25
**Dernière mise à jour:** 2025-01-25
**Version:** 1.0
