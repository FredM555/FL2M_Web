-- =====================================================
-- Script de Nettoyage: Suppression des policies existantes
-- Description: À exécuter AVANT create_practitioner_requests.sql en cas d'erreur
-- Date: 2025-01-26
-- =====================================================

-- Supprimer les policies RLS existantes
DROP POLICY IF EXISTS "Users can view their own practitioner requests" ON public.practitioner_requests;
DROP POLICY IF EXISTS "Users can create their own practitioner requests" ON public.practitioner_requests;
DROP POLICY IF EXISTS "Users can update their own pending practitioner requests" ON public.practitioner_requests;
DROP POLICY IF EXISTS "Admins can view all practitioner requests" ON public.practitioner_requests;
DROP POLICY IF EXISTS "Admins can update all practitioner requests" ON public.practitioner_requests;
DROP POLICY IF EXISTS "Admins can delete all practitioner requests" ON public.practitioner_requests;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE 'Policies RLS supprimées avec succès. Vous pouvez maintenant réexécuter create_practitioner_requests.sql';
END $$;
