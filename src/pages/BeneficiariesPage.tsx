// src/pages/BeneficiariesPage.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Dialog,
  DialogContent,
  DialogTitle,
  Snackbar,
  Alert,
  Tabs,
  Tab,
  Typography,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { BeneficiaryList } from '../components/beneficiaries/BeneficiaryList';
import { BeneficiaryForm } from '../components/beneficiaries/BeneficiaryForm';
import { BeneficiaryHistory } from '../components/beneficiaries/BeneficiaryHistory';
import { BeneficiaryStats } from '../components/beneficiaries/BeneficiaryStats';
import { BeneficiaryAccessManager } from '../components/beneficiaries/BeneficiaryAccessManager';
import { BeneficiaryDetails } from '../components/beneficiaries/BeneficiaryDetails';
import { BeneficiaryDocuments } from '../components/beneficiaries/BeneficiaryDocuments';
import {
  getUserBeneficiaries,
  createBeneficiary,
  updateBeneficiary,
  deleteBeneficiary,
  updateBeneficiaryRelationship,
} from '../services/beneficiaries';
import { BeneficiaryWithAccess, CreateBeneficiaryData, UpdateBeneficiaryData } from '../types/beneficiary';
import { useAuth } from '../context/AuthContext';

type DialogMode = 'create' | 'edit' | 'view' | null;

/**
 * Page principale de gestion des bénéficiaires
 */
export const BeneficiariesPage: React.FC = () => {
  const { user, profile } = useAuth();
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryWithAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // État des dialogs
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<BeneficiaryWithAccess | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  // Charger les bénéficiaires uniquement au montage ou si l'utilisateur change vraiment
  useEffect(() => {
    if (user) {
      loadBeneficiaries();
    }
  }, [user?.id]); // Utiliser user?.id au lieu de user pour éviter les re-renders inutiles

  const loadBeneficiaries = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data } = await getUserBeneficiaries();
      setBeneficiaries(data || []);
    } catch (err: any) {
      console.error('Erreur lors du chargement des bénéficiaires:', err);
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

  const handleDelete = async (beneficiary: BeneficiaryWithAccess) => {
    if (!beneficiary || !beneficiary.id) {
      setSnackbar({
        open: true,
        message: 'Erreur: Impossible d\'identifier le bénéficiaire à supprimer',
        severity: 'error',
      });
      return;
    }

    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${beneficiary.first_name} ${beneficiary.last_name} ?`)) {
      return;
    }

    try {
      const { success, error } = await deleteBeneficiary(beneficiary.id);

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
      console.error('Erreur lors de la suppression:', err);
      setSnackbar({
        open: true,
        message: err?.message || 'Erreur lors de la suppression du bénéficiaire',
        severity: 'error',
      });
    }
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
      console.error('Erreur lors de la sauvegarde:', err);
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

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
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
                      onViewAppointment={(id) => {
                        // TODO: Navigation vers les détails du RDV
                        console.log('View appointment:', id);
                      }}
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
  );
};
