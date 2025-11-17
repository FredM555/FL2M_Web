-- =====================================================
-- Migration: Nettoyage COMPLET des politiques RLS
-- Date: 2025-11-16
-- Description: Supprime toutes les politiques en double et recrée proprement
-- =====================================================

-- SECTION 1: Supprimer TOUTES les politiques sur practitioners
-- =============================================================
DROP POLICY IF EXISTS "Admin et intervenuvent modifier" ON public.practitioners;
DROP POLICY IF EXISTS "Admins can delete" ON public.practitioners;
DROP POLICY IF EXISTS "Admins can insert" ON public.practitioners;
DROP POLICY IF EXISTS "Admins have full access to practitioners" ON public.practitioners;
DROP POLICY IF EXISTS "Everyone can view active practitioners" ON public.practitioners;
DROP POLICY IF EXISTS "Practitioners can update own" ON public.practitioners;
DROP POLICY IF EXISTS "Practitioners can update their own profile" ON public.practitioners;
DROP POLICY IF EXISTS "Practitioners can view their own profile" ON public.practitioners;
DROP POLICY IF EXISTS "Public read access to practitioners" ON public.practitioners;
DROP POLICY IF EXISTS "Seuls les admin peuvent ajouter des intervenants" ON public.practitioners;
DROP POLICY IF EXISTS "Seuls les admin peuvent supprimer des intervenants" ON public.practitioners;
DROP POLICY IF EXISTS "Utilisateurs authentifiés peuvent voir les intervenants" ON public.practitioners;

-- SECTION 2: Supprimer les politiques problématiques sur profiles
-- ================================================================
DROP POLICY IF EXISTS "Utilisateurs peuvent modifier leur propre profil et admins peuv" ON public.profiles;
DROP POLICY IF EXISTS "Allow service role to insert profiles" ON public.profiles;

-- SECTION 3: Créer UNE SEULE politique simple par opération sur practitioners
-- ============================================================================

-- SELECT: Tout le monde voit les actifs, les praticiens voient leur profil
CREATE POLICY "practitioners_select_policy"
  ON public.practitioners
  FOR SELECT
  USING (
    is_active = true
    OR
    user_id = auth.uid()
  );

-- UPDATE: Seulement son propre profil
CREATE POLICY "practitioners_update_policy"
  ON public.practitioners
  FOR UPDATE
  USING (user_id = auth.uid());

-- INSERT: Désactivé pour les utilisateurs normaux (seulement via triggers admin)
CREATE POLICY "practitioners_insert_policy"
  ON public.practitioners
  FOR INSERT
  WITH CHECK (false);

-- DELETE: Désactivé pour les utilisateurs normaux
CREATE POLICY "practitioners_delete_policy"
  ON public.practitioners
  FOR DELETE
  USING (false);

-- SECTION 4: Recréer les politiques simples sur profiles
-- =======================================================

-- SELECT: Voir son propre profil
CREATE POLICY "profiles_select_policy"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- UPDATE: Modifier son propre profil
CREATE POLICY "profiles_update_policy"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- INSERT: Permettre l'insertion (pour les triggers)
CREATE POLICY "profiles_insert_policy"
  ON public.profiles
  FOR INSERT
  WITH CHECK (true);

-- DELETE: Interdit
CREATE POLICY "profiles_delete_policy"
  ON public.profiles
  FOR DELETE
  USING (false);

-- SECTION 5: Vérification finale
-- ===============================
DO $$
BEGIN
  RAISE NOTICE '=== Politiques RLS sur practitioners (devrait être 4) ===';
  RAISE NOTICE 'Nombre total: %', (
    SELECT COUNT(*)
    FROM pg_policies
    WHERE tablename = 'practitioners'
  );

  RAISE NOTICE '=== Politiques RLS sur profiles (devrait être 4) ===';
  RAISE NOTICE 'Nombre total: %', (
    SELECT COUNT(*)
    FROM pg_policies
    WHERE tablename = 'profiles'
  );
END $$;

-- SECTION 6: Permissions spéciales pour les admins
-- =================================================
-- Les admins auront accès via l'interface admin qui utilise le service_role
-- Pas besoin de politiques RLS complexes
