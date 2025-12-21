-- Script combiné pour appliquer toutes les mises à jour des bénéficiaires
-- Date: 2025-12-19

-- ============================================================================
-- PARTIE 1: Créer la table des notes sur les bénéficiaires
-- ============================================================================

-- 1. Créer le type pour les types de notes
DO $$ BEGIN
    CREATE TYPE beneficiary_note_type AS ENUM ('private', 'public');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

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
CREATE INDEX IF NOT EXISTS idx_beneficiary_notes_beneficiary_id ON beneficiary_notes(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_beneficiary_notes_practitioner_id ON beneficiary_notes(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_beneficiary_notes_note_type ON beneficiary_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_beneficiary_notes_created_at ON beneficiary_notes(created_at DESC);

-- 4. Activer Row Level Security
ALTER TABLE beneficiary_notes ENABLE ROW LEVEL SECURITY;

-- 5. Créer les politiques RLS (supprimer les existantes d'abord)
DROP POLICY IF EXISTS "Intervenants can view their own private notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Intervenants can view all public notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Admins can view all notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Intervenants can insert notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Intervenants can update their own notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Admins can update all notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Intervenants can delete their own notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Admins can delete all notes" ON beneficiary_notes;

CREATE POLICY "Intervenants can view their own private notes"
ON beneficiary_notes FOR SELECT
USING (
  note_type = 'private'
  AND practitioner_id IN (
    SELECT id FROM practitioners WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Intervenants can view all public notes"
ON beneficiary_notes FOR SELECT
USING (
  note_type = 'public'
  AND EXISTS (
    SELECT 1 FROM practitioners WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all notes"
ON beneficiary_notes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

CREATE POLICY "Intervenants can insert notes"
ON beneficiary_notes FOR INSERT
WITH CHECK (
  practitioner_id IN (
    SELECT id FROM practitioners WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Intervenants can update their own notes"
ON beneficiary_notes FOR UPDATE
USING (
  practitioner_id IN (
    SELECT id FROM practitioners WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Admins can update all notes"
ON beneficiary_notes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

CREATE POLICY "Intervenants can delete their own notes"
ON beneficiary_notes FOR DELETE
USING (
  practitioner_id IN (
    SELECT id FROM practitioners WHERE user_id = auth.uid()
  )
);

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

DROP TRIGGER IF EXISTS trigger_update_beneficiary_notes_updated_at ON beneficiary_notes;
CREATE TRIGGER trigger_update_beneficiary_notes_updated_at
BEFORE UPDATE ON beneficiary_notes
FOR EACH ROW
EXECUTE FUNCTION update_beneficiary_notes_updated_at();

-- 7. Commentaires
COMMENT ON TABLE beneficiary_notes IS 'Notes des intervenants sur les bénéficiaires. Peut être privée (visible uniquement par le créateur) ou publique (visible par tous les intervenants).';
COMMENT ON COLUMN beneficiary_notes.note_type IS 'Type de note : private (visible uniquement par le créateur) ou public (visible par tous les intervenants)';
COMMENT ON COLUMN beneficiary_notes.content IS 'Contenu de la note';

-- ============================================================================
-- PARTIE 2: Supprimer les champs legacy de la table appointments
-- ============================================================================

-- 1. Supprimer la vue existante qui dépend des colonnes legacy
DROP VIEW IF EXISTS appointments_with_beneficiaries CASCADE;

-- 2. Supprimer les champs legacy de bénéficiaire
ALTER TABLE appointments
  DROP COLUMN IF EXISTS beneficiary_first_name,
  DROP COLUMN IF EXISTS beneficiary_last_name,
  DROP COLUMN IF EXISTS beneficiary_birth_date,
  DROP COLUMN IF EXISTS beneficiary_email,
  DROP COLUMN IF EXISTS beneficiary_phone,
  DROP COLUMN IF EXISTS beneficiary_notifications_enabled,
  DROP COLUMN IF EXISTS beneficiary_relationship;

-- 3. Recréer la vue avec la nouvelle architecture
CREATE OR REPLACE VIEW appointments_with_beneficiaries AS
SELECT
  a.*,
  -- Informations du bénéficiaire principal (premier dans l'ordre)
  b.id as primary_beneficiary_id,
  b.first_name as primary_beneficiary_first_name,
  b.last_name as primary_beneficiary_last_name,
  b.birth_date as primary_beneficiary_birth_date,
  b.email as primary_beneficiary_email,
  b.phone as primary_beneficiary_phone,
  b.notifications_enabled as primary_beneficiary_notifications_enabled,
  ab.role as primary_beneficiary_role,
  -- Compter le nombre total de bénéficiaires
  (SELECT COUNT(*) FROM appointment_beneficiaries WHERE appointment_id = a.id) as beneficiaries_count
FROM appointments a
LEFT JOIN LATERAL (
  SELECT *
  FROM appointment_beneficiaries
  WHERE appointment_id = a.id
  ORDER BY role_order ASC
  LIMIT 1
) ab ON true
LEFT JOIN beneficiaries b ON ab.beneficiary_id = b.id;

-- 4. Ajouter un commentaire sur la table pour documenter le changement
COMMENT ON TABLE appointments IS 'Table des rendez-vous. Les informations des bénéficiaires sont stockées dans les tables beneficiaries et appointment_beneficiaries (relation many-to-many).';

-- 5. Ajouter des index sur appointment_beneficiaries pour optimiser les jointures
CREATE INDEX IF NOT EXISTS idx_appointment_beneficiaries_appointment_id
ON appointment_beneficiaries(appointment_id);

CREATE INDEX IF NOT EXISTS idx_appointment_beneficiaries_beneficiary_id
ON appointment_beneficiaries(beneficiary_id);

-- 6. Ajouter un commentaire sur la relation
COMMENT ON TABLE appointment_beneficiaries IS 'Table de liaison entre appointments et beneficiaries. Permet de gérer plusieurs bénéficiaires par rendez-vous avec leur rôle respectif.';

-- Fin du script
