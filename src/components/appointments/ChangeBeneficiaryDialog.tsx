// src/components/appointments/ChangeBeneficiaryDialog.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  CircularProgress,
  Alert,
  Typography,
  Box,
  Radio
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import { getUserBeneficiaries } from '../../services/beneficiaries';
import type { BeneficiaryWithAccess, AppointmentBeneficiary } from '../../types/beneficiary';
import { NumerologyTriangleAvatar } from '../profile/NumerologyTriangleAvatar';
import { logger } from '../../utils/logger';
import { format, parseISO } from 'date-fns';

interface ChangeBeneficiaryDialogProps {
  open: boolean;
  onClose: () => void;
  currentBeneficiary: AppointmentBeneficiary;
  onConfirm: (newBeneficiaryId: string) => Promise<void>;
  clientId: string;
}

export const ChangeBeneficiaryDialog: React.FC<ChangeBeneficiaryDialogProps> = ({
  open,
  onClose,
  currentBeneficiary,
  onConfirm,
  clientId
}) => {
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryWithAccess[]>([]);
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      loadBeneficiaries();
    }
  }, [open, clientId]);

  const loadBeneficiaries = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: loadError } = await getUserBeneficiaries(clientId);
      if (loadError) throw loadError;

      // Filtrer pour exclure le bénéficiaire actuel
      const filtered = (data || []).filter(b => b.id !== currentBeneficiary.beneficiary_id);
      setBeneficiaries(filtered);
    } catch (err: any) {
      logger.error('Erreur lors du chargement des bénéficiaires:', err);
      setError('Erreur lors du chargement des bénéficiaires');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedBeneficiaryId) return;

    setSubmitting(true);
    try {
      await onConfirm(selectedBeneficiaryId);
      onClose();
    } catch (err: any) {
      logger.error('Erreur lors du changement de bénéficiaire:', err);
      setError(err.message || 'Erreur lors du changement de bénéficiaire');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setSelectedBeneficiaryId(null);
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Changer le bénéficiaire
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Bénéficiaire actuel : {currentBeneficiary.beneficiary?.first_name} {currentBeneficiary.beneficiary?.last_name}
          </Typography>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : beneficiaries.length === 0 ? (
          <Alert severity="info">
            Aucun autre bénéficiaire disponible
          </Alert>
        ) : (
          <List>
            {beneficiaries.map((beneficiary) => {
              const displayName = `${beneficiary.first_name} ${beneficiary.last_name}`;
              const birthDate = beneficiary.birth_date
                ? format(parseISO(beneficiary.birth_date), 'dd/MM/yyyy')
                : null;

              return (
                <ListItem key={beneficiary.id} disablePadding>
                  <ListItemButton
                    onClick={() => setSelectedBeneficiaryId(beneficiary.id)}
                    selected={selectedBeneficiaryId === beneficiary.id}
                    sx={{
                      borderRadius: 1,
                      mb: 1,
                      border: '1px solid',
                      borderColor: selectedBeneficiaryId === beneficiary.id ? 'primary.main' : 'divider',
                    }}
                  >
                    <Radio
                      checked={selectedBeneficiaryId === beneficiary.id}
                      sx={{ mr: 1 }}
                    />
                    <ListItemAvatar>
                      {/* Avatar avec numérologie si disponible */}
                      {(beneficiary.tronc || beneficiary.racine_1 || beneficiary.racine_2) ? (
                        <NumerologyTriangleAvatar
                          tronc={beneficiary.tronc ?? undefined}
                          racine1={beneficiary.racine_1 ?? undefined}
                          racine2={beneficiary.racine_2 ?? undefined}
                          dynamique_de_vie={beneficiary.dynamique_de_vie ?? undefined}
                          size={48}
                        />
                      ) : (
                        <Avatar sx={{ bgcolor: '#345995' }}>
                          <PersonIcon />
                        </Avatar>
                      )}
                    </ListItemAvatar>
                    <ListItemText
                      primary={displayName}
                      secondary={
                        <Box component="span">
                          {birthDate && (
                            <Typography component="span" variant="body2" color="text.secondary">
                              Né(e) le {birthDate}
                            </Typography>
                          )}
                          {beneficiary.email && (
                            <Typography component="span" variant="body2" color="text.secondary" sx={{ display: 'block' }}>
                              {beneficiary.email}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          Annuler
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!selectedBeneficiaryId || submitting}
        >
          {submitting ? <CircularProgress size={24} /> : 'Confirmer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
