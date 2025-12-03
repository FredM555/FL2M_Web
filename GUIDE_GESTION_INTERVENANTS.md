# 📋 Guide de Gestion des Demandes d'Intervenants

## 🎯 Vue d'ensemble

Ce guide explique comment gérer les utilisateurs qui font une demande pour devenir intervenant sur la plateforme FLM Services.

---

## 🔄 Workflow Complet

### 1️⃣ **ÉTAPE 1 : L'utilisateur fait sa demande**

#### Où : Page "Devenir Intervenant" (accessible pour les clients)
#### Fichier : `src/components/practitioner/BecomePractitionerCard.tsx`

L'utilisateur remplit un formulaire avec :
- ✅ **Motivation** (obligatoire)
- ✅ **Domaines d'expertise / spécialités**
- ✅ **Expérience professionnelle**
- ✅ **Certifications et diplômes**
- ✅ **Informations du profil public proposé :**
  - Nom d'affichage
  - Titre professionnel
  - Résumé
  - Biographie

#### Actions automatiques :
- Création d'un enregistrement dans la table `practitioner_requests`
- Statut initial : `pending` (en attente)
- Notification envoyée aux administrateurs

---

### 2️⃣ **ÉTAPE 2 : L'admin consulte les demandes**

#### Où : Page Admin > Demandes d'Intervenant
#### Fichier : `src/pages/Admin/PractitionerRequestsPage.tsx`
#### URL : `/admin/practitioner-requests`

#### Interface Admin :

**Statistiques en un coup d'œil :**
```
┌─────────────┬─────────────┬─────────────┐
│ En attente  │ Approuvées  │ Rejetées    │
│     5       │     12      │     3       │
└─────────────┴─────────────┴─────────────┘
```

**Onglets disponibles :**
- 🔵 **Toutes** - Toutes les demandes
- 🟡 **En attente** - Demandes à traiter (prioritaire)
- 🟢 **Approuvées** - Historique des approbations
- 🔴 **Rejetées** - Historique des rejets

**Actions disponibles sur chaque demande :**
- 👁️ **Voir les détails** - Consulter la demande complète
- ✅ **Approuver** - Valider et créer le compte intervenant
- ❌ **Rejeter** - Refuser la demande
- 🗑️ **Supprimer** - Effacer la demande

---

### 3️⃣ **ÉTAPE 3 : L'admin active le parcours intervenant**

#### Action simple de l'admin :

L'admin **active simplement le parcours** en cliquant sur le bouton "Activer le parcours intervenant" ✅

**Ce qui se passe :**
- La demande passe au statut `pre_approved`
- L'intervenant reçoit une notification
- L'intervenant peut désormais **finaliser lui-même son inscription**

**Fichiers concernés :**
- `src/pages/Admin/PractitionerRequestsPage.tsx` - Bouton d'activation
- Migration SQL : `supabase/migrations/add_pre_approved_status.sql`

---

### 4️⃣ **ÉTAPE 4 : L'intervenant finalise son inscription (AUTONOMIE)**

#### **Redirection automatique**
Dès qu'un utilisateur a une demande `pre_approved`, il est **automatiquement redirigé** vers la page de finalisation lors de sa prochaine connexion.

#### **Page de finalisation : `/practitioner-onboarding`**
Fichier : `src/pages/PractitionerOnboardingPage.tsx`

**Parcours en 3 étapes pour l'intervenant :**

#### **Étape 4.1 : Bienvenue**
- Message de félicitations
- Récapitulatif de son profil proposé
- Explication du processus

#### **Étape 4.2 : Choix du type de contrat**
**🎯 L'intervenant choisit LIBREMENT son type de contrat :**

| Type | Description | Commission FLM |
|------|-------------|----------------|
| **FREE** 🎁 | Sans Engagement - 0€/mois | 7% par RDV (plafonné à 50€) |
| **STARTER** 💼 | Starter - 60€/mois | 6€ fixe par RDV |
| **PRO** ⭐ | Pro - 100€/mois | 4€ fixe par RDV |
| **PREMIUM** 👑 | Premium - 160€/mois | 0€ (aucune commission) |

**Composant utilisé :** `src/components/admin/ContractTypeSelector.tsx`

