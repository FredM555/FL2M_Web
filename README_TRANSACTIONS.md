# 💳 Guide des Transactions Intervenants

## 🎯 Fonctionnalité

Les intervenants peuvent maintenant visualiser **toutes leurs transactions financières** depuis leur profil :
- 💰 **Paiements d'abonnement** : Tous les paiements mensuels d'abonnement
- 💵 **Revenus de rendez-vous** : Toutes les transactions liées aux rendez-vous

---

## 📱 Interface Utilisateur

### **Accès** : `/practitioner/profile` → Onglet "Mes Transactions"

### **Affichage**

L'intervenant voit :

#### **Résumé financier** (en haut de page)
- 💳 **Abonnements payés** : Total des paiements d'abonnement réussis
- 💰 **Revenus rendez-vous** : Total des revenus des rendez-vous
- 📊 **Commissions versées** : Total des commissions prélevées par la plateforme

#### **Onglet "Abonnements"**
- Liste de tous les paiements d'abonnement mensuels
- Pour chaque paiement :
  - Période couverte (ex: "Janvier 2025")
  - Montant payé
  - Statut (En attente, Réussi, Échoué, etc.)
  - Date de paiement
  - Lien vers la facture (si disponible)

#### **Onglet "Rendez-vous"**
- Liste de toutes les transactions de rendez-vous
- Pour chaque transaction :
  - Date de la transaction
  - Type de contrat applicable
  - Montant total (payé par le client)
  - Part du praticien (montant reçu)
  - Commission prélevée
  - Statut de la transaction

---

## 💾 Base de données

### **Nouvelles tables créées**

#### `subscription_payments`
Stocke tous les paiements d'abonnement des praticiens.

```sql
CREATE TABLE subscription_payments (
  id UUID PRIMARY KEY,
  practitioner_id UUID NOT NULL,
  contract_id UUID,

  -- Identifiants Stripe
  stripe_payment_intent_id TEXT,
  stripe_subscription_id TEXT,
  stripe_invoice_id TEXT,

  -- Montant
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'EUR',

  -- Période couverte
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,

  -- Statut
  status VARCHAR(20) NOT NULL,

  -- Dates
  payment_date TIMESTAMPTZ,
  refund_date TIMESTAMPTZ,

  -- Métadonnées
  description TEXT,
  failure_reason TEXT,
  invoice_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Exemple de données** :
```sql
INSERT INTO subscription_payments (
  practitioner_id,
  contract_id,
  amount,
  period_start_date,
  period_end_date,
  status,
  payment_date
) VALUES (
  '[practitioner_id]',
  '[contract_id]',
  60.00,
  '2025-02-01',
  '2025-02-28',
  'succeeded',
  '2025-02-01 10:30:00'
);
```

#### `transactions`
Stocke toutes les transactions de rendez-vous.

```sql
CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  appointment_id UUID,
  practitioner_id UUID NOT NULL,
  client_id UUID NOT NULL,

  -- Identifiants Stripe
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  stripe_transfer_id TEXT,

  -- Montants
  amount_total DECIMAL(10, 2) NOT NULL,
  amount_practitioner DECIMAL(10, 2) NOT NULL,
  amount_platform_commission DECIMAL(10, 2) NOT NULL,
  amount_stripe_fees DECIMAL(10, 2),

  -- Détails de la commission
  commission_type VARCHAR(20),
  is_free_appointment BOOLEAN DEFAULT false,
  appointment_number INTEGER,

  -- Statut
  status VARCHAR(20) NOT NULL,

  -- Dates
  payment_date TIMESTAMPTZ,
  transfer_date TIMESTAMPTZ,
  refund_date TIMESTAMPTZ,

  -- Métadonnées
  currency VARCHAR(3) DEFAULT 'EUR',
  description TEXT,
  failure_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Exemple de données** :
```sql
INSERT INTO transactions (
  appointment_id,
  practitioner_id,
  client_id,
  amount_total,
  amount_practitioner,
  amount_platform_commission,
  commission_type,
  status,
  payment_date
) VALUES (
  '[appointment_id]',
  '[practitioner_id]',
  '[client_id]',
  80.00,
  74.00,
  6.00,
  'starter',
  'succeeded',
  '2025-01-15 14:30:00'
);
```

