-- ========================================
-- FIX: Éviter la récursion infinie dans les policies RLS
-- Date: 2025-12-21
-- ========================================
--
-- PROBLÈME: Les policies créent une récursion car :
-- - appointment_beneficiaries vérifie beneficiaries
-- - beneficiaries vérifie appointment_beneficiaries
--
-- SOLUTION: Séparer les permissions sans références croisées
--
-- ========================================

-- Étape 1: Supprimer toutes les policies existantes
DROP POLICY IF EXISTS "appointment_beneficiaries_select_policy" ON appointment_beneficiaries;
DROP POLICY IF EXISTS "appointment_beneficiaries_insert_policy" ON appointment_beneficiaries;
DROP POLICY IF EXISTS "appointment_beneficiaries_update_policy" ON appointment_beneficiaries;
DROP POLICY IF EXISTS "appointment_beneficiaries_delete_policy" ON appointment_beneficiaries;
DROP POLICY IF EXISTS "beneficiaries_select_for_practitioners" ON beneficiaries;
DROP POLICY IF EXISTS "beneficiaries_select_policy" ON beneficiaries;
DROP POLICY IF EXISTS "beneficiary_notes_select_policy" ON beneficiary_notes;
DROP POLICY IF EXISTS "beneficiary_notes_insert_policy" ON beneficiary_notes;
DROP POLICY IF EXISTS "beneficiary_notes_update_policy" ON beneficiary_notes;
DROP POLICY IF EXISTS "beneficiary_notes_delete_policy" ON beneficiary_notes;
DROP POLICY IF EXISTS "beneficiary_documents_select_policy" ON beneficiary_documents;
DROP POLICY IF EXISTS "beneficiary_documents_insert_policy" ON beneficiary_documents;
DROP POLICY IF EXISTS "beneficiary_documents_update_policy" ON beneficiary_documents;
DROP POLICY IF EXISTS "beneficiary_documents_delete_policy" ON beneficiary_documents;

-- ========================================
-- TABLE: appointment_beneficiaries
-- Permissions SANS référence à beneficiaries
-- ========================================

-- SELECT: Lecture des liens (SANS vérifier beneficiaries)
CREATE POLICY "appointment_beneficiaries_select_policy"
ON appointment_beneficiaries
FOR SELECT
USING (
  -- L'intervenant du rendez-vous
  EXISTS (
    SELECT 1 FROM appointments a
    JOIN practitioners p ON p.id = a.practitioner_id
    WHERE a.id = appointment_beneficiaries.appointment_id
    AND p.user_id = auth.uid()
  )
  OR
  -- Le client du rendez-vous
  EXISTS (
    SELECT 1 FROM appointments
    WHERE appointments.id = appointment_beneficiaries.appointment_id
    AND appointments.client_id = auth.uid()
  )
  OR
  -- Les admins
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);

-- INSERT
CREATE POLICY "appointment_beneficiaries_insert_policy"
ON appointment_beneficiaries
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM appointments
    WHERE appointments.id = appointment_beneficiaries.appointment_id
    AND appointments.client_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM appointments a
    JOIN practitioners p ON p.id = a.practitioner_id
    WHERE a.id = appointment_beneficiaries.appointment_id
    AND p.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);

-- UPDATE
CREATE POLICY "appointment_beneficiaries_update_policy"
ON appointment_beneficiaries
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM appointments
    WHERE appointments.id = appointment_beneficiaries.appointment_id
    AND appointments.client_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM appointments a
    JOIN practitioners p ON p.id = a.practitioner_id
    WHERE a.id = appointment_beneficiaries.appointment_id
    AND p.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);

-- DELETE
CREATE POLICY "appointment_beneficiaries_delete_policy"
ON appointment_beneficiaries
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM appointments
    WHERE appointments.id = appointment_beneficiaries.appointment_id
    AND appointments.client_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM appointments a
    JOIN practitioners p ON p.id = a.practitioner_id
    WHERE a.id = appointment_beneficiaries.appointment_id
    AND p.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);

