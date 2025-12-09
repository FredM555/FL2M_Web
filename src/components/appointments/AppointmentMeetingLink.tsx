// src/components/appointments/AppointmentMeetingLink.tsx
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
  Link,
  IconButton,
  Tooltip
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import CancelIcon from '@mui/icons-material/Cancel';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Appointment, supabase } from '../../services/supabase';
import { useAuth } from '../../context/AuthContext';

interface AppointmentMeetingLinkProps {
  appointment: Appointment;
  onUpdate?: (updatedAppointment: Appointment) => void;
}

export const AppointmentMeetingLink: React.FC<AppointmentMeetingLinkProps> = ({
  appointment,
  onUpdate
}) => {
  const { profile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Champ du formulaire
  const [meetingLink, setMeetingLink] = useState('');

  // Déterminer si l'utilisateur peut modifier (admin ou intervenant, et RDV non terminé)
  const canEdit = React.useMemo(() => {
    if (!profile) return false;

    // Ne pas permettre la modification si le RDV est terminé/validé
    if (appointment.status === 'completed' || appointment.status === 'validated') {
      return false;
    }

    // Admin peut toujours modifier (sauf RDV terminés)
    if (profile.user_type === 'admin') return true;

    // Intervenant peut modifier sur ses propres RDV
    if (profile.user_type === 'intervenant') {
      return appointment.practitioner?.user_id === profile.id;
    }

    return false;
  }, [profile, appointment]);

  // Initialiser le champ avec la valeur du rendez-vous
  useEffect(() => {
    setMeetingLink(appointment.meeting_link || '');
  }, [appointment]);

  // Validation de l'URL
  const isValidUrl = (url: string): boolean => {
    if (!url.trim()) return true; // Empty is valid (can clear the link)

    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSave = async () => {
    setError(null);
    setLoading(true);

    try {
      const trimmedLink = meetingLink.trim();

      // Validation de l'URL
      if (trimmedLink && !isValidUrl(trimmedLink)) {
        throw new Error('Le lien doit être une URL valide (commençant par http:// ou https://)');
      }

      console.log('🔵 Mise à jour du lien de visio:', {
        ancien: appointment.meeting_link,
        nouveau: trimmedLink || null
      });

      // Mise à jour
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ meeting_link: trimmedLink || null })
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
        console.log('✅ Lien de visio mis à jour avec succès:', {
          nouveau: data.meeting_link
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
      setError(err.message || 'Erreur lors de la mise à jour du lien de visio');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Réinitialiser le champ
    setMeetingLink(appointment.meeting_link || '');
    setIsEditing(false);
    setError(null);
  };

  const handleCopyLink = async () => {
    if (appointment.meeting_link) {
      try {
        await navigator.clipboard.writeText(appointment.meeting_link);
        setCopySuccess(true);
      } catch (err) {
        console.error('Erreur lors de la copie:', err);
      }
    }
  };

  const handleOpenLink = () => {
    if (appointment.meeting_link) {
      window.open(appointment.meeting_link, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Lien de visioconférence
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
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <VideoCallIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
              <Typography variant="subtitle2" color="text.secondary">
                Lien de la séance en visio
              </Typography>
            </Box>
            {isEditing ? (
              <TextField
                fullWidth
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                disabled={loading}
                placeholder="https://zoom.us/j/... ou https://meet.google.com/..."
                size="small"
                helperText="Collez ici le lien de visioconférence (Zoom, Google Meet, Teams, etc.)"
                error={meetingLink.trim() !== '' && !isValidUrl(meetingLink)}
              />
            ) : (
              <>
                {appointment.meeting_link ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Link
                      href={appointment.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        wordBreak: 'break-all',
                        fontWeight: 500,
                        fontSize: '0.95rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5
                      }}
                    >
                      {appointment.meeting_link}
                      <OpenInNewIcon sx={{ fontSize: 16 }} />
                    </Link>
                    <Tooltip title="Copier le lien">
                      <IconButton
                        size="small"
                        onClick={handleCopyLink}
                        sx={{ ml: 1 }}
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    Aucun lien de visioconférence défini
                  </Typography>
                )}
              </>
            )}
          </Grid>
        </Grid>


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
              disabled={loading || (meetingLink.trim() !== '' && !isValidUrl(meetingLink))}
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

      {appointment.meeting_link && (
        <Alert severity="success" sx={{ mt: 3 }}>
          <Typography variant="body2" gutterBottom>
            <strong>Rejoindre la séance :</strong>
          </Typography>
          <Typography variant="body2" gutterBottom>
            Cliquez sur le lien ci-dessus pour rejoindre la visioconférence au moment de la séance.
          </Typography>
          <Button
            variant="contained"
            startIcon={<VideoCallIcon />}
            onClick={handleOpenLink}
            size="small"
            sx={{
              mt: 1,
              background: 'linear-gradient(45deg, #4CAF50, #45a049)',
              '&:hover': {
                background: 'linear-gradient(45deg, #45a049, #4CAF50)',
              },
            }}
          >
            Rejoindre la séance
          </Button>
        </Alert>
      )}

      {!appointment.meeting_link && canEdit && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          <Typography variant="body2">
            <strong>Aucun lien de visio défini.</strong> Ajoutez un lien de visioconférence pour que le client puisse rejoindre la séance en ligne.
          </Typography>
        </Alert>
      )}

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
          Lien de visio mis à jour avec succès
        </Alert>
      </Snackbar>

      {/* Snackbar de copie */}
      <Snackbar
        open={copySuccess}
        autoHideDuration={2000}
        onClose={() => setCopySuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setCopySuccess(false)}
          severity="info"
          sx={{ width: '100%' }}
        >
          Lien copié dans le presse-papiers
        </Alert>
      </Snackbar>
    </Box>
  );
};
