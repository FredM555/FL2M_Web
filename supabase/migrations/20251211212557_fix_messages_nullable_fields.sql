-- =====================================================
-- Migration: Rendre les champs first_name, last_name, email, phone NULLABLE
-- Description: Ces champs sont requis seulement pour les messages publics (sans user_id)
-- Date: 2025-12-11
-- =====================================================

-- Rendre les colonnes NULLABLE
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

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Colonnes first_name, last_name, email, phone, subject rendues NULLABLE';
  RAISE NOTICE '👤 Les utilisateurs authentifiés peuvent maintenant répondre sans ces champs';
  RAISE NOTICE '💬 Les réponses dans un thread n''ont pas besoin de sujet';
  RAISE NOTICE '📝 Ces champs restent nécessaires pour les messages publics du formulaire de contact';
END $$;
