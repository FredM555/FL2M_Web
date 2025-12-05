# 💳 Guide Stripe Connect - Paiements aux Intervenants

**Date :** 2025-12-05
**Version :** 1.0
**Statut :** ✅ Implémentation complète

---

## 📖 Vue d'ensemble

Stripe Connect permet aux intervenants de recevoir automatiquement leurs paiements directement sur leur compte bancaire. Ce système gère :

- ✅ L'onboarding des intervenants (création compte Stripe Connect)
- ✅ La vérification automatique de l'identité et des informations bancaires
- ✅ Les transferts automatiques après chaque rendez-vous
- ✅ La gestion des commissions de la plateforme

---

## 🔄 Flux Complet Intervenant

### Étape 1 : Inscription de l'intervenant

```
[Intervenant s'inscrit sur FLM Services]
     ↓
[Choisit son forfait]
     ↓
[Compte créé mais stripe_account_id = NULL]
     ↓
[Bannière s'affiche : "Configurez votre compte de paiement"]
```

### Étape 2 : Configuration Stripe Connect

```
[Intervenant clique sur "Configurer"]
     ↓
[Redirigé vers /practitioner/stripe-connect]
     ↓
[Frontend] Appelle createConnectAccount()
     ↓
[Edge Function] stripe-create-connect-account
     ├─ Crée un compte Stripe Connect Express
     ├─ Enregistre stripe_account_id dans la DB
     └─ Génère un lien d'onboarding Stripe
     ↓
[Intervenant redirigé vers Stripe]
     ↓
[Intervenant remplit] :
     ├─ IBAN (compte bancaire)
     ├─ Pièce d'identité
     ├─ Adresse
     └─ Autres informations
     ↓
[Stripe valide les informations]
     ↓
[Webhook] account.updated → stripe_account_status: 'complete'
     ↓
[Intervenant redirigé vers /practitioner/stripe-connect/success]
     ↓
[Compte actif] ✅ Peut recevoir des paiements
```

### Étape 3 : Réception des paiements

```
[Client paie un rendez-vous]
     ↓
[Transaction créée avec montant total et commission]
     ↓
[Validation client OU 48h après le RDV]
     ↓
[CRON] process-payouts
     ├─ Vérifie transactions éligibles
     ├─ Vérifie stripe_account_id de l'intervenant
     └─ Crée un transfer Stripe
     ↓
[Stripe transfert l'argent]
     ↓
[Webhook] transfer.updated → transfer_status: 'completed'
     ↓
[Argent sur le compte bancaire de l'intervenant] 💰
```

---

## 📁 Fichiers Créés

### Backend - Edge Functions

```
supabase/functions/
├── stripe-create-connect-account/
│   └── index.ts                        ✅ Crée compte Connect + lien onboarding
├── stripe-check-connect-status/
│   └── index.ts                        ✅ Vérifie statut du compte
└── stripe-webhook/
    └── index.ts                        ✅ Gère account.updated (mis à jour)
```

### Frontend

```
src/
├── services/
│   └── stripeConnect.ts                ✅ Service Stripe Connect
├── pages/
│   ├── PractitionerStripeConnectPage.tsx           ✅ Page onboarding
│   └── PractitionerStripeConnectSuccessPage.tsx    ✅ Page succès
└── components/
    └── practitioner/
        └── StripeConnectBanner.tsx     ✅ Bannière statut compte
```

### Base de données

```
supabase/migrations/
└── add_stripe_connect_columns.sql      ✅ Colonnes Stripe Connect
```

---

## 🗄️ Structure Base de Données

### Colonnes ajoutées à `practitioners`

```sql
stripe_account_id TEXT                  -- ID du compte Stripe Connect
stripe_account_status VARCHAR(20)       -- not_created, incomplete, pending, complete
stripe_charges_enabled BOOLEAN          -- Peut recevoir des paiements
stripe_payouts_enabled BOOLEAN          -- Peut effectuer des retraits
stripe_onboarding_completed_at TIMESTAMPTZ  -- Date de complétion
```

### États possibles

| Statut | Description | Action |
|--------|-------------|--------|
| `not_created` | Aucun compte Stripe Connect | Créer le compte |
| `incomplete` | Compte créé mais info manquantes | Compléter l'onboarding |
| `pending` | En attente de vérification Stripe | Attendre |
| `complete` | Compte vérifié et actif | Peut recevoir paiements ✅ |

---

## 🔧 Configuration

### 1. Déployer les Edge Functions

