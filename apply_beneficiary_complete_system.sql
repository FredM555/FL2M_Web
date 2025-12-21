-- Script complet pour le système de notes et documents des bénéficiaires
-- Date: 2025-12-19

-- ============================================================================
-- PARTIE 1: Créer la table des notes avec 3 types
-- ============================================================================

-- 1. Créer le type pour les types de notes (3 types)
DO $$ BEGIN
    CREATE TYPE beneficiary_note_type AS ENUM ('user', 'practitioner', 'shared');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Créer la table beneficiary_notes
CREATE TABLE IF NOT EXISTS beneficiary_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id) ON DELETE CASCADE,
  practitioner_id UUID REFERENCES practitioners(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  note_type beneficiary_note_type NOT NULL DEFAULT 'practitioner',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  CONSTRAINT note_creator_check CHECK (
    (note_type = 'user' AND user_id IS NOT NULL) OR
    (note_type IN ('practitioner', 'shared') AND practitioner_id IS NOT NULL)
  )
);

-- 3. Créer les index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_beneficiary_notes_beneficiary_id ON beneficiary_notes(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_beneficiary_notes_practitioner_id ON beneficiary_notes(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_beneficiary_notes_user_id ON beneficiary_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_beneficiary_notes_note_type ON beneficiary_notes(note_type);
CREATE INDEX IF NOT EXISTS idx_beneficiary_notes_created_at ON beneficiary_notes(created_at DESC);

-- 4. Activer Row Level Security
ALTER TABLE beneficiary_notes ENABLE ROW LEVEL SECURITY;

-- 5. Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Intervenants can view their own private notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Intervenants can view all public notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Admins can view all notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Intervenants can insert notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Intervenants can update their own notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Admins can update all notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Intervenants can delete their own notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Admins can delete all notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Users can view their own notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Users can insert notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Practitioners can view their own notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Practitioners can view shared notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Practitioners can insert notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Practitioners can update their own notes" ON beneficiary_notes;
DROP POLICY IF EXISTS "Practitioners can delete their own notes" ON beneficiary_notes;

-- 6. Nouvelles politiques RLS

-- Les utilisateurs peuvent voir leurs propres notes (type 'user')
CREATE POLICY "Users can view their own notes"
ON beneficiary_notes FOR SELECT
USING (
  note_type = 'user'
  AND user_id = auth.uid()
);

-- Les utilisateurs peuvent créer des notes de type 'user'
CREATE POLICY "Users can insert notes"
ON beneficiary_notes FOR INSERT
WITH CHECK (
  note_type = 'user'
  AND user_id = auth.uid()
);

-- Les utilisateurs peuvent mettre à jour leurs propres notes
CREATE POLICY "Users can update their own notes"
ON beneficiary_notes FOR UPDATE
USING (
  note_type = 'user'
  AND user_id = auth.uid()
);

-- Les utilisateurs peuvent supprimer leurs propres notes
CREATE POLICY "Users can delete their own notes"
ON beneficiary_notes FOR DELETE
USING (
  note_type = 'user'
  AND user_id = auth.uid()
);

-- Les intervenants peuvent voir leurs propres notes (type 'practitioner')
CREATE POLICY "Practitioners can view their own notes"
ON beneficiary_notes FOR SELECT
USING (
  note_type = 'practitioner'
  AND practitioner_id IN (
    SELECT id FROM practitioners WHERE user_id = auth.uid()
  )
);

-- Les intervenants peuvent voir toutes les notes partagées (type 'shared')
CREATE POLICY "Practitioners can view shared notes"
ON beneficiary_notes FOR SELECT
USING (
  note_type = 'shared'
  AND EXISTS (
    SELECT 1 FROM practitioners WHERE user_id = auth.uid()
  )
);

-- Les intervenants peuvent créer des notes
CREATE POLICY "Practitioners can insert notes"
ON beneficiary_notes FOR INSERT
WITH CHECK (
  note_type IN ('practitioner', 'shared')
  AND practitioner_id IN (
    SELECT id FROM practitioners WHERE user_id = auth.uid()
  )
);

-- Les intervenants peuvent mettre à jour leurs propres notes
CREATE POLICY "Practitioners can update their own notes"
ON beneficiary_notes FOR UPDATE
USING (
  note_type IN ('practitioner', 'shared')
  AND practitioner_id IN (
    SELECT id FROM practitioners WHERE user_id = auth.uid()
  )
);

-- Les intervenants peuvent supprimer leurs propres notes
CREATE POLICY "Practitioners can delete their own notes"
ON beneficiary_notes FOR DELETE
USING (
  note_type IN ('practitioner', 'shared')
  AND practitioner_id IN (
    SELECT id FROM practitioners WHERE user_id = auth.uid()
  )
);

-- Les admins peuvent tout voir
CREATE POLICY "Admins can view all notes"
ON beneficiary_notes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- Les admins peuvent tout modifier
CREATE POLICY "Admins can update all notes"
ON beneficiary_notes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- Les admins peuvent tout supprimer
CREATE POLICY "Admins can delete all notes"
ON beneficiary_notes FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- 7. Fonction pour mettre à jour updated_at automatiquement
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

-- 8. Commentaires
COMMENT ON TABLE beneficiary_notes IS 'Notes sur les bénéficiaires. 3 types: user (visible par le client), practitioner (visible uniquement par l''intervenant créateur), shared (visible par tous les intervenants)';
COMMENT ON COLUMN beneficiary_notes.note_type IS 'Type de note : user (client uniquement), practitioner (intervenant créateur uniquement), shared (tous les intervenants)';
COMMENT ON COLUMN beneficiary_notes.practitioner_id IS 'ID de l''intervenant créateur (pour notes practitioner et shared)';
COMMENT ON COLUMN beneficiary_notes.user_id IS 'ID de l''utilisateur créateur (pour notes user)';

-- ============================================================================
-- PARTIE 2: Créer la table des documents des bénéficiaires
-- ============================================================================

-- 1. Créer la table beneficiary_documents
CREATE TABLE IF NOT EXISTS beneficiary_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  practitioner_id UUID REFERENCES practitioners(id) ON DELETE SET NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type VARCHAR(100),
  description TEXT,
  is_visible_to_user BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- 2. Créer les index
CREATE INDEX IF NOT EXISTS idx_beneficiary_documents_beneficiary_id ON beneficiary_documents(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_beneficiary_documents_appointment_id ON beneficiary_documents(appointment_id);
CREATE INDEX IF NOT EXISTS idx_beneficiary_documents_practitioner_id ON beneficiary_documents(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_beneficiary_documents_created_at ON beneficiary_documents(created_at DESC);

-- 3. Activer Row Level Security
ALTER TABLE beneficiary_documents ENABLE ROW LEVEL SECURITY;

-- 4. Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Users can view their beneficiary documents" ON beneficiary_documents;
DROP POLICY IF EXISTS "Practitioners can view all beneficiary documents" ON beneficiary_documents;
DROP POLICY IF EXISTS "Practitioners can insert beneficiary documents" ON beneficiary_documents;
DROP POLICY IF EXISTS "Practitioners can update their uploaded documents" ON beneficiary_documents;
DROP POLICY IF EXISTS "Practitioners can delete their uploaded documents" ON beneficiary_documents;
DROP POLICY IF EXISTS "Admins can manage all beneficiary documents" ON beneficiary_documents;

-- 5. Politiques RLS pour les documents

-- Les utilisateurs peuvent voir les documents visibles de leurs bénéficiaires
CREATE POLICY "Users can view their beneficiary documents"
ON beneficiary_documents FOR SELECT
USING (
  is_visible_to_user = true
  AND beneficiary_id IN (
    SELECT id FROM beneficiaries WHERE owner_id = auth.uid()
    UNION
    SELECT beneficiary_id FROM beneficiary_access WHERE user_id = auth.uid()
  )
);

-- Les intervenants peuvent voir tous les documents des bénéficiaires
CREATE POLICY "Practitioners can view all beneficiary documents"
ON beneficiary_documents FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM practitioners WHERE user_id = auth.uid()
  )
);

-- Les intervenants peuvent uploader des documents
CREATE POLICY "Practitioners can insert beneficiary documents"
ON beneficiary_documents FOR INSERT
WITH CHECK (
  practitioner_id IN (
    SELECT id FROM practitioners WHERE user_id = auth.uid()
  )
);

-- Les intervenants peuvent mettre à jour les documents qu'ils ont uploadés
CREATE POLICY "Practitioners can update their uploaded documents"
ON beneficiary_documents FOR UPDATE
USING (
  practitioner_id IN (
    SELECT id FROM practitioners WHERE user_id = auth.uid()
  )
);

-- Les intervenants peuvent supprimer les documents qu'ils ont uploadés
CREATE POLICY "Practitioners can delete their uploaded documents"
ON beneficiary_documents FOR DELETE
USING (
  practitioner_id IN (
    SELECT id FROM practitioners WHERE user_id = auth.uid()
  )
);

-- Les admins peuvent tout gérer
CREATE POLICY "Admins can manage all beneficiary documents"
ON beneficiary_documents FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- 6. Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_beneficiary_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_beneficiary_documents_updated_at ON beneficiary_documents;
CREATE TRIGGER trigger_update_beneficiary_documents_updated_at
BEFORE UPDATE ON beneficiary_documents
FOR EACH ROW
EXECUTE FUNCTION update_beneficiary_documents_updated_at();

-- 7. Commentaires
COMMENT ON TABLE beneficiary_documents IS 'Documents associés aux bénéficiaires, uploadés par les intervenants';
COMMENT ON COLUMN beneficiary_documents.is_visible_to_user IS 'Si true, le document est visible par le client propriétaire du bénéficiaire';
COMMENT ON COLUMN beneficiary_documents.appointment_id IS 'Rendez-vous associé (optionnel)';

-- ============================================================================
-- PARTIE 3: Supprimer les champs legacy de la table appointments
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
