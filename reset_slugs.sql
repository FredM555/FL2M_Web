-- Script pour nettoyer et régénérer les slugs avec les nouveaux codes courts

-- Supprimer tous les slugs existants
UPDATE public.practitioners
SET slug = NULL;

-- Régénérer avec les nouveaux codes courts
UPDATE public.practitioners p
SET slug = generate_practitioner_slug(
  (SELECT first_name FROM public.profiles WHERE id = p.user_id),
  (SELECT last_name FROM public.profiles WHERE id = p.user_id),
  p.id
)
WHERE slug IS NULL;

-- Vérifier les résultats
SELECT
  id,
  slug,
  display_name,
  (SELECT first_name || ' ' || last_name FROM public.profiles WHERE id = p.user_id) as full_name
FROM public.practitioners p;
