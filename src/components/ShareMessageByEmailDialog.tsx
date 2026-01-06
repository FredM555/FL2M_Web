// Composant de dialogue pour partager un message du jour par email
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
  Alert,
  Box,
  Typography,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EmailIcon from '@mui/icons-material/Email';
import SendIcon from '@mui/icons-material/Send';

interface ShareMessageByEmailDialogProps {
  open: boolean;
  onClose: () => void;
  senderName: string;
  messageData: {
    firstName: string;
    nombre1: number;
    nombre2: number;
    nombre3?: number;
    label1: string;
    label2: string;
    label3?: string;
    message1: string;
    message2: string;
    message3?: string;
  };
  onSend: (recipientEmail: string, comment: string) => Promise<void>;
}

export const ShareMessageByEmailDialog: React.FC<ShareMessageByEmailDialogProps> = ({
  open,
  onClose,
  senderName,
  messageData,
  onSend
}) => {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleClose = () => {
    if (!sending) {
      setRecipientEmail('');
      setComment('');
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  const handleSend = async () => {
    // Validation
    if (!recipientEmail.trim()) {
      setError('Veuillez saisir une adresse email');
      return;
    }

    // Validation format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(recipientEmail)) {
      setError('Adresse email invalide');
      return;
    }

    setError(null);
    setSending(true);

    try {
      await onSend(recipientEmail, comment);
      setSuccess(true);

      // Fermer après 2 secondes
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'envoi de l\'email');
      setSending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(135deg, #1D3461 0%, #345995 100%)',
        color: 'white',
        pb: 2
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EmailIcon />
          <Typography variant="h6" component="span">
            Partager par email
          </Typography>
        </Box>
        <IconButton
          onClick={handleClose}
          disabled={sending}
          sx={{ color: 'white' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ mt: 2 }}>
        {success ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            Email envoyé avec succès ! 🎉
          </Alert>
        ) : (
          <>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                <strong>{senderName}</strong>, partagez le message du jour de <strong>{messageData.firstName}</strong> avec un proche
              </Typography>

              <TextField
                fullWidth
                label="Email du destinataire"
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                disabled={sending}
                required
                placeholder="exemple@email.com"
                sx={{ mb: 2 }}
                autoFocus
              />

              <TextField
                fullWidth
                label="Votre message personnel (optionnel)"
                multiline
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={sending}
                placeholder="Ajoutez un mot pour accompagner ce message..."
                helperText="Ce commentaire sera inclus dans l'email avec votre nom"
              />
            </Box>

            <Box sx={{
              backgroundColor: 'rgba(103, 126, 234, 0.08)',
              borderRadius: 2,
              p: 2,
              borderLeft: '4px solid',
              borderColor: 'primary.main'
            }}>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                Aperçu du contenu partagé :
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>{messageData.label1}:</strong> {messageData.nombre1}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>{messageData.label2}:</strong> {messageData.nombre2}
              </Typography>
              {messageData.nombre3 && (
                <Typography variant="body2">
                  <strong>{messageData.label3}:</strong> {messageData.nombre3}
                </Typography>
              )}
            </Box>
          </>
        )}
      </DialogContent>

      {!success && (
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleClose}
            disabled={sending}
            color="inherit"
          >
            Annuler
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !recipientEmail.trim()}
            variant="contained"
            startIcon={sending ? <CircularProgress size={20} /> : <SendIcon />}
            sx={{
              background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
              color: '#1D3461',
              fontWeight: 'bold',
              '&:hover': {
                background: 'linear-gradient(135deg, #FFC700 0%, #FF9500 100%)',
              },
              '&:disabled': {
                background: '#ccc',
              }
            }}
          >
            {sending ? 'Envoi...' : 'Envoyer'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};
