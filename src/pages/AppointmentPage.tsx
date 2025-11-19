// src/pages/AppointmentPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Step,
  StepLabel,
  Stepper,
  Typography,
  Alert,
  Card,
  CardContent,
  CardActions,
  Divider,
  Avatar,
  TextField
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { fr } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';
import { 
  Service, 
  Practitioner, 
  getPractitioners, 
  getServices, 
  createAppointment 
} from '../services/supabase';
import { format, addMinutes } from 'date-fns';

// Étapes de la prise de rendez-vous
const steps = ['Choisir une prestation', 'Sélectionner un intervenant', 'Choisir une date', 'Confirmer et payer'];

const AppointmentPage = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  
  const [activeStep, setActiveStep] = useState(0);
  const [services, setServices] = useState<Service[]>([]);
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedPractitioner, setSelectedPractitioner] = useState<Practitioner | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Chargement des services
  useEffect(() => {
    const loadServices = async () => {
      setLoading(true);
      try {
        const { data, error } = await getServices();
        if (error) throw error;
        setServices(data || []);
      } catch (error: any) {
        setError('Erreur lors du chargement des prestations: ' + error.message);
      } finally {
        setLoading(false);
      }
    };
    
    loadServices();
  }, []);
  
  // Chargement des intervenants lorsqu'une prestation est sélectionnée
  useEffect(() => {
    if (selectedService) {
      const loadPractitioners = async () => {
        setLoading(true);
        try {
          const { data, error } = await getPractitioners();
          if (error) throw error;
          setPractitioners(data || []);
        } catch (error: any) {
          setError('Erreur lors du chargement des intervenants: ' + error.message);
        } finally {
          setLoading(false);
        }
      };
      
      loadPractitioners();
    }
  }, [selectedService]);
  
  // Catégories uniques pour le filtre
  const categories = [...new Set(services.map(service => service.category))];
  
  // Services filtrés par catégorie
  const filteredServices = selectedCategory 
    ? services.filter(service => service.category === selectedCategory)
    : services;
  
  // Fonctions pour naviguer entre les étapes
  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };
  
  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };
  
  // Sélection d'une prestation
  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setSelectedPractitioner(null);
    setSelectedDate(null);
    setSelectedTime(null);
    handleNext();
  };
  
  // Sélection d'un intervenant
  const handlePractitionerSelect = (practitioner: Practitioner) => {
    setSelectedPractitioner(practitioner);
    handleNext();
  };
  
  // Sélection d'une date et heure
  const handleDateTimeSelect = () => {
    if (selectedDate && selectedTime) {
      handleNext();
    }
  };
  
  // Confirmer et payer le rendez-vous
  const handleSubmit = async () => {
    if (!user || !selectedService || !selectedPractitioner || !selectedDate || !selectedTime) {
      setError('Veuillez compléter toutes les étapes');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Création de la date du rendez-vous en combinant date et heure
      const startDateTime = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        selectedTime.getHours(),
        selectedTime.getMinutes()
      );
      
      // Calcul de l'heure de fin en ajoutant la durée de la prestation
      const endDateTime = addMinutes(startDateTime, selectedService.duration);
      
      // Création du rendez-vous
      const { error } = await createAppointment({
        client_id: user.id,
        practitioner_id: selectedPractitioner.id,
        service_id: selectedService.id,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        status: 'pending',
        payment_status: 'unpaid',
      });
      
      if (error) throw error;
      
      // Redirection vers une page de confirmation ou de paiement
      navigate('/payment-success', { 
        state: { 
          appointmentDetails: {
            service: selectedService,
            practitioner: selectedPractitioner,
            date: startDateTime.toISOString(),
          } 
        } 
      });
    } catch (error: any) {
      setError('Erreur lors de la création du rendez-vous: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Contenu de l'étape actuelle
  const getStepContent = (step: number) => {
    switch (step) {
      case 0: // Choisir une prestation
        return (
          <Box>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Filtrer par catégorie</InputLabel>
              <Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                label="Filtrer par catégorie"
              >
                <MenuItem value="">Toutes les catégories</MenuItem>
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category === 'particuliers' ? 'Particuliers' : 
                     category === 'professionnels' ? 'Professionnels' : 'Sportifs'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Grid container spacing={3}>
              {filteredServices.map((service) => (
                <Grid item xs={12} md={6} lg={4} key={service.id}>
                  <Card 
                    sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column',
                      transition: 'transform 0.2s',
                      '&:hover': {
                        transform: 'translateY(-5px)',
                        boxShadow: 6
                      }
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" component="h2" gutterBottom>
                        {service.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {service.description || 'Aucune description disponible'}
                      </Typography>
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="text.primary">
                          <strong>Durée:</strong> {service.duration} minutes
                        </Typography>
                        <Typography variant="body2" color="text.primary">
                          <strong>Prix:à partir de </strong> {service.price} €
                        </Typography>
                        <Typography variant="body2" color="text.primary">
                          <strong>Code:</strong> {service.code}
                        </Typography>
                      </Box>
                    </CardContent>
                    <CardActions>
                      <Button 
                        fullWidth 
                        variant="contained" 
                        onClick={() => handleServiceSelect(service)}
                        disabled={service.is_on_demand}
                      >
                        {service.is_on_demand ? 'Sur demande uniquement' : 'Sélectionner'}
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        );
      
      case 1: // Sélectionner un intervenant
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Prestation sélectionnée: {selectedService?.name}
            </Typography>
            
            <Divider sx={{ mb: 3 }} />
            
            <Grid container spacing={3}>
              {practitioners.map((practitioner) => (
                <Grid item xs={12} md={6} key={practitioner.id}>
                  <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <CardContent>
                      <Box display="flex" alignItems="center" mb={2}>
                        <Avatar 
                          sx={{ width: 56, height: 56, mr: 2, bgcolor: 'primary.main' }}
                          alt={practitioner.profile?.first_name}
                        >
                          {practitioner.profile?.first_name ? practitioner.profile.first_name[0] : '?'}
                        </Avatar>
                        <Box>
                          <Typography variant="h6">
                            {practitioner.profile?.first_name} {practitioner.profile?.last_name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Intervenant
                          </Typography>
                        </Box>
                      </Box>
                      
                      {practitioner.bio && (
                        <Typography variant="body2" color="text.secondary" paragraph>
                          {practitioner.bio}
                        </Typography>
                      )}
                    </CardContent>
                    <CardActions sx={{ mt: 'auto' }}>
                      <Button 
                        fullWidth 
                        variant="contained" 
                        onClick={() => handlePractitionerSelect(practitioner)}
                      >
                        Sélectionner
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        );
      
      case 2: // Choisir une date
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Prestation: {selectedService?.name} avec {selectedPractitioner?.profile?.first_name} {selectedPractitioner?.profile?.last_name}
            </Typography>
            
            <Divider sx={{ mb: 4 }} />
            
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <DatePicker
                    label="Choisir une date"
                    value={selectedDate}
                    onChange={(newValue) => setSelectedDate(newValue)}
                    disablePast
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        margin: 'normal',
                        helperText: 'Sélectionnez une date disponible'
                      }
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TimePicker
                    label="Choisir une heure"
                    value={selectedTime}
                    onChange={(newValue) => setSelectedTime(newValue)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        margin: 'normal',
                        helperText: 'Sélectionnez une heure disponible'
                      }
                    }}
                  />
                </Grid>
              </Grid>
            </LocalizationProvider>
            
            <Box sx={{ mt: 4 }}>
              <Button
                variant="contained"
                onClick={handleDateTimeSelect}
                disabled={!selectedDate || !selectedTime}
              >
                Continuer
              </Button>
            </Box>
          </Box>
        );
      
      case 3: // Confirmer et payer
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Récapitulatif de votre rendez-vous
            </Typography>
            
            <Paper sx={{ p: 3, mb: 3 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Prestation:</Typography>
                  <Typography variant="body1" gutterBottom>{selectedService?.name}</Typography>
                  
                  <Typography variant="subtitle2">Intervenant:</Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedPractitioner?.profile?.first_name} {selectedPractitioner?.profile?.last_name}
                  </Typography>
                  
                  <Typography variant="subtitle2">Date et heure:</Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedDate && selectedTime ? format(
                      new Date(
                        selectedDate.getFullYear(),
                        selectedDate.getMonth(),
                        selectedDate.getDate(),
                        selectedTime.getHours(),
                        selectedTime.getMinutes()
                      ),
                      'EEEE d MMMM yyyy à HH:mm',
                      { locale: fr }
                    ) : ''}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2">Durée:</Typography>
                  <Typography variant="body1" gutterBottom>{selectedService?.duration} minutes</Typography>
                  
                  <Typography variant="subtitle2">Prix:à partir de </Typography>
                  <Typography variant="h6" color="primary" gutterBottom>{selectedService?.price} €</Typography>
                </Grid>
              </Grid>
            </Paper>
            
            {!user && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                Vous devez être connecté pour confirmer un rendez-vous. 
                <Button 
                  size="small" 
                  onClick={() => navigate('/login')}
                  sx={{ ml: 1 }}
                >
                  Se connecter
                </Button>
              </Alert>
            )}
            
            <Typography variant="h6" gutterBottom>
              Informations de paiement
            </Typography>
            
            {/* Formulaire de paiement simplifié pour l'exemple */}
            <form>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    required
                    label="Nom sur la carte"
                    fullWidth
                    defaultValue={user ? `${profile?.first_name} ${profile?.last_name}` : ''}
                    disabled={!user}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    required
                    label="Numéro de carte"
                    fullWidth
                    placeholder="1234 1234 1234 1234"
                    disabled={!user}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    required
                    label="Date d'expiration"
                    fullWidth
                    placeholder="MM/AA"
                    disabled={!user}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    required
                    label="CVC"
                    fullWidth
                    placeholder="123"
                    disabled={!user}
                  />
                </Grid>
              </Grid>
            </form>
            
            <Box sx={{ mt: 4 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSubmit}
                disabled={!user || loading}
                size="large"
              >
                {loading ? 'Traitement...' : `Payer ${selectedService?.price} €`}
              </Button>
            </Box>
          </Box>
        );
      
      default:
        return 'Étape inconnue';
    }
  };
  
  return (
    <Container maxWidth="lg">
      <Paper sx={{ p: 4, mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          Prendre un rendez-vous
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}
        
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {getStepContent(activeStep)}
        
        <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
          <Button
            variant="outlined"
            disabled={activeStep === 0}
            onClick={handleBack}
            sx={{ mr: 1 }}
          >
            Retour
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default AppointmentPage;