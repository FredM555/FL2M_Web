# 📋 Projet : Système de Paiement & Redistribution - Modèle D Hybride

**Date de création :** 2025-01-23
**Dernière mise à jour :** 2025-01-23
**Responsable :** Équipe FLM Services
**Statut global :** 🔴 Non démarré

---

## 🎯 Objectifs du Projet

### Vision
Mettre en place un système complet de paiement client et de redistribution aux intervenants basé sur le modèle économique D hybride avec :
- ✅ 3 premiers rendez-vous gratuits pour les nouveaux intervenants
- ✅ 4 paliers de tarification (Gratuit, Starter, Pro, Premium)
- ✅ Gestion manuelle hors-site des contrats intervenants
- ✅ Interface admin pour gérer les contrats
- ✅ Redistribution automatique aux intervenants
- ✅ Génération automatique de factures

### Contraintes Spécifiques
- ⚠️ **Onboarding intervenant HORS SITE** : Pas de formulaire public, validation manuelle par admin
- ⚠️ **Pas d'interface publique de sélection d'abonnement** : Les offres sont proposées hors site
- ⚠️ **Tous intervenants au même niveau** : Pas de différenciation visible publiquement
- ⚠️ **Contrats hors site** : Signature papier/électronique externe au site

---

## 💰 Modèle Économique Final

### Grille Tarifaire (avec 3 RDV gratuits)

```
┌─────────────────────────────────────────────────────────────────┐
│ GRATUIT (0€/mois)                                               │
├─────────────────────────────────────────────────────────────────┤
│ • 3 PREMIERS RDV : 0€ de commission ✨ NOUVEAUTÉ               │
│ • À partir du 4ème RDV : 10€/RDV ou 12% (le plus élevé)       │
│ • Plafond : 25€/RDV                                            │
│ • Pour qui : Nouveaux intervenants en phase de test            │
│ • Validation : Automatique après onboarding admin              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ STARTER (60€/mois)                                              │
├─────────────────────────────────────────────────────────────────┤
│ • Commission : 6€/RDV ou 8% (le moins élevé)                   │
│ • Limite : 15 RDV/mois                                         │
│ • Point d'équilibre : ~7 RDV/mois                              │
│ • Activation : Par admin après signature contrat               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ PRO (100€/mois) ⭐                                              │
├─────────────────────────────────────────────────────────────────┤
│ • Commission : 3€/RDV (frais technique)                        │
│ • RDV illimités                                                │
│ • Point d'équilibre : ~10 RDV/mois                             │
│ • Activation : Par admin après signature contrat               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ PREMIUM (180€/mois) 👑                                          │
├─────────────────────────────────────────────────────────────────┤
│ • Commission : 0€                                              │
│ • RDV illimités                                                │
│ • Point d'équilibre : ~18 RDV/mois                             │
│ • Activation : Par admin après signature contrat               │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Architecture du Système

### Flux de Paiement Client

```
┌──────────────┐
│   CLIENT     │ Réserve RDV (60€)
└──────┬───────┘
       │
       ↓
┌──────────────────────┐
│  STRIPE CHECKOUT     │ Paiement sécurisé
└──────┬───────────────┘
       │
       ↓
┌──────────────────────┐
│  STRIPE CONNECT      │ Réception paiement
│  - Frais Stripe      │ - 1,30€ (2%)
│  - Montant total     │ - 60€
└──────┬───────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│  CALCUL COMMISSION (Backend)         │
│  1. Vérifier nb RDV intervenant      │
│  2. Si RDV 1-3 : commission = 0€     │
│  3. Si RDV 4+ : selon contrat        │
│  4. Récupérer type contrat (BDD)     │
│  5. Calculer commission               │
└──────┬───────────────────────────────┘
       │
       ↓
┌──────────────────────────────────────┐
│  CRÉATION TRANSACTION (BDD)          │
│  - appointment_id                    │
│  - amount_total : 60€                │
│  - amount_platform : 3-10€           │
│  - amount_practitioner : 47-57€      │
│  - rdv_number : 5                    │
│  - contract_type : "pro"             │
└──────┬───────────────────────────────┘
       │
       ↓ (J+7)
