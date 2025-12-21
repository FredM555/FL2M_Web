-- Solution temporaire : Permettre aux admins de voir TOUS les messages appointment
-- À exécuter dans Supabase SQL Editor

-- Ajouter une politique spéciale pour les admins
CREATE POLICY "Admins can view all appointment messages"
ON messages FOR SELECT
USING (
  reference_type = 'appointment'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- Vérifier que la nouvelle politique a été créée
SELECT
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename = 'messages'
  AND policyname LIKE '%admin%appointment%'
ORDER BY policyname;
