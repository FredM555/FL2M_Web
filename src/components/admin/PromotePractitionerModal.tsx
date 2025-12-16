// src/components/admin/PromotePractitionerModal.tsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  TextField,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContractTypeSelector from './ContractTypeSelector';
import ContractUploader from './ContractUploader';
import { ContractType } from '../../types/payments';
import { ContractsService } from '../../services/contracts';
import { useAuth } from '../../context/AuthContext';

interface PromotePractitionerModalProps {
  open: boolean;
  onClose: () => void;
  practitionerId: string;
  practitionerName: string;
  onSuccess: () => void;
}

const PromotePractitionerModal: React.FC<PromotePractitionerModalProps> = ({
  open,
  onClose,
  practitionerId,
  practitionerName,
  onSuccess
}) => {
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // État du formulaire
  const [contractType, setContractType] = useState<ContractType>('decouverte');
  const [contractDocumentUrl, setContractDocumentUrl] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  const steps = [
    'Type de contrat',
    'Document (optionnel)',
    'Confirmation'
  ];

  const handleNext = () => {
    setError(null);
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setError(null);
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      setError('Vous devez être connecté pour effectuer cette action');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Créer le contrat pour le intervenant
      await ContractsService.createContract(
        {
          practitioner_id: practitionerId,
          contract_type: contractType,
          start_date: startDate,
          contract_document_url: contractDocumentUrl || undefined,
          admin_notes: adminNotes || undefined
        },
        user.id
      );

      onSuccess();
      handleClose();

    } catch (err: any) {
      console.error('Erreur lors de la création du contrat:', err);
      setError(err.message || 'Erreur lors de la création du contrat');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setActiveStep(0);
      setContractType('decouverte');
      setContractDocumentUrl(null);
      setAdminNotes('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setError(null);
      onClose();
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="body1" paragraph>
              Sélectionnez le type de contrat pour <strong>{practitionerName}</strong> :
            </Typography>
            <ContractTypeSelector
              value={contractType}
              onChange={setContractType}
              disabled={loading}
            />
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="body1" paragraph>
              Uploadez le contrat signé (optionnel) :
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Le document sera accessible au intervenant depuis son espace personnel.
              Vous pouvez aussi l'ajouter plus tard.
            </Typography>
            <ContractUploader
              practitionerId={practitionerId}
              existingDocumentUrl={contractDocumentUrl}
              onUploadSuccess={setContractDocumentUrl}
              onUploadError={setError}
              disabled={loading}
            />
          </Box>
        );

      case 2:
        return (
          <Box>
            <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Tout est prêt ! Vérifiez les informations avant de confirmer.
              </Typography>
            </Alert>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                intervenant
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600, mb: 2 }}>
                {practitionerName}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Type de contrat
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600, mb: 2 }}>
                {contractType.toUpperCase()}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Date de début
              </Typography>
              <TextField
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={loading}
                fullWidth
                sx={{ mb: 2 }}
              />

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Document de contrat
              </Typography>
              <Typography variant="body2" color={contractDocumentUrl ? 'success.main' : 'text.secondary'}>
                {contractDocumentUrl ? '✓ Document uploadé' : '- Aucun document'}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <TextField
                label="Notes administratives (optionnel)"
                multiline
                rows={3}
                fullWidth
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                disabled={loading}
                placeholder="Ajoutez des notes internes sur ce contrat..."
              />
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
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
          color: 'white',
          pb: 2
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Créer un contrat pour {practitionerName}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
          Configurez le contrat et les paramètres de paiement
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ mt: 3 }}>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {renderStepContent()}
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
            disabled={loading}
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
              background: 'linear-gradient(45deg, #66BB6A, #43A047)',
              '&:hover': {
                background: 'linear-gradient(45deg, #43A047, #66BB6A)'
              }
            }}
          >
            {loading ? 'Création...' : 'Créer le contrat'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default PromotePractitionerModal;
