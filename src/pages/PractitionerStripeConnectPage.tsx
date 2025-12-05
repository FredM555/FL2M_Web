// src/pages/PractitionerStripeConnectPage.tsx
import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Button,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createConnectAccount, checkConnectStatus, StripeConnectStatus } from '../services/stripeConnect';

const PractitionerStripeConnectPage: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectStatus, setConnectStatus] = useState<StripeConnectStatus | null>(null);

  const refresh = searchParams.get('refresh') === 'true';

  // Vérifier le statut du compte au chargement
  useEffect(() => {
    loadConnectStatus();
  }, []);

  const loadConnectStatus = async () => {
    setLoading(true);
    setError(null);

    try {
      const status = await checkConnectStatus();
      setConnectStatus(status);
    } catch (err: any) {
      console.error('Erreur vérification statut:', err);
      setError(err.message || 'Erreur lors de la vérification du statut');
    } finally {
      setLoading(false);
    }
  };

  const handleStartOnboarding = async () => {
    setProcessing(true);
    setError(null);

    try {
      const result = await createConnectAccount();

      if (result.onboardingUrl) {
        // Rediriger vers Stripe pour l'onboarding
        window.location.href = result.onboardingUrl;
      } else if (result.dashboardUrl) {
        // Le compte est déjà complet, rediriger vers le dashboard
        window.location.href = result.dashboardUrl;
      }
    } catch (err: any) {
      console.error('Erreur onboarding:', err);
      setError(err.message || 'Erreur lors du démarrage de l\'onboarding');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress size={60} sx={{ mb: 3 }} />
        <Typography variant="h5" color="text.secondary">
          Vérification de votre compte de paiement...
        </Typography>
      </Container>
    );
  }

  // Si le compte est complet
  if (connectStatus?.status === 'complete' && connectStatus.canReceivePayments) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <CheckCircleIcon sx={{ fontSize: 100, color: 'success.main', mb: 3 }} />

          <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
            Compte de paiement actif ! ✅
          </Typography>

          <Typography variant="h6" color="text.secondary" paragraph>
            Vous pouvez maintenant recevoir des paiements
          </Typography>

          <Alert severity="success" sx={{ mt: 3, mb: 2, textAlign: 'left' }}>
            <Typography variant="body2" sx={{ mb: 2 }}>
              <strong>Votre compte Stripe Connect est configuré et opérationnel !</strong>
            </Typography>
            <Typography variant="body2">
              Les paiements de vos rendez-vous seront automatiquement transférés sur votre compte bancaire :
            </Typography>
            <List dense sx={{ mt: 1 }}>
              <ListItem>
                <ListItemIcon sx={{ minWidth: 30 }}>•</ListItemIcon>
                <ListItemText primary="Immédiatement si le client valide la séance" />
              </ListItem>
              <ListItem>
                <ListItemIcon sx={{ minWidth: 30 }}>•</ListItemIcon>
                <ListItemText primary="48h après le rendez-vous si pas de validation" />
              </ListItem>
            </List>
          </Alert>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 4 }}>
            <Button
              variant="outlined"
              onClick={() => navigate('/practitioner/profile')}
            >
              Retour au profil
            </Button>
            <Button
              variant="contained"
              onClick={handleStartOnboarding}
            >
              Gérer mon compte Stripe
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  // Si l'onboarding est en cours ou incomplet
  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper sx={{ p: 4, borderRadius: 3 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <AccountBalanceIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Configuration de votre compte de paiement
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Configurez votre compte Stripe Connect pour recevoir vos paiements
          </Typography>
        </Box>

        {refresh && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              Vous avez interrompu la configuration. Cliquez sur le bouton ci-dessous pour reprendre.
            </Typography>
          </Alert>
        )}

        <Alert severity="warning" sx={{ mb: 3 }} icon={<InfoIcon />}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            ⚠️ Action requise pour recevoir des paiements
          </Typography>
          <Typography variant="body2">
            Vous devez configurer votre compte bancaire pour recevoir les paiements de vos rendez-vous.
            Ce processus est sécurisé et géré par Stripe, notre partenaire de paiement.
          </Typography>
        </Alert>

        <Box sx={{ my: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            Ce que vous devez préparer :
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Votre IBAN (RIB)"
                secondary="Le compte bancaire où vous souhaitez recevoir vos paiements"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Pièce d'identité"
                secondary="Carte d'identité, passeport ou permis de conduire"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircleIcon color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="Informations personnelles"
                secondary="Adresse, date de naissance, numéro de téléphone"
              />
            </ListItem>
          </List>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>🔒 Sécurité :</strong> Vos informations bancaires sont sécurisées par Stripe et ne sont jamais stockées sur nos serveurs.
            Stripe est certifié PCI-DSS niveau 1 (le plus haut niveau de sécurité pour les paiements).
          </Typography>
        </Alert>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          <Button
            onClick={() => navigate('/practitioner/profile')}
            disabled={processing}
          >
            Plus tard
          </Button>
          <Button
            variant="contained"
            size="large"
            onClick={handleStartOnboarding}
            disabled={processing}
            startIcon={processing ? <CircularProgress size={20} /> : <AccountBalanceIcon />}
          >
            {processing ? 'Chargement...' : 'Configurer mon compte'}
          </Button>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3, textAlign: 'center' }}>
          Vous serez redirigé vers Stripe pour compléter la configuration
        </Typography>
      </Paper>
    </Container>
  );
};

export default PractitionerStripeConnectPage;
