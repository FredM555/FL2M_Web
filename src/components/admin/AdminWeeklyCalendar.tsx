// src/components/admin/AdminWeeklyCalendar.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Grid,
  Typography,
  Button,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Checkbox,
  FormControlLabel,
  Alert
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RestoreIcon from '@mui/icons-material/Restore';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import PaidIcon from '@mui/icons-material/Paid';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { fr } from 'date-fns/locale';
import { format, parseISO, addDays, addMinutes, addWeeks } from 'date-fns';
import { supabase, createAppointment, updateAppointment } from '../../services/supabase';

// Types
interface Service {
  id: string;
  name: string;
  category: 'particuliers' | 'professionnels' | 'sportifs';
  subcategory: string;
  price: number;
  duration: number;
  description?: string;
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  birth_date?: string;
}

interface Practitioner {
  id: string;
  user_id: string;
  bio?: string;
  profile?: Profile;
  display_name?: string;
  title?: string;
}

interface Appointment {
  id: string;
  client_id: string | null;
  practitioner_id: string;
  service_id: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  payment_status: 'unpaid' | 'paid' | 'refunded';
  payment_id?: string;
  notes?: string;
  beneficiary_first_name?: string;
  beneficiary_last_name?: string;
  beneficiary_birth_date?: string;
  beneficiary_email?: string;
  meeting_link?: string;
  custom_price?: number;
  client?: Profile;
  practitioner?: Practitioner;
  service?: Service;
}

interface AdminWeeklyCalendarProps {
  appointments: Appointment[];
  practitioners: Practitioner[];
  services: Service[];
  loading?: boolean;
  error?: string | null;
  setError?: (error: string | null) => void;
  onAppointmentChange?: () => void;
  onAppointmentCreated?: () => void;
  onAppointmentUpdated?: () => void;
  onAppointmentDeleted?: () => void;
  isPractitionerView?: boolean;
  practitionerId?: string;
}

