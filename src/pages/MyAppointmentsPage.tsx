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
import { cancelAppointment } from '../services/supabase-appointments'; // Importer la nouvelle fonction
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
      
      // Utiliser la nouvelle fonction qui gère correctement les rendez-vous non payés
      const { success, error: cancelError, action } = await cancelAppointment(
        appointmentToCancel.id,
        isPaid, // garder l'enregistrement si payé
        user.id
      );
      
      if (!success || cancelError) {
        throw cancelError || new Error('Erreur lors de l\'annulation');
      }
      
      // Mise à jour de la liste des rendez-vous
      setAppointments(prevAppointments => 
        prevAppointments.map(appointment => 
          appointment.id === appointmentToCancel.id 
            ? { ...appointment, status: 'cancelled' } 
            : appointment
        )
      );
      
      // Afficher un message différent selon que le créneau a été libéré ou non
      if (action === 'released') {
        // Succès avec créneau libéré pour les rendez-vous non payés
        setError('');
        
        // Recharger les rendez-vous pour avoir la liste à jour
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
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
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
  
  if (loading && appointments.length === 0) {
    return (
      <Container maxWidth="md">
        <Paper sx={{ p: 4, mt: 4, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Chargement de vos rendez-vous...
          </Typography>
        </Paper>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg">
      <Paper sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Mes rendez-vous
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="appointment tabs">
            <Tab label="À venir" />
            <Tab label="Passés" />
            <Tab label="Annulés" />
          </Tabs>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          {filteredAppointments().length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary">
                Vous n'avez pas de rendez-vous à venir
              </Typography>
              <Button 
                variant="contained" 
                sx={{ mt: 2 }}
                href="/prendre-rendez-vous"
              >
                Prendre un rendez-vous
              </Button>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {filteredAppointments().map((appointment) => (
                <Grid item xs={12} md={6} key={appointment.id}>
                  <Card>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">
                          {appointment.service?.name}
                        </Typography>
                        <Box>
                          <Chip 
                            label={getStatusLabel(appointment.status)} 
                            color={getStatusColor(appointment.status)}
                            size="small"
                            sx={{ mr: 1 }}
                          />
                          <Chip 
                            label={getPaymentStatusLabel(appointment.payment_status)} 
                            color={getPaymentStatusColor(appointment.payment_status)}
                            size="small"
                          />
                        </Box>
                      </Box>
                      
                      <Divider sx={{ mb: 2 }} />
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Box display="flex" alignItems="center" mb={1}>
                            <EventIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2">
                              {format(parseISO(appointment.start_time), 'EEEE d MMMM yyyy', { locale: fr })}
                            </Typography>
                          </Box>
                          
                          <Box display="flex" alignItems="center" mb={1}>
                            <AccessTimeIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2">
                              {format(parseISO(appointment.start_time), 'HH:mm', { locale: fr })}
                              {' - '}
                              {format(parseISO(appointment.end_time), 'HH:mm', { locale: fr })}
                            </Typography>
                          </Box>
                        </Grid>
                        
                        <Grid item xs={12} sm={6}>
                          <Box display="flex" alignItems="center" mb={1}>
                            <PersonIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2">
                              {appointment.practitioner?.profile?.first_name} {appointment.practitioner?.profile?.last_name}
                            </Typography>
                          </Box>
                          
                          <Box display="flex" alignItems="center" mb={1}>
                            <WorkIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2">
                              {appointment.service?.duration} minutes
                            </Typography>
                          </Box>
                          
                          <Box display="flex" alignItems="center">
                            <PaymentIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2">
                              {appointment.service?.price} €
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                      
                      {appointment.status !== 'cancelled' && !isPast(parseISO(appointment.start_time)) && (
                        <Box mt={2}>
                          <Button 
                            variant="outlined" 
                            color="error"
                            onClick={() => handleOpenCancelDialog(appointment)}
                            fullWidth
                          >
                            Annuler ce rendez-vous
                          </Button>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          {filteredAppointments().length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary">
                Vous n'avez pas de rendez-vous passés
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {filteredAppointments().map((appointment) => (
                <Grid item xs={12} md={6} key={appointment.id}>
                  <Card>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">
                          {appointment.service?.name}
                        </Typography>
                        <Box>
                          <Chip 
                            label={getStatusLabel(appointment.status)} 
                            color={getStatusColor(appointment.status)}
                            size="small"
                            sx={{ mr: 1 }}
                          />
                          <Chip 
                            label={getPaymentStatusLabel(appointment.payment_status)} 
                            color={getPaymentStatusColor(appointment.payment_status)}
                            size="small"
                          />
                        </Box>
                      </Box>
                      
                      <Divider sx={{ mb: 2 }} />
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Box display="flex" alignItems="center" mb={1}>
                            <EventIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2">
                              {format(parseISO(appointment.start_time), 'EEEE d MMMM yyyy', { locale: fr })}
                            </Typography>
                          </Box>
                          
                          <Box display="flex" alignItems="center" mb={1}>
                            <AccessTimeIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2">
                              {format(parseISO(appointment.start_time), 'HH:mm', { locale: fr })}
                              {' - '}
                              {format(parseISO(appointment.end_time), 'HH:mm', { locale: fr })}
                            </Typography>
                          </Box>
                        </Grid>
                        
                        <Grid item xs={12} sm={6}>
                          <Box display="flex" alignItems="center" mb={1}>
                            <PersonIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2">
                              {appointment.practitioner?.profile?.first_name} {appointment.practitioner?.profile?.last_name}
                            </Typography>
                          </Box>
                          
                          <Box display="flex" alignItems="center" mb={1}>
                            <WorkIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2">
                              {appointment.service?.duration} minutes
                            </Typography>
                          </Box>
                          
                          <Box display="flex" alignItems="center">
                            <PaymentIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2">
                              {appointment.service?.price} €
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>
        
        <TabPanel value={tabValue} index={2}>
          {filteredAppointments().length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary">
                Vous n'avez pas de rendez-vous annulés
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {filteredAppointments().map((appointment) => (
                <Grid item xs={12} md={6} key={appointment.id}>
                  <Card>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">
                          {appointment.service?.name}
                        </Typography>
                        <Chip 
                          label={getStatusLabel(appointment.status)} 
                          color={getStatusColor(appointment.status)}
                          size="small"
                        />
                      </Box>
                      
                      <Divider sx={{ mb: 2 }} />
                      
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Box display="flex" alignItems="center" mb={1}>
                            <EventIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2">
                              {format(parseISO(appointment.start_time), 'EEEE d MMMM yyyy', { locale: fr })}
                            </Typography>
                          </Box>
                          
                          <Box display="flex" alignItems="center" mb={1}>
                            <AccessTimeIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2">
                              {format(parseISO(appointment.start_time), 'HH:mm', { locale: fr })}
                              {' - '}
                              {format(parseISO(appointment.end_time), 'HH:mm', { locale: fr })}
                            </Typography>
                          </Box>
                        </Grid>
                        
                        <Grid item xs={12} sm={6}>
                          <Box display="flex" alignItems="center" mb={1}>
                            <PersonIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2">
                              {appointment.practitioner?.profile?.first_name} {appointment.practitioner?.profile?.last_name}
                            </Typography>
                          </Box>
                          
                          <Box display="flex" alignItems="center" mb={1}>
                            <WorkIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2">
                              {appointment.service?.duration} minutes
                            </Typography>
                          </Box>
                          
                          <Box display="flex" alignItems="center">
                            <PaymentIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                            <Typography variant="body2">
                              {appointment.service?.price} €
                            </Typography>
                          </Box>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>
      </Paper>
      
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
    </Container>
  );
};

export default MyAppointmentsPage;