#### **Étape 4.3 : Confirmation et création**
Récapitulatif avant validation :
- Type de contrat sélectionné
- Explication des prochaines étapes
- Bouton "Finaliser mon inscription"

---

### 5️⃣ **ÉTAPE 5 : Paiement de l'abonnement (si requis)**

**🎯 Logique de paiement :**
- **Contrat FREE** → Pas de paiement, activation immédiate ✅
- **Contrats STARTER/PRO/PREMIUM** → Redirection vers page de paiement 💳

#### **Page de paiement : `/practitioner-payment`**
Fichier : `src/pages/PractitionerPaymentPage.tsx`

**Ce qui se passe :**
1. Affichage du récapitulatif de l'abonnement
2. Intégration Stripe Checkout
3. L'intervenant paie son premier mois d'abonnement
4. **Webhook Stripe** valide le paiement
5. Le contrat passe de `pending_payment` à `active` ✅

**États du contrat pendant le processus :**
- `pending_payment` : En attente du paiement
- `active` : Paiement validé, contrat activé

**Guide complet** : Voir `GUIDE_PAIEMENT_ABONNEMENTS_INTERVENANTS.md`

---

### 6️⃣ **ÉTAPE 6 : Actions automatiques après paiement validé**

**Fonction RPC utilisée :** `activate_contract_after_payment()`
Fichier : `supabase/migrations/add_pre_approved_status.sql`

**Déclenchée par :** Webhook Stripe `checkout.session.completed`

#### **6.1 - Activation du contrat**
**Table impactée :** `practitioner_contracts`
- Le contrat passe de `pending_payment` à `active`
- Enregistrement du Payment Intent ID Stripe
- Date d'activation = date du paiement

#### **6.2 - Création initiale (lors de `complete_practitioner_onboarding`)**
**Table impactée :** `practitioner_contracts`
- Crée un nouveau contrat avec le type choisi par l'intervenant
- Statut initial : `pending_payment` (sauf FREE = `active`)
- Date de début : date actuelle
- Commission calculée selon le type
- created_by : l'intervenant lui-même

#### **6.3 - Promotion du compte utilisateur**
**Actions SQL automatiques :**
```sql
1. Mise à jour de profiles.user_type = 'intervenant'
2. Création d'un enregistrement dans practitioners (si n'existe pas)
3. Update de practitioner_requests.status = 'approved'
```

**Table `practitioners` créée avec :**
- Lien vers le user_id
- Informations du profil public (display_name, title, bio, summary)
- Statut : `active`
- is_active : `true`
- created_by : l'intervenant lui-même

#### **5.3 - Redirection automatique**
- L'intervenant est redirigé vers `/practitioner/profile`
- Message de succès affiché
- Peut commencer à configurer son espace

---

### 6️⃣ **ÉTAPE 6 : L'intervenant configure son compte**

Une fois son inscription finalisée, l'intervenant peut accéder à :

#### **6.1 - Page Profil Intervenant**
Fichier : `src/pages/PractitionerProfilePage.tsx`

**Onglet "Mon Profil"** :
- Photo de profil
- Nom d'affichage
- Titre professionnel
- Biographie
- Spécialités
- Tarifs

**✨ Onglet "Mon Abonnement"** (NOUVEAU) :
Fichier : `src/components/practitioner/SubscriptionManagement.tsx`

L'intervenant peut :
- 📊 **Visualiser son contrat actuel** (type, tarif, dates, commissions)
- 🔄 **Changer d'abonnement** en toute autonomie
- 📅 **Le changement est planifié** pour le mois suivant (aucune interruption)

**Comment fonctionne le changement ?**
1. L'intervenant choisit un nouveau type de contrat
2. Le contrat actuel continue jusqu'à la fin du mois
3. Le nouveau contrat démarre automatiquement le 1er du mois suivant
4. Si le nouveau contrat nécessite un paiement (STARTER/PRO/PREMIUM), il sera en statut `pending_payment`
5. Si FREE, activation immédiate le 1er du mois suivant

#### **6.2 - Configuration Stripe Connect**
**⚠️ IMPORTANT : Cette partie nécessite la configuration Stripe**

Voir le guide : `GUIDE_CONFIGURATION_STRIPE.md`

**Processus :**
1. L'intervenant clique sur "Configurer les paiements"
2. Redirection vers Stripe Connect Onboarding
3. Création du compte Stripe Connect
4. Vérification d'identité
5. Ajout des informations bancaires