```bash
# Déployer les nouvelles fonctions
supabase functions deploy stripe-create-connect-account
supabase functions deploy stripe-check-connect-status

# Redéployer le webhook (mis à jour avec account.updated)
supabase functions deploy stripe-webhook --no-verify-jwt
```

### 2. Appliquer la migration SQL

```bash
# Via Supabase CLI
supabase db push

# Ou via SQL directement
psql -h db.[projet].supabase.co -U postgres -d postgres \
  -f supabase/migrations/add_stripe_connect_columns.sql
```

### 3. Mettre à jour le webhook Stripe

Dans le Dashboard Stripe → Développeurs → Webhooks :

**Ajouter l'événement :**
```
☑ account.updated
```

Vous devriez maintenant avoir **11 événements cochés** (au lieu de 10).

### 4. Ajouter les routes dans votre routeur

```tsx
// Dans App.tsx ou votre fichier de routes
<Route path="/practitioner/stripe-connect" element={<PractitionerStripeConnectPage />} />
<Route path="/practitioner/stripe-connect/success" element={<PractitionerStripeConnectSuccessPage />} />
```

### 5. Ajouter la bannière sur le profil intervenant

Dans votre page `PractitionerProfilePage.tsx`, ajouter en haut :

```tsx
import { StripeConnectBanner } from '../components/practitioner/StripeConnectBanner';

// Dans le rendu
<StripeConnectBanner />
```

---

## 🧪 Tests

### Test 1 : Créer un compte Connect

1. **Se connecter** en tant qu'intervenant
2. **Aller** sur le profil → Voir la bannière rouge
3. **Cliquer** sur "Configurer"
4. **Vérifier** la redirection vers Stripe

### Test 2 : Compléter l'onboarding (Mode TEST)

Stripe fournit des valeurs de test pour l'onboarding :

**Informations personnelles :**
```
Prénom : Test
Nom : User
Date de naissance : 01/01/1990
Téléphone : +33612345678
```

**Adresse :**
```
Adresse : 123 rue de Test
Code postal : 75001
Ville : Paris
Pays : France
```

**IBAN (TEST) :**
```
IBAN : FR1420041010050500013M02606
```

**Pièce d'identité :**
- Cliquer sur "Utiliser des données de test"
- Ou uploader une image quelconque (en mode test, elle est acceptée)

### Test 3 : Vérifier le statut

Après l'onboarding :

```bash
# Vérifier dans la base de données
SELECT
  id,
  stripe_account_id,
  stripe_account_status,
  stripe_charges_enabled
FROM practitioners
WHERE user_id = '[votre_user_id]';
```

Résultat attendu :
```
stripe_account_id: acct_xxxxx
stripe_account_status: complete
stripe_charges_enabled: true
```

### Test 4 : Tester un transfert

1. **Créer** un rendez-vous payant
2. **Client paie** le rendez-vous
3. **Valider** immédiatement ou attendre 48h
4. **Exécuter** process-payouts :
   ```bash
   curl -X POST https://[projet].supabase.co/functions/v1/process-payouts \
     -H "Authorization: Bearer [service-role-key]"
   ```
5. **Vérifier** dans Stripe Dashboard → Connect → Transfers

---

## 🎨 Composants Frontend

### StripeConnectBanner

Bannière qui s'affiche sur le profil de l'intervenant selon le statut :

**Props :**
```tsx
<StripeConnectBanner
  compact={false}  // Mode compact (moins de texte)
/>
```

**Affichage selon statut :**
- 🔴 **not_created** : Bannière rouge "Action requise"
- 🟡 **incomplete** : Bannière orange "Configuration incomplète"
- 🔵 **pending** : Bannière bleue "Vérification en cours"
- 🟢 **complete** : Bannière verte "Compte actif" (ou rien en mode compact)

---

## 🔒 Sécurité

### Bonnes pratiques implémentées

✅ **Vérification de l'authentification**
- Les Edge Functions vérifient le token JWT
- Seul l'intervenant peut créer/voir son propre compte

✅ **Validation Stripe**
- Stripe vérifie l'identité (KYC)
- Stripe valide l'IBAN
- Stripe vérifie l'adresse

✅ **Métadonnées**
- Le `practitioner_id` est stocké dans les metadata du compte Stripe
- Permet de lier le compte Stripe au compte FLM Services

✅ **Webhooks sécurisés**
- Signature vérifiée avec `STRIPE_WEBHOOK_SECRET`
- Mise à jour automatique du statut

---