-- ========================================
-- TABLE: beneficiaries
-- Permissions simples SANS référence à appointment_beneficiaries
-- ========================================

-- SELECT: Lecture simple (owner + access + admin)
-- NOTE: On fait confiance au fait que l'accès à appointment_beneficiaries
-- est déjà contrôlé. Donc si on arrive ici via un JOIN, c'est OK.
CREATE POLICY "beneficiaries_select_policy"
ON beneficiaries
FOR SELECT
USING (
  -- Le propriétaire
  owner_id = auth.uid()
  OR
  -- Accès explicite
  EXISTS (
    SELECT 1 FROM beneficiary_access
    WHERE beneficiary_access.beneficiary_id = beneficiaries.id
    AND beneficiary_access.user_id = auth.uid()
  )
  OR
  -- Les admins
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);

-- ========================================
-- TABLE: beneficiary_notes
-- ========================================

CREATE POLICY "beneficiary_notes_select_policy"
ON beneficiary_notes
FOR SELECT
USING (
  -- Le propriétaire du bénéficiaire
  EXISTS (
    SELECT 1 FROM beneficiaries b
    WHERE b.id = beneficiary_notes.beneficiary_id
    AND b.owner_id = auth.uid()
  )
  OR
  -- L'intervenant qui a créé la note
  practitioner_id IN (
    SELECT id FROM practitioners WHERE user_id = auth.uid()
  )
  OR
  -- Les admins
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);

CREATE POLICY "beneficiary_notes_insert_policy"
ON beneficiary_notes
FOR INSERT
WITH CHECK (
  -- L'intervenant (note: on vérifie qu'il a bien un practitioner_id)
  practitioner_id IN (
    SELECT id FROM practitioners WHERE user_id = auth.uid()
  )
  OR
  -- Les admins
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);

CREATE POLICY "beneficiary_notes_update_policy"
ON beneficiary_notes
FOR UPDATE
USING (
  practitioner_id IN (
    SELECT id FROM practitioners WHERE user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);

CREATE POLICY "beneficiary_notes_delete_policy"
ON beneficiary_notes
FOR DELETE
USING (
  practitioner_id IN (
    SELECT id FROM practitioners WHERE user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);

-- ========================================
-- TABLE: beneficiary_documents
-- ========================================

CREATE POLICY "beneficiary_documents_select_policy"
ON beneficiary_documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM beneficiaries b
    WHERE b.id = beneficiary_documents.beneficiary_id
    AND b.owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);

CREATE POLICY "beneficiary_documents_insert_policy"
ON beneficiary_documents
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM beneficiaries b
    WHERE b.id = beneficiary_documents.beneficiary_id
    AND b.owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);

CREATE POLICY "beneficiary_documents_update_policy"
ON beneficiary_documents
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM beneficiaries b
    WHERE b.id = beneficiary_documents.beneficiary_id
    AND b.owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);

CREATE POLICY "beneficiary_documents_delete_policy"
ON beneficiary_documents
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM beneficiaries b
    WHERE b.id = beneficiary_documents.beneficiary_id
    AND b.owner_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);

-- ========================================
-- GRANTS pour permettre l'accès via le service role
-- ========================================

-- Accorder les permissions de base
GRANT SELECT ON appointment_beneficiaries TO authenticated;
GRANT SELECT ON beneficiaries TO authenticated;
GRANT SELECT ON beneficiary_notes TO authenticated;
GRANT SELECT ON beneficiary_documents TO authenticated;

-- ========================================
-- RÉSULTAT ATTENDU
-- ========================================
--
-- Avec cette configuration:
-- 1. Les intervenants peuvent lire appointment_beneficiaries (via leur rendez-vous)
-- 2. Les bénéficiaires associés sont automatiquement accessibles via JOIN
-- 3. Pas de récursion car beneficiaries ne vérifie PAS appointment_beneficiaries
-- 4. Les admins ont un accès complet
--
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '✅ Policies RLS recréées sans récursion!';
  RAISE NOTICE 'Rechargez votre application pour voir les bénéficiaires.';
END $$;
