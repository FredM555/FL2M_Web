-- =====================================================
-- Migration: Ajout de la colonne module à contact_messages
-- Description: Permet de tracer quel module est concerné
--              par le message de contact
-- Date: 2025-01-18
-- =====================================================

-- Ajouter la colonne module
ALTER TABLE public.contact_messages
ADD COLUMN IF NOT EXISTS module VARCHAR(255);

-- Ajouter un commentaire
COMMENT ON COLUMN public.contact_messages.module IS 'Module concerné par le message de contact (optionnel)';

-- Créer un index pour les recherches par module
CREATE INDEX IF NOT EXISTS idx_contact_messages_module
ON public.contact_messages(module)
WHERE module IS NOT NULL;

-- Message de confirmation
DO $$
BEGIN
  -- Vérifier que la colonne a été ajoutée
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'contact_messages'
    AND column_name = 'module'
  ) THEN
    RAISE NOTICE '✓ Colonne module ajoutée avec succès à contact_messages';
  ELSE
    RAISE WARNING '✗ Colonne module NON ajoutée à contact_messages';
  END IF;

  -- Vérifier que l'index a été créé
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'contact_messages'
    AND indexname = 'idx_contact_messages_module'
  ) THEN
    RAISE NOTICE '✓ Index sur module créé avec succès';
  ELSE
    RAISE WARNING '✗ Index sur module NON créé';
  END IF;
END $$;
