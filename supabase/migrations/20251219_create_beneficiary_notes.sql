-- Migration: Créer la table beneficiary_notes
-- Date: 2025-12-19
-- Description: Table pour stocker les notes des intervenants sur les bénéficiaires
--              avec deux types : notes privées (visible uniquement par l'intervenant créateur)
--              et notes publiques (visibles par tous les intervenants)

-- 1. Créer le type pour les types de notes
CREATE TYPE beneficiary_note_type AS ENUM ('private', 'public');

-- 2. Créer la table beneficiary_notes
CREATE TABLE IF NOT EXISTS beneficiary_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id) ON DELETE CASCADE,
  practitioner_id UUID NOT NULL REFERENCES practitioners(id) ON DELETE CASCADE,
  note_type beneficiary_note_type NOT NULL DEFAULT 'private',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- 3. Créer les index pour optimiser les requêtes
CREATE INDEX idx_beneficiary_notes_beneficiary_id ON beneficiary_notes(beneficiary_id);
CREATE INDEX idx_beneficiary_notes_practitioner_id ON beneficiary_notes(practitioner_id);
CREATE INDEX idx_beneficiary_notes_note_type ON beneficiary_notes(note_type);
CREATE INDEX idx_beneficiary_notes_created_at ON beneficiary_notes(created_at DESC);

-- 4. Activer Row Level Security
ALTER TABLE beneficiary_notes ENABLE ROW LEVEL SECURITY;

-- 5. Politiques RLS

-- Les intervenants peuvent voir leurs propres notes privées
CREATE POLICY "Intervenants can view their own private notes"
ON beneficiary_notes FOR SELECT
USING (
  note_type = 'private'
  AND practitioner_id IN (
    SELECT id FROM practitioners WHERE user_id = auth.uid()
  )
);

-- Les intervenants peuvent voir toutes les notes publiques
CREATE POLICY "Intervenants can view all public notes"
ON beneficiary_notes FOR SELECT
USING (
  note_type = 'public'
  AND EXISTS (
    SELECT 1 FROM practitioners WHERE user_id = auth.uid()
  )
);

-- Les admins peuvent voir toutes les notes
CREATE POLICY "Admins can view all notes"
ON beneficiary_notes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- Les intervenants peuvent créer des notes
CREATE POLICY "Intervenants can insert notes"
ON beneficiary_notes FOR INSERT
WITH CHECK (
  practitioner_id IN (
    SELECT id FROM practitioners WHERE user_id = auth.uid()
  )
);

-- Les intervenants peuvent mettre à jour leurs propres notes
CREATE POLICY "Intervenants can update their own notes"
ON beneficiary_notes FOR UPDATE
USING (
  practitioner_id IN (
    SELECT id FROM practitioners WHERE user_id = auth.uid()
  )
);

-- Les admins peuvent mettre à jour toutes les notes
CREATE POLICY "Admins can update all notes"
ON beneficiary_notes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- Les intervenants peuvent supprimer leurs propres notes
CREATE POLICY "Intervenants can delete their own notes"
ON beneficiary_notes FOR DELETE
USING (
  practitioner_id IN (
    SELECT id FROM practitioners WHERE user_id = auth.uid()
  )
);

-- Les admins peuvent supprimer toutes les notes
CREATE POLICY "Admins can delete all notes"
ON beneficiary_notes FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- 6. Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_beneficiary_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_beneficiary_notes_updated_at
BEFORE UPDATE ON beneficiary_notes
FOR EACH ROW
EXECUTE FUNCTION update_beneficiary_notes_updated_at();

-- 7. Commentaires
COMMENT ON TABLE beneficiary_notes IS 'Notes des intervenants sur les bénéficiaires. Peut être privée (visible uniquement par le créateur) ou publique (visible par tous les intervenants).';
COMMENT ON COLUMN beneficiary_notes.note_type IS 'Type de note : private (visible uniquement par le créateur) ou public (visible par tous les intervenants)';
COMMENT ON COLUMN beneficiary_notes.content IS 'Contenu de la note';
