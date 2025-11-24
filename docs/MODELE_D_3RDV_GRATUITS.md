# 🎁 Modèle D Hybride avec 3 RDV Gratuits - Spécifications Techniques

**Date:** 2025-01-23
**Version:** 1.0

---

## 🎯 Règle Principale : 3 Premiers RDV Gratuits

### Principe
**Tout nouvel intervenant bénéficie de ses 3 premiers rendez-vous SANS COMMISSION.**

À partir du 4ème rendez-vous, la commission s'applique selon le type de contrat signé hors site.

---

## 📊 Grille Tarifaire Finale

### Compteur RDV pour TOUS les Intervenants

```
RDV #1 → Commission : 0€ ✨
RDV #2 → Commission : 0€ ✨
RDV #3 → Commission : 0€ ✨
RDV #4 → Commission selon contrat (Gratuit/Starter/Pro/Premium)
RDV #5+ → Commission selon contrat
```

---

## 💰 Détail des 4 Contrats

### 1. GRATUIT (Sans Abonnement)

**Coût mensuel :** 0€

**Commission :**
- RDV 1-3 : **0€**
- RDV 4+ : **10€/RDV OU 12% du prix (le plus élevé des deux)**
- **Plafond :** 25€/RDV maximum

**Exemples :**
```
RDV 1 (60€) → 0€ commission
RDV 2 (80€) → 0€ commission
RDV 3 (70€) → 0€ commission
RDV 4 (60€) → 10€ commission (max(10, 60×12%) = 10€)
RDV 5 (150€) → 18€ commission (max(10, 150×12%) = 18€)
RDV 6 (300€) → 25€ commission (plafond atteint)
```

---

### 2. STARTER (60€/mois)

**Coût mensuel :** 60€
**Limite :** 15 RDV/mois maximum

**Commission :**
- RDV 1-3 : **0€**
- RDV 4-15 : **6€/RDV OU 8% du prix (le MOINS élevé des deux)**

**Exemples :**
```
RDV 1 (60€) → 0€ commission
RDV 2 (80€) → 0€ commission
RDV 3 (70€) → 0€ commission
RDV 4 (60€) → 4,80€ commission (min(6, 60×8%) = 4,80€)
RDV 5 (100€) → 6€ commission (min(6, 100×8%) = 6€)
RDV 16 (60€) → BLOQUÉ (limite atteinte)
```

**Point d'équilibre vs Gratuit :**
~7 RDV/mois (60€ + 6×6€ = 96€ vs 100€ en gratuit)

---

### 3. PRO (100€/mois) ⭐ RECOMMANDÉ

**Coût mensuel :** 100€
**Limite :** RDV illimités

**Commission :**
- RDV 1-3 : **0€**
- RDV 4+ : **3€/RDV** (frais technique Stripe)

**Exemples :**
```
RDV 1 (60€) → 0€ commission
RDV 2 (80€) → 0€ commission
RDV 3 (70€) → 0€ commission
RDV 4 (60€) → 3€ commission
RDV 5+ (tout prix) → 3€ commission
```

**Point d'équilibre vs Gratuit :**
~10 RDV/mois (100€ + 10×3€ = 130€ vs 140€ en gratuit)

**Bonus :**
- Badge "Pro" sur le profil
- Priorisation dans les résultats de recherche
- Analytics basiques

---

### 4. PREMIUM (180€/mois) 👑 VIP

**Coût mensuel :** 180€
**Limite :** RDV illimités

**Commission :**
- RDV 1-3 : **0€**
- RDV 4+ : **0€**

**Exemples :**
```
RDV 1-∞ (tout prix) → 0€ commission
```

**Point d'équilibre vs Gratuit :**
~18 RDV/mois (180€ vs 180€ en commissions gratuit)

**Bonus :**
- Tout du plan Pro
- Featured sur la homepage
- Newsletter dédiée (boost visibilité)
- Analytics avancés
- Export comptable

---

## 🔧 Logique Technique de Calcul

### Algorithme de Calcul Commission

