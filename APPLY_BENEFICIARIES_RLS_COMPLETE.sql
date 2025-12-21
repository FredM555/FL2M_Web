-- ========================================
-- MIGRATION COMPLÈTE : RLS pour les bénéficiaires
-- Date: 2025-12-21
-- Description: Permettre aux intervenants et admins d'accéder aux bénéficiaires
-- ========================================
--
-- INSTRUCTIONS D'APPLICATION:
-- 1. Allez sur https://supabase.com/dashboard
-- 2. Sélectionnez votre projet
-- 3. Cliquez sur "SQL Editor" dans le menu de gauche
-- 4. Copiez tout ce fichier SQL
-- 5. Collez-le dans l'éditeur
-- 6. Cliquez sur "Run"
--
-- ========================================

-- ========================================
-- TABLE: appointment_beneficiaries
-- ========================================

ALTER TABLE appointment_beneficiaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "appointment_beneficiaries_select_policy" ON appointment_beneficiaries;
DROP POLICY IF EXISTS "appointment_beneficiaries_insert_policy" ON appointment_beneficiaries;
DROP POLICY IF EXISTS "appointment_beneficiaries_update_policy" ON appointment_beneficiaries;
DROP POLICY IF EXISTS "appointment_beneficiaries_delete_policy" ON appointment_beneficiaries;

-- SELECT: Lecture des liens bénéficiaire-rendez-vous
CREATE POLICY "appointment_beneficiaries_select_policy"
ON appointment_beneficiaries
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM beneficiaries b WHERE b.id = appointment_beneficiaries.beneficiary_id AND b.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM beneficiary_access ba WHERE ba.beneficiary_id = appointment_beneficiaries.beneficiary_id AND ba.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM appointments a JOIN practitioners p ON p.id = a.practitioner_id WHERE a.id = appointment_beneficiaries.appointment_id AND p.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.user_type = 'admin')
);

-- INSERT: Ajout de bénéficiaires à un rendez-vous
CREATE POLICY "appointment_beneficiaries_insert_policy"
ON appointment_beneficiaries
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM appointments WHERE appointments.id = appointment_beneficiaries.appointment_id AND appointments.client_id = auth.uid())
  OR EXISTS (SELECT 1 FROM appointments a JOIN practitioners p ON p.id = a.practitioner_id WHERE a.id = appointment_beneficiaries.appointment_id AND p.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.user_type = 'admin')
);

-- UPDATE: Modification des liens
CREATE POLICY "appointment_beneficiaries_update_policy"
ON appointment_beneficiaries
FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM appointments WHERE appointments.id = appointment_beneficiaries.appointment_id AND appointments.client_id = auth.uid())
  OR EXISTS (SELECT 1 FROM appointments a JOIN practitioners p ON p.id = a.practitioner_id WHERE a.id = appointment_beneficiaries.appointment_id AND p.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.user_type = 'admin')
);

-- DELETE: Suppression des liens
CREATE POLICY "appointment_beneficiaries_delete_policy"
ON appointment_beneficiaries
FOR DELETE
USING (
  EXISTS (SELECT 1 FROM appointments WHERE appointments.id = appointment_beneficiaries.appointment_id AND appointments.client_id = auth.uid())
  OR EXISTS (SELECT 1 FROM appointments a JOIN practitioners p ON p.id = a.practitioner_id WHERE a.id = appointment_beneficiaries.appointment_id AND p.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.user_type = 'admin')
);

-- ========================================
-- TABLE: beneficiaries
-- ========================================

ALTER TABLE beneficiaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "beneficiaries_select_for_practitioners" ON beneficiaries;

-- SELECT: Lecture des bénéficiaires
CREATE POLICY "beneficiaries_select_for_practitioners"
ON beneficiaries
FOR SELECT
USING (
  owner_id = auth.uid()
  OR EXISTS (SELECT 1 FROM beneficiary_access WHERE beneficiary_access.beneficiary_id = beneficiaries.id AND beneficiary_access.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM appointment_beneficiaries ab JOIN appointments a ON a.id = ab.appointment_id JOIN practitioners p ON p.id = a.practitioner_id WHERE ab.beneficiary_id = beneficiaries.id AND p.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.user_type = 'admin')
);

-- ========================================
-- TABLE: beneficiary_notes
-- ========================================