┌──────────────────────────────────────┐
│  VIREMENT INTERVENANT                │
│  - Via Stripe Transfer               │
│  - Montant net après commission      │
│  - Notification email                │
└──────────────────────────────────────┘
```

### Flux d'Onboarding Intervenant (Hors Site)

```
┌────────────────────────────────────────────────────────────┐
│ ÉTAPE 1 : Demande Utilisateur                             │
├────────────────────────────────────────────────────────────┤
│ 1. Utilisateur remplit formulaire contact                 │
│ 2. Sélectionne "Devenir intervenant"                      │
│ 3. Email envoyé à contact@fl2m.fr                         │
│ 4. Statut : user_type = "client" (par défaut)            │
└────────────────────────────────────────────────────────────┘
              ↓
┌────────────────────────────────────────────────────────────┐
│ ÉTAPE 2 : Traitement Hors Site (MANUEL)                   │
├────────────────────────────────────────────────────────────┤
│ 1. Admin reçoit l'email                                   │
│ 2. Contact téléphonique/visio avec candidat               │
│ 3. Présentation des 4 offres (Gratuit/Starter/Pro/Premium)│
│ 4. Négociation et choix de l'offre                        │
│ 5. Signature contrat (PDF électronique ou papier)         │
│ 6. Documents KYC récupérés                                 │
└────────────────────────────────────────────────────────────┘
              ↓
┌────────────────────────────────────────────────────────────┐
│ ÉTAPE 3 : Activation dans le Système (Interface Admin)    │
├────────────────────────────────────────────────────────────┤
│ 1. Admin se connecte à l'interface admin                  │
│ 2. Recherche l'utilisateur                                │
│ 3. Clique "Promouvoir en intervenant"                     │
│ 4. Sélectionne type de contrat : "pro"                    │
│ 5. Upload contrat signé (PDF)                             │
│ 6. Saisit informations Stripe Connect                     │
│ 7. Active le compte                                        │
│    → user_type = "intervenant"                            │
│    → contract_type = "pro"                                │
│    → contract_start_date = aujourd'hui                    │
│    → is_active = true                                     │
└────────────────────────────────────────────────────────────┘
              ↓
┌────────────────────────────────────────────────────────────┐
│ ÉTAPE 4 : Configuration Stripe Connect (Admin)            │
├────────────────────────────────────────────────────────────┤
│ 1. Admin crée compte Stripe Connect pour l'intervenant    │
│ 2. Saisit IBAN fourni par l'intervenant                   │
│ 3. Upload justificatifs KYC (identité, domicile)          │
│ 4. Stripe valide le compte (24-48h)                       │
│ 5. stripe_account_id sauvegardé en BDD                    │
└────────────────────────────────────────────────────────────┘
              ↓
┌────────────────────────────────────────────────────────────┐
│ ÉTAPE 5 : Intervenant Actif                               │
├────────────────────────────────────────────────────────────┤
│ ✅ Peut créer ses disponibilités                          │
│ ✅ Apparaît dans la recherche publique                     │
│ ✅ Peut recevoir des réservations                         │
│ ✅ Bénéficie des 3 premiers RDV gratuits                  │
│ ✅ Reçoit les paiements selon son contrat                 │
└────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Sprints de Développement

### Sprint 0 : Préparation (Semaine 0)
**Objectif :** Préparer l'infrastructure

| Tâche | Statut | Assigné | Priorité |
|-------|--------|---------|----------|
| Créer compte Stripe (mode test) | 🔴 À faire | - | P0 |
| Valider grille tarifaire avec équipe | 🔴 À faire | - | P0 |
| Créer modèle de contrat PDF | 🔴 À faire | - | P0 |
| Définir processus onboarding détaillé | 🔴 À faire | - | P0 |
| Préparer environnement de test | 🔴 À faire | - | P0 |

---

### Sprint 1 : Base de Données & Modèles (Semaine 1)
**Objectif :** Créer les tables et types nécessaires

| Tâche | Statut | Assigné | Fichiers | Priorité |
|-------|--------|---------|----------|----------|
| **1.1** Créer table `practitioner_contracts` | 🔴 À faire | - | `supabase/migrations/*.sql` | P0 |
| **1.2** Créer table `transactions` | 🔴 À faire | - | `supabase/migrations/*.sql` | P0 |
| **1.3** Créer table `practitioner_payouts` | 🔴 À faire | - | `supabase/migrations/*.sql` | P0 |
| **1.4** Créer table `invoices` | 🔴 À faire | - | `supabase/migrations/*.sql` | P0 |
| **1.5** Ajouter champs `practitioners` (stripe_account_id, etc.) | 🔴 À faire | - | `supabase/migrations/*.sql` | P0 |
| **1.6** Créer types TypeScript | 🔴 À faire | - | `src/types/payments.ts` | P0 |
| **1.7** Tester migrations | 🔴 À faire | - | - | P0 |

