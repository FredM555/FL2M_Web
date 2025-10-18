// src/pages/AppointmentBookingPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Container,
  Typography,
  Box,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Button,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Alert,
  CircularProgress,
  useTheme,
  useMediaQuery,
  TextField,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
  getServices,
  getPractitioners,
  getAvailableWeeks,
  getAvailableAppointmentsByWeek,
  bookAppointment
} from '../services/supabase-appointments';
import { Service, Practitioner, Appointment } from '../services/supabase';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import WeeklyCalendar from '../components/appointments/WeeklyCalendar'; // Importer le nouveau composant

// Type des paramètres d'URL
interface LocationState {
  preSelectedServiceId?: string;
  preSelectedCategory?: string;
}

// Types locaux pour les créneaux et les semaines
interface WeekInfo {
  weekStart: string;
  weekEnd: string;
  displayRange: string;
}

interface AppointmentSlot {
  id: string;
  start_time: string;
  end_time: string;
  service: Service;
  practitioner: {
    id: string;
    bio: string;
    profile: {
      id: string;
      first_name: string;
      last_name: string;
    };
    display_name?: string;
    title?: string;
  };
}

// Étapes du processus de réservation
const steps = ['Choix du service', 'Sélection du créneau', 'Confirmation et paiement'];

const AppointmentBookingPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const state = location.state as LocationState || {};
  
  // État actif
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Données des étapes
  const [serviceCategories, setServiceCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(state.preSelectedCategory || '');
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  
  const [availableWeeks, setAvailableWeeks] = useState<WeekInfo[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<WeekInfo | null>(null);
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [selectedPractitioner, setSelectedPractitioner] = useState<string>('all');
  const [appointmentSlots, setAppointmentSlots] = useState<AppointmentSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AppointmentSlot | null>(null);
  
  // Données du formulaire de confirmation
  const [beneficiaryIsSelf, setBeneficiaryIsSelf] = useState(true);
  const [beneficiaryFirstName, setBeneficiaryFirstName] = useState('');
  const [beneficiaryLastName, setBeneficiaryLastName] = useState('');
  const [beneficiaryBirthDate, setBeneficiaryBirthDate] = useState('');
  const [notes, setNotes] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  
  // Charger les catégories et services initiaux
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        // Charger les services
        const { data: servicesData, error: servicesError } = await getServices();
        
        if (servicesError) throw servicesError;
        
        if (servicesData) {
          setServices(servicesData);
          
          // Extraire les catégories uniques
          const categories = [...new Set(servicesData.map(service => service.category))];
          setServiceCategories(categories);
          
          // Si une catégorie est présélectionnée, la définir
          if (state.preSelectedCategory && categories.includes(state.preSelectedCategory)) {
            setSelectedCategory(state.preSelectedCategory);
          } else if (categories.length > 0) {
            setSelectedCategory(categories[0]);
          }
          
          // Si un service est présélectionné, le définir
          if (state.preSelectedServiceId) {
            const preSelectedService = servicesData.find(s => s.id === state.preSelectedServiceId);
            if (preSelectedService) {
              setSelectedService(preSelectedService);
              // Si le service est présélectionné, passer automatiquement à l'étape 2
              setActiveStep(1);
              // Charger les données de l'étape 2
              loadWeeksData(preSelectedService.id);
            }
          }
        }
      } catch (err) {
        console.error('Erreur lors du chargement des services:', err);
        setError('Impossible de charger les services. Veuillez réessayer.');
      } finally {
        setLoading(false);
      }
    };
    
    loadInitialData();
  }, [state.preSelectedServiceId, state.preSelectedCategory]);
  
  // Chargement des données de la semaine quand un service est sélectionné
  const loadWeeksData = async (serviceId: string) => {
    setLoading(true);
    try {
      const { data: weeksData } = await getAvailableWeeks(serviceId);
      setAvailableWeeks(weeksData || []);
      
      if (weeksData && weeksData.length > 0) {
        setSelectedWeek(weeksData[0]);
        // Charger les créneaux pour la première semaine
        await loadSlotsForWeek(serviceId, weeksData[0].weekStart);
      }
      
      // Charger la liste des praticiens
      const { data: practitionersData } = await getPractitioners();
      if (practitionersData) {
        setPractitioners(practitionersData);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des semaines disponibles:', err);
      setError('Impossible de charger les disponibilités. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };
  
  // Chargement des créneaux pour une semaine donnée
  const loadSlotsForWeek = async (serviceId: string, weekDate: string, practitionerId?: string) => {
    setLoading(true);
    setAppointmentSlots([]);
    
    try {
      const { data: slots, error: slotsError } = await getAvailableAppointmentsByWeek(
        weekDate,
        serviceId,
        practitionerId === 'all' ? undefined : practitionerId
      );
      
      if (slotsError) throw slotsError;
      
      if (slots) {
        setAppointmentSlots(slots as unknown as AppointmentSlot[]);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des créneaux:', err);
      setError('Impossible de charger les créneaux disponibles. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };
  
  // Gestion des changements d'étape
  const handleNext = () => {
    if (activeStep === 0 && selectedService) {
      // Charger les données pour l'étape 2
      loadWeeksData(selectedService.id);
    }
    
    if (activeStep === 1 && !selectedSlot) {
      setError('Veuillez sélectionner un créneau avant de continuer.');
      return;
    }
    
    if (activeStep === 2) {
      handleBookAppointment();
      return;
    }
    
    setActiveStep((prevStep) => prevStep + 1);
    setError(null);
  };
  
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
    setError(null);
  };
  
  // Réserver le rendez-vous
  const handleBookAppointment = async () => {
    if (!user || !selectedSlot) {
      setError('Vous devez être connecté et avoir sélectionné un créneau pour réserver.');
      return;
    }
    
    if (!acceptTerms) {
      setError('Vous devez accepter les conditions générales pour continuer.');
      return;
    }
    
    setLoading(true);
    try {
      // Préparer les données additionnelles
      const additionalData: Partial<Appointment> = {
        notes: notes.trim() || undefined
      };
      
      // Ajouter les informations du bénéficiaire si différent de l'utilisateur
      if (!beneficiaryIsSelf) {
        additionalData.beneficiary_first_name = beneficiaryFirstName;
        additionalData.beneficiary_last_name = beneficiaryLastName;
        additionalData.beneficiary_birth_date = beneficiaryBirthDate;
      }
      
      // Appeler l'API pour réserver
      const { success: bookingSuccess, error: bookingError } = await bookAppointment(
        selectedSlot.id,
        user.id,
        additionalData
      );
      
      if (bookingError) throw bookingError;
      
      if (bookingSuccess) {
        setSuccess(true);
        // Rediriger vers la page des rendez-vous après 3 secondes
        setTimeout(() => {
          navigate('/mes-rendez-vous');
        }, 3000);
      }
    } catch (err) {
      console.error('Erreur lors de la réservation:', err);
      setError('La réservation a échoué. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };
  
  // Gestion des sélections
  const handleCategoryChange = (e: any) => {
    const category = e.target.value as string;
    setSelectedCategory(category);
    setSelectedService(null);
  };
  
  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
  };
  
  const handleWeekChange = (week: WeekInfo) => {
    setSelectedWeek(week);
    if (selectedService) {
      loadSlotsForWeek(
        selectedService.id,
        week.weekStart,
        selectedPractitioner === 'all' ? undefined : selectedPractitioner
      );
    }
  };
  
  const handlePractitionerChange = (e: any) => {
    const practitionerId = e.target.value as string;
    setSelectedPractitioner(practitionerId);

    if (selectedService && selectedWeek) {
      loadSlotsForWeek(
        selectedService.id,
        selectedWeek.weekStart,
        practitionerId === 'all' ? undefined : practitionerId
      );
    }
  };
  
  const handleSlotSelect = (slot: AppointmentSlot) => {
    setSelectedSlot(slot);
  };
  
  // Si l'utilisateur n'est pas connecté, le rediriger vers la page de connexion
  useEffect(() => {
    if (!user && !loading) {
      navigate('/login', { state: { from: '/prendre-rendez-vous' } });
    }
  }, [user, loading, navigate]);
  
  // Pré-remplir le formulaire avec les données du profil connecté
  useEffect(() => {
    if (profile) {
      setBeneficiaryFirstName(profile.first_name || '');
      setBeneficiaryLastName(profile.last_name || '');
      // Formater la date de naissance si disponible
      if (profile.birth_date) {
        setBeneficiaryBirthDate(profile.birth_date.split('T')[0]);
      }
    }
  }, [profile]);
  
  // Rendu des étapes
  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return renderServiceSelection();
      case 1:
        return renderSlotSelection();
      case 2:
        return renderConfirmation();
      default:
        return null;
    }
  };
  
  // Fonction pour obtenir les couleurs selon la catégorie
  const getCategoryColors = (category: string) => {
    switch (category) {
      case 'particuliers':
        return {
          primary: '#FFD700',
          secondary: '#FFA500',
          border: 'rgba(255, 215, 0, 0.3)',
          borderSelected: '#FFA500',
          shadow: 'rgba(255, 215, 0, 0.25)',
        };
      case 'professionnels':
        return {
          primary: '#4169E1',
          secondary: '#6495ED',
          border: 'rgba(100, 149, 237, 0.3)',
          borderSelected: '#6495ED',
          shadow: 'rgba(100, 149, 237, 0.25)',
        };
      case 'sportifs':
        return {
          primary: '#11998e',
          secondary: '#38ef7d',
          border: 'rgba(17, 153, 142, 0.3)',
          borderSelected: '#38ef7d',
          shadow: 'rgba(17, 153, 142, 0.25)',
        };
      default:
        return {
          primary: '#FFD700',
          secondary: '#FFA500',
          border: 'rgba(255, 215, 0, 0.3)',
          borderSelected: '#FFA500',
          shadow: 'rgba(255, 215, 0, 0.25)',
        };
    }
  };

  // Étape 1: Sélection du service
  const renderServiceSelection = () => {
    const filteredServices = selectedCategory
      ? services.filter(service => service.category === selectedCategory)
      : services;

    const colors = getCategoryColors(selectedCategory);

    return (
      <Box sx={{ mb: 4 }}>
        {serviceCategories.length > 0 && (
          <FormControl fullWidth margin="normal">
            <InputLabel id="category-select-label">Catégorie</InputLabel>
            <Select
              labelId="category-select-label"
              value={selectedCategory}
              onChange={handleCategoryChange}
              label="Catégorie"
            >
              {serviceCategories.map((category) => (
                <MenuItem key={category} value={category}>
                  {category === 'particuliers'
                    ? 'Particuliers'
                    : category === 'professionnels'
                    ? 'Professionnels'
                    : category === 'sportifs'
                    ? 'Sportifs'
                    : category}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <Grid container spacing={3} sx={{ mt: 2 }}>
          {filteredServices.map((service) => (
            <Grid item xs={12} md={6} key={service.id}>
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  background: 'white',
                  border: selectedService?.id === service.id
                    ? `2px solid ${colors.borderSelected}`
                    : `2px solid ${colors.border}`,
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
                    background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
                  },
                  '&:hover': {
                    borderColor: colors.borderSelected,
                    boxShadow: `0 12px 40px ${colors.shadow}`,
                    transform: 'translateY(-8px)',
                  },
                }}
              >
                <CardActionArea
                  onClick={() => handleServiceSelect(service)}
                  sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
                >
                  <CardContent sx={{ width: '100%', p: 3 }}>
                    <Typography variant="h6" component="div" sx={{ fontWeight: 600, color: '#1a1a2e', mb: 1 }}>
                      {service.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.7 }}>
                      {service.description}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 'auto', pt: 2 }}>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Durée: {service.duration} min
                      </Typography>
                      <Typography variant="body1" fontWeight="bold" sx={{ color: colors.secondary }}>
                        {service.price} €
                      </Typography>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };
  
  // Étape 2: Sélection du créneau (NOUVELLE VERSION AVEC CALENDRIER)
  const renderSlotSelection = () => {
    if (!selectedService) {
      return (
        <Alert severity="warning">
          Veuillez d'abord sélectionner un service
        </Alert>
      );
    }

    // Filtrer les services de la même catégorie que le service sélectionné
    const servicesInCategory = services.filter(s => s.category === selectedService.category);

    return (
      <Box sx={{ mb: 2 }}>
        {/* Filtres en ligne compacte */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {/* Filtre par service */}
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="small">
              <InputLabel id="service-filter-label">Module</InputLabel>
              <Select
                labelId="service-filter-label"
                value={selectedService.id}
                onChange={(e) => {
                  const newService = services.find(s => s.id === e.target.value);
                  if (newService) {
                    setSelectedService(newService);
                    loadWeeksData(newService.id);
                  }
                }}
                label="Module"
              >
                {servicesInCategory.map((service) => (
                  <MenuItem key={service.id} value={service.id}>
                    {service.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Filtre par praticien */}
          {selectedWeek && practitioners.length > 0 && (
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel id="practitioner-select-label">Intervenant</InputLabel>
                <Select
                  labelId="practitioner-select-label"
                  value={selectedPractitioner}
                  onChange={handlePractitionerChange}
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
          )}
        </Grid>

        {/* Nouveau composant de calendrier */}
        {availableWeeks.length > 0 ? (
          <WeeklyCalendar
            availableWeeks={availableWeeks}
            selectedWeek={selectedWeek}
            onWeekChange={handleWeekChange}
            appointmentSlots={appointmentSlots}
            selectedSlot={selectedSlot}
            onSlotSelect={handleSlotSelect as any}
            loading={loading}
            category={selectedCategory}
          />
        ) : (
          <Alert severity="info">
            Aucune disponibilité trouvée pour ce service.
          </Alert>
        )}
      </Box>
    );
  };
  
  // Étape 3: Confirmation et paiement
  const renderConfirmation = () => {
    if (!selectedService || !selectedSlot) {
      return (
        <Alert severity="warning">
          Veuillez d'abord sélectionner un service et un créneau
        </Alert>
      );
    }

    // Formatage des dates
    const appointmentDate = parseISO(selectedSlot.start_time);
    const formattedDate = format(appointmentDate, 'EEEE d MMMM yyyy', { locale: fr });
    const startTime = format(appointmentDate, 'HH:mm', { locale: fr });
    const endTime = format(parseISO(selectedSlot.end_time), 'HH:mm', { locale: fr });

    const colors = getCategoryColors(selectedCategory);

    return (
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h6"
          gutterBottom
          sx={{
            fontWeight: 600,
            color: '#1a1a2e',
            borderLeft: `4px solid ${colors.secondary}`,
            pl: 2,
            mb: 3
          }}
        >
          Confirmation de votre rendez-vous
        </Typography>

        {/* Récapitulatif du rendez-vous */}
        <Paper
          variant="outlined"
          sx={{
            p: 3,
            mb: 4,
            border: `2px solid ${colors.border}`,
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
              background: `linear-gradient(90deg, ${colors.primary}, ${colors.secondary})`,
            },
          }}
        >
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" fontWeight="bold">
                Service:
              </Typography>
              <Typography variant="body1" gutterBottom>
                {selectedService.name} ({selectedService.duration} min)
              </Typography>
              
              <Typography variant="subtitle1" fontWeight="bold">
                Date et heure:
              </Typography>
              <Typography variant="body1" gutterBottom sx={{ textTransform: 'capitalize' }}>
                {formattedDate}, de {startTime}  à {endTime}
              </Typography>
              
              <Typography variant="subtitle1" fontWeight="bold">
                Intervenant:
              </Typography>
              <Typography variant="body1" gutterBottom>
                {selectedSlot.practitioner.display_name || 
                 `${selectedSlot.practitioner.profile.first_name} ${selectedSlot.practitioner.profile.last_name}`}
                {selectedSlot.practitioner.title && ` (${selectedSlot.practitioner.title})`}
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" fontWeight="bold">
                Prix:
              </Typography>
              <Typography
                variant="h5"
                gutterBottom
                sx={{
                  fontWeight: 700,
                  background: `linear-gradient(45deg, ${colors.primary}, ${colors.secondary})`,
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {selectedService.price} €
              </Typography>
              
              <Box sx={{ mt: 2 }}>
                <Alert severity="info">
                  Le paiement sera à effectuer sur place.
                </Alert>
              </Box>
            </Grid>
          </Grid>
        </Paper>
        
        {/* Formulaire pour les informations complémentaires */}
        <Typography
          variant="h6"
          gutterBottom
          sx={{
            fontWeight: 600,
            color: '#1a1a2e',
            borderLeft: `4px solid ${colors.secondary}`,
            pl: 2,
            mb: 3
          }}
        >
          Informations complémentaires
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <FormControlLabel
            control={
              <Checkbox
                checked={beneficiaryIsSelf}
                onChange={(e) => setBeneficiaryIsSelf(e.target.checked)}
                color="primary"
              />
            }
            label="Je suis le bénéficiaire du rendez-vous"
          />

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Prénom du bénéficiaire"
                fullWidth
                required
                value={beneficiaryFirstName}
                onChange={(e) => setBeneficiaryFirstName(e.target.value)}
                disabled={beneficiaryIsSelf}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Nom du bénéficiaire"
                fullWidth
                required
                value={beneficiaryLastName}
                onChange={(e) => setBeneficiaryLastName(e.target.value)}
                disabled={beneficiaryIsSelf}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Date de naissance *"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={beneficiaryBirthDate}
                onChange={(e) => setBeneficiaryBirthDate(e.target.value)}
                disabled={beneficiaryIsSelf}
              />
            </Grid>
          </Grid>
        </Box>
        
        <TextField
          label="Notes ou informations supplémentaires"
          multiline
          rows={4}
          fullWidth
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          sx={{ mb: 3 }}
        />
        
        <Box
          sx={{
            p: 2,
            border: `2px solid ${colors.border}`,
            borderRadius: 2,
            backgroundColor: `${colors.primary}08`,
          }}
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                sx={{
                  color: colors.secondary,
                  '&.Mui-checked': {
                    color: colors.secondary,
                  },
                }}
              />
            }
            label={
              <Typography variant="body1">
                J'accepte les conditions générales d'utilisation <Typography component="span" color="error">*</Typography>
              </Typography>
            }
          />
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Votre rendez-vous a été réservé avec succès! Vous allez être redirigé vers vos rendez-vous.
          </Alert>
        )}
      </Box>
    );
  };
  
  // Si en cours de chargement, afficher un spinner
  if (loading && activeStep === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }
  
  return (
    <Box sx={{ width: '100%' }}>
      <Box
        sx={{
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
          py: 4,
          mt: { xs: '23px', md: '10px' },
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
                '&::after': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '400px',
                  height: '400px',
                  background: 'radial-gradient(circle, rgba(255, 215, 0, 0.15) 0%, transparent 70%)',
                  transform: 'translate(30%, -30%)',
                },
              }}
            >
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
                  Réservation de rendez-vous
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
              p: { xs: 2, md: 4 },
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
            {/* Stepper */}
            <Stepper activeStep={activeStep} sx={{ mb: 4, mt: 2, display: { xs: 'none', md: 'flex' } }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {/* Version mobile du stepper */}
            <Box sx={{ mb: 3, mt: 2, display: { xs: 'block', md: 'none' } }}>
              <Typography variant="h6" align="center" sx={{ fontWeight: 600, color: '#1a1a2e' }}>
                Étape {activeStep + 1}: {steps[activeStep]}
              </Typography>
            </Box>

            {/* Afficher les erreurs globales */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {/* Contenu de l'étape active */}
            {renderStepContent()}

            {/* Boutons de navigation */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
              <Button
                variant="outlined"
                onClick={handleBack}
                startIcon={<ArrowBackIcon />}
                disabled={activeStep === 0 || loading || success}
                sx={{
                  borderColor: 'rgba(255, 215, 0, 0.5)',
                  color: '#FFA500',
                  '&:hover': {
                    borderColor: '#FFA500',
                    backgroundColor: 'rgba(255, 215, 0, 0.1)',
                  },
                }}
              >
                Retour
              </Button>

              <Button
                variant="contained"
                onClick={handleNext}
                endIcon={activeStep === steps.length - 1 ? <CheckCircleIcon /> : <ArrowForwardIcon />}
                disabled={
                  (activeStep === 0 && !selectedService) ||
                  (activeStep === 1 && !selectedSlot) ||
                  (activeStep === 2 && !acceptTerms) ||
                  loading ||
                  success
                }
                sx={{
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
                  '&:disabled': {
                    background: 'rgba(0, 0, 0, 0.12)',
                    color: 'rgba(0, 0, 0, 0.26)',
                    boxShadow: 'none',
                  },
                }}
              >
                {activeStep === steps.length - 1 ? 'Confirmer' : 'Suivant'}
              </Button>
            </Box>
          </Paper>
          </Container>
        </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default AppointmentBookingPage;