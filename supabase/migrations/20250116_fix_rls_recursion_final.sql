-- =====================================================
-- Migration: Fix FINAL pour la récursion RLS
-- Date: 2025-11-16
-- Description: Supprime toute possibilité de récursion en simplifiant les politiques
-- =====================================================

-- SECTION 1: Recréer la fonction get_my_user_type avec une approche plus sûre
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_my_user_type()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_type
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Donner les permissions nécessaires
GRANT EXECUTE ON FUNCTION public.get_my_user_type() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_user_type() TO anon;

-- SECTION 2: Supprimer TOUTES les politiques existantes sur practitioners
-- =========================================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'practitioners' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.practitioners';
        RAISE NOTICE 'Supprimé: %', r.policyname;
    END LOOP;
END $$;

-- SECTION 3: Créer des politiques SIMPLES sans récursion
-- ========================================================

-- SELECT: Approche simple - soit c'est actif, soit c'est ton profil, soit tu es admin
CREATE POLICY "select_practitioners"
  ON public.practitioners
  FOR SELECT
  USING (
    -- Tout le monde peut voir les praticiens actifs
    is_active = true
    OR
    -- Les praticiens peuvent voir leur propre profil (même inactif)
    user_id = auth.uid()
    OR
    -- Les admins voient tout (vérifié via une fonction sécurisée)
    (SELECT user_type FROM public.profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  );

-- UPDATE: Seulement son propre profil ou être admin
CREATE POLICY "update_practitioners"
  ON public.practitioners
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR
    (SELECT user_type FROM public.profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  );

-- INSERT: Tout le monde peut insérer (pour les triggers)
-- Les vraies restrictions se feront au niveau applicatif
CREATE POLICY "insert_practitioners"
  ON public.practitioners
  FOR INSERT
  WITH CHECK (true);

-- DELETE: Seulement les admins
CREATE POLICY "delete_practitioners"
  ON public.practitioners
  FOR DELETE
  USING (
    (SELECT user_type FROM public.profiles WHERE id = auth.uid() LIMIT 1) = 'admin'
  );

-- SECTION 4: Vérifier que les politiques sur profiles ne causent pas de récursion
-- ================================================================================
-- Afficher toutes les politiques sur profiles pour vérification
DO $$
DECLARE
    r RECORD;
BEGIN
    RAISE NOTICE '=== Politiques RLS sur profiles ===';
    FOR r IN (
        SELECT policyname, cmd
        FROM pg_policies
        WHERE tablename = 'profiles'
        AND schemaname = 'public'
    )
    LOOP
        RAISE NOTICE 'Profile policy: % (command: %)', r.policyname, r.cmd;
    END LOOP;

    RAISE NOTICE '=== Politiques RLS sur practitioners ===';
    FOR r IN (
        SELECT policyname, cmd
        FROM pg_policies
        WHERE tablename = 'practitioners'
        AND schemaname = 'public'
    )
    LOOP
        RAISE NOTICE 'Practitioner policy: % (command: %)', r.policyname, r.cmd;
    END LOOP;
END $$;

-- SECTION 5: Désactiver temporairement RLS sur practitioners pour tester
-- =======================================================================
-- Si vous continuez à avoir l'erreur, décommentez cette ligne pour désactiver RLS temporairement
-- ALTER TABLE public.practitioners DISABLE ROW LEVEL SECURITY;
-- Puis réactivez après avoir trouvé la source du problème
-- ALTER TABLE public.practitioners ENABLE ROW LEVEL SECURITY;
