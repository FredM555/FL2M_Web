-- Ajouter les 4 nouveaux nombres numérologique pour les bénéficiaires
-- E (Écorce), B (Branche), F (Feuille), Fr (Fruit)

ALTER TABLE beneficiaries
ADD COLUMN IF NOT EXISTS ecorce INTEGER,
ADD COLUMN IF NOT EXISTS branche INTEGER,
ADD COLUMN IF NOT EXISTS feuille INTEGER,
ADD COLUMN IF NOT EXISTS fruit INTEGER;

-- Ajouter des commentaires pour documenter
COMMENT ON COLUMN beneficiaries.ecorce IS 'Écorce - Façon d''être perçu';
COMMENT ON COLUMN beneficiaries.branche IS 'Branche - Action/décision';
COMMENT ON COLUMN beneficiaries.feuille IS 'Feuille - Besoins affectifs (privé)';
COMMENT ON COLUMN beneficiaries.fruit IS 'Fruit - Besoins de réalisation (professionnel)';
