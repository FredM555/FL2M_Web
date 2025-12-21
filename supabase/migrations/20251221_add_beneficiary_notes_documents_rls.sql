-- Migration: Ajouter les policies RLS pour beneficiary_notes et beneficiary_documents
-- Date: 2025-12-21
-- Description: Permettre aux intervenants d'accéder aux notes et documents des bénéficiaires

-- ========================================
-- BENEFICIARY_NOTES
-- ========================================

-- Activer RLS si ce n'est pas déjà fait
ALTER TABLE beneficiary_notes ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "beneficiary_notes_select_policy" ON beneficiary_notes;
DROP POLICY IF EXISTS "beneficiary_notes_insert_policy" ON beneficiary_notes;
DROP POLICY IF EXISTS "beneficiary_notes_update_policy" ON beneficiary_notes;
DROP POLICY IF EXISTS "beneficiary_notes_delete_policy" ON beneficiary_notes;

-- Policy SELECT: Permettre la lecture des notes
CREATE POLICY "beneficiary_notes_select_policy"
ON beneficiary_notes
FOR SELECT
USING (
  -- Le propriétaire du bénéficiaire
  EXISTS (
    SELECT 1 FROM beneficiaries b
    WHERE b.id = beneficiary_notes.beneficiary_id
    AND b.owner_id = auth.uid()
  )
  OR
  -- L'intervenant qui a créé la note
  practitioner_id IN (
    SELECT id FROM practitioners WHERE user_id = auth.uid()
  )
  OR
  -- L'intervenant d'un rendez-vous où ce bénéficiaire est lié
  EXISTS (
    SELECT 1 FROM appointment_beneficiaries ab
    JOIN appointments a ON a.id = ab.appointment_id
    JOIN practitioners p ON p.id = a.practitioner_id
    WHERE ab.beneficiary_id = beneficiary_notes.beneficiary_id
    AND p.user_id = auth.uid()
  )
  OR
  -- Les admins
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);

-- Policy INSERT: Permettre l'ajout de notes
CREATE POLICY "beneficiary_notes_insert_policy"
ON beneficiary_notes
FOR INSERT
WITH CHECK (
  -- L'intervenant crée une note sur un bénéficiaire de ses rendez-vous
  EXISTS (
    SELECT 1 FROM appointment_beneficiaries ab
    JOIN appointments a ON a.id = ab.appointment_id
    JOIN practitioners p ON p.id = a.practitioner_id
    WHERE ab.beneficiary_id = beneficiary_notes.beneficiary_id
    AND p.user_id = auth.uid()
    AND p.id = beneficiary_notes.practitioner_id
  )
  OR
  -- Les admins
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);

-- Policy UPDATE: Permettre la modification de ses propres notes
CREATE POLICY "beneficiary_notes_update_policy"
ON beneficiary_notes
FOR UPDATE
USING (
  -- L'intervenant qui a créé la note
  practitioner_id IN (
    SELECT id FROM practitioners WHERE user_id = auth.uid()
  )
  OR
  -- Les admins
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);

-- Policy DELETE: Permettre la suppression de ses propres notes
CREATE POLICY "beneficiary_notes_delete_policy"
ON beneficiary_notes
FOR DELETE
USING (
  -- L'intervenant qui a créé la note
  practitioner_id IN (
    SELECT id FROM practitioners WHERE user_id = auth.uid()
  )
  OR
  -- Les admins
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);

-- ========================================
-- BENEFICIARY_DOCUMENTS
-- ========================================

-- Activer RLS si ce n'est pas déjà fait
ALTER TABLE beneficiary_documents ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "beneficiary_documents_select_policy" ON beneficiary_documents;
DROP POLICY IF EXISTS "beneficiary_documents_insert_policy" ON beneficiary_documents;
DROP POLICY IF EXISTS "beneficiary_documents_update_policy" ON beneficiary_documents;
DROP POLICY IF EXISTS "beneficiary_documents_delete_policy" ON beneficiary_documents;

-- Policy SELECT: Permettre la lecture des documents
CREATE POLICY "beneficiary_documents_select_policy"
ON beneficiary_documents
FOR SELECT
USING (
  -- Le propriétaire du bénéficiaire
  EXISTS (
    SELECT 1 FROM beneficiaries b
    WHERE b.id = beneficiary_documents.beneficiary_id
    AND b.owner_id = auth.uid()
  )
  OR
  -- L'intervenant d'un rendez-vous où ce bénéficiaire est lié
  EXISTS (
    SELECT 1 FROM appointment_beneficiaries ab
    JOIN appointments a ON a.id = ab.appointment_id
    JOIN practitioners p ON p.id = a.practitioner_id
    WHERE ab.beneficiary_id = beneficiary_documents.beneficiary_id
    AND p.user_id = auth.uid()
  )
  OR
  -- Les admins
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);

-- Policy INSERT: Permettre l'ajout de documents
CREATE POLICY "beneficiary_documents_insert_policy"
ON beneficiary_documents
FOR INSERT
WITH CHECK (
  -- Le propriétaire du bénéficiaire
  EXISTS (
    SELECT 1 FROM beneficiaries b
    WHERE b.id = beneficiary_documents.beneficiary_id
    AND b.owner_id = auth.uid()
  )
  OR
  -- L'intervenant d'un rendez-vous où ce bénéficiaire est lié
  EXISTS (
    SELECT 1 FROM appointment_beneficiaries ab
    JOIN appointments a ON a.id = ab.appointment_id
    JOIN practitioners p ON p.id = a.practitioner_id
    WHERE ab.beneficiary_id = beneficiary_documents.beneficiary_id
    AND p.user_id = auth.uid()
  )
  OR
  -- Les admins
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);

-- Policy UPDATE: Permettre la modification de documents
CREATE POLICY "beneficiary_documents_update_policy"
ON beneficiary_documents
FOR UPDATE
USING (
  -- Le propriétaire du bénéficiaire
  EXISTS (
    SELECT 1 FROM beneficiaries b
    WHERE b.id = beneficiary_documents.beneficiary_id
    AND b.owner_id = auth.uid()
  )
  OR
  -- Les admins
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);

-- Policy DELETE: Permettre la suppression de documents
CREATE POLICY "beneficiary_documents_delete_policy"
ON beneficiary_documents
FOR DELETE
USING (
  -- Le propriétaire du bénéficiaire
  EXISTS (
    SELECT 1 FROM beneficiaries b
    WHERE b.id = beneficiary_documents.beneficiary_id
    AND b.owner_id = auth.uid()
  )
  OR
  -- Les admins
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);

-- Commentaires pour documentation
COMMENT ON POLICY "beneficiary_notes_select_policy" ON beneficiary_notes IS
'Permet aux propriétaires, créateurs, intervenants concernés et admins de voir les notes';

COMMENT ON POLICY "beneficiary_documents_select_policy" ON beneficiary_documents IS
'Permet aux propriétaires, intervenants concernés et admins de voir les documents';
