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
import { getAppointments, Appointment } from '../services/supabase';
import { cancelAppointment } from '../services/supabase-appointments';
import { format, isPast, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import EventIcon from '@mui/icons-material/Event';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import WorkIcon from '@mui/icons-material/Work';
import PaymentIcon from '@mui/icons-material/Payment';

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
  const { user } = useAuth();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState<Appointment | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Chargement des rendez-vous
  const loadAppointments = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await getAppointments(user.id);
      if (error) throw error;
      setAppointments(data || []);
    } catch (error: any) {
      setError('Erreur lors du chargement des rendez-vous: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, [user]);

  // Filtrage des rendez-vous selon l'onglet sélectionné
  const filteredAppointments = () => {
    switch (tabValue) {
      case 0: // À venir
        return appointments.filter(
          appointment => !isPast(parseISO(appointment.start_time)) && appointment.status !== 'cancelled'
        );
      case 1: // Passés
        return appointments.filter(
          appointment => isPast(parseISO(appointment.start_time)) || appointment.status === 'completed'
        );
      case 2: // Annulés
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

      const { success, error: cancelError, action } = await cancelAppointment(
        appointmentToCancel.id,
        isPaid,
        user.id
      );

      if (!success || cancelError) {
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
        <CardContent sx={{ p: 2.5 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1a1a2e' }}>
              {appointment.service?.name}
            </Typography>
            <Box>
              <Chip
                label={getStatusLabel(appointment.status)}
                color={getStatusColor(appointment.status)}
                size="small"
                sx={{ mr: 1 }}
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

          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Box display="flex" alignItems="center" mb={1}>
                <EventIcon fontSize="small" sx={{ mr: 1, color: '#FFA500' }} />
                <Typography variant="body2">
                  {format(parseISO(appointment.start_time), 'EEEE d MMMM yyyy', { locale: fr })}
                </Typography>
              </Box>

              <Box display="flex" alignItems="center" mb={1}>
                <AccessTimeIcon fontSize="small" sx={{ mr: 1, color: '#FFA500' }} />
                <Typography variant="body2">
                  {format(parseISO(appointment.start_time), 'HH:mm', { locale: fr })}
                  {' - '}
                  {format(parseISO(appointment.end_time), 'HH:mm', { locale: fr })}
                </Typography>
              </Box>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Box display="flex" alignItems="center" mb={1}>
                <PersonIcon fontSize="small" sx={{ mr: 1, color: '#FFA500' }} />
                <Typography variant="body2">
                  {appointment.practitioner?.profile?.first_name} {appointment.practitioner?.profile?.last_name}
                </Typography>
              </Box>

              <Box display="flex" alignItems="center" mb={1}>
                <WorkIcon fontSize="small" sx={{ mr: 1, color: '#FFA500' }} />
                <Typography variant="body2">
                  {appointment.service?.duration} minutes
                </Typography>
              </Box>

              <Box display="flex" alignItems="center">
                <PaymentIcon fontSize="small" sx={{ mr: 1, color: '#FFA500' }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#FFA500' }}>
                  {appointment.service?.price} €
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {showCancelButton && appointment.status !== 'cancelled' && !isPast(parseISO(appointment.start_time)) && (
            <Box mt={2}>
              <Button
                variant="outlined"
                color="error"
                onClick={() => handleOpenCancelDialog(appointment)}
                fullWidth
                sx={{
                  borderRadius: 2,
                  fontWeight: 600,
                }}
              >
                Annuler ce rendez-vous
              </Button>
            </Box>
          )}
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
    <Box sx={{ width: '100%' }}>
      <Box
        sx={{
          position: 'relative',
          minHeight: '80px',
          display: 'flex',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          color: 'white',
          overflow: 'hidden',
          mt: { xs: '23px', md: '40px' },
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.05,
            backgroundImage: `
              repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(255,255,255,0.03) 50px, rgba(255,255,255,0.03) 51px),
              repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(255,255,255,0.03) 50px, rgba(255,255,255,0.03) 51px)
            `,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            width: '250px',
            height: '250px',
            border: '2px solid rgba(255, 215, 0, 0.1)',
            borderRadius: '50%',
            top: '-50px',
            right: '-50px',
          }}
        />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2, py: 1.5 }}>
          <Typography
            variant="h2"
            component="h1"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '1.25rem', md: '1.75rem' },
              textAlign: 'center',
              background: 'linear-gradient(45deg, #FFD700, #FFA500)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 2px 8px rgba(255, 215, 0, 0.3))',
            }}
          >
            Mes rendez-vous
          </Typography>
        </Container>
      </Box>

      <Box
        sx={{
          background: 'linear-gradient(to bottom, rgba(255, 215, 0, 0.03) 0%, rgba(255, 165, 0, 0.02) 100%)',
          py: 3
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
                <Tab label="À venir" />
                <Tab label="Passés" />
                <Tab label="Annulés" />
              </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
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

            <TabPanel value={tabValue} index={1}>
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

            <TabPanel value={tabValue} index={2}>
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
    </Box>
  );
};

export default MyAppointmentsPage;
