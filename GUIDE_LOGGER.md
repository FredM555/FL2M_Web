# Guide d'utilisation du Logger FL2M

## Vue d'ensemble

Le logger FL2M est un système de logging sécurisé qui :
- **Masque automatiquement les données sensibles** en production
- **Contrôle le niveau de logs** selon l'environnement
- **Protège contre les fuites de données** (emails, IPs, tokens, IBAN, etc.)
- **Optimise les performances** en désactivant les logs non critiques en production

---

## Migration complétée

✅ **Tous les fichiers ont été migrés vers le logger sécurisé**

| Dossier | Fichiers modifiés | Remplacements |
|---------|-------------------|---------------|
| `src/services` | 12/16 | 120 |
| `src/pages` | 41/60 | 113 |
| `src/components` | 42/65 | 118 |
| `src/` (racine) | 3/3 | 86 |
| **TOTAL** | **98/144** | **437** |

---

## Configuration

### Variables d'environnement

Configurez le niveau de log dans votre fichier `.env.local` :

```bash
# En développement (affiche tous les logs)
VITE_LOG_LEVEL=debug

# En production (affiche seulement les erreurs) - RECOMMANDÉ
VITE_LOG_LEVEL=error

# Autres options possibles
# VITE_LOG_LEVEL=info    # Affiche info, warn et error
# VITE_LOG_LEVEL=warn    # Affiche warn et error
# VITE_LOG_LEVEL=none    # Désactive tous les logs
```

### Configuration par défaut

Si `VITE_LOG_LEVEL` n'est pas définie :
- **Développement** : `info` (affiche tout sauf debug)
- **Production** : `error` (affiche uniquement les erreurs)

---

## Utilisation

### Import

```typescript
import { logger } from '@/utils/logger';
```

### Méthodes disponibles

#### 1. `logger.debug()` - Logs de débogage

Affichés **uniquement en développement**

```typescript
logger.debug('Détails de la requête:', requestData);
logger.debug('État du composant:', { user, appointments });
```

**Utilisation :** Informations détaillées pour le debugging


#### 2. `logger.info()` - Informations générales

Affichées **en développement** (ou si `VITE_LOG_LEVEL=info` en prod)

```typescript
logger.info('Utilisateur connecté:', userId);
logger.info('Rendez-vous créé avec succès');
```

**Utilisation :** Informations générales sur le flux de l'application

#### 3. `logger.warn()` - Avertissements

Affichés **en développement** (ou si `VITE_LOG_LEVEL=warn` en prod)

```typescript
logger.warn('Token expiré, rafraîchissement nécessaire');
logger.warn('Tentative de connexion avec email invalide:', email);
```

**Utilisation :** Situations inhabituelles mais non critiques

#### 4. `logger.error()` - Erreurs

**TOUJOURS affichées** (même en production)
Données sensibles automatiquement masquées

```typescript
logger.error('Erreur lors du paiement:', error);
logger.error('Impossible de charger le profil:', { userId, error });
```

**Utilisation :** Erreurs et exceptions

#### 5. `logger.secure()` - Log sécurisé

Garantit le masquage des données sensibles

```typescript
logger.secure('Données utilisateur récupérées', userData);
logger.secure('Token reçu', { token, userId });
```

**Utilisation :** Quand vous n'êtes pas sûr si les données contiennent des informations sensibles

#### 6. Autres méthodes

Affichées **uniquement en développement**

```typescript
// Grouper des logs
logger.group('Traitement du paiement');
logger.info('Étape 1: Validation');
logger.info('Étape 2: Création');
logger.groupEnd();

// Tableau
logger.table(appointments);

// Stack trace
logger.trace('Point de passage');

// Performance
logger.time('chargement-appointments');
// ... code ...
logger.timeEnd('chargement-appointments');
```

---

## Données sensibles masquées automatiquement

Le logger masque automatiquement :

### 1. Emails
```typescript
// Avant: user@example.com
// Après:  u***@e***.com
```

