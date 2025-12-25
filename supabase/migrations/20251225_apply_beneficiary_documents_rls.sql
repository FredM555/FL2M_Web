-- ========================================
-- Migration: Appliquer les politiques RLS sur beneficiary_documents
-- Date: 2025-12-25
-- Description: S'assurer que le RLS est bien activé et les politiques appliquées
-- ========================================

-- Exécuter en tant que postgres (owner)
SET ROLE postgres;

-- Activer RLS sur la table beneficiary_documents
ALTER TABLE beneficiary_documents ENABLE ROW LEVEL SECURITY;

-- ========================================
-- Supprimer l'ancienne politique SELECT
-- ========================================

DROP POLICY IF EXISTS "beneficiary_documents_select_policy" ON beneficiary_documents;

-- ========================================
-- Créer la nouvelle politique SELECT qui respecte la visibilité
-- ========================================

CREATE POLICY "beneficiary_documents_select_policy"
ON beneficiary_documents
FOR SELECT
USING (
  -- Les propriétaires voient UNIQUEMENT les documents publics de leurs bénéficiaires
  (
    visibility = 'public'
    AND EXISTS (
      SELECT 1 FROM beneficiaries b
      WHERE b.id = beneficiary_documents.beneficiary_id
      AND b.owner_id = auth.uid()
    )
  )
  OR
  -- Les utilisateurs ayant accès au bénéficiaire via beneficiary_access voient uniquement les publics
  (
    visibility = 'public'
    AND EXISTS (
      SELECT 1 FROM beneficiary_access ba
      WHERE ba.beneficiary_id = beneficiary_documents.beneficiary_id
      AND ba.user_id = auth.uid()
      AND ba.can_view = true
    )
  )
  OR
  -- Les intervenants voient TOUS les documents (public ET private) de leurs bénéficiaires
  EXISTS (
    SELECT 1 FROM appointment_beneficiaries ab
    JOIN appointments a ON a.id = ab.appointment_id
    JOIN practitioners p ON p.id = a.practitioner_id
    WHERE ab.beneficiary_id = beneficiary_documents.beneficiary_id
    AND p.user_id = auth.uid()
  )
  OR
  -- Les admins voient TOUS les documents
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);

-- ========================================
-- Politique INSERT
-- ========================================

DROP POLICY IF EXISTS "beneficiary_documents_insert_policy" ON beneficiary_documents;

CREATE POLICY "beneficiary_documents_insert_policy"
ON beneficiary_documents
FOR INSERT
WITH CHECK (
  -- Le propriétaire peut uploader
  EXISTS (
    SELECT 1 FROM beneficiaries b
    WHERE b.id = beneficiary_documents.beneficiary_id
    AND b.owner_id = auth.uid()
  )
  OR
  -- Utilisateurs avec can_edit
  EXISTS (
    SELECT 1 FROM beneficiary_access ba
    WHERE ba.beneficiary_id = beneficiary_documents.beneficiary_id
    AND ba.user_id = auth.uid()
    AND ba.can_edit = true
  )
  OR
  -- Intervenants
  EXISTS (
    SELECT 1 FROM appointment_beneficiaries ab
    JOIN appointments a ON a.id = ab.appointment_id
    JOIN practitioners p ON p.id = a.practitioner_id
    WHERE ab.beneficiary_id = beneficiary_documents.beneficiary_id
    AND p.user_id = auth.uid()
  )
  OR
  -- Admins
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);

-- ========================================
-- Politique UPDATE
-- ========================================

DROP POLICY IF EXISTS "beneficiary_documents_update_policy" ON beneficiary_documents;

CREATE POLICY "beneficiary_documents_update_policy"
ON beneficiary_documents
FOR UPDATE
USING (
  -- Le créateur du document
  uploaded_by = auth.uid()
  OR
  -- Admins
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);

-- ========================================
-- Politique DELETE
-- ========================================

DROP POLICY IF EXISTS "beneficiary_documents_delete_policy" ON beneficiary_documents;

CREATE POLICY "beneficiary_documents_delete_policy"
ON beneficiary_documents
FOR DELETE
USING (
  -- Le créateur du document
  uploaded_by = auth.uid()
  OR
  -- Admins
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);

-- ========================================
-- Commentaires
-- ========================================

COMMENT ON POLICY "beneficiary_documents_select_policy" ON beneficiary_documents IS
'Permet aux clients de voir uniquement les documents publics, aux intervenants de voir tous les documents de leurs patients, et aux admins de tout voir';

COMMENT ON POLICY "beneficiary_documents_insert_policy" ON beneficiary_documents IS
'Permet aux propriétaires, utilisateurs avec can_edit, intervenants et admins d''uploader des documents';

COMMENT ON POLICY "beneficiary_documents_update_policy" ON beneficiary_documents IS
'Permet au créateur et aux admins de modifier les documents';

COMMENT ON POLICY "beneficiary_documents_delete_policy" ON beneficiary_documents IS
'Permet au créateur et aux admins de supprimer les documents';

-- Remettre le rôle par défaut
RESET ROLE;

-- ========================================
-- FIN
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '✅ Politiques RLS de beneficiary_documents appliquées!';
  RAISE NOTICE '🔐 Les clients ne voient QUE les documents publics';
  RAISE NOTICE '👨‍⚕️ Les intervenants voient TOUS les documents';
  RAISE NOTICE '🔒 Les documents privés sont protégés';
END $$;
