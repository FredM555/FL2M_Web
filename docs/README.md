# 📚 Documentation FLM Services - Index Principal

**Dernière mise à jour:** 2025-01-27
**Version:** Production Ready

---

## 🎯 Pour Démarrer Rapidement

### Documents Essentiels à Lire en Premier

1. **[MODELE_D_FINAL.md](./MODELE_D_FINAL.md)** ⭐ **PRIORITÉ 1**
   - Modèle de commission Version 3.0 (actuel)
   - 4 types de contrats : SANS ENGAGEMENT, STARTER, PRO, PREMIUM
   - **3 RDV gratuits pour STARTER et PRO uniquement**
   - Algorithme de calcul complet
   - Exemples de revenus mensuels
   - **👉 Commencez par ce document !**

2. **[STRIPE_CONNECT_IMPLEMENTATION.md](./STRIPE_CONNECT_IMPLEMENTATION.md)** ⭐ **PRIORITÉ 2**
   - Guide complet d'implémentation Stripe Connect
   - Paiements avec validation différée (48h)
   - Architecture technique complète
   - Code TypeScript prêt à l'emploi
   - Migrations SQL incluses
   - **👉 Document de référence pour les paiements**

---

## 💰 Système de Paiement & Commission

### Modèle Économique

**[MODELE_D_FINAL.md](./MODELE_D_FINAL.md)** - Version 3.0
Grille tarifaire des intervenants avec 4 contrats :

| Contrat | Prix/Mois | Commission | RDV Gratuits |
|---------|-----------|------------|--------------|
| **Sans Engagement** | 0€ | max(10€, 12%) plafonné 25€ | ❌ Non |
| **Starter** | 60€ | min(6€, 8%) | ✅ 3 premiers RDV |
| **Pro** | 100€ | 3€ fixe | ✅ 3 premiers RDV |
| **Premium** | 160€ | 0€ | ✅ Tous les RDV |

**Points clés :**
- Les 3 RDV gratuits s'appliquent **uniquement** à STARTER et PRO
- SANS ENGAGEMENT et PREMIUM n'ont **pas** de RDV gratuits
- Algorithme de calcul inclus dans le document

### Implémentation Technique

**[STRIPE_CONNECT_IMPLEMENTATION.md](./STRIPE_CONNECT_IMPLEMENTATION.md)** - Version 2.0 Simplifiée
Architecture complète du système de paiement :

**Flux de paiement :**
1. Client paie → Argent reste sur compte plateforme
2. Rendez-vous a lieu
3. Client valide OU auto-validation après 48h
4. Transfert à l'intervenant (montant - commission - frais Stripe)

**Contenu du document :**
- 📊 Schéma de base de données (transactions, payouts, contracts)
- 🔧 Migrations SQL prêtes à déployer
- 💻 3 services TypeScript complets
- 🎨 Composants React pour l'interface
- 🔌 API routes et webhooks Stripe
- ⚙️ Configuration et déploiement

**[COMMISSION_API.md](./COMMISSION_API.md)**
API de calcul de commission :
- Endpoints REST
- Fonctions RPC Supabase
- Exemples d'appels

---

## 👥 Système de Bénéficiaires

Le système permet aux utilisateurs de créer des profils pour leurs proches (enfants, conjoints, etc.) et de prendre des RDV pour eux.

### Architecture

**[BENEFICIARIES_ARCHITECTURE.md](./BENEFICIARIES_ARCHITECTURE.md)**
Vue d'ensemble technique :
- Structure de la base de données
- Relations entre tables
- Modèle de données complet

### Guides d'Implémentation

**[BENEFICIARIES_INTEGRATION_GUIDE.md](./BENEFICIARIES_INTEGRATION_GUIDE.md)**
Guide d'intégration pas à pas :
- Configuration initiale
- Création de l'interface utilisateur
- Gestion des rendez-vous pour bénéficiaires

**[BENEFICIARY_CONFIRMATION_IMPLEMENTATION.md](./BENEFICIARY_CONFIRMATION_IMPLEMENTATION.md)**
Système de confirmation :
- Email de confirmation
- Validation du bénéficiaire
- Workflow complet

**[RELATION_AUTOMATIQUE_BENEFICIAIRES.md](./RELATION_AUTOMATIQUE_BENEFICIAIRES.md)**
Relations automatiques :
- Détection des liens familiaux
- Association automatique
- Règles métier

---

## 🔢 Système de Numérologie

**[NUMEROLOGY_SYSTEM.md](./NUMEROLOGY_SYSTEM.md)**
Service de calcul numérologique :
- Algorithmes de calcul
- Réduction des nombres
- Gestion des maîtres nombres (11, 22, 33)
- Tests unitaires

---

## 📅 Système de Rendez-vous

**[UNIQUE_APPOINTMENT_CODES.md](./UNIQUE_APPOINTMENT_CODES.md)**
Codes uniques de rendez-vous :
- Génération de codes aléatoires
- Vérification et validation
- Utilisation dans les confirmations

