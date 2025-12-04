# Fonctionnalité : Photo de profil (Avatar)

## Description

Cette fonctionnalité permet aux utilisateurs d'uploader leur propre photo de profil qui sera affichée :
- Dans leur page de profil
- Dans la liste publique des intervenants (pour les intervenants)
- Dans les pages de détail des intervenants
- Dans l'aperçu du profil intervenant

## Fichiers modifiés/créés

### 1. Migration SQL
- **add_avatar_to_profiles.sql** - Ajoute la colonne `avatar_url` à la table `profiles`

### 2. Backend/Types
- **src/services/supabase.ts** - Interface `Profile` mise à jour avec `avatar_url`

### 3. Composants
- **src/components/profile/AvatarUpload.tsx** - Nouveau composant pour l'upload d'avatar (CRÉÉ)
  - Gestion de l'upload vers Supabase Storage
  - Validation des fichiers (type, taille)
  - Suppression d'avatar
  - Interface utilisateur avec aperçu et boutons

### 4. Pages modifiées
- **src/pages/ProfilePage.tsx** - Intégration du composant AvatarUpload
- **src/pages/ConsultantsPage.tsx** - Utilisation de `avatar_url` au lieu du chemin statique
- **src/pages/ConsultantDetailPage.tsx** - Utilisation de `avatar_url`
- **src/components/practitioner/PractitionerProfilePreview.tsx** - Utilisation de `avatar_url`

## Configuration Supabase Storage

### Étape 1 : Appliquer la migration SQL

```bash
# Via l'éditeur SQL de Supabase
# Copiez-collez le contenu de add_avatar_to_profiles.sql
```

### Étape 2 : Créer le bucket Storage

1. Allez dans **Storage** dans le dashboard Supabase
2. Cliquez sur **Create bucket**
3. Configuration du bucket :
   - **Nom** : `avatars`
   - **Public** : ✅ Oui (pour permettre l'accès public aux photos)
   - **File size limit** : 5 MB (recommandé)
   - **Allowed MIME types** : `image/jpeg, image/png, image/webp`

### Étape 3 : Configurer les politiques RLS (Row Level Security)

Allez dans **Storage > avatars > Policies** et créez les politiques suivantes :

#### Policy 1 : Upload (INSERT)
```sql
-- Nom: Users can upload their own avatar
-- Operation: INSERT
-- Policy:
(bucket_id = 'avatars'::text) AND (auth.uid()::text = (storage.foldername(name))[1])
```

#### Policy 2 : Update
```sql
-- Nom: Users can update their own avatar
-- Operation: UPDATE
-- Policy:
(bucket_id = 'avatars'::text) AND (auth.uid()::text = (storage.foldername(name))[1])
```

#### Policy 3 : Delete
```sql
-- Nom: Users can delete their own avatar
-- Operation: DELETE
-- Policy:
(bucket_id = 'avatars'::text) AND (auth.uid()::text = (storage.foldername(name))[1])
```

#### Policy 4 : Public Read (SELECT)
```sql
-- Nom: Anyone can view avatars
-- Operation: SELECT
-- Policy:
bucket_id = 'avatars'::text
```

## Utilisation

### Pour les utilisateurs

1. **Accéder au profil**
   - Allez sur la page "Mon profil"

2. **Uploader une photo**
   - Cliquez sur l'icône caméra 📷 sur l'avatar
   - Sélectionnez une image (JPG, PNG ou WebP)
   - La photo sera automatiquement uploadée et affichée
   - Taille maximale : 5 MB

3. **Supprimer une photo**
   - Cliquez sur l'icône poubelle 🗑️ sur l'avatar
   - La photo sera supprimée et remplacée par l'initiale

### Pour les intervenants

La photo uploadée sera automatiquement utilisée :
- Dans la liste publique des intervenants (/consultants)
- Dans la page de détail de l'intervenant (/consultants/:id)
- Dans l'aperçu du profil intervenant (onglet Aperçu)

## Spécifications techniques

### Structure de stockage

Les fichiers sont organisés par utilisateur :
```
avatars/
  └── {user_id}/
      └── {timestamp}.{ext}
```

Exemple : `avatars/123e4567-e89b-12d3-a456-426614174000/1701234567890.jpg`

### Formats acceptés

- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)

### Taille maximale

- 5 MB par fichier

### Sécurité

- Chaque utilisateur ne peut uploader/modifier/supprimer que ses propres photos
- Les photos sont publiquement accessibles en lecture (pour l'affichage)
- Validation côté client et serveur

## Composant AvatarUpload

### Props

```typescript
interface AvatarUploadProps {
  currentAvatarUrl?: string;      // URL actuelle de l'avatar
  onUploadSuccess: (url: string) => void;  // Callback après upload réussi
  onDelete: () => void;             // Callback après suppression
  size?: number;                    // Taille de l'avatar (défaut: 120px)
}
```

### Exemple d'utilisation

```tsx
<AvatarUpload
  currentAvatarUrl={profile?.avatar_url}
  onUploadSuccess={(url) => console.log('Photo uploadée:', url)}
  onDelete={() => console.log('Photo supprimée')}
  size={100}
/>
```

## Migration depuis l'ancien système

L'ancien système utilisait un chemin statique pour la photo de Frédéric (`/images/Frederic.png`). Le nouveau système :

1. Vérifie d'abord si `avatar_url` existe dans le profil
2. Sinon, utilise le fallback pour Frédéric (ancien système)
3. Sinon, affiche l'initiale avec un fond dégradé

Cela assure une compatibilité ascendante.

## Rollback (si nécessaire)

Si vous souhaitez revenir en arrière :

### 1. Supprimer la colonne
```sql
ALTER TABLE profiles DROP COLUMN IF EXISTS avatar_url;
```

### 2. Supprimer le bucket
- Allez dans Storage > avatars > Settings
- Delete bucket

### 3. Restaurer l'ancien code
- Supprimez `AvatarUpload.tsx`
- Restaurez les anciennes fonctions `getProfilePhoto()`

## Tests recommandés

1. ✅ Upload d'une photo valide (JPG, PNG, WebP)
2. ✅ Upload d'un fichier trop grand (> 5 MB) → Erreur
3. ✅ Upload d'un format invalide (.gif, .bmp) → Erreur
4. ✅ Remplacement d'une photo existante
5. ✅ Suppression d'une photo
6. ✅ Affichage correct dans la liste des intervenants
7. ✅ Affichage correct dans le profil intervenant
8. ✅ Affichage correct sur la page de profil utilisateur

## Dépannage

### Erreur : "Failed to upload"
- Vérifiez que le bucket `avatars` existe
- Vérifiez les politiques RLS
- Vérifiez la taille du fichier (< 5 MB)

### La photo ne s'affiche pas
- Vérifiez que le bucket est public
- Vérifiez l'URL dans la base de données
- Vérifiez la politique SELECT (lecture publique)

### Erreur de permissions
- Vérifiez que l'utilisateur est authentifié
- Vérifiez les politiques RLS (INSERT, UPDATE, DELETE)

## Notes importantes

- Les photos sont stockées dans Supabase Storage, pas en base de données
- Seule l'URL est stockée en base de données
- Les photos anciennes sont automatiquement supprimées lors du remplacement
- La fonctionnalité nécessite une connexion internet pour l'upload