#### `payouts`
Stocke les virements groupés aux praticiens.

```sql
CREATE TABLE payouts (
  id UUID PRIMARY KEY,
  practitioner_id UUID NOT NULL,

  -- Identifiants Stripe
  stripe_payout_id TEXT,
  stripe_account_id TEXT,

  -- Période
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,

  -- Montants
  amount_total DECIMAL(10, 2) NOT NULL,
  amount_transactions DECIMAL(10, 2) NOT NULL,
  amount_adjustments DECIMAL(10, 2),
  transaction_count INTEGER,

  -- Statut
  status VARCHAR(20) NOT NULL,

  -- Dates
  scheduled_date DATE,
  paid_date TIMESTAMPTZ,
  failed_date TIMESTAMPTZ,

  -- Métadonnées
  currency VARCHAR(3) DEFAULT 'EUR',
  description TEXT,
  failure_reason TEXT,
  admin_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);
```

---

## 🔐 Sécurité (RLS)

Les policies Row Level Security garantissent que :

### **Praticiens**
- ✅ Peuvent voir **leurs propres** transactions de rendez-vous
- ✅ Peuvent voir **leurs propres** paiements d'abonnement
- ✅ Peuvent voir **leurs propres** virements
- ❌ Ne peuvent pas voir les données d'autres praticiens

### **Clients**
- ✅ Peuvent voir **leurs propres** paiements de rendez-vous
- ❌ Ne peuvent pas voir les données des praticiens

### **Administrateurs**
- ✅ Peuvent voir **toutes** les transactions
- ✅ Peuvent gérer **tous** les virements
- ✅ Accès complet aux données financières

---

## 🛠️ Composants créés

### **`PractitionerTransactions.tsx`**

**Props** :
- `practitionerId: string` - ID du praticien

**État** :
- `tabValue` - Onglet actif (0 = Abonnements, 1 = Rendez-vous)
- `subscriptionPayments` - Liste des paiements d'abonnement
- `appointmentTransactions` - Liste des transactions de rendez-vous

**Fonctions** :
- `loadTransactions()` - Charge toutes les transactions
- `getStatusChip()` - Retourne un chip coloré selon le statut

**Calculs automatiques** :
- Total abonnements payés
- Total revenus rendez-vous
- Total commissions versées

---

## 📊 Statuts des transactions

### **Statuts possibles**

| Statut | Label | Couleur | Description |
|--------|-------|---------|-------------|
| `pending` | En attente | Warning (Orange) | Transaction en attente de traitement |
| `processing` | En cours | Info (Bleu) | Transaction en cours de traitement |
| `succeeded` | Réussi | Success (Vert) | Transaction réussie |
| `failed` | Échoué | Error (Rouge) | Transaction échouée |
| `refunded` | Remboursé | Default (Gris) | Transaction remboursée |
| `cancelled` | Annulé | Default (Gris) | Transaction annulée |

---

## 🔧 Installation

### **1. Appliquer les migrations**

Exécutez les fichiers SQL dans le Dashboard Supabase :

#### **a) Créer les tables** :
```bash
# Fichier : supabase/migrations/create_payment_tables.sql
```

Allez dans **Dashboard Supabase** > **SQL Editor** et exécutez ce fichier.

#### **b) Corriger les tarifs de contrat** :
```bash
# Fichier : supabase/migrations/fix_contract_pricing.sql
```

Cela mettra à jour :
- La fonction `complete_practitioner_onboarding()` pour remplir les tarifs
- Tous les contrats existants avec des valeurs correctes

### **2. Vérifier l'intégration**

Le composant est déjà intégré dans :
- `src/pages/PractitionerProfilePage.tsx`
- Onglet "Mes Transactions" (3ème onglet)

---

## 🧪 Tests

### **Test 1 : Affichage sans données**
```
1. Se connecter en tant qu'intervenant
2. Aller sur /practitioner/profile
3. Cliquer sur l'onglet "Mes Transactions"
4. Vérifier que l'affichage montre "Aucun paiement..."
5. Vérifier que les totaux sont à 0€
```

