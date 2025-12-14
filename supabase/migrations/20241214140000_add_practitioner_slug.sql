-- =====================================================
-- Migration: Ajout d'un code unique pour les intervenants
-- Description: Permet d'avoir des URLs courtes style LinkedIn
--              Exemple: fl2m.fr/consultants/a1b2c3d4
-- Date: 2024-12-14
-- =====================================================

-- Ajouter la colonne slug
ALTER TABLE public.practitioners
ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE;

-- Créer un index pour les performances
CREATE INDEX IF NOT EXISTS idx_practitioners_slug ON public.practitioners(slug);

-- Commentaire
COMMENT ON COLUMN public.practitioners.slug IS 'Code court unique pour les URLs (ex: a1b2c3d4), style LinkedIn';

-- Fonction pour générer un code court unique (style LinkedIn)
CREATE OR REPLACE FUNCTION generate_practitioner_slug(
  first_name TEXT,
  last_name TEXT,
  practitioner_id UUID
) RETURNS TEXT AS $$
DECLARE
  slug_code TEXT;
  chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  -- Générer un code basé sur l'UUID de l'intervenant (8 premiers caractères)
  slug_code := lower(substring(replace(practitioner_id::text, '-', ''), 1, 8));

  -- Vérifier l'unicité (normalement garantie par l'UUID, mais on vérifie quand même)
  WHILE EXISTS (
    SELECT 1 FROM public.practitioners
    WHERE slug = slug_code
    AND id != practitioner_id
  ) LOOP
    -- En cas de collision (très improbable), ajouter un caractère aléatoire
    i := floor(random() * length(chars) + 1)::integer;
    slug_code := slug_code || substring(chars, i, 1);
  END LOOP;

  RETURN slug_code;
END;
$$ LANGUAGE plpgsql;

-- Générer les slugs pour les intervenants existants
UPDATE public.practitioners p
SET slug = generate_practitioner_slug(
  (SELECT first_name FROM public.profiles WHERE id = p.user_id),
  (SELECT last_name FROM public.profiles WHERE id = p.user_id),
  p.id
)
WHERE slug IS NULL;

-- Trigger pour générer automatiquement le slug lors de l'insertion
CREATE OR REPLACE FUNCTION auto_generate_practitioner_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := generate_practitioner_slug(
      (SELECT first_name FROM public.profiles WHERE id = NEW.user_id),
      (SELECT last_name FROM public.profiles WHERE id = NEW.user_id),
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_generate_practitioner_slug ON public.practitioners;
CREATE TRIGGER trigger_auto_generate_practitioner_slug
  BEFORE INSERT OR UPDATE ON public.practitioners
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_practitioner_slug();

-- =====================================================
-- Note: Cette migration permet d'avoir des URLs courtes
-- Exemple: https://fl2m.fr/consultants/a1b2c3d4
-- =====================================================
