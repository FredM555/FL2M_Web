-- =====================================================
-- Migration: Ajout des politiques RLS SELECT pour appointments
-- Description: Permet aux utilisateurs de voir les rendez-vous disponibles
-- Date: 2024-12-14
-- =====================================================

-- Activer RLS sur la table appointments si ce n'est pas déjà fait
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre à tout le monde de voir les rendez-vous disponibles
CREATE POLICY "Anyone can view available appointments"
  ON public.appointments
  FOR SELECT
  USING (status = 'available');

-- Politique pour permettre aux utilisateurs de voir leurs propres rendez-vous
CREATE POLICY "Users can view their own appointments"
  ON public.appointments
  FOR SELECT
  USING (user_id = auth.uid());

-- Politique pour permettre aux intervenants de voir leurs rendez-vous
CREATE POLICY "Practitioners can view their appointments"
  ON public.appointments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.practitioners p
      WHERE p.id = appointments.practitioner_id
      AND p.user_id = auth.uid()
    )
  );

-- Politique pour permettre aux admins de voir tous les rendez-vous
CREATE POLICY "Admins can view all appointments"
  ON public.appointments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- =====================================================
-- Note: Cette migration permet aux nouveaux utilisateurs
-- de voir les rendez-vous disponibles pour réservation
-- =====================================================
