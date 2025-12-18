// src/components/admin/AdminAppointmentsTable.tsx
import React, { useState } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableRow, 
  Paper,
  Typography,
  Box,
  IconButton,
  Tooltip,
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Grid,
  TextField,
  Checkbox,
  FormControlLabel,
  Alert,
  Chip
} from "@mui/material";
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RestoreIcon from '@mui/icons-material/Restore';
import InfoIcon from '@mui/icons-material/Info';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { fr } from 'date-fns/locale';
import { format, parseISO, addMinutes, addDays, addWeeks } from 'date-fns';
import {
  Appointment,
  Service,
  Practitioner
} from '../../services/supabase';
import { supabase } from '../../services/supabase';
import { AppointmentDetailsDialog } from '../appointments/AppointmentDetailsDialog';
import { useAuth } from '../../context/AuthContext';

interface AdminAppointmentsTableProps {
  appointments: Appointment[];
  practitioners: Practitioner[];
  services: Service[];
  loading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  onAppointmentChange: () => void;
  isPractitionerView?: boolean;
  practitionerId?: string;
  selectedAppointments?: string[];
  onSelectAppointment?: (appointmentId: string) => void;
  onSelectAll?: () => void;
}

const AdminAppointmentsTable: React.FC<AdminAppointmentsTableProps> = ({
  appointments,
  practitioners,
  services,
  loading,
  error,
  setError,
  onAppointmentChange,
  isPractitionerView = false,
  practitionerId,
  selectedAppointments = [],
  onSelectAppointment,
  onSelectAll
}) => {
  const { profile } = useAuth();

  // État pour le champ de prix personnalisé
  const [customPrice, setCustomPrice] = useState<number | null>(null);
  const [priceError, setPriceError] = useState<string | null>(null);

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

  // États pour le dialogue de détails
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  // Ouvrir le dialogue de détails
  const handleOpenDetailsDialog = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setDetailsDialogOpen(true);
  };

  // Fermeture du dialogue de détails
  const handleCloseDetailsDialog = () => {
    setDetailsDialogOpen(false);
    setSelectedAppointment(null);
  };

  // Mise à jour du rendez-vous depuis le dialog
  const handleAppointmentUpdate = (updatedAppointment: Appointment) => {
    // Mettre à jour le rendez-vous sélectionné
    setSelectedAppointment(updatedAppointment);

    // Notifier le parent pour recharger la liste
    onAppointmentChange();
  };

  // Ouvrir le dialogue pour modifier un rendez-vous
  const handleEditAppointment = (appointment: Appointment) => {
    // Convertir les dates string en objets Date pour les pickers
    const startTime = parseISO(appointment.start_time);

    setSelectedDate(startTime);
    setSelectedTime(startTime);
    setCurrentAppointment(appointment);
    setDialogMode('edit');
    setShowCopyOptions(false);
    setCustomPrice(appointment.custom_price || null);
    setPriceError(null);
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
    setDialogMode('copy');
    setShowCopyOptions(true);
    setCopyCount(1);
    setCopyInterval(1);
    setCopyIntervalUnit('days');
    setCustomPrice(null);
    setPriceError(null);
    setIsDialogOpen(true);
  };
  
  // Supprimer un rendez-vous
  const handleDeleteAppointment = async (appointmentId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce créneau de rendez-vous ?')) return;

    try {
      // Vérifier s'il existe une transaction associée
      const { data: transaction } = await supabase
        .from('transactions')
        .select('id, status')
        .eq('appointment_id', appointmentId)
        .single();

      // Si une transaction existe et que l'utilisateur n'est pas admin, bloquer la suppression
      if (transaction && profile?.user_type !== 'admin') {
        setError('Ce rendez-vous a une transaction associée. Seul un administrateur peut le supprimer.');
        return;
      }

      // Si une transaction existe, demander confirmation supplémentaire même pour l'admin
      if (transaction && profile?.user_type === 'admin') {
        if (!window.confirm('Ce rendez-vous a une transaction associée. Voulez-vous vraiment le supprimer ? Cette action est irréversible.')) {
          return;
        }
      }

      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);

      if (error) throw error;

      onAppointmentChange();
    } catch (err: any) {
      setError(`Erreur lors de la suppression : ${err.message}`);
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
        setError("Impossible de libérer un rendez-vous payé. Effectuez d'abord un remboursement.");
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

      onAppointmentChange();
    } catch (err: any) {
      setError(`Erreur lors de la libération du rendez-vous : ${err.message}`);
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
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    // Vérifier si un intervenant essaie d'annuler un rendez-vous avec transaction
    if (dialogMode === 'edit' && currentAppointment.id && currentAppointment.status === 'cancelled' && profile?.user_type !== 'admin') {
      // Vérifier s'il existe une transaction associée
      const { data: transaction } = await supabase
        .from('transactions')
        .select('id')
        .eq('appointment_id', currentAppointment.id)
        .single();

      if (transaction) {
        setError('Vous ne pouvez pas annuler un rendez-vous avec une transaction associée. Seul un administrateur peut le faire.');
        return;
      }
    }

    // Validation du prix personnalisé
    if (customPrice !== null) {
      // Pour les intervenants, le prix doit être >= au prix du service
      if (isPractitionerView) {
        const selectedService = services.find(s => s.id === currentAppointment.service_id);
        if (selectedService && customPrice < selectedService.price) {
          setError(`Le prix doit être au minimum ${selectedService.price} €`);
          return;
        }
      }
      // Pour les admins, le prix doit juste être >= 0
      else if (customPrice < 0) {
        setError('Le prix ne peut pas être négatif');
        return;
      }
    }

    try {
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
      const selectedService = services.find(s => s.id === currentAppointment.service_id);
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

      // Ajouter le prix personnalisé si défini (pour admin et intervenant)
      if (customPrice !== null) {
        appointmentData.custom_price = customPrice;
      }
      
      if (dialogMode === 'edit' && currentAppointment.id) {
        // Mise à jour
        const { error } = await supabase
          .from('appointments')
          .update(appointmentData)
          .eq('id', currentAppointment.id);

        if (error) throw error;
      } else {
        // Création ou copie simple
        const { error } = await supabase
          .from('appointments')
          .insert([appointmentData]);

        if (error) throw error;
      }

      // Fermer le dialogue et rafraîchir la liste
      handleCloseDialog();
      onAppointmentChange();
    } catch (err: any) {
      setError(`Erreur lors de l'enregistrement : ${err.message}`);
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
      const baseAppointmentData = {
        client_id: null,
        practitioner_id: currentAppointment.practitioner_id,
        service_id: currentAppointment.service_id,
        status: 'pending',
        payment_status: 'unpaid',
        notes: currentAppointment.notes,
      };
      
      // Créer un tableau de rendez-vous à insérer
      const appointmentsToInsert = [];
      
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
        
        appointmentsToInsert.push({
          ...baseAppointmentData,
          start_time: copyDate.toISOString(),
          end_time: endTime.toISOString(),
        });
      }
      
      // Insérer tous les rendez-vous
      const { error } = await supabase
        .from('appointments')
        .insert(appointmentsToInsert);
      
      if (error) throw error;
      
      // Fermer le dialogue et rafraîchir la liste
      handleCloseDialog();
      onAppointmentChange();
      
    } catch (err: any) {
      setError(`Erreur lors de la création des copies : ${err.message}`);
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

  return (
    <>
      <Paper sx={{ width: '100%', overflow: 'auto' }}>
        <Table sx={{ minWidth: { xs: 650, sm: 750 } }}>
          <TableHead>
            <TableRow>
              {onSelectAll && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedAppointments.length > 0 && selectedAppointments.length < appointments.length}
                    checked={appointments.length > 0 && selectedAppointments.length === appointments.length}
                    onChange={onSelectAll}
                  />
                </TableCell>
              )}
              <TableCell>Date</TableCell>
              <TableCell>Heure</TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Durée</TableCell>
              <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>Prix</TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Catégorie</TableCell>
              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Service</TableCell>
              <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>Intervenant</TableCell>
              <TableCell>Client</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Paiement</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {appointments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={onSelectAll ? 12 : 11} align="center">
                  Aucun rendez-vous trouvé
                </TableCell>
              </TableRow>
            ) : (
              appointments.map((appointment) => {
                // Déterminer si le rendez-vous est passé
                const isPast = new Date(appointment.start_time) < new Date();

                return (
                <TableRow
                  key={appointment.id}
                  sx={{
                    backgroundColor: isPast ? 'rgba(0, 0, 0, 0.04)' : 'inherit',
                    '&:hover': {
                      backgroundColor: isPast ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 0, 0, 0.04)'
                    }
                  }}
                >
                  {onSelectAppointment && (
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedAppointments.includes(appointment.id)}
                        onChange={() => onSelectAppointment(appointment.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    {format(parseISO(appointment.start_time), 'dd/MM/yyyy', { locale: fr })}
                  </TableCell>
                  <TableCell>
                    {format(parseISO(appointment.start_time), 'HH:mm', { locale: fr })}
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    {appointment.service?.duration} min
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>
                    {(() => {
                      const price = appointment.custom_price ?? appointment.service?.price;
                      if (price === 0) {
                        return <Chip label="Gratuit" size="small" color="success" />;
                      }
                      return `${price}€`;
                    })()}
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    {appointment.service?.category && getStatusChip(appointment.service.category)}
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>{appointment.service?.name}</TableCell>
                  <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                    {appointment.practitioner?.profile?.first_name} {appointment.practitioner?.profile?.last_name}
                  </TableCell>
                  <TableCell>
                    {appointment.client ? (
                      `${appointment.client.first_name} ${appointment.client.last_name}`
                    ) : (
                      <Chip label="Disponible" color="success" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    {getStatusChip(appointment.status)}
                  </TableCell>
                  <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                    {getPaymentStatusChip(appointment.payment_status)}
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      <Tooltip title="Détails">
                        <IconButton
                          color="secondary"
                          size="small"
                          onClick={() => handleOpenDetailsDialog(appointment)}
                        >
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Modifier">
                        <IconButton
                          color="primary"
                          size="small"
                          onClick={() => handleEditAppointment(appointment)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Copier">
                        <IconButton
                          color="info"
                          size="small"
                          onClick={() => handleCopyAppointment(appointment)}
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      {/* Bouton pour rendre disponible */}
                      {appointment.client_id && appointment.payment_status !== 'paid' && (
                        <Tooltip title="Rendre disponible">
                          <IconButton 
                            color="success" 
                            size="small"
                            onClick={() => handleMakeAppointmentAvailable(appointment)}
                          >
                            <RestoreIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      
                      <Tooltip title={
                        appointment.payment_status === 'paid' && profile?.user_type !== 'admin'
                          ? "Seul un administrateur peut supprimer un rendez-vous payé"
                          : appointment.client_id !== null
                          ? "Impossible de supprimer un rendez-vous réservé"
                          : "Supprimer"
                      }>
                        <span>
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleDeleteAppointment(appointment.id)}
                            disabled={
                              appointment.client_id !== null || // Empêcher la suppression si réservé
                              (appointment.payment_status === 'paid' && profile?.user_type !== 'admin') // Seul admin peut supprimer un RDV payé
                            }
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
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
                      `${practitioner.profile?.first_name || ''} ${practitioner.profile?.last_name || ''}`.trim();
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
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="service-select-label">Service</InputLabel>
                <Select
                  labelId="service-select-label"
                  value={currentAppointment.service_id || ''}
                  onChange={(e) => setCurrentAppointment({
                    ...currentAppointment,
                    service_id: e.target.value as string
                  })}
                  label="Service"
                  required
                >
                  {services.map((service) => (
                    <MenuItem key={service.id} value={service.id}>
                      {service.name} ({service.duration} min)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Champ de prix personnalisé */}
            {currentAppointment.service_id && (
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

                    // Pour les intervenants, le prix doit être >= au prix du service
                    if (isPractitionerView && selectedService && !isNaN(value) && value < selectedService.price) {
                      setPriceError(`Le prix doit être au minimum ${selectedService.price} €`);
                    }
                    // Pour les admins, autoriser 0€ et plus
                    else if (!isPractitionerView && !isNaN(value) && value < 0) {
                      setPriceError('Le prix ne peut pas être négatif');
                    } else {
                      setPriceError(null);
                    }
                  }}
                  error={!!priceError}
                  helperText={priceError || (() => {
                    const selectedService = services.find(s => s.id === currentAppointment.service_id);
                    if (!selectedService) return '';

                    // Messages différents pour admin vs intervenant
                    if (isPractitionerView) {
                      return `Prix minimum: ${selectedService.price} €`;
                    } else {
                      const currentVal = customPrice !== null ? customPrice : selectedService.price;
                      if (currentVal === 0) {
                        return "Prix à 0€ = Affichage 'Gratuit pour découverte'";
                      }
                      return `Prix du service: ${selectedService.price} € (vous pouvez mettre 0€ pour un créneau gratuit)`;
                    }
                  })()}
                  InputProps={{
                    inputProps: {
                      min: isPractitionerView ? (() => {
                        const selectedService = services.find(s => s.id === currentAppointment.service_id);
                        return selectedService?.price || 0;
                      })() : 0,
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
      {selectedAppointment && (
        <AppointmentDetailsDialog
          open={detailsDialogOpen}
          onClose={handleCloseDetailsDialog}
          appointment={selectedAppointment}
          onAppointmentUpdate={handleAppointmentUpdate}
        />
      )}
    </>
  );
};

export default AdminAppointmentsTable;