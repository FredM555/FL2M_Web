# Message du Jour - Documentation

## 📋 Vue d'ensemble

Le système "Message du Jour" permet aux visiteurs et bénéficiaires de recevoir une guidance numérologique quotidienne personnalisée basée sur leur date de naissance.

## 🎯 Fonctionnalités

### Pour les visiteurs (non connectés)
- Formulaire simple : Prénom + Jour + Mois de naissance
- 2 messages tirés aléatoirement basés sur 2 nombres :
  - **Nombre 1** : Calculé depuis jour + mois (ex: 15 + 3 = 18 → 9)
  - **Nombre 2** : Généré de manière stable pour la journée
- Message unique par jour (stocké en localStorage)
- CTA vers la prise de rendez-vous

### Pour les bénéficiaires (connectés)
- Affichage automatique sans formulaire
- 2 messages basés sur leurs nombres personnels :
  - Sélection aléatoire parmi : racine1, racine2, tronc, dynamique_de_vie
  - Stable pour la journée
- Message unique par jour (stocké en localStorage)

## 📁 Architecture des fichiers

```
src/
├── utils/
│   └── numerology.ts              # Fonctions de calcul numérologique
├── hooks/
│   └── useDailyDraw.ts           # Hooks pour visiteurs et bénéficiaires
├── components/
│   ├── DailyDrawForm.tsx         # Formulaire pour visiteurs
│   ├── DailyDrawDisplay.tsx      # Affichage des messages
│   ├── DailyDrawContainer.tsx    # Conteneur principal (visiteurs)
│   ├── BeneficiaryDailyDraw.tsx  # Composant pour bénéficiaires
│   └── DailyDrawHomeSection.tsx  # Section pour la page d'accueil
└── pages/
    └── MessageDuJourPage.tsx     # Page dédiée
```

## 🔧 Fonctions utilitaires (numerology.ts)

### `reduceToSingleDigit(num: number): number`
Réduit un nombre à un chiffre (1-9) en gardant les nombres maîtres 11 et 22.

### `calculateBirthNumber(day: number, month: number): number`
Calcule le nombre numérologique depuis jour + mois de naissance.

### `generateDailyNumber(uniqueKey: string, date: Date): number`
Génère un nombre "aléatoire" stable pour une journée donnée.

### `selectBeneficiaryNumbers(...): { nombre1, nombre2 }`
Sélectionne 2 nombres parmi les 4 nombres d'un bénéficiaire (stable pour la journée).

### `generateStorageKey(...): string`
Génère une clé unique pour le localStorage (format : `tirage_prenom_jour_mois_date`).

### `cleanOldTirages(): void`
Nettoie les tirages de plus de 7 jours du localStorage.

## 🎣 Hooks personnalisés

### `useDailyDrawVisitor()`
```typescript
const { getDailyDraw, loading, error, drawData } = useDailyDrawVisitor();

// Utilisation
await getDailyDraw({
  firstName: 'Marie',
  birthDay: 15,
  birthMonth: 3
});
```

### `useDailyDrawBeneficiary()`
```typescript
const { getDailyDraw, loading, error, drawData } = useDailyDrawBeneficiary();

// Utilisation
await getDailyDraw({
  beneficiaryId: 'uuid',
  firstName: 'Jean',
  racine1: 3,
  racine2: 7,
  tronc: 1,
  dynamiqueDeVie: 9
});
```

## 🔄 Système de cache

Le système utilise **localStorage** pour stocker les tirages :

### Clé pour visiteur
```
tirage_marie_15_3_2025-12-26
```

### Clé pour bénéficiaire
```
tirage_beneficiary_uuid_2025-12-26
```

### Avantages
- ✅ Pas de backend nécessaire
- ✅ Fonctionne même avec plusieurs personnes sur le même appareil
- ✅ Automatiquement nettoyé après 7 jours
- ✅ Même message toute la journée

## 🎨 Composants React

### DailyDrawForm
Formulaire pour les visiteurs avec validation.

**Props** :
- `onDrawGenerated?: () => void` - Callback après génération

### DailyDrawDisplay
Affichage des messages avec actions (partage, reset).

