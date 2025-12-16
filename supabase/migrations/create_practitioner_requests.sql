-- =====================================================
-- Migration: Création de la table practitioner_requests
-- Description: Table pour gérer les demandes d'inscription en tant qu'intervenant
-- Date: 2025-01-26
-- Sprint: 2 - Gestion des demandes intervenants
-- =====================================================

-- Création de la table practitioner_requests
CREATE TABLE IF NOT EXISTS public.practitioner_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relation avec l'utilisateur
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Informations obligatoires
  motivation TEXT NOT NULL,

  -- Informations optionnelles
  experience TEXT,
  certifications TEXT,
  specialties TEXT,

  -- Profil public proposé (optionnel)
  proposed_display_name VARCHAR(255),
  proposed_title VARCHAR(255),
  proposed_bio TEXT,
  proposed_summary TEXT,

  -- Statut et traitement
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,

  -- Traçabilité de la révision
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Contraintes
  UNIQUE(user_id, created_at), -- Empêcher les doublons exacts au même moment
  CHECK (
    (status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL) OR
    (status IN ('approved', 'rejected') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
  )
);

-- Index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_practitioner_requests_user ON public.practitioner_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_practitioner_requests_status ON public.practitioner_requests(status);
CREATE INDEX IF NOT EXISTS idx_practitioner_requests_reviewed_by ON public.practitioner_requests(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_practitioner_requests_created_at ON public.practitioner_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_practitioner_requests_reviewed_at ON public.practitioner_requests(reviewed_at DESC);

-- Fonction de mise à jour automatique du timestamp
CREATE OR REPLACE FUNCTION update_practitioner_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at automatiquement
DROP TRIGGER IF EXISTS trigger_update_practitioner_requests_timestamp ON public.practitioner_requests;
CREATE TRIGGER trigger_update_practitioner_requests_timestamp
  BEFORE UPDATE ON public.practitioner_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_practitioner_requests_updated_at();

-- =====================================================
-- RPC: Approuver une demande d'intervenant
-- =====================================================
CREATE OR REPLACE FUNCTION approve_practitioner_request(
  p_request_id UUID,
  p_admin_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  motivation TEXT,
  experience TEXT,
  certifications TEXT,
  specialties TEXT,
  proposed_display_name VARCHAR(255),
  proposed_title VARCHAR(255),
  proposed_bio TEXT,
  proposed_summary TEXT,
  status VARCHAR(20),
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
DECLARE
  v_request RECORD;
  v_practitioner_exists BOOLEAN;
BEGIN
  -- Récupérer la demande
  SELECT * INTO v_request
  FROM public.practitioner_requests
  WHERE practitioner_requests.id = p_request_id
  AND practitioner_requests.status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Demande non trouvée ou déjà traitée';
  END IF;

  -- Vérifier si le intervenant existe déjà
  SELECT EXISTS(
    SELECT 1 FROM public.practitioners
    WHERE practitioners.user_id = v_request.user_id
  ) INTO v_practitioner_exists;

  -- Si le intervenant n'existe pas, le créer avec les informations proposées
  IF NOT v_practitioner_exists THEN
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
    ) VALUES (
      v_request.user_id,
      v_request.proposed_display_name,
      v_request.proposed_title,
      v_request.proposed_bio,
      v_request.proposed_summary,
      0, -- Priorité par défaut
      true, -- Actif par défaut
      p_admin_id,
      p_admin_id
    );
  END IF;

  -- Mettre à jour la demande
  UPDATE public.practitioner_requests
  SET
    status = 'approved',
    admin_notes = p_admin_notes,
    reviewed_by = p_admin_id,
    reviewed_at = NOW()
  WHERE practitioner_requests.id = p_request_id;

  -- Retourner la demande mise à jour
  RETURN QUERY
  SELECT
    pr.id,
    pr.user_id,
    pr.motivation,
    pr.experience,
    pr.certifications,
    pr.specialties,
    pr.proposed_display_name,
    pr.proposed_title,
    pr.proposed_bio,
    pr.proposed_summary,
    pr.status,
    pr.admin_notes,
    pr.reviewed_by,
    pr.reviewed_at,
    pr.created_at,
    pr.updated_at
  FROM public.practitioner_requests pr
  WHERE pr.id = p_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RPC: Rejeter une demande d'intervenant
-- =====================================================
CREATE OR REPLACE FUNCTION reject_practitioner_request(
  p_request_id UUID,
  p_admin_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  motivation TEXT,
  experience TEXT,
  certifications TEXT,
  specialties TEXT,
  proposed_display_name VARCHAR(255),
  proposed_title VARCHAR(255),
  proposed_bio TEXT,
  proposed_summary TEXT,
  status VARCHAR(20),
  admin_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Vérifier que la demande existe et est en attente
  IF NOT EXISTS(
    SELECT 1 FROM public.practitioner_requests
    WHERE practitioner_requests.id = p_request_id
    AND practitioner_requests.status = 'pending'
  ) THEN
    RAISE EXCEPTION 'Demande non trouvée ou déjà traitée';
  END IF;

  -- Mettre à jour la demande
  UPDATE public.practitioner_requests
  SET
    status = 'rejected',
    admin_notes = p_admin_notes,
    reviewed_by = p_admin_id,
    reviewed_at = NOW()
  WHERE practitioner_requests.id = p_request_id;

  -- Retourner la demande mise à jour
  RETURN QUERY
  SELECT
    pr.id,
    pr.user_id,
    pr.motivation,
    pr.experience,
    pr.certifications,
    pr.specialties,
    pr.proposed_display_name,
    pr.proposed_title,
    pr.proposed_bio,
    pr.proposed_summary,
    pr.status,
    pr.admin_notes,
    pr.reviewed_by,
    pr.reviewed_at,
    pr.created_at,
    pr.updated_at
  FROM public.practitioner_requests pr
  WHERE pr.id = p_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RLS (Row Level Security) Policies
-- =====================================================

-- Activer RLS sur la table
ALTER TABLE public.practitioner_requests ENABLE ROW LEVEL SECURITY;

-- Supprimer les policies existantes (au cas où)
DROP POLICY IF EXISTS "Users can view their own practitioner requests" ON public.practitioner_requests;
DROP POLICY IF EXISTS "Users can create their own practitioner requests" ON public.practitioner_requests;
DROP POLICY IF EXISTS "Users can update their own pending practitioner requests" ON public.practitioner_requests;
DROP POLICY IF EXISTS "Admins can view all practitioner requests" ON public.practitioner_requests;
DROP POLICY IF EXISTS "Admins can update all practitioner requests" ON public.practitioner_requests;
DROP POLICY IF EXISTS "Admins can delete all practitioner requests" ON public.practitioner_requests;

-- Policy 1: Les utilisateurs peuvent voir uniquement leurs propres demandes
CREATE POLICY "Users can view their own practitioner requests"
  ON public.practitioner_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Les utilisateurs peuvent créer des demandes pour eux-mêmes
CREATE POLICY "Users can create their own practitioner requests"
  ON public.practitioner_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Les utilisateurs peuvent mettre à jour leurs propres demandes en attente
CREATE POLICY "Users can update their own pending practitioner requests"
  ON public.practitioner_requests
  FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Policy 4: Les admins peuvent voir toutes les demandes
CREATE POLICY "Admins can view all practitioner requests"
  ON public.practitioner_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- Policy 5: Les admins peuvent mettre à jour toutes les demandes
CREATE POLICY "Admins can update all practitioner requests"
  ON public.practitioner_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- Policy 6: Les admins peuvent supprimer toutes les demandes
CREATE POLICY "Admins can delete all practitioner requests"
  ON public.practitioner_requests
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.user_type = 'admin'
    )
  );

