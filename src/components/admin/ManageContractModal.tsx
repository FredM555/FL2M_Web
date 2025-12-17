// src/components/admin/ManageContractModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  TextField,
  Divider,
  Grid,
  Chip
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { fr } from 'date-fns/locale';
import { format } from 'date-fns';
import WorkIcon from '@mui/icons-material/Work';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { ContractsService } from '../../services/contracts';
import { PractitionerContract, ContractType, getContractTypeLabel, formatAmount } from '../../types/payments';
import ContractTypeSelector from './ContractTypeSelector';
import ContractUploader from './ContractUploader';
import { useAuth } from '../../context/AuthContext';
import { logger } from '../../utils/logger';

interface ManageContractModalProps {
  open: boolean;
  onClose: () => void;
  practitionerId: string;
  practitionerName: string;
  currentContract?: PractitionerContract | null;
  onSuccess: () => void;
}

const ManageContractModal: React.FC<ManageContractModalProps> = ({
  open,
  onClose,
  practitionerId,
  practitionerName,
  currentContract,
  onSuccess
}) => {
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // États du formulaire
  const [contractType, setContractType] = useState<ContractType>('decouverte');
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [contractDocumentUrl, setContractDocumentUrl] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');

  const steps = ['Type de Contrat', 'Document PDF', 'Confirmation'];

  // Pré-remplir avec le contrat actuel si modification
  useEffect(() => {
    if (currentContract) {
      setContractType(currentContract.contract_type);
      setContractDocumentUrl(currentContract.contract_document_url || null);
      setAdminNotes(currentContract.admin_notes || '');
    }
  }, [currentContract]);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
    setError(null);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
    setError(null);
  };

  const handleClose = () => {
    setActiveStep(0);
    setContractType('decouverte');
    setStartDate(new Date());
    setContractDocumentUrl(null);
    setAdminNotes('');
    setError(null);
    setSuccess(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!user) {
      setError('Vous devez être connecté pour effectuer cette action');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Si un contrat actif existe, le terminer d'abord
      if (currentContract && currentContract.status === 'active') {
        await ContractsService.terminateContract(
          currentContract.id,
          user.id,
          format(new Date(), 'yyyy-MM-dd')
        );
      }

      // Créer le nouveau contrat
      const contractData = {
        practitioner_id: practitionerId,
        contract_type: contractType,
        start_date: startDate ? format(startDate, 'yyyy-MM-dd') : undefined,
        contract_document_url: contractDocumentUrl || undefined,
        admin_notes: adminNotes.trim() || undefined
      };

      await ContractsService.createContract(contractData, user.id);

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (err: any) {
      logger.error('Erreur lors de la gestion du contrat:', err);
      setError(err.message || 'Impossible de créer le contrat');
    } finally {
      setLoading(false);
    }
  };

  const isModification = !!currentContract;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
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
            <WorkIcon sx={{ mr: 1 }} />
            {isModification ? 'Modifier le Contrat' : 'Créer un Contrat'} - {practitionerName}
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
              Contrat {isModification ? 'modifié' : 'créé'} avec succès !
            </Alert>
          )}

          {isModification && currentContract && (
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                <strong>Contrat actuel :</strong> {getContractTypeLabel(currentContract.contract_type)}
              </Typography>
              <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                La création d'un nouveau contrat terminera automatiquement le contrat actuel.
              </Typography>
            </Alert>
          )}

          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Étape 1: Type de Contrat */}
          {activeStep === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Choisissez le type de contrat
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <ContractTypeSelector
                value={contractType}
                onChange={setContractType}
              />
            </Box>
          )}

          {/* Étape 2: Document PDF */}
          {activeStep === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Document du contrat (optionnel)
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <ContractUploader
                practitionerId={practitionerId}
                onUploadSuccess={(url) => setContractDocumentUrl(url)}
                existingDocumentUrl={contractDocumentUrl}
              />
            </Box>
          )}

          {/* Étape 3: Confirmation */}
          {activeStep === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Confirmation
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Box sx={{ p: 3, bgcolor: 'rgba(52, 89, 149, 0.05)', borderRadius: 2 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Intervenant :
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {practitionerName}
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Divider />
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Type de contrat :
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 600, mt: 1 }}>
                      {getContractTypeLabel(contractType)}
                    </Typography>
                  </Grid>

                  <Grid item xs={12}>
                    <Divider />
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Date de début :
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {startDate && format(startDate, 'dd/MM/yyyy', { locale: fr })}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Document PDF :
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {contractDocumentUrl ? '✓ Uploadé' : 'Non fourni'}
                    </Typography>
                  </Grid>
                </Grid>
              </Box>

              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Notes administrateur (optionnel)
                </Typography>
                <TextField
                  multiline
                  rows={3}
                  fullWidth
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Notes internes sur ce contrat..."
                />
              </Box>

              {isModification && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    Le contrat actuel <strong>{getContractTypeLabel(currentContract!.contract_type)}</strong> sera
                    terminé et un nouveau contrat <strong>{getContractTypeLabel(contractType)}</strong> sera créé.
                  </Typography>
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleClose} disabled={loading}>
            Annuler
          </Button>
          {activeStep > 0 && (
            <Button onClick={handleBack} disabled={loading}>
              Retour
            </Button>
          )}
          {activeStep < steps.length - 1 ? (
            <Button
              variant="contained"
              onClick={handleNext}
              sx={{
                background: 'linear-gradient(45deg, #345995, #1D3461)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #1D3461, #345995)'
                }
              }}
            >
              Suivant
            </Button>
          ) : (
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
              {loading ? 'Création...' : isModification ? 'Modifier le Contrat' : 'Créer le Contrat'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default ManageContractModal;
