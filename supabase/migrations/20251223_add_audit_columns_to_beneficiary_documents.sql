-- ========================================
-- Migration: Ajouter created_by et updated_by à beneficiary_documents
-- Date: 2025-12-23
-- Description: Ajouter les colonnes d'audit created_by et updated_by à la table beneficiary_documents
-- ========================================

-- Ajouter les colonnes created_by et updated_by
ALTER TABLE beneficiary_documents
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Ajouter des commentaires sur les colonnes
COMMENT ON COLUMN beneficiary_documents.created_by IS 'Utilisateur qui a créé ce document';
COMMENT ON COLUMN beneficiary_documents.updated_by IS 'Utilisateur qui a modifié ce document en dernier';

-- Créer une fonction trigger pour mettre à jour updated_by automatiquement
CREATE OR REPLACE FUNCTION update_beneficiary_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_update_beneficiary_documents_updated_at ON beneficiary_documents;
CREATE TRIGGER trigger_update_beneficiary_documents_updated_at
BEFORE UPDATE ON beneficiary_documents
FOR EACH ROW
EXECUTE FUNCTION update_beneficiary_documents_updated_at();

-- ========================================
-- FIN DE LA MIGRATION
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '✅ Colonnes created_by et updated_by ajoutées à beneficiary_documents';
  RAISE NOTICE '✅ Trigger de mise à jour automatique créé';
END $$;
