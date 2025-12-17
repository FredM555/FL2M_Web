// src/components/beneficiaries/BeneficiaryAccessManager.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Share as ShareIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
} from '@mui/icons-material';
import {
  Beneficiary,
  BeneficiaryRelationship,
  BeneficiaryAccessLevel,
} from '../../types/beneficiary';
import {
  getBeneficiaryAccess,
  shareBeneficiaryAccess,
  revokeBeneficiaryAccess,
} from '../../services/beneficiaries';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { logger } from '../../utils/logger';

interface BeneficiaryAccessManagerProps {
  beneficiary: Beneficiary;
  onAccessChanged?: () => void;
}

interface ShareFormData {
  userEmail: string;
  relationship: BeneficiaryRelationship;
  accessLevel: BeneficiaryAccessLevel;
  canBook: boolean;
  canView: boolean;
  canEdit: boolean;
  canShare: boolean;
  expiresAt: string;
  notes: string;
}

/**
 * Composant de gestion des accès partagés à un bénéficiaire
 */
export const BeneficiaryAccessManager: React.FC<BeneficiaryAccessManagerProps> = ({
  beneficiary,
  onAccessChanged,
}) => {
  const [sharedAccess, setSharedAccess] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState<ShareFormData>({
    userEmail: '',
    relationship: 'other',
    accessLevel: 'view',
    canBook: false,
    canView: true,
    canEdit: false,
    canShare: false,
    expiresAt: '',
    notes: '',
  });

  useEffect(() => {
    if (beneficiary?.id) {
      loadSharedAccess();
    }
  }, [beneficiary?.id]);

  const loadSharedAccess = async () => {
    if (!beneficiary?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const { data } = await getBeneficiaryAccess(beneficiary.id);
      setSharedAccess(data || []);
    } catch (err: any) {
      logger.error('Erreur lors du chargement des accès partagés:', err);
      setError(err.message || 'Erreur lors du chargement des accès partagés');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      setSubmitting(true);
      setError(null);

      await shareBeneficiaryAccess({
        beneficiary_id: beneficiary.id,
        user_email: formData.userEmail,
        relationship: formData.relationship,
        access_level: formData.accessLevel,
        can_book: formData.canBook,
        can_view: formData.canView,
        can_edit: formData.canEdit,
        can_share: formData.canShare,
        expires_at: formData.expiresAt || undefined,
        notes: formData.notes || undefined,
      });

      // Réinitialiser le formulaire
      setFormData({
        userEmail: '',
        relationship: 'other',
        accessLevel: 'view',
        canBook: false,
        canView: true,
        canEdit: false,
        canShare: false,
        expiresAt: '',
        notes: '',
      });

      setOpenDialog(false);
      await loadSharedAccess();

      if (onAccessChanged) {
        onAccessChanged();
      }
    } catch (err: any) {
      logger.error('Erreur lors du partage:', err);
      setError(err.message || 'Erreur lors du partage');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (accessId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir révoquer cet accès ?')) {
      return;
    }

    try {
      setError(null);
      await revokeBeneficiaryAccess(accessId);
      await loadSharedAccess();

      if (onAccessChanged) {
        onAccessChanged();
      }
    } catch (err: any) {
      logger.error('Erreur lors de la révocation:', err);
      setError(err.message || 'Erreur lors de la révocation');
    }
  };

  // Mettre à jour les permissions basées sur le niveau d'accès
  const handleAccessLevelChange = (level: BeneficiaryAccessLevel) => {
    const permissions = {
      view: { canView: true, canBook: false, canEdit: false, canShare: false },
      book: { canView: true, canBook: true, canEdit: false, canShare: false },
      edit: { canView: true, canBook: true, canEdit: true, canShare: false },
      admin: { canView: true, canBook: true, canEdit: true, canShare: true },
    };

    setFormData({
      ...formData,
      accessLevel: level,
      ...permissions[level],
    });
  };

  const getAccessLevelLabel = (level: string) => {
    const labels: Record<string, string> = {
      view: 'Lecture seule',
      book: 'Réserver',
      edit: 'Modifier',
      admin: 'Administrateur',
    };
    return labels[level] || level;
  };

  const getRelationshipLabel = (relationship: string) => {
    const labels: Record<string, string> = {
      child: 'Enfant',
      spouse: 'Conjoint(e)',
      partner: 'Partenaire',
      parent: 'Parent',
      sibling: 'Frère/Sœur',
      other: 'Autre',
    };
    return labels[relationship] || relationship;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* En-tête */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Gestion des accès partagés
        </Typography>
        <Button
          variant="contained"
          startIcon={<PersonAddIcon />}
          onClick={() => setOpenDialog(true)}
          sx={{
            background: 'linear-gradient(45deg, #345995, #1D3461)',
            '&:hover': {
              background: 'linear-gradient(45deg, #1D3461, #345995)',
            },
          }}
        >
          Partager l'accès
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Table des accès partagés */}
      {sharedAccess.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <ShareIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="body1" color="text.secondary" gutterBottom>
            Aucun accès partagé
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Vous pouvez partager l'accès à ce bénéficiaire avec d'autres utilisateurs
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Utilisateur</TableCell>
                <TableCell>Relation</TableCell>
                <TableCell>Niveau d'accès</TableCell>
                <TableCell>Accordé le</TableCell>
                <TableCell>Expire le</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sharedAccess.map((access) => (
                <TableRow key={access.id}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {access.user?.first_name} {access.user?.last_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {access.user?.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getRelationshipLabel(access.relationship)}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getAccessLevelLabel(access.access_level)}
                      size="small"
                      color={access.access_level === 'admin' ? 'error' : 'primary'}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {format(new Date(access.granted_at), 'dd/MM/yyyy', { locale: fr })}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {access.expires_at ? (
                      <Typography variant="body2">
                        {format(new Date(access.expires_at), 'dd/MM/yyyy', { locale: fr })}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Permanent
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleRevoke(access.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog de partage */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Partager l'accès à {beneficiary.first_name}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Email de l'utilisateur *"
              type="email"
              value={formData.userEmail}
              onChange={(e) => setFormData({ ...formData, userEmail: e.target.value })}
              helperText="L'utilisateur doit avoir un compte sur la plateforme"
            />

            <FormControl fullWidth>
              <InputLabel>Relation</InputLabel>
              <Select
                value={formData.relationship}
                label="Relation"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    relationship: e.target.value as BeneficiaryRelationship,
                  })
                }
              >
                <MenuItem value="parent">Parent</MenuItem>
                <MenuItem value="spouse">Conjoint(e)</MenuItem>
                <MenuItem value="partner">Partenaire</MenuItem>
                <MenuItem value="sibling">Frère/Sœur</MenuItem>
                <MenuItem value="other">Autre</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Niveau d'accès</InputLabel>
              <Select
                value={formData.accessLevel}
                label="Niveau d'accès"
                onChange={(e) => handleAccessLevelChange(e.target.value as BeneficiaryAccessLevel)}
              >
                <MenuItem value="view">Lecture seule</MenuItem>
                <MenuItem value="book">Réserver des RDV</MenuItem>
                <MenuItem value="edit">Modifier les infos</MenuItem>
                <MenuItem value="admin">Administrateur complet</MenuItem>
              </Select>
            </FormControl>

            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.canView}
                    onChange={(e) =>
                      setFormData({ ...formData, canView: e.target.checked })
                    }
                  />
                }
                label="Peut voir les informations"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.canBook}
                    onChange={(e) =>
                      setFormData({ ...formData, canBook: e.target.checked })
                    }
                  />
                }
                label="Peut prendre des rendez-vous"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.canEdit}
                    onChange={(e) =>
                      setFormData({ ...formData, canEdit: e.target.checked })
                    }
                  />
                }
                label="Peut modifier les informations"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formData.canShare}
                    onChange={(e) =>
                      setFormData({ ...formData, canShare: e.target.checked })
                    }
                  />
                }
                label="Peut partager l'accès"
              />
            </FormGroup>

            <TextField
              fullWidth
              label="Date d'expiration (optionnel)"
              type="date"
              value={formData.expiresAt}
              onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
              InputLabelProps={{ shrink: true }}
              helperText="Laisser vide pour un accès permanent"
            />

            <TextField
              fullWidth
              label="Notes (optionnel)"
              multiline
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button
            variant="contained"
            onClick={handleShare}
            disabled={!formData.userEmail || submitting}
            startIcon={submitting ? <CircularProgress size={20} /> : <ShareIcon />}
          >
            {submitting ? 'Partage en cours...' : 'Partager'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
