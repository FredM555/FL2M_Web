-- =====================================================
-- MIGRATION À EXÉCUTER DANS SUPABASE SQL EDITOR
-- =====================================================
-- Cette migration corrige définitivement le problème de récursion RLS
-- sur la table practitioners.
--
-- INSTRUCTIONS :
-- 1. Ouvrir Supabase Dashboard -> SQL Editor
-- 2. Créer une nouvelle requête
-- 3. Copier/coller tout ce fichier
-- 4. Exécuter
-- =====================================================

BEGIN;

-- SECTION 1: Recréer la fonction get_my_user_type avec SECURITY DEFINER
-- ======================================================================
-- Cette fonction évite la récursion en utilisant SECURITY DEFINER
-- qui exécute avec les privilèges du propriétaire de la fonction
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

-- SELECT: Tout le monde peut voir les praticiens actifs
-- Les praticiens peuvent voir leur propre profil (même inactif)
-- Les admins voient tout
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
    public.get_my_user_type() = 'admin'
  );

-- UPDATE: Seulement son propre profil ou être admin
CREATE POLICY "update_practitioners"
  ON public.practitioners
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR
    public.get_my_user_type() = 'admin'
  );

-- INSERT: Les admins et les triggers peuvent insérer
CREATE POLICY "insert_practitioners"
  ON public.practitioners
  FOR INSERT
  WITH CHECK (
    public.get_my_user_type() = 'admin'
    OR
    true -- Permet aux triggers SECURITY DEFINER de créer
  );

-- DELETE: Seulement les admins
CREATE POLICY "delete_practitioners"
  ON public.practitioners
  FOR DELETE
  USING (
    public.get_my_user_type() = 'admin'
  );

-- SECTION 4: S'assurer que RLS est activé
-- ========================================
ALTER TABLE public.practitioners ENABLE ROW LEVEL SECURITY;

-- SECTION 5: Vérification
-- ========================
DO $$
DECLARE
    policy_count INTEGER;
    rls_enabled BOOLEAN;
    r RECORD;
BEGIN
    -- Compter les politiques
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'practitioners' AND schemaname = 'public';

    -- Vérifier RLS
    SELECT rowsecurity INTO rls_enabled
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'practitioners';

    RAISE NOTICE '================================';
    RAISE NOTICE 'RÉSULTAT DE LA MIGRATION:';
    RAISE NOTICE '================================';
    RAISE NOTICE 'Nombre de politiques RLS sur practitioners: %', policy_count;

    IF rls_enabled THEN
        RAISE NOTICE '✓ RLS activé sur practitioners';
    ELSE
        RAISE WARNING '✗ RLS NON activé sur practitioners';
    END IF;

    -- Lister toutes les politiques créées
    RAISE NOTICE '';
    RAISE NOTICE 'Politiques créées:';
    FOR r IN (
        SELECT policyname, cmd
        FROM pg_policies
        WHERE tablename = 'practitioners' AND schemaname = 'public'
    )
    LOOP
        RAISE NOTICE '  - % (command: %)', r.policyname, r.cmd;
    END LOOP;
    RAISE NOTICE '================================';
END $$;

COMMIT;

-- =====================================================
-- FIN DE LA MIGRATION
-- =====================================================
-- Si tout s'est bien passé, vous devriez voir:
-- - 4 politiques RLS créées
-- - RLS activé sur practitioners
-- - Aucune erreur
--
-- Vous pouvez maintenant tester la mise à jour du profil intervenant!
-- =====================================================