**Critères de validation :**
- [ ] Toutes les tables créées sans erreur
- [ ] Relations FK correctes
- [ ] Types TypeScript synchronisés avec BDD
- [ ] Données de test insérées

---

### Sprint 2 : Service de Calcul Commission (Semaine 2)
**Objectif :** Implémenter la logique métier de calcul

| Tâche | Statut | Assigné | Fichiers | Priorité |
|-------|--------|---------|----------|----------|
| **2.1** Créer `CommissionCalculator` | 🔴 À faire | - | `src/services/commission-calculator.ts` | P0 |
| **2.2** Implémenter compteur RDV intervenant | 🔴 À faire | - | `src/services/appointment-counter.ts` | P0 |
| **2.3** Gérer les 3 premiers RDV gratuits | 🔴 À faire | - | `src/services/commission-calculator.ts` | P0 |
| **2.4** Calcul selon type de contrat | 🔴 À faire | - | `src/services/commission-calculator.ts` | P0 |
| **2.5** Créer tests unitaires | 🔴 À faire | - | `src/services/__tests__/` | P1 |
| **2.6** Documenter l'API | 🔴 À faire | - | `docs/COMMISSION_API.md` | P2 |

**Critères de validation :**
- [ ] Tous les cas de test passent
- [ ] RDV 1-3 : commission = 0€
- [ ] RDV 4+ : commission selon contrat
- [ ] Plafonds respectés
- [ ] Code documenté

---

### Sprint 3 : Interface Admin - Gestion Intervenants (Semaine 3)
**Objectif :** Créer l'interface admin pour gérer les contrats

| Tâche | Statut | Assigné | Fichiers | Priorité |
|-------|--------|---------|----------|----------|
| **3.1** Créer page admin `/admin/practitioners` | 🔴 À faire | - | `src/pages/admin/PractitionersPage.tsx` | P0 |
| **3.2** Liste des demandes d'intervenant | 🔴 À faire | - | `src/components/admin/PractitionerRequests.tsx` | P0 |
| **3.3** Modal "Promouvoir en intervenant" | 🔴 À faire | - | `src/components/admin/PromotePractitionerModal.tsx` | P0 |
| **3.4** Formulaire sélection type contrat | 🔴 À faire | - | `src/components/admin/ContractTypeSelector.tsx` | P0 |
| **3.5** Upload contrat signé (PDF) | 🔴 À faire | - | `src/components/admin/ContractUploader.tsx` | P0 |
| **3.6** Configuration Stripe Connect | 🔴 À faire | - | `src/components/admin/StripeAccountSetup.tsx` | P1 |
| **3.7** Historique des contrats | 🔴 À faire | - | `src/components/admin/ContractHistory.tsx` | P2 |

**Critères de validation :**
- [ ] Admin peut voir toutes les demandes
- [ ] Peut promouvoir un utilisateur en intervenant
- [ ] Peut sélectionner le type de contrat
- [ ] Peut uploader le contrat signé
- [ ] Contrat stocké dans Supabase Storage
- [ ] user_type mis à jour automatiquement

---

### Sprint 4 : Paiements Clients - Stripe Checkout (Semaine 4)
**Objectif :** Permettre aux clients de payer les RDV

| Tâche | Statut | Assigné | Fichiers | Priorité |
|-------|--------|---------|----------|----------|
| **4.1** Configuration Stripe SDK | 🔴 À faire | - | `src/config/stripe.ts` | P0 |
| **4.2** Créer `createPaymentSession` | 🔴 À faire | - | `src/services/stripe-payments.ts` | P0 |
| **4.3** Intégrer Stripe Checkout | 🔴 À faire | - | `src/components/appointments/PaymentCheckout.tsx` | P0 |
| **4.4** Page succès paiement | 🔴 À faire | - | `src/pages/PaymentSuccessPage.tsx` | P0 |
| **4.5** Page échec paiement | 🔴 À faire | - | `src/pages/PaymentCancelPage.tsx` | P1 |
| **4.6** Mise à jour statut RDV | 🔴 À faire | - | `src/services/appointments.ts` | P0 |
| **4.7** Création transaction BDD | 🔴 À faire | - | `src/services/transactions.ts` | P0 |

