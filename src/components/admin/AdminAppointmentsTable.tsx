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

interface AdminAppointmentsTableProps {
  appointments: Appointment[];
  practitioners: Practitioner[];
  services: Service[];
  loading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  onAppointmentChange: () => void;
}

const AdminAppointmentsTable: React.FC<AdminAppointmentsTableProps> = ({
  appointments,
  practitioners,
  services,
  loading,
  error,
  setError,
  onAppointmentChange
}) => {
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

  // Ouvrir le dialogue pour modifier un rendez-vous
  const handleEditAppointment = (appointment: Appointment) => {
    // Convertir les dates string en objets Date pour les pickers
    const startTime = parseISO(appointment.start_time);
    
    setSelectedDate(startTime);
    setSelectedTime(startTime);
    setCurrentAppointment(appointment);
    setDialogMode('edit');
    setShowCopyOptions(false);
    setIsDialogOpen(true);
  };
  
  // Ouvrir le dialogue pour copier un rendez-vous
  const handleCopyAppointment = (appointment: Appointment) => {
    // Créer une copie du rendez-vous sans l'ID et les informations du client
    const appointmentCopy: Partial<Appointment> = {
      practitioner_id: appointment.practitioner_id,
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
  };
  
  // Enregistrer un rendez-vous
  const handleSaveAppointment = async () => {
    if (!selectedDate || !selectedTime || !currentAppointment.practitioner_id || !currentAppointment.service_id) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
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
      const appointmentData = {
        client_id: currentAppointment.client_id || null,
        practitioner_id: currentAppointment.practitioner_id,
        service_id: currentAppointment.service_id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: currentAppointment.status || 'pending',
        payment_status: currentAppointment.payment_status || 'unpaid',
        notes: currentAppointment.notes,
      };
      
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
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Heure</TableCell>
              <TableCell>Durée</TableCell>
              <TableCell>Catégorie</TableCell>
              <TableCell>Service</TableCell>
              <TableCell>Intervenant</TableCell>
              <TableCell>Client</TableCell>
              <TableCell>Statut</TableCell>
              <TableCell>Paiement</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {appointments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  Aucun rendez-vous trouvé
                </TableCell>
              </TableRow>
            ) : (
              appointments.map((appointment) => (
                <TableRow key={appointment.id}>
                  <TableCell>
                    {format(parseISO(appointment.start_time), 'dd/MM/yyyy', { locale: fr })}
                  </TableCell>
                  <TableCell>
                    {format(parseISO(appointment.start_time), 'HH:mm', { locale: fr })}
                  </TableCell>
                  <TableCell>
                    {appointment.service?.duration} min
                  </TableCell>
                  <TableCell>
                    {appointment.service?.category && getStatusChip(appointment.service.category)}
                  </TableCell>
                  <TableCell>{appointment.service?.name}</TableCell>
                  <TableCell>
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
                  <TableCell>
                    {getPaymentStatusChip(appointment.payment_status)}
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
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
                      
                      <Tooltip title="Supprimer">
                        <span>
                          <IconButton 
                            color="error" 
                            size="small"
                            onClick={() => handleDeleteAppointment(appointment.id)}
                            disabled={appointment.client_id !== null} // Empêcher la suppression si réservé
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
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
                >
                  {practitioners.map((practitioner) => (
                    <MenuItem key={practitioner.id} value={practitioner.id}>
                      {practitioner.profile?.first_name} {practitioner.profile?.last_name}
                    </MenuItem>
                  ))}
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
    </>
  );
};

export default AdminAppointmentsTable;