-- =====================================================
-- Migration: Ajouter les infos utilisateur à la vue message_threads
-- Description: Inclure pseudo, prénom et nom de l'utilisateur dans la vue
-- Date: 2025-12-20
-- =====================================================

-- Recréer la vue avec les informations utilisateur
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
  m.reference_id,
  -- Ajouter les informations de l'utilisateur
  p.pseudo as user_pseudo,
  p.first_name as user_first_name,
  p.last_name as user_last_name
FROM main_messages m
JOIN thread_stats s ON m.thread_id = s.thread_id
LEFT JOIN profiles p ON m.user_id = p.id;

-- Commentaires
COMMENT ON VIEW message_threads IS 'Vue des threads de messages incluant TOUS les messages et les informations utilisateur (pseudo, nom)';

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Vue message_threads mise à jour avec les infos utilisateur';
  RAISE NOTICE '👤 Ajout: user_pseudo, user_first_name, user_last_name';
END $$;
