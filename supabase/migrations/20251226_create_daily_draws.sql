-- Migration : Créer la table daily_draws pour les tirages quotidiens
-- Date: 2025-12-26
-- Description: Table pour stocker les messages de tirage quotidien basés sur la numérologie

-- 1. Créer le type enum pour les types de tirages
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'daily_draw_type') THEN
    CREATE TYPE daily_draw_type AS ENUM ('quotidien', 'climat', 'annuel', 'mensuel');
  END IF;
END $$;

-- 1b. Créer le type enum pour la source du tirage
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'daily_draw_source') THEN
    CREATE TYPE daily_draw_source AS ENUM ('manual', 'ai_generated');
  END IF;
END $$;

-- 2. Créer la table daily_draws
CREATE TABLE IF NOT EXISTS daily_draws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type daily_draw_type NOT NULL,
  nombre INTEGER NOT NULL CHECK ((nombre >= 1 AND nombre <= 9) OR nombre = 11 OR nombre = 22),
  titre TEXT NOT NULL,
  message TEXT NOT NULL,
  source daily_draw_source NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Créer des index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_daily_draws_type ON daily_draws(type);
CREATE INDEX IF NOT EXISTS idx_daily_draws_nombre ON daily_draws(nombre);
CREATE INDEX IF NOT EXISTS idx_daily_draws_type_nombre ON daily_draws(type, nombre);
CREATE INDEX IF NOT EXISTS idx_daily_draws_source ON daily_draws(source);

-- 4. Activer RLS (Row Level Security)
ALTER TABLE daily_draws ENABLE ROW LEVEL SECURITY;

-- 5. Politique RLS : Tout le monde peut lire les tirages (même non authentifié)
CREATE POLICY "Anyone can view daily draws"
ON daily_draws FOR SELECT
USING (true);

-- 6. Politique RLS : Seuls les admins peuvent insérer
CREATE POLICY "Admins can insert daily draws"
ON daily_draws FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- 7. Politique RLS : Seuls les admins peuvent mettre à jour
CREATE POLICY "Admins can update daily draws"
ON daily_draws FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- 8. Politique RLS : Seuls les admins peuvent supprimer
CREATE POLICY "Admins can delete daily draws"
ON daily_draws FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- 9. Créer un trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_daily_draws_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_daily_draws_updated_at
BEFORE UPDATE ON daily_draws
FOR EACH ROW
EXECUTE FUNCTION update_daily_draws_updated_at();

-- 10. Ajouter des commentaires pour documenter la table
COMMENT ON TABLE daily_draws IS 'Table contenant les messages pour les tirages quotidiens basés sur la numérologie';
COMMENT ON COLUMN daily_draws.type IS 'Type de tirage : quotidien, climat, annuel, mensuel';
COMMENT ON COLUMN daily_draws.nombre IS 'Nombre numérologique (1-9, 11, 22). Les nombres 11 et 22 sont des nombres maîtres. Pour le type quotidien, un même nombre peut apparaître plusieurs fois avec des messages différents';
COMMENT ON COLUMN daily_draws.titre IS 'Titre du message de tirage';
COMMENT ON COLUMN daily_draws.message IS 'Contenu complet du message de tirage';
COMMENT ON COLUMN daily_draws.source IS 'Source du tirage : manual (saisie manuelle) ou ai_generated (généré par IA)';

-- 11. Insérer quelques données d'exemple pour le type quotidien
INSERT INTO daily_draws (type, nombre, titre, message) VALUES
  ('quotidien', 1, 'Nouveau départ', 'C''est le moment de prendre des initiatives et de commencer de nouveaux projets. Votre énergie créative est à son maximum.'),
  ('quotidien', 2, 'Équilibre et harmonie', 'Concentrez-vous sur vos relations et cherchez l''harmonie dans vos interactions. La coopération est favorisée.'),
  ('quotidien', 3, 'Expression créative', 'Exprimez-vous librement aujourd''hui. Votre créativité et votre communication sont particulièrement favorisées.'),
  ('quotidien', 4, 'Stabilité et structure', 'C''est un jour pour construire des fondations solides. Concentrez-vous sur l''organisation et la planification.'),
  ('quotidien', 5, 'Changement et liberté', 'Embrassez le changement et restez flexible. De nouvelles opportunités se présentent à vous.'),
  ('quotidien', 6, 'Responsabilité et amour', 'Prenez soin de vos proches et assumez vos responsabilités avec amour. L''harmonie familiale est importante.'),
  ('quotidien', 7, 'Introspection et sagesse', 'Prenez du temps pour vous et pour réfléchir. La méditation et l''analyse profonde sont favorisées.'),
  ('quotidien', 8, 'Pouvoir et réussite', 'Votre détermination vous mènera au succès. C''est un jour favorable pour les affaires et la réalisation de vos ambitions.'),
  ('quotidien', 9, 'Accomplissement et compassion', 'Achevez ce qui doit l''être et faites preuve de compassion envers les autres. C''est un moment de conclusion et de générosité.'),
  ('quotidien', 11, 'Illumination spirituelle', 'Nombre maître 11 : Votre intuition est exceptionnellement élevée aujourd''hui. Écoutez votre voix intérieure et laissez-vous guider par votre sagesse spirituelle. C''est un moment propice pour l''inspiration et l''éveil.'),
  ('quotidien', 22, 'Maître bâtisseur', 'Nombre maître 22 : Vous avez le pouvoir de transformer vos rêves en réalité concrète. C''est le moment de construire quelque chose de durable et d''importance. Votre capacité à manifester vos visions est à son apogée.');
