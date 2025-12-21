// src/pages/Practitioner/PractitionerAppointmentsPage.tsx
import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  Grid,
  Paper,
  Typography,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Alert,
  CircularProgress,
  Tab,
  Tabs
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { getAppointments, Appointment, getAppointmentDocuments, supabase } from '../../services/supabase';
import { cancelAppointment } from '../../services/supabase-appointments';
import { getAppointmentBeneficiaries } from '../../services/beneficiaries';
import { AppointmentBeneficiary } from '../../types/beneficiary';
import { format, isPast, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import EventIcon from '@mui/icons-material/Event';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import WorkIcon from '@mui/icons-material/Work';
import PaymentIcon from '@mui/icons-material/Payment';
import CakeIcon from '@mui/icons-material/Cake';
import BadgeIcon from '@mui/icons-material/Badge';
import InfoIcon from '@mui/icons-material/Info';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import DescriptionIcon from '@mui/icons-material/Description';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SacredGeometryBackground from '../../components/SacredGeometryBackground';
import { AppointmentDetailsDialog } from '../../components/appointments/AppointmentDetailsDialog';
import { AppointmentValidationCard } from '../../components/appointments/AppointmentValidationCard';
import { logger } from '../../utils/logger';

// Interface pour la valeur de l'onglet
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`appointment-tabpanel-${index}`}
      aria-labelledby={`appointment-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const PractitionerAppointmentsPage = () => {
  const { user, profile } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [practitionerId, setPractitionerId] = useState<string | null>(null);

  // États pour la gestion des dialogues
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [appointmentBeneficiaries, setAppointmentBeneficiaries] = useState<Record<string, AppointmentBeneficiary[]>>({});
  const [documentsCounts, setDocumentsCounts] = useState<Record<string, number>>({});

  // Chargement des bénéficiaires pour un rendez-vous
  useEffect(() => {
    const loadBeneficiaries = async () => {
      const beneficiariesData: Record<string, AppointmentBeneficiary[]> = {};

      for (const appointment of appointments) {
        try {
          const { data } = await getAppointmentBeneficiaries(appointment.id);
          if (data && data.length > 0) {
            beneficiariesData[appointment.id] = data;
          }
        } catch (error) {
          logger.error(`Erreur lors du chargement des bénéficiaires pour le RDV ${appointment.id}:`, error);
        }
      }

      setAppointmentBeneficiaries(beneficiariesData);
    };

    if (appointments.length > 0) {
      loadBeneficiaries();
    }
  }, [appointments]);

  // Chargement du nombre de documents pour chaque rendez-vous
  useEffect(() => {
    const loadDocumentsCounts = async () => {
      const counts: Record<string, number> = {};

      for (const appointment of appointments) {
        try {
          const { data } = await getAppointmentDocuments(appointment.id);
          counts[appointment.id] = data?.length || 0;
        } catch (error) {
          logger.error(`Erreur lors du chargement des documents pour le RDV ${appointment.id}:`, error);
        }
      }

      setDocumentsCounts(counts);
    };

    if (appointments.length > 0) {
      loadDocumentsCounts();
    }
  }, [appointments]);

  // Chargement des rendez-vous professionnels
  const loadAppointments = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Récupérer le practitioner_id
      const { data: practitionerData } = await supabase
        .from('practitioners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (practitionerData) {
        setPractitionerId(practitionerData.id);

        // Charger uniquement les rendez-vous où l'utilisateur est intervenant avec un client assigné
        const { data, error } = await supabase
          .from('appointments')
          .select(`
            *,
            client:profiles!client_id(*),
            practitioner:practitioners!practitioner_id(
              *,
              profile:profiles(*)
            ),
            service:services(*)
          `)
          .eq('practitioner_id', practitionerData.id)
          .not('client_id', 'is', null)
          .order('start_time', { ascending: true });

        if (error) throw error;
        setAppointments(data || []);
      } else {
        setAppointments([]);
      }
    } catch (error) {
      logger.error('Erreur lors du chargement des rendez-vous:', error);
      setError('Erreur lors du chargement des rendez-vous');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [user, profile]);

  // Filtrage des rendez-vous selon l'onglet
  const filteredAppointments = () => {
    switch (tabValue) {
      case 0: // À préparer (confirmés + payés, futurs uniquement)
        return appointments.filter(
          appointment =>
            appointment.status === 'confirmed' &&
            appointment.payment_status === 'paid' &&
            !isPast(parseISO(appointment.start_time))
        );
      case 1: // En cours (completed + issue_reported)
        return appointments.filter(
          appointment =>
            appointment.status === 'completed' ||
            appointment.status === 'issue_reported'
        );
      case 2: // Passés
        return appointments.filter(
          appointment => {
            if (appointment.status === 'validated') return true;
            return isPast(parseISO(appointment.start_time)) &&
                   (appointment.status === 'confirmed' || appointment.status === 'pending');
          }
        );
      case 3: // Annulés
        return appointments.filter(appointment => appointment.status === 'cancelled');
      default:
        return appointments;
    }
  };

  // Comptages
  const getToValidateCount = () => {
    return appointments.filter(
      appointment =>
        appointment.status === 'completed' ||
        appointment.status === 'issue_reported'
    ).length;
  };

  const getToPrepareCount = () => {
    return appointments.filter(
      appointment =>
        appointment.status === 'confirmed' &&
        appointment.payment_status === 'paid' &&
        !isPast(parseISO(appointment.start_time))
    ).length;
  };

  // Changement d'onglet
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Ouverture de la boîte de dialogue d'annulation
  const handleOpenCancelDialog = (appointment: Appointment) => {
    setAppointmentToCancel(appointment);
    setCancelDialogOpen(true);
  };

  // Fermeture de la boîte de dialogue d'annulation
  const handleCloseCancelDialog = () => {
    setCancelDialogOpen(false);
    setAppointmentToCancel(null);
    setCancelReason('');
  };

  // Confirmation de l'annulation
  const handleConfirmCancel = async () => {
    if (!appointmentToCancel || !user) return;

    setCancelLoading(true);
    try {
      // Pour les intervenants, on garde le record (keepRecord = true)
      const isPaid = appointmentToCancel.payment_status === 'paid';
      const userRole = profile?.user_type === 'admin'
        ? 'admin'
        : profile?.user_type === 'intervenant'
        ? 'intervenant'
        : 'client';

      await cancelAppointment(appointmentToCancel.id, isPaid, user.id, userRole);
      await loadAppointments();
      handleCloseCancelDialog();
    } catch (error) {
      logger.error('Erreur lors de l\'annulation du rendez-vous:', error);
      setError('Erreur lors de l\'annulation du rendez-vous');
    } finally {
      setCancelLoading(false);
    }
  };

  // Ouverture du dialogue de détails
  const handleOpenDetailsDialog = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
  };

  // Fermeture du dialogue de détails
  const handleCloseDetailsDialog = () => {
    setSelectedAppointment(null);
  };

  // Fonctions d'aide pour les statuts
  const getStatusColor = (status: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'confirmed':
        return 'info';
      case 'completed':
        return 'primary';
      case 'cancelled':
        return 'error';
      case 'validated':
        return 'success';
      case 'issue_reported':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'confirmed':
        return 'Confirmé';
      case 'completed':
        return 'Terminé';
      case 'cancelled':
        return 'Annulé';
      case 'validated':
        return 'Validé';
      case 'issue_reported':
        return 'Problème signalé';
      default:
        return status;
    }
  };

  const getPaymentStatusColor = (status: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
        return 'error';
      case 'unpaid':
        return 'default';
      case 'refunded':
        return 'info';
      default:
        return 'default';
    }
  };

  const getPaymentStatusLabel = (status: string): string => {
    switch (status) {
      case 'paid':
        return 'Payé';
      case 'pending':
        return 'En attente';
      case 'failed':
        return 'Échec';
      case 'unpaid':
        return 'Non payé';
      case 'refunded':
        return 'Remboursé';
      default:
        return status;
    }
  };

  // Rendu d'une carte de rendez-vous (vue professionnelle)
  const renderAppointmentCard = (appointment: Appointment, showCancelButton: boolean = false) => (
    <Grid item xs={12} md={6} key={appointment.id}>
      <Card
        elevation={0}
        sx={{
          height: '100%',
          background: 'white',
          border: '2px solid rgba(255, 165, 0, 0.3)',
          borderRadius: 3,
          position: 'relative',
          overflow: 'hidden',
          transition: 'all 0.3s ease',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #FFA500, #FF8C00)',
          },
          '&:hover': {
            borderColor: '#FFA500',
            boxShadow: '0 12px 40px rgba(255, 165, 0, 0.25)',
            transform: 'translateY(-4px)',
          },
        }}
      >
        <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
              gap: { xs: 1.5, sm: 0 },
              mb: 2
            }}
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a1a2e', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                {appointment.service?.name}
              </Typography>
              {appointment.unique_code && (
                <Chip
                  label={`Code: ${appointment.unique_code}`}
                  size="small"
                  sx={{
                    mt: 0.5,
                    backgroundColor: 'rgba(255, 165, 0, 0.1)',
                    color: '#FFA500',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    fontFamily: 'monospace'
                  }}
                />
              )}
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={getStatusLabel(appointment.status)}
                color={getStatusColor(appointment.status)}
                size="small"
              />
              {appointment.payment_status && (
                <Chip
                  label={getPaymentStatusLabel(appointment.payment_status)}
                  color={getPaymentStatusColor(appointment.payment_status)}
                  size="small"
                />
              )}
            </Box>
          </Box>

          <Divider sx={{ mb: 2, borderColor: 'rgba(255, 165, 0, 0.2)' }} />

          <Grid container spacing={{ xs: 1.5, sm: 2 }}>
            <Grid item xs={12} sm={6}>
              <Box display="flex" alignItems="center" mb={{ xs: 1.5, sm: 1 }}>
                <EventIcon fontSize="small" sx={{ mr: 1, color: '#FFA500', fontSize: { xs: '1.1rem', sm: '1.25rem' } }} />
                <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' } }}>
                  {format(parseISO(appointment.start_time), 'EEEE d MMMM yyyy', { locale: fr })}
                </Typography>
              </Box>

              <Box display="flex" alignItems="center" mb={{ xs: 1.5, sm: 1 }}>
                <AccessTimeIcon fontSize="small" sx={{ mr: 1, color: '#FFA500', fontSize: { xs: '1.1rem', sm: '1.25rem' } }} />
                <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' } }}>
                  {format(parseISO(appointment.start_time), 'HH:mm', { locale: fr })}
                  {' - '}
                  {format(parseISO(appointment.end_time), 'HH:mm', { locale: fr })}
                </Typography>
              </Box>

              <Box display="flex" alignItems="center" mb={{ xs: 1.5, sm: 1 }}>
                <WorkIcon fontSize="small" sx={{ mr: 1, color: '#FFA500', fontSize: { xs: '1.1rem', sm: '1.25rem' } }} />
                <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' } }}>
                  {appointment.service?.duration} minutes
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6}>
              {/* Client */}
              {appointment.client && (
                <Box display="flex" alignItems="center" mb={{ xs: 1.5, sm: 1 }}>
                  <PersonIcon fontSize="small" sx={{ mr: 1, color: '#2196F3', fontSize: { xs: '1.1rem', sm: '1.25rem' } }} />
                  <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' }, fontWeight: 600 }}>
                    Client : {appointment.client.first_name} {appointment.client.last_name}
                  </Typography>
                </Box>
              )}

              {/* Bénéficiaires */}
              {appointmentBeneficiaries[appointment.id] && appointmentBeneficiaries[appointment.id].length > 0 ? (
                <>
                  <Box display="flex" alignItems="center" mb={{ xs: 1.5, sm: 1 }}>
                    <PersonIcon fontSize="small" sx={{ mr: 1, color: '#FFA500', fontSize: { xs: '1.1rem', sm: '1.25rem' } }} />
                    <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' } }}>
                      Bénéficiaire(s) : {appointmentBeneficiaries[appointment.id].map(ab => ab.beneficiary ? `${ab.beneficiary.first_name} ${ab.beneficiary.last_name}` : 'Bénéficiaire').join(', ')}
                    </Typography>
                    {appointmentBeneficiaries[appointment.id].length > 1 && (
                      <Chip
                        label={`${appointmentBeneficiaries[appointment.id].length} personnes`}
                        size="small"
                        sx={{ ml: 1, height: '20px', fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                  {appointmentBeneficiaries[appointment.id][0]?.beneficiary?.birth_date && (
                    <Box display="flex" alignItems="center" mb={{ xs: 1.5, sm: 1 }}>
                      <CakeIcon fontSize="small" sx={{ mr: 1, color: '#FFA500', fontSize: { xs: '1.1rem', sm: '1.25rem' } }} />
                      <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' } }}>
                        {format(parseISO(appointmentBeneficiaries[appointment.id][0]?.beneficiary?.birth_date || ''), 'dd/MM/yyyy', { locale: fr })}
                      </Typography>
                    </Box>
                  )}
                </>
              ) : (
                appointment.beneficiary_first_name && (
                  <>
                    <Box display="flex" alignItems="center" mb={{ xs: 1.5, sm: 1 }}>
                      <PersonIcon fontSize="small" sx={{ mr: 1, color: '#FFA500', fontSize: { xs: '1.1rem', sm: '1.25rem' } }} />
                      <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' } }}>
                        Bénéficiaire : {appointment.beneficiary_first_name} {appointment.beneficiary_last_name}
                      </Typography>
                    </Box>
                    {appointment.beneficiary_birth_date && (
                      <Box display="flex" alignItems="center" mb={{ xs: 1.5, sm: 1 }}>
                        <CakeIcon fontSize="small" sx={{ mr: 1, color: '#FFA500', fontSize: { xs: '1.1rem', sm: '1.25rem' } }} />
                        <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' } }}>
                          {format(parseISO(appointment.beneficiary_birth_date), 'dd/MM/yyyy', { locale: fr })}
                        </Typography>
                      </Box>
                    )}
                  </>
                )
              )}

              {(() => {
                const price = appointment.custom_price ?? appointment.service?.price;
                return price !== 9999 && (
                  <Box display="flex" alignItems="center" mb={{ xs: 1.5, sm: 1 }}>
                    <PaymentIcon fontSize="small" sx={{ mr: 1, color: '#FFA500', fontSize: { xs: '1.1rem', sm: '1.25rem' } }} />
                    <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' } }}>
                      {price ? `${price} €` : 'Prix non défini'}
                    </Typography>
                  </Box>
                );
              })()}
            </Grid>
          </Grid>

          {/* Informations supplémentaires */}
          {(appointment.meeting_link || appointment.notes || documentsCounts[appointment.id] > 0) && (
            <>
              <Divider sx={{ my: 2, borderColor: 'rgba(255, 165, 0, 0.2)' }} />
              <Grid container spacing={1}>
                {appointment.meeting_link && (
                  <Grid item xs={12}>
                    <Box display="flex" alignItems="center">
                      <VideoCallIcon fontSize="small" sx={{ mr: 1, color: '#FFA500', fontSize: { xs: '1.1rem', sm: '1.25rem' } }} />
                      <Button
                        size="small"
                        href={appointment.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          fontSize: { xs: '0.75rem', sm: '0.8rem' },
                          textTransform: 'none',
                          color: '#FFA500',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 165, 0, 0.08)',
                          },
                        }}
                      >
                        Rejoindre la visio
                      </Button>
                    </Box>
                  </Grid>
                )}
                {appointment.notes && (
                  <Grid item xs={12}>
                    <Box display="flex" alignItems="flex-start">
                      <InfoIcon fontSize="small" sx={{ mr: 1, color: '#FFA500', mt: 0.3, fontSize: { xs: '1.1rem', sm: '1.25rem' } }} />
                      <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem' }, color: 'text.secondary' }}>
                        {appointment.notes}
                      </Typography>
                    </Box>
                  </Grid>
                )}
                {documentsCounts[appointment.id] > 0 && (
                  <Grid item xs={12}>
                    <Box display="flex" alignItems="center">
                      <DescriptionIcon fontSize="small" sx={{ mr: 1, color: '#FFA500', fontSize: { xs: '1.1rem', sm: '1.25rem' } }} />
                      <Typography variant="body2" sx={{ fontSize: { xs: '0.75rem', sm: '0.8rem' } }}>
                        {documentsCounts[appointment.id]} document(s) associé(s)
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </>
          )}

          {/* Actions */}
          <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => handleOpenDetailsDialog(appointment)}
              sx={{
                fontSize: { xs: '0.75rem', sm: '0.8rem' },
                borderColor: '#FFA500',
                color: '#FFA500',
                '&:hover': {
                  borderColor: '#FF8C00',
                  backgroundColor: 'rgba(255, 165, 0, 0.08)',
                },
              }}
            >
              Voir détails
            </Button>
            {showCancelButton && appointment.status !== 'cancelled' && (
              <Button
                variant="outlined"
                size="small"
                color="error"
                onClick={() => handleOpenCancelDialog(appointment)}
                sx={{
                  fontSize: { xs: '0.75rem', sm: '0.8rem' },
                }}
              >
                Annuler
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', position: 'relative', minHeight: '100vh' }}>
      {/* Image de fond - mes rendez-vous */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          backgroundImage: {
            xs: 'none',
            md: 'url(/images/MesRendezVous.jpg)'
          },
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.7,
          pointerEvents: 'none',
        }}
      />
      {/* Overlay pour adoucir l'image */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          background: 'linear-gradient(180deg, rgba(248, 249, 250, 0.3) 0%, rgba(233, 236, 239, 0.35) 50%, rgba(222, 226, 230, 0.4) 100%)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          background: 'rgba(245, 247, 250, 0.6)',
          backdropFilter: 'blur(2px)',
          py: { xs: 2, md: 4 },
          mt: { xs: '80px', md: '40px' },
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              position: 'relative',
              overflow: 'hidden',
              mb: 1,
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
            }}
          >
            <Box
              sx={{
                background: 'linear-gradient(135deg, #345995 0%, #1D3461 100%)',
                color: 'white',
                p: 3,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <SacredGeometryBackground theme="particuliers" />
              <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
                <Typography
                  variant="h2"
                  component="h1"
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: '1.5rem', md: '2.5rem' },
                    textAlign: 'center',
                    background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 2px 8px rgba(255, 215, 0, 0.3))',
                    mb: 1,
                  }}
                >
                  Mes rendez-vous
                </Typography>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 400,
                    color: 'rgba(255, 255, 255, 0.9)',
                    lineHeight: 1.7,
                    textAlign: 'center',
                    maxWidth: '800px',
                    mx: 'auto',
                  }}
                >
                  Gérez vos rendez-vous facilement
                </Typography>
              </Container>
            </Box>
          </Box>

        <Box
          sx={{
            py: 0
          }}
        >
          <Container maxWidth="lg">
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* ==================== RENDEZ-VOUS PROFESSIONNELS ==================== */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, md: 3 },
              mb: 4,
              background: 'white',
              border: '2px solid rgba(52, 89, 149, 0.3)',
              borderRadius: 3,
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #345995, #1D3461)',
              },
            }}
          >
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 700, color: '#345995' }}>
              📅 Mes rendez-vous (en tant qu'intervenant)
            </Typography>

            <Box sx={{ borderBottom: 2, borderColor: 'rgba(52, 89, 149, 0.2)', mb: 1 }}>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                aria-label="professional appointment tabs"
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  '& .MuiTab-root': {
                    color: '#1a1a2e',
                    fontWeight: 600,
                    '&.Mui-selected': {
                      color: '#345995',
                    },
                  },
                  '& .MuiTabs-indicator': {
                    backgroundColor: '#345995',
                    height: 3,
                  },
                }}
              >
                <Tab
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      À préparer
                      {getToPrepareCount() > 0 && (
                        <Chip
                          label={getToPrepareCount()}
                          size="small"
                          sx={{
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            fontWeight: 700,
                            height: '20px',
                            minWidth: '20px',
                            '& .MuiChip-label': {
                              px: 0.75,
                            },
                          }}
                        />
                      )}
                    </Box>
                  }
                />
                <Tab
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      En cours
                      {getToValidateCount() > 0 && (
                        <Chip
                          label={getToValidateCount()}
                          size="small"
                          sx={{
                            backgroundColor: '#FF6B00',
                            color: 'white',
                            fontWeight: 700,
                            height: '20px',
                            minWidth: '20px',
                            '& .MuiChip-label': {
                              px: 0.75,
                            },
                          }}
                        />
                      )}
                    </Box>
                  }
                />
                <Tab label="Passés" />
                <Tab label="Annulés" />
              </Tabs>
            </Box>

            {/* Onglet "À préparer" */}
            <TabPanel value={tabValue} index={0}>
              {filteredAppointments().length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <AssignmentIcon sx={{ fontSize: 60, color: 'rgba(0,0,0,0.2)', mb: 2 }} />
                  <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                    Vous n'avez pas de rendez-vous à préparer
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                    Les rendez-vous confirmés et payés apparaîtront ici.
                  </Typography>
                </Box>
              ) : (
                <>
                  <Alert severity="info" sx={{ mb: 3 }}>
                    <Typography variant="body2">
                      <strong>Rendez-vous à préparer</strong> - Ces rendez-vous sont confirmés et payés. Vous pouvez consulter les informations des clients et bénéficiaires.
                    </Typography>
                  </Alert>
                  <Grid container spacing={3}>
                    {filteredAppointments().map((appointment) =>
                      renderAppointmentCard(appointment, false)
                    )}
                  </Grid>
                </>
              )}
            </TabPanel>

            {/* Onglet "En cours" */}
            <TabPanel value={tabValue} index={1}>
              {filteredAppointments().length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                    Vous n'avez pas de rendez-vous en cours
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                    Les rendez-vous terminés et à valider apparaîtront ici.
                  </Typography>
                </Box>
              ) : (
                <Box>
                  {filteredAppointments().map((appointment) => (
                    <Box key={appointment.id} sx={{ mb: 3 }}>
                      <AppointmentValidationCard
                        appointment={appointment}
                        onValidated={() => {
                          loadAppointments();
                        }}
                        onViewDetails={() => handleOpenDetailsDialog(appointment)}
                      />
                    </Box>
                  ))}
                </Box>
              )}
            </TabPanel>

            {/* Onglet "Passés" */}
            <TabPanel value={tabValue} index={2}>
              {filteredAppointments().length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                    Vous n'avez pas de rendez-vous passés
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={3}>
                  {filteredAppointments().map((appointment) =>
                    renderAppointmentCard(appointment, false)
                  )}
                </Grid>
              )}
            </TabPanel>

            {/* Onglet "Annulés" */}
            <TabPanel value={tabValue} index={3}>
              {filteredAppointments().length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                    Vous n'avez pas de rendez-vous annulés
                  </Typography>
                </Box>
              ) : (
                <Grid container spacing={3}>
                  {filteredAppointments().map((appointment) =>
                    renderAppointmentCard(appointment, false)
                  )}
                </Grid>
              )}
            </TabPanel>
          </Paper>
          </Container>
        </Box>
        </Container>
      </Box>

      {/* Boîte de dialogue de confirmation d'annulation */}
      <Dialog
        open={cancelDialogOpen}
        onClose={cancelLoading ? undefined : handleCloseCancelDialog}
        aria-labelledby="cancel-dialog-title"
        aria-describedby="cancel-dialog-description"
      >
        <DialogTitle id="cancel-dialog-title">
          Confirmer l'annulation
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="cancel-dialog-description">
            Êtes-vous sûr de vouloir annuler ce rendez-vous ? Cette action est irréversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCancelDialog} disabled={cancelLoading}>
            Non, garder
          </Button>
          <Button
            onClick={handleConfirmCancel}
            color="error"
            variant="contained"
            disabled={cancelLoading}
            autoFocus
          >
            {cancelLoading ? <CircularProgress size={24} /> : 'Oui, annuler'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialogue de détails du rendez-vous */}
      {selectedAppointment && (
        <AppointmentDetailsDialog
          appointment={selectedAppointment}
          open={!!selectedAppointment}
          onClose={handleCloseDetailsDialog}
        />
      )}
    </Box>
  );
};

export default PractitionerAppointmentsPage;
