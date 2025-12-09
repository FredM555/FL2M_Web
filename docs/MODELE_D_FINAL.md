# 💼 Modèle D - Grille Tarifaire Intervenants - Version Finale

**Date:** 2025-12-06
**Version:** 4.0 (Nouveau Business Plan)

---

## 🎯 Principe du Modèle

Le système de rémunération des intervenants est basé sur **4 types de forfaits** avec des commissions et limites différentes.

**🎁 Système de RDV gratuits :**
- **Découverte** : Aucun RDV gratuit
- **Starter** : 2 premiers RDV gratuits/mois (commission 0€)
- **Pro** : 4 premiers RDV gratuits/mois (commission 0€)
- **Premium** : Tous les RDV gratuits (commission 0€)

---

## 💰 Les 4 Forfaits

### 1. 🌱 DÉCOUVERTE (9€/mois)

**Coût mensuel :** 9€
**Limite :** 10 RDV maximum/mois

**Commission par RDV :**
- **10€ OU 12% du prix** (le PLUS élevé des deux)
- **Plafonné à 25€ maximum**

**Exemples :**
```
RDV à 60€  → 10€ commission (max(10€, 7,20€) = 10€)
RDV à 100€ → 12€ commission (max(10€, 12€) = 12€)
RDV à 120€ → 14,40€ commission (max(10€, 14,40€) = 14,40€)
RDV à 150€ → 18€ commission (max(10€, 18€) = 18€)
RDV à 300€ → 25€ commission (plafond atteint)
```

**Avantages :**
- Coût d'entrée minimal (9€/mois)
- Idéal pour tester la plateforme
- Tarification simple et prévisible

**Inconvénients :**
- Limité à 10 RDV/mois
- Pas de RDV gratuits

**🎯 Recommandé pour :** 1 à 7 rendez-vous par mois

---

### 2. 🚀 STARTER (49€/mois)

**Coût mensuel :** 49€
**Limite :** 20 RDV/mois
**Au-delà de 20 RDV :** commission du forfait Découverte

**🎁 BONUS : Les 2 premiers RDV du mois sont GRATUITS (0€ de commission)**

**Commission par RDV (à partir du 3ème) :**
- **6€ OU 8% du prix** (le MOINS élevé des deux)
- **Plafonné à 25€ maximum**

**Exemples :**
```
RDV #1 à 120€ → 0€ commission (RDV gratuit)
RDV #2 à 120€ → 0€ commission (RDV gratuit)
RDV #3 à 60€  → 4,80€ commission (min(6€, 4,80€) = 4,80€)
RDV #4 à 100€ → 6€ commission (min(6€, 8€) = 6€)
RDV #5 à 120€ → 6€ commission (min(6€, 9,60€) = 6€)
RDV #6 à 150€ → 6€ commission (min(6€, 12€) = 6€)
RDV #21 à 120€ → 14,40€ commission (au-delà de 20 RDV = forfait Découverte)
```

**Avantages :**
- 2 premiers RDV gratuits chaque mois
- Commission réduite et protégée
- Tarif stable et prévisible
- Beaucoup plus économique dès 8 rendez-vous

**Inconvénients :**
- Abonnement mensuel obligatoire
- Limité à 20 RDV/mois (au-delà = commission Découverte)

**🎯 Recommandé pour :** 8 → 17 rendez-vous par mois

---

### 3. 💼 PRO (99€/mois) ⭐ RECOMMANDÉ

**Coût mensuel :** 99€
**Limite :** RDV illimités

**🎁 BONUS : Les 4 premiers RDV du mois sont GRATUITS (0€ de commission)**

**Commission par RDV (à partir du 5ème) :**
- **3€ fixe par RDV** (peu importe le prix)

**Exemples :**
```
RDV #1 à 120€ → 0€ commission (RDV gratuit)
RDV #2 à 85€  → 0€ commission (RDV gratuit)
RDV #3 à 150€ → 0€ commission (RDV gratuit)
RDV #4 à 200€ → 0€ commission (RDV gratuit)
RDV #5 à 60€  → 3€ commission
RDV #6 à 120€ → 3€ commission
RDV #10 à 300€ → 3€ commission
```

**Avantages :**
- 4 premiers RDV gratuits chaque mois
- Coûts ultra-stables
- Commission fixe peu importe le prix
- RDV illimités
- Pensé pour les pros établis

**Inconvénients :**
- Abonnement plus élevé

**🎯 Recommandé pour :** 17 → 23 rendez-vous par mois

---

### 4. 👑 PREMIUM (159€/mois)

**Coût mensuel :** 159€
**Limite :** RDV illimités

**Commission par RDV :**
- **0€** (aucune commission)

