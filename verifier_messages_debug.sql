-- Script de vérification des messages
-- Exécutez ce script dans Supabase SQL Editor pour voir tous les messages

-- 1. Afficher tous les messages récents (dernières 24h)
SELECT
  id,
  thread_id,
  parent_id,
  user_id,
  sender_type,
  subject,
  LEFT(message, 50) as message_preview,
  created_at,
  read_by_user,
  read_by_admin
FROM public.messages
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- 2. Afficher les threads avec le nombre de messages
SELECT
  thread_id,
  COUNT(*) as total_messages,
  COUNT(*) FILTER (WHERE parent_id IS NULL) as messages_principaux,
  COUNT(*) FILTER (WHERE parent_id IS NOT NULL) as reponses,
  COUNT(*) FILTER (WHERE sender_type = 'admin') as messages_admin,
  COUNT(*) FILTER (WHERE sender_type IN ('admin', 'system') AND read_by_user = FALSE) as non_lus_par_utilisateur
FROM public.messages
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY thread_id;

-- 3. Afficher la vue message_threads (ce que voit l'application)
SELECT * FROM message_threads
WHERE first_message_at > NOW() - INTERVAL '24 hours'
ORDER BY last_message_at DESC;
