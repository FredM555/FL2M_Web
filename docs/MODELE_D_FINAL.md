# 💼 Modèle D - Grille Tarifaire Intervenants - Version Finale

**Date:** 2025-01-27
**Version:** 3.0 (3 RDV gratuits pour STARTER et PRO uniquement)

---

## 🎯 Principe du Modèle

Le système de rémunération des intervenants est basé sur **4 types de contrats** avec des commissions différentes.

**🎁 Système de RDV gratuits :**
- **STARTER et PRO** : Les 3 premiers RDV sont GRATUITS (commission 0€)
- **SANS ENGAGEMENT et PREMIUM** : Pas de RDV gratuits (commission appliquée selon le plan)

---

## 💰 Les 4 Contrats

### 1. SANS ENGAGEMENT (Sans Abonnement)

**Coût mensuel :** 0€
**Limite :** RDV illimités

**Commission par RDV :**
- **10€/RDV OU 12% du prix** (le plus élevé des deux)
- **Plafonné à 25€/RDV maximum**

**Exemples :**
```
RDV à 60€  → 10€ commission (max(10, 7.2) = 10€)
RDV à 100€ → 12€ commission (max(10, 12) = 12€)
RDV à 150€ → 18€ commission (max(10, 18) = 18€)
RDV à 300€ → 25€ commission (plafond atteint)
```

**Avantages :**
- Aucun engagement
- Pas d'abonnement mensuel
- Idéal pour tester la plateforme

**Inconvénients :**
- Commission la plus élevée
- Pas de badge premium

---

### 2. STARTER (60€/mois) 🎁

**Coût mensuel :** 60€
**Limite :** **RDV illimités**

**🎁 BONUS : Les 3 premiers RDV sont GRATUITS (0€ de commission)**

**Commission par RDV (à partir du 4ème) :**
- **6€/RDV OU 8% du prix** (le MOINS élevé des deux)

**Exemples :**
```
RDV #1 à 60€  → 0€ commission (RDV gratuit)
RDV #2 à 60€  → 0€ commission (RDV gratuit)
RDV #3 à 60€  → 0€ commission (RDV gratuit)
RDV #4 à 60€  → 4,80€ commission (min(6, 4.8) = 4,80€)
RDV #5 à 100€ → 6€ commission (min(6, 8) = 6€)
RDV #6 à 150€ → 6€ commission (min(6, 12) = 6€)
```

**Point d'équilibre vs Sans Engagement :**
~10 RDV/mois (60€ + 7×6€ = 102€ vs ~100€ en Sans Engagement)

**Avantages :**
- **3 premiers RDV gratuits**
- Commission réduite ensuite
- RDV illimités
- Bon pour démarrer son activité

**Inconvénients :**
- Abonnement même sans activité

---

### 3. PRO (100€/mois) ⭐ RECOMMANDÉ 🎁

**Coût mensuel :** 100€
**Limite :** **RDV illimités**

**🎁 BONUS : Les 3 premiers RDV sont GRATUITS (0€ de commission)**

**Commission par RDV (à partir du 4ème) :**
- **3€/RDV** (frais technique Stripe uniquement)

**Exemples :**
```
RDV #1 à 60€  → 0€ commission (RDV gratuit)
RDV #2 à 100€ → 0€ commission (RDV gratuit)
RDV #3 à 150€ → 0€ commission (RDV gratuit)
RDV #4 à 60€  → 3€ commission
RDV #5 à 100€ → 3€ commission
Tous prix (après RDV #3) → 3€ commission
```

**Point d'équilibre vs Sans Engagement :**
~13 RDV/mois (100€ + 10×3€ = 130€ vs ~130€ en Sans Engagement)

**Avantages :**
- **3 premiers RDV gratuits**
- Commission très réduite ensuite
- RDV illimités
- Badge "Pro" sur le profil
- Priorisation dans les résultats de recherche
- Analytics basiques

---

