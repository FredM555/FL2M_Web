-- Migration simple: Ajouter la colonne note_type à beneficiary_notes
-- Date: 2025-12-23
-- Description: La table beneficiary_notes existe déjà avec user_id,
--              il manque juste la colonne note_type

-- 1. Créer le type enum beneficiary_note_type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'beneficiary_note_type') THEN
    CREATE TYPE beneficiary_note_type AS ENUM ('private', 'public', 'practitioner', 'shared', 'user');
  END IF;
END $$;

-- 2. Ajouter la colonne note_type si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'beneficiary_notes'
    AND column_name = 'note_type'
  ) THEN
    ALTER TABLE beneficiary_notes
    ADD COLUMN note_type beneficiary_note_type NOT NULL DEFAULT 'private';

    -- Créer un index sur note_type
    CREATE INDEX idx_beneficiary_notes_note_type ON beneficiary_notes(note_type);
  END IF;
END $$;

-- 3. Supprimer toutes les anciennes policies si elles existent
DROP POLICY IF EXISTS "Intervenants can view their own private notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Intervenants can view all public notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Admins can view all notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Intervenants can insert notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Intervenants can update their own notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Admins can update all notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Intervenants can delete their own notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Admins can delete all notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Intervenants can view their own practitioner notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Intervenants can view public and shared notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Users can view their own user notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Intervenants can insert practitioner notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Users can insert user notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON beneficiary_notes;

-- 4. Activer RLS si pas déjà fait
ALTER TABLE beneficiary_notes ENABLE ROW LEVEL SECURITY;

-- 5. Créer les nouvelles politiques RLS

-- SELECT: Les intervenants peuvent voir leurs propres notes practitioner privées
CREATE POLICY "Intervenants can view their own practitioner notes"
ON beneficiary_notes FOR SELECT
TO authenticated
USING (
  note_type IN ('private', 'practitioner')
  AND practitioner_id IN (
    SELECT id FROM practitioners WHERE user_id = auth.uid()
  )
);

-- SELECT: Les intervenants peuvent voir toutes les notes publiques et shared
CREATE POLICY "Intervenants can view public and shared notes"
ON beneficiary_notes FOR SELECT
TO authenticated
USING (
  note_type IN ('public', 'shared')
  AND EXISTS (
    SELECT 1 FROM practitioners WHERE user_id = auth.uid()
  )
);

-- SELECT: Les utilisateurs peuvent voir leurs propres notes user
CREATE POLICY "Users can view their own user notes"
ON beneficiary_notes FOR SELECT
TO authenticated
USING (
  note_type = 'user'
  AND user_id = auth.uid()
);

-- SELECT: Les admins peuvent voir toutes les notes
CREATE POLICY "Admins can view all notes"
ON beneficiary_notes FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- INSERT: Les intervenants peuvent créer des notes practitioner/shared
CREATE POLICY "Intervenants can insert practitioner notes"
ON beneficiary_notes FOR INSERT
TO authenticated
WITH CHECK (
  note_type IN ('private', 'public', 'practitioner', 'shared')
  AND practitioner_id IN (
    SELECT id FROM practitioners WHERE user_id = auth.uid()
  )
  AND user_id IS NULL
);

-- INSERT: Les utilisateurs peuvent créer des notes user
CREATE POLICY "Users can insert user notes"
ON beneficiary_notes FOR INSERT
TO authenticated
WITH CHECK (
  note_type = 'user'
  AND user_id = auth.uid()
  AND practitioner_id IS NULL
);

-- UPDATE: Les intervenants peuvent mettre à jour leurs propres notes
CREATE POLICY "Intervenants can update their own notes"
ON beneficiary_notes FOR UPDATE
TO authenticated
USING (
  practitioner_id IN (
    SELECT id FROM practitioners WHERE user_id = auth.uid()
  )
);

-- UPDATE: Les utilisateurs peuvent mettre à jour leurs propres notes
CREATE POLICY "Users can update their own notes"
ON beneficiary_notes FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
);

-- UPDATE: Les admins peuvent mettre à jour toutes les notes
CREATE POLICY "Admins can update all notes"
ON beneficiary_notes FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- DELETE: Les intervenants peuvent supprimer leurs propres notes
CREATE POLICY "Intervenants can delete their own notes"
ON beneficiary_notes FOR DELETE
TO authenticated
USING (
  practitioner_id IN (
    SELECT id FROM practitioners WHERE user_id = auth.uid()
  )
);

-- DELETE: Les utilisateurs peuvent supprimer leurs propres notes
CREATE POLICY "Users can delete their own notes"
ON beneficiary_notes FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
);

-- DELETE: Les admins peuvent supprimer toutes les notes
CREATE POLICY "Admins can delete all notes"
ON beneficiary_notes FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- 6. Mettre à jour les commentaires
COMMENT ON COLUMN beneficiary_notes.note_type IS 'Type de note : private (visible uniquement par le créateur intervenant), public (visible par tous les intervenants), practitioner (note d''intervenant), shared (partagée entre intervenants), user (note du client/utilisateur)';
COMMENT ON COLUMN beneficiary_notes.practitioner_id IS 'ID de l''intervenant qui a créé la note (NULL pour les notes de type user)';
COMMENT ON COLUMN beneficiary_notes.user_id IS 'ID de l''utilisateur qui a créé la note (NULL pour les notes de type practitioner/shared/private/public)';
