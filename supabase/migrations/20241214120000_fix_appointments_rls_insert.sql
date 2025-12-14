-- =====================================================
-- Migration: Correction des politiques RLS pour appointments
-- Description: Permet aux intervenants et admins de créer des rendez-vous
-- Date: 2024-12-14
-- Problème: Erreur 403 (Forbidden) lors de la création de RDV par les intervenants
-- =====================================================

-- Supprimer les anciennes politiques INSERT si elles existent
DROP POLICY IF EXISTS "Practitioners can insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins can insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Intervenants can insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Admins and practitioners can insert appointments" ON public.appointments;

-- =====================================================
-- Politique: Les intervenants peuvent créer des rendez-vous pour eux-mêmes
-- =====================================================
CREATE POLICY "Practitioners can create appointments for themselves"
  ON public.appointments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.practitioners p
      WHERE p.id = practitioner_id
      AND p.user_id = auth.uid()
    )
  );

-- =====================================================
-- Politique: Les admins peuvent créer n'importe quel rendez-vous
-- =====================================================
CREATE POLICY "Admins can create any appointment"
  ON public.appointments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- =====================================================
-- Commentaires
-- =====================================================
COMMENT ON POLICY "Practitioners can create appointments for themselves" ON public.appointments IS
'Permet aux intervenants de créer des créneaux disponibles dans leur planning';

COMMENT ON POLICY "Admins can create any appointment" ON public.appointments IS
'Permet aux administrateurs de créer des rendez-vous pour n''importe quel intervenant';

-- =====================================================
-- Note: Cette migration corrige le problème 403 Forbidden
-- lors de la création de rendez-vous par les intervenants
-- =====================================================
