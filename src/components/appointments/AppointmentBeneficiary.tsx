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
  Snackbar,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  FormControl,
  Chip
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import PersonIcon from '@mui/icons-material/Person';
import CakeIcon from '@mui/icons-material/Cake';
import EditIcon from '@mui/icons-material/Edit';
import CancelIcon from '@mui/icons-material/Cancel';
import EmailIcon from '@mui/icons-material/Email';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import { Appointment, updateAppointmentBeneficiary } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';
import { BeneficiaryRelationship, getRelationshipLabel } from '../../types/beneficiary';

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
  const [email, setEmail] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [relationship, setRelationship] = useState<BeneficiaryRelationship>('other');

  // Déterminer si l'utilisateur peut modifier
  const canEdit = React.useMemo(() => {
    if (!profile) return false;

    // Admin peut toujours modifier
    if (profile.user_type === 'admin') return true;

    // Intervenant peut modifier sur ses propres RDV
    if (profile.user_type === 'intervenant') {
      return appointment.practitioner?.user_id === profile.id;
    }

    // Client peut modifier ses propres RDV
    if (profile.user_type === 'client') {
      return appointment.client_id === profile.id;
    }

    return false;
  }, [profile, appointment]);

  // Initialiser les champs avec les valeurs du rendez-vous
  useEffect(() => {
    setFirstName(appointment.beneficiary_first_name || '');
    setLastName(appointment.beneficiary_last_name || '');
    setBirthDate(appointment.beneficiary_birth_date || '');
    setEmail(appointment.beneficiary_email || '');
    setNotificationsEnabled(appointment.beneficiary_notifications_enabled || false);
    setRelationship((appointment.beneficiary_relationship as BeneficiaryRelationship) || 'other');
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

      // Validation de l'email si renseigné
      if (email.trim()) {
        const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
        if (!emailRegex.test(email.trim())) {
          throw new Error('L\'adresse email n\'est pas valide');
        }
      }

      // Si notifications activées, l'email est obligatoire
      if (notificationsEnabled && !email.trim()) {
        throw new Error('L\'email est requis pour recevoir des notifications');
      }

      const beneficiaryData = {
        beneficiary_first_name: firstName.trim(),
        beneficiary_last_name: lastName.trim(),
        beneficiary_birth_date: birthDate,
        beneficiary_email: email.trim() || null,
        beneficiary_notifications_enabled: notificationsEnabled,
        beneficiary_relationship: relationship
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
    } catch (err) {
      console.error('❌ Erreur lors de la mise à jour:', err);
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour des informations');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Réinitialiser les champs
    setFirstName(appointment.beneficiary_first_name || '');
    setLastName(appointment.beneficiary_last_name || '');
    setBirthDate(appointment.beneficiary_birth_date || '');
    setEmail(appointment.beneficiary_email || '');
    setNotificationsEnabled(appointment.beneficiary_notifications_enabled || false);
    setRelationship((appointment.beneficiary_relationship as BeneficiaryRelationship) || 'other');
    setIsEditing(false);
    setError(null);
  };

  // Fonction pour réinitialiser avec les données du client connecté
  const handleResetToClientData = () => {
    if (profile && appointment.client_id === profile.id) {
      setFirstName(profile.first_name || '');
      setLastName(profile.last_name || '');
      setBirthDate(profile.birth_date || '');
      setEmail(profile.email || '');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Informations du bénéficiaire
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {isEditing && profile && appointment.client_id === profile.id && (
            <Button
              variant="text"
              size="small"
              onClick={handleResetToClientData}
              sx={{ textTransform: 'none' }}
            >
              Utiliser mes informations
            </Button>
          )}
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
            <>
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
                disabled={loading || !firstName.trim() || !lastName.trim() || !birthDate}
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
            </>
          )}
        </Box>
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

          <Grid item xs={12}>
            <Grid container spacing={3}>
              {/* Date de naissance */}
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

              {/* Type de relation */}
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <FamilyRestroomIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                  <Typography variant="subtitle2" color="text.secondary">
                    Type de relation
                  </Typography>
                </Box>
                {isEditing ? (
                  <FormControl fullWidth size="small">
                    <Select
                      value={relationship}
                      onChange={(e) => setRelationship(e.target.value as BeneficiaryRelationship)}
                      disabled={loading}
                    >
                      <MenuItem value="self">1 - Moi-même</MenuItem>
                      <MenuItem value="spouse">2 - Conjoint(e)</MenuItem>
                      <MenuItem value="child">3 - Enfant</MenuItem>
                      <MenuItem value="parent">4 - Parent</MenuItem>
                      <MenuItem value="sibling">5 - Frère/Sœur</MenuItem>
                      <MenuItem value="grandparent">6 - Grand-parent</MenuItem>
                      <MenuItem value="grandchild">7 - Petit-enfant</MenuItem>
                      <MenuItem value="other">8 - Autre</MenuItem>
                    </Select>
                  </FormControl>
                ) : (
                  <Chip
                    label={getRelationshipLabel(relationship)}
                    color="secondary"
                    size="small"
                  />
                )}
              </Grid>
            </Grid>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <EmailIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
              <Typography variant="subtitle2" color="text.secondary">
                Email (optionnel)
              </Typography>
            </Box>
            {isEditing ? (
              <TextField
                fullWidth
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                placeholder="exemple@email.com"
                size="small"
                helperText="Pour recevoir les confirmations et rappels"
              />
            ) : (
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                {email || '-'}
              </Typography>
            )}
          </Grid>

          {isEditing && email.trim() && (
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={notificationsEnabled}
                    onChange={(e) => setNotificationsEnabled(e.target.checked)}
                    disabled={loading}
                    color="primary"
                  />
                }
                label={
                  <Typography variant="body2">
                    J'accepte de recevoir des notifications par email concernant ce rendez-vous
                    (confirmations, rappels, documents) - <strong>Consentement RGPD</strong>
                  </Typography>
                }
              />
            </Grid>
          )}
        </Grid>

        {!canEdit && (
          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="body2">
              <strong>Note :</strong> Seuls les administrateurs et l'intervenant du rendez-vous peuvent modifier ces informations.
            </Typography>
          </Alert>
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
