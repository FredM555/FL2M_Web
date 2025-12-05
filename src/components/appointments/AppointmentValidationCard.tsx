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
  DialogActions
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import { validateAppointment } from '../../services/stripe';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AppointmentValidationCardProps {
  appointment: {
    id: string;
    start_time: string;
    end_time: string;
    service: {
      name: string;
    };
    practitioner: {
      profile: {
        first_name: string;
        last_name: string;
      };
    };
  };
  onValidated: () => void;
}

export const AppointmentValidationCard: React.FC<AppointmentValidationCardProps> = ({
  appointment,
  onValidated
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [validationType, setValidationType] = useState<'positive' | 'negative' | null>(null);
  const [comment, setComment] = useState('');

  const handleValidation = async (validated: boolean, commentText?: string) => {
    setLoading(true);
    setError(null);

    try {
      await validateAppointment(appointment.id, validated, commentText);
      onValidated();
    } catch (err: any) {
      console.error('Erreur validation:', err);
      setError(err.message || 'Erreur lors de la validation');
    } finally {
      setLoading(false);
    }
  };

  const handlePositiveClick = () => {
    setValidationType('positive');
    setShowCommentDialog(true);
  };

  const handleNegativeClick = () => {
    setValidationType('negative');
    setShowCommentDialog(true);
  };

  const handleDialogConfirm = () => {
    const validated = validationType === 'positive';
    setShowCommentDialog(false);
    handleValidation(validated, comment.trim() || undefined);
  };

  const appointmentDate = format(parseISO(appointment.start_time), 'PPP', { locale: fr });
  const practitionerName = `${appointment.practitioner.profile.first_name} ${appointment.practitioner.profile.last_name}`;

  return (
    <>
      <Card sx={{ mb: 3, border: '2px solid', borderColor: 'warning.main' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <CheckCircleIcon sx={{ color: 'warning.main', mr: 1, fontSize: 30 }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Validation en attente
            </Typography>
          </Box>

          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Action requise :</strong> Validez que votre séance s'est bien déroulée pour que l'intervenant soit payé immédiatement.
              Sinon, le paiement sera automatiquement effectué 48h après le rendez-vous.
            </Typography>
          </Alert>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Service :</strong> {appointment.service.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Intervenant :</strong> {practitionerName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <strong>Date :</strong> {appointmentDate}
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircleIcon />}
              onClick={handlePositiveClick}
              disabled={loading}
              fullWidth
            >
              Tout s'est bien passé
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<ReportProblemIcon />}
              onClick={handleNegativeClick}
              disabled={loading}
              fullWidth
            >
              Signaler un problème
            </Button>
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
          {validationType === 'positive'
            ? 'Confirmer la validation'
            : 'Signaler un problème'}
        </DialogTitle>
        <DialogContent>
          {validationType === 'positive' ? (
            <Typography variant="body2" sx={{ mb: 2 }}>
              En validant, vous confirmez que la séance s'est bien déroulée. L'intervenant sera payé immédiatement.
            </Typography>
          ) : (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                Un problème sera signalé à l'équipe FLM Services. Le paiement à l'intervenant sera suspendu en attendant la résolution.
              </Typography>
            </Alert>
          )}

          <TextField
            label={validationType === 'positive' ? 'Commentaire (optionnel)' : 'Décrivez le problème'}
            multiline
            rows={4}
            fullWidth
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={
              validationType === 'positive'
                ? 'Partagez votre expérience...'
                : 'Expliquez ce qui s\'est passé...'
            }
            required={validationType === 'negative'}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCommentDialog(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleDialogConfirm}
            variant="contained"
            color={validationType === 'positive' ? 'success' : 'error'}
            disabled={validationType === 'negative' && !comment.trim()}
          >
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
