// src/pages/Practitioner/PractitionerSchedulePage.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Alert,
  CircularProgress,
  Tab,
  Tabs,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Button,
  ButtonGroup,
  Chip,
  Grid,
  Collapse,
  IconButton,
  Checkbox,
  Tooltip
} from "@mui/material";
import FilterListIcon from '@mui/icons-material/FilterList';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { fr } from 'date-fns/locale';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, addWeeks, addMonths } from 'date-fns';
import {
  getServices,
  Appointment,
  Service,
  Practitioner
} from '../../services/supabase';
import { supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import AdminWeeklyCalendar from '../../components/admin/AdminWeeklyCalendar';
import AdminAppointmentsTable from '../../components/admin/AdminAppointmentsTable';
import AutoScheduleGenerator from '../../components/admin/AutoScheduleGenerator';
import PractitionerWeeklyCalendar from '../../components/practitioner/PractitionerWeeklyCalendar';
import { logger } from '../../utils/logger';
import { cleanupPastPendingAppointments } from '../../services/supabase-appointments';

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

const PractitionerSchedulePage: React.FC = () => {
  const { profile } = useAuth();

  // États
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [practitioner, setPractitioner] = useState<Practitioner | null>(null);
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // États pour les filtres - Par défaut, tous les rendez-vous sont affichés
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [servicesFilter, setServicesFilter] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState<Date | null>(null);
  const [startDateFilter, setStartDateFilter] = useState<Date | null>(null);
  const [endDateFilter, setEndDateFilter] = useState<Date | null>(null);
  const [quickFilter, setQuickFilter] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

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

  // État pour le générateur automatique
  const [autoGeneratorOpen, setAutoGeneratorOpen] = useState(false);

  // État pour le rendez-vous sélectionné (détail)
  const [selectedAppointmentDetail, setSelectedAppointmentDetail] = useState<Appointment | null>(null);

  // État pour l'onglet actif (0 = vue calendrier, 1 = vue tableau)
  const [activeTab, setActiveTab] = useState(0);

  // État pour le nettoyage manuel
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  useEffect(() => {
    if (profile?.user_type === 'intervenant' || profile?.user_type === 'admin') {
      fetchPractitionerData();
      fetchServices();
      fetchAppointments();
      // Nettoyer automatiquement les rendez-vous passés disponibles
      performCleanup();
    } else {
      setError("Accès réservé aux intervenants et administrateurs");
      setLoading(false);
    }
  }, [profile]);

  // Effet pour appliquer les filtres automatiquement au chargement initial
  useEffect(() => {
    if (allAppointments.length > 0) {
      applyFilters();
    }
  }, [allAppointments]);

  const fetchPractitionerData = async () => {
    try {
      if (!profile?.id) return;

      // Récupérer le profil practitioner de l'utilisateur connecté (admin ou intervenant)
      const { data, error } = await supabase
        .from('practitioners')
        .select(`
          *,
          profile:profiles(*)
        `)
        .eq('user_id', profile.id)
        .single();

      if (error) throw error;

      if (!data) {
        setError("Vous devez avoir un profil d'intervenant pour accéder à cette page.");
        return;
      }

      setPractitioner(data);
      setPractitioners(data ? [data] : []);
    } catch (err: any) {
      logger.error('Erreur lors du chargement de l\'intervenant:', err);
      setError(`Erreur lors du chargement des données : ${err.message}`);
    }
  };

  const fetchServices = async () => {
    try {
      const { data, error } = await getServices();
      if (error) throw error;
      setServices(data || []);
    } catch (err: any) {
      setError(`Erreur lors du chargement des services : ${err.message}`);
    }
  };

  const fetchAppointments = async () => {
    try {
      if (!profile?.id) return;

      setLoading(true);
      setError(null);

      // Récupérer l'ID du practitioner de l'utilisateur connecté (admin ou intervenant)
      const { data: practitionerData, error: practitionerError } = await supabase
        .from('practitioners')
        .select('id')
        .eq('user_id', profile.id)
        .single();

      if (practitionerError) throw practitionerError;
      if (!practitionerData) {
        setError("Profil intervenant non trouvé");
        return;
      }

      // Récupérer uniquement les rendez-vous de CET intervenant
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
        .order('start_time', { ascending: true });

      if (error) throw error;

      setAllAppointments(data || []);
      setAppointments(data || []);
    } catch (err: any) {
      logger.error('Erreur lors du chargement des rendez-vous:', err);
      setError(`Erreur lors du chargement des rendez-vous : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const performCleanup = async () => {
    try {
      if (!profile?.id) return;

      // Récupérer l'ID du practitioner de l'utilisateur connecté
      const { data: practitionerData, error: practitionerError } = await supabase
        .from('practitioners')
        .select('id')
        .eq('user_id', profile.id)
        .single();

      if (practitionerError) {
        logger.warn('Impossible de récupérer le practitioner pour le nettoyage:', practitionerError);
        return;
      }

      if (!practitionerData) return;

      // Nettoyer les rendez-vous passés disponibles pour cet intervenant
      const result = await cleanupPastPendingAppointments(practitionerData.id);

      if (result.deletedCount > 0) {
        logger.info(`${result.deletedCount} rendez-vous passé(s) disponible(s) supprimé(s) automatiquement`);
        // Rafraîchir la liste des rendez-vous après le nettoyage
        fetchAppointments();
      }
    } catch (err: any) {
      logger.warn('Erreur lors du nettoyage automatique des rendez-vous:', err);
      // Ne pas afficher d'erreur à l'utilisateur, c'est une opération silencieuse
    }
  };

  const handleManualCleanup = async () => {
    if (!window.confirm('Voulez-vous supprimer tous les rendez-vous passés disponibles (non réservés) ? Cette action est irréversible.')) {
      return;
    }

    setIsCleaningUp(true);
    try {
      if (!profile?.id) return;

      // Récupérer l'ID du practitioner de l'utilisateur connecté
      const { data: practitionerData, error: practitionerError } = await supabase
        .from('practitioners')
        .select('id')
        .eq('user_id', profile.id)
        .single();

      if (practitionerError) {
        setError('Impossible de récupérer le profil intervenant');
        return;
      }

      if (!practitionerData) {
        setError('Profil intervenant non trouvé');
        return;
      }

      // Nettoyer les rendez-vous passés disponibles pour cet intervenant
      const result = await cleanupPastPendingAppointments(practitionerData.id);

      if (result.error) {
        setError(`Erreur lors du nettoyage : ${result.error.message || 'Erreur inconnue'}`);
      } else if (result.deletedCount > 0) {
        alert(`${result.deletedCount} rendez-vous passé(s) disponible(s) supprimé(s) avec succès`);
        // Rafraîchir la liste des rendez-vous après le nettoyage
        fetchAppointments();
      } else {
        alert('Aucun rendez-vous passé disponible à supprimer');
      }
    } catch (err: any) {
      logger.error('Erreur lors du nettoyage manuel des rendez-vous:', err);
      setError(`Erreur lors du nettoyage : ${err.message}`);
    } finally {
      setIsCleaningUp(false);
    }
  };

  // Fonction pour appliquer les filtres
  const applyFilters = () => {
    let filtered = [...allAppointments];

    // Filtre par statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.status === statusFilter);
    }

    // Filtre par statut de paiement
    if (paymentStatusFilter !== 'all') {
      filtered = filtered.filter(app => app.payment_status === paymentStatusFilter);
    }

    // Filtre par services
    if (servicesFilter.length > 0) {
      filtered = filtered.filter(app => servicesFilter.includes(app.service_id));
    }

    // Filtre par plage de dates
    if (startDateFilter && endDateFilter) {
      const start = new Date(startDateFilter);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDateFilter);
      end.setHours(23, 59, 59, 999);

      filtered = filtered.filter(app => {
        const appDate = new Date(app.start_time);
        return appDate >= start && appDate <= end;
      });
    } else if (startDateFilter && !endDateFilter) {
      // Filtre "à partir de" (sans date de fin)
      const start = new Date(startDateFilter);
      start.setHours(0, 0, 0, 0);

      filtered = filtered.filter(app => {
        const appDate = new Date(app.start_time);
        return appDate >= start;
      });
    } else if (dateFilter) {
      // Filtre par date unique
      const startOfDay = new Date(dateFilter);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(dateFilter);
      endOfDay.setHours(23, 59, 59, 999);

      filtered = filtered.filter(app => {
        const appDate = new Date(app.start_time);
        return appDate >= startOfDay && appDate <= endOfDay;
      });
    }

    setAppointments(filtered);
  };

  // Appliquer les filtres manuellement
  const handleFilterApply = () => {
    applyFilters();
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

    // Appliquer automatiquement les filtres rapides
    setTimeout(() => applyFilters(), 100);
  };

  const handleAppointmentCreated = () => {
    fetchAppointments();
  };

  const handleAppointmentUpdated = () => {
    fetchAppointments();
  };

  const handleAppointmentDeleted = () => {
    fetchAppointments();
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  if (loading && !appointments.length) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !practitioner) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
      <Box sx={{ width: '100%', p: { xs: 2, sm: 3 } }}>
        <Card elevation={0} sx={{
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
        }}>
          <CardHeader
            title={
              <Box>
                <Typography variant="h4" component="h1" gutterBottom sx={{
                  fontWeight: 700,
                  background: 'linear-gradient(45deg, #345995, #1D3461)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontSize: { xs: '1.75rem', sm: '2.125rem' }
                }}>
                  Mon Planning
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Gérez vos rendez-vous et créez de nouvelles séances
                </Typography>
              </Box>
            }
            action={
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <Tooltip title="Supprimer tous les rendez-vous passés disponibles (non réservés)">
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteSweepIcon />}
                    onClick={handleManualCleanup}
                    disabled={isCleaningUp}
                  >
                    {isCleaningUp ? 'Nettoyage...' : 'Nettoyer'}
                  </Button>
                </Tooltip>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<CalendarMonthIcon />}
                  onClick={() => setAutoGeneratorOpen(true)}
                >
                  Générateur Auto
                </Button>
              </Box>
            }
          />

          <CardContent>
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Alert severity="info" sx={{ mb: 3 }} icon={<DeleteSweepIcon />}>
              <Typography variant="body2">
                <strong>Nettoyage automatique activé :</strong> Les rendez-vous passés disponibles (non réservés) sont automatiquement supprimés au chargement de cette page.
                Utilisez le bouton "Nettoyer" pour déclencher un nettoyage manuel à tout moment.
              </Typography>
            </Alert>

            {/* Section des filtres collapsible */}
            <Card sx={{ mb: 3, boxShadow: 1 }}>
              <CardHeader
                title={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FilterListIcon />
                    <Typography variant="h6">Filtres</Typography>
                  </Box>
                }
                action={
                  <IconButton onClick={() => setShowFilters(!showFilters)} size="small">
                    {showFilters ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                }
                sx={{
                  py: 1.5,
                  px: 2,
                  '& .MuiCardHeader-title': { fontSize: '1rem' },
                  borderBottom: showFilters ? 1 : 0,
                  borderColor: 'divider'
                }}
              />
              <Collapse in={showFilters}>
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

                    {/* Filtres par catégorie */}
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

                    <Grid item xs={12} md={12} sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1, mt: 1 }}>
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
              </Collapse>
            </Card>

            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                variant="fullWidth"
                sx={{
                  '& .MuiTab-root': {
                    fontWeight: 600,
                    fontSize: { xs: '0.875rem', sm: '1rem' }
                  }
                }}
              >
                <Tab label="📅 Vue Calendrier" />
                <Tab label="📋 Vue Liste" />
              </Tabs>
            </Box>

            <TabPanel value={activeTab} index={0}>
              <PractitionerWeeklyCalendar
                appointments={appointments}
                services={services}
                onAppointmentClick={(appointment) => setSelectedAppointmentDetail(appointment)}
                onAppointmentChange={fetchAppointments}
              />
            </TabPanel>

            <TabPanel value={activeTab} index={1}>
              <AdminAppointmentsTable
                appointments={appointments}
                practitioners={practitioners}
                services={services}
                loading={loading}
                error={error}
                setError={setError}
                onAppointmentChange={fetchAppointments}
                isPractitionerView={true}
                practitionerId={practitioner?.id}
              />
            </TabPanel>
          </CardContent>
        </Card>

        {/* Générateur automatique de planning */}
        {practitioner && (
          <AutoScheduleGenerator
            open={autoGeneratorOpen}
            onClose={() => setAutoGeneratorOpen(false)}
            practitioner={practitioner}
            services={services}
            onGenerated={fetchAppointments}
          />
        )}
      </Box>
    </LocalizationProvider>
  );
};

export default PractitionerSchedulePage;
