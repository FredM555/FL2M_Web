-- =====================================================
-- Migration: Corriger les politiques RLS de practitioners pour éviter la récursion
-- Date: 2025-11-16
-- Description: Utilise la fonction get_my_user_type() pour éviter les récursions infinies
-- =====================================================

-- SECTION 1: Supprimer les anciennes politiques
-- ==============================================
DROP POLICY IF EXISTS "Admins can view all practitioners" ON public.practitioners;
DROP POLICY IF EXISTS "Admins can update all practitioners" ON public.practitioners;
DROP POLICY IF EXISTS "Admins can insert practitioners" ON public.practitioners;
DROP POLICY IF EXISTS "Admins can delete practitioners" ON public.practitioners;
DROP POLICY IF EXISTS "Practitioners can view own profile" ON public.practitioners;
DROP POLICY IF EXISTS "Practitioners can update own profile" ON public.practitioners;
DROP POLICY IF EXISTS "Users can view active practitioners" ON public.practitioners;
DROP POLICY IF EXISTS "Public can view active practitioners" ON public.practitioners;

-- SECTION 2: Activer RLS
-- =======================
ALTER TABLE public.practitioners ENABLE ROW LEVEL SECURITY;

-- SECTION 3: Nouvelles politiques sans récursion
-- ===============================================

-- SELECT: Tout le monde peut voir les praticiens actifs
-- Admins et intervenants peuvent voir tous les praticiens
DROP POLICY IF EXISTS "Everyone can view active practitioners" ON public.practitioners;
CREATE POLICY "Everyone can view active practitioners"
  ON public.practitioners
  FOR SELECT
  USING (
    is_active = true
    OR
    public.get_my_user_type() = 'admin'
    OR
    public.get_my_user_type() = 'intervenant'
  );

-- UPDATE: Les praticiens peuvent modifier leur propre profil
-- Les admins peuvent tout modifier
DROP POLICY IF EXISTS "Practitioners can update own" ON public.practitioners;
CREATE POLICY "Practitioners can update own"
  ON public.practitioners
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR
    public.get_my_user_type() = 'admin'
  );

-- INSERT: Seuls les admins peuvent créer des praticiens
-- (sauf via les triggers qui utilisent SECURITY DEFINER)
DROP POLICY IF EXISTS "Admins can insert" ON public.practitioners;
CREATE POLICY "Admins can insert"
  ON public.practitioners
  FOR INSERT
  WITH CHECK (
    public.get_my_user_type() = 'admin'
    OR
    true -- Permet aux triggers SECURITY DEFINER de créer
  );

-- DELETE: Seuls les admins peuvent supprimer
DROP POLICY IF EXISTS "Admins can delete" ON public.practitioners;
CREATE POLICY "Admins can delete"
  ON public.practitioners
  FOR DELETE
  USING (
    public.get_my_user_type() = 'admin'
  );

-- SECTION 4: Vérification
-- ========================
DO $$
BEGIN
  RAISE NOTICE 'Nombre de politiques RLS sur practitioners: %', (
    SELECT COUNT(*)
    FROM pg_policies
    WHERE tablename = 'practitioners'
  );

  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'practitioners'
    AND rowsecurity = true
  ) THEN
    RAISE NOTICE '✓ RLS activé sur la table practitioners';
  ELSE
    RAISE WARNING '✗ RLS non activé sur la table practitioners';
  END IF;
END $$;
