// src/pages/PractitionerSubscriptionPage.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ContractTypeSelector from '../components/admin/ContractTypeSelector';
import {
  ContractType,
  CONTRACT_CONFIGS,
  formatAmount,
  getContractTypeLabel,
  PractitionerContract
} from '../types/payments';
import { supabase } from '../services/supabase';
import { createSubscriptionCheckout, redirectToCheckout } from '../services/stripe';
import { logger } from '../utils/logger';

const PractitionerSubscriptionPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentContract, setCurrentContract] = useState<PractitionerContract | null>(null);
  const [selectedContractType, setSelectedContractType] = useState<ContractType>('decouverte');
  const [error, setError] = useState<string | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  useEffect(() => {
    loadCurrentContract();
  }, [user]);

  const loadCurrentContract = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Récupérer l'ID du intervenant
      const { data: practitionerData, error: practitionerError } = await supabase
        .from('practitioners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (practitionerError || !practitionerData) {
        throw new Error('Vous devez être un intervenant pour accéder à cette page');
      }

      // Récupérer le contrat actif
      const { data: contractData, error: contractError } = await supabase
        .from('practitioner_contracts')
        .select('*')
        .eq('practitioner_id', practitionerData.id)
        .eq('status', 'active')
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (contractError) {
        throw contractError;
      }

      if (contractData) {
        setCurrentContract(contractData);
        setSelectedContractType(contractData.contract_type as ContractType);
      }
    } catch (err: any) {
      logger.error('Erreur lors du chargement du contrat:', err);
      setError(err.message || 'Erreur lors du chargement du contrat');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeSubscription = () => {
    if (!currentContract) return;

    // Vérifier si l'abonnement est différent
    if (selectedContractType === currentContract.contract_type) {
      setError('Vous avez déjà cet abonnement');
      return;
    }

    setConfirmDialogOpen(true);
  };

  const handleConfirmChange = async () => {
    if (!currentContract || !user) return;

    setConfirmDialogOpen(false);
    setSubmitting(true);
    setError(null);

    try {
      // Récupérer l'ID du intervenant
      const { data: practitionerData, error: practitionerError } = await supabase
        .from('practitioners')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (practitionerError || !practitionerData) {
        throw new Error('intervenant non trouvé');
      }

      // Calculer la date de début du nouveau contrat (date anniversaire)
      const currentStartDate = new Date(currentContract.start_date);
      const today = new Date();
      const dayOfMonth = currentStartDate.getDate();

      // Calculer le prochain jour anniversaire
      let nextAnniversaryDate = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);

      // Si le jour anniversaire est déjà passé ce mois-ci, passer au mois suivant
      if (nextAnniversaryDate <= today) {
        nextAnniversaryDate = new Date(today.getFullYear(), today.getMonth() + 1, dayOfMonth);
      }

      const config = CONTRACT_CONFIGS[selectedContractType];

      // Créer un nouveau contrat avec statut pending_payment
      const { data: newContractData, error: contractError } = await supabase
        .from('practitioner_contracts')
        .insert({
          practitioner_id: practitionerData.id,
          contract_type: selectedContractType,
          monthly_fee: config.monthly_fee,
          commission_fixed: config.commission_fixed,
          commission_percentage: config.commission_percentage,
          commission_cap: config.commission_cap,
          max_appointments_per_month: config.max_appointments_per_month,
          free_appointments_per_month: config.free_appointments_per_month,
          start_date: nextAnniversaryDate.toISOString().split('T')[0],
          status: 'pending_payment',
          created_by: user.id
        })
        .select()
        .single();

      if (contractError || !newContractData) {
        throw new Error(contractError?.message || 'Erreur lors de la création du contrat');
      }

      // Créer la session de paiement Stripe
      const session = await createSubscriptionCheckout(
        newContractData.id,
        selectedContractType
      );

      // Rediriger vers Stripe Checkout
      await redirectToCheckout(session.url);
    } catch (err: any) {
      logger.error('Erreur lors du changement d\'abonnement:', err);
      setError(err.message || 'Erreur lors du changement d\'abonnement');
      setSubmitting(false);
    }
  };

  const calculateNextBillingDate = () => {
    if (!currentContract) return null;

    const currentStartDate = new Date(currentContract.start_date);
    const today = new Date();
    const dayOfMonth = currentStartDate.getDate();

    let nextBillingDate = new Date(today.getFullYear(), today.getMonth(), dayOfMonth);

    if (nextBillingDate <= today) {
      nextBillingDate = new Date(today.getFullYear(), today.getMonth() + 1, dayOfMonth);
    }

    return nextBillingDate.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          Chargement...
        </Typography>
      </Container>
    );
  }

  if (error && !currentContract) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button onClick={() => navigate('/')}>
          Retour à l'accueil
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        Gérer mon abonnement
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Consultez et modifiez votre abonnement intervenant
      </Typography>

      {/* Abonnement actuel */}
      {currentContract && (
        <Paper sx={{ p: 4, mb: 4, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, flex: 1 }}>
              Abonnement actuel
            </Typography>
            <Chip
              label="Actif"
              color="success"
              icon={<CheckCircleIcon />}
              sx={{ fontWeight: 600 }}
            />
          </Box>

          <Card sx={{ mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                {getContractTypeLabel(currentContract.contract_type as ContractType)}
              </Typography>
              <Typography variant="h5" sx={{ mb: 1 }}>
                {formatAmount(currentContract.monthly_fee)} / mois
              </Typography>
              <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.3)' }} />
              <Typography variant="body2">
                Date de début : {new Date(currentContract.start_date).toLocaleDateString('fr-FR')}
              </Typography>
              <Typography variant="body2">
                Prochain paiement : {calculateNextBillingDate()}
              </Typography>
              <Typography variant="body2">
                RDV ce mois-ci : {currentContract.appointments_this_month}
                {currentContract.max_appointments_per_month && ` / ${currentContract.max_appointments_per_month}`}
              </Typography>
            </CardContent>
          </Card>

          <Alert severity="info" icon={<InfoIcon />} sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              Comment fonctionne le changement d'abonnement ?
            </Typography>
            <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
              <li>Votre abonnement actuel continuera jusqu'à la fin de votre cycle mensuel</li>
              <li>Le nouvel abonnement débutera automatiquement le {calculateNextBillingDate()}</li>
              <li>Aucune interruption de service</li>
            </ul>
          </Alert>
        </Paper>
      )}

      {/* Sélection du nouvel abonnement */}
      <Paper sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
          {currentContract ? 'Changer d\'abonnement' : 'Choisir un abonnement'}
        </Typography>

        <ContractTypeSelector
          value={selectedContractType}
          onChange={setSelectedContractType}
        />

        {error && (
          <Alert severity="error" sx={{ mt: 3 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={() => navigate('/practitioner/profile')}>
            Annuler
          </Button>
          <Button
            variant="contained"
            size="large"
            onClick={handleChangeSubscription}
            disabled={submitting || !currentContract || selectedContractType === currentContract.contract_type}
            startIcon={submitting ? <CircularProgress size={20} /> : null}
          >
            {submitting ? 'Traitement...' : currentContract ? 'Changer d\'abonnement' : 'Choisir cet abonnement'}
          </Button>
        </Box>
      </Paper>

      {/* Dialog de confirmation */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon color="warning" />
            Confirmer le changement d'abonnement
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Vous allez passer de <strong>{currentContract && getContractTypeLabel(currentContract.contract_type as ContractType)}</strong> à{' '}
              <strong>{getContractTypeLabel(selectedContractType)}</strong>.
            </Typography>
          </Alert>

          <Typography variant="body2" paragraph>
            Le changement sera effectif le <strong>{calculateNextBillingDate()}</strong>.
          </Typography>

          <Typography variant="body2" paragraph>
            Vous allez être redirigé vers Stripe pour valider le paiement de{' '}
            <strong>{formatAmount(CONTRACT_CONFIGS[selectedContractType].monthly_fee)}/mois</strong>.
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Votre abonnement actuel continuera jusqu'à cette date sans interruption.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>
            Annuler
          </Button>
          <Button variant="contained" onClick={handleConfirmChange} autoFocus>
            Confirmer et payer
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PractitionerSubscriptionPage;
