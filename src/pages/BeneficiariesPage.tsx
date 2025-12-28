// src/pages/BeneficiariesPage.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  Typography,
  IconButton,
  Button,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useLocation } from 'react-router-dom';
import SacredGeometryBackground from '../components/SacredGeometryBackground';
import { BeneficiaryList } from '../components/beneficiaries/BeneficiaryList';
import { BeneficiaryForm } from '../components/beneficiaries/BeneficiaryForm';
import { BeneficiaryHistory } from '../components/beneficiaries/BeneficiaryHistory';
import { BeneficiaryStats } from '../components/beneficiaries/BeneficiaryStats';
import { BeneficiaryAccessManager } from '../components/beneficiaries/BeneficiaryAccessManager';
import { BeneficiaryDetails } from '../components/beneficiaries/BeneficiaryDetails';
import { BeneficiaryDocuments } from '../components/beneficiaries/BeneficiaryDocuments';
import { AppointmentDetailsDialog } from '../components/appointments/AppointmentDetailsDialog';
import {
  getUserBeneficiaries,
  createBeneficiary,
  updateBeneficiary,
  deleteBeneficiary,
  updateBeneficiaryRelationship,
} from '../services/beneficiaries';
import { BeneficiaryWithAccess, CreateBeneficiaryData, UpdateBeneficiaryData } from '../types/beneficiary';
import { getAppointmentById, Appointment } from '../services/supabase';
import { useAuth } from '../context/AuthContext';
import { logger } from '../utils/logger';

type DialogMode = 'create' | 'edit' | 'view' | null;

/**
 * Page principale de gestion des bénéficiaires
 */
