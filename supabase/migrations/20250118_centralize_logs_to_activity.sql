-- =====================================================
-- Migration: Centralisation des logs dans activity_logs
-- Description: Migrer login_logs vers activity_logs,
--              adapter le schéma et supprimer login_logs
-- =====================================================

-- 1. Rendre user_id nullable dans activity_logs
--    (pour supporter les emails de contact sans user authentifié)
ALTER TABLE public.activity_logs
  ALTER COLUMN user_id DROP NOT NULL;

-- 2. Ajouter un commentaire sur la table
COMMENT ON TABLE public.activity_logs IS
'Table centralisée pour tous les logs : connexions, emails, notifications, erreurs, actions utilisateur';

-- 3. Migrer les données de login_logs vers activity_logs
INSERT INTO public.activity_logs (
  user_id,
  action_type,
  action_description,
  ip_address,
  user_agent,
  metadata,
  created_at
)
SELECT
  user_id,
  'login' as action_type,
  'Connexion utilisateur' as action_description,
  CASE
    WHEN ip_address IS NOT NULL AND ip_address != '' THEN ip_address::inet
    ELSE NULL
  END as ip_address,
  user_agent,
  jsonb_build_object(
    'country', country,
    'city', city,
    'region', region,
    'latitude', latitude,
    'longitude', longitude
  ) as metadata,
  login_time as created_at
FROM public.login_logs
WHERE user_id IS NOT NULL;

-- 4. Supprimer la table login_logs
DROP TABLE IF EXISTS public.login_logs;

-- 5. Supprimer les anciennes fonctions si elles existent
DROP FUNCTION IF EXISTS public.log_email_sent CASCADE;
DROP FUNCTION IF EXISTS public.log_email_failed CASCADE;
DROP FUNCTION IF EXISTS public.log_user_login CASCADE;
DROP FUNCTION IF EXISTS public.log_error CASCADE;

-- 6. Créer des fonctions helper pour logger facilement