### 4. PREMIUM (160€/mois) 👑 VIP

**Coût mensuel :** 160€
**Limite :** **RDV illimités**

**Commission par RDV :**
- **0€** (AUCUNE commission sur TOUS les RDV)

**Exemples :**
```
TOUS les RDV → 0€ commission (dès le 1er RDV)
```

**Point d'équilibre vs Sans Engagement :**
~16 RDV/mois (160€ vs ~160€ en commissions Sans Engagement)

**Avantages :**
- **Aucune commission, jamais (dès le 1er RDV)**
- Tout du plan Pro +
- Featured sur la homepage
- Newsletter dédiée (boost visibilité)
- Analytics avancés
- Export comptable

---

## 🔧 Logique Technique de Calcul

### Algorithme de Calcul Commission

```typescript
function calculateCommission(
  rdvPrice: number,            // Prix du RDV en euros
  contractType: 'free' | 'starter' | 'pro' | 'premium',
  appointmentNumber: number    // Numéro du RDV (1, 2, 3, 4...)
): number {

  // RÈGLE 1 : Les 3 premiers RDV sont GRATUITS pour STARTER et PRO
  const hasFreeAppointments = contractType === 'starter' || contractType === 'pro';

  if (hasFreeAppointments && appointmentNumber <= 3) {
    return 0; // RDV gratuit
  }

  // RÈGLE 2 : Calcul selon le type de contrat
  switch (contractType) {
    case 'free': // SANS ENGAGEMENT
      // 10€ OU 12% (le plus élevé), plafonné à 25€
      const commission = Math.max(10, rdvPrice * 0.12);
      return Math.min(commission, 25);

    case 'starter':
      // 6€ OU 8% (le MOINS élevé) - après les 3 RDV gratuits
      return Math.min(6, rdvPrice * 0.08);

    case 'pro':
      // 3€ fixe - après les 3 RDV gratuits
      return 3;

    case 'premium':
      // 0€ pour tous les RDV
      return 0;

    default:
      throw new Error('Type de contrat inconnu');
  }
}
```

---

## 📊 Exemples de Revenus Mensuels

### Cas 1 : 5 RDV/mois à 60€ (300€ brut)

| Contrat | Abonnement | Commissions | Total Coût | Net Intervenant |
|---------|-----------|-------------|-----------|----------------|
| Sans Engagement | 0€ | 50€ (5×10€) | 50€ | **250€** ✅ |
| Starter | 60€ | 9,60€ (2×4,80€)* | 69,60€ | **230,40€** |
| Pro | 100€ | 6€ (2×3€)* | 106€ | **194€** |
| Premium | 160€ | 0€ | 160€ | **140€** |

*3 premiers RDV gratuits, puis commission normale

**Meilleur choix : Sans Engagement**

---

### Cas 2 : 15 RDV/mois à 80€ (1 200€ brut)

| Contrat | Abonnement | Commissions | Total Coût | Net Intervenant |
|---------|-----------|-------------|-----------|----------------|
| Sans Engagement | 0€ | 150€ (15×10€) | 150€ | **1 050€** |
| Starter | 60€ | 72€ (12×6€)* | 132€ | **1 068€** ✅ |
| Pro | 100€ | 36€ (12×3€)* | 136€ | **1 064€** |
| Premium | 160€ | 0€ | 160€ | **1 040€** |

*3 premiers RDV gratuits, puis commission normale

**Meilleur choix : Starter ou Pro**

---

### Cas 3 : 25 RDV/mois à 90€ (2 250€ brut)

| Contrat | Abonnement | Commissions | Total Coût | Net Intervenant |
|---------|-----------|-------------|-----------|----------------|
| Sans Engagement | 0€ | 250€ (25×10€) | 250€ | **2 000€** |
| Starter | 60€ | 132€ (22×6€)* | 192€ | **2 058€** |
| Pro | 100€ | 66€ (22×3€)* | 166€ | **2 084€** ✅ |
| Premium | 160€ | 0€ | 160€ | **2 090€** ✅ |

