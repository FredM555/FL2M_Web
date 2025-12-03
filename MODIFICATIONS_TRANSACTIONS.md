# 📝 Modifications - Transactions et Correctifs

## 🗓️ Date : 2 décembre 2025

---

## ✅ Corrections effectuées

### 1. **Bug d'affichage 0€ pour STARTER**

**Problème** : Les contrats STARTER affichaient 0€ au lieu de 60€/mois

**Cause** : La fonction SQL `complete_practitioner_onboarding()` ne remplissait pas les champs de tarification lors de la création du contrat.

**Solution** :
- Mise à jour de la fonction SQL pour remplir automatiquement :
  - `monthly_fee`
  - `commission_fixed`
  - `commission_percentage`
  - `commission_cap`
  - `max_appointments_per_month`

**Fichiers modifiés** :
- ✅ `supabase/migrations/add_pre_approved_status.sql` - Fonction mise à jour
- ✅ `supabase/migrations/fix_contract_pricing.sql` - Migration de correctif créée
- ✅ `apply_contract_pricing_fix.cjs` - Script pour appliquer le correctif

**Valeurs par type de contrat** :

| Type | Abonnement | Commission fixe | Commission % | Plafond |
|------|-----------|----------------|--------------|---------|
| FREE | 0€ | 10€ | 12% | 25€ |
| STARTER | 60€ | 6€ | 8% | - |
| PRO | 100€ | 3€ | - | - |
| PREMIUM | 160€ | 0€ | - | - |

**À faire** :
- [ ] Appliquer la migration `fix_contract_pricing.sql` via le Dashboard Supabase
- [ ] Vérifier que tous les contrats existants ont les bonnes valeurs

---

## 🆕 Nouvelles fonctionnalités

### 2. **Onglet Transactions**

**Fonctionnalité** : Les intervenants peuvent maintenant voir toutes leurs transactions financières

**Ce qui a été créé** :

#### **A. Nouvelles tables SQL**

**`subscription_payments`** - Paiements d'abonnement mensuel
```sql
- practitioner_id : ID du praticien
- contract_id : ID du contrat lié
- amount : Montant payé
- period_start_date : Début de la période
- period_end_date : Fin de la période
- status : pending, succeeded, failed, refunded, cancelled
- payment_date : Date du paiement
- invoice_url : Lien vers la facture
```

**`transactions`** - Transactions de rendez-vous
```sql
- appointment_id : ID du rendez-vous
- practitioner_id : ID du praticien
- client_id : ID du client
- amount_total : Montant total payé par le client
- amount_practitioner : Part du praticien
- amount_platform_commission : Commission FLM
- commission_type : Type de contrat applicable
- status : pending, succeeded, failed, refunded, cancelled
- payment_date : Date du paiement
```

**`payouts`** - Virements groupés aux praticiens
```sql
- practitioner_id : ID du praticien
- period_start_date : Début de la période
- period_end_date : Fin de la période
- amount_total : Montant total du virement
- transaction_count : Nombre de transactions incluses
- status : pending, processing, paid, failed, cancelled
- scheduled_date : Date prévue
- paid_date : Date effective
```

#### **B. Composant React**

**`PractitionerTransactions.tsx`** - Composant d'affichage des transactions

**Fonctionnalités** :
- 📊 **Résumé financier** :
  - Total abonnements payés
  - Total revenus rendez-vous
  - Total commissions versées

- 📑 **Onglet "Abonnements"** :
  - Liste tous les paiements d'abonnement
  - Affiche période, montant, statut, date
  - Lien vers facture (si disponible)

- 💰 **Onglet "Rendez-vous"** :
  - Liste toutes les transactions de rendez-vous
  - Affiche montant total, part praticien, commission
  - Type de contrat et statut

#### **C. Intégration**

**`PractitionerProfilePage.tsx`** - Ajout du 3ème onglet

**Modifications** :
- Import du composant `PractitionerTransactions`
- Import de l'icône `ReceiptIcon`
- Ajout de l'onglet "Mes Transactions"
- Intégration du composant avec `practitionerId`

#### **D. Sécurité (RLS)**

**Policies créées** :
- ✅ Praticiens : Voient uniquement leurs propres transactions
- ✅ Clients : Voient uniquement leurs propres paiements
- ✅ Admins : Voient et gèrent toutes les données

**Fichiers créés** :
- ✅ `supabase/migrations/create_payment_tables.sql` - Création des tables
- ✅ `src/components/practitioner/PractitionerTransactions.tsx` - Composant d'affichage
- ✅ `README_TRANSACTIONS.md` - Documentation complète

