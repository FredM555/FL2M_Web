-- =====================================================
-- Migration: Correction des politiques RLS pour permettre aux admins de voir tous les messages
-- Description: Les admins et intervenants doivent pouvoir voir tous les threads de messages
-- Date: 2025-12-20
-- =====================================================

-- Supprimer l'ancienne politique trop restrictive
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;

-- Recréer avec accès admin
CREATE POLICY "Users can view their own messages or admins can view all"
  ON public.messages
  FOR SELECT
  USING (
    -- Les utilisateurs voient leurs propres messages
    auth.uid() = user_id
    -- Les messages publics sont visibles par tous
    OR user_id IS NULL
    -- Les admins et intervenants voient TOUS les messages
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND user_type IN ('admin', 'intervenant')
    )
  );

-- Mettre à jour la politique UPDATE pour permettre aux admins de marquer comme lu
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

CREATE POLICY "Users can update their own messages or admins can update all"
  ON public.messages
  FOR UPDATE
  USING (
    -- Les utilisateurs peuvent mettre à jour leurs propres messages
    auth.uid() = user_id
    -- Les admins et intervenants peuvent mettre à jour tous les messages
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND user_type IN ('admin', 'intervenant')
    )
  );

-- Vérifier que les politiques ont bien été créées
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'messages'
ORDER BY policyname;

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Politiques RLS corrigées pour la table messages';
  RAISE NOTICE '👤 Les admins et intervenants peuvent maintenant voir TOUS les messages';
  RAISE NOTICE '🔒 Les clients voient uniquement leurs propres messages';
END $$;
