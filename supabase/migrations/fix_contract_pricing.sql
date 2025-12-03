-- =====================================================
-- Migration: Correction des tarifs de contrat
-- Description: Met à jour la fonction pour remplir correctement les tarifs et corrige les contrats existants
-- Date: 2025-12-02
-- =====================================================

-- 1. Recréer la fonction complete_practitioner_onboarding avec les tarifs
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

  -- Créer le contrat avec tous les tarifs remplis
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
    v_new_practitioner_id,
    p_contract_type,
    p_start_date,
    CASE
      WHEN p_contract_type = 'free' THEN 'active'
      ELSE 'pending_payment'
    END,
    -- monthly_fee
    CASE p_contract_type
      WHEN 'free' THEN 0
      WHEN 'starter' THEN 60
      WHEN 'pro' THEN 100
      WHEN 'premium' THEN 160
    END,
    -- commission_fixed
    CASE p_contract_type
      WHEN 'free' THEN 10
      WHEN 'starter' THEN 6
      WHEN 'pro' THEN 3
      WHEN 'premium' THEN 0
    END,
    -- commission_percentage
    CASE p_contract_type
      WHEN 'free' THEN 12
      WHEN 'starter' THEN 8
      WHEN 'pro' THEN NULL
      WHEN 'premium' THEN NULL
    END,
    -- commission_cap
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

-- 2. Mettre à jour les contrats existants qui ont des valeurs NULL/0
UPDATE public.practitioner_contracts
SET
  monthly_fee = CASE contract_type
    WHEN 'free' THEN 0
    WHEN 'starter' THEN 60
    WHEN 'pro' THEN 100
    WHEN 'premium' THEN 160
  END,
  commission_fixed = CASE contract_type
    WHEN 'free' THEN 10
    WHEN 'starter' THEN 6
    WHEN 'pro' THEN 3
    WHEN 'premium' THEN 0
  END,
  commission_percentage = CASE contract_type
    WHEN 'free' THEN 12
    WHEN 'starter' THEN 8
    WHEN 'pro' THEN NULL
    WHEN 'premium' THEN NULL
  END,
  commission_cap = CASE contract_type
    WHEN 'free' THEN 25
    WHEN 'starter' THEN NULL
    WHEN 'pro' THEN NULL
    WHEN 'premium' THEN NULL
  END,
  updated_at = NOW()
WHERE monthly_fee IS NULL OR monthly_fee = 0 OR commission_fixed IS NULL;

-- Commentaire
COMMENT ON FUNCTION complete_practitioner_onboarding IS 'Finalise l''inscription intervenant avec tarification complète basée sur le type de contrat';
