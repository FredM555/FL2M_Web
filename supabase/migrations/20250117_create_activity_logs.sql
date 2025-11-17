-- =====================================================
-- Migration: Créer la table activity_logs pour tracer l'activité
-- Date: 2025-01-17
-- Description: Table pour enregistrer toutes les activités (login, logout, rendez-vous, etc.)
-- =====================================================

BEGIN;

-- SECTION 1: Créer la table activity_logs
-- =========================================

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL, -- 'login', 'logout', 'appointment_created', 'appointment_cancelled', etc.
  action_description TEXT,
  entity_type VARCHAR(50), -- 'appointment', 'profile', 'document', etc.
  entity_id UUID, -- ID de l'entité concernée
  ip_address INET,
  user_agent TEXT,
  metadata JSONB, -- Données supplémentaires en JSON
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SECTION 2: Créer les index pour améliorer les performances
-- ===========================================================

-- Index sur user_id pour filtrer par utilisateur
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);

-- Index sur action_type pour filtrer par type d'action
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON public.activity_logs(action_type);

-- Index sur created_at pour filtrer par date
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- Index composite pour les requêtes courantes
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_date ON public.activity_logs(user_id, created_at DESC);

-- SECTION 3: Créer une vue avec les informations utilisateur jointes
-- ====================================================================

CREATE OR REPLACE VIEW public.activity_logs_with_user AS
SELECT
  al.*,
  p.first_name,
  p.last_name,
  p.email,
  p.user_type,
  p.pseudo
FROM public.activity_logs al
LEFT JOIN public.profiles p ON al.user_id = p.id
ORDER BY al.created_at DESC;

-- SECTION 4: Politiques RLS
-- ==========================

-- Activer RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Les admins peuvent tout voir
CREATE POLICY "Admins can view all activity logs"
  ON public.activity_logs
  FOR SELECT
  USING (
    (SELECT user_type FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Les utilisateurs peuvent voir leurs propres logs
CREATE POLICY "Users can view own activity logs"
  ON public.activity_logs
  FOR SELECT
  USING (user_id = auth.uid());

-- Seul le système (via SECURITY DEFINER functions) peut insérer
CREATE POLICY "System can insert activity logs"
  ON public.activity_logs
  FOR INSERT
  WITH CHECK (true);

-- Seuls les admins peuvent supprimer (pour nettoyage)
CREATE POLICY "Admins can delete activity logs"
  ON public.activity_logs
  FOR DELETE
  USING (
    (SELECT user_type FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- SECTION 5: Fonction pour enregistrer une activité
-- ===================================================

CREATE OR REPLACE FUNCTION public.log_activity(
  p_user_id UUID,
  p_action_type VARCHAR(50),
  p_action_description TEXT DEFAULT NULL,
  p_entity_type VARCHAR(50) DEFAULT NULL,
  p_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.activity_logs (
    user_id,
    action_type,
    action_description,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    p_user_id,
    p_action_type,
    p_action_description,
    p_entity_type,
    p_entity_id,
    p_metadata
  )
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$;

-- Donner les permissions
GRANT EXECUTE ON FUNCTION public.log_activity TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_activity TO anon;

-- SECTION 6: Fonction de nettoyage automatique (optionnel)
-- ==========================================================

-- Fonction pour supprimer les logs de plus de X jours
CREATE OR REPLACE FUNCTION public.cleanup_old_activity_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.activity_logs
  WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- SECTION 7: Vérification
-- ========================

DO $$
DECLARE
  table_exists BOOLEAN;
  policy_count INTEGER;
  index_count INTEGER;
BEGIN
  -- Vérifier que la table existe
  SELECT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'activity_logs'
  ) INTO table_exists;

  -- Compter les politiques
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'activity_logs' AND schemaname = 'public';

  -- Compter les index
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'activity_logs' AND schemaname = 'public';

  RAISE NOTICE '================================';
  RAISE NOTICE 'RÉSULTAT DE LA MIGRATION:';
  RAISE NOTICE '================================';

  IF table_exists THEN
    RAISE NOTICE '✓ Table activity_logs créée';
  ELSE
    RAISE WARNING '✗ Table activity_logs NON créée';
  END IF;

  RAISE NOTICE '✓ % politiques RLS créées', policy_count;
  RAISE NOTICE '✓ % index créés', index_count;
  RAISE NOTICE '✓ Vue activity_logs_with_user créée';
  RAISE NOTICE '✓ Fonction log_activity() créée';
  RAISE NOTICE '✓ Fonction cleanup_old_activity_logs() créée';
  RAISE NOTICE '================================';
END $$;

COMMIT;

-- =====================================================
-- FIN DE LA MIGRATION
-- =====================================================

-- Types d'actions recommandés :
-- - 'login' : Connexion utilisateur
-- - 'logout' : Déconnexion utilisateur
-- - 'login_failed' : Tentative de connexion échouée
-- - 'appointment_created' : Rendez-vous créé
-- - 'appointment_updated' : Rendez-vous modifié
-- - 'appointment_cancelled' : Rendez-vous annulé
-- - 'appointment_confirmed' : Rendez-vous confirmé
-- - 'appointment_completed' : Rendez-vous terminé
-- - 'profile_updated' : Profil modifié
-- - 'password_changed' : Mot de passe changé
-- - 'document_uploaded' : Document uploadé
-- - 'document_deleted' : Document supprimé
-- =====================================================
