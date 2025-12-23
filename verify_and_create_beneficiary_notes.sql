-- Script de vérification et création de la table beneficiary_notes
-- À exécuter dans le SQL Editor de Supabase

-- 1. Vérifier si la table existe
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'beneficiary_notes'
) AS table_exists;

-- 2. Si la table n'existe pas, afficher sa structure attendue
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'beneficiary_notes'
  AND table_schema = 'public'
ORDER BY ordinal_position;
