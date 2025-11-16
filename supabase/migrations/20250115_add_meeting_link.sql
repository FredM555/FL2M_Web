-- Migration: Ajout du champ meeting_link pour les liens de visioconférence
-- Date: 2025-01-15
-- Description: Ajouter un champ pour stocker le lien de visio (Zoom, Google Meet, etc.)

-- Ajouter la colonne meeting_link à la table appointments
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS meeting_link TEXT;

-- Ajouter un commentaire pour documenter le champ
COMMENT ON COLUMN public.appointments.meeting_link IS 'Lien de visioconférence pour la séance (Zoom, Google Meet, Teams, etc.)';

-- Vérifier que la colonne a été ajoutée
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'appointments'
AND column_name = 'meeting_link';