-- Commentaires pour la documentation
COMMENT ON TABLE public.practitioner_requests IS 'Table des demandes d''inscription en tant qu''intervenant';
COMMENT ON COLUMN public.practitioner_requests.user_id IS 'Utilisateur ayant fait la demande';
COMMENT ON COLUMN public.practitioner_requests.motivation IS 'Motivation pour devenir intervenant (obligatoire)';
COMMENT ON COLUMN public.practitioner_requests.experience IS 'Expérience professionnelle (optionnel)';
COMMENT ON COLUMN public.practitioner_requests.certifications IS 'Certifications et diplômes (optionnel)';
COMMENT ON COLUMN public.practitioner_requests.specialties IS 'Domaines d''expertise (optionnel)';
COMMENT ON COLUMN public.practitioner_requests.proposed_display_name IS 'Nom d''affichage proposé pour le profil public';
COMMENT ON COLUMN public.practitioner_requests.proposed_title IS 'Titre professionnel proposé';
COMMENT ON COLUMN public.practitioner_requests.proposed_bio IS 'Biographie proposée';
COMMENT ON COLUMN public.practitioner_requests.proposed_summary IS 'Résumé proposé';
COMMENT ON COLUMN public.practitioner_requests.status IS 'Statut: pending, approved, rejected';
COMMENT ON COLUMN public.practitioner_requests.admin_notes IS 'Notes de l''administrateur lors de la révision';
COMMENT ON COLUMN public.practitioner_requests.reviewed_by IS 'Administrateur ayant traité la demande';
COMMENT ON COLUMN public.practitioner_requests.reviewed_at IS 'Date et heure du traitement de la demande';

-- =====================================================
-- IMPORTANT: Migration prête à être appliquée
-- Voir README_SPRINT3.md pour les instructions
-- =====================================================
