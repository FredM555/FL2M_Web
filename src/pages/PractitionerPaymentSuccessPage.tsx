// src/pages/PractitionerPaymentSuccessPage.tsx
import React, { useEffect, useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useNavigate, useSearchParams } from 'react-router-dom';

const PractitionerPaymentSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);

  const contractId = searchParams.get('contractId');

  useEffect(() => {
    // Attendre quelques secondes pour que le webhook Stripe traite le paiement
    const timer = setTimeout(() => {
      setLoading(false);
      // Rediriger vers le profil après 3 secondes
      setTimeout(() => {
        navigate('/practitioner/profile');
      }, 3000);
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate]);

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <CircularProgress size={60} sx={{ mb: 3 }} />
        <Typography variant="h5" color="text.secondary">
          Validation de votre paiement en cours...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
        <CheckCircleIcon sx={{ fontSize: 100, color: 'success.main', mb: 3 }} />

        <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
          Paiement réussi !
        </Typography>

        <Typography variant="h6" color="text.secondary" paragraph>
          Votre abonnement est maintenant actif
        </Typography>

        <Alert severity="success" sx={{ mt: 3, mb: 2 }}>
          <Typography variant="body2">
            Vous allez être redirigé vers votre espace intervenant dans quelques instants...
          </Typography>
        </Alert>

        <CircularProgress size={30} sx={{ mt: 2 }} />
      </Paper>
    </Container>
  );
};

export default PractitionerPaymentSuccessPage;