**Une fois Stripe configuré, l'intervenant peut :**
- ✅ Recevoir des paiements
- ✅ Créer des services/prestations
- ✅ Définir ses disponibilités
- ✅ Accepter des rendez-vous

---

## 📊 États et Statuts

### Statuts des demandes (practitioner_requests)
| Statut | Description | Actions possibles |
|--------|-------------|-------------------|
| `pending` | En attente de traitement par l'admin | Activer le parcours / Rejeter |
| `pre_approved` | Parcours activé - En cours de finalisation par l'intervenant | Voir uniquement |
| `approved` | Inscription finalisée et compte intervenant créé | Voir uniquement |
| `rejected` | Demande rejetée par l'admin | Supprimer |

### Statuts des contrats (practitioner_contracts)
| Statut | Description |
|--------|-------------|
| `active` | Contrat actif et valide |
| `ended` | Contrat terminé |
| `cancelled` | Contrat annulé |

### Statuts des intervenants (practitioners)
| Statut | Description |
|--------|-------------|
| `active` | Intervenant actif, visible sur la plateforme |
| `inactive` | Intervenant inactif, non visible |
| `suspended` | Compte suspendu temporairement |

---

## 🔐 Permissions et Sécurité

### Qui peut faire quoi ?

#### Clients (user_type = 'client')
- ✅ Faire une demande pour devenir intervenant
- ✅ Voir le statut de leur demande
- ❌ Ne peut pas accéder aux fonctions intervenant tant que non approuvé

#### Intervenants (user_type = 'intervenant')
- ✅ Accès complet au dashboard intervenant
- ✅ Créer des services
- ✅ Gérer les disponibilités
- ✅ Accepter/refuser des RDV
- ✅ Voir leurs transactions et commissions

#### Administrateurs (user_type = 'admin')
- ✅ Voir toutes les demandes
- ✅ Approuver/Rejeter des demandes
- ✅ Créer des contrats
- ✅ Gérer tous les intervenants
- ✅ Voir toutes les transactions

---

## 🛠️ Fonctions et Services Utilisés

### Services TypeScript

#### 1. **Gestion des demandes**
```typescript
// src/services/supabase.ts

// Récupérer toutes les demandes (admin)
getAllPractitionerRequests()

// ✨ NOUVEAU : Activer le parcours intervenant (pré-approbation)
preApprovePractitionerRequest(requestId, adminNotes?)

// Approuver une demande (ancienne méthode - gardée pour compatibilité)
approvePractitionerRequest(requestId, adminNotes?)

// ✨ NOUVEAU : Finaliser l'inscription (appelé par l'intervenant)
completePractitionerOnboarding(requestId, contractType, contractDocumentUrl?, startDate?)

// Rejeter une demande
rejectPractitionerRequest(requestId, adminNotes?)

// Supprimer une demande
deletePractitionerRequest(requestId)
```

#### 2. **Gestion des contrats**
```typescript
// src/services/contracts.ts

// Créer un contrat
ContractsService.createContract(contractData, adminId)

// Récupérer le contrat actif d'un intervenant
ContractsService.getActiveContract(practitionerId)

// Mettre fin à un contrat
ContractsService.endContract(contractId, endDate, reason)
```

### Fonctions SQL (RPC)

#### ✨ **NOUVEAU** : `pre_approve_practitioner_request()`
```sql
-- Paramètres :
-- - p_request_id: UUID de la demande
-- - p_admin_id: UUID de l'admin qui active
-- - p_admin_notes: Notes optionnelles

-- Actions :
-- 1. Vérifie que la demande existe et est 'pending'
-- 2. Met à jour le statut vers 'pre_approved'
-- 3. Enregistre reviewed_by et reviewed_at
-- 4. L'intervenant peut maintenant finaliser lui-même
```

#### ✨ **NOUVEAU** : `complete_practitioner_onboarding()`
```sql
-- Paramètres :
-- - p_request_id: UUID de la demande
-- - p_contract_type: Type de contrat choisi ('free', 'starter', 'pro', 'premium')
-- - p_contract_document_url: URL du document (optionnel)
-- - p_start_date: Date de début (par défaut: aujourd'hui)

-- Actions :
-- 1. Vérifie que la demande est 'pre_approved' et appartient à l'utilisateur
-- 2. Crée l'enregistrement practitioners (si n'existe pas)
-- 3. Crée le contrat avec le type choisi
-- 4. Met à jour profiles.user_type = 'intervenant'
-- 5. Update la demande avec status = 'approved'
-- 6. Retourne success et les IDs créés
```

