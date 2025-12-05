-- Migration: Créer automatiquement un profil quand un utilisateur s'inscrit
-- Description: Ce trigger crée un profil dans la table profiles lors de la création d'un utilisateur

-- Fonction pour créer un profil automatiquement
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insérer un nouveau profil avec les données de base
  INSERT INTO public.profiles (id, email, user_type, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    'client', -- Par défaut, nouvel utilisateur = client
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Ne rien faire si le profil existe déjà

  RETURN NEW;
END;
$$;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Créer le trigger sur la table auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Ajouter des commentaires
COMMENT ON FUNCTION public.handle_new_user() IS 'Crée automatiquement un profil dans la table profiles quand un utilisateur s''inscrit';
