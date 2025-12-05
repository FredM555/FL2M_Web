// src/services/transactions.ts
import { supabase } from './supabase';
import { Transaction } from '../types/payments';

export interface TransactionWithDetails extends Transaction {
  appointment?: {
    id: string;
    start_time: string;
    end_time: string;
    service: {
      name: string;
    };
  };
  practitioner?: {
    id: string;
    profiles: {
      first_name: string;
      last_name: string;
    };
  };
  client?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export interface TransactionStats {
  total_transactions: number;
  total_revenue: number;
  total_commission: number;
  pending_transfers: number;
  completed_transfers: number;
}

export interface PeriodStats {
  period: string;
  total_revenue: number;
  total_commission: number;
  transaction_count: number;
}

/**
 * Récupère les transactions d'un intervenant
 */
export const getPractitionerTransactions = async (
  practitionerId: string,
  filters?: {
    status?: string;
    transfer_status?: string;
    limit?: number;
    offset?: number;
  }
) => {
  let query = supabase
    .from('transactions')
    .select(`
      *,
      appointment:appointments (
        id,
        start_time,
        end_time,
        service:services (name)
      ),
      client:profiles (
        id,
        first_name,
        last_name
      )
    `)
    .eq('practitioner_id', practitionerId)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.transfer_status) {
    query = query.eq('transfer_status', filters.transfer_status);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 20) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erreur récupération transactions:', error);
    throw error;
  }

  return { data: data as TransactionWithDetails[], error: null };
};

/**
 * Récupère les statistiques d'un intervenant
 */
export const getPractitionerStats = async (practitionerId: string) => {
  const { data, error } = await supabase.rpc('get_practitioner_transaction_stats', {
    p_practitioner_id: practitionerId
  });

  if (error) {
    console.error('Erreur récupération stats:', error);
    throw error;
  }

  return { data: data as TransactionStats, error: null };
};

/**
 * Récupère toutes les transactions (ADMIN uniquement)
 */
export const getAllTransactions = async (filters?: {
  practitioner_id?: string;
  status?: string;
  transfer_status?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}) => {
  let query = supabase
    .from('transactions')
    .select(`
      *,
      appointment:appointments (
        id,
        start_time,
        end_time,
        service:services (name)
      ),
      practitioner:practitioners (
        id,
        profiles:profiles (
          first_name,
          last_name
        )
      ),
      client:profiles (
        id,
        first_name,
        last_name
      )
    `)
    .order('created_at', { ascending: false });

  if (filters?.practitioner_id) {
    query = query.eq('practitioner_id', filters.practitioner_id);
  }

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  if (filters?.transfer_status) {
    query = query.eq('transfer_status', filters.transfer_status);
  }

  if (filters?.start_date) {
    query = query.gte('created_at', filters.start_date);
  }

  if (filters?.end_date) {
    query = query.lte('created_at', filters.end_date);
  }

  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Erreur récupération transactions:', error);
    throw error;
  }

  return { data: data as TransactionWithDetails[], error: null };
};

/**
 * Récupère les statistiques globales (ADMIN)
 */
export const getGlobalStats = async () => {
  const { data, error } = await supabase.rpc('get_global_transaction_stats');

  if (error) {
    console.error('Erreur récupération stats globales:', error);
    throw error;
  }

  return { data: data as TransactionStats, error: null };
};

/**
 * Récupère les statistiques par période (ADMIN)
 */
export const getStatsByPeriod = async (
  period: 'week' | 'month',
  startDate?: string,
  endDate?: string
) => {
  const { data, error } = await supabase.rpc('get_transaction_stats_by_period', {
    p_period: period,
    p_start_date: startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    p_end_date: endDate || new Date().toISOString()
  });

  if (error) {
    console.error('Erreur récupération stats par période:', error);
    throw error;
  }

  return { data: data as PeriodStats[], error: null };
};

/**
 * Récupère les statistiques par intervenant (ADMIN)
 */
export const getStatsByPractitioner = async () => {
  const { data, error } = await supabase.rpc('get_stats_by_practitioner');

  if (error) {
    console.error('Erreur récupération stats par intervenant:', error);
    throw error;
  }

  return { data, error: null };
};
