-- =====================================================
-- Migration: Créer automatiquement un profil practitioner pour les admins
-- Date: 2025-11-16
-- Description: Permet aux admins d'avoir une page de présentation
--              en créant automatiquement un enregistrement dans practitioners
-- =====================================================

-- SECTION 1: Créer un profil practitioner pour tous les admins existants
-- =========================================================================
INSERT INTO public.practitioners (
  user_id,
  display_name,
  title,
  bio,
  summary,
  is_active,
  priority,
  created_at,
  updated_at
)
SELECT
  p.id,
  COALESCE(p.first_name || ' ' || p.last_name, p.pseudo, 'Administrateur') as display_name,
  'Administrateur' as title,
  'Profil administrateur' as bio,
  '' as summary,
  true as is_active,
  0 as priority,
  NOW() as created_at,
  NOW() as updated_at
FROM public.profiles p
LEFT JOIN public.practitioners pr ON pr.user_id = p.id
WHERE p.user_type = 'admin'
AND pr.id IS NULL; -- Ne créer que pour les admins qui n'ont pas encore de profil practitioner

-- SECTION 2: Fonction trigger pour créer automatiquement un practitioner pour les nouveaux admins
-- ===============================================================================================
CREATE OR REPLACE FUNCTION public.handle_admin_to_practitioner()
RETURNS TRIGGER AS $$
BEGIN
  -- Si l'utilisateur devient admin et n'a pas encore de profil practitioner
  IF NEW.user_type = 'admin' AND (OLD.user_type IS NULL OR OLD.user_type != 'admin') THEN
    -- Vérifier si un profil practitioner existe déjà
    IF NOT EXISTS (SELECT 1 FROM public.practitioners WHERE user_id = NEW.id) THEN
      INSERT INTO public.practitioners (
        user_id,
        display_name,
        title,
        bio,
        summary,
        is_active,
        priority,
        created_at,
        updated_at
      )
      VALUES (
        NEW.id,
        COALESCE(NEW.first_name || ' ' || NEW.last_name, NEW.pseudo, 'Administrateur'),
        'Administrateur',
        'Profil administrateur',
        '',
        true,
        0,
        NOW(),
        NOW()
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SECTION 3: Créer le trigger
-- ============================
DROP TRIGGER IF EXISTS on_profile_admin_update ON public.profiles;
CREATE TRIGGER on_profile_admin_update
  AFTER INSERT OR UPDATE OF user_type ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_admin_to_practitioner();

-- SECTION 4: Commentaires
-- ========================
COMMENT ON FUNCTION public.handle_admin_to_practitioner() IS
  'Crée automatiquement un profil practitioner quand un utilisateur devient admin';

-- SECTION 5: Vérification
-- ========================
DO $$
BEGIN
  -- Compter combien de profils practitioner ont été créés pour les admins
  RAISE NOTICE 'Nombre d''admins avec profil practitioner: %', (
    SELECT COUNT(*)
    FROM public.profiles p
    INNER JOIN public.practitioners pr ON pr.user_id = p.id
    WHERE p.user_type = 'admin'
  );

  -- Vérifier que le trigger existe
  IF EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'on_profile_admin_update'
  ) THEN
    RAISE NOTICE '✓ Trigger on_profile_admin_update créé avec succès';
  ELSE
    RAISE WARNING '✗ Trigger on_profile_admin_update non trouvé';
  END IF;
END $$;
