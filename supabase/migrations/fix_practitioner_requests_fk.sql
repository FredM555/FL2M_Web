-- =====================================================
-- Fix: Corriger la Foreign Key user_id
-- Description: Changer la référence de auth.users vers public.profiles
-- Date: 2025-01-26
-- =====================================================

-- 1. Trouver le nom de la contrainte FK existante
DO $$
DECLARE
  constraint_name_var TEXT;
BEGIN
  -- Récupérer le nom de la contrainte
  SELECT constraint_name INTO constraint_name_var
  FROM information_schema.table_constraints
  WHERE table_name = 'practitioner_requests'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%user_id%';

  -- Supprimer la contrainte si elle existe
  IF constraint_name_var IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.practitioner_requests DROP CONSTRAINT %I', constraint_name_var);
    RAISE NOTICE 'Contrainte FK % supprimée', constraint_name_var;
  END IF;
END $$;

-- 2. Supprimer également la contrainte sur reviewed_by si elle référence auth.users
DO $$
DECLARE
  constraint_name_var TEXT;
BEGIN
  SELECT constraint_name INTO constraint_name_var
  FROM information_schema.table_constraints
  WHERE table_name = 'practitioner_requests'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%reviewed_by%';

  IF constraint_name_var IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.practitioner_requests DROP CONSTRAINT %I', constraint_name_var);
    RAISE NOTICE 'Contrainte FK % supprimée', constraint_name_var);
  END IF;
END $$;

-- 3. Créer les nouvelles contraintes FK vers public.profiles
ALTER TABLE public.practitioner_requests
  ADD CONSTRAINT practitioner_requests_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

ALTER TABLE public.practitioner_requests
  ADD CONSTRAINT practitioner_requests_reviewed_by_fkey
  FOREIGN KEY (reviewed_by)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

-- 4. Message de confirmation
DO $$
BEGIN
  RAISE NOTICE 'Foreign keys corrigées avec succès !';
  RAISE NOTICE 'user_id référence maintenant public.profiles(id)';
  RAISE NOTICE 'reviewed_by référence maintenant public.profiles(id)';
END $$;
