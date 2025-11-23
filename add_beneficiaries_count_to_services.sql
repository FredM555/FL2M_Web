-- Migration: Ajouter les champs min_beneficiaries et max_beneficiaries à la table services
-- Description: Ces champs permettent de définir le nombre minimum et maximum de bénéficiaires
--              requis pour chaque service (ex: Module Team: min=3, max=9)
-- Date: 2025-01-23

-- Ajouter les colonnes min_beneficiaries et max_beneficiaries
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS min_beneficiaries INTEGER DEFAULT 1 CHECK (min_beneficiaries >= 1),
ADD COLUMN IF NOT EXISTS max_beneficiaries INTEGER DEFAULT 1 CHECK (max_beneficiaries >= min_beneficiaries);

-- Commentaires pour documentation
COMMENT ON COLUMN public.services.min_beneficiaries IS 'Nombre minimum de bénéficiaires requis pour ce service';
COMMENT ON COLUMN public.services.max_beneficiaries IS 'Nombre maximum de bénéficiaires autorisés pour ce service';

-- Mettre à jour les services existants selon leur type
-- Module Adulte: min=1, max=1
UPDATE public.services
SET min_beneficiaries = 1, max_beneficiaries = 1
WHERE code LIKE '%adulte%' OR subcategory LIKE '%adulte%';

-- Module Couple: min=2, max=2
UPDATE public.services
SET min_beneficiaries = 2, max_beneficiaries = 2
WHERE code LIKE '%couple%' OR subcategory LIKE '%couple%';

-- Module Enfants: min=1, max=1
UPDATE public.services
SET min_beneficiaries = 1, max_beneficiaries = 1
WHERE code LIKE '%enfant%' OR subcategory LIKE '%enfant%';

-- Module Team (Sportifs): min=3, max=9
UPDATE public.services
SET min_beneficiaries = 3, max_beneficiaries = 9
WHERE code LIKE '%team%' OR subcategory LIKE '%team%' OR name LIKE '%équipe%';

-- Module Équipe (Professionnels): min=3, max=9
UPDATE public.services
SET min_beneficiaries = 3, max_beneficiaries = 9
WHERE code LIKE '%equipe%' OR subcategory LIKE '%equipe%';

-- Module Suivi Annuel: min=1, max=1 (par défaut)
UPDATE public.services
SET min_beneficiaries = 1, max_beneficiaries = 1
WHERE code LIKE '%suivi%' OR subcategory LIKE '%suivi%';

-- Valeurs par défaut pour les autres services non spécifiés
UPDATE public.services
SET min_beneficiaries = 1, max_beneficiaries = 1
WHERE min_beneficiaries IS NULL OR max_beneficiaries IS NULL;
