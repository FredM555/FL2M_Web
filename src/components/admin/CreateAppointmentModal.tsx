// src/components/admin/CreateAppointmentModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Divider,
  Chip,
  Grid,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { fr } from 'date-fns/locale';
import { addMinutes, format } from 'date-fns';
import EventIcon from '@mui/icons-material/Event';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { supabase } from '../../services/supabase';
import { checkAppointmentConflict } from '../../services/supabase-appointments';

interface Service {
  id: string;
  code: string;
  name: string;
  category: string;
  subcategory: string;
  price: number;
  duration: number;
  description?: string;
}

interface CreateAppointmentModalProps {
  open: boolean;
  onClose: () => void;
  practitionerId: string;
  practitionerName: string;
  onSuccess: () => void;
}

const CreateAppointmentModal: React.FC<CreateAppointmentModalProps> = ({
  open,
  onClose,
  practitionerId,
  practitionerName,
  onSuccess
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // États du formulaire
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(new Date());
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');
  const [useCustomPrice, setUseCustomPrice] = useState(false);
  const [customPrice, setCustomPrice] = useState<number>(0);

  const steps = ['Service', 'Date et Heure', 'Confirmation'];

  // Charger les services
  useEffect(() => {
    loadServices();
  }, []);

  // Calculer automatiquement l'heure de fin quand le service ou la date change
  useEffect(() => {
    if (selectedService && startTime) {
      const calculatedEndTime = addMinutes(startTime, selectedService.duration);
      setEndTime(calculatedEndTime);
    }
  }, [selectedService, startTime]);

  const loadServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setServices(data || []);
    } catch (err: any) {
      console.error('Erreur lors du chargement des services:', err);
      setError('Impossible de charger les services');
    }
  };

  const handleServiceChange = (serviceId: string) => {
    setSelectedServiceId(serviceId);
    const service = services.find(s => s.id === serviceId);
    setSelectedService(service || null);
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
    setError(null);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
    setError(null);
  };

  const handleClose = () => {
    setActiveStep(0);
    setSelectedServiceId('');
    setSelectedService(null);
    setStartTime(new Date());
    setEndTime(null);
    setNotes('');
    setUseCustomPrice(false);
    setCustomPrice(0);
    setError(null);
    setSuccess(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!selectedService || !startTime || !endTime) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Vérifier les conflits de créneau
      const { hasConflict, conflictingAppointment } = await checkAppointmentConflict(
        practitionerId,
        selectedService.id,
        startTime.toISOString(),
        endTime.toISOString()
      );

      if (hasConflict) {
        setError(
          `Un rendez-vous existe déjà sur ce créneau (${format(
            new Date(conflictingAppointment.start_time),
            'dd/MM/yyyy HH:mm',
            { locale: fr }
          )})`
        );
        setLoading(false);
        return;
      }

      // Créer le rendez-vous
      const appointmentData: any = {
        practitioner_id: practitionerId,
        service_id: selectedService.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'pending',
        payment_status: 'unpaid',
        notes: notes.trim() || null,
        client_id: null, // Créneau disponible
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Ajouter le prix personnalisé si défini
      if (useCustomPrice) {
        appointmentData.custom_price = customPrice;
      }

      const { data, error: insertError } = await supabase
        .from('appointments')
        .insert(appointmentData)
        .select()
        .single();

      if (insertError) throw insertError;

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (err: any) {
      console.error('Erreur lors de la création du rendez-vous:', err);
      setError(err.message || 'Impossible de créer le rendez-vous');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      particuliers: 'Particuliers',
      professionnels: 'Professionnels',
      sportifs: 'Sportifs'
    };
    return labels[category] || category;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle
          sx={{
            background: 'linear-gradient(135deg, #345995 0%, #1D3461 100%)',
            color: 'white'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <EventIcon sx={{ mr: 1 }} />
            Créer un Rendez-vous pour {practitionerName}
          </Box>
        </DialogTitle>

        <DialogContent sx={{ mt: 3 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }} icon={<CheckCircleIcon />}>
              Rendez-vous créé avec succès !
            </Alert>
          )}

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Étape 1: Sélection du Service */}
          {activeStep === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Sélectionnez un service
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <FormControl fullWidth>
                <InputLabel>Service *</InputLabel>
                <Select
                  value={selectedServiceId}
                  onChange={(e) => handleServiceChange(e.target.value)}
                  label="Service *"
                >
                  {services.map((service) => (
                    <MenuItem key={service.id} value={service.id}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="body1">{service.name}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {getCategoryLabel(service.category)} - {service.subcategory}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Chip label={`${service.price}€`} size="small" color="primary" />
                          <Chip label={`${service.duration} min`} size="small" />
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedService && (
                <Box sx={{ mt: 3, p: 2, bgcolor: 'rgba(52, 89, 149, 0.05)', borderRadius: 2 }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom>
                    Détails du service
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Prix:
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {selectedService.price}€
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">
                        Durée:
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        {selectedService.duration} minutes
                      </Typography>
                    </Grid>
                  </Grid>
                  {selectedService.description && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body2" color="text.secondary">
                        Description:
                      </Typography>
                      <Typography variant="body2">
                        {selectedService.description}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          )}

          {/* Étape 2: Date et Heure */}
          {activeStep === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Choisissez la date et l'heure
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <DateTimePicker
                    label="Date et heure de début *"
                    value={startTime}
                    onChange={(newValue) => setStartTime(newValue)}
                    ampm={false}
                    format="dd/MM/yyyy HH:mm"
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true
                      }
                    }}
                  />
                </Grid>

                {endTime && (
                  <Grid item xs={12}>
                    <Alert severity="info" icon={<CheckCircleIcon />}>
                      <Typography variant="body2">
                        <strong>Heure de fin calculée automatiquement:</strong>{' '}
                        {format(endTime, 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                        Durée: {selectedService?.duration} minutes
                      </Typography>
                    </Alert>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <TextField
                    label="Notes (optionnel)"
                    multiline
                    rows={3}
                    fullWidth
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Informations complémentaires sur ce créneau..."
                  />
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={useCustomPrice}
                        onChange={(e) => {
                          setUseCustomPrice(e.target.checked);
                          if (!e.target.checked) {
                            setCustomPrice(0);
                          }
                        }}
                        color="primary"
                      />
                    }
                    label="Définir un prix personnalisé pour ce créneau"
                  />
                </Grid>

                {useCustomPrice && (
                  <Grid item xs={12}>
                    <TextField
                      label="Prix personnalisé (€)"
                      type="number"
                      fullWidth
                      value={customPrice}
                      onChange={(e) => setCustomPrice(parseFloat(e.target.value) || 0)}
                      inputProps={{
                        min: 0,
                        step: 0.01
                      }}
                      helperText={customPrice === 0 ? "Prix à 0€ = Affichage 'Gratuit pour découverte'" : `Prix du service par défaut: ${selectedService?.price}€`}
                    />
                  </Grid>
                )}
              </Grid>
            </Box>
          )}

          {/* Étape 3: Confirmation */}
          {activeStep === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Confirmation
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Box sx={{ p: 3, bgcolor: 'rgba(52, 89, 149, 0.05)', borderRadius: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Intervenant:
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {practitionerName}
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Divider />
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Service:
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {selectedService?.name}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                      <Chip
                        label={useCustomPrice ? (customPrice === 0 ? 'Gratuit pour découverte' : `${customPrice}€`) : `${selectedService?.price}€`}
                        size="small"
                        color={useCustomPrice && customPrice === 0 ? 'success' : 'primary'}
                      />
                      <Chip label={`${selectedService?.duration} min`} size="small" />
                    </Box>
                  </Grid>

                  <Grid item xs={12}>
                    <Divider />
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Date et heure de début:
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {startTime && format(startTime, 'dd/MM/yyyy', { locale: fr })}
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {startTime && format(startTime, 'HH:mm', { locale: fr })}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Heure de fin:
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {endTime && format(endTime, 'HH:mm', { locale: fr })}
                    </Typography>
                  </Grid>

                  {notes && (
                    <>
                      <Grid item xs={12}>
                        <Divider />
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary">
                          Notes:
                        </Typography>
                        <Typography variant="body2">
                          {notes}
                        </Typography>
                      </Grid>
                    </>
                  )}
                </Grid>
              </Box>

              <Alert severity="info" sx={{ mt: 2 }}>
                Ce créneau sera créé comme <strong>disponible</strong> (statut: pending). Il pourra être réservé par un client.
              </Alert>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleClose} disabled={loading}>
            Annuler
          </Button>
          {activeStep > 0 && (
            <Button onClick={handleBack} disabled={loading}>
              Retour
            </Button>
          )}
          {activeStep < steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={
                (activeStep === 0 && !selectedServiceId) ||
                (activeStep === 1 && (!startTime || !endTime))
              }
              sx={{
                background: 'linear-gradient(45deg, #345995, #1D3461)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #1D3461, #345995)'
                }
              }}
            >
              Suivant
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
              sx={{
                background: 'linear-gradient(45deg, #345995, #1D3461)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #1D3461, #345995)'
                }
              }}
            >
              {loading ? 'Création...' : 'Créer le Rendez-vous'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default CreateAppointmentModal;
