// src/components/practitioner/PractitionerWeeklyCalendar.tsx
import React, { useState, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  useTheme,
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Grid,
  TextField
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import TodayIcon from '@mui/icons-material/Today';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import RestoreIcon from '@mui/icons-material/Restore';
import AddIcon from '@mui/icons-material/Add';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, parseISO, eachDayOfInterval, startOfWeek, endOfWeek, addWeeks, isSameDay, isToday, getHours, getMinutes, differenceInMinutes } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Appointment, Service } from '../../services/supabase';
import { supabase } from '../../services/supabase';
import { suspendConflictingAppointments, reactivateSuspendedAppointments } from '../../services/supabase-appointments';

interface PractitionerWeeklyCalendarProps {
  appointments: Appointment[];
  services: Service[];
  onAppointmentClick: (appointment: Appointment) => void;
  onAppointmentChange?: () => void;
}

const PractitionerWeeklyCalendar: React.FC<PractitionerWeeklyCalendarProps> = ({
  appointments,
  services,
  onAppointmentClick,
  onAppointmentChange
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [makingAvailable, setMakingAvailable] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // États pour l'édition
  const [editedAppointment, setEditedAppointment] = useState<Partial<Appointment>>({});
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<Date | null>(null);

  // États pour le drag & drop
  const [draggedAppointment, setDraggedAppointment] = useState<Appointment | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<{ day: string; hour: number; minute: number } | null>(null);
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);

  // États pour la copie de journée
  const [copyDayDialogOpen, setCopyDayDialogOpen] = useState(false);
  const [sourceDay, setSourceDay] = useState<Date | null>(null);
  const [targetDay, setTargetDay] = useState<Date | null>(null);
  const [copying, setCopying] = useState(false);

  // États pour la suppression de journée
  const [deleteDayDialogOpen, setDeleteDayDialogOpen] = useState(false);
  const [dayToDelete, setDayToDelete] = useState<Date | null>(null);
  const [deletingDay, setDeletingDay] = useState(false);

  // Couleurs par module/catégorie
  const categoryColors: { [key: string]: string } = {
    particuliers: '#345995',
    professionnels: '#FFA500',
    sportifs: '#4CAF50'
  };

  // Heures de la journée (8h à 23h)
  const hours = Array.from({ length: 16 }, (_, i) => i + 8);

  // Extraire le nom du service sans "Module"
  const getServiceShortName = (serviceName: string) => {
    return serviceName.replace(/^Module\s+/i, '').trim();
  };

  // Obtenir la première lettre du service
  const getServiceInitial = (serviceName: string) => {
    const shortName = getServiceShortName(serviceName);
    return shortName.charAt(0).toUpperCase();
  };

  // Navigation
  const goToPreviousWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, -1));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  };

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  // Calculer les jours de la semaine
  const weekDays = useMemo(() => {
    const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 });
    return eachDayOfInterval({
      start: currentWeekStart,
      end: weekEnd
    }).map(date => ({
      date,
      dayName: format(date, 'EEE', { locale: fr }),
      dayNumber: format(date, 'd', { locale: fr }),
      month: format(date, 'MMM', { locale: fr }),
      dateString: format(date, 'yyyy-MM-dd'),
      isToday: isToday(date)
    }));
  }, [currentWeekStart]);

  // Obtenir tous les RDV d'un jour
  const getAppointmentsForDay = (day: string) => {
    return appointments.filter(apt => {
      return format(parseISO(apt.start_time), 'yyyy-MM-dd') === day;
    }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  };

  // Calculer la hauteur d'un RDV en pixels (1 heure = 60px)
  const getAppointmentHeight = (appointment: Appointment) => {
    const duration = differenceInMinutes(
      parseISO(appointment.end_time),
      parseISO(appointment.start_time)
    );
    return (duration / 60) * 60; // 60px par heure
  };

  // Calculer la position top d'un RDV (depuis 8h00)
  const getAppointmentTop = (appointment: Appointment) => {
    const aptDate = parseISO(appointment.start_time);
    const aptHour = getHours(aptDate);
    const aptMinutes = getMinutes(aptDate);

    // Position depuis 8h00 (début de la grille)
    const hoursSince8am = aptHour - 8;
    const pixelsFromHours = hoursSince8am * 60;
    const pixelsFromMinutes = (aptMinutes / 60) * 60;

    return pixelsFromHours + pixelsFromMinutes;
  };

  // Assigner des colonnes fixes par type de service
  const calculateAppointmentColumns = (dayAppointments: Appointment[]) => {
    // Mapping fixe : code service -> numéro de colonne
    const serviceColumnMapping: { [key: string]: number } = {
      'PAAD': 0, // Adulte -> Colonne 1
      'PACO': 1, // Couple -> Colonne 2
      'PAEN': 2, // Enfant -> Colonne 3
      'PASA': 3  // Suivi Annuel -> Colonne 4
    };

    const columns: { appointment: Appointment; column: number; totalColumns: number }[] = [];

    dayAppointments.forEach(apt => {
      const aptStart = new Date(apt.start_time).getTime();
      const aptEnd = new Date(apt.end_time).getTime();

      // Trouver tous les RDV qui se chevauchent avec celui-ci
      const overlapping = dayAppointments.filter(other => {
        const otherStart = new Date(other.start_time).getTime();
        const otherEnd = new Date(other.end_time).getTime();

        return (
          (aptStart < otherEnd && aptEnd > otherStart) || // Se chevauchent
          (otherStart < aptEnd && otherEnd > aptStart)
        );
      });

      // Assigner la colonne en fonction du code du service
      const serviceCode = apt.service?.code || '';
      let column = serviceColumnMapping[serviceCode];

      // Si le code n'est pas dans le mapping, assigner une colonne par défaut
      if (column === undefined) {
        column = 0; // Par défaut colonne 1
      }

      const totalColumns = Math.max(...overlapping.map(o => {
        const serviceCode = o.service?.code || '';
        const col = serviceColumnMapping[serviceCode] !== undefined ? serviceColumnMapping[serviceCode] : 0;
        return col + 1;
      }), column + 1);

      columns.push({ appointment: apt, column, totalColumns });
    });

    // Mettre à jour totalColumns pour tous les rendez-vous qui se chevauchent
    columns.forEach(col => {
      const aptStart = new Date(col.appointment.start_time).getTime();
      const aptEnd = new Date(col.appointment.end_time).getTime();

      const overlapping = columns.filter(other => {
        const otherStart = new Date(other.appointment.start_time).getTime();
        const otherEnd = new Date(other.appointment.end_time).getTime();

        return (
          (aptStart < otherEnd && aptEnd > otherStart) ||
          (otherStart < aptEnd && otherEnd > aptStart)
        );
      });

      const maxColumns = Math.max(...overlapping.map(o => o.totalColumns));
      col.totalColumns = maxColumns;
    });

    return columns;
  };

  // Ouvrir le dialogue pour créer un nouveau rendez-vous
  const handleCreateAppointment = () => {
    // Récupérer le practitioner_id depuis les rendez-vous existants
    const practitionerId = appointments.length > 0 ? appointments[0].practitioner_id : null;

    if (!practitionerId) {
      alert('Impossible de créer un rendez-vous : practitioner_id non trouvé');
      return;
    }

    // Initialiser avec des valeurs par défaut
    const now = new Date();
    now.setMinutes(0, 0, 0); // Arrondir à l'heure

    setIsCreating(true);
    setSelectedAppointment(null);
    setEditedAppointment({
      practitioner_id: practitionerId,
      status: 'pending',
      payment_status: 'unpaid',
      client_id: undefined
    });
    setSelectedDate(now);
    setSelectedTime(now);
    setEditDialogOpen(true);
  };

  // Gérer le clic sur un RDV - Ouvre le dialogue d'édition
  const handleAppointmentClick = (appointment: Appointment) => {
    setIsCreating(false);
    setSelectedAppointment(appointment);
    setEditedAppointment(appointment);
    setSelectedDate(parseISO(appointment.start_time));
    setSelectedTime(parseISO(appointment.start_time));
    setEditDialogOpen(true);
    onAppointmentClick(appointment);
  };

  // Fermer le dialogue d'édition
  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedAppointment(null);
    setEditedAppointment({});
    setSelectedDate(null);
    setSelectedTime(null);
    setIsCreating(false);
  };

  // Sauvegarder les modifications du RDV (création ou mise à jour)
  const handleSaveAppointment = async () => {
    // Validation
    if (!selectedDate || !selectedTime) {
      alert('Veuillez sélectionner une date et une heure');
      return;
    }

    if (!editedAppointment.service_id) {
      alert('Veuillez sélectionner un service');
      return;
    }

    if (!editedAppointment.practitioner_id) {
      alert('Erreur : practitioner_id manquant');
      return;
    }

    setSaving(true);
    try {
      // Combiner la date et l'heure
      const startTime = new Date(selectedDate);
      startTime.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);

      // Calculer l'heure de fin basée sur la durée du service
      const service = services.find(s => s.id === editedAppointment.service_id);
      const durationMinutes = service?.duration || 60;
      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + durationMinutes);

      const appointmentData = {
        practitioner_id: editedAppointment.practitioner_id,
        service_id: editedAppointment.service_id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: editedAppointment.status || 'pending',
        payment_status: editedAppointment.payment_status || 'unpaid',
        notes: editedAppointment.notes || null,
        client_id: editedAppointment.client_id || null
      };

      if (isCreating) {
        // MODE CRÉATION
        console.log('[CREATE] Création d\'un nouveau rendez-vous:', appointmentData);

        const { error } = await supabase
          .from('appointments')
          .insert([appointmentData]);

        if (error) throw error;

        alert('Rendez-vous créé avec succès !');
      } else {
        // MODE MISE À JOUR
        if (!selectedAppointment?.id) {
          alert('Erreur : ID du rendez-vous manquant');
          return;
        }

        console.log('[UPDATE] Mise à jour du rendez-vous:', appointmentData);

        // Vérifier si le statut passe à "confirmed"
        const isBeingConfirmed = editedAppointment.status === 'confirmed' && selectedAppointment.status !== 'confirmed';

        // Vérifier si le statut passe de "confirmed" à "pending" (ou autre statut non confirmé)
        const isBeingUnconfirmed = selectedAppointment.status === 'confirmed' && editedAppointment.status !== 'confirmed';

        const { error } = await supabase
          .from('appointments')
          .update(appointmentData)
          .eq('id', selectedAppointment.id);

        if (error) throw error;

        // Si le rendez-vous est confirmé, suspendre les rendez-vous conflictuels
        if (isBeingConfirmed && selectedAppointment.practitioner_id) {
          await suspendConflictingAppointments(
            selectedAppointment.practitioner_id,
            startTime.toISOString(),
            endTime.toISOString(),
            selectedAppointment.id
          ).catch(err =>
            console.error('Erreur lors de la suspension des rendez-vous conflictuels:', err)
          );
        }

        // Si le rendez-vous n'est plus confirmé, réactiver les rendez-vous qu'il avait suspendus
        if (isBeingUnconfirmed) {
          const result = await reactivateSuspendedAppointments(selectedAppointment.id)
            .catch(err => {
              console.error('Erreur lors de la réactivation des rendez-vous:', err);
              return { reactivatedCount: 0, reactivatedAppointments: [] };
            });

          if (result.reactivatedCount > 0) {
            console.log(`${result.reactivatedCount} rendez-vous réactivé(s) automatiquement`);
          }
        }

        alert('Rendez-vous mis à jour avec succès !');
      }

      handleCloseEditDialog();

      // Rafraîchir les données après toutes les opérations
      if (onAppointmentChange) {
        onAppointmentChange();
      }
    } catch (error) {
      console.error('Erreur sauvegarde RDV:', error);
      alert(`Erreur : ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setSaving(false);
    }
  };

  // Ouvrir le dialogue de confirmation de suppression
  const handleOpenDeleteDialog = () => {
    setEditDialogOpen(false);
    setDeleteDialogOpen(true);
  };

  // Supprimer un RDV
  const handleDelete = async () => {
    if (!selectedAppointment) return;

    console.log('[DELETE] Tentative de suppression du rendez-vous:', {
      id: selectedAppointment.id,
      status: selectedAppointment.status,
      client_id: selectedAppointment.client_id,
      payment_status: selectedAppointment.payment_status,
      start_time: selectedAppointment.start_time
    });

    setDeleting(true);
    try {
      // Si le rendez-vous supprimé était confirmé, réactiver les rendez-vous qu'il avait suspendus
      const wasConfirmed = selectedAppointment.status === 'confirmed';

      console.log('[DELETE] Envoi de la requête de suppression via RPC...');

      // Utiliser une fonction RPC pour contourner les politiques RLS
      const { error, data } = await supabase.rpc('delete_appointment_by_practitioner', {
        appointment_id: selectedAppointment.id,
        practitioner_id: selectedAppointment.practitioner_id
      });

      console.log('[DELETE] Réponse de Supabase RPC:', { error, data });

      if (error) {
        console.error('[DELETE] Erreur Supabase:', error);
        alert(`Erreur lors de la suppression: ${error.message}`);
        throw error;
      }

      if (!data) {
        console.error('[DELETE] Aucune ligne supprimée - Politique RLS ou rendez-vous inexistant');
        alert('Impossible de supprimer ce rendez-vous. Vérifiez vos permissions.');
        return;
      }

      console.log('[DELETE] Suppression réussie !');

      // Réactiver les rendez-vous suspendus si le rendez-vous était confirmé
      if (wasConfirmed) {
        const result = await reactivateSuspendedAppointments(selectedAppointment.id)
          .catch(err => {
            console.error('Erreur lors de la réactivation des rendez-vous après suppression:', err);
            return { reactivatedCount: 0, reactivatedAppointments: [] };
          });

        if (result.reactivatedCount > 0) {
          console.log(`${result.reactivatedCount} rendez-vous réactivé(s) automatiquement après suppression`);
        }
      }

      setDeleteDialogOpen(false);
      setSelectedAppointment(null);

      // Rafraîchir les données après toutes les opérations
      if (onAppointmentChange) {
        onAppointmentChange();
      }

      alert('Rendez-vous supprimé avec succès !');
    } catch (error) {
      console.error('[DELETE] Exception:', error);
      alert(`Erreur lors de la suppression: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
    } finally {
      setDeleting(false);
    }
  };

  // Rendre un rendez-vous à nouveau disponible
  const handleMakeAppointmentAvailable = async () => {
    if (!selectedAppointment) return;

    if (!window.confirm('Voulez-vous rendre ce rendez-vous à nouveau disponible? Cela effacera les informations du client.')) {
      return;
    }

    setMakingAvailable(true);
    try {
      // Vérifier si le rendez-vous est payé
      if (selectedAppointment.payment_status === 'paid') {
        alert("Impossible de libérer un rendez-vous payé. Effectuez d'abord un remboursement.");
        return;
      }

      // Supprimer d'abord les bénéficiaires liés
      const { error: deleteBeneficiariesError } = await supabase
        .from('appointment_beneficiaries')
        .delete()
        .eq('appointment_id', selectedAppointment.id);

      if (deleteBeneficiariesError) throw deleteBeneficiariesError;

      // Mettre à jour le rendez-vous dans la base de données
      const { error } = await supabase
        .from('appointments')
        .update({
          client_id: null,
          status: 'pending',
          payment_status: 'unpaid',
          payment_id: null,
          notes: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedAppointment.id);

      if (error) throw error;

      handleCloseEditDialog();

      // Rafraîchir les données
      if (onAppointmentChange) {
        onAppointmentChange();
      }
    } catch (error) {
      console.error('Erreur lors de la libération du rendez-vous:', error);
      alert('Erreur lors de la libération du rendez-vous.');
    } finally {
      setMakingAvailable(false);
    }
  };

  // Ouvrir le dialogue de copie avec une journée source pré-sélectionnée
  const handleQuickCopyDay = (day: Date) => {
    setSourceDay(day);
    setCopyDayDialogOpen(true);
  };

  // Ouvrir le dialogue de suppression de journée
  const handleOpenDeleteDayDialog = (day: Date) => {
    setDayToDelete(day);
    setDeleteDayDialogOpen(true);
  };

  // Supprimer tous les rendez-vous disponibles (pending) et annulés automatiquement d'une journée
  const handleDeleteDayAppointments = async () => {
    if (!dayToDelete) return;

    setDeletingDay(true);
    try {
      const dayStr = format(dayToDelete, 'yyyy-MM-dd');
      const nextDay = new Date(dayToDelete);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = format(nextDay, 'yyyy-MM-dd');

      // Récupérer tous les rendez-vous de la journée
      const { data: allAppointments, error: fetchError } = await supabase
        .from('appointments')
        .select('id, status, notes')
        .gte('start_time', `${dayStr}T00:00:00`)
        .lt('start_time', `${nextDayStr}T00:00:00`);

      if (fetchError) throw fetchError;

      if (!allAppointments || allAppointments.length === 0) {
        alert('Aucun rendez-vous à supprimer pour cette journée.');
        setDeleteDayDialogOpen(false);
        setDayToDelete(null);
        setDeletingDay(false);
        return;
      }

      // Filtrer pour garder uniquement :
      // 1. Les rendez-vous avec statut "pending"
      // 2. Les rendez-vous avec statut "cancelled" qui contiennent "[AUTO_SUSPENDED:" (annulés auto)
      const toDelete = allAppointments.filter(apt =>
        apt.status === 'pending' ||
        (apt.status === 'cancelled' && apt.notes?.includes('[AUTO_SUSPENDED:'))
      );

      if (toDelete.length === 0) {
        alert('Aucun rendez-vous disponible ou annulé automatiquement à supprimer pour cette journée.');
        setDeleteDayDialogOpen(false);
        setDayToDelete(null);
        setDeletingDay(false);
        return;
      }

      const idsToDelete = toDelete.map(apt => apt.id);

      // Supprimer les rendez-vous filtrés
      const { error: deleteError } = await supabase
        .from('appointments')
        .delete()
        .in('id', idsToDelete);

      if (deleteError) throw deleteError;

      const pendingCount = toDelete.filter(apt => apt.status === 'pending').length;
      const autoCancelledCount = toDelete.filter(apt =>
        apt.status === 'cancelled' && apt.notes?.includes('[AUTO_SUSPENDED:')
      ).length;

      let message = `${toDelete.length} rendez-vous supprimé(s) pour le ${format(dayToDelete, 'd MMMM yyyy', { locale: fr })}`;
      if (pendingCount > 0 && autoCancelledCount > 0) {
        message += ` (${pendingCount} disponible(s), ${autoCancelledCount} annulé(s) auto)`;
      } else if (pendingCount > 0) {
        message += ` (${pendingCount} disponible(s))`;
      } else if (autoCancelledCount > 0) {
        message += ` (${autoCancelledCount} annulé(s) auto)`;
      }

      alert(message);

      setDeleteDayDialogOpen(false);
      setDayToDelete(null);

      // Rafraîchir les données
      if (onAppointmentChange) {
        onAppointmentChange();
      }
    } catch (error) {
      console.error('Erreur lors de la suppression des rendez-vous:', error);
      alert('Erreur lors de la suppression des rendez-vous.');
    } finally {
      setDeletingDay(false);
    }
  };

  // Copier une journée vers une autre
  const handleCopyDay = async () => {
    if (!sourceDay || !targetDay) {
      alert('Veuillez sélectionner une journée source et une journée cible.');
      return;
    }

    // Vérifier que les journées sont différentes
    if (format(sourceDay, 'yyyy-MM-dd') === format(targetDay, 'yyyy-MM-dd')) {
      alert('La journée source et la journée cible doivent être différentes.');
      return;
    }

    setCopying(true);
    try {
      const sourceDayStr = format(sourceDay, 'yyyy-MM-dd');
      const targetDayStr = format(targetDay, 'yyyy-MM-dd');

      // 1. Récupérer tous les rendez-vous de la journée source
      const nextDaySource = new Date(sourceDay);
      nextDaySource.setDate(nextDaySource.getDate() + 1);
      const nextDaySourceStr = format(nextDaySource, 'yyyy-MM-dd');

      const { data: sourceAppointments, error: fetchError } = await supabase
        .from('appointments')
        .select('*')
        .gte('start_time', `${sourceDayStr}T00:00:00`)
        .lt('start_time', `${nextDaySourceStr}T00:00:00`)
        .order('start_time', { ascending: true });

      if (fetchError) throw fetchError;

      if (!sourceAppointments || sourceAppointments.length === 0) {
        alert('Aucun rendez-vous à copier pour cette journée.');
        setCopying(false);
        return;
      }

      // 2. Supprimer tous les rendez-vous de la journée cible
      const nextDayTarget = new Date(targetDay);
      nextDayTarget.setDate(nextDayTarget.getDate() + 1);
      const nextDayTargetStr = format(nextDayTarget, 'yyyy-MM-dd');

      const { error: deleteError } = await supabase
        .from('appointments')
        .delete()
        .gte('start_time', `${targetDayStr}T00:00:00`)
        .lt('start_time', `${nextDayTargetStr}T00:00:00`);

      if (deleteError) throw deleteError;

      // 3. Copier les rendez-vous vers la journée cible
      const newAppointments = sourceAppointments.map(apt => {
        const sourceDate = parseISO(apt.start_time);
        const targetDate = new Date(targetDay);
        targetDate.setHours(sourceDate.getHours(), sourceDate.getMinutes(), 0, 0);

        const sourceEndDate = parseISO(apt.end_time);
        const targetEndDate = new Date(targetDay);
        targetEndDate.setHours(sourceEndDate.getHours(), sourceEndDate.getMinutes(), 0, 0);

        return {
          practitioner_id: apt.practitioner_id,
          service_id: apt.service_id,
          start_time: targetDate.toISOString(),
          end_time: targetEndDate.toISOString(),
          status: apt.status,
          payment_status: apt.payment_status,
          payment_required: apt.payment_required,
          notes: apt.notes,
          // Ne pas copier le client_id pour garder les créneaux disponibles
          client_id: null
        };
      });

      const { error: insertError } = await supabase
        .from('appointments')
        .insert(newAppointments);

      if (insertError) throw insertError;

      alert(`${sourceAppointments.length} rendez-vous copiés avec succès de ${format(sourceDay, 'd MMMM', { locale: fr })} vers ${format(targetDay, 'd MMMM', { locale: fr })}.`);

      setCopyDayDialogOpen(false);
      setSourceDay(null);
      setTargetDay(null);

      // Rafraîchir les données
      if (onAppointmentChange) {
        onAppointmentChange();
      }
    } catch (error) {
      console.error('Erreur lors de la copie de journée:', error);
      alert('Erreur lors de la copie de journée.');
    } finally {
      setCopying(false);
    }
  };

  // Drag & Drop - Début du drag
  const handleDragStart = (e: React.DragEvent, appointment: Appointment) => {
    // Seulement pour les rendez-vous disponibles (pending)
    if (appointment.status !== 'pending') {
      e.preventDefault();
      return;
    }
    setDraggedAppointment(appointment);

    // Détecter si Ctrl est enfoncé pour duplication
    const isCtrl = e.ctrlKey || e.metaKey; // metaKey pour Mac
    setIsCtrlPressed(isCtrl);

    // Changer l'effet visuel selon le mode
    e.dataTransfer.effectAllowed = isCtrl ? 'copy' : 'move';
  };

  // Drag & Drop - Fin du drag
  const handleDragEnd = () => {
    setDraggedAppointment(null);
    setDragOverSlot(null);
    setIsCtrlPressed(false);
  };

  // Drag & Drop - Survol d'un slot
  const handleDragOver = (e: React.DragEvent, day: string, hour: number, minute: number = 0) => {
    e.preventDefault();

    // Mettre à jour l'état de Ctrl en temps réel (au cas où l'utilisateur appuie/relâche pendant le drag)
    const isCtrl = e.ctrlKey || e.metaKey;
    if (isCtrl !== isCtrlPressed) {
      setIsCtrlPressed(isCtrl);
    }

    // Changer l'effet visuel selon le mode
    e.dataTransfer.dropEffect = isCtrl ? 'copy' : 'move';
    setDragOverSlot({ day, hour, minute });
  };

  // Drag & Drop - Déposer
  const handleDrop = async (e: React.DragEvent, day: string, hour: number, minute: number = 0) => {
    e.preventDefault();

    if (!draggedAppointment) return;

    const isDuplicating = e.ctrlKey || e.metaKey; // Vérifier si Ctrl est enfoncé au moment du drop

    try {
      // Créer la nouvelle date/heure
      const newDate = parseISO(day);
      newDate.setHours(hour, minute, 0, 0);

      // Vérifier si c'est la même position (pas besoin de mise à jour en mode déplacement)
      const currentStart = parseISO(draggedAppointment.start_time);
      if (
        !isDuplicating && // Seulement en mode déplacement
        currentStart.getFullYear() === newDate.getFullYear() &&
        currentStart.getMonth() === newDate.getMonth() &&
        currentStart.getDate() === newDate.getDate() &&
        currentStart.getHours() === newDate.getHours() &&
        currentStart.getMinutes() === newDate.getMinutes()
      ) {
        // Même position, ne rien faire
        setDraggedAppointment(null);
        setDragOverSlot(null);
        setIsCtrlPressed(false);
        return;
      }

      // Calculer l'heure de fin basée sur la durée du service
      const service = services.find(s => s.id === draggedAppointment.service_id);
      const durationMinutes = service?.duration || 60;
      const endTime = new Date(newDate);
      endTime.setMinutes(endTime.getMinutes() + durationMinutes);

      // Vérifier les conflits avec d'autres rendez-vous CONFIRMÉS d'un service différent
      // Note: Les rendez-vous du même service peuvent se chevaucher
      // Note: Les rendez-vous disponibles (pending) peuvent se chevaucher entre eux
      let conflictsQuery = supabase
        .from('appointments')
        .select('id, start_time, end_time, service_id, status, service:services(name)')
        .eq('practitioner_id', draggedAppointment.practitioner_id)
        .neq('service_id', draggedAppointment.service_id) // Exclure les rendez-vous du même service (toujours autorisés)
        .eq('status', 'confirmed') // UNIQUEMENT les rendez-vous confirmés bloquent
        .lt('start_time', endTime.toISOString())
        .gt('end_time', newDate.toISOString());

      // En mode déplacement, exclure le rendez-vous en cours de déplacement
      if (!isDuplicating) {
        conflictsQuery = conflictsQuery.neq('id', draggedAppointment.id);
      }

      const { data: conflicts } = await conflictsQuery;

      // Si conflit avec un rendez-vous confirmé d'un autre service, bloquer
      if (conflicts && conflicts.length > 0) {
        const serviceData = conflicts[0].service as any;
        const conflictService = (Array.isArray(serviceData) ? serviceData[0]?.name : serviceData?.name) || 'un autre service';
        const action = isDuplicating ? 'dupliquer' : 'déplacer';
        alert(`Impossible de ${action} ce rendez-vous : il chevauche un rendez-vous confirmé de "${conflictService}" sur ce créneau. Les rendez-vous disponibles (verts) peuvent se chevaucher, mais pas avec des rendez-vous confirmés d'un service différent.`);
        setDraggedAppointment(null);
        setDragOverSlot(null);
        setIsCtrlPressed(false);
        return;
      }

      if (isDuplicating) {
        // MODE DUPLICATION : Créer une copie du rendez-vous
        console.log('[DRAG&DROP] Duplication du rendez-vous');

        const { error } = await supabase
          .from('appointments')
          .insert([{
            practitioner_id: draggedAppointment.practitioner_id,
            service_id: draggedAppointment.service_id,
            start_time: newDate.toISOString(),
            end_time: endTime.toISOString(),
            status: draggedAppointment.status,
            payment_status: draggedAppointment.payment_status,
            notes: draggedAppointment.notes,
            client_id: null // Toujours disponible pour une copie
          }]);

        if (error) throw error;

        console.log('[DRAG&DROP] Rendez-vous dupliqué avec succès');
      } else {
        // MODE DÉPLACEMENT : Mettre à jour le rendez-vous existant
        console.log('[DRAG&DROP] Déplacement du rendez-vous');

        const { error } = await supabase
          .from('appointments')
          .update({
            start_time: newDate.toISOString(),
            end_time: endTime.toISOString()
          })
          .eq('id', draggedAppointment.id);

        if (error) throw error;

        console.log('[DRAG&DROP] Rendez-vous déplacé avec succès');
      }

      // Rafraîchir les données
      if (onAppointmentChange) {
        onAppointmentChange();
      }
    } catch (error) {
      console.error('Erreur drag&drop RDV:', error);
      const action = isDuplicating ? 'la duplication' : 'le déplacement';
      alert(`Erreur lors de ${action} du rendez-vous.`);
    } finally {
      setDraggedAppointment(null);
      setDragOverSlot(null);
      setIsCtrlPressed(false);
    }
  };

  // Formater l'affichage de la période
  const weekDisplayRange = `${format(currentWeekStart, 'd MMMM', { locale: fr })} - ${format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), 'd MMMM yyyy', { locale: fr })}`;

  return (
    <Box>
      {/* En-tête de navigation */}
      <Paper sx={{ p: 2, mb: 2, background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {weekDisplayRange}
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={handleCreateAppointment}
              variant="contained"
              color="primary"
            >
              Créer un créneau
            </Button>
            <Button
              size="small"
              startIcon={<ContentCopyIcon />}
              onClick={() => setCopyDayDialogOpen(true)}
              variant="outlined"
              color="secondary"
            >
              Copier journée
            </Button>
            <Button
              size="small"
              startIcon={<TodayIcon />}
              onClick={goToToday}
              variant="outlined"
            >
              Aujourd'hui
            </Button>
            <IconButton onClick={goToPreviousWeek} size="small">
              <ArrowBackIcon />
            </IconButton>
            <IconButton onClick={goToNextWeek} size="small">
              <ArrowForwardIcon />
            </IconButton>
          </Box>
        </Box>
      </Paper>

      {/* Grille du calendrier */}
      <Paper sx={{ overflow: 'auto' }}>
        <Box sx={{ display: 'flex', minWidth: 900 }}>
          {/* Colonne des heures */}
          <Box sx={{ width: 80, flexShrink: 0, borderRight: '1px solid', borderColor: 'divider' }}>
            {/* En-tête vide */}
            <Box sx={{ height: 60, borderBottom: '1px solid', borderColor: 'divider' }} />

            {/* Heures */}
            {hours.map(hour => (
              <Box
                key={hour}
                sx={{
                  height: 60,
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  pt: 0.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  bgcolor: '#fafafa'
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                  {hour}h00
                </Typography>
              </Box>
            ))}
          </Box>

          {/* Colonnes des jours */}
          {weekDays.map(day => (
            <Box
              key={day.dateString}
              sx={{
                flex: 1,
                minWidth: 120,
                borderRight: '1px solid',
                borderColor: 'divider',
                bgcolor: day.isToday ? 'rgba(52, 89, 149, 0.02)' : 'white'
              }}
            >
              {/* En-tête du jour */}
              <Box
                sx={{
                  height: 60,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderBottom: '2px solid',
                  borderColor: day.isToday ? theme.palette.primary.main : 'divider',
                  bgcolor: day.isToday ? 'rgba(52, 89, 149, 0.08)' : '#fafafa',
                  position: 'relative'
                }}
              >
                <Typography variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 600, color: day.isToday ? 'primary.main' : 'text.secondary' }}>
                  {day.dayName}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: day.isToday ? 'primary.main' : 'text.primary' }}>
                  {day.dayNumber}
                </Typography>

                {/* Icônes d'action rapide */}
                <Box sx={{ position: 'absolute', top: 4, right: 4, display: 'flex', gap: 0.5 }}>
                  <IconButton
                    size="small"
                    onClick={() => handleQuickCopyDay(day.date)}
                    sx={{
                      opacity: 0.6,
                      '&:hover': {
                        opacity: 1,
                        bgcolor: 'rgba(0, 0, 0, 0.04)'
                      }
                    }}
                    title={`Copier cette journée (${format(day.date, 'd MMMM', { locale: fr })})`}
                  >
                    <ContentCopyIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDeleteDayDialog(day.date)}
                    sx={{
                      opacity: 0.6,
                      color: 'error.main',
                      '&:hover': {
                        opacity: 1,
                        bgcolor: 'rgba(244, 67, 54, 0.08)'
                      }
                    }}
                    title={`Supprimer les rendez-vous disponibles et annulés auto du ${format(day.date, 'd MMMM', { locale: fr })}`}
                  >
                    <DeleteSweepIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              </Box>

              {/* Grille horaire */}
              <Box sx={{ position: 'relative' }}>
                {/* Lignes horaires (fond) avec zones de drop tous les 15 minutes */}
                {hours.map(hour => (
                  <Box key={hour} sx={{ position: 'relative', height: 60, borderBottom: '2px solid', borderColor: 'divider' }}>
                    {/* 4 zones de 15 minutes par heure */}
                    {[0, 15, 30, 45].map((minute, index) => (
                      <Box
                        key={`${hour}-${minute}`}
                        onDragOver={(e) => handleDragOver(e, day.dateString, hour, minute)}
                        onDrop={(e) => handleDrop(e, day.dateString, hour, minute)}
                        sx={{
                          position: 'absolute',
                          top: `${index * 25}%`,
                          left: 0,
                          right: 0,
                          height: '25%',
                          borderBottom: minute === 30 ? '1px dashed' : 'none',
                          borderColor: 'rgba(0, 0, 0, 0.1)',
                          bgcolor: dragOverSlot?.day === day.dateString &&
                                   dragOverSlot?.hour === hour &&
                                   dragOverSlot?.minute === minute
                            ? (isCtrlPressed ? 'rgba(33, 150, 243, 0.25)' : 'rgba(76, 175, 80, 0.25)') // Bleu pour duplication, vert pour déplacement
                            : 'transparent',
                          transition: 'background-color 0.15s',
                          border: dragOverSlot?.day === day.dateString &&
                                  dragOverSlot?.hour === hour &&
                                  dragOverSlot?.minute === minute
                            ? (isCtrlPressed ? '2px solid rgba(33, 150, 243, 0.8)' : '2px solid rgba(76, 175, 80, 0.5)') // Bleu pour duplication, vert pour déplacement
                            : 'none',
                          '&:hover': {
                            bgcolor: draggedAppointment
                              ? (isCtrlPressed ? 'rgba(33, 150, 243, 0.1)' : 'rgba(76, 175, 80, 0.1)')
                              : 'transparent'
                          }
                        }}
                      />
                    ))}
                  </Box>
                ))}

                {/* Rendez-vous positionnés absolument */}
                {(() => {
                  const dayAppointments = getAppointmentsForDay(day.dateString);
                  const appointmentColumns = calculateAppointmentColumns(dayAppointments);

                  return appointmentColumns.map(({ appointment, column, totalColumns }) => {
                    // Couleur basée sur le statut
                    let statusColor: string;
                    switch (appointment.status) {
                      case 'pending':
                        statusColor = '#4CAF50'; // Vert - Disponible
                        break;
                      case 'confirmed':
                        statusColor = '#2196F3'; // Bleu - Confirmé
                        break;
                      case 'cancelled':
                        statusColor = '#f44336'; // Rouge - Annulé
                        break;
                      case 'completed':
                        statusColor = '#9e9e9e'; // Gris - Terminé
                        break;
                      default:
                        statusColor = '#9e9e9e'; // Gris par défaut
                    }

                    const isPending = appointment.status === 'pending';
                    const moduleName = getServiceShortName(appointment.service?.name || 'Service');
                    const initial = getServiceInitial(appointment.service?.name || 'Service');

                    const top = getAppointmentTop(appointment);
                    const height = getAppointmentHeight(appointment);
                    const widthPercent = 100 / totalColumns;
                    const leftPercent = (column * 100) / totalColumns;

                    const isDragging = draggedAppointment?.id === appointment.id;

                    return (
                      <Box
                        key={appointment.id}
                        draggable={isPending}
                        onDragStart={(e) => handleDragStart(e, appointment)}
                        onDragEnd={handleDragEnd}
                        onClick={() => handleAppointmentClick(appointment)}
                        sx={{
                          position: 'absolute',
                          top: `${top}px`,
                          left: `${leftPercent}%`,
                          width: `calc(${widthPercent}% - 4px)`,
                          height: `${height}px`,
                          bgcolor: 'transparent',
                          color: statusColor,
                          borderRadius: 1,
                          p: 0.5,
                          cursor: isPending ? 'move' : 'pointer',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s',
                          opacity: isDragging ? 0.2 : (draggedAppointment ? 0.4 : 1),
                          border: `4px solid ${statusColor}`,
                          pointerEvents: draggedAppointment && !isDragging ? 'none' : 'auto',
                          '&:hover': {
                            bgcolor: `${statusColor}10`,
                            transform: isDragging ? 'none' : 'scale(1.02)',
                            zIndex: 100,
                            boxShadow: `0 4px 12px ${statusColor}40`
                          }
                        }}
                      >
                        {/* Première lettre en gros */}
                        <Typography
                          variant="h4"
                          sx={{
                            fontWeight: 700,
                            fontSize: '2rem',
                            lineHeight: 1,
                            mb: 0.5,
                            color: statusColor
                          }}
                        >
                          {initial}
                        </Typography>

                        {/* Nom complet du service en petit */}
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 600,
                            fontSize: '0.65rem',
                            textAlign: 'center',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            width: '100%',
                            color: statusColor
                          }}
                        >
                          {moduleName}
                        </Typography>

                        {isPending && (
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 500,
                              fontSize: '0.6rem',
                              textAlign: 'center',
                              opacity: 0.8,
                              mt: 0.5,
                              color: statusColor
                            }}
                          >
                            Dispo
                          </Typography>
                        )}
                      </Box>
                    );
                  });
                })()}
              </Box>
            </Box>
          ))}
        </Box>
      </Paper>

      {/* Légende */}
      <Paper sx={{ p: 2, mt: 2 }}>
        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
          Légende des statuts
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 20, height: 20, bgcolor: '#4CAF50', borderRadius: 0.5 }} />
            <Typography variant="caption">Disponible (En attente) - Déplaçable/Duplicable par glisser-déposer</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 20, height: 20, bgcolor: '#2196F3', borderRadius: 0.5 }} />
            <Typography variant="caption">Confirmé</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 20, height: 20, bgcolor: '#f44336', borderRadius: 0.5 }} />
            <Typography variant="caption">Annulé</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 20, height: 20, bgcolor: '#9e9e9e', borderRadius: 0.5 }} />
            <Typography variant="caption">Terminé</Typography>
          </Box>
        </Box>
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2" component="div">
            <strong>💡 Glisser-déposer :</strong>
            <ul style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
              <li><strong>Déplacer</strong> : Glissez un rendez-vous disponible (vert) vers un autre créneau</li>
              <li><strong>Dupliquer</strong> : Maintenez <kbd style={{ padding: '2px 6px', backgroundColor: '#f5f5f5', border: '1px solid #ccc', borderRadius: '3px', fontFamily: 'monospace' }}>Ctrl</kbd> (ou <kbd style={{ padding: '2px 6px', backgroundColor: '#f5f5f5', border: '1px solid #ccc', borderRadius: '3px', fontFamily: 'monospace' }}>⌘</kbd> sur Mac) pendant le glissement pour dupliquer (zone bleue)</li>
              <li>Précision au quart d'heure (15 min). Les services identiques sont regroupés. Le déplacement est bloqué s'il y a conflit avec un autre service.</li>
            </ul>
          </Typography>
        </Alert>
      </Paper>

      {/* Dialog d'édition */}
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
        <Dialog
          open={editDialogOpen}
          onClose={handleCloseEditDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              {isCreating ? 'Créer un nouveau rendez-vous' : 'Modifier le rendez-vous'}
            </Typography>
            <IconButton onClick={handleCloseEditDialog} size="small">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2}>
              {selectedAppointment?.client_id && (
                <Grid item xs={12}>
                  <Alert severity="info">
                    <Typography variant="body2">
                      <strong>Client:</strong> {selectedAppointment.client?.first_name} {selectedAppointment.client?.last_name}
                    </Typography>
                    {selectedAppointment.client?.email && (
                      <Typography variant="caption">
                        {selectedAppointment.client.email}
                      </Typography>
                    )}
                  </Alert>
                </Grid>
              )}

              {selectedAppointment?.status === 'cancelled' && selectedAppointment?.notes?.includes('[AUTO_SUSPENDED:') && (
                <Grid item xs={12}>
                  <Alert severity="warning">
                    <Typography variant="body2">
                      <strong>⚠️ Annulation automatique</strong>
                    </Typography>
                    <Typography variant="caption">
                      Ce rendez-vous a été annulé automatiquement par le système suite à la confirmation d'un autre rendez-vous en conflit. Si vous repassez ce rendez-vous en "En attente", il sera à nouveau disponible.
                    </Typography>
                  </Alert>
                </Grid>
              )}

              {selectedAppointment?.status === 'cancelled' && !selectedAppointment?.notes?.includes('[AUTO_SUSPENDED:') && (
                <Grid item xs={12}>
                  <Alert severity="error">
                    <Typography variant="body2">
                      <strong>Rendez-vous annulé</strong>
                    </Typography>
                    <Typography variant="caption">
                      {selectedAppointment?.notes
                        ? `Ce rendez-vous a été annulé. Notes: ${selectedAppointment.notes}`
                        : 'Ce rendez-vous a été annulé.'}
                    </Typography>
                  </Alert>
                </Grid>
              )}

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Service</InputLabel>
                  <Select
                    value={editedAppointment.service_id || ''}
                    onChange={(e) => setEditedAppointment({
                      ...editedAppointment,
                      service_id: e.target.value
                    })}
                    label="Service"
                  >
                    {services.map(service => (
                      <MenuItem key={service.id} value={service.id}>
                        {service.name} ({service.duration} min)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Date"
                  value={selectedDate}
                  onChange={(date) => setSelectedDate(date)}
                  slotProps={{
                    textField: {
                      fullWidth: true
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TimePicker
                  label="Heure de début"
                  value={selectedTime}
                  onChange={(time) => setSelectedTime(time)}
                  slotProps={{
                    textField: {
                      fullWidth: true
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Statut</InputLabel>
                  <Select
                    value={editedAppointment.status || 'pending'}
                    onChange={(e) => setEditedAppointment({
                      ...editedAppointment,
                      status: e.target.value as 'pending' | 'confirmed' | 'cancelled' | 'completed' | 'beneficiaire_confirme' | 'validated' | 'issue_reported' | 'pending_quote'
                    })}
                    label="Statut"
                  >
                    <MenuItem value="pending">En attente</MenuItem>
                    <MenuItem value="confirmed">Confirmé</MenuItem>
                    <MenuItem value="cancelled">Annulé</MenuItem>
                    <MenuItem value="completed">Terminé</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Paiement</InputLabel>
                  <Select
                    value={editedAppointment.payment_status || 'unpaid'}
                    onChange={(e) => setEditedAppointment({
                      ...editedAppointment,
                      payment_status: e.target.value as 'paid' | 'unpaid' | 'refunded'
                    })}
                    label="Paiement"
                  >
                    <MenuItem value="unpaid">Non payé</MenuItem>
                    <MenuItem value="paid">Payé</MenuItem>
                    <MenuItem value="refunded">Remboursé</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <TextField
                  label="Notes"
                  fullWidth
                  multiline
                  rows={3}
                  value={editedAppointment.notes || ''}
                  onChange={(e) => setEditedAppointment({
                    ...editedAppointment,
                    notes: e.target.value
                  })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            {/* Bouton pour rendre disponible (uniquement en mode édition) */}
            {!isCreating && selectedAppointment?.client_id && selectedAppointment?.payment_status !== 'paid' && (
              <Button
                color="success"
                startIcon={<RestoreIcon />}
                onClick={handleMakeAppointmentAvailable}
                disabled={saving || deleting || makingAvailable}
              >
                {makingAvailable ? 'Libération...' : 'Rendre disponible'}
              </Button>
            )}

            {/* Bouton Supprimer (uniquement en mode édition) */}
            {!isCreating && (
              <Button
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleOpenDeleteDialog}
                disabled={saving || deleting || makingAvailable}
              >
                Supprimer
              </Button>
            )}
            <Box sx={{ flex: 1 }} />
            <Button onClick={handleCloseEditDialog} disabled={saving || deleting || makingAvailable}>
              Annuler
            </Button>
            <Button
              variant="contained"
              onClick={handleSaveAppointment}
              disabled={saving || deleting || makingAvailable}
            >
              {saving ? 'Enregistrement...' : (isCreating ? 'Créer' : 'Mettre à jour')}
            </Button>
          </DialogActions>
        </Dialog>
      </LocalizationProvider>

      {/* Dialog de confirmation de suppression */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
      >
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir supprimer ce rendez-vous ?
            {selectedAppointment?.client_id && (
              <strong> Attention : ce rendez-vous est réservé par un client.</strong>
            )}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
            Annuler
          </Button>
          <Button
            color="error"
            onClick={handleDelete}
            disabled={deleting}
            startIcon={<DeleteIcon />}
          >
            {deleting ? 'Suppression...' : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de copie de journée */}
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
        <Dialog
          open={copyDayDialogOpen}
          onClose={() => !copying && setCopyDayDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Copier une journée</Typography>
            <IconButton onClick={() => setCopyDayDialogOpen(false)} size="small" disabled={copying}>
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent dividers>
            <Alert severity="warning" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>⚠️ Attention :</strong> Tous les rendez-vous de la journée cible seront supprimés et remplacés par ceux de la journée source. Les rendez-vous copiés seront disponibles (sans client).
              </Typography>
            </Alert>

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <DatePicker
                  label="Journée source (à copier depuis)"
                  value={sourceDay}
                  onChange={(date) => setSourceDay(date)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      helperText: 'Sélectionnez la journée dont vous voulez copier les rendez-vous'
                    }
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <DatePicker
                  label="Journée cible (à copier vers)"
                  value={targetDay}
                  onChange={(date) => setTargetDay(date)}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      helperText: 'Sélectionnez la journée où copier les rendez-vous (sera écrasée)'
                    }
                  }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setCopyDayDialogOpen(false)} disabled={copying}>
              Annuler
            </Button>
            <Button
              variant="contained"
              onClick={handleCopyDay}
              disabled={copying || !sourceDay || !targetDay}
              startIcon={<ContentCopyIcon />}
              color="secondary"
            >
              {copying ? 'Copie en cours...' : 'Copier la journée'}
            </Button>
          </DialogActions>
        </Dialog>
      </LocalizationProvider>

      {/* Dialog de suppression de tous les rendez-vous disponibles d'une journée */}
      <Dialog
        open={deleteDayDialogOpen}
        onClose={() => !deletingDay && setDeleteDayDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Supprimer les rendez-vous disponibles</Typography>
          <IconButton onClick={() => setDeleteDayDialogOpen(false)} size="small" disabled={deletingDay}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>⚠️ Attention :</strong> Cette action supprimera de la journée suivante :
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600, mt: 1 }}>
              {dayToDelete && format(dayToDelete, 'd MMMM yyyy', { locale: fr })}
            </Typography>
          </Alert>
          <Typography variant="body2" sx={{ mt: 2 }}>
            <strong>Seront supprimés :</strong>
          </Typography>
          <Box component="ul" sx={{ mt: 1, pl: 3 }}>
            <Typography component="li" variant="body2">
              Les rendez-vous <strong>disponibles</strong> (en attente - verts)
            </Typography>
            <Typography component="li" variant="body2">
              Les rendez-vous <strong>annulés automatiquement</strong> par le système (rouges avec tag AUTO_SUSPENDED)
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ mt: 2 }}>
            <strong>Seront conservés :</strong>
          </Typography>
          <Box component="ul" sx={{ mt: 1, pl: 3 }}>
            <Typography component="li" variant="body2">
              Les rendez-vous <strong>confirmés</strong> (bleus)
            </Typography>
            <Typography component="li" variant="body2">
              Les rendez-vous <strong>terminés</strong> (gris)
            </Typography>
            <Typography component="li" variant="body2">
              Les rendez-vous <strong>annulés manuellement</strong> (rouges sans tag AUTO_SUSPENDED)
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeleteDayDialogOpen(false)} disabled={deletingDay}>
            Annuler
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteDayAppointments}
            disabled={deletingDay}
            startIcon={<DeleteSweepIcon />}
          >
            {deletingDay ? 'Suppression...' : 'Supprimer les rendez-vous disponibles'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PractitionerWeeklyCalendar;
