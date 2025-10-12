// src/components/appointments/WeeklyCalendar.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Grid,
  Typography,
  Button,
  Card,
  CardContent,
  IconButton,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Alert
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';

// Type pour les créneaux de rendez-vous
interface AppointmentSlot {
  id: string;
  start_time: string;
  end_time: string;
  service: {
    id: string;
    name: string;
    duration: number;
    price: number;
  };
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

// Type pour les informations de semaine
interface WeekInfo {
  weekStart: string;
  weekEnd: string;
  displayRange: string;
}

// Props pour le composant
interface WeeklyCalendarProps {
  availableWeeks: WeekInfo[];
  selectedWeek: WeekInfo | null;
  onWeekChange: (week: WeekInfo) => void;
  appointmentSlots: AppointmentSlot[];
  selectedSlot: AppointmentSlot | null;
  onSlotSelect: (slot: AppointmentSlot) => void;
  loading: boolean;
}

// Créer un tableau des heures de 8h à 20h
const ALL_TIME_SLOTS = Array.from({ length: 13 }, (_, index) => ({
  hour: index + 8,
  label: `${(index + 8).toString().padStart(2, '0')}:00`
}));

const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({
  availableWeeks,
  selectedWeek,
  onWeekChange,
  appointmentSlots,
  selectedSlot,
  onSlotSelect,
  loading
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // État pour stocker le détail du rendez-vous sélectionné
  const [selectedAppointmentDetails, setSelectedAppointmentDetails] = useState<AppointmentSlot | null>(null);
  
  // Effet pour mettre à jour le détail quand on sélectionne un créneau
  useEffect(() => {
    setSelectedAppointmentDetails(selectedSlot);
  }, [selectedSlot]);
  
  // Si aucune semaine n'est sélectionnée, ne rien afficher
  if (!selectedWeek) return null;
  
  // Créer un tableau des jours de la semaine à partir de la date de début
  const weekDays = eachDayOfInterval({
    start: parseISO(selectedWeek.weekStart),
    end: parseISO(selectedWeek.weekEnd)
  }).map(date => ({
    date,
    dayName: format(date, 'EEEE', { locale: fr }),
    dayNumber: format(date, 'd', { locale: fr }),
    month: format(date, 'MMMM', { locale: fr }),
    dateString: format(date, 'yyyy-MM-dd')
  }));
  
  // Fonction pour vérifier si un jour a des rendez-vous
  const hasDayAppointments = (day: string) => {
    return appointmentSlots.some(slot => {
      const startDate = parseISO(slot.start_time);
      return format(startDate, 'yyyy-MM-dd') === day;
    });
  };
  
  // Obtenir les heures qui ont des rendez-vous
  const usedHours = new Set<number>();
  appointmentSlots.forEach(slot => {
    const startTime = parseISO(slot.start_time);
    usedHours.add(startTime.getHours());
  });
  
  // Filtrer les créneaux horaires qui ont des rendez-vous et les trier
  const timeSlots = usedHours.size > 0
    ? ALL_TIME_SLOTS.filter(timeSlot => usedHours.has(timeSlot.hour)).sort((a, b) => a.hour - b.hour)
    : ALL_TIME_SLOTS.slice(0, 5); // Afficher quelques créneaux par défaut si aucun rendez-vous
  
  // Gestionnaire pour changer de semaine
  const handleWeekChange = (direction: 'prev' | 'next') => {
    const currentIndex = availableWeeks.findIndex(
      week => week.weekStart === selectedWeek.weekStart
    );
    
    if (direction === 'prev' && currentIndex > 0) {
      onWeekChange(availableWeeks[currentIndex - 1]);
    } else if (direction === 'next' && currentIndex < availableWeeks.length - 1) {
      onWeekChange(availableWeeks[currentIndex + 1]);
    }
  };
  
  // Fonction pour vérifier si un créneau de rendez-vous est dans une plage horaire
  const getAppointmentsInTimeSlot = (day: string, hour: number) => {
    return appointmentSlots.filter(slot => {
      const startTime = parseISO(slot.start_time);
      const startHour = startTime.getHours();
      const dayMatches = format(startTime, 'yyyy-MM-dd') === day;
      
      // Vérifier si le rendez-vous commence dans cette heure
      return dayMatches && startHour === hour;
    });
  };
  
  // Vérifier s'il y a au moins un rendez-vous disponible dans la semaine
  const hasAnyAppointments = appointmentSlots.length > 0;
  
  return (
    <Box sx={{ mb: 4 }}>
      {/* Navigation entre les semaines */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <IconButton 
          onClick={() => handleWeekChange('prev')} 
          disabled={availableWeeks.indexOf(selectedWeek) === 0 || loading}
        >
          <ArrowBackIcon />
        </IconButton>
        
        <Typography variant="h6" sx={{ textAlign: 'center', flex: 1 }}>
          {selectedWeek.displayRange}
        </Typography>
        
        <IconButton 
          onClick={() => handleWeekChange('next')}
          disabled={availableWeeks.indexOf(selectedWeek) === availableWeeks.length - 1 || loading}
        >
          <ArrowForwardIcon />
        </IconButton>
      </Box>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Grille de calendrier */}
          {hasAnyAppointments ? (
            <Paper variant="outlined" sx={{ mb: 3, overflow: 'auto' }}>
              <Box sx={{ minWidth: isMobile ? 600 : 'auto' }}>
                {/* En-têtes des jours */}
                <Grid container sx={{ borderBottom: 1, borderColor: 'divider' }}>
                  {/* Cellule vide pour l'en-tête des heures */}
                  <Grid item xs={1} sx={{ 
                    py: 2, 
                    borderRight: 1, 
                    borderColor: 'divider',
                    textAlign: 'center' 
                  }}>
                    <Typography variant="subtitle2">Heure</Typography>
                  </Grid>
                  
                  {/* En-têtes des jours */}
                  {weekDays.map((day) => (
                    <Grid item xs key={day.dateString} sx={{ 
                      py: 2, 
                      borderRight: 1, 
                      borderColor: 'divider',
                      textAlign: 'center',
                      backgroundColor: hasDayAppointments(day.dateString) ? 'rgba(25, 118, 210, 0.08)' : 'inherit'
                    }}>
                      <Typography variant="subtitle1" sx={{ textTransform: 'capitalize' }}>
                        {day.dayName}
                      </Typography>
                      <Typography variant="h6">
                        {day.dayNumber}
                      </Typography>
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                        {day.month}
                      </Typography>
                      {hasDayAppointments(day.dateString) && (
                        <Typography variant="caption" sx={{ display: 'block', color: 'primary.main', mt: 0.5 }}>
                          Disponible
                        </Typography>
                      )}
                    </Grid>
                  ))}
                </Grid>
                
                {/* Lignes pour chaque créneau horaire */}
                {timeSlots.map((timeSlot) => (
                  <Grid container key={timeSlot.hour} sx={{ 
                    borderBottom: 1, 
                    borderColor: 'divider',
                    '&:last-child': {
                      borderBottom: 0
                    }
                  }}>
                    {/* Cellule d'heure */}
                    <Grid item xs={1} sx={{ 
                      py: 1.5, 
                      px: 1,
                      borderRight: 1, 
                      borderColor: 'divider',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Typography variant="body2">{timeSlot.label}</Typography>
                    </Grid>
                    
                    {/* Cellules pour chaque jour */}
                    {weekDays.map((day) => {
                      const appointmentsInSlot = getAppointmentsInTimeSlot(day.dateString, timeSlot.hour);
                      
                      return (
                        <Grid item xs key={`${day.dateString}-${timeSlot.hour}`} sx={{ 
                          py: 1.5, 
                          borderRight: 1, 
                          borderColor: 'divider',
                          minHeight: '50px',
                          position: 'relative',
                          backgroundColor: hasDayAppointments(day.dateString) ? 'transparent' : 'rgba(0, 0, 0, 0.03)'
                        }}>
                          {appointmentsInSlot.length > 0 ? (
                            <Box sx={{ 
                              display: 'flex', 
                              flexDirection: 'column', 
                              height: '100%',
                              px: 1
                            }}>
                              {appointmentsInSlot.map((slot) => {
                                const startTime = parseISO(slot.start_time);
                                const formattedStartTime = format(startTime, 'HH:mm');
                                const consultantName = slot.practitioner.display_name || 
                                  `${slot.practitioner.profile.first_name} ${slot.practitioner.profile.last_name}`;
                                
                                return (
                                  <Button
                                    key={slot.id}
                                    variant={selectedSlot?.id === slot.id ? "contained" : "outlined"}
                                    color="primary"
                                    size="small"
                                    onClick={() => {
                                      onSlotSelect(slot);
                                      setSelectedAppointmentDetails(slot);
                                    }}
                                    sx={{ 
                                      mb: 0.5,
                                      textTransform: 'none',
                                      justifyContent: 'flex-start',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      minHeight: '28px'
                                    }}
                                  >
                                    {formattedStartTime} - {consultantName}
                                  </Button>
                                );
                              })}
                            </Box>
                          ) : null}
                        </Grid>
                      );
                    })}
                  </Grid>
                ))}
              </Box>
            </Paper>
          ) : (
            <Alert severity="info" sx={{ mb: 3 }}>
              Aucun créneau disponible pour cette semaine. Veuillez sélectionner une autre semaine.
            </Alert>
          )}
          
          {/* Détails du rendez-vous sélectionné */}
          {selectedAppointmentDetails && (
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Détails du rendez-vous
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Date et heure:
                    </Typography>
                    <Typography variant="body1" gutterBottom sx={{ textTransform: 'capitalize' }}>
                      {format(parseISO(selectedAppointmentDetails.start_time), 'EEEE d MMMM yyyy', { locale: fr })}, 
                      de {format(parseISO(selectedAppointmentDetails.start_time), 'HH:mm', { locale: fr })} 
                      à {format(parseISO(selectedAppointmentDetails.end_time), 'HH:mm', { locale: fr })}
                    </Typography>
                    
                    <Typography variant="subtitle1" fontWeight="bold">
                      Service:
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {selectedAppointmentDetails.service.name} ({selectedAppointmentDetails.service.duration} min)
                    </Typography>
                    
                    <Typography variant="subtitle1" fontWeight="bold">
                      Prix:
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {selectedAppointmentDetails.service.price} €
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Intervenant:
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {selectedAppointmentDetails.practitioner.display_name || 
                       `${selectedAppointmentDetails.practitioner.profile.first_name} ${selectedAppointmentDetails.practitioner.profile.last_name}`}
                      {selectedAppointmentDetails.practitioner.title && ` (${selectedAppointmentDetails.practitioner.title})`}
                    </Typography>
                    
                    {selectedAppointmentDetails.practitioner.bio && (
                      <>
                        <Typography variant="subtitle1" fontWeight="bold">
                          À propos de l'intervenant:
                        </Typography>
                        <Typography variant="body2">
                          {selectedAppointmentDetails.practitioner.bio}
                        </Typography>
                      </>
                    )}
                  </Grid>
                </Grid>
                
              </CardContent>
            </Card>
          )}
        </>
      )}
    </Box>
  );
};

export default WeeklyCalendar;