### 2. Téléphones
```typescript
// Avant: 0612345678
// Après:  06****5678
```

### 3. Adresses IP
```typescript
// Avant: 192.168.1.1
// Après:  ***.***.***. ***
```

### 4. Tokens JWT
```typescript
// Avant: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
// Après:  eyJ***[TOKEN_MASKED]
```

### 5. IBANs
```typescript
// Avant: FR7612345678901234567890123
// Après:  FR76****0123
```

### 6. Mots de passe et clés API
```typescript
// Toujours masqués: password: ***, api_key: ***
```

### 7. Clés d'objets sensibles

Ces clés sont **toujours masquées** dans les objets :
- `password`, `pwd`
- `secret`, `token`
- `apiKey`, `api_key`
- `accessToken`, `access_token`
- `iban`
- `stripe_secret`, `stripe_account_id`
- `ip_address`, `ipAddress`
- etc.

---

## Exemples d'utilisation

### Exemple 1 : Login utilisateur

```typescript
// ❌ AVANT (non sécurisé)
console.log('Connexion réussie pour', user.email);
console.error('Erreur de connexion:', error);

// ✅ APRÈS (sécurisé)
logger.info('Connexion réussie pour', user.email); // Email masqué en prod
logger.error('Erreur de connexion:', error);        // Toujours affiché
```

### Exemple 2 : Paiement Stripe

```typescript
// ❌ AVANT
console.log('Payment Intent créé:', paymentIntent);
console.log('Customer:', customer);

// ✅ APRÈS
logger.debug('Payment Intent créé:', paymentIntent); // Dev uniquement
logger.secure('Customer data:', customer);           // Données sensibles masquées
```

### Exemple 3 : Gestion d'erreur

```typescript
try {
  await createAppointment(appointmentData);
  logger.info('Rendez-vous créé avec succès');
} catch (error) {
  logger.error('Erreur création rendez-vous:', error);
  // L'erreur est loggée même en production, mais données sensibles masquées
}
```

### Exemple 4 : Debugging

```typescript
// En développement
logger.debug('État du formulaire:', formData);
logger.debug('Validation:', validationErrors);

// Ces logs n'apparaîtront PAS en production
```

---

## Comparaison Avant/Après

### Production (VITE_LOG_LEVEL=error)

| Méthode | Avant (`console.*`) | Après (`logger.*`) |
|---------|---------------------|-------------------|
| `console.log()` | ✅ Affiché, données exposées | ❌ Masqué |
| `console.info()` | ✅ Affiché, données exposées | ❌ Masqué |
| `console.warn()` | ✅ Affiché, données exposées | ❌ Masqué |
| `console.error()` | ✅ Affiché, données exposées | ✅ Affiché, **données masquées** |

### Développement

| Méthode | Avant | Après |
|---------|-------|-------|
| `console.log()` | ✅ Affiché | ✅ Affiché (`logger.debug`) |
| `console.info()` | ✅ Affiché | ✅ Affiché (`logger.info`) |
| `console.warn()` | ✅ Affiché | ✅ Affiché (`logger.warn`) |
| `console.error()` | ✅ Affiché | ✅ Affiché (`logger.error`) |

---

## Bonnes pratiques

### ✅ À FAIRE

```typescript
// Utiliser le bon niveau de log
logger.debug('Détails techniques');     // Développement uniquement
logger.info('Opération réussie');       // Informations générales
logger.warn('Comportement inhabituel'); // Avertissements
logger.error('Erreur critique');        // Erreurs

// Logger les objets complets
logger.debug('User data:', { user, profile, appointments });

// Utiliser secure() pour les données potentiellement sensibles
logger.secure('API response:', apiResponse);

// Logger les erreurs avec contexte
try {
  // ...
} catch (error) {
  logger.error('Erreur lors du traitement:', { error, context: additionalInfo });
}
```

### ❌ À ÉVITER

