# Analyse du Système de Paiement - FLM Services

**Date:** 2025-01-23
**Objectif:** Analyser et proposer un modèle économique viable pour la plateforme FLM Services

---

## 📊 Structure Actuelle

### Base de Données Existante

**Table `appointments`:**
- `payment_status`: 'unpaid' | 'paid' | 'refunded'
- `payment_id`: Identifiant transaction
- `custom_price`: Prix personnalisé possible

**Table `services`:**
- `price`: Prix du service
- `duration`: Durée en minutes

**Table `practitioners`:**
- Pas de champ pour abonnement/commission actuellement

---

## 💰 Modèle Économique Proposé par le Client

### Option 1: Sans Abonnement
- **Commission par rendez-vous:** 7,50€
- **Pour qui:** Intervenants occasionnels
- **Avantage:** Pas d'engagement mensuel

### Option 2: Avec Abonnement
- **Abonnement mensuel:** 100€/mois
- **Commission par rendez-vous:** 0€
- **Pour qui:** Intervenants réguliers

### Point d'Équilibre
- **7,50€ × 13,33 RDV = 100€**
- Un intervenant qui fait **14 RDV/mois ou plus** a intérêt à s'abonner

---

## 🎯 Modèles Économiques Alternatifs

### Modèle A: Commission Progressive
```
Sans abonnement:
- 0-10 RDV/mois:   10€/RDV
- 11-20 RDV/mois:  7,50€/RDV
- 21+ RDV/mois:    5€/RDV

Avec abonnement (75€/mois):
- Tous les RDV:    3€/RDV (commission minimale)
```

**Avantages:**
- ✅ Plus juste pour les petits volumes
- ✅ Encourage la croissance
- ✅ Revenus plus prévisibles pour la plateforme

**Point d'équilibre:** ~10 RDV/mois

---

### Modèle B: Pourcentage du CA
```
Sans abonnement:
- Commission: 15% du prix du RDV (min 5€, max 20€)

Avec abonnement (80€/mois):
- Commission: 5% du prix du RDV (max 10€)
```

**Exemple:**
- RDV à 60€ sans abonnement: 9€ de commission
- RDV à 60€ avec abonnement: 3€ de commission
- RDV à 150€ sans abonnement: 20€ (plafond)
- RDV à 150€ avec abonnement: 7,50€

**Avantages:**
- ✅ Proportionnel à la valeur créée
- ✅ Juste pour tous types de services
- ✅ Protège les petits prix (minimum)

**Point d'équilibre:** ~533€ de CA/mois (soit 9 RDV à 60€)

---

### Modèle C: Freemium avec Paliers
```
Gratuit (3 premiers RDV/mois):
- 0€ d'abonnement
- 12€/RDV au-delà

Starter (50€/mois):
- Jusqu'à 10 RDV
- 8€/RDV au-delà

Pro (100€/mois):
- RDV illimités
- 2€/RDV (frais technique Stripe)

Premium (200€/mois):
- RDV illimités
- 0€/RDV
- Fonctionnalités avancées (analytics, export, etc.)
```

**Avantages:**
- ✅ Facilite l'onboarding (3 RDV gratuits)
- ✅ Plusieurs paliers = plus de conversions
- ✅ Évolutif selon le business

---

### Modèle D: Hybride (Recommandé)
```
Sans abonnement:
- 10€/RDV ou 12% du prix (le plus élevé)
- Max: 25€/RDV

Starter (60€/mois):
- 6€/RDV ou 8% du prix (le moins élevé)
- Jusqu'à 15 RDV/mois

Pro (100€/mois):
- 3€/RDV (frais Stripe)
- RDV illimités
- Priorisation calendrier

Premium (180€/mois):
- 0€/RDV
- RDV illimités
- Marketing inclus (featured, newsletter)
- Analytics avancés
```

**Avantages:**
- ✅ Flexible et juste
- ✅ Couvre tous les profils
- ✅ Optimise les revenus plateforme
- ✅ Incite à l'upgrade

