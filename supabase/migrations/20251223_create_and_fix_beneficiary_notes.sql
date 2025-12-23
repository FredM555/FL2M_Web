-- Migration complète: Créer ou corriger la table beneficiary_notes
-- Date: 2025-12-23
-- Description: Créer la table beneficiary_notes avec toutes les colonnes nécessaires
--              incluant user_id pour supporter les notes de type 'user'

-- 1. Créer le type enum s'il n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'beneficiary_note_type') THEN
    CREATE TYPE beneficiary_note_type AS ENUM ('private', 'public', 'practitioner', 'shared', 'user');
  ELSE
    -- Si le type existe déjà, le recréer avec tous les types
    DROP TYPE IF EXISTS beneficiary_note_type CASCADE;
    CREATE TYPE beneficiary_note_type AS ENUM ('private', 'public', 'practitioner', 'shared', 'user');
  END IF;
END $$;

-- 2. Créer la table si elle n'existe pas
CREATE TABLE IF NOT EXISTS beneficiary_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id) ON DELETE CASCADE,
  practitioner_id UUID REFERENCES practitioners(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  note_type beneficiary_note_type NOT NULL DEFAULT 'private',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  CONSTRAINT check_beneficiary_notes_has_author
    CHECK (
      (practitioner_id IS NOT NULL AND user_id IS NULL) OR
      (user_id IS NOT NULL AND practitioner_id IS NULL)
    )
);

-- 3. Si la table existait déjà mais sans user_id, l'ajouter
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'beneficiary_notes'
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE beneficiary_notes
    ADD COLUMN user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 4. Rendre practitioner_id nullable si ce n'est pas déjà le cas
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'beneficiary_notes'
    AND column_name = 'practitioner_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE beneficiary_notes
    ALTER COLUMN practitioner_id DROP NOT NULL;
  END IF;
END $$;

-- 5. Ajouter la contrainte check si elle n'existe pas
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

-- 6. Créer les index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_beneficiary_notes_beneficiary_id ON beneficiary_notes(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_beneficiary_notes_practitioner_id ON beneficiary_notes(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_beneficiary_notes_user_id ON beneficiary_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_beneficiary_notes_note_type ON beneficiary_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_beneficiary_notes_created_at ON beneficiary_notes(created_at DESC);

-- 7. Activer Row Level Security
ALTER TABLE beneficiary_notes ENABLE ROW LEVEL SECURITY;

-- 8. Supprimer toutes les anciennes policies
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

-- 9. Créer les nouvelles politiques RLS

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

-- 10. Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_beneficiary_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Créer le trigger si il n'existe pas
DROP TRIGGER IF EXISTS trigger_update_beneficiary_notes_updated_at ON beneficiary_notes;
CREATE TRIGGER trigger_update_beneficiary_notes_updated_at
BEFORE UPDATE ON beneficiary_notes
FOR EACH ROW
EXECUTE FUNCTION update_beneficiary_notes_updated_at();

-- 12. Commentaires
COMMENT ON TABLE beneficiary_notes IS 'Notes des intervenants et utilisateurs sur les bénéficiaires. Peut être privée (visible uniquement par le créateur intervenant), publique (visible par tous les intervenants), practitioner (note d''intervenant), shared (partagée entre intervenants), ou user (note du client/utilisateur).';
COMMENT ON COLUMN beneficiary_notes.note_type IS 'Type de note : private (visible uniquement par le créateur intervenant), public (visible par tous les intervenants), practitioner (note d''intervenant), shared (partagée entre intervenants), user (note du client/utilisateur)';
COMMENT ON COLUMN beneficiary_notes.content IS 'Contenu de la note';
COMMENT ON COLUMN beneficiary_notes.practitioner_id IS 'ID de l''intervenant qui a créé la note (NULL pour les notes de type user)';
COMMENT ON COLUMN beneficiary_notes.user_id IS 'ID de l''utilisateur qui a créé la note (NULL pour les notes de type practitioner/shared/private/public)';
