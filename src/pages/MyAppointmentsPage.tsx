// src/pages/MyAppointmentsPage.tsx
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
import { useAuth } from '../context/AuthContext';
import { getAppointments, Appointment, getAppointmentDocuments, supabase } from '../services/supabase';
import { cancelAppointment } from '../services/supabase-appointments';
import { getAppointmentBeneficiaries } from '../services/beneficiaries';
import { AppointmentBeneficiary } from '../types/beneficiary';
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
import SacredGeometryBackground from '../components/SacredGeometryBackground';
import { AppointmentDetailsDialog } from '../components/appointments/AppointmentDetailsDialog';
import { AppointmentValidationCard } from '../components/appointments/AppointmentValidationCard';
import { logger } from '../utils/logger';

// Interface pour la valeur de l'onglet
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Composant TabPanel
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const MyAppointmentsPage = () => {
  const { user, profile } = useAuth();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [appointmentBeneficiaries, setAppointmentBeneficiaries] = useState<Record<string, AppointmentBeneficiary[]>>({});
  const [documentsCounts, setDocumentsCounts] = useState<Record<string, number>>({});

  // Chargement des rendez-vous
  const loadAppointments = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let data, error;

      // Si l'utilisateur est admin ou intervenant, charger les rendez-vous par practitioner_id
      if (profile?.user_type === 'admin' || profile?.user_type === 'intervenant') {
        // Récupérer le practitioner_id depuis le profile
        const { data: practitionerData } = await supabase
          .from('practitioners')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (practitionerData) {
          const response = await supabase
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
            .order('start_time', { ascending: true });

          data = response.data;
          error = response.error;
        } else {
          // Si pas de practitioner trouvé, charger les rendez-vous comme client
          const response = await getAppointments(user.id);
          data = response.data;
          error = response.error;
        }
      } else {
        // Pour les clients, charger les rendez-vous par client_id
        const response = await getAppointments(user.id);
        data = response.data;
        error = response.error;
      }

      if (error) throw error;
      setAppointments(data || []);

      // Charger les bénéficiaires et documents pour chaque rendez-vous
      if (data && data.length > 0) {
        const beneficiariesMap: Record<string, AppointmentBeneficiary[]> = {};

        const documentsCountMap: Record<string, number> = {};

        await Promise.all(
          data.map(async (appointment) => {
            try {
              // Charger les bénéficiaires
              const { data: beneficiaries } = await getAppointmentBeneficiaries(appointment.id);
              if (beneficiaries && beneficiaries.length > 0) {
                beneficiariesMap[appointment.id] = beneficiaries;
              }

              // Charger le compteur de documents
              const { data: documents } = await getAppointmentDocuments(appointment.id);
              documentsCountMap[appointment.id] = documents?.length || 0;
            } catch (err) {
              logger.error(`Erreur lors du chargement des données pour le RDV ${appointment.id}:`, err);
            }
          })
        );

        setAppointmentBeneficiaries(beneficiariesMap);
        setDocumentsCounts(documentsCountMap);
      }
    } catch (error: any) {
      setError('Erreur lors du chargement des rendez-vous: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [user, profile]);

  // Comptage des rendez-vous en cours (completed + issue_reported)
  const getToValidateCount = () => {
    return appointments.filter(
      appointment =>
        appointment.status === 'completed' ||
        appointment.status === 'issue_reported'
    ).length;
  };

  // Comptage des rendez-vous à préparer (pour les intervenants)
  const getToPrepareCount = () => {
    return appointments.filter(
      appointment =>
        appointment.status === 'confirmed' &&
        appointment.payment_status === 'paid' &&
        !isPast(parseISO(appointment.start_time))
    ).length;
  };

  // Vérifier si l'utilisateur est un intervenant ou un admin
  const isIntervenant = profile?.user_type === 'intervenant' || profile?.user_type === 'admin';

  // Filtrage des rendez-vous selon l'onglet sélectionné
  const filteredAppointments = () => {
    // Si c'est un intervenant, les index sont décalés
    const adjustedTabValue = isIntervenant ? tabValue : tabValue;

    // Pour les intervenants, l'onglet 0 est "À préparer"
    if (isIntervenant && tabValue === 0) {
      // À préparer: Rendez-vous confirmés ET payés (futurs uniquement)
      return appointments.filter(
        appointment =>
          appointment.status === 'confirmed' &&
          appointment.payment_status === 'paid' &&
          !isPast(parseISO(appointment.start_time))
      );
    }

    // Ajuster l'index pour les intervenants (décalé de 1)
    const effectiveTab = isIntervenant ? tabValue - 1 : tabValue;

    switch (effectiveTab) {
      case 0: // À venir (pending/confirmed dans le futur)
        return appointments.filter(
          appointment =>
            !isPast(parseISO(appointment.start_time)) &&
            (appointment.status === 'pending' || appointment.status === 'confirmed')
        );
      case 1: // En cours (completed + issue_reported)
        return appointments.filter(
          appointment =>
            appointment.status === 'completed' ||
            appointment.status === 'issue_reported'
        );
      case 2: // Passés (validated + confirmed/pending passés)
        return appointments.filter(
          appointment => {
            // RDV validés
            if (appointment.status === 'validated') return true;
            // RDV passés qui ne sont pas cancelled, completed ou issue_reported
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

  // Ouverture de la boîte de dialogue d'annulation
  const handleOpenCancelDialog = (appointment: Appointment) => {
    setAppointmentToCancel(appointment);
    setCancelDialogOpen(true);
  };

  // Fermeture de la boîte de dialogue d'annulation
  const handleCloseCancelDialog = () => {
    setCancelDialogOpen(false);
    setAppointmentToCancel(null);
  };

  // Annulation du rendez-vous avec la nouvelle logique
  const handleCancelAppointment = async () => {
    if (!appointmentToCancel || !user) return;

    setCancelLoading(true);
    try {
      const isPaid = appointmentToCancel.payment_status === 'paid';

      // Déterminer le rôle de l'utilisateur
      const userRole = profile?.user_type === 'admin'
        ? 'admin'
        : profile?.user_type === 'intervenant'
        ? 'intervenant'
        : 'client';

      const { success, error: cancelError, action, canReschedule } = await cancelAppointment(
        appointmentToCancel.id,
        isPaid,
        user.id,
        userRole
      );

      if (!success || cancelError) {
        // Si c'est un intervenant qui ne peut pas annuler, afficher un message personnalisé
        if (canReschedule && userRole === 'intervenant') {
          throw new Error('Vous ne pouvez pas annuler un rendez-vous payé. Vous pouvez cependant le déplacer en contactant l\'administrateur.');
        }
        throw cancelError || new Error('Erreur lors de l\'annulation');
      }

      setAppointments(prevAppointments =>
        prevAppointments.map(appointment =>
          appointment.id === appointmentToCancel.id
            ? { ...appointment, status: 'cancelled' }
            : appointment
        )
      );

      if (action === 'released') {
        setError('');
        loadAppointments();
      }

      handleCloseCancelDialog();
    } catch (err: any) {
      setError('Erreur lors de l\'annulation du rendez-vous: ' + (err.message || err));
    } finally {
      setCancelLoading(false);
    }
  };

  // Changement d'onglet
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Ouverture du dialogue de détails
  const handleOpenDetailsDialog = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setDetailsDialogOpen(true);
  };

  // Fermeture du dialogue de détails
  const handleCloseDetailsDialog = () => {
    setDetailsDialogOpen(false);
    setSelectedAppointment(null);
  };

  // Mise à jour du rendez-vous depuis le dialog
  const handleAppointmentUpdate = (updatedAppointment: Appointment) => {
    // Mettre à jour le rendez-vous sélectionné
    setSelectedAppointment(updatedAppointment);

    // Mettre à jour le rendez-vous dans la liste
    setAppointments(prevAppointments =>
      prevAppointments.map(appointment =>
        appointment.id === updatedAppointment.id ? updatedAppointment : appointment
      )
    );
  };

  // Obtention de la couleur de la puce d'état
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'confirmed':
        return 'success';
      case 'cancelled':
        return 'error';
      case 'completed':
        return 'info';
      case 'validated':
        return 'success';
      case 'issue_reported':
        return 'error';
      default:
        return 'default';
    }
  };

  // Obtention du libellé de l'état
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'confirmed':
        return 'Confirmé';
      case 'cancelled':
        return 'Annulé';
      case 'completed':
        return 'Terminé';
      case 'validated':
        return 'Validé ✓';
      case 'issue_reported':
        return 'Problème signalé';
      default:
        return status;
    }
  };

  // Obtention de la couleur de la puce de paiement
  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'unpaid':
        return 'warning';
      case 'refunded':
        return 'info';
      default:
        return 'default';
    }
  };

  // Obtention du libellé du paiement
  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Payé';
      case 'unpaid':
        return 'Non payé';
      case 'refunded':
        return 'Remboursé';
      default:
        return status;
    }
  };

  // Rendu d'une carte de rendez-vous
  const renderAppointmentCard = (appointment: Appointment, showCancelButton: boolean = false) => (
    <Grid item xs={12} md={6} key={appointment.id}>
      <Card
        elevation={0}
        sx={{
          height: '100%',
          background: 'white',
          border: '2px solid rgba(255, 215, 0, 0.3)',
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
            background: 'linear-gradient(90deg, #FFD700, #FFA500)',
          },
          '&:hover': {
            borderColor: '#FFA500',
            boxShadow: '0 12px 40px rgba(255, 215, 0, 0.25)',
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
                    backgroundColor: 'rgba(52, 89, 149, 0.1)',
                    color: '#345995',
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

          <Divider sx={{ mb: 2, borderColor: 'rgba(255, 215, 0, 0.2)' }} />

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
                <BadgeIcon fontSize="small" sx={{ mr: 1, color: '#FFA500', fontSize: { xs: '1.1rem', sm: '1.25rem' } }} />
                <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' } }}>
                  Séance avec {appointment.practitioner?.profile?.pseudo || 'Intervenant'}
                  {appointment.practitioner?.title && ` - ${appointment.practitioner.title}`}
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
              {/* Affichage des bénéficiaires - nouvelle architecture */}
              {appointmentBeneficiaries[appointment.id] && appointmentBeneficiaries[appointment.id].length > 0 ? (
                <>
                  <Box display="flex" alignItems="center" mb={{ xs: 1.5, sm: 1 }}>
                    <PersonIcon fontSize="small" sx={{ mr: 1, color: '#FFA500', fontSize: { xs: '1.1rem', sm: '1.25rem' } }} />
                    <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' } }}>
                      {appointmentBeneficiaries[appointment.id].map(ab => ab.beneficiary ? `${ab.beneficiary.first_name} ${ab.beneficiary.last_name}` : 'Bénéficiaire').join(', ')}
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
                /* Fallback vers l'ancienne architecture */
                <>
                  <Box display="flex" alignItems="center" mb={{ xs: 1.5, sm: 1 }}>
                    <PersonIcon fontSize="small" sx={{ mr: 1, color: '#FFA500', fontSize: { xs: '1.1rem', sm: '1.25rem' } }} />
                    <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' } }}>
                      {appointment.beneficiary_first_name || appointment.client?.first_name}{' '}
                      {appointment.beneficiary_last_name || appointment.client?.last_name}
                    </Typography>
                  </Box>

                  {(appointment.beneficiary_birth_date || appointment.client?.birth_date) && (
                    <Box display="flex" alignItems="center" mb={{ xs: 1.5, sm: 1 }}>
                      <CakeIcon fontSize="small" sx={{ mr: 1, color: '#FFA500', fontSize: { xs: '1.1rem', sm: '1.25rem' } }} />
                      <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' } }}>
                        {format(parseISO(appointment.beneficiary_birth_date || appointment.client!.birth_date!), 'dd/MM/yyyy', { locale: fr })}
                      </Typography>
                    </Box>
                  )}
                </>
              )}

              {(() => {
                const price = appointment.custom_price ?? appointment.service?.price;
                return price !== 9999 && (
                  <Box display="flex" alignItems="center" mb={{ xs: 1.5, sm: 1 }}>
                    <PaymentIcon fontSize="small" sx={{ mr: 1, color: '#FFA500', fontSize: { xs: '1.1rem', sm: '1.25rem' } }} />
                    <Typography variant="body2" sx={{ fontWeight: 600, color: appointment.custom_price ? 'primary.main' : '#FFA500', fontSize: { xs: '0.85rem', sm: '0.875rem' } }}>
                      {price} €{appointment.custom_price ? ' (personnalisé)' : ''}
                    </Typography>
                  </Box>
                );
              })()}

              {/* Compteur de documents */}
              <Box display="flex" alignItems="center">
                <DescriptionIcon fontSize="small" sx={{ mr: 1, color: '#FFA500', fontSize: { xs: '1.1rem', sm: '1.25rem' } }} />
                <Typography variant="body2" sx={{ fontSize: { xs: '0.85rem', sm: '0.875rem' } }}>
                  {documentsCounts[appointment.id] || 0} document{(documentsCounts[appointment.id] || 0) > 1 ? 's' : ''}
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Box
            mt={2}
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: { xs: 1.5, sm: 2 }
            }}
          >
            {appointment.meeting_link && (
              <Button
                variant="contained"
                startIcon={<VideoCallIcon sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }} />}
                onClick={() => window.open(appointment.meeting_link, '_blank', 'noopener,noreferrer')}
                fullWidth
                sx={{
                  borderRadius: 2,
                  fontWeight: 600,
                  py: { xs: 1.5, sm: 1 },
                  fontSize: { xs: '0.9rem', sm: '0.875rem' },
                  background: 'linear-gradient(45deg, #4CAF50, #45a049)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #45a049, #4CAF50)',
                  },
                }}
              >
                Rejoindre
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<InfoIcon sx={{ fontSize: { xs: '1rem', sm: '1.25rem' } }} />}
              onClick={() => handleOpenDetailsDialog(appointment)}
              fullWidth
              sx={{
                borderRadius: 2,
                fontWeight: 600,
                py: { xs: 1.5, sm: 1 },
                fontSize: { xs: '0.9rem', sm: '0.875rem' },
                borderColor: '#FFA500',
                color: '#FFA500',
                '&:hover': {
                  borderColor: '#FF8C00',
                  backgroundColor: 'rgba(255, 165, 0, 0.08)',
                },
              }}
            >
              Détails
            </Button>
            {showCancelButton &&
             appointment.status !== 'cancelled' &&
             !isPast(parseISO(appointment.start_time)) &&
             (appointment.payment_status !== 'paid' || profile?.user_type === 'admin') && (
              <Button
                variant="outlined"
                color="error"
                onClick={() => handleOpenCancelDialog(appointment)}
                fullWidth
                sx={{
                  borderRadius: 2,
                  fontWeight: 600,
                  py: { xs: 1.5, sm: 1 },
                  fontSize: { xs: '0.9rem', sm: '0.875rem' },
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

  if (loading && appointments.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: 'center',
            background: 'white',
            border: '2px solid rgba(255, 215, 0, 0.3)',
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
              background: 'linear-gradient(90deg, #FFD700, #FFA500)',
            },
          }}
        >
          <CircularProgress sx={{ color: '#FFA500' }} />
          <Typography variant="h6" sx={{ mt: 2, color: '#1a1a2e' }}>
            Chargement de vos rendez-vous...
          </Typography>
        </Paper>
      </Container>
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
          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, md: 3 },
              background: 'white',
              border: '2px solid rgba(255, 215, 0, 0.3)',
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
                background: 'linear-gradient(90deg, #FFD700, #FFA500)',
              },
            }}
          >
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Box sx={{ borderBottom: 2, borderColor: 'rgba(255, 215, 0, 0.2)', mb: 1 }}>
              <Tabs
                value={tabValue}
                onChange={handleTabChange}
                aria-label="appointment tabs"
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  '& .MuiTab-root': {
                    color: '#1a1a2e',
                    fontWeight: 600,
                    '&.Mui-selected': {
                      color: '#FFA500',
                    },
                  },
                  '& .MuiTabs-indicator': {
                    backgroundColor: '#FFA500',
                    height: 3,
                  },
                }}
              >
                {isIntervenant && (
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
                )}
                <Tab label="À venir" />
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

            {/* Onglet "À préparer" pour les intervenants */}
            {isIntervenant && (
              <TabPanel value={tabValue} index={0}>
                {filteredAppointments().length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <AssignmentIcon sx={{ fontSize: 60, color: 'rgba(0,0,0,0.2)', mb: 2 }} />
                    <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                      Vous n'avez pas de rendez-vous à préparer
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                      Les rendez-vous confirmés et payés apparaîtront ici pour vous permettre de les préparer.
                    </Typography>
                  </Box>
                ) : (
                  <>
                    <Alert severity="info" sx={{ mb: 3 }}>
                      <Typography variant="body2">
                        <strong>Rendez-vous à préparer</strong> - Ces rendez-vous sont confirmés et payés. Vous pouvez consulter les informations des bénéficiaires et préparer vos séances.
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
            )}

            {/* Onglet "À venir" */}
            <TabPanel value={tabValue} index={isIntervenant ? 1 : 0}>
              {filteredAppointments().length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="h6" sx={{ color: 'text.secondary' }}>
                    Vous n'avez pas de rendez-vous à venir
                  </Typography>
                  <Button
                    variant="contained"
                    href="/prendre-rendez-vous"
                    sx={{
                      mt: 2,
                      px: 4,
                      py: 1.5,
                      background: 'linear-gradient(45deg, #FFD700, #FFA500)',
                      color: '#1a1a2e',
                      fontWeight: 600,
                      borderRadius: 50,
                      boxShadow: '0 8px 25px rgba(255, 215, 0, 0.3)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #FFA500, #FFD700)',
                        transform: 'translateY(-3px)',
                        boxShadow: '0 12px 35px rgba(255, 215, 0, 0.4)',
                      },
                    }}
                  >
                    Prendre un rendez-vous
                  </Button>
                </Box>
              ) : (
                <Grid container spacing={3}>
                  {filteredAppointments().map((appointment) =>
                    renderAppointmentCard(appointment, true)
                  )}
                </Grid>
              )}
            </TabPanel>

            {/* Onglet "En cours" */}
            <TabPanel value={tabValue} index={isIntervenant ? 2 : 1}>
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
                          // Recharger les rendez-vous après validation
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
            <TabPanel value={tabValue} index={isIntervenant ? 3 : 2}>
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
            <TabPanel value={tabValue} index={isIntervenant ? 4 : 3}>
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
            {appointmentToCancel?.payment_status === 'paid' ? (
              "Êtes-vous sûr(e) de vouloir annuler ce rendez-vous ? Comme il a déjà été payé, vous devrez contacter l'administrateur pour un éventuel remboursement."
            ) : (
              "Êtes-vous sûr(e) de vouloir annuler ce rendez-vous ? Le créneau sera à nouveau disponible pour d'autres utilisateurs."
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCancelDialog} color="primary" disabled={cancelLoading}>
            Annuler
          </Button>
          <Button
            onClick={handleCancelAppointment}
            color="error"
            variant="contained"
            disabled={cancelLoading}
            startIcon={cancelLoading ? <CircularProgress size={20} color="inherit" /> : undefined}
          >
            {cancelLoading ? 'Annulation en cours...' : 'Confirmer l\'annulation'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Boîte de dialogue des détails du rendez-vous */}
      {selectedAppointment && (
        <AppointmentDetailsDialog
          open={detailsDialogOpen}
          onClose={handleCloseDetailsDialog}
          appointment={selectedAppointment}
          onAppointmentUpdate={handleAppointmentUpdate}
        />
      )}
    </Box>
  );
};

export default MyAppointmentsPage;
