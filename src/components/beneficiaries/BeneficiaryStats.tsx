// src/components/beneficiaries/BeneficiaryStats.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  Event as EventIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  MedicalServices as ServiceIcon,
} from '@mui/icons-material';
import { getBeneficiaryStats } from '../../services/beneficiaries';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { logger } from '../../utils/logger';

interface BeneficiaryStatsProps {
  beneficiaryId: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color = 'primary.main', subtitle }) => (
  <Paper
    elevation={2}
    sx={{
      p: 3,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: 4,
      },
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: 2,
          bgcolor: `${color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mr: 2,
          color: color,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 700, color: color }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>
  </Paper>
);

/**
 * Composant statistiques d'un bénéficiaire
 */
export const BeneficiaryStats: React.FC<BeneficiaryStatsProps> = ({ beneficiaryId }) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (beneficiaryId) {
      loadStats();
    }
  }, [beneficiaryId]);

  const loadStats = async () => {
    if (!beneficiaryId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { data } = await getBeneficiaryStats(beneficiaryId);
      setStats(data);
    } catch (err: any) {
      logger.error('Erreur lors du chargement des statistiques:', err);
      setError(err.message || 'Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!stats) {
    return (
      <Alert severity="info">
        Aucune statistique disponible
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 3 }}>
        Statistiques
      </Typography>

      {/* Cartes de statistiques principales */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total rendez-vous"
            value={stats.total_appointments || 0}
            icon={<EventIcon />}
            color="#345995"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Terminés"
            value={stats.completed_appointments || 0}
            icon={<CheckCircleIcon />}
            color="#4caf50"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Annulés"
            value={stats.cancelled_appointments || 0}
            icon={<CancelIcon />}
            color="#f44336"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="À venir"
            value={stats.upcoming_appointments || 0}
            icon={<EventIcon />}
            color="#ff9800"
          />
        </Grid>
      </Grid>

      {/* Détails supplémentaires */}
      <Grid container spacing={3}>
        {/* Intervenants consultés */}
        {stats.practitioners && stats.practitioners.length > 0 && (
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Intervenants consultés
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {stats.practitioners.map((practitioner: any) => (
                  <Chip
                    key={practitioner.id}
                    label={`${practitioner.first_name} ${practitioner.last_name}`}
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Paper>
          </Grid>
        )}

        {/* Services utilisés */}
        {stats.services && stats.services.length > 0 && (
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ServiceIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Services utilisés
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {stats.services.map((service: any) => (
                  <Chip
                    key={service.id}
                    label={service.name}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Paper>
          </Grid>
        )}

        {/* Dates importantes */}
        <Grid item xs={12}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Dates importantes
            </Typography>
            <Grid container spacing={2}>
              {stats.first_appointment_date && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Premier rendez-vous
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {format(new Date(stats.first_appointment_date), 'dd MMMM yyyy', {
                      locale: fr,
                    })}
                  </Typography>
                </Grid>
              )}

              {stats.last_appointment_date && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Dernier rendez-vous
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {format(new Date(stats.last_appointment_date), 'dd MMMM yyyy', {
                      locale: fr,
                    })}
                  </Typography>
                </Grid>
              )}

              {stats.next_appointment_date && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Prochain rendez-vous
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {format(new Date(stats.next_appointment_date), 'dd MMMM yyyy à HH:mm', {
                      locale: fr,
                    })}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
