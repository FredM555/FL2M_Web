-- =====================================================
-- Migration: Ajout du système de rappels de rendez-vous
-- Description: Ajouter les champs et fonctions pour gérer
--              les rappels automatiques de RDV
-- =====================================================

-- 1. Ajouter des colonnes pour tracker les rappels envoyés
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS reminder_hours_before integer DEFAULT 24;

-- 2. Ajouter des commentaires
COMMENT ON COLUMN public.appointments.reminder_sent_at IS 'Date et heure d''envoi du dernier rappel';
COMMENT ON COLUMN public.appointments.reminder_hours_before IS 'Nombre d''heures avant le RDV pour envoyer le rappel (défaut: 24h)';

-- 3. Créer un index pour optimiser la recherche des RDV à rappeler
CREATE INDEX IF NOT EXISTS idx_appointments_reminder_lookup
  ON public.appointments(start_time, reminder_sent_at, status)
  WHERE status IN ('pending', 'confirmed');

-- 4. Fonction pour récupérer les rendez-vous nécessitant un rappel
CREATE OR REPLACE FUNCTION public.get_appointments_needing_reminder()
RETURNS TABLE (
  id uuid,
  client_id uuid,
  practitioner_id uuid,
  service_id uuid,
  start_time timestamptz,
  end_time timestamptz,
  beneficiary_first_name text,
  beneficiary_last_name text,
  beneficiary_email text,
  beneficiary_notifications_enabled boolean,
  reminder_hours_before integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.client_id,
    a.practitioner_id,
    a.service_id,
    a.start_time,
    a.end_time,
    a.beneficiary_first_name,
    a.beneficiary_last_name,
    a.beneficiary_email,
    a.beneficiary_notifications_enabled,
    a.reminder_hours_before
  FROM public.appointments a
  WHERE
    -- RDV confirmé ou en attente
    a.status IN ('pending', 'confirmed')
    -- Pas encore de rappel envoyé
    AND a.reminder_sent_at IS NULL
    -- RDV a lieu dans la fenêtre de rappel
    AND a.start_time > NOW()
    AND a.start_time <= NOW() + (COALESCE(a.reminder_hours_before, 24) || ' hours')::interval
    -- RDV pas encore passé
    AND a.start_time > NOW()
  ORDER BY a.start_time ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Fonction pour marquer un rendez-vous comme "rappel envoyé"
CREATE OR REPLACE FUNCTION public.mark_reminder_sent(p_appointment_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.appointments
  SET reminder_sent_at = NOW()
  WHERE id = p_appointment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Permissions
GRANT EXECUTE ON FUNCTION public.get_appointments_needing_reminder() TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_reminder_sent(uuid) TO service_role;

-- 7. Commentaires sur les fonctions
COMMENT ON FUNCTION public.get_appointments_needing_reminder() IS
  'Récupère tous les rendez-vous qui nécessitent un rappel (RDV dans les X prochaines heures sans rappel envoyé)';
COMMENT ON FUNCTION public.mark_reminder_sent(uuid) IS
  'Marque un rendez-vous comme ayant reçu son rappel';
