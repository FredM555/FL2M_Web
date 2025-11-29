# Guide des Tests - Sprint 2

**Date:** 2025-01-25
**Framework:** Vitest 4.0.14

---

## 📋 Configuration

### Scripts disponibles

```bash
# Exécuter les tests une fois
npm run test

# Exécuter les tests en mode watch (redémarre à chaque modification)
npm run test:watch

# Ouvrir l'interface UI des tests
npm run test:ui

# Générer le rapport de couverture
npm run test:coverage
```

---

## ✅ Résultats Actuels

```
Test Files  1 passed (1)
Tests       26 passed (26)
Duration    ~300ms
```

### Tests du Commission Calculator

Tous les tests du calculateur de commission sont **validés** :

#### RDV Gratuits (1-3)
- ✅ 0€ de commission pour le 1er RDV (tous contrats)
- ✅ 0€ de commission pour le 2ème RDV
- ✅ 0€ de commission pour le 3ème RDV

#### Contrat FREE
- ✅ max(10€, 12%) pour un RDV de 60€
- ✅ 12% pour un RDV de 150€
- ✅ Plafond à 25€ pour un RDV de 300€
- ✅ 10€ minimum pour un RDV de 20€

#### Contrat STARTER
- ✅ min(6€, 8%) pour un RDV de 60€
- ✅ 6€ maximum pour un RDV de 100€
- ✅ 6€ maximum pour un RDV de 200€

#### Contrat PRO
- ✅ 3€ fixe pour tous les RDV

#### Contrat PREMIUM
- ✅ 0€ de commission pour tous les RDV

#### Simulations et Estimations
- ✅ Simulations multi-scénarios
- ✅ Estimations mensuelles (FREE, PRO, PREMIUM)
- ✅ Comparaison de tous les contrats
- ✅ Points d'équilibre entre contrats

#### Cas Limites
- ✅ Prix de RDV de 0€
- ✅ Très grand nombre de RDV (1000)
- ✅ Prix avec décimales

#### Scénarios Réels
- ✅ Cas 1: Intervenant GRATUIT - 5 RDV/mois à 60€
- ✅ Cas 2: Intervenant PRO - 15 RDV/mois à 80€
- ✅ Cas 3: Intervenant PREMIUM - 25 RDV/mois à 90€

---

## 🔧 Configuration Technique

### Fichiers de configuration

1. **vitest.config.ts**
   - Configuration principale de Vitest
   - Environnement: Node
   - Setup: `src/test/setup.ts`

2. **src/test/setup.ts**
   - Mock des variables d'environnement
   - Mock de Supabase pour les tests

### Dépendances installées

```json
{
  "vitest": "^4.0.14",
  "@vitest/ui": "^4.0.14"
}
```

---

## 📊 Couverture de Code

Pour générer le rapport de couverture :

```bash
npm run test:coverage
```

Cela créera un dossier `coverage/` avec un rapport HTML détaillé.

---

## 🎯 Ajouter de Nouveaux Tests

### Structure d'un fichier de test

```typescript
// src/services/__tests__/mon-service.test.ts
import { describe, it, expect } from 'vitest';
import { MonService } from '../mon-service';

describe('MonService', () => {
  describe('maMethode', () => {
    it('devrait faire quelque chose de précis', () => {
      const result = MonService.maMethode(param);

      expect(result).toBe(valeurAttendue);
    });
  });
});
```

### Conventions

- **Fichiers:** `*.test.ts` ou `*.spec.ts` dans `__tests__/`
- **Descriptions:** En français, claires et précises
- **Assertions:** Utiliser les matchers appropriés (`toBe`, `toEqual`, `toBeGreaterThan`, etc.)

---

## 🚀 Tests en Développement

### Mode Watch

Le mode watch est idéal pendant le développement :

```bash
npm run test:watch
```

Vitest redémarrera automatiquement les tests affectés à chaque modification de fichier.

### Interface UI

Pour une expérience visuelle :

```bash
npm run test:ui
```

Ouvre une interface web pour naviguer dans les tests et voir les résultats en temps réel.

---

## 🐛 Debugging

### Logs dans les tests

```typescript
it('devrait afficher des logs', () => {
  console.log('Debug info:', variable);
  expect(variable).toBe(value);
});
```

### Tests isolés

Pour exécuter un seul test :

```typescript
it.only('ce test sera le seul à s\'exécuter', () => {
  // ...
});
```

Pour ignorer un test :

```typescript
it.skip('ce test sera ignoré', () => {
  // ...
});
```

---

## 📝 Prochaines Étapes

### Tests à ajouter dans les prochains sprints

#### Sprint 3 : Interface Admin
- Tests des composants React
- Tests d'intégration avec Material-UI
- Tests de formulaires

#### Sprint 4 : Paiements Stripe
- Tests d'intégration Stripe
- Tests des webhooks
- Tests de création de transactions

#### Sprint 5 : Virements
- Tests de PayoutManager
- Tests de calcul de période
- Tests de virement

---

## 🔐 Tests et Sécurité

### Variables d'environnement

Les tests utilisent des valeurs mockées définies dans `src/test/setup.ts` :

```typescript
VITE_SUPABASE_URL: 'https://test.supabase.co',
VITE_SUPABASE_ANON_KEY: 'test-anon-key',
```

**Important:** Ne jamais utiliser de vraies clés API dans les tests !

### Mock de Supabase

Tous les appels à Supabase sont mockés automatiquement dans les tests. Cela permet de :
- Exécuter les tests sans connexion à la base de données
- Garantir la cohérence des tests
- Tester les cas d'erreur facilement

---

## 📚 Ressources

### Documentation Vitest
- [Guide officiel](https://vitest.dev/guide/)
- [API Reference](https://vitest.dev/api/)
- [Matchers](https://vitest.dev/api/expect.html)

### Exemples

Consulter `src/services/__tests__/commission-calculator.test.ts` pour des exemples complets de tests.

---

## ✅ Checklist Avant Commit

Avant de commiter du code :

```bash
# 1. Exécuter les tests
npm run test

# 2. Vérifier le lint
npm run lint

# 3. Vérifier le build
npm run build
```

Tous les tests doivent passer avant de pusher !

---

**Guide créé le:** 2025-01-25
**Dernière mise à jour:** 2025-01-25
**Version:** 1.0
