# Avatar des intervenants sur les pages publiques

## Problèmes résolus

### 1. Avatar manquant sur la liste des intervenants
✅ **RÉSOLU** : Les avatars s'affichent maintenant sur la page `/consultants` (liste des intervenants)

### 2. Impossibilité d'accéder aux données de numérologie des intervenants non connectés
✅ **RÉSOLU** : Création d'une fonction RPC sécurisée pour exposer uniquement les données des intervenants publics

## Modifications apportées

### 1. Fonction RPC sécurisée : `get_public_practitioner_numerology`

**Fichier** : `get_public_practitioner_numerology.sql`

Cette fonction permet d'accéder aux données de numérologie (tronc, racines, dynamique de vie) des intervenants ayant un profil public, sans contourner la sécurité RLS.

**Sécurité** :
- ✅ Expose uniquement les données des intervenants avec `is_active = true` ET `profile_visible = true`
- ✅ Accessible par les utilisateurs anonymes et authentifiés
- ✅ Ne permet pas d'accéder aux données des profils privés ou inactifs

### 2. Page liste des intervenants : `ConsultantsPage.tsx`

**Modifications** :
- Import de `UserAvatar`
- Ajout des champs de numérologie dans l'interface `Consultant`
- Requête pour récupérer `avatar_url` depuis `profiles`
- Appel à la fonction RPC `get_public_practitioner_numerology` pour chaque intervenant
- Remplacement de `<Avatar>` par `<UserAvatar>`

**Ordre de priorité d'affichage** :
1. Photo uploadée (`avatar_url`) si elle existe
2. Avatar de numérologie (tronc + racines + dynamique de vie) si l'intervenant a un bénéficiaire "self"
3. Initiales en dernier recours

### 3. Page détail intervenant : `ConsultantDetailPage.tsx`

**Modifications** :
- Utilisation de la fonction RPC `get_public_practitioner_numerology` au lieu d'une requête directe
- Ajout de logs pour faciliter le débogage
- Même ordre de priorité d'affichage que la liste

### 4. Aperçu profil intervenant : `PractitionerProfilePreview.tsx`

**Statut** : ✅ Déjà fonctionnel (utilise déjà `UserAvatar`)

## Installation

### Étape 1 : Appliquer la fonction SQL

**Option A - Via le Dashboard Supabase (RECOMMANDÉ)** :
1. Ouvrez le Dashboard Supabase : https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans "SQL Editor"
4. Copiez le contenu du fichier `get_public_practitioner_numerology.sql`
5. Collez-le dans l'éditeur
6. Cliquez sur "Run"

**Option B - Via le script Node.js** :
```bash
# Définir la clé service role
set SUPABASE_SERVICE_ROLE_KEY=votre_cle_service_role

# Exécuter le script
node apply_numerology_function.cjs
```

### Étape 2 : Vérifier l'installation

1. Ouvrez votre application
2. Allez sur `/consultants` (liste des intervenants)
3. Ouvrez la console du navigateur (F12)
4. Vous devriez voir :
   - `[ConsultantDetail] Données numérologie récupérées:` avec les données
   - Les avatars affichés correctement

## Comportement attendu

### Liste des intervenants (`/consultants`)
- Chaque carte d'intervenant affiche :
  - Photo si disponible
  - Sinon, avatar de numérologie doré si données disponibles
  - Sinon, initiales

### Page détail intervenant (`/consultants/:id`)
- Même logique d'affichage
- Logs dans la console pour débogage

### Aperçu profil intervenant (pour l'intervenant connecté)
- Récupération automatique des données du bénéficiaire "self"
- Affichage de l'avatar avec priorité : photo > numérologie > initiales

## Données affichées

L'avatar de numérologie affiche :
- **Tronc** (grand, au centre avec effet lumineux or) : Objectif de vie
- **Racine 1** (en bas à gauche) : Chemin de vie
- **Racine 2** (en bas à droite) : Expression
- **Dynamique de vie** (en filigrane) : Somme tronc + racines

## Débogage

Si les avatars ne s'affichent pas correctement :

1. **Vérifier la fonction RPC** :
   ```sql
   -- Dans SQL Editor de Supabase
   SELECT * FROM get_public_practitioner_numerology('user_id_test');
   ```

2. **Vérifier les logs dans la console** :
   - F12 pour ouvrir la console
   - Chercher `[ConsultantDetail]` ou `[ConsultantsPage]`

3. **Vérifier les données** :
   - L'intervenant a-t-il un bénéficiaire avec `relationship = 'self'` ?
   - Le profil intervenant a-t-il `is_active = true` ET `profile_visible = true` ?

## Fichiers modifiés

- ✅ `src/pages/ConsultantsPage.tsx` - Liste des intervenants
- ✅ `src/pages/ConsultantDetailPage.tsx` - Détail d'un intervenant
- ✅ `src/services/supabase.ts` - Fonction `getMyPractitionerProfile`
- ✅ `src/components/profile/NumerologyTriangleAvatar.tsx` - Ajustements taille/position
- ✅ `get_public_practitioner_numerology.sql` - Fonction RPC (NOUVEAU)
- ✅ `apply_numerology_function.cjs` - Script d'installation (NOUVEAU)

## Sécurité

La fonction RPC est sécurisée :
- ✅ N'expose que les données des profils publics
- ✅ Pas d'accès aux données privées
- ✅ Pas de contournement des RLS
- ✅ Accessible uniquement pour les intervenants actifs et visibles
