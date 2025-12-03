# 🔄 Guide de Changement d'Abonnement Intervenant

## 🎯 Fonctionnalité

Les intervenants peuvent maintenant **changer d'abonnement en toute autonomie** depuis leur profil, sans intervention de l'admin !

---

## 📱 Interface Utilisateur

### **Accès** : `/practitioner/profile` → Onglet "Mon Abonnement"

### **Affichage**

L'intervenant voit :
- ✅ **Type de contrat actuel** (FREE, STARTER, PRO, PREMIUM)
- ✅ **Tarif mensuel**
- ✅ **Date de début** du contrat
- ✅ **Date de fin** (si changement planifié)
- ✅ **Détails des commissions**
- ✅ **Nombre de RDV ce mois-ci**
- ✅ **Limite de RDV** (si applicable)

### **Actions**

- 🔄 **Bouton "Changer d'abonnement"**
  - S'ouvre dans un dialog
  - Affiche tous les types de contrats disponibles
  - Explique le processus de changement

---

## ⚙️ Comment ça fonctionne ?

### **Processus de changement**

```
1. L'intervenant clique sur "Changer d'abonnement"
   └─> Dialog s'ouvre avec le sélecteur de contrat
       │
       ├─> Choisit nouveau type (ex: FREE → PRO)
       │
       └─> Clique "Planifier le changement"
           │
           ├─> Le contrat actuel est mis à jour avec une end_date (fin du mois)
           │
           ├─> Un nouveau contrat est créé pour le 1er du mois suivant
           │   └─> Si FREE: status = 'active'
           │   └─> Si STARTER/PRO/PREMIUM: status = 'pending_payment'
           │
           └─> Message de confirmation affiché
```

### **Exemple concret**

**Aujourd'hui** : 15 janvier 2025
**Contrat actuel** : FREE

**Action** : Changement vers PRO

**Résultat** :
- Contrat FREE : actif jusqu'au 31 janvier 2025
- Nouveau contrat PRO : démarre le 1er février 2025
- Statut : `pending_payment` (paiement requis avant activation)

---

## 💾 Base de données

### **Tables impactées**

#### `practitioner_contracts`

**Contrat actuel** (mis à jour) :
```sql
UPDATE practitioner_contracts
SET
  end_date = '2025-01-31',
  admin_notes = 'Changement vers PRO prévu pour le 1er février 2025'
WHERE id = [contrat_actuel_id];
```

**Nouveau contrat** (créé) :
```sql
INSERT INTO practitioner_contracts (
  practitioner_id,
  contract_type,
  start_date,
  status,
  monthly_fee,
  commission_fixed,
  commission_percentage,
  ...
) VALUES (
  [practitioner_id],
  'pro',
  '2025-02-01',
  'pending_payment', -- ou 'active' si FREE
  100.00,
  3.00,
  NULL,
  ...
);
```

---

## 🔍 Règles métier

### **Restrictions**

1. ✅ **Impossible de changer si un changement est déjà planifié**
   - Si le contrat actuel a une `end_date`, le bouton est désactivé
   - Message : "Un changement d'abonnement est déjà planifié"

2. ✅ **Changement vers le même type désactivé**
   - Le bouton "Planifier" est désactivé si on choisit le même type

3. ✅ **Date de fin = fin du mois en cours**
   - Calculée automatiquement (dernier jour du mois)

4. ✅ **Date de début du nouveau = 1er du mois suivant**
   - Jour suivant la date de fin du contrat actuel

### **Paiement**

- **FREE** → Autre type : Nouveau contrat en `pending_payment`
- **Autre type** → FREE : Activation immédiate
- **Autre type** → **Autre type** : Nouveau contrat en `pending_payment`

---

## 🧪 Tests

