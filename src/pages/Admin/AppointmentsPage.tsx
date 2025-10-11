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
  Tabs
} from "@mui/material";
import FilterListIcon from '@mui/icons-material/FilterList';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { fr } from 'date-fns/locale';
import { 
  getServices, 
  getPractitioners, 
  Appointment,
  Service,
  Practitioner 
} from '../../services/supabase';
import { supabase } from '../../services/supabase';
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
  
  // États pour les filtres
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<Date | null>(null);
  const [practitionerFilter, setPractitionerFilter] = useState<string>('all');
  
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
      
      if (dateFilter) {
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
      setAppointments(data || []);
    } catch (err: any) {
      setError(`Erreur lors du chargement des rendez-vous : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterApply = () => {
    fetchAppointments();
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
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

      <Card sx={{ mb: 4 }}>
        <CardHeader 
          title="Filtres"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
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
            
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
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
            
            <Grid item xs={12} sm={4}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
                <DatePicker
                  label="Filtrer par date"
                  value={dateFilter}
                  onChange={(date) => setDateFilter(date)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </LocalizationProvider>
            </Grid>
            
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                variant="contained" 
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
            />
          </TabPanel>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AdminAppointmentsPage;