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
  Tabs
} from "@mui/material";
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { fr } from 'date-fns/locale';
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
  const [services, setServices] = useState<Service[]>([]);
  const [practitioner, setPractitioner] = useState<Practitioner | null>(null);
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // État pour l'onglet actif (0 = vue calendrier, 1 = vue tableau)
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (profile?.user_type === 'intervenant' || profile?.user_type === 'admin') {
      fetchPractitionerData();
      fetchServices();
      fetchAppointments();
    } else {
      setError("Accès réservé aux intervenants et administrateurs");
      setLoading(false);
    }
  }, [profile]);

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
      console.error('Erreur lors du chargement de l\'intervenant:', err);
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

      setAppointments(data || []);
    } catch (err: any) {
      console.error('Erreur lors du chargement des rendez-vous:', err);
      setError(`Erreur lors du chargement des rendez-vous : ${err.message}`);
    } finally {
      setLoading(false);
    }
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
          />

          <CardContent>
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

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
              {practitioners.length > 0 && (
                <AdminWeeklyCalendar
                  appointments={appointments}
                  practitioners={practitioners}
                  services={services}
                  onAppointmentCreated={handleAppointmentCreated}
                  onAppointmentUpdated={handleAppointmentUpdated}
                  onAppointmentDeleted={handleAppointmentDeleted}
                  isPractitionerView={true}
                  practitionerId={practitioner?.id}
                />
              )}
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
      </Box>
    </LocalizationProvider>
  );
};

export default PractitionerSchedulePage;
