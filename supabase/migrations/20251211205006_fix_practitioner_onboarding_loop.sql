-- =====================================================
-- Migration: Correction de la boucle infinie d'onboarding intervenant
-- Description: Met à jour le statut de la demande à 'approved' après completion
-- Date: 2025-12-11
-- =====================================================

-- Recréer la fonction pour inclure la mise à jour du statut
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
  IF p_contract_type NOT IN ('free', 'decouverte', 'starter', 'pro', 'premium') THEN
    RETURN QUERY SELECT false, 'Type de contrat invalide'::TEXT, NULL::UUID, NULL::UUID;
    RETURN;
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
      0,
      true,
      v_request.user_id,
      v_request.user_id
    )
    RETURNING id INTO v_new_practitioner_id;
  ELSE
    -- Récupérer l'ID du intervenant existant
    SELECT id INTO v_new_practitioner_id
    FROM public.practitioners
    WHERE user_id = v_request.user_id;
  END IF;

  -- Créer le contrat
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
      WHEN p_contract_type = 'decouverte' THEN 'active'
      ELSE 'pending'
    END,
    CASE
      WHEN p_contract_type = 'decouverte' THEN 0.00
      WHEN p_contract_type = 'starter' THEN 29.00
      WHEN p_contract_type = 'pro' THEN 59.00
      WHEN p_contract_type = 'premium' THEN 99.00
      ELSE 0.00
    END,
    CASE
      WHEN p_contract_type = 'decouverte' THEN 5.00
      WHEN p_contract_type = 'starter' THEN 3.00
      WHEN p_contract_type = 'pro' THEN 0.00
      WHEN p_contract_type = 'premium' THEN 0.00
      ELSE 5.00
    END,
    CASE
      WHEN p_contract_type = 'decouverte' THEN 0.00
      WHEN p_contract_type = 'starter' THEN 10.00
      WHEN p_contract_type = 'pro' THEN 5.00
      WHEN p_contract_type = 'premium' THEN 3.00
      ELSE 15.00
    END,
    NULL,
    CASE
      WHEN p_contract_type = 'decouverte' THEN 5
      WHEN p_contract_type = 'starter' THEN 20
      WHEN p_contract_type = 'pro' THEN 100
      WHEN p_contract_type = 'premium' THEN NULL
      ELSE 10
    END,
    p_contract_document_url,
    v_request.user_id,
    v_request.user_id
  )
  RETURNING id INTO v_new_contract_id;

  -- Mettre à jour le profil utilisateur pour le marquer comme intervenant
  UPDATE public.profiles
  SET
    user_type = 'intervenant',
    updated_at = NOW()
  WHERE id = v_request.user_id;

  -- CORRECTION : Mettre à jour le statut de la demande à 'approved'
  -- C'est cette ligne qui manquait et causait la boucle infinie !
  UPDATE public.practitioner_requests
  SET
    status = 'approved',
    approved_at = NOW(),
    updated_at = NOW()
  WHERE id = p_request_id;

  -- Retourner le résultat
  RETURN QUERY SELECT
    true,
    'Onboarding complété avec succès'::TEXT,
    v_new_practitioner_id,
    v_new_contract_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaires
COMMENT ON FUNCTION complete_practitioner_onboarding IS 'Finalise l''inscription d''un intervenant pré-approuvé en créant son profil practitioner et son contrat. Corrige la boucle infinie en mettant à jour le statut de la demande.';

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Fonction complete_practitioner_onboarding corrigée';
  RAISE NOTICE '🔧 La demande sera maintenant mise à jour en statut "approved" après completion';
  RAISE NOTICE '🔄 Cela évite la boucle infinie de redirection vers l''onboarding';
END $$;
