-- Migration: Sécuriser le champ user_type dans profiles
-- Date: 2026-01-07
-- Objectif: Empêcher les utilisateurs de s'auto-promouvoir admin

-- ÉTAPE 1: Supprimer les politiques UPDATE et INSERT existantes
DROP POLICY IF EXISTS "profiles_update_policy" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON profiles;

-- ÉTAPE 2: Créer une nouvelle politique INSERT sécurisée
-- Les nouveaux utilisateurs ne peuvent PAS se définir comme admin
CREATE POLICY "profiles_insert_policy"
ON profiles FOR INSERT
WITH CHECK (
  auth.uid() = id
  AND (user_type IS NULL OR user_type IN ('client', 'intervenant'))
);

-- ÉTAPE 3: Créer un trigger pour empêcher la modification du user_type
-- par des non-admins
CREATE OR REPLACE FUNCTION public.protect_user_type_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Si l'utilisateur est admin, autoriser toutes les modifications
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Si l'utilisateur modifie son propre profil
  IF auth.uid() = NEW.id THEN
    -- Empêcher la modification du user_type
    IF OLD.user_type IS DISTINCT FROM NEW.user_type THEN
      RAISE EXCEPTION 'Vous ne pouvez pas modifier votre type d''utilisateur';
    END IF;
    RETURN NEW;
  END IF;

  -- Dans tous les autres cas, bloquer
  RAISE EXCEPTION 'Accès non autorisé';
END;
$$;

-- Créer le trigger sur la table profiles
DROP TRIGGER IF EXISTS protect_user_type_trigger ON profiles;
CREATE TRIGGER protect_user_type_trigger
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_user_type_change();

-- ÉTAPE 4: Créer les politiques UPDATE simples
-- Les utilisateurs peuvent modifier leur propre profil
CREATE POLICY "profiles_update_policy"
ON profiles FOR UPDATE
USING (
  auth.uid() = id
  OR public.is_admin()
);

-- ÉTAPE 5: Vérifier les politiques créées
SELECT
  schemaname,
  tablename,
  policyname,
  cmd as operation,
  CASE
    WHEN with_check IS NOT NULL THEN 'WITH CHECK'
    WHEN qual IS NOT NULL THEN 'USING'
    ELSE 'BOTH'
  END as clause_type
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
