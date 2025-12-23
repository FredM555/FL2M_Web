-- Migration: Créer le bucket Storage pour les documents bénéficiaires
-- Date: 2025-12-23
-- Description: Création du bucket beneficiary-documents et configuration des politiques RLS

-- 1. Créer le bucket s'il n'existe pas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'beneficiary-documents',
  'beneficiary-documents',
  false,  -- Bucket privé
  10485760,  -- 10 MB max par fichier
  NULL  -- Tous les types MIME autorisés
)
ON CONFLICT (id) DO NOTHING;

-- 2. Activer RLS sur le bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Politique SELECT (téléchargement) - Qui peut télécharger les fichiers ?
CREATE POLICY "Users can download beneficiary documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'beneficiary-documents'
  AND (
    -- Le propriétaire du bénéficiaire
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM beneficiaries WHERE owner_id = auth.uid()
    )
    OR
    -- Utilisateur ayant accès au bénéficiaire via beneficiary_access
    (storage.foldername(name))[1] IN (
      SELECT b.id::text
      FROM beneficiaries b
      JOIN beneficiary_access ba ON ba.beneficiary_id = b.id
      WHERE ba.user_id = auth.uid() AND ba.can_view = true
    )
    OR
    -- Intervenant ayant un rendez-vous avec le bénéficiaire
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
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  )
);

-- 4. Politique INSERT (upload) - Qui peut uploader des fichiers ?
CREATE POLICY "Users can upload beneficiary documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'beneficiary-documents'
  AND (
    -- Le propriétaire du bénéficiaire
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM beneficiaries WHERE owner_id = auth.uid()
    )
    OR
    -- Utilisateur ayant accès au bénéficiaire via beneficiary_access avec can_edit
    (storage.foldername(name))[1] IN (
      SELECT b.id::text
      FROM beneficiaries b
      JOIN beneficiary_access ba ON ba.beneficiary_id = b.id
      WHERE ba.user_id = auth.uid() AND ba.can_edit = true
    )
    OR
    -- Intervenant ayant un rendez-vous avec le bénéficiaire
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
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  )
);

-- 5. Politique UPDATE - Qui peut modifier les métadonnées des fichiers ?
CREATE POLICY "Users can update beneficiary documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'beneficiary-documents'
  AND (
    -- Le propriétaire du bénéficiaire
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM beneficiaries WHERE owner_id = auth.uid()
    )
    OR
    -- Utilisateur ayant accès au bénéficiaire via beneficiary_access avec can_edit
    (storage.foldername(name))[1] IN (
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

-- 6. Politique DELETE - Qui peut supprimer des fichiers ?
CREATE POLICY "Users can delete beneficiary documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'beneficiary-documents'
  AND (
    -- Le propriétaire du bénéficiaire
    (storage.foldername(name))[1] IN (
      SELECT id::text FROM beneficiaries WHERE owner_id = auth.uid()
    )
    OR
    -- Utilisateur ayant accès au bénéficiaire via beneficiary_access avec can_edit
    (storage.foldername(name))[1] IN (
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

-- 7. Commentaires
COMMENT ON TABLE storage.buckets IS 'Buckets de stockage Supabase. Le bucket beneficiary-documents contient les documents uploadés pour les bénéficiaires.';

-- Structure d'organisation des fichiers :
-- beneficiary-documents/
--   {beneficiary_id}/
--     {timestamp}_{filename}
--
-- Les politiques RLS garantissent que :
-- - Les propriétaires peuvent gérer tous les documents de leurs bénéficiaires
-- - Les utilisateurs avec accès partagé peuvent voir/éditer selon leurs permissions
-- - Les intervenants peuvent accéder aux documents des bénéficiaires de leurs RDV
-- - Les admins ont accès complet à tous les documents
