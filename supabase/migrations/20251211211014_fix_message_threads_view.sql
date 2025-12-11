-- =====================================================
-- Migration: Correction de la vue message_threads
-- Description: Prend en compte TOUS les messages du thread (incluant les réponses)
-- Date: 2025-12-11
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

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Vue message_threads corrigée';
  RAISE NOTICE '📊 La vue compte maintenant TOUS les messages du thread';
  RAISE NOTICE '💬 Les utilisateurs verront les threads avec de nouvelles réponses admin';
END $$;