**Critères de validation :**
- [ ] Client peut payer un RDV
- [ ] Redirection vers Stripe Checkout
- [ ] Paiement 3D Secure OK
- [ ] Statut RDV mis à jour (`paid`)
- [ ] Transaction créée en BDD
- [ ] Email confirmation envoyé

---

### Sprint 5 : Webhooks Stripe (Semaine 5)
**Objectif :** Gérer les événements Stripe en temps réel

| Tâche | Statut | Assigné | Fichiers | Priorité |
|-------|--------|---------|----------|----------|
| **5.1** Créer endpoint `/api/webhooks/stripe` | 🔴 À faire | - | `src/api/webhooks/stripe.ts` | P0 |
| **5.2** Vérification signature webhook | 🔴 À faire | - | `src/api/webhooks/stripe.ts` | P0 |
| **5.3** Handler `payment_intent.succeeded` | 🔴 À faire | - | `src/services/webhook-handlers.ts` | P0 |
| **5.4** Handler `payment_intent.failed` | 🔴 À faire | - | `src/services/webhook-handlers.ts` | P0 |
| **5.5** Handler `transfer.created` | 🔴 À faire | - | `src/services/webhook-handlers.ts` | P1 |
| **5.6** Handler `payout.paid` | 🔴 À faire | - | `src/services/webhook-handlers.ts` | P1 |
| **5.7** Logs et monitoring | 🔴 À faire | - | `src/services/webhook-logger.ts` | P2 |

**Critères de validation :**
- [ ] Signature webhook vérifiée
- [ ] Paiement réussi → RDV confirmé
- [ ] Paiement échoué → RDV annulé
- [ ] Notifications envoyées
- [ ] Logs sauvegardés

---

### Sprint 6 : Redistribution Intervenants (Semaine 6)
**Objectif :** Virer l'argent aux intervenants automatiquement

| Tâche | Statut | Assigné | Fichiers | Priorité |
|-------|--------|---------|----------|----------|
| **6.1** Créer service `PayoutManager` | 🔴 À faire | - | `src/services/payout-manager.ts` | P0 |
| **6.2** Calcul montant net intervenant | 🔴 À faire | - | `src/services/payout-calculator.ts` | P0 |
| **6.3** Créer transfert Stripe | 🔴 À faire | - | `src/services/stripe-transfers.ts` | P0 |
| **6.4** Cron job virements (J+7) | 🔴 À faire | - | `src/cron/process-payouts.ts` | P0 |
| **6.5** Création payout en BDD | 🔴 À faire | - | `src/services/payouts.ts` | P0 |
| **6.6** Notification intervenant | 🔴 À faire | - | `src/services/email.ts` | P1 |
| **6.7** Dashboard paiements intervenant | 🔴 À faire | - | `src/pages/PractitionerPayoutsPage.tsx` | P1 |

**Critères de validation :**
- [ ] Commission calculée correctement
- [ ] Virement Stripe créé
- [ ] Payout enregistré en BDD
- [ ] Intervenant notifié par email
- [ ] Dashboard affiche les paiements

---

### Sprint 7 : Facturation Automatique (Semaine 7)
**Objectif :** Générer les factures automatiquement

| Tâche | Statut | Assigné | Fichiers | Priorité |
|-------|--------|---------|----------|----------|
| **7.1** Créer `InvoiceGenerator` | 🔴 À faire | - | `src/services/invoice-generator.ts` | P0 |
| **7.2** Template facture PDF | 🔴 À faire | - | `src/templates/invoice.tsx` | P0 |
| **7.3** Génération facture client | 🔴 À faire | - | `src/services/client-invoices.ts` | P0 |
| **7.4** Génération facture intervenant | 🔴 À faire | - | `src/services/practitioner-invoices.ts` | P0 |
| **7.5** Numérotation automatique | 🔴 À faire | - | `src/services/invoice-numbering.ts` | P0 |
| **7.6** Stockage factures (Supabase Storage) | 🔴 À faire | - | `src/services/storage.ts` | P0 |
| **7.7** Téléchargement factures | 🔴 À faire | - | `src/components/InvoiceDownload.tsx` | P1 |

**Critères de validation :**
- [ ] Facture client générée après paiement
- [ ] Facture intervenant générée après virement
- [ ] PDF correctement formaté
- [ ] Numéros séquentiels
- [ ] Téléchargement possible

---

