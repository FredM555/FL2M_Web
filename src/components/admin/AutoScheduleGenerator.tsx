// src/components/admin/AutoScheduleGenerator.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  TextField,
  Alert,
  Chip,
  Paper,
  Divider,
  CircularProgress,
  Radio,
  RadioGroup
} from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { fr } from 'date-fns/locale';
import { addMinutes, setHours, setMinutes, format, addDays, startOfWeek } from 'date-fns';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import { supabase } from '../../services/supabase';
import { Service, Practitioner } from '../../services/supabase';

interface TimeSlot {
  start: Date;
  end: Date;
}

interface DayAvailability {
  enabled: boolean;
  slots: TimeSlot[];
}

interface WeekAvailability {
  [key: string]: DayAvailability;
}

interface AutoScheduleGeneratorProps {
  open: boolean;
  onClose: () => void;
  practitioner: Practitioner;
  services: Service[];
  onGenerated: () => void;
}

const AutoScheduleGenerator: React.FC<AutoScheduleGeneratorProps> = ({
  open,
  onClose,
  practitioner,
  services,
  onGenerated
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Filtrer uniquement les 4 modules concernés par leur code
  const availableModules = services.filter(s =>
    ['PAAD', 'PACO', 'PAEN', 'PASA'].includes(s.code)
  );

  // États pour la configuration
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [intervalMinutes, setIntervalMinutes] = useState(15);
  const [startDate, setStartDate] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [endDate, setEndDate] = useState<Date>(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 6));
  const [replaceExisting, setReplaceExisting] = useState(false);

  // Disponibilités par jour
  const [weekAvailability, setWeekAvailability] = useState<WeekAvailability>({
    lundi: { enabled: false, slots: [{ start: setHours(setMinutes(new Date(), 0), 9), end: setHours(setMinutes(new Date(), 0), 17) }] },
    mardi: { enabled: false, slots: [{ start: setHours(setMinutes(new Date(), 0), 9), end: setHours(setMinutes(new Date(), 0), 17) }] },
    mercredi: { enabled: false, slots: [{ start: setHours(setMinutes(new Date(), 0), 9), end: setHours(setMinutes(new Date(), 0), 17) }] },
    jeudi: { enabled: false, slots: [{ start: setHours(setMinutes(new Date(), 0), 9), end: setHours(setMinutes(new Date(), 0), 17) }] },
    vendredi: { enabled: false, slots: [{ start: setHours(setMinutes(new Date(), 0), 9), end: setHours(setMinutes(new Date(), 0), 17) }] },
    samedi: { enabled: false, slots: [{ start: setHours(setMinutes(new Date(), 0), 9), end: setHours(setMinutes(new Date(), 0), 17) }] },
    dimanche: { enabled: false, slots: [{ start: setHours(setMinutes(new Date(), 0), 9), end: setHours(setMinutes(new Date(), 0), 17) }] },
  });

  const [preview, setPreview] = useState<{ day: string; count: number }[]>([]);

  const daysOfWeek = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  const daysOfWeekMap: { [key: string]: number } = {
    lundi: 1, mardi: 2, mercredi: 3, jeudi: 4, vendredi: 5, samedi: 6, dimanche: 0
  };

  // Gestion des modules sélectionnés
  const handleModuleToggle = (serviceId: string) => {
    setSelectedModules(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  // Gestion du jour activé/désactivé
  const handleDayToggle = (day: string) => {
    setWeekAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        enabled: !prev[day].enabled
      }
    }));
  };

  // Mise à jour des horaires d'un jour
  const handleTimeChange = (day: string, slotIndex: number, type: 'start' | 'end', value: Date | null) => {
    if (!value) return;

    setWeekAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day].slots.map((slot, idx) =>
          idx === slotIndex
            ? { ...slot, [type]: value }
            : slot
        )
      }
    }));
  };

  // Ajouter une plage horaire
  const addTimeSlot = (day: string) => {
    setWeekAvailability(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: [
          ...prev[day].slots,
          { start: setHours(setMinutes(new Date(), 0), 14), end: setHours(setMinutes(new Date(), 0), 18) }
        ]
      }
    }));
  };

  // Prévisualiser le nombre de créneaux
  const handlePreview = () => {
    const previewData: { day: string; count: number }[] = [];
    let totalSlots = 0;

    daysOfWeek.forEach(day => {
      if (!weekAvailability[day].enabled) return;

      let dayCount = 0;
      weekAvailability[day].slots.forEach(timeSlot => {
        selectedModules.forEach(serviceId => {
          const service = services.find(s => s.id === serviceId);
          if (!service) return;

          const duration = service.duration || 60;
          const slotStart = timeSlot.start;
          const slotEnd = timeSlot.end;

          let currentTime = new Date(slotStart);
          while (currentTime.getTime() + duration * 60000 <= slotEnd.getTime()) {
            dayCount++;
            currentTime = addMinutes(currentTime, duration + intervalMinutes);
          }
        });
      });

      if (dayCount > 0) {
        previewData.push({ day, count: dayCount });
        totalSlots += dayCount;
      }
    });

    setPreview(previewData);
    if (totalSlots === 0) {
      setError('Aucun créneau ne peut être généré avec ces paramètres');
    } else {
      setError(null);
      setSuccess(`${totalSlots} créneaux seront générés`);
    }
  };

  // Générer les créneaux
  const handleGenerate = async () => {
    if (selectedModules.length === 0) {
      setError('Veuillez sélectionner au moins un module');
      return;
    }

    const enabledDays = daysOfWeek.filter(day => weekAvailability[day].enabled);
    if (enabledDays.length === 0) {
      setError('Veuillez activer au moins un jour de disponibilité');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let deletedCount = 0;

      // Si mode remplacement, supprimer d'abord les créneaux disponibles de la période
      if (replaceExisting) {
        const startDateTime = new Date(startDate);
        startDateTime.setHours(0, 0, 0, 0);

        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);

        // Supprimer uniquement les rendez-vous SANS CLIENT (disponibles) de l'intervenant pour cette période
        const { error: deleteError, count } = await supabase
          .from('appointments')
          .delete({ count: 'exact' })
          .eq('practitioner_id', practitioner.id)
          .is('client_id', null) // Seulement les créneaux sans client
          .gte('start_time', startDateTime.toISOString())
          .lte('start_time', endDateTime.toISOString());

        if (deleteError) throw deleteError;

        deletedCount = count || 0;
        console.log(`${deletedCount} créneaux disponibles supprimés pour la période`);
      }

      const appointmentsToCreate: any[] = [];

      // Parcourir chaque jour entre startDate et endDate
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        const dayName = Object.keys(daysOfWeekMap).find(key => daysOfWeekMap[key] === dayOfWeek);

        if (dayName && weekAvailability[dayName]?.enabled) {
          // Pour chaque plage horaire du jour
          weekAvailability[dayName].slots.forEach(timeSlot => {
            // Pour chaque module sélectionné
            selectedModules.forEach(serviceId => {
              const service = services.find(s => s.id === serviceId);
              if (!service) return;

              const duration = service.duration || 60;
              const slotStartHours = timeSlot.start.getHours();
              const slotStartMinutes = timeSlot.start.getMinutes();
              const slotEndHours = timeSlot.end.getHours();
              const slotEndMinutes = timeSlot.end.getMinutes();

              // Créer la date de début avec les bonnes heures
              let currentTime = new Date(currentDate);
              currentTime.setHours(slotStartHours, slotStartMinutes, 0, 0);

              const slotEnd = new Date(currentDate);
              slotEnd.setHours(slotEndHours, slotEndMinutes, 0, 0);

              // Générer les créneaux
              while (currentTime.getTime() + duration * 60000 <= slotEnd.getTime()) {
                const appointmentStart = new Date(currentTime);
                const appointmentEnd = addMinutes(appointmentStart, duration);

                appointmentsToCreate.push({
                  practitioner_id: practitioner.id,
                  service_id: serviceId,
                  start_time: appointmentStart.toISOString(),
                  end_time: appointmentEnd.toISOString(),
                  status: 'pending',
                  payment_status: 'unpaid',
                  client_id: null
                });

                currentTime = addMinutes(currentTime, duration + intervalMinutes);
              }
            });
          });
        }

        currentDate = addDays(currentDate, 1);
      }

      if (appointmentsToCreate.length === 0) {
        setError('Aucun créneau à créer');
        setLoading(false);
        return;
      }

      // Insérer en base de données
      const { error: insertError } = await supabase
        .from('appointments')
        .insert(appointmentsToCreate);

      if (insertError) throw insertError;

      // Message de succès adapté au mode
      const successMessage = replaceExisting
        ? `${deletedCount} créneaux supprimés, ${appointmentsToCreate.length} créneaux créés avec succès !`
        : `${appointmentsToCreate.length} créneaux créés avec succès !`;

      setSuccess(successMessage);
      setLoading(false);

      setTimeout(() => {
        onGenerated();
        onClose();
      }, 2000);

    } catch (err: any) {
      setError(`Erreur lors de la génération : ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CalendarMonthIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h5">Générateur de Planning Automatique</Typography>
            <Typography variant="body2" color="text.secondary">
              Créez automatiquement vos créneaux de disponibilité
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}

          {/* Section 1: Période */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>1. Période de génération</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Date de début"
                  value={startDate}
                  onChange={(date) => date && setStartDate(date)}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Date de fin"
                  value={endDate}
                  onChange={(date) => date && setEndDate(date)}
                  slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                />
              </Grid>

              <Grid item xs={12}>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                  Gestion des rendez-vous existants :
                </Typography>
                <RadioGroup
                  value={replaceExisting ? 'replace' : 'add'}
                  onChange={(e) => setReplaceExisting(e.target.value === 'replace')}
                >
                  <FormControlLabel
                    value="add"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="body1">Ajouter aux rendez-vous existants</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Les créneaux déjà présents seront conservés, nouveaux créneaux ajoutés
                        </Typography>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    value="replace"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="body1" sx={{ color: 'warning.main', fontWeight: 600 }}>
                          Remplacer les rendez-vous disponibles
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ⚠️ Supprime uniquement les créneaux NON RÉSERVÉS (sans client) de la période, puis génère les nouveaux
                        </Typography>
                      </Box>
                    }
                  />
                </RadioGroup>

                {replaceExisting && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Mode remplacement activé
                    </Typography>
                    <Typography variant="caption">
                      • Les rendez-vous RÉSERVÉS (avec client) seront conservés<br />
                      • Seuls les créneaux DISPONIBLES de cette période seront supprimés puis recréés
                    </Typography>
                  </Alert>
                )}
              </Grid>
            </Grid>
          </Paper>

          {/* Section 2: Modules */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>2. Modules à proposer</Typography>
            <Grid container spacing={2}>
              {availableModules.map(service => (
                <Grid item xs={12} sm={6} key={service.id}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedModules.includes(service.id)}
                        onChange={() => handleModuleToggle(service.id)}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1">{service.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {service.duration} minutes
                        </Typography>
                      </Box>
                    }
                  />
                </Grid>
              ))}
            </Grid>
          </Paper>

          {/* Section 3: Intervalle */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>3. Intervalle entre les rendez-vous</Typography>
            <FormControl fullWidth size="small">
              <InputLabel>Intervalle</InputLabel>
              <Select
                value={intervalMinutes}
                onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                label="Intervalle"
              >
                <MenuItem value={0}>Aucun (rendez-vous consécutifs)</MenuItem>
                <MenuItem value={15}>15 minutes</MenuItem>
                <MenuItem value={30}>30 minutes</MenuItem>
                <MenuItem value={45}>45 minutes</MenuItem>
                <MenuItem value={60}>1 heure</MenuItem>
              </Select>
            </FormControl>
          </Paper>

          {/* Section 4: Disponibilités hebdomadaires */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>4. Disponibilités hebdomadaires</Typography>
            {daysOfWeek.map(day => (
              <Box key={day} sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={weekAvailability[day].enabled}
                      onChange={() => handleDayToggle(day)}
                    />
                  }
                  label={
                    <Typography variant="subtitle1" sx={{ textTransform: 'capitalize', fontWeight: 600 }}>
                      {day}
                    </Typography>
                  }
                />

                {weekAvailability[day].enabled && (
                  <Box sx={{ mt: 2, pl: 4 }}>
                    {weekAvailability[day].slots.map((slot, index) => (
                      <Grid container spacing={2} key={index} sx={{ mb: 2 }}>
                        <Grid item xs={12} sm={5}>
                          <TimePicker
                            label="Début"
                            value={slot.start}
                            onChange={(value) => handleTimeChange(day, index, 'start', value)}
                            slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={5}>
                          <TimePicker
                            label="Fin"
                            value={slot.end}
                            onChange={(value) => handleTimeChange(day, index, 'end', value)}
                            slotProps={{ textField: { fullWidth: true, size: 'small' } }}
                          />
                        </Grid>
                        <Grid item xs={12} sm={2} sx={{ display: 'flex', alignItems: 'center' }}>
                          {weekAvailability[day].slots.length > 1 && (
                            <Button
                              size="small"
                              color="error"
                              onClick={() => {
                                setWeekAvailability(prev => ({
                                  ...prev,
                                  [day]: {
                                    ...prev[day],
                                    slots: prev[day].slots.filter((_, idx) => idx !== index)
                                  }
                                }));
                              }}
                            >
                              Supprimer
                            </Button>
                          )}
                        </Grid>
                      </Grid>
                    ))}
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => addTimeSlot(day)}
                    >
                      + Ajouter une plage horaire
                    </Button>
                  </Box>
                )}
              </Box>
            ))}
          </Paper>

          {/* Prévisualisation */}
          {preview.length > 0 && (
            <Paper sx={{ p: 3, bgcolor: 'success.50' }}>
              <Typography variant="h6" gutterBottom color="success.main">
                Prévisualisation
              </Typography>
              <Grid container spacing={1}>
                {preview.map(item => (
                  <Grid item key={item.day}>
                    <Chip
                      label={`${item.day}: ${item.count} créneaux`}
                      color="success"
                      variant="outlined"
                    />
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}
        </LocalizationProvider>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} disabled={loading}>
          Annuler
        </Button>
        <Button
          variant="outlined"
          onClick={handlePreview}
          disabled={loading}
          startIcon={<AutorenewIcon />}
        >
          Prévisualiser
        </Button>
        <Button
          variant="contained"
          onClick={handleGenerate}
          disabled={loading || selectedModules.length === 0}
          startIcon={loading ? <CircularProgress size={20} /> : <CalendarMonthIcon />}
        >
          {loading ? 'Génération...' : 'Générer le Planning'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AutoScheduleGenerator;
