-- Migration: Correction de la table beneficiary_notes
-- Date: 2025-12-23
-- Description: Ajouter la colonne user_id manquante pour les notes de type 'user'
--              et mettre à jour le type enum pour inclure les types corrects

-- 1. Supprimer l'ancien type enum s'il existe et le recréer
DROP TYPE IF EXISTS beneficiary_note_type CASCADE;
CREATE TYPE beneficiary_note_type AS ENUM ('private', 'public', 'practitioner', 'shared', 'user');

-- 2. Ajouter la colonne user_id si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'beneficiary_notes'
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE beneficiary_notes
    ADD COLUMN user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

    CREATE INDEX idx_beneficiary_notes_user_id ON beneficiary_notes(user_id);
  END IF;
END $$;

-- 3. Rendre practitioner_id nullable car les notes de type 'user' n'ont pas de practitioner
ALTER TABLE beneficiary_notes
ALTER COLUMN practitioner_id DROP NOT NULL;

-- 4. Ajouter une contrainte pour vérifier qu'au moins un des deux existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'check_beneficiary_notes_has_author'
  ) THEN
    ALTER TABLE beneficiary_notes
    ADD CONSTRAINT check_beneficiary_notes_has_author
    CHECK (
      (practitioner_id IS NOT NULL AND user_id IS NULL) OR
      (user_id IS NOT NULL AND practitioner_id IS NULL)
    );
  END IF;
END $$;

-- 5. Recréer la colonne note_type avec le nouveau type
ALTER TABLE beneficiary_notes
ALTER COLUMN note_type TYPE beneficiary_note_type USING note_type::text::beneficiary_note_type;

-- 6. Mettre à jour les politiques RLS pour supporter les notes de type 'user'

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Intervenants can view their own private notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Intervenants can view all public notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Admins can view all notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Intervenants can insert notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Intervenants can update their own notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Admins can update all notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Intervenants can delete their own notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Admins can delete all notes" ON beneficiary_notes;

-- Recréer les policies avec support pour user_id

-- SELECT: Les intervenants peuvent voir leurs propres notes practitioner privées
CREATE POLICY "Intervenants can view their own practitioner notes"
ON beneficiary_notes FOR SELECT
USING (
  note_type IN ('private', 'practitioner')
  AND practitioner_id IN (
    SELECT id FROM practitioners WHERE user_id = auth.uid()
  )
);

-- SELECT: Les intervenants peuvent voir toutes les notes publiques et shared
CREATE POLICY "Intervenants can view public and shared notes"
ON beneficiary_notes FOR SELECT
USING (
  note_type IN ('public', 'shared')
  AND EXISTS (
    SELECT 1 FROM practitioners WHERE user_id = auth.uid()
  )
);

-- SELECT: Les utilisateurs peuvent voir leurs propres notes user
CREATE POLICY "Users can view their own user notes"
ON beneficiary_notes FOR SELECT
USING (
  note_type = 'user'
  AND user_id = auth.uid()
);

-- SELECT: Les admins peuvent voir toutes les notes
CREATE POLICY "Admins can view all notes"
ON beneficiary_notes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- INSERT: Les intervenants peuvent créer des notes practitioner/shared
CREATE POLICY "Intervenants can insert practitioner notes"
ON beneficiary_notes FOR INSERT
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
WITH CHECK (
  note_type = 'user'
  AND user_id = auth.uid()
  AND practitioner_id IS NULL
);

-- UPDATE: Les intervenants peuvent mettre à jour leurs propres notes
CREATE POLICY "Intervenants can update their own notes"
ON beneficiary_notes FOR UPDATE
USING (
  practitioner_id IN (
    SELECT id FROM practitioners WHERE user_id = auth.uid()
  )
);

-- UPDATE: Les utilisateurs peuvent mettre à jour leurs propres notes
CREATE POLICY "Users can update their own notes"
ON beneficiary_notes FOR UPDATE
USING (
  user_id = auth.uid()
);

-- UPDATE: Les admins peuvent mettre à jour toutes les notes
CREATE POLICY "Admins can update all notes"
ON beneficiary_notes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- DELETE: Les intervenants peuvent supprimer leurs propres notes
CREATE POLICY "Intervenants can delete their own notes"
ON beneficiary_notes FOR DELETE
USING (
  practitioner_id IN (
    SELECT id FROM practitioners WHERE user_id = auth.uid()
  )
);

-- DELETE: Les utilisateurs peuvent supprimer leurs propres notes
CREATE POLICY "Users can delete their own notes"
ON beneficiary_notes FOR DELETE
USING (
  user_id = auth.uid()
);

-- DELETE: Les admins peuvent supprimer toutes les notes
CREATE POLICY "Admins can delete all notes"
ON beneficiary_notes FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- 7. Mettre à jour les commentaires
COMMENT ON COLUMN beneficiary_notes.note_type IS 'Type de note : private (visible uniquement par le créateur intervenant), public (visible par tous les intervenants), practitioner (note d''intervenant), shared (partagée entre intervenants), user (note du client/utilisateur)';
COMMENT ON COLUMN beneficiary_notes.practitioner_id IS 'ID de l''intervenant qui a créé la note (NULL pour les notes de type user)';
COMMENT ON COLUMN beneficiary_notes.user_id IS 'ID de l''utilisateur qui a créé la note (NULL pour les notes de type practitioner/shared/private/public)';
