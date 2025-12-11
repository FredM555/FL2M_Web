-- =====================================================
-- Migration: Correction de la foreign key messages -> profiles
-- Description: Remplace la référence de messages.user_id vers profiles au lieu de auth.users
-- Date: 2025-12-11
-- =====================================================

-- Étape 1: Supprimer l'ancienne foreign key vers auth.users
ALTER TABLE public.messages
DROP CONSTRAINT IF EXISTS messages_user_id_fkey;

-- Étape 2: Créer une nouvelle foreign key vers profiles
-- Note: profiles.id doit déjà référencer auth.users.id
ALTER TABLE public.messages
ADD CONSTRAINT messages_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- Commentaire
COMMENT ON CONSTRAINT messages_user_id_fkey ON public.messages IS
'Foreign key vers profiles pour permettre les jointures avec les informations du profil utilisateur';

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Foreign key messages.user_id -> profiles.id créée avec succès';
  RAISE NOTICE '🔗 La jointure avec profiles fonctionnera maintenant correctement dans les requêtes';
END $$;
