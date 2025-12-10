-- =====================================================
-- Migration: Transformation de contact_messages en table messages universelle
-- Description: Unifie tous les messages (contact, support, demandes) en une seule table
-- Date: 2025-12-10
-- =====================================================

-- Étape 1: Renommer la table
ALTER TABLE IF EXISTS public.contact_messages RENAME TO messages;

-- Étape 2: Ajouter les nouveaux champs pour le système de messagerie unifié

-- Thread ID pour regrouper les messages d'une conversation
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS thread_id UUID;

-- Parent ID pour les réponses (NULL pour le premier message)
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.messages(id) ON DELETE CASCADE;

-- User ID pour les utilisateurs authentifiés (NULL pour messages publics)
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Catégorie du message
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'contact' CHECK (category IN (
  'contact',              -- Message de contact public
  'practitioner_request', -- Demande d'intervenant
  'support',              -- Support général
  'billing',              -- Facturation
  'technical',            -- Problème technique
  'other'                 -- Autre
));

-- Type d'expéditeur
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS sender_type VARCHAR(20) DEFAULT 'public' CHECK (sender_type IN (
  'public',  -- Message du formulaire de contact
  'user',    -- Message d'un utilisateur authentifié
  'admin',   -- Réponse d'un admin
  'system'   -- Message automatique du système
));

-- Référence optionnelle (ex: practitioner_request_id)
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50);

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS reference_id UUID;

-- Statuts de lecture
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS read_by_user BOOLEAN DEFAULT FALSE;

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS read_by_admin BOOLEAN DEFAULT FALSE;

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Pièces jointes (JSON)
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS attachments JSONB;

-- Étape 3: Initialiser les threads pour les messages existants
-- Chaque message de contact devient son propre thread
UPDATE public.messages
SET thread_id = id
WHERE thread_id IS NULL;

-- Étape 4: Mettre à jour le statut des messages existants
-- Les messages existants sont des messages publics de contact
UPDATE public.messages
SET
  category = 'contact',
  sender_type = 'public',
  read_by_admin = CASE WHEN status IN ('responded', 'closed') THEN TRUE ELSE FALSE END
WHERE category IS NULL;

-- Étape 5: Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_messages_thread ON public.messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_parent ON public.messages(parent_id);
CREATE INDEX IF NOT EXISTS idx_messages_user ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_category ON public.messages(category);
CREATE INDEX IF NOT EXISTS idx_messages_status ON public.messages(status);
CREATE INDEX IF NOT EXISTS idx_messages_sender_type ON public.messages(sender_type);
CREATE INDEX IF NOT EXISTS idx_messages_reference ON public.messages(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_read_user ON public.messages(read_by_user) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_read_admin ON public.messages(read_by_admin) WHERE sender_type IN ('user', 'public');

-- Étape 6: Fonction pour compter les messages non lus
CREATE OR REPLACE FUNCTION count_unread_messages(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.messages
  WHERE user_id = p_user_id
    AND sender_type IN ('admin', 'system')
    AND read_by_user = FALSE;
$$ LANGUAGE sql STABLE;

-- Étape 7: Fonction pour compter les threads avec messages non lus
CREATE OR REPLACE FUNCTION count_unread_threads(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(DISTINCT thread_id)::INTEGER
  FROM public.messages
  WHERE user_id = p_user_id
    AND sender_type IN ('admin', 'system')
    AND read_by_user = FALSE;
$$ LANGUAGE sql STABLE;

-- Étape 8: Vue pour les threads de conversation (optionnel, pour faciliter les requêtes)
CREATE OR REPLACE VIEW message_threads AS
SELECT
  thread_id,
  user_id,
  category,
  subject,
  status,
  MIN(created_at) as first_message_at,
  MAX(created_at) as last_message_at,
  COUNT(*) as message_count,
  SUM(CASE WHEN sender_type IN ('admin', 'system') AND read_by_user = FALSE THEN 1 ELSE 0 END) as unread_count_user,
  SUM(CASE WHEN sender_type IN ('user', 'public') AND read_by_admin = FALSE THEN 1 ELSE 0 END) as unread_count_admin,
  reference_type,
  reference_id
FROM public.messages
WHERE parent_id IS NULL  -- Seulement les messages principaux
GROUP BY thread_id, user_id, category, subject, status, reference_type, reference_id;

-- Étape 9: Fonction trigger pour auto-assigner thread_id
CREATE OR REPLACE FUNCTION auto_assign_thread_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Si pas de thread_id et pas de parent_id, le message est un nouveau thread
  IF NEW.thread_id IS NULL AND NEW.parent_id IS NULL THEN
    NEW.thread_id := NEW.id;
  -- Si pas de thread_id mais un parent_id, hériter du thread du parent
  ELSIF NEW.thread_id IS NULL AND NEW.parent_id IS NOT NULL THEN
    SELECT thread_id INTO NEW.thread_id
    FROM public.messages
    WHERE id = NEW.parent_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_assign_thread_id ON public.messages;
CREATE TRIGGER trigger_auto_assign_thread_id
  BEFORE INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION auto_assign_thread_id();

-- Étape 10: RLS (Row Level Security)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Politique : Les utilisateurs peuvent voir leurs propres messages
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
CREATE POLICY "Users can view their own messages"
  ON public.messages
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR user_id IS NULL  -- Les messages publics sont visibles
  );

-- Politique : Les utilisateurs peuvent créer des messages
DROP POLICY IF EXISTS "Users can create messages" ON public.messages;
CREATE POLICY "Users can create messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR user_id IS NULL  -- Permettre les messages publics (contact form)
  );

-- Politique : Les utilisateurs peuvent mettre à jour leurs messages (pour marquer comme lu)
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;
CREATE POLICY "Users can update their own messages"
  ON public.messages
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Commentaires
COMMENT ON TABLE public.messages IS 'Table unifiée pour tous les messages (contact, support, demandes, etc.)';
COMMENT ON COLUMN public.messages.thread_id IS 'ID du thread de conversation (groupe de messages liés)';
COMMENT ON COLUMN public.messages.parent_id IS 'ID du message parent (NULL pour le premier message d''un thread)';
COMMENT ON COLUMN public.messages.user_id IS 'ID de l''utilisateur (NULL pour les messages publics du formulaire de contact)';
COMMENT ON COLUMN public.messages.category IS 'Catégorie du message (contact, practitioner_request, support, billing, technical, other)';
COMMENT ON COLUMN public.messages.sender_type IS 'Type d''expéditeur (public, user, admin, system)';
COMMENT ON COLUMN public.messages.reference_type IS 'Type de référence optionnelle (ex: practitioner_request)';
COMMENT ON COLUMN public.messages.reference_id IS 'ID de la référence optionnelle';
COMMENT ON COLUMN public.messages.read_by_user IS 'Message lu par l''utilisateur';
COMMENT ON COLUMN public.messages.read_by_admin IS 'Message lu par l''admin';

-- Confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Migration terminée : contact_messages → messages (table unifiée)';
  RAISE NOTICE '📊 Nouveaux champs : thread_id, parent_id, user_id, category, sender_type, reference_type/id, read_by_user/admin';
  RAISE NOTICE '🔍 Vue créée : message_threads';
  RAISE NOTICE '⚡ Fonctions créées : count_unread_messages(), count_unread_threads()';
END $$;
