-- =====================================================
-- Fix automatique des 2 dernières fonctions
-- Description: Détecte automatiquement les signatures
--              et corrige log_error et log_user_login
-- =====================================================

DO $$
DECLARE
    func_record RECORD;
    v_count int := 0;
    v_sql text;
BEGIN
    RAISE NOTICE '=== Correction automatique des fonctions ===';
    RAISE NOTICE '';

    -- Parcourir toutes les versions de log_error et log_user_login
    FOR func_record IN
        SELECT
            p.proname,
            p.oid,
            pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.proname IN ('log_error', 'log_user_login')
          AND p.proconfig IS NULL  -- Seulement celles sans search_path
    LOOP
        BEGIN
            -- Construire la commande ALTER dynamiquement
            v_sql := format(
                'ALTER FUNCTION public.%I(%s) SET search_path = public',
                func_record.proname,
                func_record.args
            );

            -- Exécuter
            EXECUTE v_sql;

            v_count := v_count + 1;
            RAISE NOTICE '✓ Corrigé: %(%)', func_record.proname, func_record.args;

        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '✗ Erreur pour %(%): %',
                func_record.proname,
                func_record.args,
                SQLERRM;
        END;
    END LOOP;

    RAISE NOTICE '';
    IF v_count > 0 THEN
        RAISE NOTICE '=== ✓ % fonction(s) corrigée(s) ===', v_count;
    ELSE
        RAISE NOTICE '=== ⚠ Aucune fonction à corriger (déjà corrigées?) ===';
    END IF;
END $$;

-- =====================================================
-- Vérification finale
-- =====================================================
SELECT
    p.proname as "Fonction",
    pg_get_function_identity_arguments(p.oid) as "Paramètres",
    CASE
        WHEN p.proconfig IS NULL THEN '❌ Pas de search_path'
        ELSE '✅ ' || array_to_string(p.proconfig, ', ')
    END as "Statut"
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('log_error', 'log_user_login')
ORDER BY p.proname, p.oid;