### **Test 2 : Affichage avec données simulées**
```sql
-- Insérer un paiement d'abonnement de test
INSERT INTO subscription_payments (
  practitioner_id,
  amount,
  period_start_date,
  period_end_date,
  status,
  payment_date
) VALUES (
  '[votre_practitioner_id]',
  60.00,
  '2025-01-01',
  '2025-01-31',
  'succeeded',
  '2025-01-01 10:00:00'
);

-- Insérer une transaction de rendez-vous de test
INSERT INTO transactions (
  practitioner_id,
  client_id,
  amount_total,
  amount_practitioner,
  amount_platform_commission,
  commission_type,
  status,
  payment_date
) VALUES (
  '[votre_practitioner_id]',
  '[un_client_id]',
  80.00,
  74.00,
  6.00,
  'starter',
  'succeeded',
  '2025-01-15 14:30:00'
);
```

### **Test 3 : Vérifier les calculs**
```
1. Après avoir inséré des données de test
2. Recharger la page
3. Vérifier que les résumés affichent :
   - Abonnements payés : 60,00 €
   - Revenus rendez-vous : 74,00 €
   - Commissions versées : 6,00 €
```

---

## 🔄 Intégration Stripe (Futur)

### **Webhooks à configurer**

Pour alimenter automatiquement ces tables, il faudra créer des Edge Functions qui écoutent les événements Stripe :

#### **1. Paiements d'abonnement**
```typescript
// Écouter : invoice.payment_succeeded
// Action : Créer un enregistrement dans subscription_payments
```

#### **2. Paiements de rendez-vous**
```typescript
// Écouter : payment_intent.succeeded
// Action : Créer un enregistrement dans transactions
```

#### **3. Virements**
```typescript
// Écouter : payout.paid
// Action : Mettre à jour l'enregistrement dans payouts
```

**Voir** : `GUIDE_PAIEMENT_ABONNEMENTS_INTERVENANTS.md` pour les détails d'intégration Stripe.

---

## 📝 Notes importantes

### **Tables vides par défaut**
Les tables `subscription_payments` et `transactions` sont vides par défaut. Elles seront remplies :
- Manuellement (pour les tests)
- Automatiquement via Stripe webhooks (en production)

### **Données historiques**
Si vous avez des paiements existants, vous devrez les migrer manuellement dans ces nouvelles tables.

### **Performance**
Les index ont été créés sur les colonnes clés pour garantir de bonnes performances même avec des milliers de transactions.

---

## 🎉 Avantages

**Pour l'intervenant** :
- 📊 **Transparence totale** - Voir tous ses paiements et revenus
- 💰 **Suivi financier** - Comprendre ses gains et commissions
- 📈 **Historique complet** - Accès à toutes les transactions passées
- 🧾 **Factures** - Télécharger les factures d'abonnement

**Pour FLM** :
- 📉 **Moins de support** - Les intervenants trouvent l'info eux-mêmes
- 🔍 **Transparence** - Renforce la confiance
- 📊 **Traçabilité** - Toutes les transactions sont trackées
- 💼 **Professionnalisme** - Interface claire et complète

---

## ✅ Checklist de déploiement

- [x] Tables SQL créées (`subscription_payments`, `transactions`, `payouts`)
- [x] Policies RLS configurées
- [x] Composant `PractitionerTransactions` créé
- [x] Page `PractitionerProfilePage` mise à jour avec onglet Transactions
- [ ] Migration `create_payment_tables.sql` appliquée en base
- [ ] Migration `fix_contract_pricing.sql` appliquée en base
- [ ] Tests effectués avec données simulées
- [ ] Webhooks Stripe configurés (pour production)
- [ ] Données historiques migrées (si nécessaire)

---

## 🆘 Support

### **Problème : Onglet vide**
**Solution** : Les tables sont vides. Insérez des données de test ou attendez que les webhooks Stripe fonctionnent.

### **Problème : Erreur de chargement**
**Solution** : Vérifiez que les tables ont été créées et que les policies RLS sont actives.

### **Problème : Totaux incorrects**
**Solution** : Vérifiez que les statuts des transactions sont bien 'succeeded' pour être comptés.

---

## 📞 Contact

Pour toute question sur cette fonctionnalité, consultez :
- `GUIDE_PAIEMENT_ABONNEMENTS_INTERVENANTS.md` - Configuration Stripe
- `README_CHANGEMENT_ABONNEMENT.md` - Gestion des abonnements
- `GUIDE_GESTION_INTERVENANTS.md` - Guide complet intervenants