```typescript
// ❌ Ne pas utiliser console.* directement
console.log('Données utilisateur:', user);

// ❌ Ne pas logger les secrets même avec le logger
logger.debug('Stripe Secret Key:', process.env.STRIPE_SECRET_KEY);

// ❌ Ne pas sur-logger en production
logger.info('Chaque petit détail...'); // Utiliser debug() à la place

// ❌ Ne pas logger les données brutes des formulaires de paiement
logger.debug('Card info:', cardData); // JAMAIS, même en dev !
```

---

## Tests

### Tester en développement

```bash
npm run dev
```

Vous devriez voir les logs avec le préfixe `[DEBUG]`, `[INFO]`, `[WARN]`, `[ERROR]`

### Tester en production

```bash
# Construire en mode production
npm run build

# Servir le build
npm run preview
```

Vous devriez voir **UNIQUEMENT** les logs d'erreur `[ERROR]`

### Tester le masquage des données

```typescript
// Dans n'importe quel fichier
logger.debug('Test masquage:', {
  email: 'test@example.com',
  phone: '0612345678',
  ip_address: '192.168.1.1',
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  password: 'secret123'
});

// En production, ces données seront masquées automatiquement
```

---

## Dépannage

### Les logs n'apparaissent pas en développement

1. Vérifier que `VITE_LOG_LEVEL` est défini correctement dans `.env.local`
2. Vérifier que vous importez le logger : `import { logger } from '@/utils/logger'`
3. Redémarrer le serveur de développement

### Trop de logs en production

Vérifier que `.env.production` ou `.env.local` contient :
```bash
VITE_LOG_LEVEL=error
```

### Les données sensibles ne sont pas masquées

1. Vérifier que vous utilisez bien `logger.*` et pas `console.*`
2. Le masquage ne fonctionne **qu'en production** (MODE !== 'development')
3. En dev, tout est affiché pour faciliter le debugging

---

## Script de migration (optionnel)

Le script `migrate-to-logger.cjs` est disponible pour migrer automatiquement d'autres fichiers :

```bash
# Dry run (aperçu sans modification)
node migrate-to-logger.cjs --dry-run --path src/nouveau-dossier

# Migration réelle
node migrate-to-logger.cjs --path src/nouveau-dossier
```

---

## Performance

### Impact en production

Le logger est optimisé pour la production :
- **0 impact** si `VITE_LOG_LEVEL=none`
- **Minimal** si `VITE_LOG_LEVEL=error` (seulement les erreurs)
- Les fonctions `debug`, `info`, `warn` sont court-circuitées et ne font rien

### Impact en développement

- Légère overhead pour le masquage des données (négligeable)
- Tous les logs sont affichés pour faciliter le debugging

---

## Conformité RGPD

Le logger aide à la conformité RGPD en :
- ✅ Masquant automatiquement les données personnelles en production
- ✅ Permettant le contrôle fin des logs
- ✅ Évitant les fuites de données dans les logs de production
- ✅ Facilitant l'audit des données loggées

---

## Support

En cas de problème avec le logger :
1. Vérifier ce guide
2. Consulter `src/utils/logger.ts` pour voir l'implémentation
3. Vérifier les variables d'environnement dans `.env.local`

---

**Créé le :** 2025-01-18
**Dernière mise à jour :** 2025-01-18
**Migration complétée :** ✅ 98 fichiers, 437 remplacements

---

## Checklist de déploiement en production

Avant de déployer en production, vérifier :

- [ ] `VITE_LOG_LEVEL=error` est défini dans les variables d'environnement de production
- [ ] Aucun `console.log` direct n'est utilisé dans le code
- [ ] Les données sensibles sont bien masquées (tester avec `npm run build && npm run preview`)
- [ ] Les erreurs sont toujours loggées (tester un cas d'erreur)
- [ ] Pas de secrets hardcodés dans les logs

---

**Logger FL2M - Sécurisé par défaut, configurable pour tous les environnements**
