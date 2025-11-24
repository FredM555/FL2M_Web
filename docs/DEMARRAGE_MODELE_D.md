# 🚀 Démarrage Implémentation Modèle Économique D

**Date de création:** 2025-01-23
**Prêt à démarrer:** 2025-01-24
**Modèle:** Hybride 4 paliers avec 3 RDV gratuits

---

## 📚 Documents à Consulter

Avant de commencer, voici les documents clés créés :

1. **`PROJET_PAIEMENTS_SUIVI.md`** ⭐ **PRINCIPAL**
   - Plan complet sur 10 sprints
   - 120+ tâches détaillées
   - Structure de fichiers à créer
   - Points de contrôle et KPIs

2. **`MODELE_D_3RDV_GRATUITS.md`** ⭐ **TECHNIQUE**
   - Spécifications techniques détaillées
   - Algorithme de calcul de commission
   - Schémas de base de données
   - Templates d'emails

3. **`PAYMENT_MODELS_COMPARISON.md`**
   - Comparaison des 4 modèles
   - Justification du choix du modèle D
   - Simulations de revenus

4. **`STRIPE_IMPLEMENTATION_GUIDE.md`**
   - Guide d'implémentation Stripe Connect
   - Exemples de code
   - Configuration webhooks

---

## 🎯 Sprint 1 : Infrastructure BDD (Semaine 1)

### Priorité 1 : Créer les Tables de Base

#### 1.1 Table `practitioner_contracts` ✅ À FAIRE EN PREMIER

**Fichier à créer:** `supabase/migrations/create_practitioner_contracts.sql`

```sql
CREATE TABLE public.practitioner_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id) ON DELETE CASCADE,
  contract_type VARCHAR(20) NOT NULL CHECK (contract_type IN ('free', 'starter', 'pro', 'premium')),

  -- Configuration du contrat
  monthly_fee DECIMAL(10,2) NOT NULL DEFAULT 0,
  commission_fixed DECIMAL(10,2),
  commission_percentage DECIMAL(5,2),
  commission_cap DECIMAL(10,2),
  max_appointments_per_month INT,

  -- Dates et statut
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'terminated')),

  -- Compteurs
  appointments_this_month INT NOT NULL DEFAULT 0,
  total_appointments INT NOT NULL DEFAULT 0,

  -- Document et notes
  contract_document_url TEXT,
  admin_notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),

  -- Contraintes
  UNIQUE(practitioner_id, start_date),
  CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Index
CREATE INDEX idx_contracts_practitioner ON public.practitioner_contracts(practitioner_id);
CREATE INDEX idx_contracts_status ON public.practitioner_contracts(status);
CREATE INDEX idx_contracts_type ON public.practitioner_contracts(contract_type);

-- Fonction de mise à jour automatique du timestamp
CREATE OR REPLACE FUNCTION update_contracts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_contracts_timestamp
  BEFORE UPDATE ON public.practitioner_contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_contracts_updated_at();

-- Données initiales pour les 4 types de contrats
INSERT INTO public.practitioner_contracts (practitioner_id, contract_type, monthly_fee, commission_fixed, commission_percentage, commission_cap, max_appointments_per_month)
VALUES
  -- Exemples à adapter selon vos intervenants existants
  -- Ces lignes sont des exemples, à supprimer ou adapter
  ('UUID_INTERVENANT_1', 'free', 0, 10, 12, 25, NULL),
  ('UUID_INTERVENANT_2', 'starter', 60, 6, 8, NULL, 15),
  ('UUID_INTERVENANT_3', 'pro', 100, 3, NULL, NULL, NULL),
  ('UUID_INTERVENANT_4', 'premium', 180, 0, NULL, NULL, NULL);
```

**Actions après création:**
- [ ] Créer le fichier SQL
- [ ] Appliquer la migration via Supabase Dashboard
- [ ] Vérifier que la table existe : `SELECT * FROM practitioner_contracts LIMIT 5;`

---

#### 1.2 Table `transactions` ✅ À FAIRE EN DEUXIÈME

**Fichier à créer:** `supabase/migrations/create_transactions.sql`

