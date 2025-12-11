-- =====================================================
-- MIGRATIONS À APPLIQUER VIA SUPABASE DASHBOARD
-- Date: 2025-12-11
-- =====================================================
--
-- INSTRUCTIONS :
-- 1. Ouvrez : https://supabase.com/dashboard/project/phokxjbocljahmbdkrbs/sql/new
-- 2. Copiez et collez TOUT le contenu de ce fichier
-- 3. Cliquez sur "Run" (ou "Exécuter")
-- 4. Vérifiez que tout s'est bien passé (vous devriez voir des messages de succès)
--
-- =====================================================

-- =====================================================
-- MIGRATION 1 : Correction de la foreign key messages → profiles
-- =====================================================

-- Étape 1: Supprimer l'ancienne foreign key vers auth.users
ALTER TABLE public.messages
DROP CONSTRAINT IF EXISTS messages_user_id_fkey;

-- Étape 2: Créer une nouvelle foreign key vers profiles
ALTER TABLE public.messages
ADD CONSTRAINT messages_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- Commentaire
COMMENT ON CONSTRAINT messages_user_id_fkey ON public.messages IS
'Foreign key vers profiles pour permettre les jointures avec les informations du profil utilisateur';

-- =====================================================
-- MIGRATION 2 : Correction de la boucle infinie d'onboarding intervenant
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
      0,
      true,
      v_request.user_id,
      v_request.user_id
    )
    RETURNING id INTO v_new_practitioner_id;
  ELSE
    -- Récupérer l'ID du praticien existant
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

  -- ⭐ CORRECTION : Mettre à jour le statut de la demande à 'approved' ⭐
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

-- =====================================================
-- MIGRATION 3 : Correction de la vue message_threads
-- =====================================================

-- Recréer la vue pour compter TOUS les messages du thread, pas seulement les messages principaux
CREATE OR REPLACE VIEW message_threads AS
WITH main_messages AS (
  -- Récupérer les informations du message principal de chaque thread
  SELECT
    thread_id,
    user_id,
    category,
    subject,
    status,
    reference_type,
    reference_id,
    created_at as first_message_at
  FROM public.messages
  WHERE parent_id IS NULL
),
thread_stats AS (
  -- Calculer les statistiques pour TOUS les messages du thread
  SELECT
    thread_id,
    MAX(created_at) as last_message_at,
    COUNT(*) as message_count,
    SUM(CASE WHEN sender_type IN ('admin', 'system') AND read_by_user = FALSE THEN 1 ELSE 0 END) as unread_count_user,
    SUM(CASE WHEN sender_type IN ('user', 'public') AND read_by_admin = FALSE THEN 1 ELSE 0 END) as unread_count_admin
  FROM public.messages
  GROUP BY thread_id
)
SELECT
  m.thread_id,
  m.user_id,
  m.category,
  m.subject,
  m.status,
  m.first_message_at,
  s.last_message_at,
  s.message_count,
  s.unread_count_user,
  s.unread_count_admin,
  m.reference_type,
  m.reference_id
FROM main_messages m
JOIN thread_stats s ON m.thread_id = s.thread_id;

-- Commentaires
COMMENT ON VIEW message_threads IS 'Vue des threads de messages incluant TOUS les messages (réponses comprises) pour le comptage et les statistiques';

-- =====================================================
-- MIGRATION 4 : Rendre les champs first_name, last_name, email NULLABLE
-- =====================================================

-- Rendre les colonnes NULLABLE (requis seulement pour messages publics)
ALTER TABLE public.messages
ALTER COLUMN first_name DROP NOT NULL;

ALTER TABLE public.messages
ALTER COLUMN last_name DROP NOT NULL;

ALTER TABLE public.messages
ALTER COLUMN email DROP NOT NULL;

ALTER TABLE public.messages
ALTER COLUMN phone DROP NOT NULL;

ALTER TABLE public.messages
ALTER COLUMN subject DROP NOT NULL;

-- Commentaires
COMMENT ON COLUMN public.messages.first_name IS 'Prénom de l''expéditeur (requis seulement pour messages publics sans user_id)';
COMMENT ON COLUMN public.messages.last_name IS 'Nom de l''expéditeur (requis seulement pour messages publics sans user_id)';
COMMENT ON COLUMN public.messages.email IS 'Email de l''expéditeur (requis seulement pour messages publics sans user_id)';
COMMENT ON COLUMN public.messages.phone IS 'Téléphone de l''expéditeur (optionnel)';
COMMENT ON COLUMN public.messages.subject IS 'Sujet du message (requis seulement pour le premier message d''un thread)';

-- =====================================================
-- CONFIRMATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 1 : Foreign key messages → profiles créée';
  RAISE NOTICE '✅ Migration 2 : Fonction complete_practitioner_onboarding corrigée';
  RAISE NOTICE '✅ Migration 3 : Vue message_threads corrigée pour inclure les réponses';
  RAISE NOTICE '✅ Migration 4 : Champs first_name, last_name, email, subject rendus NULLABLE';
  RAISE NOTICE '🎉 Toutes les migrations ont été appliquées avec succès !';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Résumé des corrections :';
  RAISE NOTICE '  1. Les utilisateurs verront maintenant les réponses de l''admin';
  RAISE NOTICE '  2. La boucle infinie d''onboarding est corrigée';
  RAISE NOTICE '  3. Le système de messaging fonctionne correctement';
  RAISE NOTICE '  4. Les threads affichent le bon nombre de messages et réponses';
  RAISE NOTICE '  5. Les utilisateurs et admins peuvent répondre sans erreur';
END $$;
