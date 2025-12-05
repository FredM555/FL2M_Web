-- Migration: Ajouter la colonne stripe_customer_id à la table profiles
-- Description: Permet de stocker l'ID client Stripe pour éviter de créer des doublons

-- Ajouter la colonne stripe_customer_id
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Ajouter un index pour les recherches rapides
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON profiles(stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;

-- Ajouter une contrainte d'unicité
ALTER TABLE profiles
ADD CONSTRAINT unique_stripe_customer_id UNIQUE (stripe_customer_id);

-- Commentaire
COMMENT ON COLUMN profiles.stripe_customer_id IS 'ID du client dans Stripe (pour les paiements)';
