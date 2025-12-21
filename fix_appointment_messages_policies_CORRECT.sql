-- Script de correction FINAL pour les politiques RLS des messages de rendez-vous
-- À exécuter dans le SQL Editor de Supabase
--
-- IMPORTANT : reference_id est de type UUID, pas TEXT
-- Donc pas besoin de cast : a.id = messages.reference_id

-- ============================================================================
-- 1. SUPPRIMER toutes les anciennes politiques
-- ============================================================================

DROP POLICY IF EXISTS "Users can view appointment messages" ON messages;
DROP POLICY IF EXISTS "Users can create appointment messages" ON messages;
DROP POLICY IF EXISTS "Users can mark appointment messages as read" ON messages;

-- ============================================================================
-- 2. RECRÉER les politiques SANS cast (les deux champs sont UUID)
-- ============================================================================

-- POLITIQUE SELECT : Les utilisateurs peuvent voir les messages de leurs rendez-vous
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

-- POLITIQUE INSERT : Les utilisateurs peuvent créer des messages pour leurs rendez-vous
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

-- POLITIQUE UPDATE : Les utilisateurs peuvent marquer leurs messages comme lus
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
-- 3. VÉRIFICATION
-- ============================================================================

-- Vérifier que les politiques ont bien été créées
SELECT
  policyname,
  cmd as operation,
  permissive
FROM pg_policies
WHERE tablename = 'messages'
  AND policyname LIKE '%appointment%'
ORDER BY policyname;
