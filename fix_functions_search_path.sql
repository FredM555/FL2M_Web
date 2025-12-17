-- =============================================================================
-- CORRECTION MOYENNE : search_path manquant dans les fonctions
-- =============================================================================
--
-- PROBLÈME : Les fonctions sans search_path explicite sont vulnérables aux
--            injections de schéma. Un attaquant peut créer un schéma malveillant
--            et rediriger les requêtes vers des tables piégées.
--
-- SOLUTION : Ajouter "SET search_path = public" à toutes les fonctions
--
-- IMPACT : Aucun impact négatif - élimine une vulnérabilité d'injection
--
-- =============================================================================

-- NOTE : Les tables email_logs, login_logs et error_logs n'existent pas dans cette base
--        Ces fonctions sont commentées pour éviter les erreurs

-- Fonction 1 : log_email_sent (COMMENTÉE - Table email_logs n'existe pas)
-- CREATE OR REPLACE FUNCTION log_email_sent(
--     p_recipient TEXT,
--     p_subject TEXT,
--     p_body TEXT DEFAULT NULL
-- )
-- RETURNS void
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = public
-- AS $$
-- BEGIN
--     INSERT INTO email_logs (recipient, subject, body, status, sent_at)
--     VALUES (p_recipient, p_subject, p_body, 'sent', NOW());
-- END;
-- $$;

-- =============================================================================

-- Fonction 2 : log_email_failed (COMMENTÉE - Table email_logs n'existe pas)
-- CREATE OR REPLACE FUNCTION log_email_failed(
--     p_recipient TEXT,
--     p_subject TEXT,
--     p_error_message TEXT
-- )
-- RETURNS void
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = public
-- AS $$
-- BEGIN
--     INSERT INTO email_logs (recipient, subject, status, error_message, sent_at)
--     VALUES (p_recipient, p_subject, 'failed', p_error_message, NOW());
-- END;
-- $$;

-- =============================================================================

-- Fonction 3 : log_user_login (COMMENTÉE - Table login_logs n'existe pas)
-- CREATE OR REPLACE FUNCTION log_user_login(
--     p_user_id UUID,
--     p_ip_address TEXT,
--     p_user_agent TEXT DEFAULT NULL,
--     p_location TEXT DEFAULT NULL,
--     p_success BOOLEAN DEFAULT TRUE
-- )
-- RETURNS void
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = public
-- AS $$
-- BEGIN
--     INSERT INTO login_logs (user_id, ip_address, user_agent, location, success)
--     VALUES (p_user_id, p_ip_address, p_user_agent, p_location, p_success);
-- END;
-- $$;

-- =============================================================================

-- Fonction 4 : log_error (COMMENTÉE - Table error_logs n'existe pas)
-- CREATE OR REPLACE FUNCTION log_error(
--     p_error_message TEXT,
--     p_user_id UUID DEFAULT NULL,
--     p_error_code TEXT DEFAULT NULL,
--     p_context JSONB DEFAULT NULL
-- )
-- RETURNS void
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = public
-- AS $$
-- BEGIN
--     INSERT INTO error_logs (user_id, error_message, error_code, context)
--     VALUES (p_user_id, p_error_message, p_error_code, p_context);
-- END;
-- $$;

-- =============================================================================

-- Fonction 5 : get_appointments_needing_reminder (COMMENTÉE - Colonne full_name n'existe pas dans practitioners)
-- CREATE OR REPLACE FUNCTION get_appointments_needing_reminder()
-- RETURNS TABLE (
--     appointment_id UUID,
--     beneficiary_email TEXT,
--     appointment_date TIMESTAMPTZ,
--     practitioner_name TEXT
-- )
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = public
-- AS $$
-- BEGIN
--     RETURN QUERY
--     SELECT
--         a.id,
--         b.email,
--         a.scheduled_at,
--         p.full_name  -- Cette colonne n'existe pas
--     FROM appointments a
--     JOIN beneficiaries b ON a.beneficiary_id = b.id
--     JOIN practitioners p ON a.practitioner_id = p.id
--     WHERE a.scheduled_at > NOW()
--       AND a.scheduled_at <= NOW() + INTERVAL '24 hours'
--       AND a.status = 'confirmed'
--       AND (a.reminder_sent_at IS NULL OR a.reminder_sent_at < NOW() - INTERVAL '7 days');
-- END;
-- $$;

-- =============================================================================

-- Fonction 6 : mark_reminder_sent (COMMENTÉE - Dépend de get_appointments_needing_reminder)
-- CREATE OR REPLACE FUNCTION mark_reminder_sent(p_appointment_id UUID)
-- RETURNS void
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = public
-- AS $$
-- BEGIN
--     UPDATE appointments
--     SET reminder_sent_at = NOW()
--     WHERE id = p_appointment_id;
-- END;
-- $$;

-- =============================================================================

-- Fonction 7 : handle_new_user (trigger function)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Créer un profil pour le nouvel utilisateur
    INSERT INTO profiles (id, email, created_at)
    VALUES (NEW.id, NEW.email, NOW())
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
END;
$$;

-- =============================================================================

-- Fonction 8 : update_updated_at_column (trigger function)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- =============================================================================

-- Fonction 9 : trigger_set_timestamp (trigger function)
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- =============================================================================

-- Fonction 10 : update_practitioner_updated_by
CREATE OR REPLACE FUNCTION update_practitioner_updated_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_by = auth.uid();
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- =============================================================================

-- Fonction 11 : clean_old_logs (COMMENTÉE - Tables email_logs et login_logs n'existent pas)
-- CREATE OR REPLACE FUNCTION clean_old_logs(p_days_to_keep INTEGER DEFAULT 90)
-- RETURNS INTEGER
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = public
-- AS $$
-- DECLARE
--     v_deleted_count INTEGER;
-- BEGIN
--     -- Supprimer les logs de plus de X jours
--     DELETE FROM email_logs WHERE created_at < NOW() - (p_days_to_keep || ' days')::INTERVAL;
--     GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
--
--     DELETE FROM login_logs WHERE created_at < NOW() - (p_days_to_keep || ' days')::INTERVAL;
--     GET DIAGNOSTICS v_deleted_count = v_deleted_count + ROW_COUNT;
--
--     DELETE FROM activity_logs WHERE created_at < NOW() - (p_days_to_keep || ' days')::INTERVAL;
--     GET DIAGNOSTICS v_deleted_count = v_deleted_count + ROW_COUNT;
--
--     RETURN v_deleted_count;
-- END;
-- $$;

-- =============================================================================

-- Vérification : Les fonctions trigger doivent maintenant avoir search_path défini
SELECT
    p.proname AS function_name,
    COALESCE(array_to_string(p.proconfig, ', '), 'NO CONFIG') as config
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'handle_new_user',
    'update_updated_at_column',
    'trigger_set_timestamp',
    'update_practitioner_updated_by'
  )
ORDER BY p.proname;

-- =============================================================================
-- ✅ CORRECTION TERMINÉE
-- =============================================================================
--
-- Les 4 fonctions trigger ont maintenant search_path = public et sont protégées
-- contre les injections de schéma.
--
-- Note : Les autres fonctions (7 sur 11) ont été commentées car elles utilisent
--        des tables qui n'existent pas dans cette base (email_logs, login_logs, error_logs).
--
-- Alertes résolues : 4 alertes moyennes (au lieu de 11 dans l'audit original)
--
-- =============================================================================