### Sprint 8 : Interface Admin - Gestion Financière (Semaine 8)
**Objectif :** Dashboard admin pour suivre les finances

| Tâche | Statut | Assigné | Fichiers | Priorité |
|-------|--------|---------|----------|----------|
| **8.1** Page `/admin/finances` | 🔴 À faire | - | `src/pages/admin/FinancesPage.tsx` | P0 |
| **8.2** Vue d'ensemble revenus | 🔴 À faire | - | `src/components/admin/RevenueOverview.tsx` | P0 |
| **8.3** Liste des transactions | 🔴 À faire | - | `src/components/admin/TransactionsList.tsx` | P0 |
| **8.4** Liste des virements | 🔴 À faire | - | `src/components/admin/PayoutsList.tsx` | P0 |
| **8.5** Graphiques revenus | 🔴 À faire | - | `src/components/admin/RevenueCharts.tsx` | P1 |
| **8.6** Export comptable CSV | 🔴 À faire | - | `src/services/accounting-export.ts` | P1 |
| **8.7** Rapports mensuels | 🔴 À faire | - | `src/services/monthly-reports.ts` | P2 |

**Critères de validation :**
- [ ] Admin voit tous les paiements
- [ ] Admin voit tous les virements
- [ ] Filtres fonctionnels
- [ ] Export CSV OK
- [ ] Graphiques lisibles

---

### Sprint 9 : Tests & Sécurité (Semaine 9)
**Objectif :** Sécuriser et tester le système

| Tâche | Statut | Assigné | Priorité |
|-------|--------|---------|----------|
| **9.1** Tests e2e paiement complet | 🔴 À faire | - | P0 |
| **9.2** Tests sécurité Stripe | 🔴 À faire | - | P0 |
| **9.3** Audit permissions BDD | 🔴 À faire | - | P0 |
| **9.4** Tests webhooks | 🔴 À faire | - | P0 |
| **9.5** Vérification montants | 🔴 À faire | - | P0 |
| **9.6** Tests cas limites | 🔴 À faire | - | P1 |
| **9.7** Documentation sécurité | 🔴 À faire | - | P2 |

---

### Sprint 10 : Déploiement Production (Semaine 10)
**Objectif :** Mise en production

| Tâche | Statut | Assigné | Priorité |
|-------|--------|---------|----------|
| **10.1** Activer compte Stripe production | 🔴 À faire | - | P0 |
| **10.2** Configurer webhooks production | 🔴 À faire | - | P0 |
| **10.3** Variables d'environnement prod | 🔴 À faire | - | P0 |
| **10.4** Migration BDD production | 🔴 À faire | - | P0 |
| **10.5** Tests de smoke | 🔴 À faire | - | P0 |
| **10.6** Formation équipe admin | 🔴 À faire | - | P1 |
| **10.7** Documentation utilisateur | 🔴 À faire | - | P1 |
| **10.8** Monitoring alertes | 🔴 À faire | - | P1 |

---

## 📁 Structure des Fichiers à Créer

