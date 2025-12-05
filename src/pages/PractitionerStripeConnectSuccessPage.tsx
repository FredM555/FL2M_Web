// src/pages/PractitionerStripeConnectSuccessPage.tsx
import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  CircularProgress,
  Alert,
  Button
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useNavigate } from 'react-router-dom';
import { checkConnectStatus } from '../services/stripeConnect';

const PractitionerStripeConnectSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    // Attendre quelques secondes pour que le webhook Stripe soit traité
    const timer = setTimeout(async () => {
      try {
        const status = await checkConnectStatus();
        setVerified(status.canReceivePayments);
      } catch (error) {
        console.error('Erreur vérification:', error);
      } finally {
        setLoading(false);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress size={60} sx={{ mb: 3 }} />
        <Typography variant="h5" color="text.secondary">
          Finalisation de votre compte...
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Nous vérifions que tout est en ordre
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
        <CheckCircleIcon sx={{ fontSize: 100, color: 'success.main', mb: 3 }} />

        <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
          Configuration terminée ! 🎉
        </Typography>

        <Typography variant="h6" color="text.secondary" paragraph>
          Votre compte de paiement est maintenant actif
        </Typography>

        {verified ? (
          <Alert severity="success" sx={{ mt: 3, mb: 2 }}>
            <Typography variant="body2">
              <strong>Tout est configuré !</strong> Vous pouvez maintenant recevoir des paiements directement sur votre compte bancaire.
            </Typography>
          </Alert>
        ) : (
          <Alert severity="info" sx={{ mt: 3, mb: 2 }}>
            <Typography variant="body2">
              Votre compte est en cours de vérification par Stripe. Cela peut prendre quelques minutes.
              Vous recevrez un email de confirmation une fois la vérification terminée.
            </Typography>
          </Alert>
        )}

        <Box sx={{ mt: 4 }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/practitioner/profile')}
          >
            Retour à mon profil
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default PractitionerStripeConnectSuccessPage;
