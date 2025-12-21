-- Migration pour ajouter la catégorie 'appointment' aux messages
-- Date: 2025-12-21
-- Description: Permet d'utiliser la table messages pour les conversations liées aux rendez-vous

-- ============================================================================
-- 1. Ajouter 'appointment' aux catégories de messages
-- ============================================================================

ALTER TABLE messages
DROP CONSTRAINT IF EXISTS messages_category_check;

ALTER TABLE messages
ADD CONSTRAINT messages_category_check
CHECK (category IN (
  'contact',
  'practitioner_request',
  'support',
  'billing',
  'technical',
  'appointment',
  'other'
));

-- ============================================================================
-- 2. Créer un index pour optimiser les requêtes de messages de RDV
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_messages_appointment_ref
ON messages(reference_type, reference_id)
WHERE reference_type = 'appointment';

-- Index pour les messages non lus par RDV
CREATE INDEX IF NOT EXISTS idx_messages_appointment_unread
ON messages(reference_id, read_by_user)
WHERE reference_type = 'appointment' AND read_by_user = false;

-- ============================================================================
-- 3. Fonction pour compter les messages non lus d'un rendez-vous
-- ============================================================================

CREATE OR REPLACE FUNCTION count_unread_appointment_messages(
  p_appointment_id TEXT,
  p_user_id UUID,
  p_user_type TEXT  -- 'client' ou 'practitioner'
)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
  v_read_field TEXT;
  v_sender_types TEXT[];
BEGIN
  -- Déterminer le champ de lecture et les types d'expéditeurs à filtrer
  IF p_user_type = 'client' THEN
    v_read_field := 'read_by_user';
    v_sender_types := ARRAY['admin', 'system'];
  ELSE
    v_read_field := 'read_by_admin';
    v_sender_types := ARRAY['user'];
  END IF;

  -- Compter les messages non lus
  EXECUTE format(
    'SELECT COUNT(*)::INTEGER FROM messages
     WHERE reference_type = ''appointment''
       AND reference_id = $1
       AND sender_type = ANY($2)
       AND %I = false',
    v_read_field
  )
  INTO v_count
  USING p_appointment_id, v_sender_types;

  RETURN COALESCE(v_count, 0);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 4. Fonction pour récupérer tous les RDV avec messages non lus
-- ============================================================================

CREATE OR REPLACE FUNCTION get_appointments_with_unread_messages(
  p_user_id UUID,
  p_user_type TEXT  -- 'client' ou 'practitioner'
)
RETURNS TABLE(
  appointment_id TEXT,
  unread_count BIGINT,
  last_message_at TIMESTAMPTZ
) AS $$
DECLARE
  v_read_field TEXT;
  v_sender_types TEXT[];
BEGIN
  -- Déterminer le champ de lecture et les types d'expéditeurs
  IF p_user_type = 'client' THEN
    v_read_field := 'read_by_user';
    v_sender_types := ARRAY['admin', 'system'];
  ELSE
    v_read_field := 'read_by_admin';
    v_sender_types := ARRAY['user'];
  END IF;

  -- Pour le client, filtrer par user_id
  -- Pour l'intervenant, ne pas filtrer par user_id (fait via RLS)
  IF p_user_type = 'client' THEN
    RETURN QUERY
    EXECUTE format(
      'SELECT
         reference_id as appointment_id,
         COUNT(*)::BIGINT as unread_count,
         MAX(created_at) as last_message_at
       FROM messages
       WHERE reference_type = ''appointment''
         AND user_id = $1
         AND sender_type = ANY($2)
         AND %I = false
       GROUP BY reference_id
       ORDER BY MAX(created_at) DESC',
      v_read_field
    )
    USING p_user_id, v_sender_types;
  ELSE
    RETURN QUERY
    EXECUTE format(
      'SELECT
         reference_id as appointment_id,
         COUNT(*)::BIGINT as unread_count,
         MAX(created_at) as last_message_at
       FROM messages
       WHERE reference_type = ''appointment''
         AND sender_type = ANY($1)
         AND %I = false
       GROUP BY reference_id
       ORDER BY MAX(created_at) DESC',
      v_read_field
    )
    USING v_sender_types;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 5. Politique RLS pour les messages de rendez-vous
-- ============================================================================

-- Les utilisateurs peuvent voir les messages de leurs rendez-vous
DROP POLICY IF EXISTS "Users can view appointment messages" ON messages;
CREATE POLICY "Users can view appointment messages"
ON messages FOR SELECT
USING (
  reference_type = 'appointment'
  AND (
    -- Le client du RDV (voir TOUS les messages de SES rendez-vous)
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = messages.reference_id
        AND a.client_id = auth.uid()
    )
    OR
    -- L'intervenant du RDV (voir TOUS les messages des rendez-vous où il intervient)
    EXISTS (
      SELECT 1 FROM appointments a
      JOIN practitioners p ON a.practitioner_id = p.id
      WHERE a.id = messages.reference_id
        AND p.user_id = auth.uid()
    )
    OR
    -- Les admins
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  )
);

-- Les utilisateurs peuvent créer des messages pour leurs rendez-vous
DROP POLICY IF EXISTS "Users can create appointment messages" ON messages;
CREATE POLICY "Users can create appointment messages"
ON messages FOR INSERT
WITH CHECK (
  reference_type = 'appointment'
  AND (
    -- Le client du RDV
    (user_id = auth.uid() AND sender_type = 'user')
    OR
    -- L'intervenant du RDV (envoie en tant qu'admin)
    (
      sender_type = 'admin'
      AND EXISTS (
        SELECT 1 FROM appointments a
        JOIN practitioners p ON a.practitioner_id = p.id
        WHERE a.id = reference_id
          AND p.user_id = auth.uid()
      )
    )
    OR
    -- Les admins
    (
      sender_type IN ('admin', 'system')
      AND EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND user_type = 'admin'
      )
    )
  )
);

-- Les utilisateurs peuvent marquer leurs messages comme lus
DROP POLICY IF EXISTS "Users can mark appointment messages as read" ON messages;
CREATE POLICY "Users can mark appointment messages as read"
ON messages FOR UPDATE
USING (
  reference_type = 'appointment'
  AND (
    -- Le client peut marquer read_by_user
    user_id = auth.uid()
    OR
    -- L'intervenant peut marquer read_by_admin
    EXISTS (
      SELECT 1 FROM appointments a
      JOIN practitioners p ON a.practitioner_id = p.id
      WHERE a.id = messages.reference_id
        AND p.user_id = auth.uid()
    )
    OR
    -- Les admins
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  )
);

-- ============================================================================
-- 6. Commentaires
-- ============================================================================

COMMENT ON CONSTRAINT messages_category_check ON messages IS
'Catégories de messages incluant appointment pour les conversations liées aux rendez-vous';

COMMENT ON FUNCTION count_unread_appointment_messages IS
'Compte les messages non lus pour un rendez-vous donné selon le type d''utilisateur';

COMMENT ON FUNCTION get_appointments_with_unread_messages IS
'Retourne la liste des rendez-vous avec des messages non lus pour un utilisateur';

-- Fin du script
