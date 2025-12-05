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
  custom_price?: number;
  service: {
    id: string;
    name: string;
    duration: number;
    price: number;
    description?: string;
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
  category?: string;
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
  loading,
  category = 'particuliers'
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // État pour stocker le détail du rendez-vous sélectionné
  const [selectedAppointmentDetails, setSelectedAppointmentDetails] = useState<AppointmentSlot | null>(null);

  // Fonction pour obtenir les couleurs selon la catégorie
  const getCategoryColors = () => {
    switch (category) {
      case 'particuliers':
        return {
          primary: '#FFD700',
          secondary: '#FFA500',
          light: 'rgba(255, 215, 0, 0.1)',
          border: 'rgba(255, 215, 0, 0.3)',
          gradient: 'linear-gradient(90deg, #FFD700, #FFA500)',
        };
      case 'professionnels':
        return {
          primary: '#4169E1',
          secondary: '#6495ED',
          light: 'rgba(65, 105, 225, 0.1)',
          border: 'rgba(100, 149, 237, 0.3)',
          gradient: 'linear-gradient(90deg, #4169E1, #6495ED)',
        };
      case 'sportifs':
        return {
          primary: '#11998e',
          secondary: '#38ef7d',
          light: 'rgba(17, 153, 142, 0.1)',
          border: 'rgba(17, 153, 142, 0.3)',
          gradient: 'linear-gradient(90deg, #11998e, #38ef7d)',
        };
      default:
        return {
          primary: '#FFD700',
          secondary: '#FFA500',
          light: 'rgba(255, 215, 0, 0.1)',
          border: 'rgba(255, 215, 0, 0.3)',
          gradient: 'linear-gradient(90deg, #FFD700, #FFA500)',
        };
    }
  };

  const colors = getCategoryColors();
  
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
  
  // Version mobile - Vue en liste groupée par jour
  const renderMobileView = () => {
    // Grouper les créneaux par jour
    const slotsByDay = weekDays.reduce((acc, day) => {
      const daySlots = appointmentSlots.filter(slot => {
        const startDate = parseISO(slot.start_time);
        return format(startDate, 'yyyy-MM-dd') === day.dateString;
      }).sort((a, b) => {
        return parseISO(a.start_time).getTime() - parseISO(b.start_time).getTime();
      });

      if (daySlots.length > 0) {
        acc.push({
          day,
          slots: daySlots
        });
      }
      return acc;
    }, [] as Array<{ day: typeof weekDays[0], slots: AppointmentSlot[] }>);

    return (
      <Box>
        {slotsByDay.length > 0 ? (
          slotsByDay.map(({ day, slots }) => (
            <Paper
              key={day.dateString}
              elevation={0}
              sx={{
                mb: 2,
                background: 'white',
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
                  background: colors.gradient,
                },
              }}
            >
              {/* En-tête du jour */}
              <Box sx={{ p: 2, backgroundColor: colors.light, borderBottom: `1px solid ${colors.border}` }}>
                <Typography variant="h6" sx={{ textTransform: 'capitalize', fontWeight: 600, color: '#1a1a2e' }}>
                  {day.dayName} {day.dayNumber} {day.month}
                </Typography>
              </Box>

              {/* Liste des créneaux */}
              <Box sx={{ p: 1 }}>
                {slots.map((slot) => {
                  const startTime = parseISO(slot.start_time);
                  const endTime = parseISO(slot.end_time);
                  const consultantName = slot.practitioner.display_name ||
                    `${slot.practitioner.profile.first_name} ${slot.practitioner.profile.last_name}`;

                  return (
                    <Button
                      key={slot.id}
                      fullWidth
                      variant={selectedSlot?.id === slot.id ? "contained" : "outlined"}
                      onClick={() => {
                        onSlotSelect(slot);
                        setSelectedAppointmentDetails(slot);
                      }}
                      sx={{
                        mb: 1,
                        p: 2,
                        textTransform: 'none',
                        justifyContent: 'flex-start',
                        textAlign: 'left',
                        background: selectedSlot?.id === slot.id ? colors.gradient : 'transparent',
                        color: selectedSlot?.id === slot.id ? 'white' : '#1a1a2e',
                        borderColor: selectedSlot?.id === slot.id ? colors.secondary : colors.border,
                        '&:hover': {
                          borderColor: colors.secondary,
                          backgroundColor: selectedSlot?.id === slot.id ? colors.secondary : colors.light,
                        },
                      }}
                    >
                      <Box sx={{ width: '100%' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          {consultantName}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.8, display: 'block', mt: 0.5 }}>
                          {slot.service.name} ({slot.service.duration} min)
                        </Typography>
                      </Box>
                    </Button>
                  );
                })}
              </Box>
            </Paper>
          ))
        ) : (
          <Alert severity="info" sx={{ mb: 2 }}>
            Aucun créneau disponible pour cette semaine.
          </Alert>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ mb: 2 }}>
      {/* Navigation entre les semaines */}
      <Paper
        elevation={0}
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
          p: 1.5,
          background: 'white',
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
            background: colors.gradient,
          },
        }}
      >
        <IconButton
          onClick={() => handleWeekChange('prev')}
          disabled={availableWeeks.indexOf(selectedWeek) === 0 || loading}
          sx={{
            color: colors.secondary,
            '&:hover': {
              backgroundColor: colors.light,
            },
            '&:disabled': {
              color: 'rgba(0, 0, 0, 0.26)',
            },
          }}
        >
          <ArrowBackIcon />
        </IconButton>

        <Typography variant="subtitle1" sx={{ textAlign: 'center', flex: 1, fontWeight: 600, color: '#1a1a2e', fontSize: { xs: '0.9rem', md: '1rem' } }}>
          {selectedWeek.displayRange}
        </Typography>

        <IconButton
          onClick={() => handleWeekChange('next')}
          disabled={availableWeeks.indexOf(selectedWeek) === availableWeeks.length - 1 || loading}
          sx={{
            color: colors.secondary,
            '&:hover': {
              backgroundColor: colors.light,
            },
            '&:disabled': {
              color: 'rgba(0, 0, 0, 0.26)',
            },
          }}
        >
          <ArrowForwardIcon />
        </IconButton>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Affichage conditionnel : Vue mobile ou vue desktop */}
          {isMobile ? (
            renderMobileView()
          ) : (
            <>
              {/* Grille de calendrier (desktop) */}
              {hasAnyAppointments ? (
            <Paper
              elevation={0}
              sx={{
                mb: 2,
                overflow: 'auto',
                background: 'white',
                border: `2px solid ${colors.border}`,
                borderRadius: 3,
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: colors.gradient,
                },
              }}
            >
              <Box sx={{ minWidth: isMobile ? 600 : 'auto', display: 'table', width: '100%', tableLayout: 'fixed' }}>
                {/* En-têtes des jours */}
                <Box sx={{ display: 'table-row', borderBottom: 2, borderColor: colors.border }}>
                  {/* Cellule vide pour l'en-tête des heures */}
                  <Box sx={{
                    display: 'table-cell',
                    width: '80px',
                    py: 1.5,
                    borderRight: 1,
                    borderColor: colors.border,
                    textAlign: 'center',
                    fontWeight: 600,
                    verticalAlign: 'middle',
                  }}>
                    <Typography variant="caption" fontWeight={600}>Heure</Typography>
                  </Box>

                  {/* En-têtes des jours */}
                  {weekDays.map((day) => (
                    <Box key={day.dateString} sx={{
                      display: 'table-cell',
                      py: 1.5,
                      borderRight: 1,
                      borderColor: colors.border,
                      textAlign: 'center',
                      backgroundColor: hasDayAppointments(day.dateString) ? colors.light : 'rgba(0, 0, 0, 0.02)',
                      verticalAlign: 'middle',
                    }}>
                      <Typography variant="subtitle2" sx={{ textTransform: 'capitalize', fontWeight: 600, color: '#1a1a2e' }}>
                        {day.dayName}
                      </Typography>
                      <Typography variant="h6" sx={{ color: '#1a1a2e', fontSize: '1.1rem' }}>
                        {day.dayNumber}
                      </Typography>
                      <Typography variant="caption" sx={{ textTransform: 'capitalize', color: 'text.secondary' }}>
                        {day.month}
                      </Typography>
                      {hasDayAppointments(day.dateString) && (
                        <Typography variant="caption" sx={{ display: 'block', color: colors.secondary, mt: 0.3, fontWeight: 600 }}>
                          Disponible
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
                
                {/* Lignes pour chaque créneau horaire */}
                {timeSlots.map((timeSlot) => (
                  <Box key={timeSlot.hour} sx={{
                    display: 'table-row',
                    borderBottom: 1,
                    borderColor: 'divider',
                    '&:last-child': {
                      borderBottom: 0
                    }
                  }}>
                    {/* Cellule d'heure */}
                    <Box sx={{
                      display: 'table-cell',
                      width: '80px',
                      py: 1,
                      px: 0.5,
                      borderRight: 1,
                      borderColor: colors.border,
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      backgroundColor: 'rgba(0, 0, 0, 0.03)',
                    }}>
                      <Typography variant="caption" fontWeight={600} sx={{ color: '#1a1a2e' }}>{timeSlot.label}</Typography>
                    </Box>

                    {/* Cellules pour chaque jour */}
                    {weekDays.map((day) => {
                      const appointmentsInSlot = getAppointmentsInTimeSlot(day.dateString, timeSlot.hour);

                      return (
                        <Box key={`${day.dateString}-${timeSlot.hour}`} sx={{
                          display: 'table-cell',
                          py: 1,
                          borderRight: 1,
                          borderColor: colors.border,
                          minHeight: '45px',
                          position: 'relative',
                          verticalAlign: 'middle',
                          backgroundColor: hasDayAppointments(day.dateString) ? 'transparent' : 'rgba(0, 0, 0, 0.02)'
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
                                      minHeight: '32px',
                                      width: '100%',
                                      background: selectedSlot?.id === slot.id ? colors.gradient : 'transparent',
                                      color: selectedSlot?.id === slot.id ? 'white' : colors.secondary,
                                      borderColor: colors.border,
                                      fontWeight: 600,
                                      '&:hover': {
                                        borderColor: colors.secondary,
                                        backgroundColor: selectedSlot?.id === slot.id ? colors.secondary : colors.light,
                                      },
                                    }}
                                  >
                                    {formattedStartTime} - {consultantName}
                                  </Button>
                                );
                              })}
                            </Box>
                          ) : null}
                        </Box>
                      );
                    })}
                  </Box>
                ))}
              </Box>
            </Paper>
              ) : (
                <Alert severity="info" sx={{ mb: 3 }}>
                  Aucun créneau disponible pour cette semaine. Veuillez sélectionner une autre semaine.
                </Alert>
              )}
            </>
          )}

          {/* Détails du rendez-vous sélectionné */}
          {selectedAppointmentDetails && (
            <Card
              elevation={0}
              sx={{
                mt: 2,
                background: 'white',
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
                  background: colors.gradient,
                },
              }}
            >
              <CardContent sx={{ pt: 2, pb: 2 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, color: '#1a1a2e', mb: 1.5 }}>
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
                      Prix:
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {(() => {
                        const price = selectedAppointmentDetails.custom_price ?? selectedAppointmentDetails.service.price;
                        return price === 9999 ? 'Nous consulter' : `${price} €`;
                      })()}
                    </Typography>

                 </Grid>
                  
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Intervenant:
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {selectedAppointmentDetails.practitioner.display_name ||
                       `${selectedAppointmentDetails.practitioner.profile.first_name} ${selectedAppointmentDetails.practitioner.profile.last_name}`}
                      {selectedAppointmentDetails.practitioner.title && ` - ${selectedAppointmentDetails.practitioner.title}`}
                    </Typography>
                    
                    <Typography variant="subtitle1" fontWeight="bold">
                      Service:
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {selectedAppointmentDetails.service.name} ({selectedAppointmentDetails.service.duration} min)
                    </Typography>
                                        {selectedAppointmentDetails.service.description && (
                      <>
                        <Typography variant="body2" color="text.secondary">
                          {selectedAppointmentDetails.service.description}
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