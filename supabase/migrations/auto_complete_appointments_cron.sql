-- Migration pour marquer automatiquement les rendez-vous comme terminés
-- 1 heure après leur heure de fin

-- Étape 1 : Activer l'extension pg_cron si pas déjà fait
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Étape 2 : Supprimer l'ancienne fonction si elle existe (pour éviter les conflits de type de retour)
DROP FUNCTION IF EXISTS auto_complete_appointments();

-- Étape 3 : Créer la fonction qui marque les rendez-vous comme terminés
CREATE OR REPLACE FUNCTION auto_complete_appointments()
RETURNS void AS $$
DECLARE
  completed_count integer;
BEGIN
  -- Mettre à jour les rendez-vous terminés depuis plus d'1 heure
  WITH updated AS (
    UPDATE appointments
    SET
      status = 'completed',
      updated_at = now()
    WHERE
      -- Le rendez-vous doit être confirmé
      status IN ('confirmed', 'beneficiaire_confirme')
      -- L'heure de fin doit être passée depuis plus d'1 heure
      AND end_time < (now() - INTERVAL '1 hour')
      -- Le client doit être présent (rendez-vous réservé)
      AND client_id IS NOT NULL
    RETURNING id
  )
  SELECT COUNT(*) INTO completed_count FROM updated;

  -- Logger le résultat
  RAISE NOTICE 'Auto-completion : % rendez-vous marqué(s) comme terminé(s)', completed_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Étape 3 : Créer le cron job qui exécute la fonction toutes les heures
-- Note : pg_cron s'exécute en timezone UTC
SELECT cron.schedule(
  'auto-complete-appointments',  -- Nom du job
  '0 * * * *',                    -- Toutes les heures à la minute 0
  'SELECT auto_complete_appointments();'
);

-- Vérification : Pour voir les cron jobs configurés
-- SELECT * FROM cron.job;

-- Pour désactiver le cron job (si besoin) :
-- SELECT cron.unschedule('auto-complete-appointments');

-- Commentaires pour documentation
COMMENT ON FUNCTION auto_complete_appointments() IS
'Marque automatiquement les rendez-vous comme terminés 1 heure après leur heure de fin.
Exécuté automatiquement toutes les heures via pg_cron.';
