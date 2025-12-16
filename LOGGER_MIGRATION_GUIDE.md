# Guide de migration vers le logger

## Pourquoi utiliser le logger ?

- ✅ **Moins de logs en production** : Améliore les performances
- ✅ **Logs organisés** : Préfixes clairs [DEBUG], [INFO], [WARN], [ERROR]
- ✅ **Contrôle fin** : Variable d'environnement pour ajuster le niveau
- ✅ **Toujours les erreurs** : Les erreurs sont toujours affichées
- ✅ **TypeScript** : Types pour éviter les erreurs

## Installation

Le fichier `src/utils/logger.ts` a été créé.

## Configuration

### Variables d'environnement

**Développement (.env.local)** :
```bash
# Pas besoin de configurer, tout est affiché par défaut en dev
```

**Production (Vercel/Netlify)** :
```bash
# Niveau de log en production (optionnel)
VITE_LOG_LEVEL=error    # Affiche uniquement les erreurs (recommandé)
# OU
VITE_LOG_LEVEL=warn     # Affiche les warnings et erreurs
# OU
VITE_LOG_LEVEL=info     # Affiche info, warn et errors
# OU
VITE_LOG_LEVEL=debug    # Affiche tout (déconseillé en prod)
# OU
VITE_LOG_LEVEL=none     # Aucun log (même pas les erreurs - déconseillé)
```

## Utilisation

### Import
```typescript
import { logger } from '../utils/logger';
```

### Remplacements

#### Avant (console.log)
```typescript
console.log('[AUTH_STATE] État actuel:', { user, profile });
console.info('[FETCH_PROFILE] Début récupération');
console.warn('[FETCH_PROFILE] Aucun profil trouvé');
console.error('[FETCH_PROFILE] Erreur:', error);
```

#### Après (logger)
```typescript
logger.debug('[AUTH_STATE] État actuel:', { user, profile });
logger.info('[FETCH_PROFILE] Début récupération');
logger.warn('[FETCH_PROFILE] Aucun profil trouvé');
logger.error('[FETCH_PROFILE] Erreur:', error);
```

### Groupement de logs

#### Avant
```typescript
console.group('[AUTH] Initialisation');
console.log('User:', user);
console.log('Profile:', profile);
console.groupEnd();
```

#### Après
```typescript
logger.group('[AUTH] Initialisation');
logger.debug('User:', user);
logger.debug('Profile:', profile);
logger.groupEnd();
```

### Mesure de performance

```typescript
logger.time('loadBeneficiaries');
// ... code à mesurer
logger.timeEnd('loadBeneficiaries');
```

## Règles de migration

### 1. console.log() → logger.debug()
Logs de débogage technique, affichés uniquement en dev

```typescript
// Avant
console.log('[DEBUG] Valeur:', value);

// Après
logger.debug('[DEBUG] Valeur:', value);
// OU même mieux (le préfixe [DEBUG] est déjà ajouté)
logger.debug('Valeur:', value);
```

### 2. console.info() → logger.info()
Informations importantes mais non critiques

```typescript
// Avant
console.info('[INFO] Utilisateur connecté');

// Après
logger.info('Utilisateur connecté');
```

### 3. console.warn() → logger.warn()
Avertissements

```typescript
// Avant
console.warn('[WARN] Session expirée');

// Après
logger.warn('Session expirée');
```

### 4. console.error() → logger.error()
Erreurs - TOUJOURS affichées (même en prod)

```typescript
// Avant
console.error('[ERROR] Échec connexion:', error);

// Après
logger.error('Échec connexion:', error);
```

## Fichiers prioritaires à migrer

1. ✅ **src/context/AuthContext.tsx** (beaucoup de console.log)
2. ✅ **src/pages/AuthCallbackPage.tsx**
3. ✅ **src/services/supabase.ts**
4. ✅ **src/services/stripe.ts**
5. ✅ **src/components/beneficiaries/**

## Exemple complet : AuthContext.tsx

### Avant
```typescript
console.log("[AUTH_STATE] État actuel:", {
  userExists: !!user,
  profileExists: !!profile,
  loading,
  time: new Date().toISOString()
});
```

### Après
```typescript
logger.debug("État Auth:", {
  userExists: !!user,
  profileExists: !!profile,
  loading,
  time: new Date().toISOString()
});
```

## Avantages

### En développement
- Tous les logs s'affichent normalement
- Préfixes clairs pour identifier le type de log
- Groupement possible pour organiser les logs

### En production
- **0 log** si `VITE_LOG_LEVEL=error` (recommandé)
- Seulement les erreurs critiques sont affichées
- **Meilleures performances** (pas de console.log inutiles)
- **Code source plus petit** (logs supprimés au build si configuré)

## Migration progressive

Vous pouvez migrer fichier par fichier :
1. Importez le logger
2. Remplacez les console.log/info/warn/error
3. Testez en dev
4. Validez que ça fonctionne
5. Passez au fichier suivant

**Pas besoin de tout faire d'un coup !**

## Commandes utiles

### Trouver tous les console.log
```bash
# Windows PowerShell
Select-String -Path "src/**/*.ts*" -Pattern "console\.(log|info|warn|error)" -CaseSensitive

# Linux/Mac
grep -r "console\." src/ --include="*.ts" --include="*.tsx"
```

### Compter les console.log restants
```bash
# Windows PowerShell
(Select-String -Path "src/**/*.ts*" -Pattern "console\.").Count
```

## Configuration avancée

Si vous voulez aller plus loin, vous pouvez :
- Ajouter un système de logs vers un service externe (Sentry, LogRocket)
- Ajouter des couleurs aux logs
- Créer des catégories de logs (AUTH, API, UI, etc.)
- Ajouter un système de logs persistants (localStorage)

Voulez-vous que je commence à migrer certains fichiers ?
