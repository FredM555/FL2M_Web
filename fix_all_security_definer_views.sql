-- =====================================================
-- Fix ALL SECURITY DEFINER issues for database views
-- Description: Recrée les 3 vues avec SECURITY INVOKER
--              pour respecter les RLS des utilisateurs
-- =====================================================
-- Date: 2025-01-18
-- Vues corrigées:
--   1. email_logs_view
--   2. login_logs_view
--   3. activity_logs_with_user
-- =====================================================

BEGIN;

-- =====================================================
-- 1. FIX: email_logs_view
-- =====================================================

DROP VIEW IF EXISTS public.email_logs_view;

CREATE VIEW public.email_logs_view
WITH (security_invoker = true)
AS
SELECT
    al.id,
    al.user_id,
    p.first_name,
    p.last_name,
    p.email AS user_email,
    al.action_type,
    al.action_description,
    al.metadata ->> 'recipient'::text AS recipient,
    al.metadata ->> 'subject'::text AS subject,
    al.metadata ->> 'email_type'::text AS email_type,
    al.metadata ->> 'resend_id'::text AS resend_id,
    al.metadata ->> 'status'::text AS status,
    al.metadata ->> 'error_message'::text AS error_message,
    al.entity_type,
    al.entity_id AS appointment_id,
    al.created_at
FROM activity_logs al
LEFT JOIN profiles p ON al.user_id = p.id
WHERE al.action_type::text = ANY (ARRAY['email_sent'::character varying, 'email_failed'::character varying]::text[])
ORDER BY al.created_at DESC;

COMMENT ON VIEW public.email_logs_view IS
'Vue filtrée des logs d''emails depuis activity_logs. Utilise SECURITY INVOKER pour respecter les RLS.';

-- =====================================================
-- 2. FIX: login_logs_view
-- =====================================================

DROP VIEW IF EXISTS public.login_logs_view;

CREATE VIEW public.login_logs_view
WITH (security_invoker = true)
AS
SELECT
    al.id,
    al.user_id,
    p.first_name,
    p.last_name,
    p.email,
    p.user_type,
    al.ip_address,
    al.user_agent,
    al.metadata ->> 'country'::text AS country,
    al.metadata ->> 'city'::text AS city,
    al.metadata ->> 'region'::text AS region,
    (al.metadata ->> 'latitude'::text)::numeric AS latitude,
    (al.metadata ->> 'longitude'::text)::numeric AS longitude,
    al.created_at AS login_time
FROM activity_logs al
LEFT JOIN profiles p ON al.user_id = p.id
WHERE al.action_type::text = ANY (ARRAY['login'::character varying, 'logout'::character varying, 'login_failed'::character varying]::text[])
ORDER BY al.created_at DESC;

COMMENT ON VIEW public.login_logs_view IS
'Vue filtrée des logs de connexion depuis activity_logs. Utilise SECURITY INVOKER pour respecter les RLS.';

-- =====================================================
-- 3. FIX: activity_logs_with_user
-- =====================================================

DROP VIEW IF EXISTS public.activity_logs_with_user;

CREATE VIEW public.activity_logs_with_user
WITH (security_invoker = true)
AS
SELECT
    al.id,
    al.user_id,
    al.action_type,
    al.action_description,
    al.entity_type,
    al.entity_id,
    al.ip_address,
    al.user_agent,
    al.metadata,
    al.created_at,
    p.first_name,
    p.last_name,
    p.email,
    p.user_type,
    p.pseudo
FROM activity_logs al
LEFT JOIN profiles p ON al.user_id = p.id
ORDER BY al.created_at DESC;

COMMENT ON VIEW public.activity_logs_with_user IS
'Vue complète des activity_logs avec informations utilisateur. Utilise SECURITY INVOKER pour respecter les RLS.';

COMMIT;

-- =====================================================
-- Vérification
-- =====================================================
-- Pour vérifier que les vues utilisent bien SECURITY INVOKER:
-- SELECT schemaname, viewname, viewowner
-- FROM pg_views
-- WHERE viewname IN ('email_logs_view', 'login_logs_view', 'activity_logs_with_user');
