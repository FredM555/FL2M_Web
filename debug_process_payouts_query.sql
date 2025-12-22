-- =====================================================
-- Debug : Tester la requête exacte de process-payouts
-- =====================================================

\echo '1. Transactions qui DEVRAIENT être trouvées :';
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

-- Test simple : conditions de base
SELECT
  id,
  appointment_id,
  practitioner_id,
  status,
  transfer_status,
  eligible_for_transfer_at,
  amount_practitioner,
  CASE
    WHEN transfer_status = 'eligible' THEN '✓'
    ELSE '✗'
  END as check_transfer_status,
  CASE
    WHEN eligible_for_transfer_at <= NOW() THEN '✓'
    ELSE '✗'
  END as check_date,
  CASE
    WHEN status = 'succeeded' THEN '✓'
    ELSE '✗'
  END as check_status
FROM transactions
WHERE transfer_status = 'eligible'
  AND eligible_for_transfer_at <= NOW()
  AND status = 'succeeded';

\echo '';
\echo '2. Vérifier la relation avec practitioners :';
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

-- Test avec la relation practitioners (comme dans process-payouts)
SELECT
  t.id,
  t.appointment_id,
  t.practitioner_id,
  t.amount_practitioner,
  p.id as practitioner_exists,
  p.stripe_account_id,
  prof.email
FROM transactions t
LEFT JOIN practitioners p ON p.id = t.practitioner_id
LEFT JOIN profiles prof ON prof.id = p.user_id
WHERE t.transfer_status = 'eligible'
  AND t.eligible_for_transfer_at <= NOW()
  AND t.status = 'succeeded';

\echo '';
\echo '3. Problèmes potentiels :';
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

-- Transactions sans practitioner_id
SELECT
  'Transactions sans practitioner_id' as probleme,
  COUNT(*) as nb
FROM transactions
WHERE transfer_status = 'eligible'
  AND eligible_for_transfer_at <= NOW()
  AND status = 'succeeded'
  AND practitioner_id IS NULL;

-- Practitioners sans stripe_account_id
SELECT
  'Practitioners sans Stripe Connect' as probleme,
  COUNT(*) as nb
FROM transactions t
JOIN practitioners p ON p.id = t.practitioner_id
WHERE t.transfer_status = 'eligible'
  AND t.eligible_for_transfer_at <= NOW()
  AND t.status = 'succeeded'
  AND (p.stripe_account_id IS NULL OR p.stripe_account_id = '');

\echo '';
\echo '4. Détail complet :';
\echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

SELECT
  t.id as transaction_id,
  t.appointment_id,
  t.practitioner_id,
  t.status as transaction_status,
  t.transfer_status,
  t.eligible_for_transfer_at,
  t.amount_practitioner,
  p.id IS NOT NULL as has_practitioner,
  p.stripe_account_id IS NOT NULL as has_stripe_account,
  p.stripe_account_id,
  prof.email as practitioner_email,
  CASE
    WHEN t.practitioner_id IS NULL THEN '❌ Pas de practitioner_id'
    WHEN p.id IS NULL THEN '❌ Practitioner introuvable'
    WHEN p.stripe_account_id IS NULL THEN '❌ Pas de compte Stripe Connect'
    ELSE '✅ Tout OK'
  END as diagnostic
FROM transactions t
LEFT JOIN practitioners p ON p.id = t.practitioner_id
LEFT JOIN profiles prof ON prof.id = p.user_id
WHERE t.transfer_status = 'eligible'
  AND t.eligible_for_transfer_at <= NOW()
  AND t.status = 'succeeded';
