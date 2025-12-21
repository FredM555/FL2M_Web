-- ========================================
-- Migration: Ajouter le champ document_type à beneficiary_documents
-- Date: 2025-12-21
-- Description: Permet de catégoriser les documents des bénéficiaires
-- ========================================

-- Créer le type enum pour les types de documents
DO $$ BEGIN
  CREATE TYPE beneficiary_document_type AS ENUM (
    'arbre',
    'arbre_detail',
    'plan_de_vie',
    'analyse',
    'autre'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Ajouter la colonne document_type à la table beneficiary_documents
ALTER TABLE beneficiary_documents
ADD COLUMN IF NOT EXISTS document_type beneficiary_document_type DEFAULT 'autre' NOT NULL;

-- Ajouter un commentaire sur la colonne
COMMENT ON COLUMN beneficiary_documents.document_type IS 'Type de document : arbre (Arbre de vie), arbre_detail (Arbre de vie détaillé), plan_de_vie (Plan de vie), analyse (Analyse numérologique), autre (Autre type de document)';

-- ========================================
-- FIN DE LA MIGRATION
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '✅ Colonne document_type ajoutée à beneficiary_documents';
  RAISE NOTICE '📄 Types disponibles : arbre, arbre_detail, plan_de_vie, analyse, autre';
  RAISE NOTICE '🔄 Rechargez votre application pour utiliser le sélecteur de type de document';
END $$;
