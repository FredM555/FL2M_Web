-- Migration: Supprimer les champs legacy de bénéficiaire dans la table appointments
-- Date: 2025-12-19
-- Description: Harmonisation des données bénéficiaires en supprimant les champs redondants
--              de la table appointments. Les données bénéficiaires sont désormais stockées
--              uniquement dans les tables beneficiaries et appointment_beneficiaries.

-- 1. Supprimer la vue existante qui dépend des colonnes legacy
DROP VIEW IF EXISTS appointments_with_beneficiaries CASCADE;

-- 2. Supprimer les champs legacy de bénéficiaire
ALTER TABLE appointments
  DROP COLUMN IF EXISTS beneficiary_first_name,
  DROP COLUMN IF EXISTS beneficiary_last_name,
  DROP COLUMN IF EXISTS beneficiary_birth_date,
  DROP COLUMN IF EXISTS beneficiary_email,
  DROP COLUMN IF EXISTS beneficiary_phone,
  DROP COLUMN IF EXISTS beneficiary_notifications_enabled,
  DROP COLUMN IF EXISTS beneficiary_relationship;

-- 3. Recréer la vue avec la nouvelle architecture
CREATE OR REPLACE VIEW appointments_with_beneficiaries AS
SELECT
  a.*,
  -- Informations du bénéficiaire principal (premier dans l'ordre)
  b.id as primary_beneficiary_id,
  b.first_name as primary_beneficiary_first_name,
  b.last_name as primary_beneficiary_last_name,
  b.birth_date as primary_beneficiary_birth_date,
  b.email as primary_beneficiary_email,
  b.phone as primary_beneficiary_phone,
  b.notifications_enabled as primary_beneficiary_notifications_enabled,
  ab.role as primary_beneficiary_role,
  -- Compter le nombre total de bénéficiaires
  (SELECT COUNT(*) FROM appointment_beneficiaries WHERE appointment_id = a.id) as beneficiaries_count
FROM appointments a
LEFT JOIN LATERAL (
  SELECT *
  FROM appointment_beneficiaries
  WHERE appointment_id = a.id
  ORDER BY role_order ASC
  LIMIT 1
) ab ON true
LEFT JOIN beneficiaries b ON ab.beneficiary_id = b.id;

-- 4. Ajouter un commentaire sur la table pour documenter le changement
COMMENT ON TABLE appointments IS 'Table des rendez-vous. Les informations des bénéficiaires sont stockées dans les tables beneficiaries et appointment_beneficiaries (relation many-to-many).';

-- 5. Ajouter un index sur appointment_beneficiaries pour optimiser les jointures
CREATE INDEX IF NOT EXISTS idx_appointment_beneficiaries_appointment_id
ON appointment_beneficiaries(appointment_id);

CREATE INDEX IF NOT EXISTS idx_appointment_beneficiaries_beneficiary_id
ON appointment_beneficiaries(beneficiary_id);

-- 6. Ajouter un commentaire sur la relation
COMMENT ON TABLE appointment_beneficiaries IS 'Table de liaison entre appointments et beneficiaries. Permet de gérer plusieurs bénéficiaires par rendez-vous avec leur rôle respectif.';
