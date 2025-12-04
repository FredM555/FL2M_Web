# 🔧 Solution : Erreur "Bucket not found"

## Problème

Vous avez cette erreur lors de l'upload d'une photo de profil :
```
❌ Bucket not found
```

## Cause

Le bucket de stockage `avatars` n'existe pas encore dans votre projet Supabase.

## ✅ Solution (5 minutes)

### Étape 1 : Accéder à Supabase Storage

1. Allez sur **https://app.supabase.com**
2. Connectez-vous avec vos identifiants
3. Sélectionnez votre projet **FLM Services**

### Étape 2 : Ouvrir Storage

Dans le menu de gauche, cliquez sur **"Storage"** (icône de dossier/fichier)

```
┌────────────────────┐
│ 🏠 Home            │
│ 📊 Table Editor    │
│ 🔐 Authentication  │
│ 📁 Storage    ◀──  │  ← CLIQUEZ ICI
│ 📝 SQL Editor      │
│ ⚙️  Settings       │
└────────────────────┘
```

### Étape 3 : Créer un nouveau bucket

1. Cliquez sur le bouton **"New bucket"** ou **"Create bucket"** (bouton vert en haut à droite)

### Étape 4 : Configurer le bucket

Remplissez le formulaire avec ces valeurs **EXACTEMENT** :

```
┌─────────────────────────────────────────────────┐
│ 📝 Create a new bucket                          │
├─────────────────────────────────────────────────┤
│                                                 │
│ Name *                                          │
│ ┌─────────────────────────────────────────┐   │
│ │ avatars                                  │   │
│ └─────────────────────────────────────────┘   │
│                                                 │
│ ☑️ Public bucket                                │
│   (Cette case DOIT être cochée !)              │
│                                                 │
│ File size limit (bytes)                        │
│ ┌─────────────────────────────────────────┐   │
│ │ 5242880                                  │   │  ← 5 MB
│ └─────────────────────────────────────────┘   │
│                                                 │
│ Allowed MIME types                              │
│ ┌─────────────────────────────────────────┐   │
│ │ image/jpeg                               │   │
│ │ image/png                                │   │
│ │ image/webp                               │   │
│ └─────────────────────────────────────────┘   │
│                                                 │
│         [Cancel]    [Create bucket]            │
└─────────────────────────────────────────────────┘
```

### Étape 5 : Cliquer sur "Create bucket"

Le bucket `avatars` est maintenant créé !

### Étape 6 : Configurer les politiques de sécurité (RLS)

1. Cliquez sur le bucket **"avatars"** que vous venez de créer
2. Allez dans l'onglet **"Policies"**
3. Cliquez sur **"New Policy"**

Créez **4 politiques** :

#### Politique 1 : Upload (INSERT)

```
Name: Users can upload their own avatar
Allowed operation: ☑️ INSERT
Policy:
(bucket_id = 'avatars'::text) AND (auth.uid()::text = (storage.foldername(name))[1])
```

#### Politique 2 : Update

```
Name: Users can update their own avatar
Allowed operation: ☑️ UPDATE
Policy:
(bucket_id = 'avatars'::text) AND (auth.uid()::text = (storage.foldername(name))[1])
```

#### Politique 3 : Delete

```
Name: Users can delete their own avatar
Allowed operation: ☑️ DELETE
Policy:
(bucket_id = 'avatars'::text) AND (auth.uid()::text = (storage.foldername(name))[1])
```

#### Politique 4 : Public Read

```
Name: Anyone can view avatars
Allowed operation: ☑️ SELECT
Policy:
bucket_id = 'avatars'::text
```

### Étape 7 : Appliquer la migration SQL

1. Allez dans **SQL Editor** (menu de gauche)
2. Cliquez sur **"New query"**
3. Copiez-collez ce SQL :

```sql
-- Ajouter la colonne avatar_url à la table profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Commentaire
COMMENT ON COLUMN profiles.avatar_url IS 'URL de la photo de profil stockée dans Supabase Storage (bucket: avatars)';
```

4. Cliquez sur **"Run"** (ou F5)

### Étape 8 : Tester

1. Rechargez votre application (F5)
2. Allez sur **"Mon profil"**
3. Cliquez sur l'icône caméra 📷 sur votre avatar
4. Sélectionnez une photo
5. ✅ L'upload devrait maintenant fonctionner !

## ⚠️ Points importants

### Le bucket DOIT être PUBLIC

```
☑️ Public bucket    ← TRÈS IMPORTANT !
```

Si le bucket n'est pas public, les photos ne seront pas visibles sur le site.

### Formats acceptés

- ✅ JPG / JPEG
- ✅ PNG
- ✅ WebP
- ❌ GIF, BMP, TIFF (non supportés)

### Taille maximale

- Maximum : 5 MB par photo
- Recommandé : 500 KB - 1 MB

## 🆘 Toujours des problèmes ?

### Erreur "Failed to upload"

**Cause possible :** Politiques RLS mal configurées

**Solution :**
1. Vérifiez que les 4 politiques sont bien créées
2. Vérifiez que vous êtes bien connecté
3. Essayez de vous déconnecter et reconnecter

### Erreur "File too large"

**Cause :** Fichier > 5 MB

**Solution :** Compressez votre image ou utilisez une image plus petite

### La photo ne s'affiche pas

**Cause possible :** Bucket non public

**Solution :**
1. Allez dans Storage > avatars > Settings
2. Cochez "Public bucket"
3. Sauvegardez

## 📞 Support

Si le problème persiste, contactez l'administrateur avec :
- Le message d'erreur exact
- Une capture d'écran de l'erreur
- La taille de votre fichier

## ✅ Vérification finale

Après avoir suivi toutes les étapes :

- [x] Bucket `avatars` créé
- [x] Bucket configuré comme **PUBLIC**
- [x] 4 politiques RLS créées
- [x] Migration SQL exécutée
- [x] Application rechargée
- [x] Upload testé avec succès

🎉 Félicitations ! La fonctionnalité photo de profil est maintenant opérationnelle !