```sql
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relations
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES public.practitioners(id),
  client_id UUID NOT NULL REFERENCES auth.users(id),

  -- Identifiants Stripe
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  stripe_charge_id VARCHAR(255),
  stripe_transfer_id VARCHAR(255),

  -- Montants (en euros, 2 décimales)
  amount_total DECIMAL(10,2) NOT NULL, -- Prix total payé par le client
  amount_practitioner DECIMAL(10,2) NOT NULL, -- Part nette de l'intervenant
  amount_platform_commission DECIMAL(10,2) NOT NULL, -- Commission plateforme
  amount_stripe_fees DECIMAL(10,2) NOT NULL DEFAULT 0, -- Frais Stripe

  -- Détails de la commission
  commission_type VARCHAR(20), -- 'free', 'starter', 'pro', 'premium'
  is_free_appointment BOOLEAN DEFAULT FALSE, -- Si c'est un des 3 RDV gratuits
  appointment_number INT, -- Numéro du RDV pour l'intervenant (1, 2, 3, 4+)

  -- Statut
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded', 'cancelled')),

  -- Dates
  payment_date TIMESTAMPTZ,
  transfer_date TIMESTAMPTZ,
  refund_date TIMESTAMPTZ,

  -- Métadonnées
  currency VARCHAR(3) DEFAULT 'EUR',
  description TEXT,
  failure_reason TEXT,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Contraintes
  CHECK (amount_total >= 0),
  CHECK (amount_practitioner >= 0),
  CHECK (amount_platform_commission >= 0)
);

-- Index
CREATE INDEX idx_transactions_appointment ON public.transactions(appointment_id);
CREATE INDEX idx_transactions_practitioner ON public.transactions(practitioner_id);
CREATE INDEX idx_transactions_client ON public.transactions(client_id);
CREATE INDEX idx_transactions_status ON public.transactions(status);
CREATE INDEX idx_transactions_payment_date ON public.transactions(payment_date);
CREATE INDEX idx_transactions_stripe_pi ON public.transactions(stripe_payment_intent_id);

-- Trigger de mise à jour
CREATE TRIGGER trigger_update_transactions_timestamp
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_contracts_updated_at();
```

**Actions après création:**
- [ ] Créer le fichier SQL
- [ ] Appliquer la migration
- [ ] Vérifier : `SELECT * FROM transactions LIMIT 5;`

---

#### 1.3 Table `payouts` (Virements aux Intervenants)

**Fichier à créer:** `supabase/migrations/create_payouts.sql`

Voir détails complets dans `PROJET_PAIEMENTS_SUIVI.md` Sprint 1, Tâche 1.3

---

#### 1.4 Table `invoices` (Factures)

**Fichier à créer:** `supabase/migrations/create_invoices.sql`

Voir détails complets dans `PROJET_PAIEMENTS_SUIVI.md` Sprint 1, Tâche 1.4

---

## 🔧 Sprint 2 : Calculateur de Commission (Semaine 2)

### Priorité 2 : Fonction SQL de Calcul

**Fichier à créer:** `supabase/migrations/create_commission_calculator.sql`

