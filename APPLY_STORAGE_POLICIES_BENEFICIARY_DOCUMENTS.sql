-- ========================================
-- Configuration RLS pour le bucket beneficiary-documents
-- Date: 2025-12-21
-- ========================================
--
-- INSTRUCTIONS:
-- 1. Créez d'abord le bucket "beneficiary-documents" dans Storage (voir SETUP_BENEFICIARY_DOCUMENTS_STORAGE.md)
-- 2. Allez dans SQL Editor
-- 3. Exécutez ce script
--
-- ========================================

-- ========================================
-- POLICY 1: SELECT (Téléchargement)
-- ========================================

CREATE POLICY "beneficiary_documents_storage_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'beneficiary-documents'
  AND (
    -- Le propriétaire du bénéficiaire
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM beneficiaries WHERE owner_id = auth.uid()
    )
    OR
    -- Intervenant ayant accès au bénéficiaire via un rendez-vous
    (storage.foldername(name))[1] IN (
      SELECT b.id::text
      FROM beneficiaries b
      JOIN appointment_beneficiaries ab ON ab.beneficiary_id = b.id
      JOIN appointments a ON a.id = ab.appointment_id
      JOIN practitioners p ON p.id = a.practitioner_id
      WHERE p.user_id = auth.uid()
    )
    OR
    -- Les admins
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.user_type = 'admin'
    )
  )
);

-- ========================================
-- POLICY 2: INSERT (Upload)
-- ========================================

CREATE POLICY "beneficiary_documents_storage_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'beneficiary-documents'
  AND (
    -- Le propriétaire du bénéficiaire
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM beneficiaries WHERE owner_id = auth.uid()
    )
    OR
    -- Intervenant ayant accès au bénéficiaire via un rendez-vous
    (storage.foldername(name))[1] IN (
      SELECT b.id::text
      FROM beneficiaries b
      JOIN appointment_beneficiaries ab ON ab.beneficiary_id = b.id
      JOIN appointments a ON a.id = ab.appointment_id
      JOIN practitioners p ON p.id = a.practitioner_id
      WHERE p.user_id = auth.uid()
    )
    OR
    -- Les admins
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.user_type = 'admin'
    )
  )
);

-- ========================================
-- POLICY 3: UPDATE (Modification)
-- ========================================

CREATE POLICY "beneficiary_documents_storage_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'beneficiary-documents'
  AND (
    -- Le propriétaire du bénéficiaire
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM beneficiaries WHERE owner_id = auth.uid()
    )
    OR
    -- Les admins
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.user_type = 'admin'
    )
  )
);

-- ========================================
-- POLICY 4: DELETE (Suppression)
-- ========================================

CREATE POLICY "beneficiary_documents_storage_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'beneficiary-documents'
  AND (
    -- Le propriétaire du bénéficiaire
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM beneficiaries WHERE owner_id = auth.uid()
    )
    OR
    -- Les admins
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.user_type = 'admin'
    )
  )
);

-- ========================================
-- FIN DE LA CONFIGURATION
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '✅ Policies RLS du bucket beneficiary-documents créées!';
  RAISE NOTICE '📁 Structure: beneficiary-documents/{beneficiary_id}/fichier.ext';
  RAISE NOTICE '🔐 Permissions accordées aux propriétaires, intervenants et admins';
  RAISE NOTICE '🎉 Vous pouvez maintenant uploader des documents depuis l''interface!';
END $$;
