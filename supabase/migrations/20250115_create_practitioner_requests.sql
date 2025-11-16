-- Migration: Création de la table practitioner_requests pour gérer les demandes d'inscription en tant qu'intervenant
-- Date: 2025-01-15
-- Description: Permet aux utilisateurs de type 'client' de demander à devenir intervenant, avec validation admin

-- Créer la table practitioner_requests
CREATE TABLE IF NOT EXISTS public.practitioner_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Informations de la demande
  motivation TEXT NOT NULL, -- Pourquoi veut-il devenir intervenant
  experience TEXT, -- Expérience professionnelle
  certifications TEXT, -- Certifications/diplômes
  specialties TEXT, -- Domaines d'expertise

  -- Informations professionnelles proposées
  proposed_display_name TEXT,
  proposed_title TEXT,
  proposed_bio TEXT,
  proposed_summary TEXT,

  -- Statut de la demande
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT, -- Notes de l'admin lors de l'approbation/rejet
  reviewed_by UUID REFERENCES public.profiles(id), -- Admin qui a traité la demande
  reviewed_at TIMESTAMPTZ,

  -- Métadonnées
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Contrainte : un utilisateur ne peut avoir qu'une seule demande en attente à la fois
  CONSTRAINT unique_pending_request UNIQUE (user_id, status)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_practitioner_requests_user_id ON public.practitioner_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_practitioner_requests_status ON public.practitioner_requests(status);
CREATE INDEX IF NOT EXISTS idx_practitioner_requests_created_at ON public.practitioner_requests(created_at DESC);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_practitioner_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_practitioner_request_updated_at
  BEFORE UPDATE ON public.practitioner_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_practitioner_request_updated_at();

-- ========================================
-- RLS Policies
-- ========================================

-- Activer RLS
ALTER TABLE public.practitioner_requests ENABLE ROW LEVEL SECURITY;

-- Policy 1: Les utilisateurs peuvent voir leurs propres demandes
CREATE POLICY "Users can view their own requests"
  ON public.practitioner_requests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Policy 2: Les utilisateurs peuvent créer leur propre demande
CREATE POLICY "Users can create their own request"
  ON public.practitioner_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'client' -- Seuls les clients peuvent faire une demande
    )
  );

-- Policy 3: Les utilisateurs peuvent mettre à jour leur demande si elle est en attente
CREATE POLICY "Users can update their pending request"
  ON public.practitioner_requests
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    AND status = 'pending'
  )
  WITH CHECK (
    user_id = auth.uid()
    AND status = 'pending' -- Ne peut pas changer le statut
  );

-- Policy 4: Les admins peuvent tout voir
CREATE POLICY "Admins can view all requests"
  ON public.practitioner_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- Policy 5: Les admins peuvent mettre à jour toutes les demandes
CREATE POLICY "Admins can update all requests"
  ON public.practitioner_requests
  FOR UPDATE
  TO authenticated
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

-- Policy 6: Les admins peuvent supprimer des demandes
CREATE POLICY "Admins can delete requests"
  ON public.practitioner_requests
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- ========================================
-- Fonction pour approuver une demande
-- ========================================

CREATE OR REPLACE FUNCTION approve_practitioner_request(
  request_id UUID,
  admin_id UUID,
  notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  practitioner_id UUID
) AS $$
DECLARE
  v_user_id UUID;
  v_display_name TEXT;
  v_title TEXT;
  v_bio TEXT;
  v_summary TEXT;
  v_practitioner_id UUID;
BEGIN
  -- Vérifier que l'admin est bien un admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = admin_id AND user_type = 'admin'
  ) THEN
    RETURN QUERY SELECT FALSE, 'Unauthorized: Admin access required'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Récupérer les informations de la demande
  SELECT
    pr.user_id,
    pr.proposed_display_name,
    pr.proposed_title,
    pr.proposed_bio,
    pr.proposed_summary
  INTO
    v_user_id,
    v_display_name,
    v_title,
    v_bio,
    v_summary
  FROM public.practitioner_requests pr
  WHERE pr.id = request_id AND pr.status = 'pending';

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Request not found or already processed'::TEXT, NULL::UUID;
    RETURN;
  END IF;

  -- Mettre à jour le user_type dans profiles
  UPDATE public.profiles
  SET user_type = 'intervenant'
  WHERE id = v_user_id;

  -- Créer la fiche practitioner
  INSERT INTO public.practitioners (
    user_id,
    display_name,
    title,
    bio,
    summary,
    priority,
    is_active,
    created_by,
    updated_by
  )
  VALUES (
    v_user_id,
    v_display_name,
    v_title,
    v_bio,
    v_summary,
    0, -- Priorité par défaut
    FALSE, -- Inactif par défaut (admin doit activer manuellement)
    admin_id,
    admin_id
  )
  RETURNING id INTO v_practitioner_id;

  -- Mettre à jour le statut de la demande
  UPDATE public.practitioner_requests
  SET
    status = 'approved',
    admin_notes = notes,
    reviewed_by = admin_id,
    reviewed_at = now()
  WHERE id = request_id;

  RETURN QUERY SELECT TRUE, 'Request approved successfully'::TEXT, v_practitioner_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- Fonction pour rejeter une demande
-- ========================================

CREATE OR REPLACE FUNCTION reject_practitioner_request(
  request_id UUID,
  admin_id UUID,
  notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
BEGIN
  -- Vérifier que l'admin est bien un admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = admin_id AND user_type = 'admin'
  ) THEN
    RETURN QUERY SELECT FALSE, 'Unauthorized: Admin access required'::TEXT;
    RETURN;
  END IF;

  -- Mettre à jour le statut de la demande
  UPDATE public.practitioner_requests
  SET
    status = 'rejected',
    admin_notes = notes,
    reviewed_by = admin_id,
    reviewed_at = now()
  WHERE id = request_id AND status = 'pending';

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Request not found or already processed'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT TRUE, 'Request rejected successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- Commentaires pour la documentation
-- ========================================

COMMENT ON TABLE public.practitioner_requests IS 'Demandes d''inscription en tant qu''intervenant soumises par les utilisateurs';
COMMENT ON COLUMN public.practitioner_requests.motivation IS 'Motivation pour devenir intervenant';
COMMENT ON COLUMN public.practitioner_requests.status IS 'Statut de la demande: pending, approved, rejected';
COMMENT ON FUNCTION approve_practitioner_request IS 'Approuve une demande et crée automatiquement la fiche intervenant';
COMMENT ON FUNCTION reject_practitioner_request IS 'Rejette une demande avec une note optionnelle';