ALTER TABLE beneficiary_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "beneficiary_notes_select_policy" ON beneficiary_notes;
DROP POLICY IF EXISTS "beneficiary_notes_insert_policy" ON beneficiary_notes;
DROP POLICY IF EXISTS "beneficiary_notes_update_policy" ON beneficiary_notes;
DROP POLICY IF EXISTS "beneficiary_notes_delete_policy" ON beneficiary_notes;

-- SELECT: Lecture des notes
CREATE POLICY "beneficiary_notes_select_policy"
ON beneficiary_notes
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM beneficiaries b WHERE b.id = beneficiary_notes.beneficiary_id AND b.owner_id = auth.uid())
  OR practitioner_id IN (SELECT id FROM practitioners WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM appointment_beneficiaries ab JOIN appointments a ON a.id = ab.appointment_id JOIN practitioners p ON p.id = a.practitioner_id WHERE ab.beneficiary_id = beneficiary_notes.beneficiary_id AND p.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.user_type = 'admin')
);

-- INSERT: Ajout de notes
CREATE POLICY "beneficiary_notes_insert_policy"
ON beneficiary_notes
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM appointment_beneficiaries ab JOIN appointments a ON a.id = ab.appointment_id JOIN practitioners p ON p.id = a.practitioner_id WHERE ab.beneficiary_id = beneficiary_notes.beneficiary_id AND p.user_id = auth.uid() AND p.id = beneficiary_notes.practitioner_id)
  OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.user_type = 'admin')
);

-- UPDATE: Modification de notes
CREATE POLICY "beneficiary_notes_update_policy"
ON beneficiary_notes
FOR UPDATE
USING (
  practitioner_id IN (SELECT id FROM practitioners WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.user_type = 'admin')
);

-- DELETE: Suppression de notes
CREATE POLICY "beneficiary_notes_delete_policy"
ON beneficiary_notes
FOR DELETE
USING (
  practitioner_id IN (SELECT id FROM practitioners WHERE user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.user_type = 'admin')
);

-- ========================================
-- TABLE: beneficiary_documents
-- ========================================

ALTER TABLE beneficiary_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "beneficiary_documents_select_policy" ON beneficiary_documents;
DROP POLICY IF EXISTS "beneficiary_documents_insert_policy" ON beneficiary_documents;
DROP POLICY IF EXISTS "beneficiary_documents_update_policy" ON beneficiary_documents;
DROP POLICY IF EXISTS "beneficiary_documents_delete_policy" ON beneficiary_documents;

-- SELECT: Lecture des documents
CREATE POLICY "beneficiary_documents_select_policy"
ON beneficiary_documents
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM beneficiaries b WHERE b.id = beneficiary_documents.beneficiary_id AND b.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM appointment_beneficiaries ab JOIN appointments a ON a.id = ab.appointment_id JOIN practitioners p ON p.id = a.practitioner_id WHERE ab.beneficiary_id = beneficiary_documents.beneficiary_id AND p.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.user_type = 'admin')
);

-- INSERT: Ajout de documents
CREATE POLICY "beneficiary_documents_insert_policy"
ON beneficiary_documents
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM beneficiaries b WHERE b.id = beneficiary_documents.beneficiary_id AND b.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM appointment_beneficiaries ab JOIN appointments a ON a.id = ab.appointment_id JOIN practitioners p ON p.id = a.practitioner_id WHERE ab.beneficiary_id = beneficiary_documents.beneficiary_id AND p.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.user_type = 'admin')
);

-- UPDATE: Modification de documents
CREATE POLICY "beneficiary_documents_update_policy"
ON beneficiary_documents
FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM beneficiaries b WHERE b.id = beneficiary_documents.beneficiary_id AND b.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.user_type = 'admin')
);

-- DELETE: Suppression de documents
CREATE POLICY "beneficiary_documents_delete_policy"
ON beneficiary_documents
FOR DELETE
USING (
  EXISTS (SELECT 1 FROM beneficiaries b WHERE b.id = beneficiary_documents.beneficiary_id AND b.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.user_type = 'admin')
);

-- ========================================
-- FIN DE LA MIGRATION
-- ========================================

-- Afficher un message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Migration appliquée avec succès!';
  RAISE NOTICE 'Les intervenants et admins peuvent maintenant accéder aux bénéficiaires de leurs rendez-vous.';
END $$;
