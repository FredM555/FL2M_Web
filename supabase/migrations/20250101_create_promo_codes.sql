-- Migration pour créer la table des codes promo
-- Date: 2025-01-01
-- Description: Table pour gérer les codes promo offrant le premier mois gratuit

-- Créer la table promo_codes
CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  discount_type VARCHAR(20) NOT NULL DEFAULT 'first_month_free', -- Type de réduction
  discount_value NUMERIC(10, 2), -- Valeur de la réduction (si applicable)
  applicable_contract_types TEXT[], -- Types d'abonnements concernés (NULL = tous)
  max_uses INTEGER, -- Nombre maximum d'utilisations (NULL = illimité)
  uses_count INTEGER DEFAULT 0, -- Nombre d'utilisations actuelles
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  CONSTRAINT valid_discount_type CHECK (discount_type IN ('first_month_free', 'percentage', 'fixed_amount'))
);

-- Index pour améliorer les performances
CREATE INDEX idx_promo_codes_code ON promo_codes(code);
CREATE INDEX idx_promo_codes_active ON promo_codes(is_active);

-- Table pour suivre l'utilisation des codes promo
CREATE TABLE IF NOT EXISTS promo_code_uses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_code_id UUID REFERENCES promo_codes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  contract_id UUID REFERENCES practitioner_contracts(id),
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(promo_code_id, user_id) -- Un utilisateur ne peut utiliser un code qu'une seule fois
);

-- Index pour améliorer les performances
CREATE INDEX idx_promo_code_uses_promo_code ON promo_code_uses(promo_code_id);
CREATE INDEX idx_promo_code_uses_user ON promo_code_uses(user_id);

-- Ajouter une colonne pour le code promo dans practitioner_contracts
ALTER TABLE practitioner_contracts
ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES promo_codes(id);

-- Ajouter une colonne pour le statut de l'abonnement (pour gérer l'annulation)
ALTER TABLE practitioner_contracts
ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;

ALTER TABLE practitioner_contracts
ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMP WITH TIME ZONE;

-- Fonction pour valider un code promo
CREATE OR REPLACE FUNCTION validate_promo_code(
  p_code VARCHAR(50),
  p_user_id UUID,
  p_contract_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  valid BOOLEAN,
  promo_code_id UUID,
  discount_type VARCHAR(20),
  discount_value NUMERIC(10, 2),
  message TEXT
) AS $$
DECLARE
  v_promo_code promo_codes%ROWTYPE;
  v_already_used BOOLEAN;
BEGIN
  -- Récupérer le code promo
  SELECT * INTO v_promo_code
  FROM promo_codes
  WHERE code = p_code
    AND is_active = true;

  -- Vérifier si le code existe
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR(20), NULL::NUMERIC(10, 2), 'Code promo invalide ou expiré'::TEXT;
    RETURN;
  END IF;

  -- Vérifier la date de validité
  IF v_promo_code.valid_from > NOW() THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR(20), NULL::NUMERIC(10, 2), 'Ce code promo n''est pas encore valide'::TEXT;
    RETURN;
  END IF;

  IF v_promo_code.valid_until IS NOT NULL AND v_promo_code.valid_until < NOW() THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR(20), NULL::NUMERIC(10, 2), 'Ce code promo a expiré'::TEXT;
    RETURN;
  END IF;

  -- Vérifier si le code est applicable au type de contrat
  IF p_contract_type IS NOT NULL AND v_promo_code.applicable_contract_types IS NOT NULL THEN
    IF NOT (p_contract_type = ANY(v_promo_code.applicable_contract_types)) THEN
      RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR(20), NULL::NUMERIC(10, 2), 'Ce code promo n''est pas valide pour ce type d''abonnement'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Vérifier si l'utilisateur a déjà utilisé ce code
  SELECT EXISTS(
    SELECT 1 FROM promo_code_uses
    WHERE promo_code_id = v_promo_code.id
      AND user_id = p_user_id
  ) INTO v_already_used;

  IF v_already_used THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR(20), NULL::NUMERIC(10, 2), 'Vous avez déjà utilisé ce code promo'::TEXT;
    RETURN;
  END IF;

  -- Vérifier le nombre maximum d'utilisations
  IF v_promo_code.max_uses IS NOT NULL AND v_promo_code.uses_count >= v_promo_code.max_uses THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR(20), NULL::NUMERIC(10, 2), 'Ce code promo a atteint sa limite d''utilisation'::TEXT;
    RETURN;
  END IF;

  -- Code valide
  RETURN QUERY SELECT
    true,
    v_promo_code.id,
    v_promo_code.discount_type,
    v_promo_code.discount_value,
    'Code promo valide'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour enregistrer l'utilisation d'un code promo
CREATE OR REPLACE FUNCTION use_promo_code(
  p_promo_code_id UUID,
  p_user_id UUID,
  p_contract_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Insérer l'utilisation
  INSERT INTO promo_code_uses (promo_code_id, user_id, contract_id)
  VALUES (p_promo_code_id, p_user_id, p_contract_id);

  -- Incrémenter le compteur d'utilisations
  UPDATE promo_codes
  SET uses_count = uses_count + 1
  WHERE id = p_promo_code_id;

  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insérer un code promo d'exemple pour le recrutement (uniquement pour l'abonnement découverte)
INSERT INTO promo_codes (code, description, discount_type, applicable_contract_types, created_by, is_active)
VALUES
  ('RECRUTEMENT2025', 'Code promo pour le recrutement - 1er mois gratuit (abonnement découverte uniquement)', 'first_month_free', ARRAY['decouverte'], (SELECT id FROM auth.users WHERE email = 'admin@flmservices.app' LIMIT 1), true)
ON CONFLICT (code) DO NOTHING;

-- Commentaires sur les tables
COMMENT ON TABLE promo_codes IS 'Table des codes promotionnels pour offrir des réductions sur les abonnements';
COMMENT ON TABLE promo_code_uses IS 'Table de suivi des utilisations de codes promotionnels';
COMMENT ON COLUMN promo_codes.applicable_contract_types IS 'Types d''abonnements auxquels ce code promo s''applique (NULL = tous les types)';
COMMENT ON COLUMN practitioner_contracts.promo_code_id IS 'ID du code promo utilisé lors de la souscription';
COMMENT ON COLUMN practitioner_contracts.cancel_at_period_end IS 'Indique si l''abonnement doit être annulé à la fin de la période';
COMMENT ON COLUMN practitioner_contracts.canceled_at IS 'Date et heure de la demande d''annulation';
