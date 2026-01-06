// src/components/beneficiaries/BeneficiaryInvitationDialog.tsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  TextField,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Email as EmailIcon,
  Send as SendIcon,
  Close as CloseIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { Beneficiary } from '../../types/beneficiary';
import {
  createBeneficiaryInvitation,
  sendBeneficiaryInvitationEmail,
} from '../../services/beneficiaryInvitation';
import { logger } from '../../utils/logger';

interface BeneficiaryInvitationDialogProps {
  open: boolean;
  onClose: () => void;
  beneficiary: Beneficiary;
  inviterName: string;
  inviterUserId: string;
}

export const BeneficiaryInvitationDialog: React.FC<BeneficiaryInvitationDialogProps> = ({
  open,
  onClose,
  beneficiary,
  inviterName,
  inviterUserId,
}) => {
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customEmail, setCustomEmail] = useState('');

  // Email du bénéficiaire ou email personnalisé
  const targetEmail = customEmail || beneficiary.email || '';

  const handleSendInvitation = async () => {
    if (!targetEmail) {
      setError('Aucun email renseigné pour ce bénéficiaire');
      return;
    }

    setSending(true);
    setError(null);

    try {
      // 1. Créer l'invitation en base
      const { data: invitation, error: invitationError } = await createBeneficiaryInvitation(
        beneficiary.id,
        targetEmail,
        inviterUserId
      );

      if (invitationError) throw invitationError;

      // 2. Envoyer l'email
      const beneficiaryFullName = `${beneficiary.first_name} ${beneficiary.last_name}`;
      const { success: emailSuccess, error: emailError } = await sendBeneficiaryInvitationEmail(
        beneficiary.id,
        beneficiaryFullName,
        targetEmail,
        inviterName,
        invitation.invitation_token
      );

      if (emailError) throw emailError;

      if (emailSuccess) {
        setSuccess(true);
        logger.info('Invitation envoyée avec succès');
      }
    } catch (err: any) {
      logger.error('Erreur envoi invitation:', err);
      setError(err.message || 'Erreur lors de l\'envoi de l\'invitation');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setSuccess(false);
    setError(null);
    setCustomEmail('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmailIcon color="primary" />
          <Typography variant="h6">
            Inviter {beneficiary.first_name} à rejoindre FL2M
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {success ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CheckIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Invitation envoyée !
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Un email d'invitation a été envoyé à <strong>{targetEmail}</strong>
            </Typography>
          </Box>
        ) : (
          <>
            <Typography variant="body1" gutterBottom>
              Invitez {beneficiary.first_name} à créer son compte FL2M pour accéder à son profil.
            </Typography>

            <Typography variant="h6" sx={{ mt: 3, mb: 2, fontSize: '1rem', fontWeight: 600 }}>
              Que recevra {beneficiary.first_name} ?
            </Typography>

            <List dense>
              <ListItem>
                <ListItemIcon>
                  <CheckIcon fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Un email d'invitation personnalisé"
                  secondary="Avec un lien pour créer son compte"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckIcon fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Accès à son profil complet"
                  secondary="Profil numérologique, documents, message du jour"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckIcon fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary="Transfert automatique de propriété"
                  secondary="Il/elle deviendra propriétaire de son profil"
                />
              </ListItem>
            </List>

            {!beneficiary.email && (
              <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  Aucun email n'est enregistré pour ce bénéficiaire.
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  label="Email du bénéficiaire"
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="exemple@email.com"
                  sx={{ mt: 1 }}
                />
              </Alert>
            )}

            {beneficiary.email && (
              <Alert severity="success" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  L'invitation sera envoyée à : <strong>{beneficiary.email}</strong>
                </Typography>
              </Alert>
            )}

            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Important :</strong> Après la création de son compte, vous conserverez un accès
                en lecture seule au profil.
              </Typography>
            </Alert>

            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions>
        {success ? (
          <Button onClick={handleClose} variant="contained">
            Fermer
          </Button>
        ) : (
          <>
            <Button onClick={handleClose} disabled={sending} startIcon={<CloseIcon />}>
              Annuler
            </Button>
            <Button
              onClick={handleSendInvitation}
              disabled={sending || !targetEmail}
              variant="contained"
              startIcon={sending ? <CircularProgress size={20} /> : <SendIcon />}
              sx={{
                background: 'linear-gradient(45deg, #345995, #1D3461)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #1D3461, #345995)',
                },
              }}
            >
              {sending ? 'Envoi en cours...' : 'Envoyer l\'invitation'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};