**Point d'équilibre Starter:** 6-7 RDV/mois
**Point d'équilibre Pro:** 10-11 RDV/mois
**Point d'équilibre Premium:** 18+ RDV/mois

---

## 🔧 Faisabilité Technique avec Stripe

### Stripe Connect - Solution Recommandée

**Architecture:**
```
Client → Paye service (ex: 60€)
         ↓
      Stripe
         ↓
      ├─→ Plateforme (commission)
      └─→ Intervenant (reste)
```

### Fonctionnalités Stripe Disponibles

#### 1. **Stripe Connect Express/Standard**
- ✅ Paiements directs aux intervenants
- ✅ Commission prélevée automatiquement
- ✅ Gestion des abonnements
- ✅ KYC/vérification identité
- ✅ Virements automatiques

#### 2. **Stripe Checkout**
- ✅ Page de paiement sécurisée
- ✅ 3D Secure intégré
- ✅ Multi-devises
- ✅ Sauvegarde des moyens de paiement

#### 3. **Stripe Billing**
- ✅ Abonnements mensuels
- ✅ Renouvellement automatique
- ✅ Gestion des échecs de paiement
- ✅ Facturation pro-rata

#### 4. **Stripe Webhooks**
- ✅ Notifications temps réel
- ✅ Mise à jour automatique BDD
- ✅ Gestion des remboursements

### Coûts Stripe (France)

**Pour la plateforme:**
- Paiements en ligne: **1,5% + 0,25€** par transaction
- Stripe Connect: **+0,25%** sur les transferts
- **Total: ~1,75% + 0,25€** par transaction

**Exemple sur un RDV à 60€:**
- Frais Stripe: 1,30€
- Votre commission: 10€ (modèle D sans abonnement)
- Reste intervenant: 48,70€

---

## 📈 Simulation de Revenus

### Scénario: 100 Intervenants Actifs

**Répartition estimée:**
- 40 sans abonnement (4 RDV/mois en moyenne)
- 30 Starter (8 RDV/mois)
- 20 Pro (15 RDV/mois)
- 10 Premium (25 RDV/mois)

**Revenus mensuels:**

```
Sans abonnement:
40 × 4 RDV × 10€ = 1 600€

Starter:
30 × 60€ abonnement = 1 800€
30 × 8 RDV × 6€ = 1 440€
Total Starter: 3 240€

Pro:
20 × 100€ abonnement = 2 000€
20 × 15 RDV × 3€ = 900€
Total Pro: 2 900€

Premium:
10 × 180€ abonnement = 1 800€

TOTAL MENSUEL: 9 540€
TOTAL ANNUEL: 114 480€
```

**Coûts Stripe (estimé):**
- Total RDV: 1 150 RDV/mois
- Prix moyen: 70€
- Volume: 80 500€/mois
- Frais Stripe: ~1 700€/mois (2,1%)

**Marge nette plateforme: ~7 840€/mois**

---

## 🚀 Plan de Mise en Œuvre

### Phase 1: Infrastructure (Semaine 1-2)
- [ ] Créer compte Stripe Connect
- [ ] Configurer webhooks
- [ ] Créer tables BDD (subscriptions, transactions, commissions)
- [ ] Implémenter Connect Onboarding

### Phase 2: Paiements Clients (Semaine 3-4)
- [ ] Intégrer Stripe Checkout
- [ ] Gérer les paiements de RDV
- [ ] Calculer et prélever commissions
- [ ] Transferts automatiques intervenants

### Phase 3: Abonnements (Semaine 5-6)
- [ ] Page choix d'abonnement intervenants
- [ ] Stripe Billing integration
- [ ] Gestion upgrades/downgrades
- [ ] Dashboard revenus intervenant

### Phase 4: Fonctionnalités Avancées (Semaine 7-8)
- [ ] Remboursements
- [ ] Facturation automatique
- [ ] Analytics revenus
- [ ] Exports comptables

---

## 📋 Tables à Créer