```sql
-- Fonction de calcul de commission selon le modèle D avec 3 RDV gratuits
CREATE OR REPLACE FUNCTION calculate_commission(
  p_practitioner_id UUID,
  p_appointment_price DECIMAL,
  p_appointment_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  commission_amount DECIMAL,
  practitioner_amount DECIMAL,
  is_free BOOLEAN,
  appointment_number INT,
  contract_type VARCHAR
) AS $$
DECLARE
  v_contract RECORD;
  v_total_appointments INT;
  v_commission DECIMAL;
  v_is_free BOOLEAN := FALSE;
BEGIN
  -- Récupérer le contrat actif
  SELECT *
  INTO v_contract
  FROM practitioner_contracts
  WHERE practitioner_id = p_practitioner_id
    AND status = 'active'
    AND start_date <= p_appointment_date
    AND (end_date IS NULL OR end_date >= p_appointment_date)
  ORDER BY start_date DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Aucun contrat actif trouvé pour cet intervenant';
  END IF;

  -- Compter le nombre total de RDV (inclut celui-ci)
  SELECT COUNT(*) + 1
  INTO v_total_appointments
  FROM appointments
  WHERE practitioner_id = p_practitioner_id
    AND status NOT IN ('cancelled')
    AND created_at < NOW();

  -- 3 premiers RDV gratuits pour TOUS
  IF v_total_appointments <= 3 THEN
    v_commission := 0;
    v_is_free := TRUE;
  ELSE
    -- Calcul selon le type de contrat
    CASE v_contract.contract_type
      WHEN 'free' THEN
        -- max(10€, 12% du prix), plafonné à 25€
        v_commission := GREATEST(10, p_appointment_price * 0.12);
        v_commission := LEAST(v_commission, 25);

      WHEN 'starter' THEN
        -- min(6€, 8% du prix)
        v_commission := LEAST(6, p_appointment_price * 0.08);

      WHEN 'pro' THEN
        -- 3€ fixe
        v_commission := 3;

      WHEN 'premium' THEN
        -- 0€
        v_commission := 0;

      ELSE
        RAISE EXCEPTION 'Type de contrat inconnu: %', v_contract.contract_type;
    END CASE;
  END IF;

  -- Retourner les résultats
  RETURN QUERY SELECT
    v_commission AS commission_amount,
    (p_appointment_price - v_commission) AS practitioner_amount,
    v_is_free,
    v_total_appointments AS appointment_number,
    v_contract.contract_type;
END;
$$ LANGUAGE plpgsql;
```

**Test de la fonction:**

```sql
-- Tester avec différents scénarios
SELECT * FROM calculate_commission('UUID_INTERVENANT', 60.00); -- 1er RDV = gratuit
SELECT * FROM calculate_commission('UUID_INTERVENANT', 80.00); -- 4ème RDV = commission
```

---

## 🎨 Sprint 3 : Interface Admin (Semaine 3)

### Priorité 3 : Page de Gestion des Contrats

**Fichiers à créer:**

1. `src/pages/admin/PractitionerContractsPage.tsx`
2. `src/components/admin/ContractForm.tsx`
3. `src/components/admin/ContractsList.tsx`
4. `src/services/contracts.ts`

**Fonctionnalités:**
- [ ] Liste de tous les intervenants avec leur contrat actuel
- [ ] Formulaire d'assignation/modification de contrat
- [ ] Upload du document de contrat PDF
- [ ] Historique des contrats par intervenant
- [ ] Statistiques : nb d'intervenants par type de contrat

Voir détails complets dans `PROJET_PAIEMENTS_SUIVI.md` Sprint 3

---

## 📋 Checklist de Démarrage Rapide

### Jour 1 (Demain)

- [ ] **Lire** `PROJET_PAIEMENTS_SUIVI.md` (Sprint 1)
- [ ] **Lire** `MODELE_D_3RDV_GRATUITS.md` (sections 1-3)
- [ ] **Créer** la migration `create_practitioner_contracts.sql`
- [ ] **Appliquer** la migration sur Supabase
- [ ] **Vérifier** que la table existe et fonctionne

### Jour 2

- [ ] **Créer** la migration `create_transactions.sql`
- [ ] **Créer** la migration `create_payouts.sql`
- [ ] **Créer** la migration `create_invoices.sql`
- [ ] **Appliquer** toutes les migrations
- [ ] **Tester** les contraintes et index

### Jour 3

- [ ] **Créer** la fonction SQL `calculate_commission()`
- [ ] **Tester** la fonction avec différents scénarios
- [ ] **Documenter** les cas d'usage

### Semaine 2

- [ ] **Créer** `src/services/contracts.ts`
- [ ] **Créer** l'interface admin de gestion des contrats
- [ ] **Tester** l'assignation de contrats

---

## 🔑 Informations Importantes

### Rappel du Modèle D