export const BeneficiariesPage: React.FC = () => {
  const { user, profile } = useAuth();
  const location = useLocation();
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryWithAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // État des dialogs
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<BeneficiaryWithAccess | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // État du dialog de confirmation de suppression
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [beneficiaryToDelete, setBeneficiaryToDelete] = useState<BeneficiaryWithAccess | null>(null);

  // État snackbar
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Onglets dans le dialog de vue détaillée
  const [detailTab, setDetailTab] = useState(0);

  // État pour le dialog des détails du rendez-vous
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [loadingAppointment, setLoadingAppointment] = useState(false);

  // Charger les bénéficiaires uniquement au montage ou si l'utilisateur change vraiment
  useEffect(() => {
    if (user) {
      loadBeneficiaries();
    }
  }, [user?.id]); // Utiliser user?.id au lieu de user pour éviter les re-renders inutiles

  // Ouvrir automatiquement le dialog si un bénéficiaire est passé dans l'état de navigation
  useEffect(() => {
    const state = location.state as { openBeneficiary?: string; mode?: 'view' | 'edit' } | null;
    if (state?.openBeneficiary && beneficiaries.length > 0) {
      const beneficiary = beneficiaries.find(b => b.id === state.openBeneficiary);
      if (beneficiary) {
        setSelectedBeneficiary(beneficiary);
        setDetailTab(0);
        setDialogMode(state.mode || 'view');

        // Nettoyer l'état pour éviter de rouvrir à chaque render
        window.history.replaceState({}, document.title);
      }
    }
  }, [location.state, beneficiaries]);

  const loadBeneficiaries = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await getUserBeneficiaries();

      // Trier les bénéficiaires par ordre de type de relation
      const relationshipOrder: Record<string, number> = {
        'owner': 0, // owner en premier si présent
        'self': 1,  // Moi-même
        'spouse': 2, // Conjoint(e)
        'child': 3, // Enfant
        'parent': 4,
        'sibling': 5,
        'grandparent': 6,
        'grandchild': 7,
        'other': 8,
      };

      const sortedData = (data || []).sort((a, b) => {
        const orderA = relationshipOrder[a.relationship] ?? 999;
        const orderB = relationshipOrder[b.relationship] ?? 999;
        return orderA - orderB;
      });

      setBeneficiaries(sortedData);
    } catch (err: any) {
      logger.error('Erreur lors du chargement des bénéficiaires:', err);
      setError(err.message || 'Erreur lors du chargement des bénéficiaires');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedBeneficiary(null);
    setDialogMode('create');
  };

  const handleEdit = (beneficiary: BeneficiaryWithAccess) => {
    setSelectedBeneficiary(beneficiary);
    setDialogMode('edit');
  };

  const handleView = (beneficiary: BeneficiaryWithAccess) => {
    setSelectedBeneficiary(beneficiary);
    setDetailTab(0);
    setDialogMode('view');
  };

  const handleDelete = (beneficiary: BeneficiaryWithAccess) => {
    if (!beneficiary || !beneficiary.id) {
      setSnackbar({
        open: true,
        message: 'Erreur: Impossible d\'identifier le bénéficiaire à supprimer',
        severity: 'error',
      });
      return;
    }

    setBeneficiaryToDelete(beneficiary);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!beneficiaryToDelete) return;

    try {
      const { success, error } = await deleteBeneficiary(beneficiaryToDelete.id);

      if (!success || error) {
        throw error;
      }

      await loadBeneficiaries();
      setSnackbar({
        open: true,
        message: 'Bénéficiaire supprimé avec succès',
        severity: 'success',
      });
    } catch (err: any) {
      logger.error('Erreur lors de la suppression:', err);
      setSnackbar({
        open: true,
        message: err?.message || 'Erreur lors de la suppression du bénéficiaire',
        severity: 'error',
      });
    } finally {
      setDeleteDialogOpen(false);
      setBeneficiaryToDelete(null);
    }
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setBeneficiaryToDelete(null);
  };

  const handleSave = async (data: CreateBeneficiaryData | UpdateBeneficiaryData) => {
    try {
      setSubmitting(true);
      setError(null);

      // Extraire la relation des données
      const { relationship, ...beneficiaryData } = data as any;

      if (dialogMode === 'create') {
        await createBeneficiary(beneficiaryData as CreateBeneficiaryData);
        setSnackbar({
          open: true,
          message: 'Bénéficiaire créé avec succès',
          severity: 'success',
        });
      } else if (dialogMode === 'edit' && selectedBeneficiary) {
        // Mettre à jour les données du bénéficiaire
        await updateBeneficiary(selectedBeneficiary.id, beneficiaryData as UpdateBeneficiaryData);

        // Mettre à jour la relation si elle a changé
        if (relationship && relationship !== selectedBeneficiary.relationship) {
          await updateBeneficiaryRelationship(selectedBeneficiary.id, relationship);
        }

        setSnackbar({
          open: true,
          message: 'Bénéficiaire modifié avec succès',
          severity: 'success',
        });
      }

      setDialogMode(null);
      setSelectedBeneficiary(null);
      await loadBeneficiaries();
    } catch (err: any) {
      logger.error('Erreur lors de la sauvegarde:', err);
      setError(err.message || 'Erreur lors de la sauvegarde');
      throw err; // Relancer pour que le formulaire gère l'erreur
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseDialog = () => {
    setDialogMode(null);
    setSelectedBeneficiary(null);
    setError(null);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Fonction pour charger et afficher les détails d'un rendez-vous
  const handleViewAppointment = async (appointmentId: string) => {
    try {
      setLoadingAppointment(true);
      const { data, error } = await getAppointmentById(appointmentId);

      if (error) {
        throw error;
      }

      if (data) {
        setSelectedAppointment(data);
        setAppointmentDialogOpen(true);
      }
    } catch (err: any) {
      logger.error('Erreur lors du chargement du rendez-vous:', err);
      setSnackbar({
        open: true,
        message: err.message || 'Erreur lors du chargement des détails du rendez-vous',
        severity: 'error',
      });
    } finally {
      setLoadingAppointment(false);
    }
  };

  const handleCloseAppointmentDialog = () => {
    setAppointmentDialogOpen(false);
    setSelectedAppointment(null);
  };

  return (
    <Box sx={{ width: '100%', position: 'relative', minHeight: '100vh' }}>
      {/* Image de fond avec opacité */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          backgroundImage: 'url(/images/Beneficiary.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.7,
          pointerEvents: 'none',
        }}
      />
      {/* Overlay pour adoucir l'image */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0,
          background: 'linear-gradient(180deg, rgba(248, 249, 250, 0.3) 0%, rgba(233, 236, 239, 0.35) 50%, rgba(222, 226, 230, 0.4) 100%)',
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          background: 'rgba(245, 247, 250, 0.6)',
          backdropFilter: 'blur(2px)',
          py: { xs: 2, md: 4 },
          mt: { xs: '80px', md: '40px' },
          position: 'relative',
          zIndex: 1,
        }}
      >
        <Container maxWidth="xl">
          {/* Bandeau bleu avec titre */}
          <Box
            sx={{
              position: 'relative',
              overflow: 'hidden',
              mb: 3,
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
            }}
          >
            <Box
              sx={{
                background: 'linear-gradient(135deg, #345995 0%, #1D3461 100%)',
                color: 'white',
                p: 3,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <SacredGeometryBackground theme="particuliers" />
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  fontWeight: 700,
                  fontSize: { xs: '1.5rem', md: '2rem' },
                  position: 'relative',
                  zIndex: 2,
                }}
              >
                Mes bénéficiaires
              </Typography>
            </Box>
          </Box>

          <BeneficiaryList
          beneficiaries={beneficiaries}
          loading={loading}
          error={error}
          onAdd={handleCreate}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onClick={handleView}
          userType={profile?.user_type}
        />

        {/* Dialog Créer/Éditer */}
        <Dialog
          open={dialogMode === 'create' || dialogMode === 'edit'}
          onClose={handleCloseDialog}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
              {dialogMode === 'create' ? 'Nouveau bénéficiaire' : 'Modifier le bénéficiaire'}
            </Typography>
            <IconButton
              aria-label="fermer"
              onClick={handleCloseDialog}
              sx={{
                color: 'grey.500',
                '&:hover': {
                  color: 'grey.700',
                  bgcolor: 'grey.100',
                },
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            <BeneficiaryForm
              beneficiary={selectedBeneficiary || undefined}
              onSave={handleSave}
              onCancel={handleCloseDialog}
              loading={submitting}
              userType={profile?.user_type}
            />
          </DialogContent>
        </Dialog>

        {/* Dialog Vue détaillée avec onglets */}
        <Dialog
          open={dialogMode === 'view'}
          onClose={handleCloseDialog}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: { height: '90vh' },
          }}
        >
          <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {selectedBeneficiary && (
              <Typography variant="h5" component="span" sx={{ fontWeight: 600 }}>
                {selectedBeneficiary.first_name} {selectedBeneficiary.last_name}
              </Typography>
            )}
            <IconButton
              aria-label="fermer"
              onClick={handleCloseDialog}
              sx={{
                color: 'grey.500',
                '&:hover': {
                  color: 'grey.700',
                  bgcolor: 'grey.100',
                },
              }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            {selectedBeneficiary && (
              <Box>
                {/* Onglets */}
                <Tabs value={detailTab} onChange={(_e, newValue) => setDetailTab(newValue)}>
                  <Tab label="Informations" />
                  <Tab label="Documents" />
                  <Tab label="Statistiques" />
                  <Tab label="Historique" />
                  <Tab label="Accès partagés" />
                </Tabs>

                {/* Contenu des onglets */}
                <Box sx={{ mt: 3 }}>
                  {detailTab === 0 && (
                    <BeneficiaryDetails
                      beneficiary={selectedBeneficiary}
                      userType={profile?.user_type}
                      onRelationshipUpdate={loadBeneficiaries}
                    />
                  )}
                  {detailTab === 1 && (
                    <BeneficiaryDocuments
                      beneficiaryId={selectedBeneficiary.id}
                      canEdit={selectedBeneficiary.can_edit}
                    />
                  )}
                  {detailTab === 2 && <BeneficiaryStats beneficiaryId={selectedBeneficiary.id} />}
                  {detailTab === 3 && (
                    <BeneficiaryHistory
                      beneficiaryId={selectedBeneficiary.id}
                      onViewAppointment={handleViewAppointment}
                    />
                  )}
                  {detailTab === 4 && (
                    <BeneficiaryAccessManager
                      beneficiary={selectedBeneficiary}
                    />
                  )}
                </Box>
              </Box>
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog de confirmation de suppression */}
        <Dialog
          open={deleteDialogOpen}
          onClose={cancelDelete}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
            <WarningAmberIcon color="warning" sx={{ fontSize: 32 }} />
            <Typography variant="h6" component="span" sx={{ fontWeight: 600 }}>
              Confirmer la suppression
            </Typography>
          </DialogTitle>
          <DialogContent>
            {beneficiaryToDelete && (
              <Box>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Cette action est irréversible et entraînera la suppression définitive de toutes les données associées.
                </Alert>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Êtes-vous sûr de vouloir supprimer le bénéficiaire suivant ?
                </Typography>
                <Box
                  sx={{
                    p: 2,
                    bgcolor: 'grey.50',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'grey.300',
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                    {beneficiaryToDelete.first_name} {beneficiaryToDelete.last_name}
                  </Typography>
                  {beneficiaryToDelete.email && (
                    <Typography variant="body2" color="text.secondary">
                      Email : {beneficiaryToDelete.email}
                    </Typography>
                  )}
                  {beneficiaryToDelete.birth_date && (
                    <Typography variant="body2" color="text.secondary">
                      Date de naissance : {new Date(beneficiaryToDelete.birth_date).toLocaleDateString('fr-FR')}
                    </Typography>
                  )}
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontStyle: 'italic' }}>
                  Les données suivantes seront également supprimées :
                </Typography>
                <Box component="ul" sx={{ mt: 1, pl: 2 }}>
                  <Typography component="li" variant="body2" color="text.secondary">
                    Historique des rendez-vous
                  </Typography>
                  <Typography component="li" variant="body2" color="text.secondary">
                    Documents associés
                  </Typography>
                  <Typography component="li" variant="body2" color="text.secondary">
                    Accès partagés
                  </Typography>
                </Box>
              </Box>
            )}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button
              onClick={cancelDelete}
              variant="outlined"
              color="inherit"
              sx={{ textTransform: 'none' }}
            >
              Annuler
            </Button>
            <Button
              onClick={confirmDelete}
              variant="contained"
              color="error"
              sx={{
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Supprimer définitivement
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog des détails du rendez-vous */}
        {selectedAppointment && (
          <AppointmentDetailsDialog
            open={appointmentDialogOpen}
            onClose={handleCloseAppointmentDialog}
            appointment={selectedAppointment}
            onAppointmentUpdate={(updatedAppointment) => {
              setSelectedAppointment(updatedAppointment);
            }}
          />
        )}

        {/* Snackbar de notification */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={4000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={handleCloseSnackbar}
            severity={snackbar.severity}
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
        </Container>
      </Box>
    </Box>
  );
};
