-- Migration: Configuration du storage pour les documents d'appointments
-- Date: 2025-01-15
-- Description: Créer et configurer le bucket 'documents' avec les bonnes politiques RLS

-- Créer le bucket 'documents' s'il n'existe pas
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Admins can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Practitioners can upload documents to their appointments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view documents they have access to" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Practitioners can delete their documents" ON storage.objects;

-- Politique 1: Upload - Admins et Intervenants peuvent uploader
CREATE POLICY "Admins and practitioners can upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (
    -- Admin peut uploader partout
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
    OR
    -- Intervenant peut uploader dans les dossiers de ses rendez-vous
    EXISTS (
      SELECT 1
      FROM appointments a
      INNER JOIN practitioners p ON a.practitioner_id = p.id
      WHERE a.id::text = (string_to_array(name, '/'))[2]  -- Extrait l'appointmentId du path
      AND p.user_id = auth.uid()
    )
  )
);

-- Politique 2: Lecture - Admins, Intervenants et Clients concernés
CREATE POLICY "Users can view relevant documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    -- Admin peut tout voir
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
    OR
    -- Intervenant peut voir les documents de ses rendez-vous
    EXISTS (
      SELECT 1
      FROM appointments a
      INNER JOIN practitioners p ON a.practitioner_id = p.id
      INNER JOIN appointment_documents ad ON ad.appointment_id = a.id
      WHERE a.id::text = (string_to_array(name, '/'))[2]
      AND p.user_id = auth.uid()
      AND ad.visible_to_consultant = true
    )
    OR
    -- Client peut voir les documents de ses rendez-vous (si visibles)
    EXISTS (
      SELECT 1
      FROM appointments a
      INNER JOIN appointment_documents ad ON ad.appointment_id = a.id
      WHERE a.id::text = (string_to_array(name, '/'))[2]
      AND a.client_id = auth.uid()
      AND ad.visible_to_client = true
    )
  )
);

-- Politique 3: Mise à jour - Admins et Intervenants
CREATE POLICY "Admins and practitioners can update documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    -- Admin peut tout modifier
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
    OR
    -- Intervenant peut modifier les documents de ses rendez-vous
    EXISTS (
      SELECT 1
      FROM appointments a
      INNER JOIN practitioners p ON a.practitioner_id = p.id
      WHERE a.id::text = (string_to_array(name, '/'))[2]
      AND p.user_id = auth.uid()
    )
  )
);

-- Politique 4: Suppression - Admins et Intervenants
CREATE POLICY "Admins and practitioners can delete documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    -- Admin peut tout supprimer
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
    OR
    -- Intervenant peut supprimer les documents de ses rendez-vous
    EXISTS (
      SELECT 1
      FROM appointments a
      INNER JOIN practitioners p ON a.practitioner_id = p.id
      WHERE a.id::text = (string_to_array(name, '/'))[2]
      AND p.user_id = auth.uid()
    )
  )
);
