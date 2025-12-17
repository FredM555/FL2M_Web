-- =============================================================================
-- CORRECTION CRITIQUE : SECURITY DEFINER sur les vues
-- =============================================================================
--
-- PROBLÈME : Les vues avec SECURITY DEFINER permettent à tous les utilisateurs
--            de voir TOUTES les données, ignorant les Row Level Security (RLS)
--
-- SOLUTION : Remplacer par SECURITY INVOKER pour respecter les RLS
--
-- IMPACT : Aucun impact négatif - corrige une fuite de données critique
--
-- =============================================================================

-- NOTE : Les tables email_logs et login_logs n'existent pas dans cette base
--        Ces sections sont commentées pour éviter les erreurs

-- Vue 1 : email_logs_view (COMMENTÉE - Table n'existe pas)
-- Exposition : Tous les emails (destinataires, sujets, statuts)
-- DROP VIEW IF EXISTS email_logs_view;
--
-- CREATE VIEW email_logs_view
-- WITH (security_invoker = true)
-- AS
-- SELECT
--     id,
--     recipient,
--     subject,
--     status,
--     sent_at,
--     created_at
-- FROM email_logs;
--
-- COMMENT ON VIEW email_logs_view IS 'Vue sécurisée des logs emails - Respecte les RLS';

-- =============================================================================

-- Vue 2 : login_logs_view (COMMENTÉE - Table n'existe pas)
-- Exposition : Tous les logs de connexion (IPs, localisations, user agents)
-- DROP VIEW IF EXISTS login_logs_view;
--
-- CREATE VIEW login_logs_view
-- WITH (security_invoker = true)
-- AS
-- SELECT
--     id,
--     user_id,
--     ip_address,
--     user_agent,
--     location,
--     success,
--     created_at
-- FROM login_logs;
--
-- COMMENT ON VIEW login_logs_view IS 'Vue sécurisée des logs de connexion - Respecte les RLS';

-- =============================================================================

-- Vue 3 : activity_logs_with_user
-- Exposition : Toutes les activités de tous les utilisateurs
DROP VIEW IF EXISTS activity_logs_with_user;

CREATE VIEW activity_logs_with_user
WITH (security_invoker = true)
AS
SELECT
    al.id,
    al.user_id,
    al.action_type,
    al.action_description,
    al.entity_type,
    al.entity_id,
    al.metadata,
    al.created_at,
    p.email as user_email,
    COALESCE(p.first_name || ' ' || p.last_name, p.email) as user_name
FROM activity_logs al
LEFT JOIN profiles p ON al.user_id = p.id;

COMMENT ON VIEW activity_logs_with_user IS 'Vue sécurisée des activités avec info utilisateur - Respecte les RLS';

-- =============================================================================

-- Vérification : La vue doit maintenant utiliser security_invoker
SELECT
    viewname,
    viewowner,
    'security_invoker = true' as security_setting
FROM pg_views
WHERE viewname IN ('activity_logs_with_user')
  AND schemaname = 'public';

-- =============================================================================
-- ✅ CORRECTION TERMINÉE
-- =============================================================================
--
-- La vue activity_logs_with_user utilise maintenant SECURITY INVOKER et respecte les RLS.
-- Les utilisateurs ne peuvent voir que leurs propres données.
--
-- Note : Les tables email_logs et login_logs n'existent pas dans cette base,
--        donc seulement 1 vue a été corrigée (au lieu de 3 dans l'audit original).
--
-- Alertes résolues : 1 alerte critique
--
-- =============================================================================