```
┌─────────────────────────────────────────────────────────┐
│ TOUS LES INTERVENANTS                                   │
├─────────────────────────────────────────────────────────┤
│ 3 PREMIERS RDV: GRATUITS (0€ commission)                │
└─────────────────────────────────────────────────────────┘

Puis selon le contrat:

FREE (0€/mois):        10€/RDV OU 12% (le + élevé), max 25€
STARTER (60€/mois):    6€/RDV OU 8% (le - élevé), max 15 RDV/mois
PRO (100€/mois):       3€/RDV fixe, illimité
PREMIUM (180€/mois):   0€/RDV, illimité
```

### Workflow Onboarding Intervenant

```
1. Utilisateur remplit formulaire contact
   → Email automatique à contact@fl2m.fr

2. Admin contacte le candidat (OFF-SITE)
   → Entretien, négociation

3. Signature contrat (OFF-SITE)
   → Contrat papier ou électronique

4. Admin se connecte à l'interface
   → Promote user vers "intervenant"
   → Assigne type de contrat (free/starter/pro/premium)
   → Upload PDF du contrat signé

5. Intervenant activé
   → Peut créer ses services
   → Peut gérer son calendrier
   → Commence à recevoir des réservations
```

---

## 📞 Ressources et Aide

### Documentation Stripe

- **Stripe Connect:** https://stripe.com/docs/connect
- **Payment Intents:** https://stripe.com/docs/payments/payment-intents
- **Webhooks:** https://stripe.com/docs/webhooks

### Fichiers Clés du Projet

```
docs/
  ├── PROJET_PAIEMENTS_SUIVI.md        ⭐ Plan complet
  ├── MODELE_D_3RDV_GRATUITS.md        ⭐ Specs techniques
  ├── PAYMENT_MODELS_COMPARISON.md      Comparaison
  └── STRIPE_IMPLEMENTATION_GUIDE.md    Guide Stripe

supabase/migrations/
  ├── create_practitioner_contracts.sql  À créer
  ├── create_transactions.sql            À créer
  ├── create_payouts.sql                 À créer
  ├── create_invoices.sql                À créer
  └── create_commission_calculator.sql   À créer

src/
  ├── services/
  │   ├── contracts.ts                   À créer
  │   ├── payments.ts                    À créer
  │   └── stripe.ts                      À créer
  └── pages/admin/
      └── PractitionerContractsPage.tsx  À créer
```

---

## 🎯 Objectifs Semaine 1

### Livrables Attendus

✅ **Infrastructure BDD complète**
- 4 tables créées et testées
- Contraintes et index opérationnels
- Données de test insérées

✅ **Fonction de calcul opérationnelle**
- Calcul correct pour les 4 types de contrats
- Gestion des 3 RDV gratuits
- Tests unitaires passés

✅ **Documentation à jour**
- Schémas de BDD documentés
- Exemples d'utilisation

### Critères de Succès

- [ ] Toutes les migrations appliquées sans erreur
- [ ] Tests de calcul de commission OK pour tous les cas
- [ ] Aucune régression sur les fonctionnalités existantes
- [ ] Commit git avec message descriptif

---

## 🚨 Points d'Attention

### Sécurité

⚠️ **IMPORTANT:** Les montants sont en EUR avec 2 décimales
⚠️ **IMPORTANT:** Toujours valider que le contrat est actif
⚠️ **IMPORTANT:** Ne jamais exposer les clés Stripe côté client

### Données Sensibles

🔒 Ne pas commiter les clés Stripe dans le code
🔒 Utiliser des variables d'environnement (.env)
🔒 Activer RLS (Row Level Security) sur toutes les tables

### Tests

🧪 Tester tous les cas limites:
- RDV #1, #2, #3 (gratuits)
- RDV #4+ avec chaque type de contrat
- Prix très bas (ex: 10€) et très haut (ex: 300€)
- Contrats expirés ou inactifs

---

## 💬 Besoin d'Aide ?

Lorsque vous reprenez le travail demain, dites simplement:

**"Je commence le Sprint 1 du Modèle D"**

Et je vous guiderai étape par étape à travers les migrations et l'implémentation !

---

**Bon courage pour demain ! 🚀**

_Document créé le 2025-01-23 par Claude Code_
