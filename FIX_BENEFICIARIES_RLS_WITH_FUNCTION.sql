-- ========================================
-- FIX COMPLET: Éviter la récursion infinie avec une fonction helper
-- Date: 2025-12-21
-- ========================================
--
-- STRATÉGIE:
-- 1. Créer une fonction helper qui vérifie si un utilisateur a accès à un bénéficiaire
-- 2. Cette fonction utilise SECURITY DEFINER pour bypass RLS
-- 3. Utiliser cette fonction dans les policies pour éviter la récursion
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

-- Étape 2: Créer une fonction helper qui vérifie l'accès intervenant
-- Cette fonction bypass RLS avec SECURITY DEFINER
CREATE OR REPLACE FUNCTION user_has_practitioner_access_to_beneficiary(beneficiary_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Vérifier si l'utilisateur courant est intervenant d'un RDV avec ce bénéficiaire
  RETURN EXISTS (
    SELECT 1
    FROM appointment_beneficiaries ab
    JOIN appointments a ON a.id = ab.appointment_id
    JOIN practitioners p ON p.id = a.practitioner_id
    WHERE ab.beneficiary_id = beneficiary_id_param
    AND p.user_id = auth.uid()
  );
END;
$$;

-- Étape 3: Créer les policies sans récursion

-- ========================================
-- TABLE: appointment_beneficiaries
-- ========================================

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

CREATE POLICY "appointment_beneficiaries_insert_policy"
ON appointment_beneficiaries
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM appointments
    WHERE appointments.id = appointment_beneficiaries.appointment_id
    AND (appointments.client_id = auth.uid() OR EXISTS (
      SELECT 1 FROM practitioners p
      WHERE p.id = appointments.practitioner_id
      AND p.user_id = auth.uid()
    ))
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);

CREATE POLICY "appointment_beneficiaries_update_policy"
ON appointment_beneficiaries
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM appointments
    WHERE appointments.id = appointment_beneficiaries.appointment_id
    AND (appointments.client_id = auth.uid() OR EXISTS (
      SELECT 1 FROM practitioners p
      WHERE p.id = appointments.practitioner_id
      AND p.user_id = auth.uid()
    ))
  )
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);

CREATE POLICY "appointment_beneficiaries_delete_policy"
ON appointment_beneficiaries
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM appointments
    WHERE appointments.id = appointment_beneficiaries.appointment_id
    AND (appointments.client_id = auth.uid() OR EXISTS (
      SELECT 1 FROM practitioners p
      WHERE p.id = appointments.practitioner_id
      AND p.user_id = auth.uid()
    ))
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
-- Utilise la fonction helper pour éviter la récursion
-- ========================================

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
  -- Intervenant via fonction helper (bypass RLS)
  user_has_practitioner_access_to_beneficiary(beneficiaries.id)
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
  -- Intervenant via fonction helper
  user_has_practitioner_access_to_beneficiary(beneficiary_notes.beneficiary_id)
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
  -- L'intervenant (doit avoir un practitioner_id valide ET accès au bénéficiaire)
  (
    practitioner_id IN (SELECT id FROM practitioners WHERE user_id = auth.uid())
    AND user_has_practitioner_access_to_beneficiary(beneficiary_notes.beneficiary_id)
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
  -- Intervenant via fonction helper
  user_has_practitioner_access_to_beneficiary(beneficiary_documents.beneficiary_id)
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
  -- Intervenant via fonction helper
  user_has_practitioner_access_to_beneficiary(beneficiary_documents.beneficiary_id)
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
-- RÉSULTAT
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '✅ Function helper créée: user_has_practitioner_access_to_beneficiary()';
  RAISE NOTICE '✅ Policies RLS recréées SANS récursion!';
  RAISE NOTICE '⚡ La fonction SECURITY DEFINER bypass RLS pour vérifier les permissions';
  RAISE NOTICE '🔄 Rechargez votre application maintenant!';
END $$;