```
src/
├── types/
│   ├── payments.ts                    ← Sprint 1
│   ├── contracts.ts                   ← Sprint 1
│   └── invoices.ts                    ← Sprint 1
│
├── services/
│   ├── commission-calculator.ts       ← Sprint 2
│   ├── appointment-counter.ts         ← Sprint 2
│   ├── stripe-payments.ts             ← Sprint 4
│   ├── stripe-transfers.ts            ← Sprint 6
│   ├── transactions.ts                ← Sprint 4
│   ├── payouts.ts                     ← Sprint 6
│   ├── payout-manager.ts              ← Sprint 6
│   ├── payout-calculator.ts           ← Sprint 6
│   ├── invoice-generator.ts           ← Sprint 7
│   ├── client-invoices.ts             ← Sprint 7
│   ├── practitioner-invoices.ts       ← Sprint 7
│   ├── invoice-numbering.ts           ← Sprint 7
│   ├── webhook-handlers.ts            ← Sprint 5
│   ├── webhook-logger.ts              ← Sprint 5
│   ├── accounting-export.ts           ← Sprint 8
│   └── monthly-reports.ts             ← Sprint 8
│
├── components/
│   ├── admin/
│   │   ├── PractitionerRequests.tsx   ← Sprint 3
│   │   ├── PromotePractitionerModal.tsx ← Sprint 3
│   │   ├── ContractTypeSelector.tsx   ← Sprint 3
│   │   ├── ContractUploader.tsx       ← Sprint 3
│   │   ├── StripeAccountSetup.tsx     ← Sprint 3
│   │   ├── ContractHistory.tsx        ← Sprint 3
│   │   ├── TransactionsList.tsx       ← Sprint 8
│   │   ├── PayoutsList.tsx            ← Sprint 8
│   │   ├── RevenueOverview.tsx        ← Sprint 8
│   │   └── RevenueCharts.tsx          ← Sprint 8
│   │
│   ├── appointments/
│   │   └── PaymentCheckout.tsx        ← Sprint 4
│   │
│   └── InvoiceDownload.tsx            ← Sprint 7
│
├── pages/
│   ├── admin/
│   │   ├── PractitionersPage.tsx      ← Sprint 3
│   │   └── FinancesPage.tsx           ← Sprint 8
│   │
│   ├── PractitionerPayoutsPage.tsx    ← Sprint 6
│   ├── PaymentSuccessPage.tsx         ← Sprint 4
│   └── PaymentCancelPage.tsx          ← Sprint 4
│
├── api/
│   └── webhooks/
│       └── stripe.ts                   ← Sprint 5
│
├── cron/
│   └── process-payouts.ts              ← Sprint 6
│
├── templates/
│   └── invoice.tsx                     ← Sprint 7
│
└── config/
    └── stripe.ts                       ← Sprint 4

supabase/
└── migrations/
    ├── create_practitioner_contracts.sql  ← Sprint 1
    ├── create_transactions.sql            ← Sprint 1
    ├── create_practitioner_payouts.sql    ← Sprint 1
    └── create_invoices.sql                ← Sprint 1

docs/
├── COMMISSION_API.md                   ← Sprint 2
├── ADMIN_GUIDE.md                      ← Sprint 10
└── SECURITY_AUDIT.md                   ← Sprint 9
```

---

## 📝 Journal de Bord

### 2025-01-23 - Initialisation Projet
- ✅ Création fichier de suivi
- ✅ Définition architecture complète
- ✅ Planification 10 sprints
- 🔴 En attente validation client

### [Date] - Sprint 0
- [ ] ...

---

## 🎯 KPIs à Suivre

### Développement
- [ ] % de tâches complétées : 0/XX
- [ ] Nombre de bugs critiques : 0
- [ ] Couverture tests : 0%

### Business
- [ ] Nombre d'intervenants onboardés : 0
- [ ] Revenus mensuels commission : 0€
- [ ] Montant redistribué intervenants : 0€
- [ ] Taux de réussite paiements : 0%

---

## ⚠️ Risques & Blocages

| Risque | Impact | Probabilité | Mitigation | Statut |
|--------|--------|-------------|------------|--------|
| Validation Stripe Connect lente | Élevé | Moyenne | Anticiper démarches | 🟡 |
| Complexité calcul commission | Moyen | Faible | Tests unitaires | 🟢 |
| Fraude paiement | Élevé | Faible | 3D Secure + monitoring | 🟢 |
| Problème virement intervenant | Élevé | Faible | Tests rigoureux | 🟡 |

---

## 📞 Points de Contact

- **Admin Contact:** contact@fl2m.fr
- **Support Stripe:** https://support.stripe.com
- **Documentation:** docs/

---

## ✅ Checklist Avant Production

### Technique
- [ ] Tous les tests passent
- [ ] Webhooks configurés et testés
- [ ] Clés API en production
- [ ] Backup BDD automatique
- [ ] Monitoring actif
- [ ] Logs centralisés

### Business
- [ ] Contrats types validés
- [ ] Grille tarifaire confirmée
- [ ] CGV/CGU mises à jour
- [ ] Processus onboarding documenté
- [ ] Équipe admin formée

### Légal
- [ ] Mentions légales à jour
- [ ] RGPD OK
- [ ] Politique remboursement
- [ ] Assurance RC Pro

---

## 🚀 Prochaines Étapes Immédiates

1. ✅ **Valider ce plan** avec l'équipe
2. 🔴 **Sprint 1** : Créer les migrations SQL
3. 🔴 **Sprint 2** : Implémenter le calculateur de commission
4. 🔴 **Sprint 3** : Interface admin gestion intervenants

**Date de début estimée :** À définir
**Date de fin estimée :** Dans 10 semaines
**Budget estimé :** 80-100h développement

---

**Mis à jour le :** 2025-01-23
**Par :** Assistant
**Prochaine revue :** À planifier
