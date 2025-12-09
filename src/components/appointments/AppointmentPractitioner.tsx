// src/components/appointments/AppointmentPractitioner.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Alert,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Snackbar,
  Autocomplete,
  Avatar
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import PersonIcon from '@mui/icons-material/Person';
import EditIcon from '@mui/icons-material/Edit';
import CancelIcon from '@mui/icons-material/Cancel';
import BadgeIcon from '@mui/icons-material/Badge';
import PaymentIcon from '@mui/icons-material/Payment';
import { Appointment, Practitioner, getPractitioners, supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

interface AppointmentPractitionerProps {
  appointment: Appointment;
  onUpdate?: (updatedAppointment: Appointment) => void;
}

export const AppointmentPractitioner: React.FC<AppointmentPractitionerProps> = ({
  appointment,
  onUpdate
}) => {
  const { profile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingPractitioners, setLoadingPractitioners] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Liste des intervenants
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [selectedPractitioner, setSelectedPractitioner] = useState<Practitioner | null>(
    appointment.practitioner || null
  );
  const [customPrice, setCustomPrice] = useState<string>('');

  // Déterminer si l'utilisateur peut modifier (admin seulement, et RDV non terminé)
  const canEdit = React.useMemo(() => {
    if (!profile) return false;

    // Ne pas permettre la modification si le RDV est terminé/validé
    if (appointment.status === 'completed' || appointment.status === 'validated') {
      return false;
    }

    return profile.user_type === 'admin';
  }, [profile, appointment]);

  // Charger la liste des intervenants
  useEffect(() => {
    const loadPractitioners = async () => {
      setLoadingPractitioners(true);
      try {
        const { data, error } = await getPractitioners();
        if (error) throw error;
        setPractitioners(data || []);
      } catch (err: any) {
        console.error('Erreur lors du chargement des intervenants:', err);
        setError('Impossible de charger la liste des intervenants');
      } finally {
        setLoadingPractitioners(false);
      }
    };

    if (isEditing) {
      loadPractitioners();
    }
  }, [isEditing]);

  // Initialiser l'intervenant sélectionné
  useEffect(() => {
    setSelectedPractitioner(appointment.practitioner || null);
    setCustomPrice(appointment.custom_price?.toString() || '');
  }, [appointment]);

  const handleSave = async () => {
    setError(null);
    setLoading(true);

    try {
      // Validation
      if (!selectedPractitioner) {
        throw new Error('Veuillez sélectionner un intervenant');
      }

      // Validation du prix si renseigné
      let priceValue: number | null = null;
      if (customPrice.trim()) {
        const parsedPrice = parseFloat(customPrice);
        if (isNaN(parsedPrice) || parsedPrice < 0) {
          throw new Error('Le prix doit être un nombre valide positif');
        }
        // Vérifier que le prix n'est pas inférieur au prix du service
        if (appointment.service && parsedPrice < appointment.service.price) {
          throw new Error(`Le prix doit être au minimum ${appointment.service.price} €`);
        }
        priceValue = parsedPrice;
      }

      console.log('🔵 Changement intervenant:', {
        ancien: appointment.practitioner?.id,
        nouveau: selectedPractitioner.id,
        customPrice: priceValue
      });

      // Mise à jour
      const updateData: any = { practitioner_id: selectedPractitioner.id };
      if (priceValue !== null) {
        updateData.custom_price = priceValue;
      }

      const { error: updateError } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointment.id);

      if (updateError) {
        console.error('❌ Erreur lors de la mise à jour:', updateError);
        throw updateError;
      }

      // Récupérer l'appointment mis à jour avec toutes les relations
      const { data, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          *,
          client:profiles!client_id(id, first_name, last_name, email, phone),
          practitioner:practitioners!practitioner_id(
            id,
            user_id,
            bio,
            priority,
            profile:profiles!user_id(id, first_name, last_name, email, phone, pseudo)
          ),
          service:services(id, code, name, category, subcategory, price, duration, description)
        `)
        .eq('id', appointment.id)
        .single();

      if (fetchError) {
        console.error('❌ Erreur lors de la récupération:', fetchError);
        throw fetchError;
      }

      if (data) {
        console.log('✅ Intervenant changé avec succès:', {
          ancien: appointment.practitioner?.profile?.pseudo,
          nouveau: data.practitioner?.profile?.pseudo
        });
      }

      setSuccess(true);
      setIsEditing(false);

      // Callback pour mettre à jour l'appointment dans le composant parent
      if (onUpdate && data) {
        onUpdate(data);
      }
    } catch (err: any) {
      console.error('❌ Erreur lors de la mise à jour:', err);
      setError(err.message || 'Erreur lors du changement d\'intervenant');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Réinitialiser l'intervenant sélectionné et le prix
    setSelectedPractitioner(appointment.practitioner || null);
    setCustomPrice(appointment.custom_price?.toString() || '');
    setIsEditing(false);
    setError(null);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Intervenant du rendez-vous
        </Typography>
        {canEdit && !isEditing && (
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => setIsEditing(true)}
            size="small"
          >
            Modifier
          </Button>
        )}
        {canEdit && isEditing && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={handleCancel}
              disabled={loading}
              size="small"
            >
              Annuler
            </Button>
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
              onClick={handleSave}
              disabled={loading || !selectedPractitioner}
              size="small"
              sx={{
                background: 'linear-gradient(45deg, #345995, #1D3461)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #1D3461, #345995)',
                },
              }}
            >
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </Box>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{
          p: 3,
          bgcolor: 'grey.50',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2
        }}
      >
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <BadgeIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
              <Typography variant="subtitle2" color="text.secondary">
                Intervenant
              </Typography>
            </Box>
            {isEditing ? (
              <Autocomplete
                value={selectedPractitioner}
                onChange={(event, newValue) => {
                  setSelectedPractitioner(newValue);
                }}
                options={practitioners}
                getOptionLabel={(option) => {
                  const pseudo = option.profile?.pseudo || '';
                  const title = option.title || '';
                  return title ? `${pseudo} - ${title}` : pseudo;
                }}
                loading={loadingPractitioners}
                disabled={loading}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Sélectionner un intervenant"
                    required
                    size="small"
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingPractitioners ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <Box component="li" {...props} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                      {(option.profile?.pseudo || '?')[0].toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {option.profile?.pseudo || '-'}
                        {option.title && ` - ${option.title}`}
                      </Typography>
                    </Box>
                  </Box>
                )}
              />
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
                  {(appointment.practitioner?.profile?.pseudo || '?')[0].toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {appointment.practitioner?.profile?.pseudo || '-'}
                    {appointment.practitioner?.title && ` - ${appointment.practitioner.title}`}
                  </Typography>
                </Box>
              </Box>
            )}
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <PaymentIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
              <Typography variant="subtitle2" color="text.secondary">
                Prix
              </Typography>
            </Box>
            {isEditing && canEdit ? (
              <TextField
                fullWidth
                type="number"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                disabled={loading}
                placeholder={appointment.service?.price?.toString() || '0'}
                size="small"
                helperText={`Laisser vide pour utiliser le prix du service (${appointment.service?.price === 9999 ? 'Sur devis' : `${appointment.service?.price} €`}). Prix minimum: ${appointment.service?.price} €`}
                InputProps={{
                  inputProps: {
                    min: appointment.service?.price || 0,
                    step: 0.01
                  }
                }}
              />
            ) : (
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
                {(() => {
                  const price = appointment.custom_price ?? appointment.service?.price;
                  if (!price) return '-';
                  return price === 9999 ? 'Sur devis' : `${price} €`;
                })()}
                {appointment.custom_price && (
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    (personnalisé)
                  </Typography>
                )}
              </Typography>
            )}
          </Grid>
        </Grid>

      </Paper>



      {/* Snackbar de succès */}
      <Snackbar
        open={success}
        autoHideDuration={3000}
        onClose={() => setSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSuccess(false)}
          severity="success"
          sx={{ width: '100%' }}
        >
          Intervenant modifié avec succès
        </Alert>
      </Snackbar>
    </Box>
  );
};
