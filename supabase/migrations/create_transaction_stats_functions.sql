-- =====================================================
-- Migration: Fonctions RPC pour les statistiques de transactions
-- Description: Crée les fonctions pour calculer les stats des transactions
-- Date: 2025-12-05
-- =====================================================

-- =====================================================
-- Fonction: Statistiques d'un intervenant
-- =====================================================
CREATE OR REPLACE FUNCTION get_practitioner_transaction_stats(
  p_practitioner_id UUID
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_transactions', COUNT(*),
    'total_revenue', COALESCE(SUM(amount_total), 0),
    'total_commission', COALESCE(SUM(amount_platform_commission), 0),
    'pending_transfers', COUNT(*) FILTER (WHERE transfer_status IN ('pending', 'eligible')),
    'completed_transfers', COUNT(*) FILTER (WHERE transfer_status = 'completed')
  )
  INTO result
  FROM transactions
  WHERE practitioner_id = p_practitioner_id
    AND status = 'succeeded';

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Fonction: Statistiques globales (ADMIN)
-- =====================================================
CREATE OR REPLACE FUNCTION get_global_transaction_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_transactions', COUNT(*),
    'total_revenue', COALESCE(SUM(amount_total), 0),
    'total_commission', COALESCE(SUM(amount_platform_commission), 0),
    'pending_transfers', COUNT(*) FILTER (WHERE transfer_status IN ('pending', 'eligible')),
    'completed_transfers', COUNT(*) FILTER (WHERE transfer_status = 'completed')
  )
  INTO result
  FROM transactions
  WHERE status = 'succeeded';

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Fonction: Statistiques par période
-- =====================================================
CREATE OR REPLACE FUNCTION get_transaction_stats_by_period(
  p_period TEXT,  -- 'week' ou 'month'
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '90 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  period TEXT,
  total_revenue DECIMAL,
  total_commission DECIMAL,
  transaction_count BIGINT
) AS $$
BEGIN
  IF p_period = 'week' THEN
    RETURN QUERY
    SELECT
      TO_CHAR(DATE_TRUNC('week', created_at), 'YYYY-"W"IW') as period,
      COALESCE(SUM(amount_total), 0) as total_revenue,
      COALESCE(SUM(amount_platform_commission), 0) as total_commission,
      COUNT(*) as transaction_count
    FROM transactions
    WHERE status = 'succeeded'
      AND created_at >= p_start_date
      AND created_at <= p_end_date
    GROUP BY DATE_TRUNC('week', created_at)
    ORDER BY DATE_TRUNC('week', created_at) DESC;
  ELSIF p_period = 'month' THEN
    RETURN QUERY
    SELECT
      TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') as period,
      COALESCE(SUM(amount_total), 0) as total_revenue,
      COALESCE(SUM(amount_platform_commission), 0) as total_commission,
      COUNT(*) as transaction_count
    FROM transactions
    WHERE status = 'succeeded'
      AND created_at >= p_start_date
      AND created_at <= p_end_date
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY DATE_TRUNC('month', created_at) DESC;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Fonction: Statistiques par intervenant (ADMIN)
-- =====================================================
CREATE OR REPLACE FUNCTION get_stats_by_practitioner()
RETURNS TABLE (
  practitioner_id UUID,
  practitioner_name TEXT,
  total_transactions BIGINT,
  total_revenue DECIMAL,
  total_commission DECIMAL,
  pending_transfers BIGINT,
  completed_transfers BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id as practitioner_id,
    prof.first_name || ' ' || prof.last_name as practitioner_name,
    COUNT(t.id) as total_transactions,
    COALESCE(SUM(t.amount_total), 0) as total_revenue,
    COALESCE(SUM(t.amount_platform_commission), 0) as total_commission,
    COUNT(*) FILTER (WHERE t.transfer_status IN ('pending', 'eligible')) as pending_transfers,
    COUNT(*) FILTER (WHERE t.transfer_status = 'completed') as completed_transfers
  FROM practitioners p
  JOIN profiles prof ON prof.id = p.user_id
  LEFT JOIN transactions t ON t.practitioner_id = p.id AND t.status = 'succeeded'
  GROUP BY p.id, prof.first_name, prof.last_name
  HAVING COUNT(t.id) > 0
  ORDER BY total_revenue DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Permissions
-- =====================================================

-- Les intervenants peuvent voir leurs propres stats
GRANT EXECUTE ON FUNCTION get_practitioner_transaction_stats TO authenticated;

-- Seuls les admins peuvent voir les stats globales
GRANT EXECUTE ON FUNCTION get_global_transaction_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_transaction_stats_by_period TO authenticated;
GRANT EXECUTE ON FUNCTION get_stats_by_practitioner TO authenticated;

-- =====================================================
-- IMPORTANT: Migration prête à être appliquée
-- =====================================================