#### `approve_practitioner_request()` *(Ancienne méthode - conservée)*
```sql
-- Paramètres :
-- - request_id: UUID de la demande
-- - admin_id: UUID de l'admin qui approuve
-- - notes: Notes optionnelles

-- Actions :
-- 1. Vérifie que la demande existe et est 'pending'
-- 2. Crée l'enregistrement practitioners
-- 3. Met à jour profiles.user_type = 'intervenant'
-- 4. Update la demande avec status = 'approved'
-- 5. Enregistre qui a approuvé et quand

-- ⚠️ Cette fonction est gardée pour compatibilité mais le nouveau workflow
-- utilise pre_approve_practitioner_request() + complete_practitioner_onboarding()
```

---

## 📱 Parcours Utilisateur Complet

### Diagramme du flux (NOUVEAU PARCOURS AUTONOME)

```
┌─────────────────┐
│ UTILISATEUR     │
│ (Client)        │
└────────┬────────┘
         │
         ├──> 1. Remplit le formulaire "Devenir Intervenant"
         │
         ↓
┌─────────────────────────────────┐
│ practitioner_requests           │
│ status: pending                 │
└────────┬────────────────────────┘
         │
         ↓
┌─────────────────┐
│ ADMINISTRATEUR  │ 2. Reçoit une notification
└────────┬────────┘
         │
         ├──> 3. Consulte la demande (PractitionerRequestsPage)
         │
         ├──> 4. Évalue la demande
         │
         ├──────────┬────────────┐
         │          │            │
         ↓          ↓            ↓
    ACTIVER LE   REJETER    SUPPRIMER
    PARCOURS
         │
         ↓
┌─────────────────────────────────┐
│ practitioner_requests           │
│ status: pre_approved ✨         │
└────────┬────────────────────────┘
         │
         ↓
┌─────────────────────────────────┐
│ INTERVENANT (AUTONOMIE)         │ 5. Reçoit notification
│                                 │    + Redirection auto
└────────┬────────────────────────┘
         │
         ├──> 6. Accède à /practitioner-onboarding
         │
         ├──> 7. Voir message de bienvenue
         │
         ├──> 8. CHOISIT LUI-MÊME son type de contrat
         │        (FREE/STARTER/PRO/PREMIUM) 🎯
         │
         ├──> 9. Confirme et valide
         │
         ↓
┌─────────────────────────────────────┐
│ ACTIONS AUTOMATIQUES                │
│ - practitioner_contracts créé       │
│   (avec le type choisi)             │
│ - profiles.user_type = 'intervenant'│
│ - practitioners créé                │
│ - practitioner_requests.status =    │
│   'approved'                        │
└────────┬────────────────────────────┘
         │
         ↓
┌─────────────────┐
│ INTERVENANT     │ 10. Inscription finalisée !
│ (Compte actif)  │
└────────┬────────┘
         │
         ├──> 11. Configure son profil
         │
         ├──> 12. Configure Stripe Connect
         │
         ├──> 13. Crée ses services
         │
         ├──> 14. Définit ses disponibilités
         │
         └──> 15. Prêt à recevoir des RDV !
```

---

## ⚠️ Points Importants

### 1. Configuration Stripe OBLIGATOIRE
L'intervenant **ne pourra pas recevoir de paiements** tant que Stripe Connect n'est pas configuré.

**Voir :** `GUIDE_CONFIGURATION_STRIPE.md`

### 2. Contrat = Commission
Le type de contrat détermine automatiquement :
- Le montant de l'abonnement mensuel (FREE = 0€)
- La commission prélevée par FLM sur chaque RDV
- Les conditions de facturation

### 3. Une seule demande active
Un utilisateur ne peut avoir qu'**une seule demande en attente** à la fois.

### 4. Pas de retour en arrière automatique
Une fois approuvé, l'utilisateur reste intervenant. Pour le rétrograder, l'admin doit :
1. Mettre fin au contrat
2. Changer manuellement le user_type dans la base de données

---

