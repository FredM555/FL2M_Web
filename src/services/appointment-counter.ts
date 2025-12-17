// src/services/appointment-counter.ts
// Service de comptage des rendez-vous intervenants

import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Service de comptage des rendez-vous
 */
export class AppointmentCounter {
  /**
   * Compte le nombre total de RDV d'un intervenant (non annulés)
   */
  static async countPractitionerAppointments(
    practitionerId: string,
    includeCancelled: boolean = false
  ): Promise<number> {
    let query = supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('practitioner_id', practitionerId);

    if (!includeCancelled) {
      query = query.neq('status', 'cancelled');
    }

    const { count, error } = await query;

    if (error) {
      logger.error('Erreur lors du comptage des RDV:', error);
      throw new Error(`Impossible de compter les RDV: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Compte le nombre de RDV d'un intervenant pour une période donnée
   */
  static async countPractitionerAppointmentsByPeriod(
    practitionerId: string,
    startDate: string,
    endDate: string,
    includeCancelled: boolean = false
  ): Promise<number> {
    let query = supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('practitioner_id', practitionerId)
      .gte('start_time', startDate)
      .lte('start_time', endDate);

    if (!includeCancelled) {
      query = query.neq('status', 'cancelled');
    }

    const { count, error } = await query;

    if (error) {
      logger.error('Erreur lors du comptage des RDV par période:', error);
      throw new Error(`Impossible de compter les RDV par période: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Compte le nombre de RDV du mois en cours pour un intervenant
   */
  static async countPractitionerAppointmentsThisMonth(
    practitionerId: string
  ): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    return this.countPractitionerAppointmentsByPeriod(
      practitionerId,
      startOfMonth.toISOString(),
      endOfMonth.toISOString()
    );
  }

  /**
   * Vérifie si un intervenant a encore des RDV gratuits disponibles
   */
  static async hasFreeAppointmentsRemaining(
    practitionerId: string
  ): Promise<boolean> {
    const { data, error } = await supabase.rpc('has_free_appointments_remaining', {
      p_practitioner_id: practitionerId,
    });

    if (error) {
      logger.error('Erreur lors de la vérification des RDV gratuits:', error);
      // Par sécurité, on compte manuellement
      const count = await this.countPractitionerAppointments(practitionerId);
      return count < 3;
    }

    return data as boolean;
  }

  /**
   * Récupère le numéro du prochain RDV pour un intervenant
   */
  static async getNextAppointmentNumber(
    practitionerId: string
  ): Promise<number> {
    const count = await this.countPractitionerAppointments(practitionerId);
    return count + 1;
  }

  /**
   * Récupère des statistiques détaillées sur les RDV d'un intervenant
   */
  static async getPractitionerAppointmentStats(
    practitionerId: string
  ): Promise<{
    total: number;
    completed: number;
    pending: number;
    confirmed: number;
    cancelled: number;
    this_month: number;
    this_year: number;
    free_remaining: boolean;
  }> {
    // Compter tous les RDV par statut
    const { data: allAppointments, error } = await supabase
      .from('appointments')
      .select('status, start_time')
      .eq('practitioner_id', practitionerId);

    if (error) {
      logger.error('Erreur lors de la récupération des statistiques:', error);
      throw new Error(`Impossible de récupérer les statistiques: ${error.message}`);
    }

    const appointments = allAppointments || [];
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const stats = {
      total: appointments.length,
      completed: appointments.filter((a) => a.status === 'completed').length,
      pending: appointments.filter((a) => a.status === 'pending').length,
      confirmed: appointments.filter((a) => a.status === 'confirmed').length,
      cancelled: appointments.filter((a) => a.status === 'cancelled').length,
      this_month: appointments.filter(
        (a) => new Date(a.start_time) >= startOfMonth
      ).length,
      this_year: appointments.filter(
        (a) => new Date(a.start_time) >= startOfYear
      ).length,
      free_remaining: appointments.filter((a) => a.status !== 'cancelled').length < 3,
    };

    return stats;
  }

  /**
   * Liste les RDV d'un intervenant avec leurs numéros séquentiels
   */
  static async getPractitionerAppointmentsWithNumbers(
    practitionerId: string,
    limit?: number
  ): Promise<
    Array<{
      id: string;
      appointment_number: number;
      start_time: string;
      status: string;
      is_free: boolean;
    }>
  > {
    let query = supabase
      .from('appointments')
      .select('id, start_time, status, created_at')
      .eq('practitioner_id', practitionerId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: true });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Erreur lors de la récupération des RDV:', error);
      throw new Error(`Impossible de récupérer les RDV: ${error.message}`);
    }

    const appointments = data || [];

    return appointments.map((appointment, index) => ({
      id: appointment.id,
      appointment_number: index + 1,
      start_time: appointment.start_time,
      status: appointment.status,
      is_free: index < 3,
    }));
  }

  /**
   * Récupère les statistiques de tous les intervenants
   */
  static async getAllPractitionersStats(): Promise<
    Array<{
      practitioner_id: string;
      total_appointments: number;
      free_appointments_used: number;
      paid_appointments: number;
    }>
  > {
    const { data: practitioners, error: practitionersError } = await supabase
      .from('practitioners')
      .select('id');

    if (practitionersError) {
      logger.error('Erreur lors de la récupération des intervenants:', practitionersError);
      return [];
    }

    const stats = await Promise.all(
      (practitioners || []).map(async (practitioner) => {
        const count = await this.countPractitionerAppointments(practitioner.id);
        const freeUsed = Math.min(count, 3);
        const paid = Math.max(0, count - 3);

        return {
          practitioner_id: practitioner.id,
          total_appointments: count,
          free_appointments_used: freeUsed,
          paid_appointments: paid,
        };
      })
    );

    return stats;
  }
}

export default AppointmentCounter;
