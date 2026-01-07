-- Migration: Corriger la récursion RLS sur profiles
-- Date: 2026-01-07
-- Problème: Les politiques créées causent une récursion infinie

-- ÉTAPE 1: Supprimer TOUTES les politiques actuelles sur profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

-- ÉTAPE 2: Créer une fonction sécurisée pour vérifier si l'utilisateur est admin
-- Cette fonction contourne le RLS avec SECURITY DEFINER
DROP FUNCTION IF EXISTS public.is_admin();
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT user_type = 'admin' FROM profiles WHERE id = auth.uid()),
    false
  );
$$;

-- ÉTAPE 3: Créer les nouvelles politiques sans récursion
-- SELECT: Les utilisateurs voient leur profil OU ils sont admin
CREATE POLICY "profiles_select_policy"
ON profiles FOR SELECT
USING (
  auth.uid() = id
  OR public.is_admin()
);

-- UPDATE: Les utilisateurs modifient leur profil OU ils sont admin
CREATE POLICY "profiles_update_policy"
ON profiles FOR UPDATE
USING (
  auth.uid() = id
  OR public.is_admin()
);

-- DELETE: Seuls les admins peuvent supprimer
CREATE POLICY "profiles_delete_policy"
ON profiles FOR DELETE
USING (public.is_admin());

-- INSERT: Permettre l'insertion pour nouveaux comptes
CREATE POLICY "profiles_insert_policy"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- ÉTAPE 4: S'assurer que RLS est activé
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ÉTAPE 5: Vérifier les politiques créées
SELECT
  schemaname,
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
