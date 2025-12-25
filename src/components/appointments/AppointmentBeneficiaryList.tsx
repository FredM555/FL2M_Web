// src/components/appointments/AppointmentBeneficiaryList.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PersonIcon from '@mui/icons-material/Person';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import NoteIcon from '@mui/icons-material/Note';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { Appointment } from '../../services/supabase';
import { getAppointmentBeneficiaries, removeBeneficiaryFromAppointment, replaceBeneficiaryInAppointment } from '../../services/beneficiaries';
import type { AppointmentBeneficiary } from '../../types/beneficiary';
import { NumerologyTriangleAvatar } from '../profile/NumerologyTriangleAvatar';
import { useAuth } from '../../context/AuthContext';
import { logger } from '../../utils/logger';
import { format, parseISO, differenceInHours } from 'date-fns';
import { BeneficiaryNotesPanel } from './BeneficiaryNotesPanel';
import { BeneficiaryDocumentsPanel } from './BeneficiaryDocumentsPanel';
import { ChangeBeneficiaryDialog } from './ChangeBeneficiaryDialog';

interface AppointmentBeneficiaryListProps {
  appointment: Appointment;
  onUpdate?: (updatedAppointment: Appointment) => void;
}

export const AppointmentBeneficiaryList: React.FC<AppointmentBeneficiaryListProps> = ({
  appointment,
  onUpdate
}) => {
  const { profile } = useAuth();
  const [beneficiaries, setBeneficiaries] = useState<AppointmentBeneficiary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPanel, setExpandedPanel] = useState<string | false>(false);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<AppointmentBeneficiary | null>(null);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [documentsDialogOpen, setDocumentsDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [beneficiaryToDelete, setBeneficiaryToDelete] = useState<AppointmentBeneficiary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [changeDialogOpen, setChangeDialogOpen] = useState(false);
  const [beneficiaryToChange, setBeneficiaryToChange] = useState<AppointmentBeneficiary | null>(null);

  // Récupérer les bénéficiaires du rendez-vous
  useEffect(() => {
    loadBeneficiaries();
  }, [appointment.id]);

  const loadBeneficiaries = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: loadError } = await getAppointmentBeneficiaries(appointment.id);
      if (loadError) {
        logger.error('Erreur lors du chargement des bénéficiaires:', loadError);
        throw loadError;
      }

      setBeneficiaries(data || []);
      logger.debug('Bénéficiaires chargés:', data);
    } catch (err: any) {
      logger.error('Erreur lors du chargement des bénéficiaires:', err);
      setError(err.message || 'Erreur lors du chargement des bénéficiaires');
    } finally {
      setLoading(false);
    }
  };

  // Déterminer si l'utilisateur peut modifier
  const canEdit = React.useMemo(() => {
    if (!profile) return false;

    // Ne pas permettre la modification si le RDV est terminé/validé
    if (appointment.status === 'completed' || appointment.status === 'validated') {
      return false;
    }

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

  // Est-ce que l'utilisateur est l'intervenant (ou admin qui a accès aux fonctionnalités intervenant)
  const isPractitioner = React.useMemo(() => {
    if (!profile) return false;
    // Admin a toujours accès aux fonctionnalités intervenant
    if (profile.user_type === 'admin') return true;
    // Intervenant uniquement sur ses propres RDV
    return profile.user_type === 'intervenant' && appointment.practitioner?.user_id === profile.id;
  }, [profile, appointment]);

  // Vérifier si on peut changer de bénéficiaire
  const canChangeBeneficiary = React.useMemo(() => {
    if (!profile || !canEdit) return false;

    // Les intervenants peuvent toujours changer (ils communiquent par chat)
    if (isPractitioner) return true;

    // Pour les clients : seulement si > 48h avant le RDV
    if (profile.user_type === 'client') {
      const appointmentStartTime = parseISO(appointment.start_time);
      const hoursUntilAppointment = differenceInHours(appointmentStartTime, new Date());
      return hoursUntilAppointment > 48;
    }

    return false;
  }, [profile, appointment, canEdit, isPractitioner]);

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  const handleOpenNotes = (beneficiary: AppointmentBeneficiary) => {
    setSelectedBeneficiary(beneficiary);
    setNotesDialogOpen(true);
  };

  const handleOpenDocuments = (beneficiary: AppointmentBeneficiary) => {
    setSelectedBeneficiary(beneficiary);
    setDocumentsDialogOpen(true);
  };

  const handleDeleteClick = (beneficiary: AppointmentBeneficiary) => {
    setBeneficiaryToDelete(beneficiary);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!beneficiaryToDelete) return;

    setDeleting(true);
    try {
      const { success, error: deleteError } = await removeBeneficiaryFromAppointment(
        appointment.id,
        beneficiaryToDelete.beneficiary_id
      );

      if (deleteError || !success) {
        throw deleteError || new Error('Erreur lors de la suppression');
      }

      // Recharger la liste
      await loadBeneficiaries();
      setDeleteConfirmOpen(false);
      setBeneficiaryToDelete(null);
    } catch (err: any) {
      logger.error('Erreur lors de la suppression du bénéficiaire:', err);
      setError(err.message || 'Erreur lors de la suppression du bénéficiaire');
    } finally {
      setDeleting(false);
    }
  };

  const handleChangeClick = (beneficiary: AppointmentBeneficiary) => {
    setBeneficiaryToChange(beneficiary);
    setChangeDialogOpen(true);
  };

  const handleConfirmChange = async (newBeneficiaryId: string) => {
    if (!beneficiaryToChange) return;

    const { success, error: changeError } = await replaceBeneficiaryInAppointment(
      appointment.id,
      beneficiaryToChange.beneficiary_id,
      newBeneficiaryId
    );

    if (changeError || !success) {
      throw changeError || new Error('Erreur lors du changement de bénéficiaire');
    }

    // Recharger la liste
    await loadBeneficiaries();
    setChangeDialogOpen(false);
    setBeneficiaryToChange(null);
  };

  // Limites du service
  const serviceLimits = React.useMemo(() => {
    return {
      min: appointment.service?.min_beneficiaries || 1,
      max: appointment.service?.max_beneficiaries || 1
    };
  }, [appointment.service]);

  const canAddMore = beneficiaries.length < serviceLimits.max;
  const canRemove = beneficiaries.length > serviceLimits.min;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && beneficiaries.length === 0) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Bénéficiaires du rendez-vous
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {beneficiaries.length} / {serviceLimits.max} bénéficiaire(s)
            {serviceLimits.min > 1 && ` (minimum: ${serviceLimits.min})`}
          </Typography>
        </Box>
        {canEdit && canAddMore && (
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            size="small"
            sx={{
              borderColor: '#345995',
              color: '#345995',
              '&:hover': {
                borderColor: '#1D3461',
                backgroundColor: 'rgba(52, 89, 149, 0.08)',
              },
            }}
          >
            Ajouter
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {beneficiaries.length === 0 ? (
        <Alert severity="info">
          Aucun bénéficiaire associé à ce rendez-vous.
        </Alert>
      ) : (
        <Box>
          {beneficiaries.map((ab, index) => {
            const beneficiary = ab.beneficiary;
            if (!beneficiary) return null;

            const displayName = `${beneficiary.first_name} ${beneficiary.last_name}`;
            const roleLabel = ab.role === 'primary' ? 'Principal' :
                            ab.role === 'partner' ? 'Partenaire' :
                            ab.role === 'child' ? 'Enfant' :
                            ab.role === 'parent' ? 'Parent' :
                            ab.role === 'team_member' ? 'Membre d\'équipe' : 'Autre';

            return (
              <Accordion
                key={beneficiary.id}
                expanded={expandedPanel === beneficiary.id}
                onChange={handleAccordionChange(beneficiary.id)}
                sx={{
                  mb: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:before': { display: 'none' },
                  boxShadow: expandedPanel === beneficiary.id ? 2 : 0,
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    bgcolor: expandedPanel === beneficiary.id ? 'rgba(52, 89, 149, 0.05)' : 'inherit',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    {/* Avatar de numérologie si disponible */}
                    {(beneficiary.tronc || beneficiary.racine_1 || beneficiary.racine_2) ? (
                      <NumerologyTriangleAvatar
                        tronc={beneficiary.tronc ?? undefined}
                        racine1={beneficiary.racine_1 ?? undefined}
                        racine2={beneficiary.racine_2 ?? undefined}
                        dynamique_de_vie={beneficiary.dynamique_de_vie ?? undefined}
                        size={48}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          backgroundColor: '#345995',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '1rem',
                        }}
                      >
                        {beneficiary.first_name.charAt(0)}{beneficiary.last_name.charAt(0)}
                      </Box>
                    )}
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {displayName}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                        <Chip label={roleLabel} size="small" color="primary" variant="outlined" />
                        {ab.receives_notifications && (
                          <Chip label="Notifications activées" size="small" color="success" variant="outlined" />
                        )}
                      </Box>
                    </Box>
                  </Box>
                </AccordionSummary>

                <AccordionDetails>
                  <Box>
                    {/* Informations du bénéficiaire */}
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        Informations personnelles
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
                        {beneficiary.birth_date && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Date de naissance
                            </Typography>
                            <Typography variant="body2">
                              {format(parseISO(beneficiary.birth_date), 'dd/MM/yyyy')}
                            </Typography>
                          </Box>
                        )}
                        {beneficiary.email && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Email
                            </Typography>
                            <Typography variant="body2">
                              {beneficiary.email}
                            </Typography>
                          </Box>
                        )}
                        {beneficiary.phone && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Téléphone
                            </Typography>
                            <Typography variant="body2">
                              {beneficiary.phone}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>

                    {/* Actions */}
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {isPractitioner && (
                        <Button
                          size="small"
                          startIcon={<NoteIcon />}
                          onClick={() => handleOpenNotes(ab)}
                          variant="outlined"
                        >
                          Notes
                        </Button>
                      )}
                      {isPractitioner && (
                        <Button
                          size="small"
                          startIcon={<AttachFileIcon />}
                          onClick={() => handleOpenDocuments(ab)}
                          variant="outlined"
                        >
                          Documents
                        </Button>
                      )}
                      {canChangeBeneficiary && beneficiaries.length === 1 && (
                        <Button
                          size="small"
                          startIcon={<SwapHorizIcon />}
                          onClick={() => handleChangeClick(ab)}
                          variant="outlined"
                          color="primary"
                        >
                          Changer
                        </Button>
                      )}
                      {canEdit && canRemove && (
                        <Button
                          size="small"
                          startIcon={<DeleteIcon />}
                          onClick={() => handleDeleteClick(ab)}
                          color="error"
                          variant="outlined"
                        >
                          Retirer
                        </Button>
                      )}
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Box>
      )}

      {/* Dialog des notes */}
      {selectedBeneficiary && (
        <Dialog
          open={notesDialogOpen}
          onClose={() => setNotesDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Notes sur {selectedBeneficiary.beneficiary?.first_name} {selectedBeneficiary.beneficiary?.last_name}
          </DialogTitle>
          <DialogContent>
            <BeneficiaryNotesPanel
              beneficiaryId={selectedBeneficiary.beneficiary_id}
              practitionerId={appointment.practitioner_id}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setNotesDialogOpen(false)}>Fermer</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Dialog des documents */}
      {selectedBeneficiary && (
        <Dialog
          open={documentsDialogOpen}
          onClose={() => setDocumentsDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Documents de {selectedBeneficiary.beneficiary?.first_name} {selectedBeneficiary.beneficiary?.last_name}
          </DialogTitle>
          <DialogContent>
            <BeneficiaryDocumentsPanel
              beneficiaryId={selectedBeneficiary.beneficiary_id}
              appointmentId={appointment.id}
              practitionerId={appointment.practitioner_id}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDocumentsDialogOpen(false)}>Fermer</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Dialog de confirmation de suppression */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => !deleting && setDeleteConfirmOpen(false)}
      >
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>
            Voulez-vous vraiment retirer {beneficiaryToDelete?.beneficiary?.first_name}{' '}
            {beneficiaryToDelete?.beneficiary?.last_name} de ce rendez-vous ?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} disabled={deleting}>
            Annuler
          </Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={deleting}
          >
            {deleting ? 'Suppression...' : 'Retirer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de changement de bénéficiaire */}
      {beneficiaryToChange && (
        <ChangeBeneficiaryDialog
          open={changeDialogOpen}
          onClose={() => setChangeDialogOpen(false)}
          currentBeneficiary={beneficiaryToChange}
          onConfirm={handleConfirmChange}
          clientId={appointment.client_id || ''}
        />
      )}

      {/* Message informatif */}
      {appointment.status !== 'completed' && appointment.status !== 'validated' && (
        <Alert severity="info" sx={{ mt: 3 }}>
          <Typography variant="body2" gutterBottom>
            <strong>Information importante :</strong>
          </Typography>
          <Typography variant="body2">
            Les informations des bénéficiaires sont indispensables pour la préparation de la séance.
            Pour les personnes mariées, divorcées ou adoptées, utilisez toujours les informations de naissance.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};
