// src/pages/PractitionerPaymentPage.tsx
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
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PaymentIcon from '@mui/icons-material/Payment';
import InfoIcon from '@mui/icons-material/Info';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CONTRACT_CONFIGS, formatAmount } from '../types/payments';
import { activateContractAfterPayment } from '../services/supabase';

const PractitionerPaymentPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const contractId = searchParams.get('contractId');
  const contractType = searchParams.get('contractType') as 'free' | 'starter' | 'pro' | 'premium';

  useEffect(() => {
    if (!contractId || !contractType) {
      setError('Informations de contrat manquantes');
      setTimeout(() => navigate('/'), 3000);
    }
  }, [contractId, contractType, navigate]);

  const handlePayment = async () => {
    if (!contractId) return;

    setLoading(true);
    setError(null);

    try {
      // TODO: Intégrer Stripe Payment Intent ici
      // Pour l'instant, on simule un paiement réussi
      const mockPaymentIntentId = `pi_mock_${Date.now()}`;

      // Attendre 2 secondes pour simuler le traitement du paiement
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Activer le contrat après paiement
      const { data, error: activationError } = await activateContractAfterPayment(
        contractId,
        mockPaymentIntentId
      );

      if (activationError) throw activationError;

      // Succès!
      // Le profil se mettra à jour automatiquement via le listener auth
      setSuccess(true);
      setTimeout(() => {
        navigate('/practitioner/profile');
      }, 3000);
    } catch (err: any) {
      console.error('Erreur lors du paiement:', err);
      setError(err.message || 'Erreur lors du traitement du paiement');
    } finally {
      setLoading(false);
    }
  };

  if (!contractType || !CONTRACT_CONFIGS[contractType]) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <Alert severity="error">Type de contrat invalide</Alert>
      </Container>
    );
  }

  const config = CONTRACT_CONFIGS[contractType];

  if (success) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <CheckCircleIcon sx={{ fontSize: 100, color: 'success.main', mb: 3 }} />
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
          Paiement validé avec succès ! 🎉
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Votre contrat {contractType.toUpperCase()} est maintenant actif.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Redirection vers votre espace intervenant...
        </Typography>
        <CircularProgress sx={{ mt: 3 }} />
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper sx={{ p: 4, borderRadius: 3 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <PaymentIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Paiement de l'abonnement
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Validez votre paiement pour activer votre contrat {contractType.toUpperCase()}
          </Typography>
        </Box>

        <Card sx={{ mb: 4, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
          <CardContent>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
              {formatAmount(config.monthly_fee)} / mois
            </Typography>
            <Typography variant="body2">
              Contrat {contractType.toUpperCase()}
            </Typography>
          </CardContent>
        </Card>

        <Alert severity="info" sx={{ mb: 3 }} icon={<InfoIcon />}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            📋 Détails de votre contrat :
          </Typography>
          <List dense>
            <ListItem>
              <ListItemIcon sx={{ minWidth: 30 }}>•</ListItemIcon>
              <ListItemText
                primary={`Abonnement mensuel : ${formatAmount(config.monthly_fee)}`}
              />
            </ListItem>
            <ListItem>
              <ListItemIcon sx={{ minWidth: 30 }}>•</ListItemIcon>
              <ListItemText
                primary={
                  contractType === 'free'
                    ? `Commission : max(${formatAmount(config.commission_fixed!)}, ${config.commission_percentage}%)`
                    : contractType === 'starter'
                    ? `Commission : min(${formatAmount(config.commission_fixed!)}, ${config.commission_percentage}%)`
                    : contractType === 'pro'
                    ? `Commission : ${formatAmount(config.commission_fixed!)} fixe par RDV`
                    : 'Aucune commission'
                }
              />
            </ListItem>
            {config.max_appointments_per_month && (
              <ListItem>
                <ListItemIcon sx={{ minWidth: 30 }}>•</ListItemIcon>
                <ListItemText
                  primary={`Limite : ${config.max_appointments_per_month} RDV/mois`}
                />
              </ListItem>
            )}
          </List>
        </Alert>

        <Divider sx={{ my: 3 }} />

        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>⚠️ Important :</strong> Cette page est une démonstration.
            L'intégration complète avec Stripe sera effectuée prochainement.
            Pour l'instant, cliquez sur "Valider le paiement" pour simuler un paiement réussi.
          </Typography>
        </Alert>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            onClick={() => navigate('/practitioner-onboarding')}
            disabled={loading}
          >
            Retour
          </Button>
          <Button
            variant="contained"
            size="large"
            onClick={handlePayment}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <PaymentIcon />}
          >
            {loading ? 'Traitement...' : 'Valider le paiement'}
          </Button>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3, textAlign: 'center' }}>
          🔒 Paiement sécurisé via Stripe
        </Typography>
      </Paper>
    </Container>
  );
};

export default PractitionerPaymentPage;
