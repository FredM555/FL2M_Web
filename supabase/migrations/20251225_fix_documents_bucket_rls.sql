-- ========================================
-- Migration: Corriger les politiques RLS pour le bucket documents
-- Date: 2025-12-25
-- Description: Configurer les politiques RLS pour documents/beneficiaries/{beneficiary-id}/*
-- ========================================

-- ========================================
-- 1. NETTOYAGE: Supprimer les anciennes politiques
-- ========================================

-- Supprimer les anciennes politiques du bucket beneficiary-documents (si elles existent)
DROP POLICY IF EXISTS "Users can download beneficiary documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload beneficiary documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update beneficiary documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete beneficiary documents" ON storage.objects;

DROP POLICY IF EXISTS "beneficiary_documents_storage_select" ON storage.objects;
DROP POLICY IF EXISTS "beneficiary_documents_storage_insert" ON storage.objects;
DROP POLICY IF EXISTS "beneficiary_documents_storage_update" ON storage.objects;
DROP POLICY IF EXISTS "beneficiary_documents_storage_delete" ON storage.objects;

-- Supprimer d'anciennes politiques pour documents/beneficiaries si elles existent
DROP POLICY IF EXISTS "documents_beneficiaries_select" ON storage.objects;
DROP POLICY IF EXISTS "documents_beneficiaries_insert" ON storage.objects;
DROP POLICY IF EXISTS "documents_beneficiaries_update" ON storage.objects;
DROP POLICY IF EXISTS "documents_beneficiaries_delete" ON storage.objects;

-- ========================================
-- 2. S'ASSURER QUE LE BUCKET 'documents' EXISTE
-- ========================================

-- Créer le bucket documents s'il n'existe pas (privé)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,  -- Bucket privé pour contrôler l'accès via RLS
  10485760,  -- 10 MB max par fichier
  ARRAY['application/pdf']::text[]  -- Seulement les PDFs
)
ON CONFLICT (id) DO UPDATE SET
  public = false,  -- S'assurer qu'il est privé
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf']::text[];

-- Activer RLS sur storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 3. POLITIQUE SELECT (Téléchargement/Lecture)
-- ========================================
-- Permet de voir et télécharger les documents selon les permissions

CREATE POLICY "documents_beneficiaries_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  -- Seulement pour le bucket 'documents' et le dossier 'beneficiaries/*'
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'beneficiaries'
  AND (
    -- Le propriétaire du bénéficiaire peut voir UNIQUEMENT les documents publics
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
    -- Les utilisateurs avec accès partagé peuvent voir UNIQUEMENT les documents publics
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
    -- Les intervenants ayant un rendez-vous avec le bénéficiaire peuvent voir TOUS les documents (public ET private)
    (storage.foldername(name))[2] IN (
      SELECT b.id::text
      FROM beneficiaries b
      JOIN appointment_beneficiaries ab ON ab.beneficiary_id = b.id
      JOIN appointments a ON a.id = ab.appointment_id
      JOIN practitioners p ON p.id = a.practitioner_id
      WHERE p.user_id = auth.uid()
    )
    OR
    -- Les admins peuvent voir TOUS les documents
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  )
);

-- ========================================
-- 4. POLITIQUE INSERT (Upload)
-- ========================================
-- Permet d'uploader des documents

CREATE POLICY "documents_beneficiaries_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  -- Seulement pour le bucket 'documents' et le dossier 'beneficiaries/*'
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'beneficiaries'
  AND (
    -- Le propriétaire du bénéficiaire peut uploader
    (storage.foldername(name))[2] IN (
      SELECT id::text FROM beneficiaries WHERE owner_id = auth.uid()
    )
    OR
    -- Les utilisateurs avec can_edit peuvent uploader
    (storage.foldername(name))[2] IN (
      SELECT b.id::text
      FROM beneficiaries b
      JOIN beneficiary_access ba ON ba.beneficiary_id = b.id
      WHERE ba.user_id = auth.uid() AND ba.can_edit = true
    )
    OR
    -- Les intervenants ayant un rendez-vous avec le bénéficiaire peuvent uploader
    (storage.foldername(name))[2] IN (
      SELECT b.id::text
      FROM beneficiaries b
      JOIN appointment_beneficiaries ab ON ab.beneficiary_id = b.id
      JOIN appointments a ON a.id = ab.appointment_id
      JOIN practitioners p ON p.id = a.practitioner_id
      WHERE p.user_id = auth.uid()
    )
    OR
    -- Les admins peuvent uploader
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  )
);

-- ========================================
-- 5. POLITIQUE UPDATE (Modification des métadonnées)
-- ========================================

CREATE POLICY "documents_beneficiaries_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  -- Seulement pour le bucket 'documents' et le dossier 'beneficiaries/*'
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'beneficiaries'
  AND (
    -- Le propriétaire du bénéficiaire
    (storage.foldername(name))[2] IN (
      SELECT id::text FROM beneficiaries WHERE owner_id = auth.uid()
    )
    OR
    -- Les utilisateurs avec can_edit
    (storage.foldername(name))[2] IN (
      SELECT b.id::text
      FROM beneficiaries b
      JOIN beneficiary_access ba ON ba.beneficiary_id = b.id
      WHERE ba.user_id = auth.uid() AND ba.can_edit = true
    )
    OR
    -- Les admins
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  )
);

-- ========================================
-- 6. POLITIQUE DELETE (Suppression)
-- ========================================

CREATE POLICY "documents_beneficiaries_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  -- Seulement pour le bucket 'documents' et le dossier 'beneficiaries/*'
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = 'beneficiaries'
  AND (
    -- Le propriétaire du bénéficiaire
    (storage.foldername(name))[2] IN (
      SELECT id::text FROM beneficiaries WHERE owner_id = auth.uid()
    )
    OR
    -- Les utilisateurs avec can_edit
    (storage.foldername(name))[2] IN (
      SELECT b.id::text
      FROM beneficiaries b
      JOIN beneficiary_access ba ON ba.beneficiary_id = b.id
      WHERE ba.user_id = auth.uid() AND ba.can_edit = true
    )
    OR
    -- Les admins
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  )
);

-- ========================================
-- 7. COMMENTAIRES
-- ========================================

COMMENT ON POLICY "documents_beneficiaries_select" ON storage.objects IS
'Permet aux clients de voir uniquement les documents publics de leurs bénéficiaires, aux intervenants de voir tous les documents (public + private), et aux admins de tout voir';

COMMENT ON POLICY "documents_beneficiaries_insert" ON storage.objects IS
'Permet aux propriétaires, utilisateurs avec can_edit, intervenants et admins d''uploader des documents pour les bénéficiaires';

COMMENT ON POLICY "documents_beneficiaries_update" ON storage.objects IS
'Permet aux propriétaires, utilisateurs avec can_edit et admins de modifier les métadonnées des documents';

COMMENT ON POLICY "documents_beneficiaries_delete" ON storage.objects IS
'Permet aux propriétaires, utilisateurs avec can_edit et admins de supprimer des documents';

-- ========================================
-- FIN DE LA MIGRATION
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '✅ Politiques RLS du bucket documents corrigées!';
  RAISE NOTICE '📁 Structure: documents/beneficiaries/{beneficiary_id}/fichier.pdf';
  RAISE NOTICE '🔐 Documents publics: visibles par les bénéficiaires';
  RAISE NOTICE '🔒 Documents privés: visibles uniquement par les intervenants et admins';
  RAISE NOTICE '🎉 Les documents devraient maintenant être accessibles!';
END $$;
