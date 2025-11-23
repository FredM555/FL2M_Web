// src/components/beneficiaries/BeneficiaryHistory.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  CircularProgress,
  Alert,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/lab';
import {
  Event as EventIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { getBeneficiaryAppointmentHistory, confirmBeneficiaryData } from '../../services/beneficiaries';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BeneficiaryHistoryProps {
  beneficiaryId: string;
  onViewAppointment?: (appointmentId: string) => void;
}

type StatusFilter = 'all' | 'completed' | 'cancelled' | 'upcoming';

/**
 * Composant historique des rendez-vous d'un bénéficiaire
 */
export const BeneficiaryHistory: React.FC<BeneficiaryHistoryProps> = ({
  beneficiaryId,
  onViewAppointment,
}) => {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    if (beneficiaryId) {
      loadAppointments();
    }
  }, [beneficiaryId]);

  const loadAppointments = async () => {
    if (!beneficiaryId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { data } = await getBeneficiaryAppointmentHistory(beneficiaryId);
      setAppointments(data || []);
    } catch (err: any) {
      console.error('Erreur lors du chargement de l\'historique:', err);
      setError(err.message || 'Erreur lors du chargement de l\'historique');
    } finally {
      setLoading(false);
    }
  };

  // Filtrer par statut
  const filteredAppointments = appointments.filter((apt) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'completed') return apt.status === 'completed';
    if (statusFilter === 'cancelled') return apt.status === 'cancelled';
    if (statusFilter === 'upcoming') {
      return apt.status === 'scheduled' && new Date(apt.start_time) > new Date();
    }
    return true;
  });

  // Obtenir l'icône selon le statut
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon />;
      case 'cancelled':
        return <CancelIcon />;
      case 'scheduled':
        return <ScheduleIcon />;
      default:
        return <EventIcon />;
    }
  };

  // Obtenir la couleur selon le statut (pour Chip)
  const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'primary' | 'default' => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      case 'scheduled':
        return 'primary';
      default:
        return 'default';
    }
  };

  // Obtenir la couleur pour TimelineDot
  const getTimelineDotColor = (status: string): 'success' | 'error' | 'warning' | 'primary' | 'grey' => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      case 'scheduled':
        return 'primary';
      default:
        return 'grey';
    }
  };

  // Obtenir le label du statut
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      scheduled: 'Programmé',
      completed: 'Terminé',
      cancelled: 'Annulé',
      no_show: 'Absent',
    };
    return labels[status] || status;
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

  return (
    <Box>
      {/* Filtres */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Historique des rendez-vous
        </Typography>

        <ToggleButtonGroup
          value={statusFilter}
          exclusive
          onChange={(_e, newFilter) => newFilter && setStatusFilter(newFilter)}
          size="small"
        >
          <ToggleButton value="all">Tous</ToggleButton>
          <ToggleButton value="upcoming">À venir</ToggleButton>
          <ToggleButton value="completed">Terminés</ToggleButton>
          <ToggleButton value="cancelled">Annulés</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Compteur */}
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {filteredAppointments.length} rendez-vous
      </Typography>

      {/* Timeline */}
      {filteredAppointments.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="body1" color="text.secondary">
            Aucun rendez-vous trouvé
          </Typography>
        </Box>
      ) : (
        <Timeline position="right">
          {filteredAppointments.map((appointment, index) => (
            <TimelineItem key={appointment.id}>
              <TimelineOppositeContent
                sx={{ flex: 0.3, py: 2, color: 'text.secondary' }}
              >
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {format(new Date(appointment.start_time), 'dd MMM yyyy', { locale: fr })}
                </Typography>
                <Typography variant="caption">
                  {format(new Date(appointment.start_time), 'HH:mm', { locale: fr })}
                </Typography>
              </TimelineOppositeContent>

              <TimelineSeparator>
                <TimelineDot color={getTimelineDotColor(appointment.status)}>
                  {getStatusIcon(appointment.status)}
                </TimelineDot>
                {index < filteredAppointments.length - 1 && <TimelineConnector />}
              </TimelineSeparator>

              <TimelineContent sx={{ py: 2 }}>
                <Paper
                  elevation={1}
                  sx={{
                    p: 2,
                    '&:hover': {
                      boxShadow: 3,
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {appointment.service?.name || 'Service'}
                      </Typography>
                      {appointment.practitioner && (
                        <Typography variant="body2" color="text.secondary">
                          avec {appointment.practitioner.first_name}{' '}
                          {appointment.practitioner.last_name}
                        </Typography>
                      )}
                    </Box>
                    <Chip
                      label={getStatusLabel(appointment.status)}
                      size="small"
                      color={getStatusColor(appointment.status)}
                      sx={{ ml: 1 }}
                    />
                  </Box>

                  {appointment.location && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      📍 {appointment.location}
                    </Typography>
                  )}

                  {onViewAppointment && (
                    <Button
                      size="small"
                      startIcon={<VisibilityIcon />}
                      onClick={() => onViewAppointment(appointment.id)}
                      sx={{ mt: 1 }}
                    >
                      Voir les détails
                    </Button>
                  )}
                </Paper>
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
      )}
    </Box>
  );
};