```typescript
function calculateCommission(
  rdvNumber: number,           // Numéro du RDV pour cet intervenant (1, 2, 3, 4, ...)
  rdvPrice: number,            // Prix du RDV en euros
  contractType: 'free' | 'starter' | 'pro' | 'premium'
): number {

  // RÈGLE 1 : 3 premiers RDV gratuits pour TOUS
  if (rdvNumber <= 3) {
    return 0;
  }

  // RÈGLE 2 : À partir du RDV #4, selon contrat
  switch (contractType) {
    case 'free':
      // 10€ OU 12% (le plus élevé), plafonné à 25€
      const commission = Math.max(10, rdvPrice * 0.12);
      return Math.min(commission, 25);

    case 'starter':
      // 6€ OU 8% (le MOINS élevé)
      return Math.min(6, rdvPrice * 0.08);

    case 'pro':
      // 3€ fixe
      return 3;

    case 'premium':
      // 0€
      return 0;

    default:
      throw new Error('Type de contrat inconnu');
  }
}
```

### Exemples de Calcul Complets

#### Cas 1 : Intervenant GRATUIT - 5 RDV/mois à 60€

```
RDV #1 (60€) → 0€      [3 premiers gratuits]
RDV #2 (60€) → 0€      [3 premiers gratuits]
RDV #3 (60€) → 0€      [3 premiers gratuits]
RDV #4 (60€) → 10€     [max(10, 7.2) = 10€]
RDV #5 (60€) → 10€     [max(10, 7.2) = 10€]

Total commissions mois : 20€
Coût total intervenant : 20€
Net intervenant : 280€ (5×60 - 20)
```

#### Cas 2 : Intervenant PRO - 15 RDV/mois à 80€

```
RDV #1 (80€) → 0€      [3 premiers gratuits]
RDV #2 (80€) → 0€      [3 premiers gratuits]
RDV #3 (80€) → 0€      [3 premiers gratuits]
RDV #4 (80€) → 3€
RDV #5-15 (80€) → 3€×11 = 33€

Total commissions RDV : 36€
Abonnement mensuel : 100€
Coût total intervenant : 136€
Revenus bruts : 1 200€ (15×80)
Net intervenant : 1 064€ (1200 - 136)
```

**Comparaison si c'était en GRATUIT :**
```
RDV #1-3 → 0€
RDV #4-15 → 12×10€ = 120€

Économie avec PRO : 120€ - 136€ = -16€
Mais PRO donne accès à + de features et illimité
```

#### Cas 3 : Intervenant PREMIUM - 25 RDV/mois à 90€

```
RDV #1-25 (90€) → 0€

Total commissions RDV : 0€
Abonnement mensuel : 180€
Coût total intervenant : 180€
Revenus bruts : 2 250€ (25×90)
Net intervenant : 2 070€

Comparaison GRATUIT :
RDV #1-3 → 0€
RDV #4-25 → 22×10.8€ = 237.60€
Économie avec PREMIUM : 237.60€ - 180€ = +57.60€ ✅
```

---

## 🗄️ Structure Base de Données

### Table `practitioner_contracts`

```sql
CREATE TABLE practitioner_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID REFERENCES practitioners(id) NOT NULL,

  -- Type de contrat
  contract_type VARCHAR NOT NULL CHECK (
    contract_type IN ('free', 'starter', 'pro', 'premium')
  ),

  -- Dates
  contract_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  contract_end_date DATE, -- NULL = actif

  -- Statut
  status VARCHAR DEFAULT 'active' CHECK (
    status IN ('active', 'paused', 'cancelled', 'expired')
  ),

  -- Documents
  signed_contract_url TEXT, -- URL PDF contrat signé

  -- Abonnement Stripe (si applicable)
  stripe_subscription_id VARCHAR,
  stripe_customer_id VARCHAR,
  monthly_fee DECIMAL(10,2), -- 0, 60, 100, ou 180

  -- Compteur RDV (pour les 3 gratuits)
  total_appointments_count INTEGER DEFAULT 0,
  free_appointments_remaining INTEGER DEFAULT 3,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Index pour performance
CREATE INDEX idx_contracts_practitioner ON practitioner_contracts(practitioner_id);
CREATE INDEX idx_contracts_status ON practitioner_contracts(status);
CREATE INDEX idx_contracts_type ON practitioner_contracts(contract_type);
```

