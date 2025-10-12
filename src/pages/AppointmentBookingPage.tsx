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
  
  // Étape 1: Sélection du service
  const renderServiceSelection = () => {
    const filteredServices = selectedCategory
      ? services.filter(service => service.category === selectedCategory)
      : services;
    
    return (
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Choisissez un service
        </Typography>
        
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
        
        <Grid container spacing={2} sx={{ mt: 2 }}>
          {filteredServices.map((service) => (
            <Grid item xs={12} md={6} key={service.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  border: selectedService?.id === service.id ? `2px solid ${theme.palette.primary.main}` : 'none',
                }}
              >
                <CardActionArea
                  onClick={() => handleServiceSelect(service)}
                  sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
                >
                  <CardContent sx={{ width: '100%' }}>
                    <Typography variant="h6" component="div">
                      {service.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {service.description}
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 'auto' }}>
                      <Typography variant="body2">
                        Durée: {service.duration} min
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
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
    
    return (
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          {selectedService.name} - Sélection du créneau
        </Typography>
        
        {/* Filtre par praticien */}
        {selectedWeek && practitioners.length > 0 && (
          <FormControl fullWidth margin="normal" sx={{ mb: 3 }}>
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
        )}
        
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
    
    return (
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Confirmation de votre rendez-vous
        </Typography>
        
        {/* Récapitulatif du rendez-vous */}
        <Paper variant="outlined" sx={{ p: 3, mb: 4 }}>
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
              <Typography variant="h5" color="primary" gutterBottom>
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
        <Typography variant="h6" gutterBottom>
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
          
          {!beneficiaryIsSelf && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Prénom du bénéficiaire"
                  fullWidth
                  required
                  value={beneficiaryFirstName}
                  onChange={(e) => setBeneficiaryFirstName(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Nom du bénéficiaire"
                  fullWidth
                  required
                  value={beneficiaryLastName}
                  onChange={(e) => setBeneficiaryLastName(e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Date de naissance"
                  type="date"
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                  value={beneficiaryBirthDate}
                  onChange={(e) => setBeneficiaryBirthDate(e.target.value)}
                />
              </Grid>
            </Grid>
          )}
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
        
        <FormControlLabel
          control={
            <Checkbox
              checked={acceptTerms}
              onChange={(e) => setAcceptTerms(e.target.checked)}
              color="primary"
            />
          }
          label="J'accepte les conditions générales d'utilisation"
        />
        
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
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: { xs: 2, md: 4 } }}>
        <Typography variant="h4" align="center" gutterBottom>
          Réservation de rendez-vous
        </Typography>
        
        {/* Stepper */}
        <Stepper activeStep={activeStep} sx={{ mb: 4, display: { xs: 'none', md: 'flex' } }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {/* Version mobile du stepper */}
        <Box sx={{ mb: 3, display: { xs: 'block', md: 'none' } }}>
          <Typography variant="h6" align="center">
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
              loading ||
              success
            }
          >
            {activeStep === steps.length - 1 ? 'Confirmer' : 'Suivant'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default AppointmentBookingPage;