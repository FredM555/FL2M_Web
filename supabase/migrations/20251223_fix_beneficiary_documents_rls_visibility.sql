-- ========================================
-- Migration: Corriger les politiques RLS pour respecter la visibilité
-- Date: 2025-12-23
-- Description: Les clients ne doivent voir que les documents "public", pas les "private"
-- ========================================

-- Supprimer l'ancienne politique SELECT
DROP POLICY IF EXISTS "beneficiary_documents_select_policy" ON beneficiary_documents;

-- Créer la nouvelle politique SELECT qui respecte la visibilité
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

-- Commentaire explicatif
COMMENT ON POLICY "beneficiary_documents_select_policy" ON beneficiary_documents IS
'Permet aux clients de voir uniquement les documents publics, aux intervenants de voir tous les documents de leurs patients, et aux admins de tout voir';

-- ========================================
-- FIN DE LA MIGRATION
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '✅ Politique RLS mise à jour pour respecter la visibilité';
  RAISE NOTICE '📄 Les clients ne voient que les documents publics';
  RAISE NOTICE '👨‍⚕️ Les intervenants voient tous les documents (public + private)';
END $$;
