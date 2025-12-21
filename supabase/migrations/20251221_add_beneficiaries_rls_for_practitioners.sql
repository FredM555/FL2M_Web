-- Migration: Ajouter les policies RLS sur beneficiaries pour les intervenants
-- Date: 2025-12-21
-- Description: Permettre aux intervenants et admins de voir les bénéficiaires de leurs rendez-vous

-- Activer RLS si ce n'est pas déjà fait
ALTER TABLE beneficiaries ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "beneficiaries_select_for_practitioners" ON beneficiaries;

-- Policy SELECT: Permettre aux intervenants de voir les bénéficiaires de leurs rendez-vous
CREATE POLICY "beneficiaries_select_for_practitioners"
ON beneficiaries
FOR SELECT
USING (
  -- Le propriétaire du bénéficiaire
  owner_id = auth.uid()
  OR
  -- Utilisateurs ayant accès au bénéficiaire
  EXISTS (
    SELECT 1 FROM beneficiary_access
    WHERE beneficiary_access.beneficiary_id = beneficiaries.id
    AND beneficiary_access.user_id = auth.uid()
  )
  OR
  -- L'intervenant d'un rendez-vous où ce bénéficiaire est lié
  EXISTS (
    SELECT 1 FROM appointment_beneficiaries ab
    JOIN appointments a ON a.id = ab.appointment_id
    JOIN practitioners p ON p.id = a.practitioner_id
    WHERE ab.beneficiary_id = beneficiaries.id
    AND p.user_id = auth.uid()
  )
  OR
  -- Les admins
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.user_type = 'admin'
  )
);

-- Commentaire pour documentation
COMMENT ON POLICY "beneficiaries_select_for_practitioners" ON beneficiaries IS
'Permet aux propriétaires, utilisateurs autorisés, intervenants (via rendez-vous) et admins de voir les bénéficiaires';
