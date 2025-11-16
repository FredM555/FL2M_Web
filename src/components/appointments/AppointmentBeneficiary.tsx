// src/components/appointments/AppointmentBeneficiary.tsx
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
  Snackbar
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import PersonIcon from '@mui/icons-material/Person';
import CakeIcon from '@mui/icons-material/Cake';
import EditIcon from '@mui/icons-material/Edit';
import CancelIcon from '@mui/icons-material/Cancel';
import PaymentIcon from '@mui/icons-material/Payment';
import { Appointment, updateAppointmentBeneficiary } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

interface AppointmentBeneficiaryProps {
  appointment: Appointment;
  onUpdate?: (updatedAppointment: Appointment) => void;
}

export const AppointmentBeneficiary: React.FC<AppointmentBeneficiaryProps> = ({
  appointment,
  onUpdate
}) => {
  const { profile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Champs du formulaire
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [customPrice, setCustomPrice] = useState<string>('');

  // Déterminer si l'utilisateur peut modifier
  const canEdit = React.useMemo(() => {
    if (!profile) return false;

    // Admin peut toujours modifier
    if (profile.user_type === 'admin') return true;

    // Intervenant peut modifier sur ses propres RDV
    if (profile.user_type === 'intervenant') {
      return appointment.practitioner?.user_id === profile.id;
    }

    return false;
  }, [profile, appointment]);

  // Initialiser les champs avec les valeurs du rendez-vous
  useEffect(() => {
    setFirstName(appointment.beneficiary_first_name || '');
    setLastName(appointment.beneficiary_last_name || '');
    setBirthDate(appointment.beneficiary_birth_date || '');
    setCustomPrice(appointment.custom_price?.toString() || '');
  }, [appointment]);

  const handleSave = async () => {
    setError(null);
    setLoading(true);

    try {
      // Validation
      if (!firstName.trim()) {
        throw new Error('Le prénom est requis');
      }
      if (!lastName.trim()) {
        throw new Error('Le nom est requis');
      }
      if (!birthDate) {
        throw new Error('La date de naissance est requise');
      }

      // Validation du prix si renseigné
      let priceValue: number | null = null;
      if (customPrice.trim()) {
        const parsedPrice = parseFloat(customPrice);
        if (isNaN(parsedPrice) || parsedPrice < 0) {
          throw new Error('Le prix doit être un nombre valide positif');
        }
        priceValue = parsedPrice;
      }

      const beneficiaryData = {
        beneficiary_first_name: firstName.trim(),
        beneficiary_last_name: lastName.trim(),
        beneficiary_birth_date: birthDate,
        custom_price: priceValue
      };

      console.log('🔵 Données à enregistrer:', beneficiaryData);
      console.log('🔵 Appointment ID:', appointment.id);

      // Mise à jour
      const { data, error: updateError } = await updateAppointmentBeneficiary(
        appointment.id,
        beneficiaryData
      );

      console.log('🔵 Réponse de la mise à jour:', { data, error: updateError });

      if (updateError) {
        console.error('❌ Erreur lors de la mise à jour:', updateError);
        throw updateError;
      }

      if (data) {
        console.log('✅ Données mises à jour avec succès:', {
          beneficiary_first_name: data.beneficiary_first_name,
          beneficiary_last_name: data.beneficiary_last_name,
          beneficiary_birth_date: data.beneficiary_birth_date
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
      setError(err.message || 'Erreur lors de la mise à jour des informations');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Réinitialiser les champs
    setFirstName(appointment.beneficiary_first_name || '');
    setLastName(appointment.beneficiary_last_name || '');
    setBirthDate(appointment.beneficiary_birth_date || '');
    setCustomPrice(appointment.custom_price?.toString() || '');
    setIsEditing(false);
    setError(null);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Informations du bénéficiaire
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
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <PersonIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
              <Typography variant="subtitle2" color="text.secondary">
                Prénom(s)
              </Typography>
            </Box>
            {isEditing ? (
              <TextField
                fullWidth
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={loading}
                placeholder="Tous les prénoms"
                required
                size="small"
                helperText="Tous les prénoms de naissance"
              />
            ) : (
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {firstName || '-'}
              </Typography>
            )}
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <PersonIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
              <Typography variant="subtitle2" color="text.secondary">
                Nom de famille
              </Typography>
            </Box>
            {isEditing ? (
              <TextField
                fullWidth
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={loading}
                placeholder="Nom de famille complet"
                required
                size="small"
                helperText="Nom de famille complet de naissance"
              />
            ) : (
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {lastName || '-'}
              </Typography>
            )}
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <CakeIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
              <Typography variant="subtitle2" color="text.secondary">
                Date de naissance
              </Typography>
            </Box>
            {isEditing ? (
              <TextField
                fullWidth
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                disabled={loading}
                required
                size="small"
                InputLabelProps={{
                  shrink: true,
                }}
              />
            ) : (
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {birthDate ? new Date(birthDate).toLocaleDateString('fr-FR') : '-'}
              </Typography>
            )}
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <PaymentIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
              <Typography variant="subtitle2" color="text.secondary">
                Prix personnalisé (optionnel)
              </Typography>
            </Box>
            {isEditing ? (
              <TextField
                fullWidth
                type="number"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                disabled={loading}
                placeholder={appointment.service?.price?.toString() || '0'}
                size="small"
                helperText={`Laisser vide pour utiliser le prix du service (${appointment.service?.price === 9999 ? 'Sur devis' : `${appointment.service?.price} €`})`}
                InputProps={{
                  inputProps: { min: 0, step: 0.01 }
                }}
              />
            ) : (
              <Typography variant="body1" sx={{ fontWeight: 500, color: customPrice ? 'primary.main' : 'inherit' }}>
                {customPrice
                  ? `${customPrice} € (personnalisé)`
                  : `${appointment.service?.price === 9999 ? 'Sur devis' : `${appointment.service?.price} €`} (prix du service)`}
              </Typography>
            )}
          </Grid>
        </Grid>

        {!canEdit && (
          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="body2">
              <strong>Note :</strong> Seuls les administrateurs et l'intervenant du rendez-vous peuvent modifier ces informations.
            </Typography>
          </Alert>
        )}

        {isEditing && (
          <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<CancelIcon />}
              onClick={handleCancel}
              disabled={loading}
            >
              Annuler
            </Button>
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
              onClick={handleSave}
              disabled={loading || !firstName.trim() || !lastName.trim() || !birthDate}
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
      </Paper>

      <Alert severity="warning" sx={{ mt: 3 }}>
        <Typography variant="body2" gutterBottom>
          <strong>Information importante :</strong>
        </Typography>
        <Typography variant="body2">
          Ces informations sont <strong>indispensables pour la préparation de la séance</strong>.
          Pour les personnes mariées, divorcées ou adoptées, utilisez toujours les informations de naissance.
        </Typography>
      </Alert>

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
          Informations mises à jour avec succès
        </Alert>
      </Snackbar>
    </Box>
  );
};
