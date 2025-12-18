// src/pages/admin/AppointmentsPage.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Button,
  Alert,
  CircularProgress,
  Grid,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  Chip,
  ButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Checkbox
} from "@mui/material";
import FilterListIcon from '@mui/icons-material/FilterList';
import DeleteIcon from '@mui/icons-material/Delete';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { fr } from 'date-fns/locale';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks, addMonths } from 'date-fns';
import {
  getServices,
  getPractitioners,
  Appointment,
  Service,
  Practitioner
} from '../../services/supabase';
import { supabase } from '../../services/supabase';
import { logger } from '../../utils/logger';
import AdminWeeklyCalendar from '../../components/admin/AdminWeeklyCalendar';
import AdminAppointmentsTable from '../../components/admin/AdminAppointmentsTable'; // Composant tableau existant

// Interface pour les types de vues
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// Composant TabPanel pour alterner entre les vues
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`appointments-tabpanel-${index}`}
      aria-labelledby={`appointments-tab-${index}`}
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

const AdminAppointmentsPage: React.FC = () => {
  // États
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // États pour les filtres - Par défaut, on filtre à partir d'aujourd'hui
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [servicesFilter, setServicesFilter] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<Date | null>(null);
  const [startDateFilter, setStartDateFilter] = useState<Date | null>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [endDateFilter, setEndDateFilter] = useState<Date | null>(null);
  const [practitionerFilter, setPractitionerFilter] = useState<string>('all');
  const [quickFilter, setQuickFilter] = useState<string>('fromToday');

  // Couleurs par module/catégorie
  const categoryColors: { [key: string]: string } = {
    particuliers: '#345995',
    professionnels: '#FFA500',
    sportifs: '#4CAF50'
  };

  // Grouper et trier les services par catégorie
  const servicesByCategory = services.reduce((acc, service) => {
    if (!acc[service.category]) {
      acc[service.category] = [];
    }
    acc[service.category].push(service);
    return acc;
  }, {} as { [key: string]: typeof services });

  // Ordre des catégories
  const categoryOrder = ['particuliers', 'professionnels', 'sportifs'];

  // États pour la sélection multiple
  const [selectedAppointments, setSelectedAppointments] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // État pour l'onglet actif (0 = vue calendrier, 1 = vue tableau)
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    fetchAppointments();
    fetchPractitionersAndServices();
  }, []);

  const fetchPractitionersAndServices = async () => {
    try {
      const [practitionersResult, servicesResult] = await Promise.all([
        getPractitioners(),
        getServices()
      ]);

      if (practitionersResult.error) throw practitionersResult.error;
      if (servicesResult.error) throw servicesResult.error;

      setPractitioners(practitionersResult.data || []);
      setServices(servicesResult.data || []);
    } catch (err: any) {
      setError(`Erreur lors du chargement des données : ${err.message}`);
    }
  };

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('appointments')
        .select(`
          *,
          client:profiles(id, first_name, last_name, email),
          practitioner:practitioners(
            *,
            profile:profiles(*)
          ),
          service:services(*)
        `)
        .order('start_time', { ascending: true });

      // Appliquer les filtres
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (paymentStatusFilter !== 'all') {
        query = query.eq('payment_status', paymentStatusFilter);
      }

      // Filtre par plage de dates (priorité sur le filtre par date unique)
      if (startDateFilter && endDateFilter) {
        const start = new Date(startDateFilter);
        start.setHours(0, 0, 0, 0);

        const end = new Date(endDateFilter);
        end.setHours(23, 59, 59, 999);

        query = query
          .gte('start_time', start.toISOString())
          .lte('start_time', end.toISOString());
      } else if (startDateFilter && !endDateFilter) {
        // Filtre "à partir de" (sans date de fin)
        const start = new Date(startDateFilter);
        start.setHours(0, 0, 0, 0);

        query = query.gte('start_time', start.toISOString());
      } else if (dateFilter) {
        // Créer une date de début (minuit) et de fin (23:59:59) pour le jour sélectionné
        const startOfDay = new Date(dateFilter);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(dateFilter);
        endOfDay.setHours(23, 59, 59, 999);

        query = query
          .gte('start_time', startOfDay.toISOString())
          .lte('start_time', endOfDay.toISOString());
      }

      if (practitionerFilter !== 'all') {
        query = query.eq('practitioner_id', practitionerFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filtrer par services si nécessaire
      let filteredData = data || [];
      if (servicesFilter.length > 0) {
        filteredData = filteredData.filter(
          (appointment) => servicesFilter.includes(appointment.service_id)
        );
      }

      setAppointments(filteredData);
    } catch (err: any) {
      logger.error('Erreur chargement RDV:', err);
      setError(`Erreur lors du chargement des rendez-vous : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterApply = () => {
    fetchAppointments();
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Gestionnaires pour les filtres rapides
  const handleQuickFilter = (filterType: string) => {
    const now = new Date();
    setQuickFilter(filterType);

    switch (filterType) {
      case 'fromToday':
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        setStartDateFilter(today);
        setEndDateFilter(null);
        setDateFilter(null);
        break;
      case 'week':
        setStartDateFilter(startOfWeek(now, { weekStartsOn: 1 }));
        setEndDateFilter(endOfWeek(now, { weekStartsOn: 1 }));
        setDateFilter(null);
        break;
      case 'nextWeek':
        const nextWeek = addWeeks(now, 1);
        setStartDateFilter(startOfWeek(nextWeek, { weekStartsOn: 1 }));
        setEndDateFilter(endOfWeek(nextWeek, { weekStartsOn: 1 }));
        setDateFilter(null);
        break;
      case 'month':
        setStartDateFilter(startOfMonth(now));
        setEndDateFilter(endOfMonth(now));
        setDateFilter(null);
        break;
      case 'nextMonth':
        const nextMonth = addMonths(now, 1);
        setStartDateFilter(startOfMonth(nextMonth));
        setEndDateFilter(endOfMonth(nextMonth));
        setDateFilter(null);
        break;
      default:
        setStartDateFilter(null);
        setEndDateFilter(null);
        setQuickFilter('');
    }
  };

  // Gestionnaires pour la sélection multiple
  const handleSelectAll = () => {
    if (selectedAppointments.length === appointments.length) {
      setSelectedAppointments([]);
    } else {
      setSelectedAppointments(appointments.map(app => app.id));
    }
  };

  const handleSelectAppointment = (appointmentId: string) => {
    setSelectedAppointments(prev =>
      prev.includes(appointmentId)
        ? prev.filter(id => id !== appointmentId)
        : [...prev, appointmentId]
    );
  };

  // Suppression groupée
  const handleBulkDelete = async () => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('appointments')
        .delete()
        .in('id', selectedAppointments);

      if (error) throw error;

      setSuccess(`${selectedAppointments.length} rendez-vous supprimé(s) avec succès`);
      setSelectedAppointments([]);
      setDeleteDialogOpen(false);
      fetchAppointments();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      logger.error('Erreur suppression groupée:', err);
      setError(`Erreur lors de la suppression : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && appointments.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Gestion des rendez-vous
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Créez et gérez les créneaux de rendez-vous disponibles pour vos clients.
        </Typography>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Barre d'actions groupées */}
      {selectedAppointments.length > 0 && (
        <Alert
          severity="info"
          sx={{ mb: 3 }}
          action={
            <Button
              color="error"
              size="small"
              startIcon={<DeleteIcon />}
              onClick={() => setDeleteDialogOpen(true)}
            >
              Supprimer ({selectedAppointments.length})
            </Button>
          }
        >
          {selectedAppointments.length} rendez-vous sélectionné(s)
        </Alert>
      )}

      <Card sx={{ mb: 3, boxShadow: 1 }}>
        <CardHeader
          title="Filtres"
          sx={{
            py: 1.5,
            px: 2,
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiCardHeader-title': { fontSize: '1rem' }
          }}
        />
        <CardContent sx={{ pt: 2, pb: 2 }}>
          <Grid container spacing={2}>
            {/* Filtres rapides */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontSize: '0.875rem' }}>
                Filtres rapides
              </Typography>
              <ButtonGroup
                variant="outlined"
                size="small"
                sx={{
                  flexWrap: 'wrap',
                  gap: 1,
                  '& .MuiButton-root': {
                    py: 0.5,
                    fontSize: '0.75rem'
                  }
                }}
              >
                <Button
                  onClick={() => handleQuickFilter('fromToday')}
                  variant={quickFilter === 'fromToday' ? 'contained' : 'outlined'}
                >
                  À partir d'aujourd'hui
                </Button>
                <Button
                  onClick={() => handleQuickFilter('week')}
                  variant={quickFilter === 'week' ? 'contained' : 'outlined'}
                >
                  Cette semaine
                </Button>
                <Button
                  onClick={() => handleQuickFilter('nextWeek')}
                  variant={quickFilter === 'nextWeek' ? 'contained' : 'outlined'}
                >
                  Semaine prochaine
                </Button>
                <Button
                  onClick={() => handleQuickFilter('month')}
                  variant={quickFilter === 'month' ? 'contained' : 'outlined'}
                >
                  Ce mois
                </Button>
                <Button
                  onClick={() => handleQuickFilter('nextMonth')}
                  variant={quickFilter === 'nextMonth' ? 'contained' : 'outlined'}
                >
                  Mois prochain
                </Button>
                <Button onClick={() => handleQuickFilter('')} size="small">
                  Tous les rendez-vous
                </Button>
              </ButtonGroup>
              {(startDateFilter && endDateFilter) && (
                <Chip
                  label={`Du ${startDateFilter.toLocaleDateString('fr-FR')} au ${endDateFilter.toLocaleDateString('fr-FR')}`}
                  onDelete={() => {
                    setStartDateFilter(null);
                    setEndDateFilter(null);
                    setQuickFilter('');
                  }}
                  sx={{ ml: 1, mt: 1 }}
                  size="small"
                />
              )}
              {(startDateFilter && !endDateFilter && quickFilter === 'fromToday') && (
                <Chip
                  label={`À partir du ${startDateFilter.toLocaleDateString('fr-FR')}`}
                  onDelete={() => {
                    setStartDateFilter(null);
                    setQuickFilter('');
                  }}
                  sx={{ ml: 1, mt: 1 }}
                  size="small"
                />
              )}
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Statut</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Statut"
                >
                  <MenuItem value="all">Tous les statuts</MenuItem>
                  <MenuItem value="pending">En attente</MenuItem>
                  <MenuItem value="confirmed">Confirmés</MenuItem>
                  <MenuItem value="cancelled">Annulés</MenuItem>
                  <MenuItem value="completed">Terminés</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Paiement</InputLabel>
                <Select
                  value={paymentStatusFilter}
                  onChange={(e) => setPaymentStatusFilter(e.target.value)}
                  label="Paiement"
                >
                  <MenuItem value="all">Tous</MenuItem>
                  <MenuItem value="unpaid">Non payé</MenuItem>
                  <MenuItem value="paid">Payé</MenuItem>
                  <MenuItem value="refunded">Remboursé</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Services</InputLabel>
                <Select
                  multiple
                  value={servicesFilter}
                  onChange={(e) => setServicesFilter(typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                  label="Services"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => {
                        const service = services.find(s => s.id === value);
                        return (
                          <Chip
                            key={value}
                            label={service?.name || value}
                            size="small"
                            sx={{
                              bgcolor: service?.category ? categoryColors[service.category] : 'default',
                              color: 'white',
                              '& .MuiChip-deleteIcon': {
                                color: 'rgba(255, 255, 255, 0.7)',
                                '&:hover': {
                                  color: 'white'
                                }
                              }
                            }}
                            onDelete={(e) => {
                              e.stopPropagation();
                              setServicesFilter(servicesFilter.filter(id => id !== value));
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                            }}
                          />
                        );
                      })}
                    </Box>
                  )}
                >
                  <MenuItem value="" disabled>
                    <em>Sélectionnez un ou plusieurs services</em>
                  </MenuItem>
                  {categoryOrder.map((category) =>
                    servicesByCategory[category] && servicesByCategory[category].length > 0 && [
                      <MenuItem
                        key={`header-${category}`}
                        disabled
                        sx={{
                          fontWeight: 'bold',
                          color: categoryColors[category],
                          bgcolor: `${categoryColors[category]}15`,
                          pointerEvents: 'none',
                          opacity: '1 !important'
                        }}
                      >
                        {category.toUpperCase()}
                      </MenuItem>,
                      ...servicesByCategory[category].map((service) => (
                        <MenuItem key={service.id} value={service.id} sx={{ pl: 4 }}>
                          <Checkbox checked={servicesFilter.indexOf(service.id) > -1} />
                          <Box
                            component="span"
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: categoryColors[category],
                              display: 'inline-block',
                              mr: 1
                            }}
                          />
                          {service.name}
                        </MenuItem>
                      ))
                    ]
                  )}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Intervenant</InputLabel>
                <Select
                  value={practitionerFilter}
                  onChange={(e) => setPractitionerFilter(e.target.value)}
                  label="Intervenant"
                >
                  <MenuItem value="all">Tous les intervenants</MenuItem>
                  {practitioners.map((practitioner) => (
                    <MenuItem key={practitioner.id} value={practitioner.id}>
                      {practitioner.profile?.first_name} {practitioner.profile?.last_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
                <DatePicker
                  label="Date spécifique"
                  value={dateFilter}
                  onChange={(date) => {
                    setDateFilter(date);
                    setStartDateFilter(null);
                    setEndDateFilter(null);
                    setQuickFilter('');
                  }}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      size: 'small'
                    }
                  }}
                />
              </LocalizationProvider>
            </Grid>

            <Grid item xs={12} md={8} sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<FilterListIcon />}
                onClick={handleFilterApply}
              >
                Appliquer les filtres
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardHeader 
          title="Liste des rendez-vous"
          action={
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={activeTab} onChange={handleTabChange} aria-label="appointments view tabs">
                <Tab label="Vue Calendrier" id="appointments-tab-0" aria-controls="appointments-tabpanel-0" />
                <Tab label="Vue Tableau" id="appointments-tab-1" aria-controls="appointments-tabpanel-1" />
              </Tabs>
            </Box>
          }
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        />
        <CardContent>
          <TabPanel value={activeTab} index={0}>
            <AdminWeeklyCalendar 
              appointments={appointments}
              practitioners={practitioners}
              services={services}
              loading={loading}
              error={error}
              setError={setError}
              onAppointmentChange={fetchAppointments}
            />
          </TabPanel>
          <TabPanel value={activeTab} index={1}>
            {/* Si vous avez un composant de tableau existant, vous pouvez l'utiliser ici */}
            <AdminAppointmentsTable
              appointments={appointments}
              practitioners={practitioners}
              services={services}
              loading={loading}
              error={error}
              setError={setError}
              onAppointmentChange={fetchAppointments}
              selectedAppointments={selectedAppointments}
              onSelectAppointment={handleSelectAppointment}
              onSelectAll={handleSelectAll}
            />
          </TabPanel>
        </CardContent>
      </Card>

      {/* Dialogue de confirmation de suppression */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Êtes-vous sûr de vouloir supprimer {selectedAppointments.length} rendez-vous ?
            Cette action est irréversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
          <Button onClick={handleBulkDelete} color="error" variant="contained">
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminAppointmentsPage;