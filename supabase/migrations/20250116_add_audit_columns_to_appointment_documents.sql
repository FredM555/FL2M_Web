-- Migration: Ajouter les colonnes d'audit à appointment_documents
-- Date: 2025-01-16
-- Description: Ajouter created_by et updated_by pour que le trigger update_audit_columns() fonctionne

-- Ajouter les colonnes d'audit manquantes
ALTER TABLE public.appointment_documents
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);

-- Mettre à jour les enregistrements existants
-- created_by et updated_by = uploaded_by pour les documents existants
UPDATE public.appointment_documents
SET
  created_by = uploaded_by,
  updated_by = uploaded_by
WHERE created_by IS NULL OR updated_by IS NULL;

-- Vérification
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'appointment_documents'
    AND column_name = 'created_by'
  ) THEN
    RAISE EXCEPTION 'Le champ created_by n''a pas été ajouté!';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'appointment_documents'
    AND column_name = 'updated_by'
  ) THEN
    RAISE EXCEPTION 'Le champ updated_by n''a pas été ajouté!';
  END IF;

  RAISE NOTICE '✓ Migration terminée: colonnes created_by et updated_by ajoutées à appointment_documents';
END $$;
