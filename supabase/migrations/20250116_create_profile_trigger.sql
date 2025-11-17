-- =====================================================
-- Migration: Trigger de création automatique du profil + RLS
-- Date: 2025-11-16
-- Description: Crée automatiquement un profil dans la table 'profiles'
--              lors de l'inscription d'un nouvel utilisateur (Email/OAuth)
--              + Configure les politiques RLS pour l'accès au profil
-- =====================================================

-- SECTION 1: Fonction trigger pour créer le profil
-- ===================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    user_type,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    'client', -- Type par défaut pour les nouveaux utilisateurs
    true,
    NOW(),
    NOW()
  );

  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Si le profil existe déjà (ex: race condition), on ignore l'erreur
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log l'erreur mais ne bloque pas l'inscription
    RAISE WARNING 'Erreur lors de la création du profil pour l''utilisateur %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SECTION 2: Créer le trigger
-- ===================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- SECTION 3: Fonction helper pour éviter la récursion RLS
-- ===================================================
-- Cette fonction retourne le user_type de l'utilisateur courant
-- SECURITY DEFINER permet de bypasser RLS pour cette requête spécifique
CREATE OR REPLACE FUNCTION public.get_my_user_type()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_type TEXT;
BEGIN
  SELECT user_type INTO v_user_type
  FROM public.profiles
  WHERE id = auth.uid();

  RETURN v_user_type;
END;
$$;

-- SECTION 4: Activer RLS sur la table profiles
-- ===================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- SECTION 5: Politiques RLS pour les profils (SANS RÉCURSION)
-- ===================================================

-- Politique SELECT: Les utilisateurs peuvent voir leur propre profil + les admins voient tout
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id
    OR
    public.get_my_user_type() = 'admin'
  );

-- Politique UPDATE: Les utilisateurs peuvent modifier leur propre profil + les admins modifient tout
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (
    auth.uid() = id
    OR
    public.get_my_user_type() = 'admin'
  );

-- Politique INSERT: Permet au trigger de créer des profils (SECURITY DEFINER)
DROP POLICY IF EXISTS "Allow service role to insert profiles" ON public.profiles;
CREATE POLICY "Allow service role to insert profiles"
  ON public.profiles
  FOR INSERT
  WITH CHECK (true);

-- Politique DELETE: Seuls les admins peuvent supprimer des profils
DROP POLICY IF EXISTS "Only admins can delete profiles" ON public.profiles;
CREATE POLICY "Only admins can delete profiles"
  ON public.profiles
  FOR DELETE
  USING (
    public.get_my_user_type() = 'admin'
  );

-- SECTION 6: Commentaires
-- ===================================================
COMMENT ON FUNCTION public.handle_new_user() IS
  'Crée automatiquement un profil client lors de l''inscription d''un nouvel utilisateur (Email ou OAuth)';

COMMENT ON FUNCTION public.get_my_user_type() IS
  'Retourne le user_type de l''utilisateur courant (utilisé par les politiques RLS pour éviter la récursion)';

-- SECTION 7: Vérification
-- ===================================================
-- Vérifier que le trigger existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'on_auth_user_created'
  ) THEN
    RAISE NOTICE '✓ Trigger on_auth_user_created créé avec succès';
  ELSE
    RAISE WARNING '✗ Trigger on_auth_user_created non trouvé';
  END IF;

  -- Vérifier que RLS est activé
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'profiles'
    AND rowsecurity = true
  ) THEN
    RAISE NOTICE '✓ RLS activé sur la table profiles';
  ELSE
    RAISE WARNING '✗ RLS non activé sur la table profiles';
  END IF;

  -- Compter les politiques RLS
  RAISE NOTICE 'Nombre de politiques RLS sur profiles: %', (
    SELECT COUNT(*)
    FROM pg_policies
    WHERE tablename = 'profiles'
  );
END $$;
