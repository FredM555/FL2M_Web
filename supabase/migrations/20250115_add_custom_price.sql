-- Migration: Ajout du champ custom_price pour personnaliser le prix d'un rendez-vous
-- Date: 2025-01-15
-- Description: Permet de définir un prix spécifique pour un rendez-vous, différent du prix du service

-- Ajouter la colonne custom_price à la table appointments
ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS custom_price NUMERIC(10, 2);

-- Ajouter un commentaire pour documenter le champ
COMMENT ON COLUMN public.appointments.custom_price IS
  'Prix personnalisé pour ce rendez-vous. Si NULL, utilise le prix du service. Permet de faire des tarifs spéciaux.';

-- Vérifier que la colonne a été ajoutée
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'appointments'
AND column_name = 'custom_price';