## 🔍 Monitoring et Suivi

### Requêtes SQL utiles pour l'admin

#### Voir toutes les demandes en attente
```sql
SELECT
  pr.*,
  p.first_name,
  p.last_name,
  p.email
FROM practitioner_requests pr
JOIN profiles p ON pr.user_id = p.id
WHERE pr.status = 'pending'
ORDER BY pr.created_at ASC;
```

#### Voir les nouveaux intervenants (dernière semaine)
```sql
SELECT
  p.*,
  pc.contract_type,
  pc.monthly_fee
FROM practitioners p
JOIN practitioner_contracts pc ON p.user_id = pc.practitioner_id
WHERE p.created_at > NOW() - INTERVAL '7 days'
  AND pc.status = 'active'
ORDER BY p.created_at DESC;
```

#### Voir les intervenants sans Stripe configuré
```sql
SELECT
  p.id,
  p.display_name,
  pr.first_name,
  pr.last_name,
  pr.email
FROM practitioners p
JOIN profiles pr ON p.user_id = pr.id
WHERE p.stripe_account_id IS NULL
  AND p.is_active = true;
```

---

## 📞 FAQ Admin

### Q: Que se passe-t-il quand j'active le parcours intervenant ?
**R:** La demande passe en statut `pre_approved`. L'intervenant est notifié et redirigé automatiquement vers la page de finalisation où il peut choisir son type de contrat.

### Q: L'intervenant peut-il vraiment choisir n'importe quel type de contrat ?
**R:** ✅ Oui ! L'intervenant a le **choix libre** entre FREE, STARTER, PRO et PREMIUM. C'est une décision stratégique pour favoriser l'autonomie des intervenants.

### Q: Que se passe-t-il si je rejette une demande ?
**R:** La demande passe en statut `rejected`. L'utilisateur est notifié mais peut refaire une nouvelle demande plus tard.

### Q: Puis-je changer le type de contrat après validation ?
**R:** Oui, via la page de gestion des contrats, vous pouvez mettre fin au contrat actuel et en créer un nouveau avec un type différent.

### Q: Puis-je encore utiliser l'ancienne méthode d'approbation directe ?
**R:** Oui, l'ancienne fonction `approve_practitioner_request()` est conservée pour compatibilité, mais le nouveau workflow (activation + finalisation par l'intervenant) est recommandé.

### Q: L'intervenant peut-il abandonner le processus après activation ?
**R:** Oui, la demande reste en `pre_approved` tant qu'il ne finalise pas. Il peut revenir plus tard pour compléter l'inscription.

### Q: Combien de temps prend l'onboarding Stripe ?
**R:** Entre 5-15 minutes si l'intervenant a tous ses documents. La vérification peut prendre 1-2 jours ouvrés.

### Q: Que faire si un intervenant abuse du système ?
**R:**
1. Suspendre le compte (status = 'suspended')
2. Mettre fin au contrat
3. Bloquer l'accès si nécessaire

---

## 📚 Fichiers Importants

### ✨ Nouveau Workflow Autonome

