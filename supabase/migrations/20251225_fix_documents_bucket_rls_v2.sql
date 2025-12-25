-- ========================================
-- Migration: Corriger les politiques RLS pour le bucket documents
-- Date: 2025-12-25
-- Version: 2 (avec permissions correctes)
-- ========================================

-- Exécuter en tant que postgres (owner)
SET ROLE postgres;

-- ========================================
-- 1. NETTOYAGE: Supprimer les anciennes politiques
-- ========================================

DROP POLICY IF EXISTS "Users can download beneficiary documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload beneficiary documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update beneficiary documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete beneficiary documents" ON storage.objects;

DROP POLICY IF EXISTS "beneficiary_documents_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "beneficiary_documents_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "beneficiary_documents_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "beneficiary_documents_storage_delete" ON storage.objects;

DROP POLICY IF EXISTS "documents_beneficiaries_select" ON storage.objects;
DROP POLICY IF EXISTS "documents_beneficiaries_insert" ON storage.objects;
DROP POLICY IF EXISTS "documents_beneficiaries_update" ON storage.objects;
DROP POLICY IF EXISTS "documents_beneficiaries_delete" ON storage.objects;

-- ========================================
-- 2. S'ASSURER QUE LE BUCKET 'documents' EXISTE
-- ========================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  10485760,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf']::text[];

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 3. POLITIQUE SELECT
-- ========================================

CREATE POLICY "documents_beneficiaries_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'beneficiaries'
  AND (
    (
      (storage.foldername(name))[2] IN (
        SELECT id::text FROM beneficiaries WHERE owner_id = auth.uid()
      )
      AND EXISTS (
        SELECT 1 FROM beneficiary_documents bd
        WHERE bd.file_path = name
        AND bd.visibility = 'public'
      )
    )
    OR
    (
      (storage.foldername(name))[2] IN (
        SELECT b.id::text
        FROM beneficiaries b
        JOIN beneficiary_access ba ON ba.beneficiary_id = b.id
        WHERE ba.user_id = auth.uid() AND ba.can_view = true
      )
      AND EXISTS (
        SELECT 1 FROM beneficiary_documents bd
        WHERE bd.file_path = name
        AND bd.visibility = 'public'
      )
    )
    OR
    (storage.foldername(name))[2] IN (
      SELECT b.id::text
      FROM beneficiaries b
      JOIN appointment_beneficiaries ab ON ab.beneficiary_id = b.id
      JOIN appointments a ON a.id = ab.appointment_id
      JOIN practitioners p ON p.id = a.practitioner_id
      WHERE p.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  )
);

-- ========================================
-- 4. POLITIQUE INSERT
-- ========================================

CREATE POLICY "documents_beneficiaries_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'beneficiaries'
  AND (
    (storage.foldername(name))[2] IN (
      SELECT id::text FROM beneficiaries WHERE owner_id = auth.uid()
    )
    OR
    (storage.foldername(name))[2] IN (
      SELECT b.id::text
      FROM beneficiaries b
      JOIN beneficiary_access ba ON ba.beneficiary_id = b.id
      WHERE ba.user_id = auth.uid() AND ba.can_edit = true
    )
    OR
    (storage.foldername(name))[2] IN (
      SELECT b.id::text
      FROM beneficiaries b
      JOIN appointment_beneficiaries ab ON ab.beneficiary_id = b.id
      JOIN appointments a ON a.id = ab.appointment_id
      JOIN practitioners p ON p.id = a.practitioner_id
      WHERE p.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  )
);

-- ========================================
-- 5. POLITIQUE UPDATE
-- ========================================

CREATE POLICY "documents_beneficiaries_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'beneficiaries'
  AND (
    (storage.foldername(name))[2] IN (
      SELECT id::text FROM beneficiaries WHERE owner_id = auth.uid()
    )
    OR
    (storage.foldername(name))[2] IN (
      SELECT b.id::text
      FROM beneficiaries b
      JOIN beneficiary_access ba ON ba.beneficiary_id = b.id
      WHERE ba.user_id = auth.uid() AND ba.can_edit = true
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  )
);

-- ========================================
-- 6. POLITIQUE DELETE
-- ========================================

CREATE POLICY "documents_beneficiaries_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'beneficiaries'
  AND (
    (storage.foldername(name))[2] IN (
      SELECT id::text FROM beneficiaries WHERE owner_id = auth.uid()
    )
    OR
    (storage.foldername(name))[2] IN (
      SELECT b.id::text
      FROM beneficiaries b
      JOIN beneficiary_access ba ON ba.beneficiary_id = b.id
      WHERE ba.user_id = auth.uid() AND ba.can_edit = true
    )
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  )
);

-- Remettre le rôle par défaut
RESET ROLE;

-- ========================================
-- FIN
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '✅ Politiques RLS du bucket documents corrigées!';
  RAISE NOTICE '📁 Structure: documents/beneficiaries/{beneficiary_id}/fichier.pdf';
  RAISE NOTICE '🔐 Documents publics: visibles par les bénéficiaires';
  RAISE NOTICE '🔒 Documents privés: visibles uniquement par les intervenants et admins';
END $$;