### Table `transactions`

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relations
  appointment_id UUID REFERENCES appointments(id) NOT NULL,
  practitioner_id UUID REFERENCES practitioners(id) NOT NULL,
  client_id UUID REFERENCES profiles(id) NOT NULL,

  -- Stripe
  stripe_payment_intent_id VARCHAR UNIQUE NOT NULL,
  stripe_transfer_id VARCHAR, -- ID du transfert vers l'intervenant

  -- Montants (en euros)
  amount_total DECIMAL(10,2) NOT NULL,           -- Montant total payé par le client
  amount_stripe_fees DECIMAL(10,2) NOT NULL,     -- Frais Stripe (~2%)
  amount_platform_commission DECIMAL(10,2) NOT NULL, -- Commission plateforme
  amount_practitioner_net DECIMAL(10,2) NOT NULL,    -- Net reçu par l'intervenant

  -- Contexte
  appointment_number INTEGER NOT NULL,            -- Numéro du RDV (1, 2, 3, 4...)
  contract_type VARCHAR NOT NULL,                 -- Type contrat au moment du RDV
  is_free_appointment BOOLEAN DEFAULT false,      -- True si RDV 1-3

  -- Statut
  status VARCHAR DEFAULT 'pending' CHECK (
    status IN ('pending', 'succeeded', 'failed', 'refunded')
  ),

  -- Dates
  paid_at TIMESTAMP,
  transferred_at TIMESTAMP,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index