#### Frontend
- **✨ `src/pages/PractitionerOnboardingPage.tsx`** - Page de finalisation pour l'intervenant (NOUVEAU)
- **✨ `src/pages/PractitionerPaymentPage.tsx`** - Page de paiement Stripe (NOUVEAU)
- **✨ `src/components/practitioner/SubscriptionManagement.tsx`** - Gestion de l'abonnement (NOUVEAU)
- `src/pages/PractitionerProfilePage.tsx` - Page profil avec onglets (mis à jour)
- `src/pages/Admin/PractitionerRequestsPage.tsx` - Page admin (mise à jour avec bouton d'activation)
- `src/components/admin/ContractTypeSelector.tsx` - Sélecteur de contrat (réutilisé)
- `src/components/admin/PromotePractitionerModal.tsx` - Modal d'approbation (ancienne méthode)
- `src/components/practitioner/BecomePractitionerCard.tsx` - Formulaire de demande
- `src/components/layout/MainLayout.tsx` - Layout avec redirection automatique

#### Services
- `src/services/supabase.ts` - Fonctions RPC (ajout de `preApprovePractitionerRequest`, `completePractitionerOnboarding`, `activateContractAfterPayment`)
- `src/services/stripe.ts` - Service Stripe (à créer selon guide)
- `src/services/contracts.ts` - Service de gestion des contrats
- `src/services/commission-calculator.ts` - Calcul des commissions

#### Types
- `src/types/payments.ts` - Mise à jour avec statut `pending_payment`

#### Base de données
- **✨ `supabase/migrations/add_pre_approved_status.sql`** - Migration pour le nouveau workflow (NOUVEAU)
- `supabase/migrations/create_practitioner_requests.sql` - Table de base
- `supabase/migrations/create_practitioner_contracts.sql` - Gestion des contrats
- `supabase/migrations/fix_practitioner_requests_fk.sql`
- `supabase/migrations/cleanup_practitioner_requests.sql`

#### Routing
- `src/App.tsx` - Ajout de la route `/practitioner-onboarding`

### Documentation
- **✨ `GUIDE_GESTION_INTERVENANTS.md`** - Ce guide (mis à jour)
- **✨ `GUIDE_PAIEMENT_ABONNEMENTS_INTERVENANTS.md`** - Configuration paiements abonnements (NOUVEAU)
- `GUIDE_CONFIGURATION_STRIPE.md` - Configuration Stripe Connect (pour paiements clients)
- `ACTION_CONFIGURATION.md` - Actions de configuration
- `ETAT_AVANCEMENT_COMMISSIONS.md` - État d'avancement du système

---

## ✅ Checklist Admin

Avant d'approuver un intervenant :

- [ ] Vérifier l'identité (nom, email)
- [ ] Lire la motivation et l'expérience
- [ ] Vérifier les certifications/diplômes
- [ ] Choisir le bon type de contrat
- [ ] Uploader le contrat signé (si applicable)
- [ ] Ajouter des notes si nécessaire
- [ ] Valider l'approbation

Après l'approbation :

- [ ] Vérifier que le compte intervenant est créé
- [ ] Vérifier que le contrat est actif
- [ ] S'assurer que l'intervenant a reçu l'email
- [ ] Suivre la configuration Stripe
- [ ] Vérifier la création du premier service

---

## 🎉 Conclusion

Le système de gestion des demandes d'intervenants a été **amélioré avec un parcours autonome** ! Il permet maintenant :

✅ Une gestion centralisée et sécurisée
✅ Un workflow clair et automatisé
✅ **✨ L'autonomie des intervenants sur le choix de leur contrat**
✅ Une validation admin simple (activation du parcours)
✅ Une traçabilité complète
✅ Une intégration transparente avec Stripe
✅ **✨ Une redirection automatique vers la finalisation**

### 🆕 Avantages du nouveau workflow :

**Pour les intervenants :**
- 🎯 **Choix libre** du type de contrat selon leur activité
- ⚡ **Inscription plus rapide** - pas d'attente de validation admin complète
- 🔄 **Processus fluide** avec redirection automatique
- 📱 Interface dédiée et guidée en 3 étapes

**Pour les admins :**
- 🚀 **Moins de travail** - juste activer le parcours
- ✅ **Validation simple** en un clic
- 📊 **Suivi clair** avec le statut `pre_approved`
- 🔍 **Visibilité** sur les inscriptions en cours

**Prochaines étapes :**

1. **Appliquer la migration SQL** (ajout statuts `pre_approved` et `pending_payment`)
2. **Configurer Stripe pour les abonnements** selon `GUIDE_PAIEMENT_ABONNEMENTS_INTERVENANTS.md`
3. **Configurer Stripe Connect** pour les paiements clients selon `GUIDE_CONFIGURATION_STRIPE.md`

### 📝 Pour appliquer les modifications :

```bash
# 1. Appliquer la migration SQL
npx supabase migration apply

# 2. Redémarrer le serveur de développement
npm run dev

# 3. Configurer Stripe (voir GUIDE_PAIEMENT_ABONNEMENTS_INTERVENANTS.md)
# - Créer les produits/prix
# - Configurer les webhooks
# - Déployer les Edge Functions

# 4. Tester le nouveau workflow !
```

### 🧪 Tests Recommandés

1. **Test FREE** : Inscription sans paiement (activation immédiate)
2. **Test STARTER/PRO/PREMIUM** : Inscription avec paiement simulé
3. **Test Webhook** : Vérifier l'activation après paiement
4. **Test Échec** : Gérer les paiements échoués
