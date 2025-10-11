-- Migration: Créer un trigger pour auto-créer le profil lors de l'inscription OAuth
-- Date: 2025-10-11
-- Description: Lorsqu'un utilisateur s'inscrit via OAuth (Google, Apple),
--              Supabase crée automatiquement un compte dans auth.users
--              mais PAS dans la table profiles. Ce trigger crée automatiquement
--              un profil minimal dans la table profiles.

-- Fonction pour créer automatiquement un profil lors de l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, user_type, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    'client', -- Par défaut, les nouveaux utilisateurs sont des clients
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING; -- Éviter les erreurs si le profil existe déjà
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaire sur la fonction
COMMENT ON FUNCTION public.handle_new_user() IS
'Crée automatiquement un profil dans la table profiles lors de la création d''un nouvel utilisateur dans auth.users. Utilisé principalement pour les inscriptions OAuth.';

-- Supprimer le trigger s'il existe déjà (pour permettre la réexécution du script)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Trigger qui s'exécute APRÈS l'insertion d'un nouvel utilisateur
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Commentaire sur le trigger
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS
'Déclenche la création automatique d''un profil dans public.profiles lorsqu''un nouvel utilisateur est créé dans auth.users';

-- Log de migration
DO $$
BEGIN
  RAISE NOTICE 'Migration appliquée avec succès: Trigger de création automatique de profil créé';
END $$;