**Fichiers modifiés** :
- ✅ `src/pages/PractitionerProfilePage.tsx` - Ajout de l'onglet Transactions

**À faire** :
- [ ] Appliquer la migration `create_payment_tables.sql` via le Dashboard Supabase
- [ ] Tester l'affichage avec des données simulées
- [ ] Configurer les webhooks Stripe pour alimenter automatiquement les tables

---

## 📋 Résumé des fichiers

### **Fichiers créés**

1. `supabase/migrations/fix_contract_pricing.sql` - Correctif tarifs contrats
2. `supabase/migrations/create_payment_tables.sql` - Tables de paiement
3. `src/components/practitioner/PractitionerTransactions.tsx` - Composant transactions
4. `apply_contract_pricing_fix.cjs` - Script de migration
5. `README_TRANSACTIONS.md` - Documentation
6. `MODIFICATIONS_TRANSACTIONS.md` - Ce fichier

### **Fichiers modifiés**

1. `supabase/migrations/add_pre_approved_status.sql` - Fonction `complete_practitioner_onboarding()` mise à jour
2. `src/pages/PractitionerProfilePage.tsx` - Ajout onglet Transactions

---

## 🚀 Déploiement

### **Ordre d'application des migrations**

```bash
# 1. Corriger les tarifs des contrats
# Exécuter dans Dashboard Supabase > SQL Editor
supabase/migrations/fix_contract_pricing.sql

# 2. Créer les tables de paiement
# Exécuter dans Dashboard Supabase > SQL Editor
supabase/migrations/create_payment_tables.sql
```

### **Vérification**

#### **1. Vérifier les tarifs de contrats**
```sql
SELECT
  contract_type,
  monthly_fee,
  commission_fixed,
  commission_percentage,
  status
FROM practitioner_contracts
ORDER BY created_at DESC
LIMIT 10;
```

**Résultat attendu** :
- STARTER : 60€/mois, 6€ fixe, 8%
- PRO : 100€/mois, 3€ fixe
- PREMIUM : 160€/mois, 0€ fixe

#### **2. Vérifier les tables de paiement**
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('subscription_payments', 'transactions', 'payouts');
```

**Résultat attendu** : 3 tables trouvées

#### **3. Tester avec données simulées**
```sql
-- Insérer un paiement de test
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
  NOW()
);
```

---

## 📊 Impact

### **Base de données**
- ✅ 3 nouvelles tables créées
- ✅ 12 nouvelles policies RLS
- ✅ 9 nouveaux index pour performance
- ✅ 1 fonction SQL mise à jour

### **Frontend**
- ✅ 1 nouveau composant créé
- ✅ 1 page modifiée
- ✅ Aucune dépendance ajoutée

### **Documentation**
- ✅ 3 fichiers de documentation créés/mis à jour

---

## ✅ Tests recommandés

### **Test 1 : Affichage des contrats**
1. Se connecter en tant qu'intervenant
2. Aller sur `/practitioner/profile` > Onglet "Mon Abonnement"
3. Vérifier que le tarif s'affiche correctement (pas 0€)

### **Test 2 : Onglet Transactions vide**
1. Se connecter en tant qu'intervenant
2. Aller sur `/practitioner/profile` > Onglet "Mes Transactions"
3. Vérifier que l'affichage montre "Aucun paiement..."
4. Vérifier que les totaux sont à 0€

### **Test 3 : Transactions avec données**
1. Insérer des données de test (voir SQL ci-dessus)
2. Recharger la page
3. Vérifier que les transactions s'affichent
4. Vérifier que les totaux sont corrects

---

## 🔮 Améliorations futures

1. **Graphiques de revenus**
   - Graphique mensuel des revenus
   - Évolution des commissions
   - Comparaison année/année

2. **Export des données**
   - Export CSV de toutes les transactions
   - Export PDF des factures
   - Génération de rapport annuel

3. **Filtres avancés**
   - Filtrer par période
   - Filtrer par statut
   - Filtrer par type de transaction

4. **Notifications**
   - Email lors d'un paiement reçu
   - Alerte si paiement échoué
   - Rappel avant échéance

---

## 📞 Support

En cas de problème, vérifier :
1. Les migrations ont bien été appliquées
2. Les policies RLS sont actives
3. L'utilisateur connecté est bien un intervenant
4. Le `practitioner_id` est correct

Documentation complète : `README_TRANSACTIONS.md`
