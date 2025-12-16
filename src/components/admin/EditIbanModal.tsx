// src/components/admin/EditIbanModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { supabase } from '../../services/supabase';

interface EditIbanModalProps {
  open: boolean;
  onClose: () => void;
  practitionerId: string;
  practitionerName: string;
  currentIban: string | null;
  onSuccess: () => void;
}

const EditIbanModal: React.FC<EditIbanModalProps> = ({
  open,
  onClose,
  practitionerId,
  practitionerName,
  currentIban,
  onSuccess
}) => {
  const [iban, setIban] = useState(currentIban || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      setIban(currentIban || '');
      setError(null);
      setSuccess(false);
    }
  }, [open, currentIban]);

  const formatIban = (value: string) => {
    // Enlever les espaces et mettre en majuscules
    const cleanValue = value.replace(/\s/g, '').toUpperCase();
    // Ajouter des espaces tous les 4 caractères pour faciliter la lecture
    return cleanValue.match(/.{1,4}/g)?.join(' ') || cleanValue;
  };

  const handleIbanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatIban(e.target.value);
    setIban(formatted);
    setError(null);
  };

  const validateIban = (iban: string): boolean => {
    // Validation basique de l'IBAN
    const cleanIban = iban.replace(/\s/g, '');

    // Vérifier qu'il commence par 2 lettres (code pays)
    if (!/^[A-Z]{2}/.test(cleanIban)) {
      setError('L\'IBAN doit commencer par le code pays (ex: FR)');
      return false;
    }

    // Vérifier la longueur (entre 15 et 34 caractères selon les pays)
    if (cleanIban.length < 15 || cleanIban.length > 34) {
      setError('L\'IBAN doit contenir entre 15 et 34 caractères');
      return false;
    }

    // Format général: 2 lettres + 2 chiffres + caractères alphanumériques
    if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(cleanIban)) {
      setError('Format IBAN invalide (ex: FR76 1234 5678 9012 3456 7890 123)');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    const cleanIban = iban.trim();

    // Permettre de vider l'IBAN
    if (cleanIban === '') {
      setLoading(true);
      setError(null);

      try {
        const { error: updateError } = await supabase
          .from('practitioners')
          .update({ iban: null })
          .eq('id', practitionerId);

        if (updateError) throw updateError;

        setSuccess(true);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } catch (err: any) {
        console.error('Erreur lors de la suppression de l\'IBAN:', err);
        setError(err.message || 'Impossible de supprimer l\'IBAN');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Valider l'IBAN si présent
    if (!validateIban(cleanIban)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Mettre à jour l'IBAN dans la base de données
      const cleanIbanValue = cleanIban.replace(/\s/g, '');
      const { error: updateError } = await supabase
        .from('practitioners')
        .update({ iban: cleanIbanValue })
        .eq('id', practitionerId);

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error('Erreur lors de la mise à jour de l\'IBAN:', err);
      setError(err.message || 'Impossible de mettre à jour l\'IBAN');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 }
      }}
    >
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, #345995 0%, #1D3461 100%)',
          color: 'white'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <AccountBalanceIcon sx={{ mr: 1 }} />
          Configurer l'IBAN - {practitionerName}
        </Box>
      </DialogTitle>

      <DialogContent sx={{ mt: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mb: 3 }} icon={<CheckCircleIcon />}>
            IBAN mis à jour avec succès !
          </Alert>
        )}

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            L'IBAN sera utilisé pour effectuer les virements manuels au intervenant.
            <br />
            Format attendu : <strong>FR76 1234 5678 9012 3456 7890 123</strong>
          </Typography>
        </Alert>

        <TextField
          label="IBAN"
          fullWidth
          value={iban}
          onChange={handleIbanChange}
          disabled={loading}
          placeholder="FR76 1234 5678 9012 3456 7890 123"
          helperText="Laissez vide pour supprimer l'IBAN"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <AccountBalanceIcon />
              </InputAdornment>
            )
          }}
          sx={{
            '& .MuiInputBase-input': {
              fontFamily: 'monospace',
              fontSize: '1rem'
            }
          }}
        />

        {currentIban && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(0,0,0,0.03)', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              IBAN actuel :
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: 'monospace', mt: 0.5 }}>
              {formatIban(currentIban)}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} disabled={loading}>
          Annuler
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <CheckCircleIcon />}
          sx={{
            background: 'linear-gradient(45deg, #345995, #1D3461)',
            '&:hover': {
              background: 'linear-gradient(45deg, #1D3461, #345995)'
            }
          }}
        >
          {loading ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditIbanModal;