---

## 🧪 Tests & Qualité

**[GUIDE_TESTS.md](./GUIDE_TESTS.md)**
Guide de test du système :
- Configuration de l'environnement de test
- Tests unitaires
- Tests d'intégration
- Scénarios de test complets

---

## 🗄️ Migrations SQL

### Migrations Actives

Les migrations suivantes sont **prêtes à déployer** :

1. **`20251127204706_update_commission_model_final.sql`** ⭐ **PRINCIPALE**
   - Mise à jour du modèle de commission V3.0
   - Fonction `calculate_commission()` avec 3 RDV gratuits pour STARTER/PRO
   - **À déployer en priorité**

2. **`create_practitioner_contracts.sql`**
   - Table des contrats intervenants
   - Gestion des abonnements mensuels

3. **`create_practitioner_requests.sql`**
   - Table des demandes d'inscription intervenant
   - Workflow d'approbation admin

4. **`create_transactions.sql`**
   - Table des transactions de paiement
   - Historique des paiements clients

5. **`create_payouts.sql`**
   - Table des virements aux intervenants
   - Gestion des transferts Stripe

6. **`cleanup_practitioner_requests.sql`**
   - Nettoyage et optimisation des demandes

7. **`fix_practitioner_requests_fk.sql`**
   - Correction des clés étrangères

8. **`add_unique_code_to_appointments.sql`**
   - Ajout de codes uniques aux RDV

### Ordre de Déploiement Recommandé

```bash
# 1. Tables de base
psql < supabase/migrations/create_practitioner_contracts.sql
psql < supabase/migrations/create_practitioner_requests.sql
psql < supabase/migrations/create_transactions.sql
psql < supabase/migrations/create_payouts.sql

# 2. Migration principale (commission)
psql < supabase/migrations/20251127204706_update_commission_model_final.sql

# 3. Corrections et ajouts
psql < supabase/migrations/fix_practitioner_requests_fk.sql
psql < supabase/migrations/cleanup_practitioner_requests.sql
psql < supabase/migrations/add_unique_code_to_appointments.sql
```

**Alternative :** Utiliser le Supabase Dashboard pour exécuter les SQL manuellement.

---

## 📝 Checklist de Déploiement

### Avant Demain - Configuration Stripe

- [ ] Créer un compte Stripe Connect
- [ ] Configurer les produits Stripe :
  - [ ] STARTER : 60€/mois
  - [ ] PRO : 100€/mois
  - [ ] PREMIUM : 160€/mois
- [ ] Récupérer les clés API Stripe (test + production)
- [ ] Configurer le webhook Stripe

### Variables d'Environnement

Ajouter dans `.env.local` :

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_PREMIUM_PRICE_ID=price_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### Déploiement SQL

- [ ] Appliquer les migrations SQL dans l'ordre recommandé
- [ ] Vérifier que la fonction `calculate_commission()` fonctionne
- [ ] Tester les calculs de commission avec des données de test

### Déploiement Code

- [ ] Implémenter les services TypeScript (voir STRIPE_CONNECT_IMPLEMENTATION.md)
- [ ] Créer les composants React pour la gestion des contrats
- [ ] Configurer les API routes
- [ ] Configurer les webhooks Stripe
- [ ] Tester le flux complet de paiement

### Tests

- [ ] Tester la création de contrat intervenant
- [ ] Tester le paiement client
- [ ] Tester la validation de RDV (manuelle + auto 48h)
- [ ] Tester le transfert à l'intervenant
- [ ] Vérifier les 3 RDV gratuits pour STARTER/PRO

---

## 🎯 Résumé : Par Où Commencer Demain ?

### ⚡ Action Immédiate (30 min)

1. **Lire** [MODELE_D_FINAL.md](./MODELE_D_FINAL.md) - Comprendre le modèle de commission
2. **Configurer** Stripe Dashboard - Créer les produits et prix
3. **Copier** les variables d'environnement dans `.env.local`

### 🚀 Implémentation (2-3h)

4. **Déployer** les migrations SQL via Supabase Dashboard
5. **Lire** [STRIPE_CONNECT_IMPLEMENTATION.md](./STRIPE_CONNECT_IMPLEMENTATION.md) sections 1-3
6. **Copier/coller** les services TypeScript dans votre projet

### ✅ Test (1h)

7. **Tester** la fonction `calculate_commission()` avec des données de test
8. **Vérifier** le flux de paiement en test
9. **Valider** les 3 RDV gratuits pour STARTER et PRO

---

## 📞 Support

Pour toute question sur la documentation :
- Vérifier les exemples dans chaque document
- Tous les documents contiennent du code prêt à l'emploi
- Les migrations SQL sont testées et prêtes à déployer

---

**✅ Documentation nettoyée et prête pour la production - 2025-01-27**