CREATE INDEX idx_transactions_appointment ON transactions(appointment_id);
CREATE INDEX idx_transactions_practitioner ON transactions(practitioner_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_date ON transactions(paid_at);
```

---

## 🔄 Flux de Données

### Séquence : Paiement d'un RDV

```
1. Client réserve RDV #5 pour intervenant PRO
   ↓
2. Backend récupère :
   - Contract actif de l'intervenant → "pro"
   - Compteur RDV de l'intervenant → 4 (il a fait 4 RDV)
   ↓
3. Calcul commission :
   rdvNumber = 5 (4 + 1)
   rdvPrice = 60€
   contractType = "pro"

   if (rdvNumber <= 3) return 0  → FALSE
   switch contractType "pro" → return 3€

   Commission = 3€
   ↓
4. Création session Stripe :
   amount_total = 60€
   application_fee = 3€ (commission)
   destination = stripe_account_id de l'intervenant
   ↓
5. Client paie → Webhook payment_intent.succeeded
   ↓
6. Création transaction en BDD :
   - amount_total: 60€
   - amount_stripe_fees: 1.30€
   - amount_platform_commission: 3€
   - amount_practitioner_net: 55.70€
   - appointment_number: 5
   - contract_type: "pro"
   - is_free_appointment: false
   ↓
7. Mise à jour contrat :
   - total_appointments_count: 5
   - free_appointments_remaining: 0
   ↓
8. Notification intervenant :
   "Vous avez reçu un paiement de 55.70€ net
    (60€ - 1.30€ Stripe - 3€ commission Pro)"
```

---

## 📧 Notifications Email

### Email Client - Confirmation Paiement

```
Objet : ✅ Paiement confirmé - Rendez-vous avec [Intervenant]

Bonjour [Client],

Votre paiement de 60€ a été confirmé.

Détails du rendez-vous :
• Date : [Date]
• Heure : [Heure]
• Service : [Service]
• Intervenant : [Nom]

Votre facture est disponible en pièce jointe.

À bientôt,
L'équipe FLM Services
```

### Email Intervenant - Notification Paiement

```
Objet : 💰 Nouveau paiement reçu - RDV #5

Bonjour [Intervenant],

Un nouveau paiement a été enregistré pour votre rendez-vous.

Détails :
• RDV numéro : #5
• Montant total : 60€
• Commission plateforme : 3€ (Contrat Pro)
• Frais Stripe : 1.30€
• Net pour vous : 55.70€

Virement prévu : Dans 7 jours (J+7)

Voir les détails : [Lien Dashboard]

L'équipe FLM Services
```

### Email Intervenant - RDV Gratuits

```
Objet : 🎁 RDV #2/3 - Encore 1 RDV gratuit !

Bonjour [Intervenant],

Vous venez de compléter votre 2ème rendez-vous.

🎁 Offre de bienvenue :
• RDV effectués : 2/3
• RDV gratuits restants : 1
• Commission actuelle : 0€

À partir de votre 4ème RDV, votre contrat [Type] s'appliquera
avec une commission de [X€/RDV].

Profitez-en !
L'équipe FLM Services
```

---

## 🎨 Interface Admin

### Page Gestion Contrats Intervenants

**Chemin :** `/admin/practitioners/contracts`

**Fonctionnalités :**

1. **Liste des demandes en attente**
   - Utilisateurs ayant demandé à devenir intervenant
   - Bouton "Traiter la demande"

2. **Modal "Promouvoir en Intervenant"**
   - Sélection type de contrat : Gratuit / Starter / Pro / Premium
   - Upload contrat signé (PDF)
   - Saisie informations Stripe (IBAN, KYC)
   - Bouton "Activer l'intervenant"

3. **Liste des intervenants actifs**
   - Tableau : Nom | Contrat | RDV Total | RDV Gratuits Restants | Statut
   - Actions : Voir détails | Modifier contrat | Suspendre

4. **Détails d'un intervenant**
   - Informations contrat
   - Historique RDV avec commissions
   - Graphique revenus
   - Export comptable

---

## ⚙️ Configuration Technique

### Variables d'Environnement

```env
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Contrats
FREE_APPOINTMENTS_COUNT=3
TRANSFER_DELAY_DAYS=7

# Commissions (en centimes pour précision)
COMMISSION_FREE_FIXED=1000        # 10€
COMMISSION_FREE_PERCENT=12        # 12%
COMMISSION_FREE_MAX=2500          # 25€

COMMISSION_STARTER_FIXED=600      # 6€
COMMISSION_STARTER_PERCENT=8      # 8%
COMMISSION_STARTER_MAX_RDV=15

COMMISSION_PRO_FIXED=300          # 3€

COMMISSION_PREMIUM_FIXED=0        # 0€

# Abonnements
SUBSCRIPTION_STARTER_MONTHLY=60   # 60€
SUBSCRIPTION_PRO_MONTHLY=100      # 100€
SUBSCRIPTION_PREMIUM_MONTHLY=180  # 180€
```

---

## ✅ Checklist Implémentation

### Phase 1 : Base de Données
- [ ] Migration table `practitioner_contracts`
- [ ] Migration table `transactions`
- [ ] Migration table `invoices`
- [ ] Fonction SQL `get_practitioner_appointment_count()`
- [ ] Fonction SQL `update_contract_counters()`

### Phase 2 : Service Commission
- [ ] `CommissionCalculator.ts`
- [ ] `AppointmentCounter.ts`
- [ ] Tests unitaires (20+ cas)

### Phase 3 : Interface Admin
- [ ] Page liste demandes
- [ ] Modal promotion intervenant
- [ ] Formulaire sélection contrat
- [ ] Upload contrat signé

### Phase 4 : Paiements
- [ ] Stripe Checkout integration
- [ ] Calcul commission dynamique
- [ ] Création transaction BDD
- [ ] Webhooks handlers

### Phase 5 : Redistribution
- [ ] Transferts Stripe
- [ ] Cron virements J+7
- [ ] Notifications email

### Phase 6 : Facturation
- [ ] Template facture PDF
- [ ] Génération auto
- [ ] Téléchargement

---

## 🚀 Lancement

**Date de début :** À planifier
**Durée estimée :** 10 semaines
**Budget :** 80-100h développement

**Prêt à démarrer dès validation ! 🎯**
