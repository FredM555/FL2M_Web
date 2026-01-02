-- Migration : Créer la table daily_message_history pour l'historique des messages du jour
-- Date: 2026-01-01
-- Description: Table pour stocker l'historique des messages du jour consultés par les bénéficiaires avec notation

-- 0. Supprimer la table si elle existe déjà (pour permettre une recréation propre)
DROP TABLE IF EXISTS daily_message_history CASCADE;

-- 1. Créer la table daily_message_history
CREATE TABLE daily_message_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relations
  beneficiary_id UUID NOT NULL REFERENCES beneficiaries(id) ON DELETE CASCADE,
  daily_draw_id UUID NOT NULL REFERENCES daily_draws(id) ON DELETE CASCADE,

  -- Informations du message au moment de la consultation
  nombre INTEGER NOT NULL CHECK ((nombre >= 1 AND nombre <= 9) OR nombre = 11 OR nombre = 22),
  origine_label TEXT NOT NULL, -- Ex: "🎯 Tronc (Objectif de vie)", "🛤️ Racine 1 (Chemin de vie)"
  titre TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Notation et commentaire utilisateur
  rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- Note sur 5 étoiles (nullable)
  user_note TEXT, -- Note/commentaire personnel de l'utilisateur (nullable)

  -- Dates
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  viewed_date DATE GENERATED ALWAYS AS ((viewed_at AT TIME ZONE 'UTC')::date) STORED,
  rated_at TIMESTAMPTZ, -- Date de la notation
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Créer des index pour optimiser les requêtes
CREATE INDEX idx_daily_message_history_beneficiary
  ON daily_message_history(beneficiary_id);

CREATE INDEX idx_daily_message_history_viewed_at
  ON daily_message_history(beneficiary_id, viewed_at DESC);

CREATE INDEX idx_daily_message_history_rating
  ON daily_message_history(beneficiary_id, rating)
  WHERE rating IS NOT NULL;

CREATE INDEX idx_daily_message_history_daily_draw
  ON daily_message_history(daily_draw_id);

-- Index unique pour éviter les doublons de messages par jour
CREATE UNIQUE INDEX idx_unique_daily_message_per_beneficiary_origin
  ON daily_message_history(beneficiary_id, daily_draw_id, origine_label, viewed_date);

-- 3. Activer RLS (Row Level Security)
ALTER TABLE daily_message_history ENABLE ROW LEVEL SECURITY;

-- 4. Politique RLS : Les utilisateurs peuvent voir leurs propres messages
CREATE POLICY "Users can view their own message history"
ON daily_message_history FOR SELECT
TO authenticated
USING (
  -- L'utilisateur est le propriétaire du bénéficiaire
  beneficiary_id IN (
    SELECT id FROM beneficiaries
    WHERE owner_id = auth.uid()
  )
  OR
  -- L'utilisateur est admin
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- 5. Politique RLS : Les utilisateurs peuvent insérer leurs propres messages
CREATE POLICY "Users can insert their own message history"
ON daily_message_history FOR INSERT
TO authenticated
WITH CHECK (
  -- L'utilisateur est le propriétaire du bénéficiaire
  beneficiary_id IN (
    SELECT id FROM beneficiaries
    WHERE owner_id = auth.uid()
  )
);

-- 6. Politique RLS : Les utilisateurs peuvent mettre à jour (noter) leurs propres messages
CREATE POLICY "Users can update their own message history"
ON daily_message_history FOR UPDATE
TO authenticated
USING (
  -- L'utilisateur est le propriétaire du bénéficiaire
  beneficiary_id IN (
    SELECT id FROM beneficiaries
    WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  -- L'utilisateur est le propriétaire du bénéficiaire
  beneficiary_id IN (
    SELECT id FROM beneficiaries
    WHERE owner_id = auth.uid()
  )
);

-- 7. Politique RLS : Les utilisateurs peuvent supprimer leurs propres messages
CREATE POLICY "Users can delete their own message history"
ON daily_message_history FOR DELETE
TO authenticated
USING (
  -- L'utilisateur est le propriétaire du bénéficiaire
  beneficiary_id IN (
    SELECT id FROM beneficiaries
    WHERE owner_id = auth.uid()
  )
  OR
  -- L'utilisateur est admin
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- 8. Créer un trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_daily_message_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();

  -- Si une note est ajoutée/modifiée, mettre à jour rated_at
  IF NEW.rating IS NOT NULL AND (OLD.rating IS NULL OR NEW.rating != OLD.rating) THEN
    NEW.rated_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_daily_message_history_updated_at
BEFORE UPDATE ON daily_message_history
FOR EACH ROW
EXECUTE FUNCTION update_daily_message_history_updated_at();

-- 9. Ajouter des commentaires pour documenter la table
COMMENT ON TABLE daily_message_history IS 'Historique des messages du jour consultés par les bénéficiaires avec possibilité de notation';
COMMENT ON COLUMN daily_message_history.beneficiary_id IS 'Référence au bénéficiaire qui a consulté le message';
COMMENT ON COLUMN daily_message_history.daily_draw_id IS 'Référence au message du jour dans daily_draws';
COMMENT ON COLUMN daily_message_history.nombre IS 'Nombre numérologique du message (1-9, 11, 22) - copié pour historique';
COMMENT ON COLUMN daily_message_history.origine_label IS 'Label d''origine du message (ex: "🎯 Tronc (Objectif de vie)")';
COMMENT ON COLUMN daily_message_history.titre IS 'Titre du message - copié pour historique';
COMMENT ON COLUMN daily_message_history.message IS 'Contenu du message - copié pour historique';
COMMENT ON COLUMN daily_message_history.rating IS 'Note de 1 à 5 étoiles donnée par l''utilisateur (nullable)';
COMMENT ON COLUMN daily_message_history.user_note IS 'Note/commentaire personnel de l''utilisateur (nullable)';
COMMENT ON COLUMN daily_message_history.viewed_at IS 'Date et heure de consultation du message';
COMMENT ON COLUMN daily_message_history.viewed_date IS 'Date de consultation (générée automatiquement à partir de viewed_at)';
COMMENT ON COLUMN daily_message_history.rated_at IS 'Date et heure de la notation (null si pas noté)';

-- 10. Créer une vue pour les statistiques de notation
CREATE OR REPLACE VIEW daily_message_rating_stats AS
SELECT
  beneficiary_id,
  COUNT(*) as total_messages,
  COUNT(rating) as rated_messages,
  ROUND(AVG(rating)::numeric, 2) as average_rating,
  COUNT(CASE WHEN rating = 5 THEN 1 END) as five_stars_count,
  COUNT(CASE WHEN rating = 4 THEN 1 END) as four_stars_count,
  COUNT(CASE WHEN rating = 3 THEN 1 END) as three_stars_count,
  COUNT(CASE WHEN rating = 2 THEN 1 END) as two_stars_count,
  COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star_count
FROM daily_message_history
GROUP BY beneficiary_id;

COMMENT ON VIEW daily_message_rating_stats IS 'Statistiques de notation des messages du jour par bénéficiaire';
