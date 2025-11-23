# Système de Numérologie

## Vue d'ensemble

Le système de numérologie a été implémenté pour calculer automatiquement les valeurs numérologiques des bénéficiaires. Les calculs se basent sur les noms, prénoms et date de naissance.

## Champs calculés

### Dans la table `beneficiaries`

| Champ | Description | Formule | Valeurs possibles |
|-------|-------------|---------|-------------------|
| `racine_1` | **Chemin de vie** | Jour + Mois + Année de naissance | 1-9, 11, 22, 33 |
| `racine_2` | **Expression** | Somme des lettres du prénom + nom | 1-9, 11, 22, 33 |
| `tronc` | **Objectif de vie** | Jour + Mois de naissance | 1-9, 11, 22, 33 |

### Nombres maîtres

Les nombres **11, 22 et 33** sont des "nombres maîtres" en numérologie et ne sont **jamais réduits**. Le système détecte automatiquement ces nombres lors du calcul.

## Comment ça fonctionne

### 1. Calcul automatique

Les valeurs sont calculées **automatiquement** lors de :
- La création d'un nouveau bénéficiaire
- La modification du prénom, nom ou date de naissance d'un bénéficiaire existant

Ceci est géré par un **trigger PostgreSQL** : `trigger_calculate_beneficiary_numerology`

### 2. Table de correspondance des lettres

Chaque lettre de l'alphabet a une valeur numérique :

```
A, J, S = 1
B, K, T = 2
C, L, U = 3
D, M, V = 4
E, N, W = 5
F, O, X = 6
G, P, Y = 7
H, Q, Z = 8
I, R = 9
```

Les lettres accentuées sont traitées comme leurs équivalents non accentués :
- É, È, Ê, Ë → E (5)
- À, Â → A (1)
- Ç → C (3)
- etc.

### 3. Réduction des nombres

Les nombres sont réduits en additionnant leurs chiffres jusqu'à obtenir un nombre entre 1 et 9, **SAUF** pour les nombres maîtres 11, 22 et 33.

**Exemples :**
- 15 → 1 + 5 = 6
- 29 → 2 + 9 = 11 (nombre maître, on s'arrête)
- 1988 → 1 + 9 + 8 + 8 = 26 → 2 + 6 = 8

## Services TypeScript

### Fichier : `src/services/numerology.ts`

Ce service contient toutes les fonctions de calcul :

```typescript
// Fonctions principales
calculateRacine1(birthDate: string): number  // Chemin de vie
calculateRacine2(firstName: string, lastName: string): number  // Expression
calculateTronc(birthDate: string): number  // Objectif de vie

// Fonctions utilitaires
reduceNumber(num: number): number  // Réduction avec nombres maîtres
calculateNameValue(name: string): number  // Valeur d'un nom
calculateAllNumerology(firstName, lastName, birthDate): NumerologyResult
```

### Fonctions de mise à jour manuelle

Si vous avez besoin de recalculer les valeurs manuellement :

```typescript
import { updateNumerologyValues, recalculateAllNumerology } from './services/supabase';

// Recalculer pour un bénéficiaire
await updateNumerologyValues(userId);

// Recalculer pour tous les bénéficiaires
await recalculateAllNumerology();
```

## Migration SQL

### Fichier : `supabase/migrations/20250121_beneficiaries_numerology_update.sql`

Cette migration :

1. **Renomme** `chemin_de_vie` en `tronc`
2. **Met à jour** les contraintes CHECK pour accepter 11, 22, 33
3. **Crée** les fonctions SQL de calcul
4. **Crée** le trigger de calcul automatique
5. **Recalcule** toutes les valeurs pour les bénéficiaires existants

### Pour appliquer la migration

```bash
# Via Supabase CLI
npx supabase db push

# Ou manuellement dans le dashboard Supabase
# SQL Editor → Coller le contenu du fichier → Run
```

## Composants UI mis à jour

Les composants suivants ont été mis à jour pour afficher les valeurs :

- `BeneficiaryForm.tsx` - Formulaire avec champs de numérologie
- `BeneficiaryCard.tsx` - Carte affichant l'objectif de vie
- `BeneficiaryDetails.tsx` - Détails complets avec toutes les valeurs

### Affichage dans l'interface

- **Objectif de vie (Tronc)** : Affiché sur les cartes et détails
- **Chemin de vie (racine_1)** : À ajouter si nécessaire
- **Expression (racine_2)** : À ajouter si nécessaire

## Exemples de calcul

### Exemple 1 : Jean Martin, né le 15/03/1985

**Racine 1 (Chemin de vie) :**
- Jour : 15 → 1 + 5 = 6
- Mois : 3 → 3
- Année : 1985 → 1 + 9 + 8 + 5 = 23 → 2 + 3 = 5
- Total : 6 + 3 + 5 = 14 → 1 + 4 = **5**

**Racine 2 (Expression) :**
- JEAN : J(1) + E(5) + A(1) + N(5) = 12 → 1 + 2 = 3
- MARTIN : M(4) + A(1) + R(9) + T(2) + I(9) + N(5) = 30 → 3 + 0 = 3
- Total : 3 + 3 = **6**

**Tronc (Objectif de vie) :**
- Jour : 15 → 1 + 5 = 6
- Mois : 3 → 3
- Total : 6 + 3 = **9**

### Exemple 2 : Marie Dupont, née le 29/11/1992

**Racine 1 (Chemin de vie) :**
- Jour : 29 → 2 + 9 = **11** (nombre maître)
- Mois : 11 → **11** (nombre maître)
- Année : 1992 → 1 + 9 + 9 + 2 = 21 → 2 + 1 = 3
- Total : 11 + 11 + 3 = 25 → 2 + 5 = **7**

**Tronc (Objectif de vie) :**
- Jour : 29 → 2 + 9 = **11** (nombre maître)
- Mois : 11 → **11** (nombre maître)
- Total : 11 + 11 = **22** (nombre maître)

## Tests

Un fichier de test a été créé : `src/services/numerology.test.ts`

Pour l'exécuter :
```bash
npx tsx src/services/numerology.test.ts
```

## Points d'attention

1. ⚠️ Les valeurs sont calculées **automatiquement**, mais peuvent être modifiées manuellement dans le formulaire si nécessaire.

2. ⚠️ Les contraintes CHECK autorisent les valeurs 1-9, 11, 22, 33. Toute autre valeur sera rejetée par la base de données.

3. ⚠️ Le champ `middle_names` (prénoms intermédiaires) est pris en compte dans le calcul de racine_2.

4. ℹ️ Les fonctions SQL sont marquées `IMMUTABLE`, ce qui permet une meilleure performance en cache.

## Évolutions possibles

- Ajouter d'autres calculs numérologiques (dynamique_de_vie, ecorce, branche, feuille, fruit)
- Créer une page dédiée à la numérologie avec des explications détaillées
- Ajouter des graphiques et visualisations
- Exporter un rapport PDF avec tous les calculs numérologiques
- Ajouter des interprétations textuelles pour chaque nombre

## Support

Pour toute question sur le système de numérologie, consultez :
- [Wikipedia - Numérologie](https://fr.wikipedia.org/wiki/Num%C3%A9rologie)
- Code source : `src/services/numerology.ts`
- Migration SQL : `supabase/migrations/20250121_beneficiaries_numerology_update.sql`
