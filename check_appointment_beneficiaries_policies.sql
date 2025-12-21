-- Vérifier les policies RLS sur la table appointment_beneficiaries

-- 1. Vérifier si RLS est activé
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'appointment_beneficiaries';

-- 2. Lister toutes les policies sur la table
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'appointment_beneficiaries';

-- 3. Vérifier la structure de la table
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'appointment_beneficiaries'
ORDER BY ordinal_position;
