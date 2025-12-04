-- Migration: Ajout du champ département à la table profiles
-- Date: 2025-12-04
-- Description: Ajoute un champ department (code département français) pour mieux orienter les intervenants

-- Ajout du champ department à la table profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS department VARCHAR(3);

-- Commentaire sur la colonne
COMMENT ON COLUMN profiles.department IS 'Code département français (ex: 75 pour Paris, 59 pour Nord, 2A pour Corse-du-Sud)';

-- Création d'un index pour améliorer les performances des recherches par département
CREATE INDEX IF NOT EXISTS idx_profiles_department ON profiles(department);
