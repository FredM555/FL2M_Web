// src/components/appointments/AppointmentValidationCard.tsx
import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
import { validateAppointment } from '../../services/stripe';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Appointment } from '../../services/supabase';

interface AppointmentValidationCardProps {
  appointment: Appointment;
  onValidated: () => void;
  onViewDetails?: () => void;
}

export const AppointmentValidationCard: React.FC<AppointmentValidationCardProps> = ({
  appointment,
  onValidated,
  onViewDetails
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [comment, setComment] = useState('');

  const handleValidation = async (commentText?: string) => {
    setLoading(true);
    setError(null);

    try {
      await validateAppointment(appointment.id, true, commentText);
      onValidated();
    } catch (err: any) {
      console.error('Erreur validation:', err);
      setError(err.message || 'Erreur lors de la validation');
    } finally {
      setLoading(false);
    }
  };

  const handleValidateClick = () => {
    setShowCommentDialog(true);
  };

  const handleDialogConfirm = () => {
    setShowCommentDialog(false);
    handleValidation(comment.trim() || undefined);
  };

  const appointmentDate = format(parseISO(appointment.start_time), 'PPP', { locale: fr });
  const appointmentHeure = format(parseISO(appointment.start_time), 'HH:mm', { locale: fr });
  const practitionerName = `${appointment.practitioner?.profile?.first_name} ${appointment.practitioner?.profile?.last_name}`;
  const isIssueReported = appointment.status === 'issue_reported';

  return (
    <>
      <Card sx={{ mb: 3, border: '2px solid', borderColor: isIssueReported ? 'error.main' : 'warning.main' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CheckCircleIcon sx={{ color: isIssueReported ? 'error.main' : 'warning.main', mr: 1, fontSize: 30 }} />
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Validation en attente
              </Typography>
            </Box>
            {isIssueReported && (
              <Alert
                severity="warning"
                sx={{
                  py: 0.5,
                  px: 2,
                  '& .MuiAlert-message': { fontSize: '0.875rem', fontWeight: 600 }
                }}
              >
                Contestation en cours de traitement
              </Alert>
            )}
          </Box>

          {isIssueReported && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Vous avez signalé un problème sur ce rendez-vous. Vous pouvez le valider maintenant si le problème est résolu, ou attendre le traitement par notre équipe.
              </Typography>
            </Alert>
          )}

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Service :</strong> {appointment.service?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Intervenant :</strong> {practitionerName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Date :</strong> {appointmentDate} à {appointmentHeure}
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <Tooltip title="Validez pour finaliser le paiement de l'intervenant" arrow>
              <Box sx={{ flex: 1 }}>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  onClick={handleValidateClick}
                  disabled={loading}
                  fullWidth
                >
                  Valider la séance
                </Button>
              </Box>
            </Tooltip>
            {onViewDetails && (
              <Button
                variant="outlined"
                startIcon={<InfoIcon />}
                onClick={onViewDetails}
                disabled={loading}
                sx={{
                  flex: { xs: 1, sm: 'auto' },
                  minWidth: { sm: '140px' }
                }}
              >
                Voir les détails
              </Button>
            )}
          </Box>

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <CircularProgress size={24} />
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCommentDialog} onClose={() => setShowCommentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Confirmer la validation
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            En validant, vous confirmez que la séance s'est bien déroulée. L'intervenant sera payé immédiatement.
          </Typography>

          <TextField
            label="Commentaire (optionnel)"
            multiline
            rows={4}
            fullWidth
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Partagez votre expérience..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCommentDialog(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleDialogConfirm}
            variant="contained"
            color="success"
          >
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