-- Fonction pour logger un email envoyé
CREATE OR REPLACE FUNCTION public.log_email_sent(
  p_user_id uuid,
  p_recipient text,
  p_subject text,
  p_email_type text,
  p_resend_id text DEFAULT NULL,
  p_appointment_id uuid DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.activity_logs (
    user_id,
    action_type,
    action_description,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    p_user_id,
    'email_sent',
    format('Email envoyé : %s', p_subject),
    CASE WHEN p_appointment_id IS NOT NULL THEN 'appointment' ELSE NULL END,
    p_appointment_id,
    jsonb_build_object(
      'recipient', p_recipient,
      'subject', p_subject,
      'email_type', p_email_type,
      'resend_id', p_resend_id,
      'status', 'sent'
    )
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour logger un échec d'email
CREATE OR REPLACE FUNCTION public.log_email_failed(
  p_user_id uuid,
  p_recipient text,
  p_subject text,
  p_email_type text,
  p_error_message text,
  p_appointment_id uuid DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.activity_logs (
    user_id,
    action_type,
    action_description,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    p_user_id,
    'email_failed',
    format('Échec envoi email : %s', p_subject),
    CASE WHEN p_appointment_id IS NOT NULL THEN 'appointment' ELSE NULL END,
    p_appointment_id,
    jsonb_build_object(
      'recipient', p_recipient,
      'subject', p_subject,
      'email_type', p_email_type,
      'error_message', p_error_message,
      'status', 'failed'
    )
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour logger une connexion
CREATE OR REPLACE FUNCTION public.log_user_login(
  p_user_id uuid,
  p_ip_address text DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_region text DEFAULT NULL,
  p_latitude numeric DEFAULT NULL,
  p_longitude numeric DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.activity_logs (
    user_id,
    action_type,
    action_description,
    ip_address,
    user_agent,
    metadata
  ) VALUES (
    p_user_id,
    'login',
    'Connexion utilisateur',
    p_ip_address::inet,
    p_user_agent,
    jsonb_build_object(
      'country', p_country,
      'city', p_city,
      'region', p_region,
      'latitude', p_latitude,
      'longitude', p_longitude
    )
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour logger une erreur
CREATE OR REPLACE FUNCTION public.log_error(
  p_user_id uuid,
  p_error_type text,
  p_error_message text,
  p_stack_trace text DEFAULT NULL,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.activity_logs (
    user_id,
    action_type,
    action_description,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    p_user_id,
    'error',
    format('Erreur : %s', p_error_type),
    p_entity_type,
    p_entity_id,
    jsonb_build_object(
      'error_type', p_error_type,
      'error_message', p_error_message,
      'stack_trace', p_stack_trace
    )
  ) RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Supprimer les anciennes vues si elles existent
DROP VIEW IF EXISTS public.email_logs_view CASCADE;
DROP VIEW IF EXISTS public.login_logs_view CASCADE;

-- 8. Créer une vue pour faciliter la consultation des logs d'emails
CREATE OR REPLACE VIEW public.email_logs_view AS
SELECT
  al.id,
  al.user_id,
  p.first_name,
  p.last_name,
  p.email as user_email,
  al.action_type,
  al.action_description,
  al.metadata->>'recipient' as recipient,
  al.metadata->>'subject' as subject,
  al.metadata->>'email_type' as email_type,
  al.metadata->>'resend_id' as resend_id,
  al.metadata->>'status' as status,
  al.metadata->>'error_message' as error_message,
  al.entity_type,
  al.entity_id as appointment_id,
  al.created_at
FROM public.activity_logs al
LEFT JOIN public.profiles p ON al.user_id = p.id
WHERE al.action_type IN ('email_sent', 'email_failed')
ORDER BY al.created_at DESC;

-- 9. Créer une vue pour les logs de connexion
CREATE OR REPLACE VIEW public.login_logs_view AS
SELECT
  al.id,
  al.user_id,
  p.first_name,
  p.last_name,
  p.email,
  p.user_type,
  al.ip_address,
  al.user_agent,
  al.metadata->>'country' as country,
  al.metadata->>'city' as city,
  al.metadata->>'region' as region,
  (al.metadata->>'latitude')::numeric as latitude,
  (al.metadata->>'longitude')::numeric as longitude,
  al.created_at as login_time
FROM public.activity_logs al
LEFT JOIN public.profiles p ON al.user_id = p.id
WHERE al.action_type IN ('login', 'logout', 'login_failed')
ORDER BY al.created_at DESC;

-- 10. Permissions sur les nouvelles fonctions
GRANT EXECUTE ON FUNCTION public.log_email_sent(uuid, text, text, text, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_email_failed(uuid, text, text, text, text, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_user_login(uuid, text, text, text, text, text, numeric, numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_error(uuid, text, text, text, text, uuid) TO authenticated, service_role;

-- 11. Permissions sur les vues
GRANT SELECT ON public.email_logs_view TO authenticated;
GRANT SELECT ON public.login_logs_view TO authenticated;

-- 12. Ajouter des commentaires sur les nouvelles fonctions
COMMENT ON FUNCTION public.log_email_sent(uuid, text, text, text, text, uuid) IS 'Logger un email envoyé avec succès';
COMMENT ON FUNCTION public.log_email_failed(uuid, text, text, text, text, uuid) IS 'Logger un échec d''envoi d''email';
COMMENT ON FUNCTION public.log_user_login(uuid, text, text, text, text, text, numeric, numeric) IS 'Logger une connexion utilisateur';
COMMENT ON FUNCTION public.log_error(uuid, text, text, text, text, uuid) IS 'Logger une erreur applicative';
COMMENT ON VIEW public.email_logs_view IS 'Vue pour consulter l''historique des emails';
COMMENT ON VIEW public.login_logs_view IS 'Vue pour consulter l''historique des connexions';
