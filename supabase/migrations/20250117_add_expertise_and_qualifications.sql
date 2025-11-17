-- =====================================================
-- Migration: Ajouter les domaines d'expertise et formations/diplômes
-- Date: 2025-01-17
-- Description: Ajoute 2 colonnes JSON pour stocker les domaines d'expertise (5) et les formations/diplômes (3)
-- =====================================================

BEGIN;

-- SECTION 1: Ajouter les nouvelles colonnes
-- ==========================================

-- Domaines d'expertise (maximum 5 éléments)
ALTER TABLE public.practitioners
ADD COLUMN IF NOT EXISTS expertise_domains TEXT[] DEFAULT '{}';

-- Formations/diplômes (maximum 3 éléments)
ALTER TABLE public.practitioners
ADD COLUMN IF NOT EXISTS qualifications TEXT[] DEFAULT '{}';

-- SECTION 2: Ajouter des contraintes pour limiter le nombre d'éléments
-- ======================================================================

-- Contrainte pour limiter expertise_domains à 5 éléments maximum
ALTER TABLE public.practitioners
ADD CONSTRAINT check_expertise_domains_max_5
CHECK (array_length(expertise_domains, 1) IS NULL OR array_length(expertise_domains, 1) <= 5);

-- Contrainte pour limiter qualifications à 3 éléments maximum
ALTER TABLE public.practitioners
ADD CONSTRAINT check_qualifications_max_3
CHECK (array_length(qualifications, 1) IS NULL OR array_length(qualifications, 1) <= 3);

-- SECTION 3: Ajouter des commentaires pour la documentation
-- ===========================================================

COMMENT ON COLUMN public.practitioners.expertise_domains IS 'Domaines d''expertise de l''intervenant (maximum 5 éléments)';
COMMENT ON COLUMN public.practitioners.qualifications IS 'Formations et diplômes de l''intervenant (maximum 3 éléments)';

-- SECTION 4: Vérification
-- ========================

DO $$
DECLARE
    col_count INTEGER;
BEGIN
    -- Vérifier que les colonnes existent
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'practitioners'
    AND column_name IN ('expertise_domains', 'qualifications');

    RAISE NOTICE '================================';
    RAISE NOTICE 'RÉSULTAT DE LA MIGRATION:';
    RAISE NOTICE '================================';

    IF col_count = 2 THEN
        RAISE NOTICE '✓ Les 2 nouvelles colonnes ont été créées avec succès';
        RAISE NOTICE '  - expertise_domains (max 5 éléments)';
        RAISE NOTICE '  - qualifications (max 3 éléments)';
    ELSE
        RAISE WARNING '✗ Erreur: % colonne(s) créée(s) au lieu de 2', col_count;
    END IF;

    RAISE NOTICE '================================';
END $$;

COMMIT;

-- =====================================================
-- FIN DE LA MIGRATION
-- =====================================================
-- Ces champs pourront être modifiés par les intervenants
-- dans leur profil et seront affichés sur la page de détail
-- =====================================================