## 🐛 Dépannage

### Problème : L'intervenant ne peut pas créer de compte

**Vérifications :**
```bash
# 1. Vérifier que les Edge Functions sont déployées
supabase functions list

# 2. Vérifier les logs
# Dashboard Supabase → Edge Functions → Logs

# 3. Vérifier que l'intervenant est bien authentifié
# Vérifier le token JWT dans la console navigateur
```

### Problème : Le webhook account.updated n'est pas reçu

**Vérifications :**
```bash
# 1. Dashboard Stripe → Développeurs → Webhooks
# Vérifier que l'événement account.updated est coché

# 2. Vérifier l'URL du webhook
# Doit être : https://[projet].supabase.co/functions/v1/stripe-webhook

# 3. Tester le webhook manuellement
# Dashboard Stripe → Webhooks → Votre webhook → Envoyer un événement de test
```

### Problème : Le statut reste sur "incomplete"

**Causes possibles :**
- L'intervenant n'a pas terminé l'onboarding sur Stripe
- Les informations fournies sont invalides
- La vérification Stripe est en cours (peut prendre quelques minutes)

**Solution :**
```bash
# Vérifier le statut directement dans Stripe
# Dashboard Stripe → Connect → Accounts
# Cliquer sur le compte pour voir les détails
```

---

## 📊 Monitoring

### Dashboard Stripe

**Connect → Accounts :**
- Liste tous les comptes Connect créés
- Statut de chaque compte
- Détails de vérification

**Connect → Transfers :**
- Liste tous les transferts effectués
- Montants transférés
- Statut des transferts

### Dashboard Supabase

**Database → Query Editor :**
```sql
-- Comptes Connect par statut
SELECT
  stripe_account_status,
  COUNT(*) as count
FROM practitioners
GROUP BY stripe_account_status;

-- Intervenants sans compte Connect
SELECT
  p.id,
  prof.email,
  prof.first_name,
  prof.last_name,
  p.stripe_account_status
FROM practitioners p
JOIN profiles prof ON prof.id = p.user_id
WHERE p.stripe_account_status = 'not_created'
   OR p.stripe_account_id IS NULL;
```

---

## 🚀 Flux Utilisateur Complet

### Pour l'intervenant

```
[Inscription] → [Paiement forfait] → [Profil avec bannière]
     ↓
[Clic "Configurer compte"]
     ↓
[Redirection Stripe] → [Formulaire d'onboarding]
     ↓
[Renseigner IBAN + ID] → [Validation]
     ↓
[Retour sur FLM Services] → [Bannière verte "Compte actif"]
     ↓
[Peut recevoir des paiements] 💰
```

### Pour la plateforme

```
[Webhook account.updated reçu]
     ↓
[Mise à jour stripe_account_status = 'complete']
     ↓
[Intervenant peut maintenant recevoir des transferts]
     ↓
[CRON process-payouts s'exécute]
     ↓
[Transferts automatiques vers le compte bancaire]
```

---

## ✅ Checklist de Déploiement

- [ ] Migration SQL appliquée (`add_stripe_connect_columns.sql`)
- [ ] Edge Functions déployées :
  - [ ] `stripe-create-connect-account`
  - [ ] `stripe-check-connect-status`
  - [ ] `stripe-webhook` (mis à jour)
- [ ] Webhook Stripe mis à jour avec `account.updated`
- [ ] Routes ajoutées au routeur React
- [ ] Composant `StripeConnectBanner` ajouté au profil intervenant
- [ ] Tests effectués :
  - [ ] Création de compte Connect
  - [ ] Onboarding complet
  - [ ] Vérification du statut
  - [ ] Transfert test

---

## 📞 Support

### Logs à vérifier en cas de problème

1. **Edge Functions Supabase** : Dashboard → Edge Functions → Logs
2. **Webhooks Stripe** : Dashboard Stripe → Développeurs → Logs
3. **Base de données** : Vérifier les colonnes `stripe_*` dans `practitioners`

### Commandes utiles

```bash
# Vérifier le statut d'un intervenant
curl -X POST https://[projet].supabase.co/functions/v1/stripe-check-connect-status \
  -H "Authorization: Bearer [user-jwt-token]"

# Forcer un refresh du statut (en tant qu'intervenant)
# Aller sur /practitioner/stripe-connect?refresh=true
```

---

**🎉 Stripe Connect est maintenant opérationnel !**

Les intervenants peuvent configurer leur compte bancaire et recevoir automatiquement leurs paiements.
