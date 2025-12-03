-- =====================================================
-- Migration: Ajout du champ profile_visible
-- Description: Permet aux intervenants de contrôler la visibilité de leur profil public
-- Date: 2025-12-03
-- =====================================================

-- Ajouter le champ profile_visible
ALTER TABLE public.practitioners
ADD COLUMN IF NOT EXISTS profile_visible BOOLEAN NOT NULL DEFAULT true;

-- Commentaire
COMMENT ON COLUMN public.practitioners.profile_visible IS 'Contrôle si le profil de l''intervenant est visible publiquement dans la liste des intervenants';

-- =====================================================
-- IMPORTANT: Migration prête à être appliquée
-- =====================================================