### **Test 1 : Changement FREE → PRO**
```
1. Connecté en tant qu'intervenant avec contrat FREE
2. Aller sur /practitioner/profile
3. Cliquer sur onglet "Mon Abonnement"
4. Vérifier affichage du contrat actuel
5. Cliquer "Changer d'abonnement"
6. Sélectionner PRO
7. Cliquer "Planifier le changement"
8. Vérifier message de confirmation
9. Recharger → Voir "Un changement est planifié"
```

### **Test 2 : Changement avec date**
```
1. Vérifier que le contrat actuel a une end_date = fin du mois
2. Vérifier dans BDD qu'un nouveau contrat existe
3. Vérifier start_date du nouveau = 1er du mois suivant
4. Vérifier status = pending_payment (si PRO)
```

### **Test 3 : Impossible de re-changer**
```
1. Après avoir planifié un changement
2. Le bouton "Changer d'abonnement" doit être caché
3. Message "Un changement est déjà planifié" affiché
```

---

## 🛠️ Composants créés

### **`SubscriptionManagement.tsx`**

**Props** :
- `practitionerId: string` - ID du praticien

**État** :
- `currentContract` - Contrat actuel
- `changeDialogOpen` - État du dialog
- `selectedNewType` - Nouveau type sélectionné
- `submitting` - État de soumission

**Fonctions** :
- `loadCurrentContract()` - Charge le contrat actif
- `handleChangeSubscription()` - Gère le changement

---

## 📊 Indicateurs

L'intervenant voit en temps réel :
- 📈 **Rendez-vous ce mois** : `appointments_this_month`
- 📊 **Total rendez-vous** : `total_appointments`
- ⚠️ **Limite atteinte** : Si `max_appointments_per_month` dépassé

---

## 🔮 Améliorations futures

1. **Historique des contrats**
   - Afficher tous les contrats passés
   - Voir l'évolution des abonnements

2. **Annulation de changement planifié**
   - Permettre d'annuler un changement avant son activation
   - Bouton "Annuler le changement planifié"

3. **Notifications**
   - Email de rappel avant changement
   - Notification quand le nouveau contrat est activé

4. **Calcul de prorata**
   - Remboursement partiel si downgrade
   - Paiement partiel si upgrade en cours de mois

5. **Historique des paiements**
   - Voir tous les paiements d'abonnement
   - Télécharger les factures

---

## 🎉 Avantages

**Pour l'intervenant** :
- 🚀 **Autonomie totale** - Pas besoin de contacter l'admin
- ⚡ **Changement flexible** - Adapter selon l'activité
- 📅 **Aucune interruption** - Continuité de service
- 💡 **Transparent** - Voir exactement quand le changement prend effet

**Pour FLM** :
- 📉 **Moins de support** - Les intervenants gèrent eux-mêmes
- 💰 **Plus de conversions** - Facilite les upgrades
- 📊 **Meilleur suivi** - Historique des changements
- 🔄 **Fidélisation** - Flexibilité = satisfaction

---

## ✅ Checklist de déploiement

- [x] Composant `SubscriptionManagement` créé
- [x] Page `PractitionerProfilePage` mise à jour avec onglets
- [x] Documentation mise à jour
- [ ] Tests effectués (FREE → PRO, PRO → FREE, etc.)
- [ ] Migration SQL appliquée
- [ ] Vérification en production

---

## 🆘 Support

### **Problème : Le bouton ne fonctionne pas**
**Solution** : Vérifier que le contrat actif existe et n'a pas de `end_date`

### **Problème : Le nouveau contrat n'apparaît pas**
**Solution** : Vérifier dans la table `practitioner_contracts` avec `start_date` future

### **Problème : Message "pending_payment" affiché**
**Solution** : Normal pour STARTER/PRO/PREMIUM - l'intervenant doit payer l'abonnement

---

## 📞 Contact

Pour toute question sur cette fonctionnalité, consultez :
- `GUIDE_GESTION_INTERVENANTS.md` - Guide complet
- `GUIDE_PAIEMENT_ABONNEMENTS_INTERVENANTS.md` - Configuration Stripe
