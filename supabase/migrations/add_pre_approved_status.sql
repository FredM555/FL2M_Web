-- =====================================================
-- Migration: Ajout du statut 'pre_approved' pour l'autonomie des intervenants
-- Description: Permet à l'admin d'activer le parcours intervenant, puis l'intervenant finalise lui-même son inscription
-- Date: 2025-12-02
-- =====================================================

-- 1. Modifier le CHECK du statut pour inclure 'pre_approved'
ALTER TABLE public.practitioner_requests
DROP CONSTRAINT IF EXISTS practitioner_requests_status_check;

ALTER TABLE public.practitioner_requests
ADD CONSTRAINT practitioner_requests_status_check
CHECK (status IN ('pending', 'pre_approved', 'approved', 'rejected'));

-- 2. Ajouter le statut 'pending_payment' aux contrats
ALTER TABLE public.practitioner_contracts
DROP CONSTRAINT IF EXISTS practitioner_contracts_status_check;

ALTER TABLE public.practitioner_contracts
ADD CONSTRAINT practitioner_contracts_status_check
CHECK (status IN ('pending_payment', 'active', 'suspended', 'terminated'));

-- 2. Modifier le CHECK de cohérence pour gérer 'pre_approved'
-- Un statut 'pre_approved' ne nécessite pas reviewed_by/reviewed_at complets
ALTER TABLE public.practitioner_requests
DROP CONSTRAINT IF EXISTS practitioner_requests_check;

ALTER TABLE public.practitioner_requests
ADD CONSTRAINT practitioner_requests_check
CHECK (
  (status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL) OR
  (status = 'pre_approved') OR -- Pas de contrainte stricte pour pre_approved
  (status IN ('approved', 'rejected') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL)
);

-- =====================================================
-- RPC: Activer le parcours intervenant (pre-approval)
-- =====================================================
CREATE OR REPLACE FUNCTION pre_approve_practitioner_request(
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

  -- Mettre à jour la demande vers pre_approved
  UPDATE public.practitioner_requests
  SET
    status = 'pre_approved',
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
-- RPC: Finaliser l'inscription intervenant (par l'intervenant lui-même)
-- =====================================================
CREATE OR REPLACE FUNCTION complete_practitioner_onboarding(
  p_request_id UUID,
  p_contract_type VARCHAR(20),
  p_contract_document_url TEXT DEFAULT NULL,
  p_start_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  practitioner_id UUID,
  contract_id UUID
) AS $$
DECLARE
  v_request RECORD;
  v_practitioner_exists BOOLEAN;
  v_new_practitioner_id UUID;
  v_new_contract_id UUID;
  v_calling_user_id UUID;