*3 premiers RDV gratuits, puis commission normale

**Meilleur choix : Pro ou Premium (quasi équivalent)**

---

## 🗄️ Structure Base de Données

La configuration des contrats est stockée dans le code TypeScript :

```typescript
export const CONTRACT_CONFIGS: Record<ContractType, ContractConfig> = {
  free: {
    monthly_fee: 0,
    commission_fixed: 10,
    commission_percentage: 12,
    commission_cap: 25,
    max_appointments_per_month: null,
  },
  starter: {
    monthly_fee: 60,
    commission_fixed: 6,
    commission_percentage: 8,
    commission_cap: null,
    max_appointments_per_month: null, // RDV illimités
  },
  pro: {
    monthly_fee: 100,
    commission_fixed: 3,
    commission_percentage: null,
    commission_cap: null,
    max_appointments_per_month: null,
  },
  premium: {
    monthly_fee: 160,
    commission_fixed: 0,
    commission_percentage: null,
    commission_cap: null,
    max_appointments_per_month: null,
  },
};
```

---

## 🎨 Interface Admin

### Page Gestion des Intervenants

**Chemin :** `/admin/intervenants`

**Fonctionnalités :**

1. **Liste des intervenants**
   - Affichage du contrat actif (Chip coloré)
   - Actions :
     - ✏️ **Modifier le contrat** (créer un nouveau contrat, termine l'ancien)
     - 📜 **Voir l'historique** (timeline de tous les contrats)
     - 📅 **Créer un RDV** (ajouter un créneau disponible)

2. **Modal "Gérer le Contrat"** (4 étapes)
   - **Étape 1 :** Sélection type de contrat (Sans Engagement / Starter / Pro / Premium)
   - **Étape 2 :** Upload document PDF (optionnel)
   - **Étape 3 :** Configuration Stripe (optionnel)
   - **Étape 4 :** Confirmation et notes admin

3. **Créer un contrat sans demande préalable**
   - Les admins peuvent créer directement un contrat
   - Pas besoin d'attendre une demande de l'intervenant
   - Pratique pour onboarder rapidement

---

## 📈 Points d'Équilibre

| Contrat | Meilleur À Partir De | Seuil RDV/Mois |
|---------|---------------------|----------------|
| **Sans Engagement** | 0-5 RDV/mois | < 6 RDV |
| **Starter** | 6-15 RDV/mois | 6-15 RDV |
| **Pro** | 12-25 RDV/mois | 12-25 RDV |
| **Premium** | 25+ RDV/mois | > 25 RDV |

**Note :** Les 3 RDV gratuits pour STARTER et PRO améliorent significativement leur rentabilité par rapport au plan SANS ENGAGEMENT.

---

## 🚀 Changements depuis la Version Précédente

**Version 3.0 (actuelle) vs Version 2.0 :**

1. **Prix PREMIUM** : 160€/mois (au lieu de 180€)
2. **3 RDV gratuits pour STARTER et PRO** : Réintroduction des 3 RDV gratuits uniquement pour ces plans
3. **STARTER illimité** : Plus de limite de 15 RDV/mois
4. **Meilleure rentabilité** : Les plans STARTER et PRO sont maintenant plus attractifs grâce aux 3 RDV gratuits

---

## ✅ Changements Appliqués

- ✅ Contrat "Gratuit" renommé en **"Sans Engagement"**
- ✅ **3 premiers RDV gratuits pour STARTER et PRO uniquement**
- ✅ **PREMIUM réduit à 160€/mois**
- ✅ **STARTER : RDV illimités** (plus de limite à 15 RDV/mois)
- ✅ Description Premium clarifiée : "Aucune commission sur tous les RDV dès le 1er RDV"
- ✅ Interface mise à jour dans tous les composants

---

**Prêt à l'emploi ! 🎯**
