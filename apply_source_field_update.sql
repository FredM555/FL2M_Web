-- Script pour ajouter le champ source aux tirages quotidiens existants
-- À exécuter dans Supabase Dashboard > SQL Editor

-- 1. Créer le type enum pour la source du tirage (si il n'existe pas)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'daily_draw_source') THEN
    CREATE TYPE daily_draw_source AS ENUM ('manual', 'ai_generated');
  END IF;
END $$;

-- 2. Ajouter la colonne source si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_draws'
    AND column_name = 'source'
  ) THEN
    ALTER TABLE daily_draws
    ADD COLUMN source daily_draw_source NOT NULL DEFAULT 'manual';
  END IF;
END $$;

-- 3. Créer un index sur la colonne source
CREATE INDEX IF NOT EXISTS idx_daily_draws_source ON daily_draws(source);

-- 4. Ajouter le commentaire
COMMENT ON COLUMN daily_draws.source IS 'Source du tirage : manual (saisie manuelle) ou ai_generated (généré par IA)';
