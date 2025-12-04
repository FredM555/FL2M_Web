-- Migration: Ajout du champ photo de profil à la table profiles
-- Date: 2025-12-04
-- Description: Ajoute un champ avatar_url pour stocker l'URL de la photo de profil dans Supabase Storage

-- Ajout du champ avatar_url à la table profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Commentaire sur la colonne
COMMENT ON COLUMN profiles.avatar_url IS 'URL de la photo de profil stockée dans Supabase Storage (bucket: avatars)';

-- Création d'un bucket pour les avatars dans Supabase Storage
-- Cette commande doit être exécutée via l'interface Supabase ou l'API
-- Le bucket doit être configuré comme public pour permettre l'accès aux photos
/*
Instructions pour créer le bucket:
1. Allez dans Storage > Create bucket
2. Nom: avatars
3. Public: Oui
4. File size limit: 5 MB (recommandé)
5. Allowed MIME types: image/jpeg, image/png, image/webp
*/

-- Création d'une politique RLS pour permettre aux utilisateurs de télécharger leur propre photo
-- Note: Ces politiques doivent être créées via l'interface Supabase Storage
/*
Policy pour upload:
- Nom: Users can upload their own avatar
- Allowed operation: INSERT
- Policy definition: (bucket_id = 'avatars'::text) AND (auth.uid()::text = (storage.foldername(name))[1])

Policy pour update:
- Nom: Users can update their own avatar
- Allowed operation: UPDATE
- Policy definition: (bucket_id = 'avatars'::text) AND (auth.uid()::text = (storage.foldername(name))[1])

Policy pour delete:
- Nom: Users can delete their own avatar
- Allowed operation: DELETE
- Policy definition: (bucket_id = 'avatars'::text) AND (auth.uid()::text = (storage.foldername(name))[1])

Policy pour read (public):
- Nom: Anyone can view avatars
- Allowed operation: SELECT
- Policy definition: bucket_id = 'avatars'::text
*/
