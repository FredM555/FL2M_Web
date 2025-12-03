-- =====================================================
-- Migration: Ajout RLS sur practitioner_contracts
-- Description: Sécurise la table practitioner_contracts avec Row Level Security
-- Date: 2025-12-03
-- =====================================================

-- Activer RLS sur la table
ALTER TABLE public.practitioner_contracts ENABLE ROW LEVEL SECURITY;

-- Policy SELECT: Les praticiens peuvent voir leurs propres contrats
CREATE POLICY "Practitioners can view their own contracts"
  ON public.practitioner_contracts
  FOR SELECT
  USING (
    practitioner_id IN (
      SELECT id FROM public.practitioners WHERE user_id = auth.uid()
    )
  );

-- Policy UPDATE: Les praticiens peuvent mettre à jour leurs propres contrats
-- (nécessaire pour réinitialiser end_date lors de l'annulation)
CREATE POLICY "Practitioners can update their own contracts"
  ON public.practitioner_contracts
  FOR UPDATE
  USING (
    practitioner_id IN (
      SELECT id FROM public.practitioners WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    practitioner_id IN (
      SELECT id FROM public.practitioners WHERE user_id = auth.uid()
    )
  );

-- Policy DELETE: Les praticiens peuvent supprimer leurs contrats en attente de paiement
CREATE POLICY "Practitioners can delete their pending contracts"
  ON public.practitioner_contracts
  FOR DELETE
  USING (
    practitioner_id IN (
      SELECT id FROM public.practitioners WHERE user_id = auth.uid()
    )
    AND status = 'pending_payment'
  );

-- Policy SELECT: Les admins voient tous les contrats
CREATE POLICY "Admins can view all contracts"
  ON public.practitioner_contracts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- Policy ALL: Les admins peuvent tout faire sur les contrats
CREATE POLICY "Admins can manage all contracts"
  ON public.practitioner_contracts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- =====================================================
-- IMPORTANT: Migration prête à être appliquée
-- =====================================================