**Exemples :**
```
Tous les RDV → 0€ commission
RDV à 60€  → 0€
RDV à 120€ → 0€
RDV à 300€ → 0€
```

**Avantages :**
- Aucun coût variable
- Marge maximale sur chaque séance
- Visibilité prioritaire
- Accès aux fonctionnalités avancées
- Expérience professionnelle complète

**Inconvénients :**
- Abonnement le plus élevé

**🎯 Recommandé pour :** 24+ rendez-vous par mois ou ceux qui veulent éliminer totalement les commissions

---

## 📊 Tableau Comparatif

| Forfait | Prix/mois | Limite RDV | RDV Gratuits | Commission | Exemple (120€) |
|---------|-----------|------------|--------------|------------|----------------|
| 🌱 Découverte | 9€ | 10/mois | 0 | max(10€, 12%) plafonné à 25€ | 14,40€ |
| 🚀 Starter | 49€ | 20/mois* | 2/mois | min(6€, 8%) plafonné à 25€ | 6€ (après 2 gratuits) |
| 💼 Pro | 99€ | Illimité | 4/mois | 3€ fixe | 3€ (après 4 gratuits) |
| 👑 Premium | 159€ | Illimité | Tous | 0€ | 0€ |

*Au-delà de 20 RDV : commission du forfait Découverte

---

## 💡 Frais Stripe

Les paiements clients passent par Stripe qui prélève **~2% de frais de transaction** (~1,4% + 0,25€).
Ces frais sont à la charge de l'intervenant et s'appliquent dès le premier RDV.

---

## 🔄 Changement de Forfait

- Votre abonnement actuel continuera jusqu'à la fin de votre cycle mensuel
- Le nouvel abonnement débutera automatiquement le jour anniversaire de votre souscription
- Aucune interruption de service

---

## 📈 Points d'Équilibre

**Découverte vs Starter :**
- À partir de ~8 RDV/mois, Starter devient plus rentable

**Starter vs Pro :**
- À partir de ~17 RDV/mois, Pro devient plus rentable

**Pro vs Premium :**
- À partir de ~24 RDV/mois, Premium devient plus rentable

---

## ✅ Exemples de Revenus Mensuels

### Scénario 1 : 10 RDV/mois à 120€

| Forfait | Abonnement | Commissions | Coût Total | Revenu Net |
|---------|------------|-------------|------------|------------|
| Découverte | 9€ | 144€ (10×14,40€) | 153€ | **1047€** |
| Starter | 49€ | 48€ (2×0€ + 8×6€) | 97€ | **1103€** ⭐ |
| Pro | 99€ | 18€ (4×0€ + 6×3€) | 117€ | **1083€** |
| Premium | 159€ | 0€ | 159€ | **1041€** |

**Meilleur choix : Starter** (+56€ vs Découverte)

### Scénario 2 : 20 RDV/mois à 120€

| Forfait | Abonnement | Commissions | Coût Total | Revenu Net |
|---------|------------|-------------|------------|------------|
| Découverte | 9€ | ❌ Impossible (limite 10 RDV) | - | - |
| Starter | 49€ | 108€ (2×0€ + 18×6€) | 157€ | **2243€** |
| Pro | 99€ | 48€ (4×0€ + 16×3€) | 147€ | **2253€** ⭐ |
| Premium | 159€ | 0€ | 159€ | **2241€** |

**Meilleur choix : Pro** (+10€ vs Starter)

### Scénario 3 : 30 RDV/mois à 120€

| Forfait | Abonnement | Commissions | Coût Total | Revenu Net |
|---------|------------|-------------|------------|------------|
| Découverte | 9€ | ❌ Impossible (limite 10 RDV) | - | - |
| Starter | 49€ | 252€ (2×0€ + 18×6€ + 10×14,40€) | 301€ | **3299€** |
| Pro | 99€ | 78€ (4×0€ + 26×3€) | 177€ | **3423€** |
| Premium | 159€ | 0€ | 159€ | **3441€** ⭐ |

**Meilleur choix : Premium** (+18€ vs Pro, +142€ vs Starter)

---

## 🎯 Recommandations par Activité

- **1-7 RDV/mois** : Découverte (démarrage, test)
- **8-17 RDV/mois** : Starter (activité régulière)
- **17-23 RDV/mois** : Pro (activité établie)
- **24+ RDV/mois** : Premium (forte activité)

---

## 🔍 Notes Importantes

1. Les RDV gratuits se réinitialisent chaque mois
2. Les commissions sont calculées automatiquement lors du paiement
3. Les frais Stripe (~2%) sont toujours à la charge de l'intervenant
4. Le changement de forfait prend effet au prochain cycle de facturation
5. Les limites de RDV sont par mois calendaire