### `practitioner_subscriptions`
```sql
CREATE TABLE practitioner_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practitioner_id UUID REFERENCES practitioners(id),
  plan_type VARCHAR NOT NULL, -- 'none', 'starter', 'pro', 'premium'
  stripe_subscription_id VARCHAR,
  stripe_customer_id VARCHAR,
  status VARCHAR, -- 'active', 'canceled', 'past_due'
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### `transactions`
```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id),
  stripe_payment_intent_id VARCHAR UNIQUE,
  amount_total DECIMAL(10,2), -- Montant total payé par le client
  amount_practitioner DECIMAL(10,2), -- Part de l'intervenant
  amount_platform DECIMAL(10,2), -- Commission plateforme
  amount_stripe_fees DECIMAL(10,2), -- Frais Stripe
  currency VARCHAR DEFAULT 'eur',
  status VARCHAR, -- 'pending', 'succeeded', 'failed', 'refunded'
  stripe_transfer_id VARCHAR, -- ID du transfert à l'intervenant
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### `subscription_plans`
```sql
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL, -- 'Starter', 'Pro', 'Premium'
  code VARCHAR UNIQUE NOT NULL, -- 'starter', 'pro', 'premium'
  monthly_price DECIMAL(10,2),
  commission_per_appointment DECIMAL(10,2),
  commission_percentage DECIMAL(5,2),
  max_appointments_per_month INT, -- NULL = illimité
  features JSONB, -- Fonctionnalités incluses
  stripe_price_id VARCHAR,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 💡 Recommandations

### Modèle Économique: **Hybride (Modèle D)**
**Raison:** Équilibre parfait entre flexibilité, justice et optimisation des revenus

### Pricing Recommandé:
```
Sans abonnement: 10€/RDV (ou 12% si supérieur, max 25€)
Starter (60€/mois): 6€/RDV (max 15 RDV)
Pro (100€/mois): 3€/RDV (illimité)
Premium (180€/mois): 0€/RDV + features (illimité)
```

### Solution Technique: **Stripe Connect Standard**
**Raison:**
- ✅ Contrôle total du flux de paiement
- ✅ Commission prélevée automatiquement
- ✅ Virements directs aux intervenants
- ✅ Gestion fiscale facilitée

### Architecture de Paiement:
```
1. Client réserve RDV (60€)
2. Paiement via Stripe Checkout
3. Stripe prélève ses frais (1,30€)
4. Calcul commission plateforme selon abonnement intervenant
5. Transfert automatique part intervenant (J+7)
6. Mise à jour statuts dans BDD via webhooks
```

### Priorités d'Implémentation:
1. **Phase 1:** Paiements clients + commission fixe
2. **Phase 2:** Système d'abonnements
3. **Phase 3:** Dashboard intervenants
4. **Phase 4:** Analytics et optimisations

---

## ⚠️ Points d'Attention

### Juridique
- ✅ Obtenir statut plateforme de mise en relation
- ✅ Conditions générales d'utilisation claires
- ✅ Politique de remboursement transparente
- ✅ Conformité RGPD pour données bancaires

### Fiscalité
- ✅ TVA sur commission plateforme
- ✅ Déclaration revenus intervenants
- ✅ Export comptable mensuel
- ✅ Facturation automatique

### UX Critique
- ✅ Onboarding Stripe simple et rapide
- ✅ Dashboard revenus en temps réel
- ✅ Notifications paiements/virements
- ✅ Support en cas de problème

---

## 🎓 Ressources Stripe

- Documentation Connect: https://stripe.com/docs/connect
- Guide des commissions: https://stripe.com/docs/connect/charges
- Abonnements: https://stripe.com/docs/billing/subscriptions/overview
- Webhooks: https://stripe.com/docs/webhooks

---

## 📊 Conclusion

Le modèle **Hybride avec 4 paliers** est le plus adapté car:

1. **Flexible:** S'adapte à tous les profils d'intervenants
2. **Juste:** Commission proportionnelle à l'utilisation
3. **Scalable:** Facile d'ajouter des paliers
4. **Rentable:** Optimise les revenus plateforme
5. **Techniquement faisable:** Stripe Connect le supporte nativement

**Budget estimé d'implémentation:** 60-80h de développement
**ROI:** Positif dès 30 intervenants actifs avec abonnement
