-- Migration: Mise à jour des politiques RLS pour la table profiles
-- Date: 2025-10-13
-- Description: Permet aux utilisateurs de modifier leur propre profil
--              et aux admins de modifier tous les profils

-- Supprimer l'ancienne politique de modification
DROP POLICY IF EXISTS "Utilisateurs peuvent modifier leur propre profil" ON public.profiles;

-- Créer une nouvelle politique de modification améliorée
-- Cette politique permet :
-- 1. Aux utilisateurs de modifier leur propre profil (auth.uid() = id)
-- 2. Aux admins de modifier tous les profils (user_type = 'admin')
CREATE POLICY "Utilisateurs peuvent modifier leur propre profil et admins peuvent tout modifier"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  -- L'utilisateur peut modifier son propre profil
  (auth.uid() = id)
  OR
  -- OU l'utilisateur est un admin
  (EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  ))
)
WITH CHECK (
  -- Mêmes conditions pour la vérification après modification
  (auth.uid() = id)
  OR
  (EXISTS (
    SELECT 1
    FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  ))
);

-- Commentaire sur la politique
COMMENT ON POLICY "Utilisateurs peuvent modifier leur propre profil et admins peuvent tout modifier" ON public.profiles IS
'Permet aux utilisateurs de modifier leur propre profil. Les admins peuvent modifier tous les profils.';

-- Log de migration
DO $$
BEGIN
  RAISE NOTICE 'Migration appliquée avec succès: Politique RLS UPDATE améliorée pour profiles';
END $$;
