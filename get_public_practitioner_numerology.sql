-- Fonction RPC pour récupérer les données de numérologie publiques des intervenants
-- Cette fonction contourne les RLS pour exposer uniquement les données des intervenants
-- ayant un profil public (is_active=true ET profile_visible=true)

CREATE OR REPLACE FUNCTION get_public_practitioner_numerology(p_user_id UUID)
RETURNS TABLE (
  tronc INTEGER,
  racine_1 INTEGER,
  racine_2 INTEGER,
  dynamique_de_vie INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER -- Exécute avec les privilèges du créateur de la fonction
AS $$
BEGIN
  -- Vérifier que l'intervenant a un profil public
  IF NOT EXISTS (
    SELECT 1
    FROM practitioners
    WHERE user_id = p_user_id
      AND is_active = true
      AND profile_visible = true
  ) THEN
    -- Si le profil n'est pas public, ne rien retourner
    RETURN;
  END IF;

  -- Retourner les données de numérologie du bénéficiaire "self" de cet intervenant
  RETURN QUERY
  SELECT
    b.tronc,
    b.racine_1,
    b.racine_2,
    b.dynamique_de_vie
  FROM beneficiary_access ba
  INNER JOIN beneficiaries b ON ba.beneficiary_id = b.id
  WHERE ba.user_id = p_user_id
    AND ba.relationship = 'self'
  LIMIT 1;
END;
$$;

-- Donner les permissions nécessaires
GRANT EXECUTE ON FUNCTION get_public_practitioner_numerology(UUID) TO anon, authenticated;

-- Commentaire pour documentation
COMMENT ON FUNCTION get_public_practitioner_numerology IS
'Récupère les données de numérologie (tronc, racines, dynamique de vie) d''un intervenant ayant un profil public. Retourne NULL si le profil n''est pas public ou si aucun bénéficiaire "self" n''existe.';
