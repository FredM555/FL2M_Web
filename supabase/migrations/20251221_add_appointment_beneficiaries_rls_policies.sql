-- Migration: Ajouter les policies RLS pour appointment_beneficiaries
-- Date: 2025-12-21
-- Description: Permettre aux intervenants et admins de voir les bénéficiaires de leurs rendez-vous

-- Activer RLS si ce n'est pas déjà fait
ALTER TABLE appointment_beneficiaries ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "appointment_beneficiaries_select_policy" ON appointment_beneficiaries;
DROP POLICY IF EXISTS "appointment_beneficiaries_insert_policy" ON appointment_beneficiaries;
DROP POLICY IF EXISTS "appointment_beneficiaries_update_policy" ON appointment_beneficiaries;
DROP POLICY IF EXISTS "appointment_beneficiaries_delete_policy" ON appointment_beneficiaries;

-- Policy SELECT: Permettre la lecture des bénéficiaires
-- - Le propriétaire du bénéficiaire (owner_id)
-- - Les utilisateurs ayant accès au bénéficiaire (beneficiary_access)
-- - L'intervenant du rendez-vous
-- - Les admins
CREATE POLICY "appointment_beneficiaries_select_policy"
ON appointment_beneficiaries
FOR SELECT
USING (
  -- Le propriétaire du bénéficiaire
  EXISTS (
    SELECT 1 FROM beneficiaries b
    WHERE b.id = appointment_beneficiaries.beneficiary_id
    AND b.owner_id = auth.uid()
  )
  OR
  -- Utilisateurs ayant accès au bénéficiaire
  EXISTS (
    SELECT 1 FROM beneficiary_access ba
    WHERE ba.beneficiary_id = appointment_beneficiaries.beneficiary_id
    AND ba.user_id = auth.uid()
  )
  OR
  -- L'intervenant du rendez-vous
  EXISTS (
    SELECT 1 FROM appointments a
    JOIN practitioners p ON p.id = a.practitioner_id
    WHERE a.id = appointment_beneficiaries.appointment_id
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

-- Policy INSERT: Permettre l'ajout de bénéficiaires à un rendez-vous
-- - Le client du rendez-vous
-- - L'intervenant du rendez-vous
-- - Les admins
CREATE POLICY "appointment_beneficiaries_insert_policy"
ON appointment_beneficiaries
FOR INSERT
WITH CHECK (
  -- Le client du rendez-vous
  EXISTS (
    SELECT 1 FROM appointments
    WHERE appointments.id = appointment_beneficiaries.appointment_id
    AND appointments.client_id = auth.uid()
  )
  OR
  -- L'intervenant du rendez-vous
  EXISTS (
    SELECT 1 FROM appointments a
    JOIN practitioners p ON p.id = a.practitioner_id
    WHERE a.id = appointment_beneficiaries.appointment_id
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

-- Policy UPDATE: Permettre la modification des liens bénéficiaire-rendez-vous
-- - Le client du rendez-vous
-- - L'intervenant du rendez-vous
-- - Les admins
CREATE POLICY "appointment_beneficiaries_update_policy"
ON appointment_beneficiaries
FOR UPDATE
USING (
  -- Le client du rendez-vous
  EXISTS (
    SELECT 1 FROM appointments
    WHERE appointments.id = appointment_beneficiaries.appointment_id
    AND appointments.client_id = auth.uid()
  )
  OR
  -- L'intervenant du rendez-vous
  EXISTS (
    SELECT 1 FROM appointments a
    JOIN practitioners p ON p.id = a.practitioner_id
    WHERE a.id = appointment_beneficiaries.appointment_id
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

-- Policy DELETE: Permettre la suppression de liens bénéficiaire-rendez-vous
-- - Le client du rendez-vous
-- - L'intervenant du rendez-vous
-- - Les admins
CREATE POLICY "appointment_beneficiaries_delete_policy"
ON appointment_beneficiaries
FOR DELETE
USING (
  -- Le client du rendez-vous
  EXISTS (
    SELECT 1 FROM appointments
    WHERE appointments.id = appointment_beneficiaries.appointment_id
    AND appointments.client_id = auth.uid()
  )
  OR
  -- L'intervenant du rendez-vous
  EXISTS (
    SELECT 1 FROM appointments a
    JOIN practitioners p ON p.id = a.practitioner_id
    WHERE a.id = appointment_beneficiaries.appointment_id
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

-- Commentaires pour documentation
COMMENT ON POLICY "appointment_beneficiaries_select_policy" ON appointment_beneficiaries IS
'Permet aux propriétaires, utilisateurs autorisés, intervenants et admins de voir les bénéficiaires des rendez-vous';

COMMENT ON POLICY "appointment_beneficiaries_insert_policy" ON appointment_beneficiaries IS
'Permet aux clients, intervenants et admins d''ajouter des bénéficiaires aux rendez-vous';

COMMENT ON POLICY "appointment_beneficiaries_update_policy" ON appointment_beneficiaries IS
'Permet aux clients, intervenants et admins de modifier les liens bénéficiaire-rendez-vous';

COMMENT ON POLICY "appointment_beneficiaries_delete_policy" ON appointment_beneficiaries IS
'Permet aux clients, intervenants et admins de retirer des bénéficiaires des rendez-vous';
