-- ========================================
-- Migration: Supprimer la contrainte file_type_check
-- Date: 2025-12-23
-- Description: Autoriser tous les types de fichiers (pas seulement PDF)
-- ========================================

-- Supprimer la contrainte qui limite aux PDF uniquement
ALTER TABLE beneficiary_documents
DROP CONSTRAINT IF EXISTS beneficiary_documents_file_type_check;

-- Ajouter un commentaire pour expliquer
COMMENT ON COLUMN beneficiary_documents.file_type IS 'Type MIME du fichier (tous types autorisés: PDF, images, documents Word/Excel, etc.)';

-- ========================================
-- FIN DE LA MIGRATION
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '✅ Contrainte file_type_check supprimée';
  RAISE NOTICE '📄 Tous les types de fichiers sont maintenant acceptés';
END $$;