const AdminWeeklyCalendar: React.FC<AdminWeeklyCalendarProps> = ({
  appointments,
  practitioners,
  services,
  loading = false,
  error = null,
  setError,
  onAppointmentChange,
  onAppointmentCreated,
  onAppointmentUpdated,
  onAppointmentDeleted,
  isPractitionerView = false,
  practitionerId
}) => {
  // État pour le champ de prix personnalisé
  const [customPrice, setCustomPrice] = useState<number | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);

  // Fonction helper pour notifier les changements
  const notifyAppointmentChange = () => {
    if (onAppointmentChange) onAppointmentChange();
    if (onAppointmentCreated) onAppointmentCreated();
    if (onAppointmentUpdated) onAppointmentUpdated();
  };

  const notifyAppointmentDelete = () => {
    if (onAppointmentChange) onAppointmentChange();
    if (onAppointmentDeleted) onAppointmentDeleted();
  };
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // États pour le calendrier
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(new Date());
  const [weekDays, setWeekDays] = useState<{date: Date, dateString: string}[]>([]);
  const [timeSlots, setTimeSlots] = useState<{hour: number, label: string}[]>([]);
  const [appointmentsByDayAndHour, setAppointmentsByDayAndHour] = useState<Record<string, Record<number, Appointment[]>>>({});
  const [draggedAppointment, setDraggedAppointment] = useState<Appointment | null>(null);
  
  // États pour le dialogue
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit' | 'copy'>('create');
  const [currentAppointment, setCurrentAppointment] = useState<Partial<Appointment>>({
    status: 'pending',
    payment_status: 'unpaid'
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);
  
  // États pour la copie multiple
  const [copyCount, setCopyCount] = useState<number>(1);
  const [copyInterval, setCopyInterval] = useState<number>(1);
  const [copyIntervalUnit, setCopyIntervalUnit] = useState<'days' | 'weeks'>('days');
  const [showCopyOptions, setShowCopyOptions] = useState<boolean>(false);
  
  // État pour les détails de rendez-vous (panneau d'informations)
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedAppointmentDetails, setSelectedAppointmentDetails] = useState<Appointment | null>(null);
  
  // État pour le filtre de catégorie
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Initialiser le calendrier au chargement
  useEffect(() => {
    initializeCalendar();
  }, []);
  
  // Mettre à jour les données du calendrier quand les rendez-vous changent
  useEffect(() => {
    if (appointments.length > 0) {
      organizeAppointmentsByDayAndHour();
    }
  }, [appointments, currentWeekStart, categoryFilter]);
  
  // Initialiser le calendrier avec la semaine actuelle
  const initializeCalendar = () => {
    // Commencer la semaine le lundi
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Si dimanche (0), décaler de 6 jours, sinon de (jour - 1)
    
    const mondayOfCurrentWeek = new Date(today);
    mondayOfCurrentWeek.setDate(today.getDate() - diff);
    mondayOfCurrentWeek.setHours(0, 0, 0, 0);
    
    setCurrentWeekStart(mondayOfCurrentWeek);
    
    // Générer les jours de la semaine
    generateWeekDays(mondayOfCurrentWeek);
    
    // Générer les créneaux horaires
    const hours = Array.from({ length: 16 }, (_, index) => ({
      hour: index + 8, // De 8h à 23h
      label: `${(index + 8).toString().padStart(2, '0')}:00`
    }));
    
    setTimeSlots(hours);
  };
  
  // Générer les jours de la semaine à partir de la date de début
  const generateWeekDays = (startDate: Date) => {
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = addDays(new Date(startDate), index);
      return {
        date,
        dateString: format(date, 'yyyy-MM-dd')
      };
    });
    
    setWeekDays(days);
  };
  
  // Organiser les rendez-vous par jour et par heure
  const organizeAppointmentsByDayAndHour = () => {
    const startOfWeek = currentWeekStart;
    const endOfWeek = addDays(new Date(startOfWeek), 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    // Filtrer les rendez-vous pour la semaine en cours et par catégorie si un filtre est appliqué
    const filteredAppointments = appointments.filter(appointment => {
      const appointmentDate = parseISO(appointment.start_time);
      const dateInRange = appointmentDate >= startOfWeek && appointmentDate <= endOfWeek;
      
      // Appliquer le filtre de catégorie si nécessaire
      if (categoryFilter !== 'all' && appointment.service) {
        return dateInRange && appointment.service.category === categoryFilter;
      }
      
      return dateInRange;
    });
    
    // Organiser par jour et heure
    const byDayAndHour: Record<string, Record<number, Appointment[]>> = {};
    
    weekDays.forEach(day => {
      byDayAndHour[day.dateString] = {};
      
      timeSlots.forEach(slot => {
        byDayAndHour[day.dateString][slot.hour] = [];
      });
    });
    
    // Remplir avec les rendez-vous
    filteredAppointments.forEach(appointment => {
      const appointmentDate = parseISO(appointment.start_time);
      const day = format(appointmentDate, 'yyyy-MM-dd');
      const hour = appointmentDate.getHours();
      
      // Vérifier si ce jour et cette heure sont inclus dans notre grille
      if (byDayAndHour[day] && byDayAndHour[day][hour] !== undefined) {
        byDayAndHour[day][hour].push(appointment);
      }
    });
    
    setAppointmentsByDayAndHour(byDayAndHour);
  };
  
  // Changer de semaine
  const handleWeekChange = (direction: 'prev' | 'next') => {
    const newWeekStart = new Date(currentWeekStart);
    
    if (direction === 'prev') {
      newWeekStart.setDate(newWeekStart.getDate() - 7);
    } else {
      newWeekStart.setDate(newWeekStart.getDate() + 7);
    }
    
    setCurrentWeekStart(newWeekStart);
    generateWeekDays(newWeekStart);
  };
  
  // Afficher les détails d'un rendez-vous
  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointmentDetails(appointment);
    setDetailsOpen(true);
  };
  
  // Fermer les détails
  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedAppointmentDetails(null);
  };
  
  // Ouvrir le dialogue pour ajouter un nouveau rendez-vous
  const handleAddAppointment = (date?: Date, hour?: number) => {
    // Initialiser avec la date et l'heure actuelles ou celles fournies
    let roundedTime: Date;

    if (date && hour !== undefined) {
      roundedTime = new Date(date);
      roundedTime.setHours(hour, 0, 0, 0);
    } else {
      const now = new Date();
      // Arrondir à l'heure suivante
      const minutes = Math.ceil(now.getMinutes() / 15) * 15;
      roundedTime = new Date(now);
      roundedTime.setMinutes(minutes, 0, 0);
    }

    setSelectedDate(roundedTime);
    setSelectedTime(roundedTime);

    // Si mode intervenant, pré-sélectionner l'intervenant
    const initialAppointment: Partial<Appointment> = {
      status: 'pending',
      payment_status: 'unpaid'
    };

    if (isPractitionerView && practitionerId) {
      initialAppointment.practitioner_id = practitionerId;
    }

    setCurrentAppointment(initialAppointment);
    setCustomPrice(null);
    setPriceError(null);
    setDialogMode('create');
    setShowCopyOptions(false);
    setIsDialogOpen(true);
  };
  
  // Ouvrir le dialogue pour modifier un rendez-vous
  const handleEditAppointment = (appointment: Appointment) => {
    // Convertir les dates string en objets Date pour les pickers
    const startTime = parseISO(appointment.start_time);

    setSelectedDate(startTime);
    setSelectedTime(startTime);
    setCurrentAppointment(appointment);
    setCustomPrice(appointment.custom_price || null);
    setPriceError(null);
    setDialogMode('edit');
    setShowCopyOptions(false);
    setIsDialogOpen(true);
  };
  
  // Ouvrir le dialogue pour copier un rendez-vous
  const handleCopyAppointment = (appointment: Appointment) => {
    // Créer une copie du rendez-vous sans l'ID et les informations du client
    const appointmentCopy: Partial<Appointment> = {
      // En mode intervenant, toujours utiliser le practitionerId de l'intervenant connecté
      practitioner_id: isPractitionerView && practitionerId ? practitionerId : appointment.practitioner_id,
      service_id: appointment.service_id,
      status: 'pending',
      payment_status: 'unpaid',
      notes: appointment.notes
    };

    // Convertir les dates string en objets Date pour les pickers
    const startTime = parseISO(appointment.start_time);

    setSelectedDate(startTime);
    setSelectedTime(startTime);
    setCurrentAppointment(appointmentCopy);
    setCustomPrice(null);
    setPriceError(null);
    setDialogMode('copy');
    setShowCopyOptions(true);
    setCopyCount(1);
    setCopyInterval(1);
    setCopyIntervalUnit('days');
    setIsDialogOpen(true);
  };
  
  // Supprimer un rendez-vous
  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce créneau de rendez-vous ?')) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);

      if (error) throw error;

      notifyAppointmentDelete();
    } catch (err: any) {
      if (setError) setError(`Erreur lors de la suppression : ${err.message}`);
    }
  };
  
  // Rendre un rendez-vous à nouveau disponible
  const handleMakeAppointmentAvailable = async (appointment: Appointment) => {
    if (!window.confirm('Voulez-vous rendre ce rendez-vous à nouveau disponible? Cela effacera les informations du client.')) {
      return;
    }

    try {
      // Vérifier si le rendez-vous est payé
      if (appointment.payment_status === 'paid') {
        if (setError) setError("Impossible de libérer un rendez-vous payé. Effectuez d'abord un remboursement.");
        return;
      }

      // Mettre à jour le rendez-vous dans la base de données
      const { error } = await supabase
        .from('appointments')
        .update({
          client_id: null,
          status: 'pending',
          payment_status: 'unpaid',
          payment_id: null,
          beneficiary_first_name: null,
          beneficiary_last_name: null,
          beneficiary_birth_date: null,
          notes: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', appointment.id);

      if (error) throw error;

      notifyAppointmentChange();
    } catch (err: any) {
      if (setError) setError(`Erreur lors de la libération du rendez-vous : ${err.message}`);
    }
  };
  
  // Fermer le dialogue
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setCurrentAppointment({
      status: 'pending',
      payment_status: 'unpaid'
    });
    setSelectedDate(null);
    setSelectedTime(null);
    setShowCopyOptions(false);
    setCustomPrice(null);
    setPriceError(null);
  };
  
  // Enregistrer un rendez-vous
  const handleSaveAppointment = async () => {
    if (!selectedDate || !selectedTime || !currentAppointment.practitioner_id || !currentAppointment.service_id) {
      if (setError) setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      // Trouver le service sélectionné pour la validation du prix
      const selectedService = services.find(s => s.id === currentAppointment.service_id);

      // Valider le prix personnalisé si présent (mode intervenant)
      if (isPractitionerView && customPrice !== null && selectedService) {
        if (customPrice < selectedService.price) {
          setPriceError(`Le prix doit être au minimum ${selectedService.price} €`);
          if (setError) setError(`Le prix personnalisé ne peut pas être inférieur au prix du service (${selectedService.price} €)`);
          return;
        }
        setPriceError(null);
      }

      // Si c'est une copie multiple
      if (dialogMode === 'copy' && showCopyOptions && copyCount > 1) {
        await handleMultipleCopy();
        return;
      }

      // Combiner la date et l'heure pour créer start_time
      const startTime = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        selectedTime.getHours(),
        selectedTime.getMinutes()
      );

      // Trouver la durée du service pour calculer end_time
      const duration = selectedService?.duration || 60; // Par défaut 60 minutes

      const endTime = addMinutes(startTime, duration);

      // Extraire uniquement les champs de la table appointments
      const appointmentData: any = {
        client_id: currentAppointment.client_id || null,
        practitioner_id: currentAppointment.practitioner_id,
        service_id: currentAppointment.service_id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: currentAppointment.status || 'pending',
        payment_status: currentAppointment.payment_status || 'unpaid',
        notes: currentAppointment.notes,
      };

      // Ajouter le prix personnalisé si défini
      if (customPrice !== null && customPrice !== undefined) {
        appointmentData.custom_price = customPrice;
      }

      if (dialogMode === 'edit' && currentAppointment.id) {
        // Mise à jour - utiliser la fonction updateAppointment pour bénéficier de la validation
        const { error } = await updateAppointment(currentAppointment.id, appointmentData);

        if (error) {
          // Gérer spécifiquement les erreurs de conflit
          if (error.code === 'APPOINTMENT_CONFLICT') {
            if (setError) setError(error.message);
            return;
          }
          throw error;
        }
      } else {
        // Création ou copie simple - utiliser la fonction createAppointment pour bénéficier de la validation
        const { error } = await createAppointment(appointmentData);

        if (error) {
          // Gérer spécifiquement les erreurs de conflit
          if (error.code === 'APPOINTMENT_CONFLICT') {
            if (setError) setError(error.message);
            return;
          }
          throw error;
        }
      }

      // Fermer le dialogue et rafraîchir la liste
      handleCloseDialog();
      notifyAppointmentChange();
    } catch (err: any) {
      if (setError) setError(`Erreur lors de l'enregistrement : ${err.message}`);
    }
  };
  
  // Gérer la création de copies multiples
  const handleMultipleCopy = async () => {
    try {
      if (!selectedDate || !selectedTime || !currentAppointment.practitioner_id || !currentAppointment.service_id) {
        throw new Error('Informations incomplètes pour la copie');
      }

      // Trouver la durée du service pour calculer end_time
      const selectedService = services.find(s => s.id === currentAppointment.service_id);
      const duration = selectedService?.duration || 60; // Par défaut 60 minutes

      // Préparer la base du rendez-vous
      const baseAppointmentData: any = {
        practitioner_id: currentAppointment.practitioner_id,
        service_id: currentAppointment.service_id,
        status: 'pending',
        payment_status: 'unpaid',
        notes: currentAppointment.notes,
      };

      // Créer les rendez-vous un par un en validant chacun
      let successCount = 0;
      let conflictCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < copyCount; i++) {
        // Calculer la date pour cette copie
        let copyDate = new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate(),
          selectedTime.getHours(),
          selectedTime.getMinutes()
        );

        // Ajouter l'intervalle selon l'unité choisie
        if (copyIntervalUnit === 'days') {
          copyDate = addDays(copyDate, i * copyInterval);
        } else if (copyIntervalUnit === 'weeks') {
          copyDate = addWeeks(copyDate, i * copyInterval);
        }

        // Calculer l'heure de fin
        const endTime = addMinutes(copyDate, duration);

        const appointmentData = {
          ...baseAppointmentData,
          start_time: copyDate.toISOString(),
          end_time: endTime.toISOString(),
        };

        // Utiliser createAppointment pour bénéficier de la validation
        const { error } = await createAppointment(appointmentData);

        if (error) {
          if (error.code === 'APPOINTMENT_CONFLICT') {
            conflictCount++;
            errors.push(`${format(copyDate, 'dd/MM/yyyy HH:mm')} : conflit de créneau`);
          } else {
            errors.push(`${format(copyDate, 'dd/MM/yyyy HH:mm')} : ${error.message}`);
          }
        } else {
          successCount++;
        }
      }

      // Fermer le dialogue et rafraîchir la liste
      handleCloseDialog();
      notifyAppointmentChange();

      // Afficher un résumé si certains rendez-vous n'ont pas pu être créés
      if (conflictCount > 0 || errors.length > 0) {
        const message = `${successCount} rendez-vous créé(s) avec succès.\n${conflictCount} conflit(s) détecté(s).\n${errors.length > 3 ? errors.slice(0, 3).join('\n') + '\n...' : errors.join('\n')}`;
        if (setError) setError(message);
      }

    } catch (err: any) {
      if (setError) setError(`Erreur lors de la création des copies : ${err.message}`);
    }
  };
  
  // Formatage du statut
  const getStatusChip = (status: string) => {
    const statusConfig: Record<string, { color: "success" | "warning" | "error" | "default" | "primary" | "info", label: string }> = {
      'pending': { color: 'warning', label: 'En attente' },
      'confirmed': { color: 'success', label: 'Confirmé' },
      'cancelled': { color: 'error', label: 'Annulé' },
      'completed': { color: 'default', label: 'Terminé' },
      'particuliers': { color: 'primary', label: 'Particuliers' },
      'professionnels': { color: 'info', label: 'Professionnels' },
      'sportifs': { color: 'success', label: 'Sportifs' }
    };
    
    const config = statusConfig[status] || { color: 'default', label: status };
    
    return (
      <Chip 
        label={config.label} 
        color={config.color} 
        size="small" 
      />
    );
  };
  
  // Formatage du statut de paiement
  const getPaymentStatusChip = (status: string) => {
    const statusConfig: Record<string, { color: "success" | "warning" | "error" | "default", label: string }> = {
      'unpaid': { color: 'warning', label: 'Non payé' },
      'paid': { color: 'success', label: 'Payé' },
      'refunded': { color: 'error', label: 'Remboursé' }
    };
    
    const config = statusConfig[status] || { color: 'default', label: status };
    
    return (
      <Chip 
        label={config.label} 
        color={config.color} 
        size="small" 
        variant="outlined"
      />
    );
  };
  
  // Formatage du jour de la semaine
  const formatWeekDay = (date: Date) => {
    return {
      dayName: format(date, 'EEEE', { locale: fr }),
      dayNumber: format(date, 'd', { locale: fr }),
      month: format(date, 'MMMM', { locale: fr })
    };
  };
  
  // Vérifier si une cellule a des rendez-vous
  const hasCellAppointments = (day: string, hour: number) => {
    return appointmentsByDayAndHour[day] && 
           appointmentsByDayAndHour[day][hour] && 
           appointmentsByDayAndHour[day][hour].length > 0;
  };
  
  // Filtrer les heures qui ont des rendez-vous
  const getActiveTimeSlots = () => {
    const activeHours = new Set<number>();
    
    Object.keys(appointmentsByDayAndHour).forEach(day => {
      Object.keys(appointmentsByDayAndHour[day]).forEach(hour => {
        if (appointmentsByDayAndHour[day][Number(hour)].length > 0) {
          activeHours.add(Number(hour));
        }
      });
    });
    
    // Si aucune heure active, retourner toutes les heures
    if (activeHours.size === 0) {
      return timeSlots;
    }
    
    return timeSlots.filter(slot => activeHours.has(slot.hour)).sort((a, b) => a.hour - b.hour);
  };
  
  // Filtrer les jours qui ont des rendez-vous
  const getActiveDays = () => {
    weekDays.filter(day => {
      return timeSlots.some(slot => hasCellAppointments(day.dateString, slot.hour));
    });

    // Si aucun jour actif, retourner tous les jours
    return weekDays;
  };
  
  // Gérer le début du drag and drop
  const handleDragStart = (appointment: Appointment, event: React.DragEvent) => {
    event.dataTransfer.setData('text/plain', appointment.id);
    setDraggedAppointment(appointment);
  };
  
  // Gérer le drop d'un rendez-vous
  const handleDrop = async (day: string, hour: number, event: React.DragEvent) => {
    event.preventDefault();
    const appointmentId = event.dataTransfer.getData('text/plain');
    
    if (!draggedAppointment || draggedAppointment.id !== appointmentId) return;
    
    try {
      // Créer la nouvelle date de début
      const originalDate = parseISO(draggedAppointment.start_time);
      const newDate = new Date(day);
      newDate.setHours(hour, originalDate.getMinutes(), 0, 0);
      
      // Calculer la durée du rendez-vous
      const originalDuration = parseISO(draggedAppointment.end_time).getTime() - originalDate.getTime();
      
      // Calculer la nouvelle date de fin
      const newEndDate = new Date(newDate.getTime() + originalDuration);
      
      // Mettre à jour le rendez-vous
      const { error } = await supabase
        .from('appointments')
        .update({
          start_time: newDate.toISOString(),
          end_time: newEndDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', appointmentId);
      
      if (error) throw error;
      
      // Rafraîchir les données
      notifyAppointmentChange();

    } catch (err: any) {
      if (setError) setError(`Erreur lors du déplacement du rendez-vous : ${err.message}`);
    } finally {
      setDraggedAppointment(null);
    }
  };
  
  // Permettre le drop sur une cellule
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };
  
  // Obtenir la couleur de la catégorie pour le titre du service
  const getCategoryColor = (category: string | undefined) => {
    if (!category) return 'text.primary';
    
    const categoryColors: Record<string, string> = {
      'particuliers': theme.palette.primary.main,
      'professionnels': theme.palette.info.main,
      'sportifs': theme.palette.success.main
    };
    
    return categoryColors[category] || 'text.primary';
  };
  
  const activeTimeSlots = getActiveTimeSlots();
  
  return (
    <Box sx={{ mb: 4 }}>
      {/* En-tête du calendrier avec navigation et filtres */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => handleWeekChange('prev')} disabled={loading}>
          <ArrowBackIcon />
        </IconButton>
        
        <Typography variant="h6" sx={{ textAlign: 'center', flex: 1 }}>
          Semaine du {format(currentWeekStart, 'd MMMM yyyy', { locale: fr })} au {format(addDays(currentWeekStart, 6), 'd MMMM yyyy', { locale: fr })}
        </Typography>
        
        <IconButton onClick={() => handleWeekChange('next')} disabled={loading}>
          <ArrowForwardIcon />
        </IconButton>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="category-filter-label">Filtrer par catégorie</InputLabel>
          <Select
            labelId="category-filter-label"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as string)}
            label="Filtrer par catégorie"
            size="small"
          >
            <MenuItem value="all">Toutes les catégories</MenuItem>
            <MenuItem value="particuliers">Particuliers</MenuItem>
            <MenuItem value="professionnels">Professionnels</MenuItem>
            <MenuItem value="sportifs">Sportifs</MenuItem>
          </Select>
        </FormControl>
        
        <Button 
          variant="contained" 
          startIcon={<AddCircleIcon />}
          onClick={() => handleAddAppointment()}
        >
          Créer un créneau
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError && setError(null)}>
          {error}
        </Alert>
      )}
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Grille de calendrier */}
          <Paper variant="outlined" sx={{ mb: 3, overflow: 'auto' }}>
            <Box sx={{ minWidth: isMobile ? 700 : 'auto' }}>
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
                {weekDays.map((day) => {
                  const { dayName, dayNumber, month } = formatWeekDay(day.date);
                  return (
                    <Grid item xs key={day.dateString} sx={{ 
                      py: 2, 
                      borderRight: 1, 
                      borderColor: 'divider',
                      textAlign: 'center',
                      backgroundColor: timeSlots.some(slot => hasCellAppointments(day.dateString, slot.hour)) 
                        ? 'rgba(0, 0, 0, 0.04)' 
                        : 'inherit'
                    }}>
                      <Typography variant="subtitle1" sx={{ textTransform: 'capitalize' }}>
                        {dayName}
                      </Typography>
                      <Typography variant="h6">
                        {dayNumber}
                      </Typography>
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                        {month}
                      </Typography>
                    </Grid>
                  );
                })}
              </Grid>
              
              {/* Lignes pour chaque créneau horaire */}
              {timeSlots.map((timeSlot) => (
                <Grid container key={timeSlot.hour} sx={{ 
                  borderBottom: 1, 
                  borderColor: 'divider',
                  display: activeTimeSlots.some(slot => slot.hour === timeSlot.hour) || timeSlots.length <= 8
                    ? 'flex' 
                    : 'none',
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
                    const hasAppointments = hasCellAppointments(day.dateString, timeSlot.hour);
                    
                    return (
                      <Grid item xs key={`${day.dateString}-${timeSlot.hour}`} sx={{ 
                        py: 1.5, 
                        borderRight: 1, 
                        borderColor: 'divider',
                        minHeight: '80px',
                        position: 'relative',
                        cursor: hasAppointments ? 'default' : 'pointer',
                        '&:hover': {
                          backgroundColor: hasAppointments ? 'inherit' : 'rgba(0, 0, 0, 0.04)'
                        }
                      }}
                      onClick={hasAppointments ? undefined : () => handleAddAppointment(day.date, timeSlot.hour)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(day.dateString, timeSlot.hour, e)}
                      >
                        {/* Afficher les rendez-vous de ce créneau */}
                        {hasAppointments && (
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            height: '100%',
                            px: 1,
                            gap: 1
                          }}>
                            {appointmentsByDayAndHour[day.dateString][timeSlot.hour].map((appointment) => {
                              const startTime = parseISO(appointment.start_time);
                              const formattedStartTime = format(startTime, 'HH:mm');
                              const isBooked = appointment.client_id !== null;
                              const isPaid = appointment.payment_status === 'paid';
                              const isCancelled = appointment.status === 'cancelled';

                              return (
                                <Box
                                  key={appointment.id}
                                  sx={{
                                    border: '1px solid',
                                    borderColor: isCancelled ? 'error.main' : (isBooked ? 'success.main' : 'divider'),
                                    borderRadius: 1,
                                    p: 1,
                                    backgroundColor: isCancelled ? 'rgba(211, 47, 47, 0.1)' : (isBooked ? 'success.50' : 'rgba(0, 0, 0, 0.04)'),
                                    position: 'relative',
                                    opacity: isCancelled ? 0.7 : 1,
                                    '&:hover': {
                                      boxShadow: 1
                                    },
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => handleAppointmentClick(appointment)}
                                  onDoubleClick={() => {
                                    if (appointment.meeting_link) {
                                      window.open(appointment.meeting_link, '_blank', 'noopener,noreferrer');
                                    }
                                  }}
                                  draggable
                                  onDragStart={(e) => handleDragStart(appointment, e)}
                                >
                                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="body2" fontWeight="bold">
                                      {formattedStartTime}
                                    </Typography>

                                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                                      {appointment.meeting_link && (
                                        <Tooltip title="Lien visio disponible (double-clic pour ouvrir)">
                                          <VideoCallIcon fontSize="small" color="primary" />
                                        </Tooltip>
                                      )}
                                      {isPaid && (
                                        <Tooltip title="Payé">
                                          <PaidIcon fontSize="small" color="success" />
                                        </Tooltip>
                                      )}
                                    </Box>
                                  </Box>
                                  
                                  <Typography 
                                    variant="body2" 
                                    fontWeight="bold"
                                    sx={{ 
                                      color: getCategoryColor(appointment.service?.category),
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}
                                  >
                                    {appointment.service?.name}
                                  </Typography>
                                  
                                  <Typography variant="caption" display="block">
                                    {appointment.practitioner?.display_name || 
                                      (appointment.practitioner?.profile && 
                                        `${appointment.practitioner.profile.first_name} ${appointment.practitioner.profile.last_name}`)}
                                  </Typography>
                                  
                                  {isBooked ? (
                                    <Box>
                                      <Typography variant="caption" fontWeight="bold" display="block">
                                        {appointment.client?.first_name} {appointment.client?.last_name}
                                        </Typography>
                                      {appointment.beneficiary_birth_date && (
                                        <Typography variant="caption" display="block">
                                          {format(parseISO(appointment.beneficiary_birth_date), 'dd/MM/yyyy')}
                                        </Typography>
                                      )}
                                    </Box>
                                  ) : (
                                    <Chip label="Disponible" color="default" size="small" sx={{ mt: 0.5 }} />
                                  )}

                                  {/* Afficher le statut si annulé */}
                                  {appointment.status === 'cancelled' && (
                                    <Chip
                                      label="Annulé"
                                      color="error"
                                      size="small"
                                      sx={{ mt: 0.5 }}
                                    />
                                  )}
                                  
                                  <Box sx={{ 
                                    display: 'flex', 
                                    gap: 0.5, 
                                    mt: 0.5,
                                    justifyContent: 'flex-end'
                                  }}>
                                    {/* Actions rapides */}
                                    <Tooltip title="Modifier">
                                      <IconButton 
                                        size="small" 
                                        color="primary"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditAppointment(appointment);
                                        }}
                                      >
                                        <EditIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    
                                    <Tooltip title="Copier">
                                      <IconButton 
                                        size="small" 
                                        color="info"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopyAppointment(appointment);
                                        }}
                                      >
                                        <ContentCopyIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                    
                                    {isBooked && appointment.payment_status !== 'paid' && (
                                      <Tooltip title="Rendre disponible">
                                        <IconButton 
                                          size="small" 
                                          color="success"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleMakeAppointmentAvailable(appointment);
                                          }}
                                        >
                                          <RestoreIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    )}
                                    
                                    {!isBooked && (
                                      <Tooltip title="Supprimer">
                                        <IconButton 
                                          size="small" 
                                          color="error"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteAppointment(appointment.id);
                                          }}
                                        >
                                          <DeleteIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    )}
                                  </Box>
                                </Box>
                              );
                            })}
                          </Box>
                        )}
                      </Grid>
                    );
                  })}
                </Grid>
              ))}
            </Box>
          </Paper>
          
          {/* Dialogue pour créer/modifier/copier un rendez-vous */}
          <Dialog 
            open={isDialogOpen} 
            onClose={handleCloseDialog}
            maxWidth="md"
            fullWidth
          >
            <DialogTitle>
              {dialogMode === 'edit' ? 'Modifier le rendez-vous' : 
              dialogMode === 'copy' ? 'Copier le rendez-vous' : 
              'Créer un nouveau créneau de rendez-vous'}
            </DialogTitle>
            <DialogContent dividers>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel id="practitioner-select-label">Intervenant</InputLabel>
                    <Select
                      labelId="practitioner-select-label"
                      value={currentAppointment.practitioner_id || ''}
                      onChange={(e) => setCurrentAppointment({
                        ...currentAppointment,
                        practitioner_id: e.target.value as string
                      })}
                      label="Intervenant"
                      required
                      disabled={isPractitionerView}
                    >
                      {practitioners.map((practitioner) => {
                        const name = practitioner.display_name ||
                          (practitioner.profile &&
                           `${practitioner.profile.first_name} ${practitioner.profile.last_name}`) || '';
                        const title = practitioner.title;
                        const displayText = title ? `${name} - ${title}` : name;

                        return (
                          <MenuItem key={practitioner.id} value={practitioner.id}>
                            {displayText}
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                  {isPractitionerView && (
                    <Typography variant="caption" color="text.secondary">
                      En mode intervenant, vous ne pouvez créer des rendez-vous que pour vous-même
                    </Typography>
                  )}
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel id="service-select-label">Service</InputLabel>
                    <Select
                      labelId="service-select-label"
                      value={currentAppointment.service_id || ''}
                      onChange={(e) => {
                        const serviceId = e.target.value as string;
                        setCurrentAppointment({
                          ...currentAppointment,
                          service_id: serviceId
                        });
                        // Réinitialiser le prix personnalisé quand le service change
                        const selectedService = services.find(s => s.id === serviceId);
                        if (selectedService && isPractitionerView) {
                          setCustomPrice(selectedService.price);
                          setPriceError(null);
                        }
                      }}
                      label="Service"
                      required
                    >
                      {services.map((service) => (
                        <MenuItem key={service.id} value={service.id}>
                          {service.name} ({service.duration} min) - {service.price === 9999 ? 'Sur devis' : `${service.price} €`}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Champ de prix personnalisé (uniquement en mode intervenant) */}
                {isPractitionerView && currentAppointment.service_id && (
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Prix personnalisé (€)"
                      type="number"
                      fullWidth
                      value={customPrice !== null ? customPrice : (() => {
                        const selectedService = services.find(s => s.id === currentAppointment.service_id);
                        return selectedService?.price || '';
                      })()}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        setCustomPrice(isNaN(value) ? null : value);

                        // Valider le prix
                        const selectedService = services.find(s => s.id === currentAppointment.service_id);
                        if (selectedService && !isNaN(value) && value < selectedService.price) {
                          setPriceError(`Le prix doit être au minimum ${selectedService.price} €`);
                        } else {
                          setPriceError(null);
                        }
                      }}
                      error={!!priceError}
                      helperText={priceError || (() => {
                        const selectedService = services.find(s => s.id === currentAppointment.service_id);
                        return selectedService ? `Prix minimum: ${selectedService.price} €` : '';
                      })()}
                      InputProps={{
                        inputProps: {
                          min: (() => {
                            const selectedService = services.find(s => s.id === currentAppointment.service_id);
                            return selectedService?.price || 0;
                          })(),
                          step: 0.01
                        }
                      }}
                      sx={{ mb: 2 }}
                    />
                  </Grid>
                )}
                
                <Grid item xs={12} md={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
                    <DatePicker
                      label="Date du rendez-vous"
                      value={selectedDate}
                      onChange={(date) => setSelectedDate(date)}
                      slotProps={{
                        textField: { 
                          fullWidth: true,
                          required: true,
                          margin: "normal"
                        }
                      }}
                    />
                  </LocalizationProvider>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
                    <TimePicker
                      label="Heure du rendez-vous"
                      value={selectedTime}
                      onChange={(time) => setSelectedTime(time)}
                      slotProps={{
                        textField: { 
                          fullWidth: true,
                          required: true,
                          margin: "normal"
                        }
                      }}
                    />
                  </LocalizationProvider>
                </Grid>
                
                {/* Options de copie multiple - visible uniquement en mode copie */}
                {dialogMode === 'copy' && (
                  <Grid item xs={12}>
                    <Box sx={{ mt: 2, mb: 2 }}>
                      <FormControlLabel 
                        control={
                          <Checkbox 
                            checked={showCopyOptions} 
                            onChange={(e) => setShowCopyOptions(e.target.checked)} 
                          />
                        } 
                        label="Créer plusieurs copies" 
                        sx={{ mb: 2 }}
                      />
                      
                      {showCopyOptions && (
                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={4}>
                            <TextField
                              label="Nombre de copies"
                              type="number"
                              fullWidth
                              value={copyCount}
                              onChange={(e) => setCopyCount(Math.max(1, parseInt(e.target.value) || 1))}
                              InputProps={{ inputProps: { min: 1 } }}
                            />
                          </Grid>
                          
                          <Grid item xs={12} sm={4}>
                            <TextField
                              label="Intervalle"
                              type="number"
                              fullWidth
                              value={copyInterval}
                              onChange={(e) => setCopyInterval(Math.max(1, parseInt(e.target.value) || 1))}
                              InputProps={{ inputProps: { min: 1 } }}
                            />
                          </Grid>
                          
                          <Grid item xs={12} sm={4}>
                            <FormControl fullWidth>
                              <InputLabel>Unité</InputLabel>
                              <Select
                                value={copyIntervalUnit}
                                onChange={(e) => setCopyIntervalUnit(e.target.value as 'days' | 'weeks')}
                                label="Unité"
                              >
                                <MenuItem value="days">Jours</MenuItem>
                                <MenuItem value="weeks">Semaines</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                          
                          <Grid item xs={12}>
                            <Alert severity="info">
                              {`${copyCount} rendez-vous seront créés, espacés de ${copyInterval} ${
                                copyIntervalUnit === 'days' ? 'jour(s)' : 'semaine(s)'
                              }.`}
                            </Alert>
                          </Grid>
                        </Grid>
                      )}
                    </Box>
                  </Grid>
                )}
                
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth sx={{ mt: 1 }}>
                    <InputLabel>Statut</InputLabel>
                    <Select
                      value={currentAppointment.status || 'pending'}
                      onChange={(e) => setCurrentAppointment({
                        ...currentAppointment,
                        status: e.target.value as 'pending' | 'confirmed' | 'cancelled' | 'completed'
                      })}
                      label="Statut"
                      disabled={isPractitionerView}
                    >
                      <MenuItem value="pending">En attente</MenuItem>
                      <MenuItem value="confirmed">Confirmé</MenuItem>
                      <MenuItem value="cancelled">Annulé</MenuItem>
                      <MenuItem value="completed">Terminé</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <FormControl fullWidth sx={{ mt: 1 }}>
                    <InputLabel>Statut de paiement</InputLabel>
                    <Select
                      value={currentAppointment.payment_status || 'unpaid'}
                      onChange={(e) => setCurrentAppointment({
                        ...currentAppointment,
                        payment_status: e.target.value as 'unpaid' | 'paid' | 'refunded'
                      })}
                      label="Statut de paiement"
                      disabled={isPractitionerView}
                    >
                      <MenuItem value="unpaid">Non payé</MenuItem>
                      <MenuItem value="paid">Payé</MenuItem>
                      <MenuItem value="refunded">Remboursé</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                {dialogMode === 'edit' && currentAppointment.id && currentAppointment.client_id && (
                  <Grid item xs={12}>
                    <Alert severity="info">
                      Ce rendez-vous est déjà réservé par un client. Certaines modifications peuvent affecter sa réservation.
                    </Alert>
                  </Grid>
                )}
                
                <Grid item xs={12}>
                  <TextField
                    label="Notes"
                    fullWidth
                    multiline
                    rows={3}
                    value={currentAppointment.notes || ''}
                    onChange={(e) => setCurrentAppointment({
                      ...currentAppointment,
                      notes: e.target.value
                    })}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseDialog}>Annuler</Button>
              <Button variant="contained" onClick={handleSaveAppointment}>
                {dialogMode === 'edit' ? 'Mettre à jour' : 
                dialogMode === 'copy' && showCopyOptions && copyCount > 1 ? `Créer ${copyCount} copies` : 
                dialogMode === 'copy' ? 'Copier' : 'Créer'}
              </Button>
            </DialogActions>
          </Dialog>
          
          {/* Dialogue de détails du rendez-vous */}
          <Dialog
            open={detailsOpen}
            onClose={handleCloseDetails}
            maxWidth="md"
            fullWidth
          >
            {selectedAppointmentDetails && (
              <>
                <DialogTitle>
                  Détails du rendez-vous
                </DialogTitle>
                <DialogContent dividers>
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
                        Intervenant:
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        {selectedAppointmentDetails.practitioner?.display_name || 
                          (selectedAppointmentDetails.practitioner?.profile &&
                            `${selectedAppointmentDetails.practitioner.profile.first_name} ${selectedAppointmentDetails.practitioner.profile.last_name}`)}
                      </Typography>
                      
                      <Typography variant="subtitle1" fontWeight="bold">
                        Service:
                      </Typography>
                      <Typography 
                        variant="body1" 
                        gutterBottom
                        sx={{ color: getCategoryColor(selectedAppointmentDetails.service?.category) }}
                      >
                        {selectedAppointmentDetails.service?.name} ({selectedAppointmentDetails.service?.duration} min)
                      </Typography>
                      
                      <Typography variant="subtitle1" fontWeight="bold">
                        Catégorie:
                      </Typography>
                      <Box sx={{ mb: 1 }}>
                        {selectedAppointmentDetails.service?.category && 
                          getStatusChip(selectedAppointmentDetails.service.category)}
                      </Box>
                      
                      <Typography variant="subtitle1" fontWeight="bold">
                        Prix:
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        {selectedAppointmentDetails.service?.price} €
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle1" fontWeight="bold">
                        Client:
                      </Typography>
                      <Typography variant="body1" gutterBottom>
                        {selectedAppointmentDetails.client ? 
                          `${selectedAppointmentDetails.client.first_name} ${selectedAppointmentDetails.client.last_name}` : 
                          'Pas de réservation'}
                      </Typography>
                      
                      {selectedAppointmentDetails.client && selectedAppointmentDetails.client.email && (
                        <>
                          <Typography variant="subtitle1" fontWeight="bold">
                            Email:
                          </Typography>
                          <Typography variant="body1" gutterBottom>
                            {selectedAppointmentDetails.client.email}
                          </Typography>
                        </>
                      )}
                      
                      {selectedAppointmentDetails.client && selectedAppointmentDetails.client.birth_date && (
                        <>
                          <Typography variant="subtitle1" fontWeight="bold">
                            Date de naissance:
                          </Typography>
                          <Typography variant="body1" gutterBottom>
                            {format(parseISO(selectedAppointmentDetails.client.birth_date), 'dd/MM/yyyy')}
                          </Typography>
                        </>
                      )}
                      
                      <Typography variant="subtitle1" fontWeight="bold">
                        Statut:
                      </Typography>
                      <Box sx={{ mb: 1 }}>
                        {getStatusChip(selectedAppointmentDetails.status)}
                      </Box>
                      
                      <Typography variant="subtitle1" fontWeight="bold">
                        Statut de paiement:
                      </Typography>
                      <Box sx={{ mb: 1 }}>
                        {getPaymentStatusChip(selectedAppointmentDetails.payment_status)}
                      </Box>
                      
                      {selectedAppointmentDetails.notes && (
                        <>
                          <Typography variant="subtitle1" fontWeight="bold">
                            Notes:
                          </Typography>
                          <Typography variant="body1" gutterBottom>
                            {selectedAppointmentDetails.notes}
                          </Typography>
                        </>
                      )}
                    </Grid>
                  </Grid>
                </DialogContent>
                <DialogActions>
                  <Button onClick={handleCloseDetails}>Fermer</Button>
                  <Button 
                    variant="outlined" 
                    color="primary" 
                    onClick={() => {
                      handleEditAppointment(selectedAppointmentDetails);
                      handleCloseDetails();
                    }}
                  >
                    Modifier
                  </Button>
                  {selectedAppointmentDetails.client_id && selectedAppointmentDetails.payment_status !== 'paid' && (
                    <Button 
                      variant="outlined" 
                      color="success"
                      onClick={() => {
                        handleMakeAppointmentAvailable(selectedAppointmentDetails);
                        handleCloseDetails();
                      }}
                    >
                      Rendre disponible
                    </Button>
                  )}
                  {!selectedAppointmentDetails.client_id && (
                    <Button 
                      variant="outlined" 
                      color="error"
                      onClick={() => {
                        handleDeleteAppointment(selectedAppointmentDetails.id);
                        handleCloseDetails();
                      }}
                    >
                      Supprimer
                    </Button>
                  )}
                </DialogActions>
              </>
            )}
          </Dialog>
        </>
      )}
    </Box>
  );
};

export default AdminWeeklyCalendar;