BEGIN
  -- Récupérer l'ID de l'utilisateur authentifié
  v_calling_user_id := auth.uid();

  IF v_calling_user_id IS NULL THEN
    RETURN QUERY SELECT false, 'Utilisateur non authentifié'::TEXT, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;

  -- Récupérer la demande
  SELECT * INTO v_request
  FROM public.practitioner_requests
  WHERE practitioner_requests.id = p_request_id
  AND practitioner_requests.user_id = v_calling_user_id
  AND practitioner_requests.status = 'pre_approved';

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Demande non trouvée, non autorisée ou pas en statut pre_approved'::TEXT, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;

  -- Vérifier que le type de contrat est valide
  IF p_contract_type NOT IN ('free', 'starter', 'pro', 'premium') THEN
    RETURN QUERY SELECT false, 'Type de contrat invalide'::TEXT, NULL::UUID, NULL::UUID;
    RETURN;
  END IF;

  -- Vérifier si le praticien existe déjà
  SELECT EXISTS(
    SELECT 1 FROM public.practitioners
    WHERE practitioners.user_id = v_request.user_id
  ) INTO v_practitioner_exists;

  -- Si le praticien n'existe pas, le créer avec les informations proposées
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
      v_request.user_id, -- Créé par l'intervenant lui-même
      v_request.user_id
    )
    RETURNING id INTO v_new_practitioner_id;
  ELSE
    -- Récupérer l'ID du praticien existant
    SELECT id INTO v_new_practitioner_id
    FROM public.practitioners
    WHERE user_id = v_request.user_id;
  END IF;

  -- Créer le contrat (en statut pending si paiement requis, active si FREE)
  INSERT INTO public.practitioner_contracts (
    practitioner_id,
    contract_type,
    start_date,
    status,
    monthly_fee,
    commission_fixed,
    commission_percentage,
    commission_cap,
    max_appointments_per_month,
    contract_document_url,
    created_by,
    updated_by
  ) VALUES (
    v_new_practitioner_id,  -- CORRECTION: Utilise l'ID du praticien, pas user_id
    p_contract_type,
    p_start_date,
    CASE
      WHEN p_contract_type = 'free' THEN 'active'  -- FREE = activation immédiate
      ELSE 'pending_payment'  -- Autres types = attente du paiement
    END,
    -- monthly_fee basé sur le type de contrat
    CASE p_contract_type
      WHEN 'free' THEN 0
      WHEN 'starter' THEN 60
      WHEN 'pro' THEN 100
      WHEN 'premium' THEN 160
    END,
    -- commission_fixed basé sur le type de contrat
    CASE p_contract_type
      WHEN 'free' THEN 10
      WHEN 'starter' THEN 6
      WHEN 'pro' THEN 3
      WHEN 'premium' THEN 0
    END,
    -- commission_percentage basé sur le type de contrat
    CASE p_contract_type
      WHEN 'free' THEN 12
      WHEN 'starter' THEN 8
      WHEN 'pro' THEN NULL
      WHEN 'premium' THEN NULL
    END,
    -- commission_cap basé sur le type de contrat
    CASE p_contract_type
      WHEN 'free' THEN 25
      WHEN 'starter' THEN NULL
      WHEN 'pro' THEN NULL
      WHEN 'premium' THEN NULL
    END,
    -- max_appointments_per_month (tous NULL pour l'instant)
    NULL,
    p_contract_document_url,
    v_request.user_id,
    v_request.user_id
  )
  RETURNING id INTO v_new_contract_id;

  -- Mettre à jour le user_type vers 'intervenant' dans profiles
  UPDATE public.profiles
  SET user_type = 'intervenant'
  WHERE id = v_request.user_id;

  -- Mettre à jour la demande vers 'approved'
  UPDATE public.practitioner_requests
  SET status = 'approved'
  WHERE id = p_request_id;

  -- Retourner le succès
  RETURN QUERY SELECT true, 'Inscription finalisée avec succès'::TEXT, v_new_practitioner_id, v_new_contract_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Mise à jour des policies RLS
-- =====================================================

-- Permettre aux utilisateurs de mettre à jour leurs demandes pre_approved
DROP POLICY IF EXISTS "Users can update their own pending practitioner requests" ON public.practitioner_requests;
DROP POLICY IF EXISTS "Users can update their own pending or pre_approved practitioner requests" ON public.practitioner_requests;

CREATE POLICY "Users can update their own pending or pre_approved practitioner requests"
  ON public.practitioner_requests
  FOR UPDATE
  USING (auth.uid() = user_id AND status IN ('pending', 'pre_approved'))
  WITH CHECK (auth.uid() = user_id AND status IN ('pending', 'pre_approved', 'approved'));

-- Commentaires
COMMENT ON FUNCTION pre_approve_practitioner_request IS 'Permet à un admin d''activer le parcours intervenant (passage en pre_approved)';
COMMENT ON FUNCTION complete_practitioner_onboarding IS 'Permet à l''intervenant de finaliser son inscription (choix contrat, création compte)';

-- =====================================================
-- RPC: Activer le contrat après paiement validé
-- =====================================================
CREATE OR REPLACE FUNCTION activate_contract_after_payment(
  p_contract_id UUID,
  p_stripe_payment_intent_id TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
DECLARE
  v_contract RECORD;
BEGIN
  -- Récupérer le contrat
  SELECT * INTO v_contract
  FROM public.practitioner_contracts
  WHERE id = p_contract_id
  AND status = 'pending_payment';

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Contrat non trouvé ou déjà activé'::TEXT;
    RETURN;
  END IF;

  -- Activer le contrat
  UPDATE public.practitioner_contracts
  SET
    status = 'active',
    admin_notes = COALESCE(admin_notes, '') || E'\nPaiement validé: ' || p_stripe_payment_intent_id,
    updated_at = NOW()
  WHERE id = p_contract_id;

  -- Retourner le succès
  RETURN QUERY SELECT true, 'Contrat activé avec succès'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION activate_contract_after_payment IS 'Active un contrat après validation du paiement Stripe';

-- =====================================================
-- IMPORTANT: Migration prête à être appliquée
-- =====================================================