**Props** :
- `data: DailyDrawData` - Données du tirage
- `onReset?: () => void` - Callback pour reset
- `showCTA?: boolean` - Afficher le CTA rendez-vous (défaut: true)

### DailyDrawContainer
Conteneur qui gère l'état (formulaire vs affichage).

### BeneficiaryDailyDraw
Composant pour bénéficiaires, affichage automatique.

**Props** :
- `beneficiaryId: string`
- `firstName: string`
- `racine1?: number`
- `racine2?: number`
- `tronc?: number`
- `dynamiqueDeVie?: number`

### DailyDrawHomeSection
Section teaser pour la page d'accueil avec CTA.

## 🚀 Intégration

### 1. Page dédiée
Accessible via `/message-du-jour` (déjà configuré dans App.tsx)

### 2. Page d'accueil
Ajouter dans HomePage.tsx :

```tsx
import DailyDrawHomeSection from '../components/DailyDrawHomeSection';

// Dans le render
<DailyDrawHomeSection />
```

### 3. Pour un bénéficiaire
Dans une page protégée avec un bénéficiaire :

```tsx
import BeneficiaryDailyDraw from '../components/BeneficiaryDailyDraw';

<BeneficiaryDailyDraw
  beneficiaryId={beneficiary.id}
  firstName={beneficiary.first_name}
  racine1={beneficiary.racine1}
  racine2={beneficiary.racine2}
  tronc={beneficiary.tronc}
  dynamiqueDeVie={beneficiary.dynamique_de_vie}
/>
```

## 🔒 Gestion des cas particuliers

### Homonymes dans une même famille
✅ Résolu : La clé inclut jour+mois, donc 2 personnes avec le même prénom mais nées à des dates différentes auront des clés différentes.

### Personne qui change de prénom
✅ Pas de problème : Nouveau prénom = nouvelle clé = nouveau tirage

### Même IP, plusieurs personnes
✅ Résolu : Pas d'utilisation de l'IP, uniquement prénom+date+jour

### Cache plein
✅ Résolu : Nettoyage automatique des tirages > 7 jours

## 📊 Base de données

Le système utilise la table `daily_draws` existante :
- Type : `quotidien`
- Nombre : 1-9, 11, 22
- Messages : Titres et messages

## 🎯 Parcours utilisateur

### Visiteur
1. Arrive sur page d'accueil ou `/message-du-jour`
2. Voit le formulaire
3. Saisit prénom + date
4. Reçoit 2 messages personnalisés
5. Voit le CTA "Prendre rendez-vous"
6. Si retour dans la journée → même message direct

### Bénéficiaire
1. Se connecte
2. Va sur sa page de profil/dashboard
3. Voit automatiquement son message du jour
4. Basé sur ses 4 nombres personnels
5. Si retour dans la journée → même message

## ✅ Checklist de mise en production

- [x] Créer les fonctions utilitaires
- [x] Créer les hooks personnalisés
- [x] Créer les composants UI
- [x] Créer la page dédiée
- [x] Ajouter la route dans App.tsx
- [x] Créer la section pour la page d'accueil
- [ ] Ajouter DailyDrawHomeSection dans HomePage.tsx
- [ ] Tester avec plusieurs utilisateurs
- [ ] Vérifier le responsive mobile
- [ ] Tester le cache localStorage
- [ ] Vérifier les messages d'erreur

## 🎨 Personnalisation

Pour modifier les couleurs/style, éditer :
- Gradient principal : `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- Utilisé dans : DailyDrawForm, DailyDrawDisplay, MessageDuJourPage

## 📱 Responsive

Tous les composants sont optimisés pour mobile avec Material-UI Grid et Box.

## 🐛 Débogage

Les logs sont disponibles via :
```typescript
import { logger } from '../utils/logger';
logger.debug('Message du jour:', drawData);
```

## 📈 Évolutions futures possibles

1. Ajout d'un historique des messages (backend)
2. Notification push quotidienne
3. Partage sur réseaux sociaux avec image
4. Export PDF du message
5. Statistiques des nombres les plus tirés
